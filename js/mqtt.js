/* ===================================
   MQTT CONNECTION HANDLER
   Smart Waste Monitoring System
   =================================== */

let mqttClient = null;
let isConnected = false;

// ===== INITIALIZE MQTT CONNECTION =====
function initMQTT() {
    try {
        mqttClient = new Paho.MQTT.Client(
            MQTT_CONFIG.host,
            MQTT_CONFIG.port,
            MQTT_CONFIG.path,
            MQTT_CONFIG.clientId
        );

        // Set callbacks
        mqttClient.onConnectionLost = onMQTTConnectionLost;
        mqttClient.onMessageArrived = onMQTTMessageArrived;

        // Connection options
        const connectOptions = {
            useSSL: MQTT_CONFIG.useSSL,
            onSuccess: onMQTTConnect,
            onFailure: onMQTTFailure,
            keepAliveInterval: MQTT_CONFIG.keepAlive,
            cleanSession: MQTT_CONFIG.cleanSession
        };

        // Connect
        mqttClient.connect(connectOptions);
        
        addLog("Menghubungkan ke MQTT Broker HiveMQ...", "info");
    } catch (error) {
        console.error("MQTT Init Error:", error);
        addLog("Error inisialisasi MQTT: " + error.message, "error");
    }
}

// ===== ON MQTT CONNECTED =====
function onMQTTConnect() {
    isConnected = true;
    console.log("MQTT Connected Successfully");
    
    // Update UI
    updateMQTTStatus("Connected", "bg-green-light");
    addLog("✓ Koneksi MQTT berhasil! Broker: " + MQTT_CONFIG.host, "success");
    
    // Subscribe to topic
    mqttClient.subscribe(MQTT_CONFIG.topic, {
        qos: MQTT_CONFIG.qos,
        onSuccess: function() {
            console.log("Subscribed to:", MQTT_CONFIG.topic);
            addLog("Berlangganan topic: " + MQTT_CONFIG.topic, "info");
        },
        onFailure: function(err) {
            console.error("Subscribe failed:", err);
            addLog("Gagal subscribe topic: " + err.errorMessage, "error");
        }
    });
}

// ===== ON MQTT CONNECTION FAILED =====
function onMQTTFailure(error) {
    isConnected = false;
    console.error("MQTT Connection Failed:", error);
    
    updateMQTTStatus("Failed", "bg-red-500");
    addLog("✗ Koneksi MQTT gagal: " + error.errorMessage, "error");
    
    // Retry after 5 seconds
    setTimeout(initMQTT, 5000);
}

// ===== ON MQTT CONNECTION LOST =====
function onMQTTConnectionLost(responseObject) {
    isConnected = false;
    
    if (responseObject.errorCode !== 0) {
        console.log("MQTT Connection Lost:", responseObject.errorMessage);
        updateMQTTStatus("Disconnected", "bg-red-500");
        addLog("Koneksi terputus: " + responseObject.errorMessage, "error");
        
        // Auto reconnect
        setTimeout(initMQTT, 3000);
    }
}

// ===== ON MESSAGE RECEIVED =====
function onMQTTMessageArrived(message) {
    console.log("Message received:", message.payloadString);
    
    try {
        const data = JSON.parse(message.payloadString);
        processIncomingData(data);
    } catch (error) {
        console.error("JSON Parse Error:", error);
        addLog("Data tidak valid: " + message.payloadString, "warning");
    }
}

// ===== PROCESS INCOMING SENSOR DATA =====
function processIncomingData(data) {
    // Expected data structure from hardware:
    // {
    //   "lat": -6.9744,
    //   "lng": 107.6316,
    //   "tof1": 120,
    //   "tof2": 115,
    //   "tof3": 118,
    //   "imu": 5.2,
    //   "gsm": -65,
    //   "moving": true,
    //   "timestamp": 1234567890
    // }
    
    // Calculate average capacity from 3 ToF sensors
    if (data.tof1 && data.tof2 && data.tof3) {
        const avgDistance = (data.tof1 + data.tof2 + data.tof3) / 3;
        const capacityPercent = calculateCapacity(avgDistance);
        updateCapacityDisplay(capacityPercent);
        updateChart('capacity', capacityPercent);
    }
    
    // Update GPS position
    if (data.lat && data.lng) {
        const coords = [data.lat, data.lng];
        updateGPSDisplay(data.lat, data.lng);
        updateTruckPosition(coords);
        checkRouteCompliance(coords);
        checkGeofence(coords);
    }
    
    // Update IMU (tilt angle)
    if (data.imu !== undefined) {
        updateIMUDisplay(data.imu);
        if (Math.abs(data.imu) > SENSOR_CONFIG.imuThreshold) {
            addLog(`⚠ PERINGATAN: Kemiringan tidak normal (${data.imu}°)`, "warning");
        }
    }
    
    // Update GSM signal
    if (data.gsm !== undefined) {
        updateGSMDisplay(data.gsm);
    }
    
    // Update operation status
    if (data.moving !== undefined) {
        updateOperationStatus(data.moving);
    }
    
    // Add info log
    addLog(`Data diterima - Kapasitas: ${calculateCapacity((data.tof1+data.tof2+data.tof3)/3).toFixed(1)}%, GPS: Valid`, "info");
}

// ===== CALCULATE CAPACITY PERCENTAGE =====
function calculateCapacity(distance) {
    // distance in cm
    const empty = SENSOR_CONFIG.tofMaxDistance; // 200cm
    const full = SENSOR_CONFIG.tofMinDistance;   // 20cm
    
    let percent = ((empty - distance) / (empty - full)) * 100;
    return Math.max(0, Math.min(100, percent));
}

// ===== UPDATE MQTT STATUS DISPLAY =====
function updateMQTTStatus(text, colorClass) {
    const statusEl = document.getElementById('mqtt-status');
    if (statusEl) {
        statusEl.textContent = text;
        statusEl.className = `text-xs px-2 py-1 mt-1 rounded text-white font-semibold ${colorClass}`;
    }
}

// ===== PUBLISH MESSAGE (for future features) =====
function publishMQTT(topic, payload) {
    if (!isConnected) {
        console.warn("MQTT not connected");
        return false;
    }
    
    try {
        const message = new Paho.MQTT.Message(JSON.stringify(payload));
        message.destinationName = topic;
        message.qos = MQTT_CONFIG.qos;
        mqttClient.send(message);
        return true;
    } catch (error) {
        console.error("Publish error:", error);
        return false;
    }
}