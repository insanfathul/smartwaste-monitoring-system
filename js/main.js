/* ===================================
   MAIN APPLICATION SCRIPT
   Smart Waste Monitoring System
   =================================== */

// ===== INITIALIZE APPLICATION =====
function initApp() {
    console.log("=== Smart Waste Monitoring System ===");
    console.log("Initializing...");
    
    // Initialize map
    initMap();
    
    // Initialize charts
    initCharts();
    
    // Initialize MQTT connection
    initMQTT();
    
    // Load truck list
    displayTruckList();
    
    // Start time update
    updateCurrentTime();
    
    console.log("System ready!");
    addLog("✓ Sistem Smart Waste Monitoring System aktif dan siap beroperasi", "success");
}

// ===== RUN ON PAGE LOAD =====
window.addEventListener('DOMContentLoad', initApp);

// Fallback if DOMContentLoaded already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// ===== SIMULATE DATA (FOR TESTING ONLY) =====
// Uncomment this to test without actual hardware
/*
function simulateData() {
    setInterval(() => {
        const fakeData = {
            lat: -6.9744 + (Math.random() - 0.5) * 0.01,
            lng: 107.6316 + (Math.random() - 0.5) * 0.01,
            tof1: 50 + Math.random() * 100,
            tof2: 50 + Math.random() * 100,
            tof3: 50 + Math.random() * 100,
            imu: (Math.random() - 0.5) * 20,
            gsm: -60 - Math.random() * 40,
            moving: Math.random() > 0.5
        };
        
        processIncomingData(fakeData);
    }, 3000);
}

// Uncomment to activate simulation
// setTimeout(simulateData, 2000);
*/