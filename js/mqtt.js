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

        // Connection options dengan username & password
        const connectOptions = {
            useSSL: MQTT_CONFIG.useSSL,
            onSuccess: onMQTTConnect,
            onFailure: onMQTTFailure,
            keepAliveInterval: MQTT_CONFIG.keepAlive,
            cleanSession: MQTT_CONFIG.cleanSession,
            
            // Tambahkan kredensial MQTT
            userName: MQTT_CONFIG.username,
            password: MQTT_CONFIG.password,
            
            // Reconnect options
            reconnect: true,
            timeout: 10
        };

        // Connect
        mqttClient.connect(connectOptions);
        
        updateMQTTStatus("Connecting", "bg-orange-custom");
        addLog("Menghubungkan ke MQTT Broker HiveMQ...", "info");
        console.log("MQTT Config:", {
            host: MQTT_CONFIG.host,
            port: MQTT_CONFIG.port,
            username: MQTT_CONFIG.username,
            useSSL: MQTT_CONFIG.useSSL
        });
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
    addLog("✗ Koneksi MQTT gagal: " + (error.errorMessage || "Unknown error"), "error");
    
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
    
    console.log("Processing data:", data);
    
    // Sinkronisasi data masuk dengan truck ID dari user yang sedang login
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (currentUser && currentUser.truckId !== 'ALL') {
        const incomingTruckId = data.truck_id || data.truckId || data.id;
        if (incomingTruckId && incomingTruckId.toString().toUpperCase() !== currentUser.truckId.toUpperCase()) {
            console.log(`Data diabaikan: milik truck ${incomingTruckId}, sedangkan user aktif memantau ${currentUser.truckId}`);
            return;
        }
    }
    
    // Calculate average capacity from 3 ToF sensors
    if (data.tof1 !== undefined && data.tof2 !== undefined && data.tof3 !== undefined) {
        const avgDistance = (data.tof1 + data.tof2 + data.tof3) / 3;
        const capacityPercent = calculateCapacity(avgDistance);
        updateCapacityDisplay(capacityPercent);
        updateChart('capacity', capacityPercent);
    }
    
    // Update GPS position
    if (data.lat !== undefined && data.lng !== undefined) {
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
    
    // Add info log (batasi frekuensi log)
    const now = Date.now();
    if (!window.lastLogTime || now - window.lastLogTime > 10000) {
        addLog(`Data diterima - Kapasitas: ${calculateCapacity((data.tof1+data.tof2+data.tof3)/3).toFixed(1)}%, GPS: Valid`, "info");
        window.lastLogTime = now;
    }
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
    // 1. Update status in sidebar footer
    const statusEl = document.getElementById('mqtt-status');
    if (statusEl) {
        statusEl.textContent = text === "Connected" ? "Connected" : (text === "Connecting" ? "Connecting..." : text);
        statusEl.className = `block text-xs px-2 py-1 mt-1 rounded text-white font-semibold ${colorClass}`;
    }

    // 2. Update status card in dashboard
    const cardEl = document.getElementById('mqtt-card');
    const valEl = document.getElementById('val-mqtt-status');
    const indicatorEl = document.getElementById('mqtt-status-indicator');
    const iconContainerEl = document.getElementById('mqtt-icon-container');

    if (cardEl && valEl && indicatorEl && iconContainerEl) {
        let statusText = "Menghubungkan...";
        let indicatorText = "Connecting";
        let cardBorderClass = "border-orange-custom";
        let indicatorBgClass = "bg-orange-custom";
        let iconContainerClass = "bg-orange-100 text-orange-custom";
        let iconHTML = '<i class="fa-solid fa-wifi animate-pulse"></i>';

        if (text === "Connected") {
            statusText = "Terhubung";
            indicatorText = "Online";
            cardBorderClass = "border-green-light";
            indicatorBgClass = "bg-green-light";
            iconContainerClass = "bg-green-100 text-green-light";
            iconHTML = '<i class="fa-solid fa-wifi"></i>';
        } else if (text === "Disconnected" || text === "Failed") {
            statusText = "Terputus";
            indicatorText = "Offline";
            cardBorderClass = "border-red-500";
            indicatorBgClass = "bg-red-500";
            iconContainerClass = "bg-red-100 text-red-500";
            iconHTML = '<i class="fa-solid fa-wifi-slash"></i>';
        }

        valEl.textContent = statusText;
        indicatorEl.textContent = indicatorText;
        
        // Update styling classes dynamically
        cardEl.className = `bg-white p-5 rounded-2xl soft-shadow border-l-4 ${cardBorderClass} flex items-center justify-between`;
        indicatorEl.className = `text-xs px-2 py-1 rounded text-white mt-2 inline-block ${indicatorBgClass} ${text === "Connecting" ? "animate-pulse" : ""}`;
        iconContainerEl.className = `w-11 h-11 rounded-xl flex items-center justify-center text-xl ${iconContainerClass}`;
        iconContainerEl.innerHTML = iconHTML;
    }
}

// ===== PUBLISH MESSAGE (for future features) =====
function publishMQTT(topic, payload) {
    if (!isConnected) {
        console.warn("MQTT not connected");
        addLog("MQTT belum terkoneksi, tidak bisa publish", "warning");
        return false;
    }
    
    try {
        const message = new Paho.MQTT.Message(JSON.stringify(payload));
        message.destinationName = topic;
        message.qos = MQTT_CONFIG.qos;
        message.retained = false;
        mqttClient.send(message);
        console.log("Published to:", topic, payload);
        return true;
    } catch (error) {
        console.error("Publish error:", error);
        addLog("Error publish MQTT: " + error.message, "error");
        return false;
    }
}