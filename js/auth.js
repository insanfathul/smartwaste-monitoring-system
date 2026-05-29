/* ===================================
   AUTHENTICATION HANDLER
   Smart Waste Monitoring System
   =================================== */

// ===== PREDEFINED USERS DATABASE =====
// CATATAN: truckId di sini HARUS cocok dengan TRUCK_ID di main.cpp
// agar filter data MQTT tidak membuang paket GPS.
// ESP32 saat ini mengirim truck_id = "TRUCK_01".
const USERS_DATABASE = [
    {
        userId: "armadatruck_1",
        code: "truck01",
        name: "Armada Truck 1",
        truckId: "TRUCK_01",   // ← cocok dengan ESP32 (main.cpp)
        role: "driver"
    },
    {
        userId: "admin",
        code: "1234",
        name: "Administrator",
        truckId: "ALL",        // admin lihat semua truk
        role: "admin"
    },
    {
        userId: "driver01",
        code: "5678",
        name: "Budi Santoso",
        truckId: "TRUCK_01",
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

    const user = USERS_DATABASE.find(u => u.userId === userId && u.code === code);

    if (user) {
        loginSuccess(user);
    } else {
        loginFailed();
    }
}

// ===== LOGIN SUCCESS =====
function loginSuccess(user) {
    const session = {
        userId: user.userId,
        name: user.name,
        truckId: user.truckId,
        role: user.role,
        loginTime: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));

    const overlay = document.getElementById('login-overlay');
    overlay.style.animation = 'fadeOut 0.3s ease-out';

    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.style.animation = '';
        if (typeof initApp === 'function') {
            initApp();
        }
    }, 300);

    updateUserInfo(user);

    addLog(`✓ Login berhasil! Selamat datang, ${user.name}`, "success");
    addLog(`Memantau truck: ${user.truckId}`, "info");
}

// ===== LOGIN FAILED =====
function loginFailed() {
    const errorDiv = document.getElementById('login-error');
    const errorText = document.getElementById('login-error-text');

    errorDiv.classList.remove('hidden');
    errorText.textContent = 'User ID atau Kode Akses salah!';

    const form = document.getElementById('login-form');
    form.style.animation = 'shake 0.5s';

    setTimeout(() => {
        form.style.animation = '';
    }, 500);

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
        document.getElementById('login-overlay').classList.remove('hidden');
        return false;
    }

    try {
        const user = JSON.parse(session);
        updateUserInfo(user);
        document.getElementById('login-overlay').classList.add('hidden');
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

    localStorage.removeItem(STORAGE_KEYS.session);

    // FIX: mqtt.js memakai mqtt.js library → method-nya .end(), bukan .disconnect()
    if (typeof mqttClient !== 'undefined' && mqttClient) {
        try { mqttClient.end(true); } catch (e) { console.warn(e); }
    }

    document.getElementById('login-overlay').classList.remove('hidden');

    document.getElementById('login-userid').value = '';
    document.getElementById('login-code').value = '';
    document.getElementById('login-error').classList.add('hidden');

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

// ===== SHAKE & FADE ANIMATION (inject ke <head>) =====
const shakeKeyframes = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
    20%, 40%, 60%, 80% { transform: translateX(10px); }
}
@keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
}
`;
const style = document.createElement('style');
style.textContent = shakeKeyframes;
document.head.appendChild(style);
