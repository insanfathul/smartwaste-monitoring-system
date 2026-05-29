/* ===================================
   MQTT CONNECTION HANDLER
   Smart Waste Monitoring System
   Uses mqtt.js (not Paho)
   =================================== */

let mqttClient = null;
let isConnected = false;

// ===== INITIALIZE MQTT CONNECTION =====
function initMQTT() {
    if (mqttClient) {
        try { mqttClient.end(true); } catch (e) {}
        mqttClient = null;
    }

    try {
        const protocol = MQTT_CONFIG.useSSL ? 'wss' : 'ws';
        const url = `${protocol}://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}${MQTT_CONFIG.path}`;

        const options = {
            clientId: MQTT_CONFIG.clientId,
            keepalive: MQTT_CONFIG.keepAlive,
            clean: MQTT_CONFIG.cleanSession,
            reconnectPeriod: 0,
            connectTimeout: 15 * 1000
        };

        // Only send credentials if they are set (public broker uses none)
        if (MQTT_CONFIG.username) {
            options.username = MQTT_CONFIG.username;
            options.password = MQTT_CONFIG.password;
        }

        mqttClient = mqtt.connect(url, options);

        mqttClient.on('connect', onMQTTConnect);
        mqttClient.on('error', onMQTTFailure);
        mqttClient.on('close', onMQTTConnectionLost);
        mqttClient.on('message', onMQTTMessageArrived);

        updateMQTTStatus("Connecting", "bg-orange-custom");
        addLog("Menghubungkan ke EMQX Broker...", "info");

        console.log("[MQTT] Connecting to:", url, "| clientId:", MQTT_CONFIG.clientId);
    } catch (error) {
        console.error("[MQTT] Init Error:", error);
        addLog("Error inisialisasi MQTT: " + error.message, "error");
        setTimeout(initMQTT, 8000);
    }
}

// ===== ON MQTT CONNECTED =====
function onMQTTConnect() {
    isConnected = true;
    console.log("[MQTT] Connected successfully");

    updateMQTTStatus("Connected", "bg-green-light");
    addLog("✓ Koneksi MQTT berhasil! Broker: " + MQTT_CONFIG.host, "success");

    mqttClient.subscribe(MQTT_CONFIG.topic, { qos: MQTT_CONFIG.qos }, function (err) {
        if (!err) {
            console.log("[MQTT] Subscribed to:", MQTT_CONFIG.topic);
            addLog("Berlangganan topic: " + MQTT_CONFIG.topic, "info");
        } else {
            console.error("[MQTT] Subscribe failed:", err);
            addLog("Gagal subscribe topic: " + err.message, "error");
        }
    });
}

// ===== ON MQTT ERROR =====
function onMQTTFailure(error) {
    isConnected = false;
    console.error("[MQTT] Error:", error && error.message);

    updateMQTTStatus("Failed", "bg-red-500");
    addLog("✗ MQTT error: " + (error && error.message), "error");

    setTimeout(initMQTT, 8000);
}

// ===== ON MQTT CONNECTION LOST =====
function onMQTTConnectionLost() {
    const wasConnected = isConnected;
    isConnected = false;

    console.log("[MQTT] Connection closed, wasConnected:", wasConnected);
    updateMQTTStatus("Disconnected", "bg-red-500");
    addLog("Koneksi MQTT terputus, mencoba reconnect...", "error");

    // Selalu retry: baik putus di tengah jalan maupun gagal koneksi awal
    setTimeout(initMQTT, wasConnected ? 3000 : 8000);
}

// ===== ON MESSAGE RECEIVED =====
function onMQTTMessageArrived(topic, messageBuffer) {
    const messageStr = messageBuffer.toString();
    console.log("[MQTT] Message on", topic, ":", messageStr);

    try {
        const data = JSON.parse(messageStr);
        processIncomingData(data);
    } catch (error) {
        console.error("[MQTT] JSON Parse Error:", error);
        addLog("Data tidak valid: " + messageStr, "warning");
    }
}

// ===== PROCESS INCOMING SENSOR DATA =====
function processIncomingData(data) {
    console.log("[MQTT] Processing data:", data);

    // Filter berdasarkan truck ID user yang login.
    // Hardware mengirim "truck_id"; juga toleran terhadap variasi nama field.
    const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (currentUser && currentUser.truckId !== 'ALL') {
        const incomingTruckId = data.truck_id || data.truckId || data.id;
        if (incomingTruckId &&
            incomingTruckId.toString().toUpperCase() !== currentUser.truckId.toUpperCase()) {
            console.log(`[MQTT] Data diabaikan: truck ${incomingTruckId}, user memantau ${currentUser.truckId}`);
            return;
        }
    }

    // ----- Kapasitas dari 3 sensor ToF (dikirim node sensor terpisah) -----
    if (data.tof1 !== undefined && data.tof2 !== undefined && data.tof3 !== undefined) {
        const avgDistance = (data.tof1 + data.tof2 + data.tof3) / 3;
        const capacityPercent = calculateCapacity(avgDistance);
        updateCapacityDisplay(capacityPercent);
        updateChart('capacity', capacityPercent);
    }
    // Kapasitas langsung dalam persen (opsional)
    else if (data.capacity !== undefined) {
        const capacityPercent = Math.max(0, Math.min(100, Number(data.capacity)));
        updateCapacityDisplay(capacityPercent);
        updateChart('capacity', capacityPercent);
    }

    // ----- Posisi GPS -----
    // Hardware mengirim: lat, lng, dan "gps":"VALID" atau "gps_valid":1/true
    const hasGps = (data.lat !== undefined && data.lng !== undefined);
    const gpsRaw = data.gps_valid !== undefined ? data.gps_valid
                 : data.gps       !== undefined ? data.gps
                 : true;
    const gpsValid = (typeof gpsRaw === 'string')
                   ? gpsRaw.toUpperCase() === 'VALID'
                   : !!gpsRaw;

    if (hasGps && gpsValid && Number(data.lat) !== 0 && Number(data.lng) !== 0) {
        // Leaflet pakai urutan [lat, lng]
        const lat = Number(data.lat);
        const lng = Number(data.lng);
        const coords = [lat, lng];
        updateGPSDisplay(lat, lng);
        updateTruckPosition(coords);
        checkRouteCompliance(coords);
        checkGeofence(coords);
    } else if (hasGps && !gpsValid) {
        // GPS belum fix — beri tahu tanpa memindahkan marker
        const gpsEl = document.getElementById('val-gps');
        if (gpsEl) gpsEl.textContent = "Menunggu fix GPS...";
    }

    // ----- Kemiringan IMU (node sensor terpisah) -----
    if (data.imu !== undefined) {
        updateIMUDisplay(data.imu);
        if (Math.abs(data.imu) > SENSOR_CONFIG.imuThreshold) {
            addLog(`⚠ PERINGATAN: Kemiringan tidak normal (${data.imu}°)`, "warning");
        }
    }

    // ----- Sinyal GSM (hardware mengirim "gsm_dbm"; toleran "gsm") -----
    const gsm = (data.gsm_dbm !== undefined) ? data.gsm_dbm
              : (data.gsm !== undefined) ? data.gsm
              : undefined;
    if (gsm !== undefined) {
        updateGSMDisplay(gsm);
    }

    // ----- Kecepatan / status gerak -----
    // Hardware mengirim "speed" (km/h); toleran "speed_kmph" dan "moving"
    const speedVal = data.speed_kmph !== undefined ? Number(data.speed_kmph)
                   : data.speed      !== undefined ? Number(data.speed)
                   : undefined;
    if (data.moving !== undefined) {
        updateOperationStatus(!!data.moving);
    } else if (speedVal !== undefined) {
        updateOperationStatus(speedVal > 1.0);
    }

    // ----- Log periodik (maks 1x per 10 detik) -----
    const now = Date.now();
    if (!window.lastLogTime || now - window.lastLogTime > 10000) {
        if (data.tof1 !== undefined) {
            const cap = calculateCapacity((data.tof1 + data.tof2 + data.tof3) / 3).toFixed(1);
            addLog(`Data diterima - Kapasitas: ${cap}%, GPS: ${gpsValid ? 'Valid' : 'No fix'}`, "info");
        } else if (hasGps) {
            addLog(`Data GPS diterima - ${gpsValid ? 'Valid' : 'Menunggu fix'}`, "info");
        }
        window.lastLogTime = now;
    }
}

// ===== CALCULATE CAPACITY PERCENTAGE =====
function calculateCapacity(distance) {
    const empty = SENSOR_CONFIG.tofMaxDistance; // 200cm
    const full  = SENSOR_CONFIG.tofMinDistance; // 20cm
    const percent = ((empty - distance) / (empty - full)) * 100;
    return Math.max(0, Math.min(100, percent));
}

// ===== UPDATE MQTT STATUS DISPLAY =====
function updateMQTTStatus(text, colorClass) {
    const statusEl = document.getElementById('mqtt-status');
    if (statusEl) {
        statusEl.textContent = text === "Connected" ? "Connected" : (text === "Connecting" ? "Connecting..." : text);
        statusEl.className = `block text-xs px-2 py-1 mt-1 rounded text-white font-semibold ${colorClass}`;
    }

    const cardEl          = document.getElementById('mqtt-card');
    const valEl           = document.getElementById('val-mqtt-status');
    const indicatorEl     = document.getElementById('mqtt-status-indicator');
    const iconContainerEl = document.getElementById('mqtt-icon-container');

    if (cardEl && valEl && indicatorEl && iconContainerEl) {
        let statusText       = "Menghubungkan...";
        let indicatorText    = "Connecting";
        let cardBorderClass  = "border-orange-custom";
        let indicatorBgClass = "bg-orange-custom";
        let iconClass        = "bg-orange-100 text-orange-custom";
        let iconHTML         = '<i class="fa-solid fa-wifi animate-pulse"></i>';

        if (text === "Connected") {
            statusText       = "Terhubung";
            indicatorText    = "Online";
            cardBorderClass  = "border-green-light";
            indicatorBgClass = "bg-green-light";
            iconClass        = "bg-green-100 text-green-light";
            iconHTML         = '<i class="fa-solid fa-wifi"></i>';
        } else if (text === "Disconnected" || text === "Failed") {
            statusText       = "Terputus";
            indicatorText    = "Offline";
            cardBorderClass  = "border-red-500";
            indicatorBgClass = "bg-red-500";
            iconClass        = "bg-red-100 text-red-500";
            iconHTML         = '<i class="fa-solid fa-wifi-slash"></i>';
        }

        valEl.textContent = statusText;
        indicatorEl.textContent = indicatorText;
        cardEl.className = `bg-white p-5 rounded-2xl soft-shadow border-l-4 ${cardBorderClass} flex items-center justify-between`;
        indicatorEl.className = `text-xs px-2 py-1 rounded text-white mt-2 inline-block ${indicatorBgClass} ${text === "Connecting" ? "animate-pulse" : ""}`;
        iconContainerEl.className = `w-11 h-11 rounded-xl flex items-center justify-center text-xl ${iconClass}`;
        iconContainerEl.innerHTML = iconHTML;
    }
}

// ===== PUBLISH MESSAGE =====
function publishMQTT(topic, payload) {
    if (!isConnected || !mqttClient) {
        console.warn("[MQTT] Not connected, cannot publish");
        addLog("MQTT belum terkoneksi, tidak bisa publish", "warning");
        return false;
    }

    try {
        mqttClient.publish(topic, JSON.stringify(payload), { qos: MQTT_CONFIG.qos, retain: false });
        console.log("[MQTT] Published to:", topic, payload);
        return true;
    } catch (error) {
        console.error("[MQTT] Publish error:", error);
        addLog("Error publish MQTT: " + error.message, "error");
        return false;
    }
}
