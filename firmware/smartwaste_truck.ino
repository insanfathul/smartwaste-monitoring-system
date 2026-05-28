/*
 * ============================================================
 *  SMART WASTE MONITORING SYSTEM - ESP32-S3 N16R8
 *  Telkom University
 *
 *  Hardware:
 *    - ESP32-S3 N16R8
 *    - GPS  : uBlox NEO-M8N
 *    - GSM  : SIM800L v2
 *    - IMU  : MPU6050 (GY-521)
 *    - ToF  : VL53L1X (TOF400C) x3
 *
 *  Library yang dibutuhkan (install via Arduino Library Manager):
 *    - TinyGSM          by Volodymyr Shymanskyy
 *    - PubSubClient     by Nick O'Leary
 *    - ArduinoJson      by Benoit Blanchon (v6.x)
 *    - TinyGPSPlus      by Mikal Hart
 *    - Adafruit VL53L1X by Adafruit
 *    - Adafruit MPU6050 by Adafruit
 * ============================================================
 */

// ---- Definisi modem sebelum include TinyGSM ----
#define TINY_GSM_MODEM_SIM800

#include <TinyGsmClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <Wire.h>
#include <Adafruit_VL53L1X.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <math.h>

/* ============================================================
   PIN MAPPING - ESP32-S3 N16R8
   ============================================================ */
// SIM800L (UART1)
#define SIM800L_RX_PIN   16
#define SIM800L_TX_PIN   17
#define SIM800L_RST_PIN  18

// GPS uBlox NEO-M8N (UART2)
#define GPS_RX_PIN       9
#define GPS_TX_PIN       10

// VL53L1X ToF - I2C (Wire default)
// XSHUT pins untuk multi-sensor (ganti alamat I2C)
#define TOF1_XSHUT_PIN   4
#define TOF2_XSHUT_PIN   5
#define TOF3_XSHUT_PIN   6

// MPU6050 IMU - I2C (Wire default, SDA=8, SCL=9 pada ESP32-S3)
#define SDA_PIN          8
#define SCL_PIN          9

/* ============================================================
   KONFIGURASI GPRS (SIM Card)
   Sesuaikan dengan provider SIM yang digunakan
   ============================================================ */
const char GPRS_APN[]  = "internet";     // Telkomsel: "internet" / "telkomsel"
const char GPRS_USER[] = "";             // Kosongkan jika tidak ada
const char GPRS_PASS[] = "";             // Kosongkan jika tidak ada

/* ============================================================
   KONFIGURASI MQTT - HiveMQ Cloud
   ============================================================
   Web pakai port 8884 (WSS), ESP32+SIM800L pakai port 8883 (MQTT TLS)
   Keduanya ke cluster HiveMQ Cloud yang SAMA
   PENTING: Ganti [YOUR-CLUSTER-URL] dengan URL dari Overview HiveMQ Cloud
   ============================================================ */
const char MQTT_HOST[]     = "ad88ee6f121e4c71933d6feb4208621a.s1.eu.hivemq.cloud";
const int  MQTT_PORT       = 8883;           // MQTT over TLS - HiveMQ Cloud
const char MQTT_USERNAME[] = "cd_monitoring_armadatrucksampah";
const char MQTT_PASSWORD[] = "CU7g.9MVkgD2!WA";
const char MQTT_TOPIC[]    = "truck/monitoring/data";
const char MQTT_CLIENT_ID[]= "ESP32_TRUCK01";
const char TRUCK_ID[]      = "TRUCK_01";     // Harus cocok dengan truckId di auth.js web

/* ============================================================
   KONFIGURASI SENSOR
   ============================================================ */
// VL53L1X: sensor dipasang di ATAS bak menghadap ke bawah
// Nilai HARUS SAMA dengan SENSOR_CONFIG di js/config.js web!
// tofMaxDistance: 200 cm → bak KOSONG (sensor jauh dari sampah)
// tofMinDistance:  20 cm → bak PENUH  (sensor dekat ke permukaan sampah)
#define BIN_EMPTY_CM   200    // = SENSOR_CONFIG.tofMaxDistance di config.js
#define BIN_FULL_CM     20    // = SENSOR_CONFIG.tofMinDistance di config.js

// Jarak minimum perpindahan GPS sebelum kirim data (meter)
#define MIN_MOVE_DISTANCE_M  5.0

// IMU: threshold akselerasi untuk deteksi gerak (m/s²)
#define IMU_MOVE_THRESHOLD   0.5

// Interval kirim data walaupun tidak bergerak (ms) - heartbeat
#define HEARTBEAT_INTERVAL   60000   // 60 detik

/* ============================================================
   VARIABEL GLOBAL
   ============================================================ */
HardwareSerial sim800lSerial(1);
HardwareSerial gpsSerial(2);

TinyGsm             modem(sim800lSerial);
TinyGsmClientSecure gsmClient(modem);  // ← Secure client WAJIB untuk HiveMQ Cloud (port 8883 TLS)
PubSubClient        mqtt(gsmClient);

TinyGPSPlus   gps;

Adafruit_VL53L1X tof1 = Adafruit_VL53L1X();
Adafruit_VL53L1X tof2 = Adafruit_VL53L1X();
Adafruit_VL53L1X tof3 = Adafruit_VL53L1X();
Adafruit_MPU6050 mpu;

// Posisi GPS terakhir yang dikirim
double lastSentLat = 0.0;
double lastSentLng = 0.0;
unsigned long lastSentMs = 0;

/* ============================================================
   FUNGSI: Haversine Distance (meter)
   ============================================================ */
double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
    const double R = 6371000.0;
    double dLat = (lat2 - lat1) * PI / 180.0;
    double dLon = (lon2 - lon1) * PI / 180.0;
    double a = sin(dLat / 2) * sin(dLat / 2) +
               cos(lat1 * PI / 180.0) * cos(lat2 * PI / 180.0) *
               sin(dLon / 2) * sin(dLon / 2);
    return R * 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
}

/* ============================================================
   FUNGSI: Baca 3 Sensor VL53L1X
   Kembalikan nilai dalam SENTIMETER (bukan mm)
   Web config.js menggunakan satuan cm!
   ============================================================ */
bool readToFSensors(int &d1_cm, int &d2_cm, int &d3_cm) {
    int16_t dist1_mm, dist2_mm, dist3_mm;
    bool ok = true;

    // VL53L1X default kembalikan nilai dalam mm → bagi 10 → cm
    if (tof1.dataReady()) {
        dist1_mm = tof1.distance();
        tof1.clearInterrupt();
        d1_cm = dist1_mm / 10;
    } else ok = false;

    if (tof2.dataReady()) {
        dist2_mm = tof2.distance();
        tof2.clearInterrupt();
        d2_cm = dist2_mm / 10;
    } else ok = false;

    if (tof3.dataReady()) {
        dist3_mm = tof3.distance();
        tof3.clearInterrupt();
        d3_cm = dist3_mm / 10;
    } else ok = false;

    return ok;
}

/* ============================================================
   FUNGSI: Baca IMU MPU6050
   Kembalikan sudut kemiringan (derajat) dan flag bergerak
   ============================================================ */
float readIMU(bool &isMoving) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    // Hitung sudut tilt dari akselerasi
    float tiltAngle = atan2(a.acceleration.y,
                            sqrt(a.acceleration.x * a.acceleration.x +
                                 a.acceleration.z * a.acceleration.z))
                      * 180.0 / PI;

    // Deteksi gerak dari magnitude akselerasi
    float magnitude = sqrt(a.acceleration.x * a.acceleration.x +
                           a.acceleration.y * a.acceleration.y +
                           a.acceleration.z * a.acceleration.z);
    // Gravitasi ~9.8, jika magnitude menyimpang jauh → bergerak
    isMoving = abs(magnitude - 9.8) > IMU_MOVE_THRESHOLD;

    return tiltAngle;
}

/* ============================================================
   FUNGSI: Baca Kualitas Sinyal GSM (dBm)
   ============================================================ */
int readGSMSignal() {
    int16_t sq = modem.getSignalQuality();
    // RSSI dBm = -113 + (sq * 2)
    if (sq == 99) return -113;  // Unknown
    return -113 + (sq * 2);
}

/* ============================================================
   FUNGSI: Koneksi MQTT ke HiveMQ
   ============================================================ */
bool connectMQTT() {
    if (mqtt.connected()) return true;

    Serial.print("[MQTT] Connecting to HiveMQ...");

    // HiveMQ Cloud - credentials WAJIB dan diverifikasi
    bool connected = mqtt.connect(
        MQTT_CLIENT_ID,
        MQTT_USERNAME,
        MQTT_PASSWORD
    );

    if (connected) {
        Serial.println(" Connected!");
        return true;
    }

    Serial.print(" Failed! RC=");
    Serial.println(mqtt.state());
    /*
     * Kode error mqtt.state():
     * -4 = MQTT_CONNECTION_TIMEOUT
     * -3 = MQTT_CONNECTION_LOST
     * -2 = MQTT_CONNECT_FAILED
     * -1 = MQTT_DISCONNECTED
     *  5 = MQTT_CONNECT_UNAUTHORIZED (wrong credentials)
     */
    return false;
}

/* ============================================================
   FUNGSI: Publish Data ke HiveMQ
   Format JSON harus sesuai dengan yang diharapkan web (mqtt.js)
   ============================================================ */
void publishSensorData(double lat, double lng,
                       int tof1_cm, int tof2_cm, int tof3_cm,
                       float imuAngle, int gsmDbm, bool moving) {
    if (!connectMQTT()) {
        Serial.println("[MQTT] Publish gagal: tidak terkoneksi");
        return;
    }

    // Buat dokumen JSON
    StaticJsonDocument<300> doc;

    // === FIELD WAJIB - harus cocok dengan processIncomingData() di mqtt.js ===
    doc["lat"]       = lat;             // Koordinat GPS (decimal degrees)
    doc["lng"]       = lng;             // Koordinat GPS (decimal degrees)
    doc["tof1"]      = tof1_cm;        // Jarak ToF sensor 1 (SENTIMETER)
    doc["tof2"]      = tof2_cm;        // Jarak ToF sensor 2 (SENTIMETER)
    doc["tof3"]      = tof3_cm;        // Jarak ToF sensor 3 (SENTIMETER)
    doc["imu"]       = imuAngle;       // Sudut kemiringan (derajat)
    doc["gsm"]       = gsmDbm;         // Kualitas sinyal GSM (dBm, negatif)
    doc["moving"]    = moving;         // true jika truk sedang bergerak
    doc["timestamp"] = millis() / 1000; // Unix-like timestamp (detik)

    // === truck_id WAJIB agar web bisa memfilter data per truk ===
    // Harus cocok dengan truckId di auth.js web:
    // armadatruck_1 → TRUCK_01
    doc["truck_id"]  = TRUCK_ID;

    // Serialize ke string
    char payload[300];
    size_t len = serializeJson(doc, payload);

    // Publish dengan QoS=1 (retained=false)
    bool ok = mqtt.publish(MQTT_TOPIC, payload, false);

    if (ok) {
        Serial.printf("[MQTT] Published (%d bytes): %s\n", len, payload);
    } else {
        Serial.println("[MQTT] Publish FAILED");
    }
}

/* ============================================================
   SETUP
   ============================================================ */
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("=== Smart Waste Monitoring System ===");

    // --- Inisialisasi I2C ---
    Wire.begin(SDA_PIN, SCL_PIN);

    // --- Inisialisasi VL53L1X (multi-sensor via XSHUT) ---
    // Matikan semua dulu
    pinMode(TOF1_XSHUT_PIN, OUTPUT); digitalWrite(TOF1_XSHUT_PIN, LOW);
    pinMode(TOF2_XSHUT_PIN, OUTPUT); digitalWrite(TOF2_XSHUT_PIN, LOW);
    pinMode(TOF3_XSHUT_PIN, OUTPUT); digitalWrite(TOF3_XSHUT_PIN, LOW);
    delay(10);

    // Aktifkan dan set alamat sensor 1
    digitalWrite(TOF1_XSHUT_PIN, HIGH); delay(10);
    if (!tof1.begin(0x29, &Wire)) {  // Alamat default
        Serial.println("[ERROR] ToF Sensor 1 tidak ditemukan!");
    }
    tof1.setAddress(0x30);  // Pindah ke alamat baru
    tof1.startRanging();

    // Aktifkan dan set alamat sensor 2
    digitalWrite(TOF2_XSHUT_PIN, HIGH); delay(10);
    if (!tof2.begin(0x29, &Wire)) {
        Serial.println("[ERROR] ToF Sensor 2 tidak ditemukan!");
    }
    tof2.setAddress(0x31);
    tof2.startRanging();

    // Aktifkan sensor 3 (tetap di alamat default)
    digitalWrite(TOF3_XSHUT_PIN, HIGH); delay(10);
    if (!tof3.begin(0x29, &Wire)) {
        Serial.println("[ERROR] ToF Sensor 3 tidak ditemukan!");
    }
    tof3.startRanging();

    // --- Inisialisasi MPU6050 ---
    if (!mpu.begin()) {
        Serial.println("[ERROR] MPU6050 tidak ditemukan! Cek wiring.");
    } else {
        mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
        mpu.setGyroRange(MPU6050_RANGE_250_DEG);
        mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
        Serial.println("[OK] MPU6050 ready");
    }

    // --- Inisialisasi GPS ---
    gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    Serial.println("[OK] GPS UART ready");

    // --- Inisialisasi SIM800L ---
    sim800lSerial.begin(9600, SERIAL_8N1, SIM800L_RX_PIN, SIM800L_TX_PIN);
    delay(3000);

    Serial.println("[SIM800L] Initializing modem...");
    modem.restart();

    // Tunggu registrasi jaringan
    Serial.print("[SIM800L] Waiting for network");
    while (!modem.waitForNetwork()) {
        Serial.print(".");
        delay(1000);
    }
    Serial.println(" OK!");

    // Koneksi GPRS
    Serial.printf("[SIM800L] Connecting GPRS (APN: %s)...", GPRS_APN);
    if (!modem.gprsConnect(GPRS_APN, GPRS_USER, GPRS_PASS)) {
        Serial.println(" FAILED!");
        // Coba restart modem
        modem.restart();
    } else {
        Serial.println(" Connected!");
        Serial.print("[SIM800L] IP: ");
        Serial.println(modem.localIP());
    }

    // --- Setup MQTT ---
    mqtt.setServer(MQTT_HOST, MQTT_PORT);
    mqtt.setKeepAlive(60);
    mqtt.setSocketTimeout(10);
    mqtt.setBufferSize(512);  // Buffer cukup untuk JSON payload

    Serial.println("[MQTT] Config:");
    Serial.printf("  Broker : %s:%d\n", MQTT_HOST, MQTT_PORT);
    Serial.printf("  Topic  : %s\n", MQTT_TOPIC);
    Serial.printf("  Truck  : %s\n", TRUCK_ID);

    Serial.println("=== Setup selesai, memulai monitoring ===");
}

/* ============================================================
   LOOP
   ============================================================ */
void loop() {
    // Jaga koneksi MQTT tetap hidup (WAJIB dipanggil secara rutin)
    mqtt.loop();

    // Baca GPS
    while (gpsSerial.available()) {
        gps.encode(gpsSerial.read());
    }

    // Hanya proses jika GPS sudah valid
    if (!gps.location.isValid()) {
        Serial.println("[GPS] Menunggu fix...");
        delay(1000);
        return;
    }

    double currentLat = gps.location.lat();
    double currentLng = gps.location.lng();

    // Baca sensor IMU
    bool isMoving = false;
    float imuAngle = readIMU(isMoving);

    // Hitung jarak dari posisi terakhir dikirim
    double distanceMoved = haversineDistance(currentLat, currentLng,
                                             lastSentLat, lastSentLng);

    // Kirim data hanya jika:
    // 1. Sudah bergerak >= 5 meter (efisiensi daya - MPU6050 filter)
    // 2. ATAU waktu heartbeat sudah lewat (60 detik)
    bool shouldSend = (distanceMoved >= MIN_MOVE_DISTANCE_M) ||
                      (millis() - lastSentMs >= HEARTBEAT_INTERVAL);

    if (!shouldSend) {
        delay(500);
        return;
    }

    // Baca sensor ToF (dalam cm)
    int d1_cm = BIN_EMPTY_CM, d2_cm = BIN_EMPTY_CM, d3_cm = BIN_EMPTY_CM;
    readToFSensors(d1_cm, d2_cm, d3_cm);

    // Baca kualitas sinyal GSM
    int gsmDbm = readGSMSignal();

    // Cek koneksi GPRS, reconnect jika putus
    if (!modem.isGprsConnected()) {
        Serial.println("[GPRS] Reconnecting...");
        modem.gprsConnect(GPRS_APN, GPRS_USER, GPRS_PASS);
    }

    // Publish data ke HiveMQ
    publishSensorData(currentLat, currentLng,
                      d1_cm, d2_cm, d3_cm,
                      imuAngle, gsmDbm, isMoving);

    // Update posisi terakhir dikirim
    lastSentLat = currentLat;
    lastSentLng = currentLng;
    lastSentMs  = millis();

    delay(100);
}

/* ============================================================
   CONTOH OUTPUT JSON yang akan dikirim ke HiveMQ:
   (ditampilkan di web dashboard)

   {
     "lat": -6.97330,
     "lng": 107.63060,
     "tof1": 185,         ← sentimeter (kosong = 180, penuh = 15)
     "tof2": 183,
     "tof3": 186,
     "imu": 2.3,          ← derajat kemiringan
     "gsm": -73,          ← dBm (semakin mendekati 0 semakin kuat)
     "moving": true,
     "timestamp": 12345,
     "truck_id": "TRUCK_01"   ← WAJIB cocok dengan auth.js web
   }

   Kapasitas bak dihitung di web:
   avg = (185+183+186)/3 = 184.67 cm
   capacity% = ((180 - 184.67) / (180 - 15)) * 100 = -2.8% → diclamp ke 0%
   ← bak masih kosong ✓
   ============================================================ */
