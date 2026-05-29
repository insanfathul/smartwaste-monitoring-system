/* ===================================
   UI UPDATE FUNCTIONS
   Smart Waste Monitoring System
   =================================== */

// ===== UPDATE CAPACITY DISPLAY =====
function updateCapacityDisplay(percent) {
    const valEl = document.getElementById('val-capacity');
    const statusEl = document.getElementById('capacity-status');

    if (valEl) {
        valEl.textContent = percent.toFixed(1) + '%';
    }

    if (statusEl) {
        let config = CAPACITY_CONFIG.low;

        if (percent >= CAPACITY_CONFIG.critical.min) {
            config = CAPACITY_CONFIG.critical;
        } else if (percent >= CAPACITY_CONFIG.high.min) {
            config = CAPACITY_CONFIG.high;
        } else if (percent >= CAPACITY_CONFIG.medium.min) {
            config = CAPACITY_CONFIG.medium;
        }

        statusEl.textContent = config.label;
        statusEl.className = `text-xs px-2 py-1 rounded text-white mt-2 inline-block ${config.class}`;

        if (percent >= 90) {
            addLog(`🚨 KAPASITAS KRITIS (${percent.toFixed(1)}%) - Segera kosongkan!`, "error");
        }
    }
}

// ===== UPDATE GPS DISPLAY =====
function updateGPSDisplay(lat, lng) {
    const gpsEl = document.getElementById('val-gps');
    if (gpsEl) {
        gpsEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
}

// ===== UPDATE IMU DISPLAY =====
function updateIMUDisplay(angle) {
    const imuEl = document.getElementById('val-imu');
    if (imuEl) {
        imuEl.textContent = Number(angle).toFixed(1) + '°';
    }
}

// ===== UPDATE GSM DISPLAY =====
function updateGSMDisplay(signal) {
    const gsmEl = document.getElementById('val-gsm');
    if (gsmEl) {
        gsmEl.textContent = signal + ' dBm';
    }
}

// ===== UPDATE OPERATION STATUS =====
function updateOperationStatus(isMoving) {
    const statusEl = document.getElementById('val-operation');
    const indicatorEl = document.getElementById('operation-indicator');

    if (statusEl && indicatorEl) {
        if (isMoving) {
            statusEl.textContent = "Beroperasi";
            indicatorEl.innerHTML = '<i class="fa-solid fa-circle text-green-light mr-1 animate-pulse"></i>Sedang Beroperasi';
        } else {
            statusEl.textContent = "Standby";
            indicatorEl.innerHTML = '<i class="fa-solid fa-circle text-gray-400 mr-1"></i>Tidak Beroperasi';
        }
    }
}

// ===== ADD LOG TO NOTIFICATION PANEL =====
function addLog(text, type = "info") {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const div = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString('id-ID');

    let borderColor = "border-gray-300";
    let icon = "fa-info-circle";

    switch (type) {
        case "success":
            borderColor = "border-green-dark";
            icon = "fa-check-circle";
            break;
        case "warning":
            borderColor = "border-orange-custom";
            icon = "fa-exclamation-triangle";
            break;
        case "error":
            borderColor = "border-red-600";
            icon = "fa-times-circle";
            break;
        case "info":
        default:
            borderColor = "border-blue-500";
            icon = "fa-info-circle";
    }

    div.className = `p-3 bg-gray-50 border-l-2 ${borderColor} rounded-r-xl`;
    div.innerHTML = `
        <div class="flex gap-2">
            <i class="fa-solid ${icon} mt-0.5"></i>
            <div class="flex-1">
                <b class="text-gray-500">[${timestamp}]</b>
                <span class="ml-2">${text}</span>
            </div>
        </div>
    `;

    container.insertBefore(div, container.firstChild);

    // Batasi 50 log
    while (container.children.length > 50) {
        container.removeChild(container.lastChild);
    }
}

// ===== CLEAR ALL LOGS =====
function clearLogs() {
    const container = document.getElementById('notification-container');
    if (container) {
        container.innerHTML = '';
        addLog("Log dibersihkan", "info");
    }
}

// ===== UPDATE CURRENT TIME =====
function updateCurrentTime() {
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('id-ID');
    }
}
setInterval(updateCurrentTime, 1000);

// ===== VIEW SWITCHING =====
// FIX: event diterima sebagai parameter (HTML memanggil switchView('dashboard', event)),
// tidak lagi mengandalkan variabel global `event` yang rapuh.
function switchView(viewName, event) {
    console.log("Switching to view:", viewName);

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active', 'bg-green-600');
    });

    if (event && event.target) {
        const link = event.target.closest('.nav-link');
        if (link) link.classList.add('active', 'bg-green-600');
    }
}

// ===== UPDATE WASTE POINTS STATS =====
function updateWastePointsStats() {
    if (typeof getWastePoints !== 'function') return;
    const points = getWastePoints();
    const total = points.length;
    const collected = points.filter(p => p.status === 'collected').length;
    const pending = points.filter(p => p.status === 'pending').length;

    const totalEl = document.getElementById('total-points');
    const collectedEl = document.getElementById('collected-points');
    const pendingEl = document.getElementById('pending-points');

    if (totalEl) totalEl.textContent = total;
    if (collectedEl) collectedEl.textContent = collected;
    if (pendingEl) pendingEl.textContent = pending;
}
setInterval(updateWastePointsStats, 2000);
