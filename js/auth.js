/* ===================================
   AUTHENTICATION HANDLER
   Smart Waste Monitoring System
   =================================== */

// ===== PREDEFINED USERS DATABASE =====
const USERS_DATABASE = [
    {
        userId: "armadatruck_1",
        code: "truck01",
        name: "Armada Truck 1",
        truckId: "TRUCK_01",
        role: "driver"
    },
    {
        userId: "admin",
        code: "1234",
        name: "Administrator",
        truckId: "TS-01",
        role: "admin"
    },
    {
        userId: "driver01",
        code: "5678",
        name: "Budi Santoso",
        truckId: "TS-01",
        role: "driver"
    },
    {
        userId: "driver02",
        code: "9012",
        name: "Andi Wijaya",
        truckId: "TS-02",
        role: "driver"
    },
    {
        userId: "operator",
        code: "3456",
        name: "Operator Pusat",
        truckId: "ALL",
        role: "operator"
    }
];

// ===== HANDLE LOGIN FORM SUBMIT =====
function handleLogin(event) {
    event.preventDefault();
    
    const userId = document.getElementById('login-userid').value.trim();
    const code = document.getElementById('login-code').value.trim();
    
    // Validate credentials
    const user = USERS_DATABASE.find(u => u.userId === userId && u.code === code);
    
    if (user) {
        // Login successful
        loginSuccess(user);
    } else {
        // Login failed
        loginFailed();
    }
}

// ===== LOGIN SUCCESS =====
function loginSuccess(user) {
    // Save user session
    const session = {
        userId: user.userId,
        name: user.name,
        truckId: user.truckId,
        role: user.role,
        loginTime: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    
    // Hide login overlay with animation
    const overlay = document.getElementById('login-overlay');
    overlay.style.animation = 'fadeOut 0.3s ease-out';
    
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.style.animation = '';
        if (typeof initApp === 'function') {
            initApp();
        }
    }, 300);
    
    // Update user info in sidebar
    updateUserInfo(user);
    
    // Add success log
    addLog(`✓ Login berhasil! Selamat datang, ${user.name}`, "success");
    
    // Subscribe to MQTT topic (menggunakan topic utama dari hardware)
    addLog(`Berlangganan topic hardware: ${MQTT_CONFIG.topic}`, "info");
}

// ===== LOGIN FAILED =====
function loginFailed() {
    const errorDiv = document.getElementById('login-error');
    const errorText = document.getElementById('login-error-text');
    
    errorDiv.classList.remove('hidden');
    errorText.textContent = 'User ID atau Kode Akses salah!';
    
    // Shake animation
    const form = document.getElementById('login-form');
    form.style.animation = 'shake 0.5s';
    
    setTimeout(() => {
        form.style.animation = '';
    }, 500);
    
    // Clear password field
    document.getElementById('login-code').value = '';
    document.getElementById('login-code').focus();
}

// ===== UPDATE USER INFO IN SIDEBAR =====
function updateUserInfo(user) {
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-truck').textContent = `Truck ID: ${user.truckId}`;
}

// ===== CHECK IF USER IS LOGGED IN =====
function checkAuth() {
    const session = localStorage.getItem(STORAGE_KEYS.session);
    
    if (!session) {
        // Not logged in, show login overlay
        document.getElementById('login-overlay').classList.remove('hidden');
        return false;
    }
    
    try {
        const user = JSON.parse(session);
        
        // Update user info
        updateUserInfo(user);
        
        // Hide login overlay
        document.getElementById('login-overlay').classList.add('hidden');
        
        // Menggunakan topic utama dari hardware
        // MQTT_CONFIG.topic tetap menggunakan 'truck/monitoring/data' agar cocok dengan hardware
        
        return true;
    } catch (error) {
        console.error("Session parse error:", error);
        localStorage.removeItem(STORAGE_KEYS.session);
        return false;
    }
}

// ===== HANDLE LOGOUT =====
function handleLogout() {
    if (!confirm('Apakah Anda yakin ingin logout?')) {
        return;
    }
    
    // Clear session
    localStorage.removeItem(STORAGE_KEYS.session);
    
    // Disconnect MQTT
    if (mqttClient && isConnected) {
        mqttClient.disconnect();
    }
    
    // Show login overlay
    document.getElementById('login-overlay').classList.remove('hidden');
    
    // Reset form
    document.getElementById('login-userid').value = '';
    document.getElementById('login-code').value = '';
    document.getElementById('login-error').classList.add('hidden');
    
    // Clear logs
    clearLogs();
    
    addLog("Logout berhasil", "info");
}

// ===== GET CURRENT USER =====
function getCurrentUser() {
    const session = localStorage.getItem(STORAGE_KEYS.session);
    if (!session) return null;
    
    try {
        return JSON.parse(session);
    } catch (error) {
        return null;
    }
}

// ===== SHAKE ANIMATION CSS (ADD TO STYLES) =====
const shakeKeyframes = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
    20%, 40%, 60%, 80% { transform: translateX(10px); }
}

@keyframes fadeOut {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}
`;

// Inject shake animation
const style = document.createElement('style');
style.textContent = shakeKeyframes;
document.head.appendChild(style);