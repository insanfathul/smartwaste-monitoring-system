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
        
        // Alert if critical
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
        imuEl.textContent = angle.toFixed(1) + '°';
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
    
    switch(type) {
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
    
    // Limit to 50 logs
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

// Update time every second
setInterval(updateCurrentTime, 1000);

// ===== TRUCK REGISTRATION =====
function registerTruck() {
    const userId = document.getElementById('input-userid').value.trim();
    const truckCode = document.getElementById('input-truckcode').value.trim();
    const driver = document.getElementById('input-driver').value.trim();
    
    if (!userId || !truckCode || !driver) {
        alert('Semua field harus diisi!');
        return;
    }
    
    const truck = {
        id: Date.now(),
        userId: userId,
        code: truckCode,
        driver: driver,
        registered: new Date().toISOString()
    };
    
    // Save to localStorage
    let trucks = getTrucks();
    trucks.push(truck);
    localStorage.setItem(STORAGE_KEYS.trucks, JSON.stringify(trucks));
    
    // Clear inputs
    document.getElementById('input-userid').value = '';
    document.getElementById('input-truckcode').value = '';
    document.getElementById('input-driver').value = '';
    
    // Refresh list
    displayTruckList();
    
    addLog(`✓ Truck ${truckCode} berhasil didaftarkan (Driver: ${driver})`, "success");
}

// ===== GET TRUCKS FROM STORAGE =====
function getTrucks() {
    const data = localStorage.getItem(STORAGE_KEYS.trucks);
    return data ? JSON.parse(data) : [];
}

// ===== GET ACTIVE TRUCK =====
function getActiveTruck() {
    const activeId = localStorage.getItem(STORAGE_KEYS.activeTruck);
    if (!activeId) return null;
    
    const trucks = getTrucks();
    return trucks.find(t => t.id == activeId) || null;
}

// ===== SET ACTIVE TRUCK =====
function setActiveTruck(truckId) {
    localStorage.setItem(STORAGE_KEYS.activeTruck, truckId);
    displayTruckList();
    
    const truck = getTrucks().find(t => t.id == truckId);
    if (truck) {
        addLog(`Truck aktif: ${truck.code}`, "info");
        clearTraveledPath(); // Clear previous path
    }
}

// ===== DELETE TRUCK =====
function deleteTruck(truckId) {
    if (!confirm('Yakin hapus truck ini?')) return;
    
    let trucks = getTrucks();
    trucks = trucks.filter(t => t.id != truckId);
    localStorage.setItem(STORAGE_KEYS.trucks, JSON.stringify(trucks));
    
    // If active truck deleted, clear active
    if (localStorage.getItem(STORAGE_KEYS.activeTruck) == truckId) {
        localStorage.removeItem(STORAGE_KEYS.activeTruck);
    }
    
    displayTruckList();
    addLog("Truck dihapus dari sistem", "warning");
}

// ===== DISPLAY TRUCK LIST =====
function displayTruckList() {
    const container = document.getElementById('truck-list');
    if (!container) return;
    
    const trucks = getTrucks();
    const activeId = localStorage.getItem(STORAGE_KEYS.activeTruck);
    
    if (trucks.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 col-span-3">Belum ada truck terdaftar</p>';
        return;
    }
    
    container.innerHTML = trucks.map(truck => `
        <div class="truck-card ${truck.id == activeId ? 'active' : ''}" onclick="setActiveTruck(${truck.id})">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h4 class="font-semibold text-dark-text text-sm">${truck.code}</h4>
                    <p class="text-xs text-gray-500 mt-1">Driver: ${truck.driver}</p>
                    <p class="text-xs text-gray-400">User: ${truck.userId}</p>
                </div>
                <button onclick="event.stopPropagation(); deleteTruck(${truck.id})" 
                        class="text-red-500 hover:text-red-700 text-xs">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            ${truck.id == activeId ? '<span class="text-xs bg-green-dark text-white px-2 py-1 rounded mt-2 inline-block">Aktif</span>' : ''}
        </div>
    `).join('');
}

// ===== VIEW SWITCHING =====
function switchView(viewName) {
    // This function can be expanded for multiple views
    // Currently only dashboard view exists
    console.log("Switching to view:", viewName);
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active', 'bg-green-600');
    });
    
    event.target.closest('.nav-link').classList.add('active', 'bg-green-600');
}

// Initialize truck list on load
document.addEventListener('DOMContentLoaded', function() {
    displayTruckList();
});