/* ===================================
   MAIN APPLICATION SCRIPT
   Smart Waste Monitoring System
   =================================== */

// ===== INITIALIZE APPLICATION =====
function initApp() {
    console.log("=== Smart Waste Monitoring System ===");
    console.log("Initializing...");
    
    const isLoggedIn = checkAuth();
    
    if (!isLoggedIn) {
        console.log("User not logged in. Showing login screen...");
        return;
    }
    
    // Initialize map
    initMap();
    
    // Initialize charts
    initCharts();
    
    // Initialize MQTT connection
    initMQTT();
    
    // Update stats
    updateWastePointsStats();
    updateCurrentTime();
    
    console.log("System ready!");
    
    const user = getCurrentUser();
    addLog(`✓ Sistem aktif - ${user.name} (${user.truckId})`, "success");
}

// Automatically initialize app on load
document.addEventListener('DOMContentLoaded', initApp);