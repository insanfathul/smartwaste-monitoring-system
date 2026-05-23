/* ===================================
   MAIN APPLICATION SCRIPT
   Smart Waste Monitoring System
   =================================== */

// ===== INITIALIZE APPLICATION =====
function initApp() {
    console.log("=== Smart Waste Monitoring System ===");
    console.log("Initializing...");
    
    // Check authentication first
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
    
    // Start time update
    updateCurrentTime();
    
    console.log("System ready!");
    
    const user = getCurrentUser();
    addLog(`✓ Sistem aktif - ${user.name} (${user.truckId})`, "success");
}

// ===== RUN ON PAGE LOAD =====
window.addEventListener('load', initApp);

// Fallback
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}