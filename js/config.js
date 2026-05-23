/* ===================================
   CONFIGURATION FILE
   Smart Waste Monitoring System
   =================================== */

// ===== MQTT CONFIGURATION =====
const MQTT_CONFIG = {
    host: "broker.hivemq.com",
    port: 8000,
    path: "/mqtt",
    clientId: "swms_web_" + Math.random().toString(16).substr(2, 8),
    topic: "truck/monitoring/data",
    qos: 1,
    useSSL: false,
    keepAlive: 60,
    cleanSession: true
};

// ===== MAP CONFIGURATION =====
const MAP_CONFIG = {
    // Telkom University Center Point (Gedung Rektorat)
    center: [-6.9744, 107.6316],
    zoom: 16,
    
    // Telkom University Geofence Boundary
    campusBoundary: [
        [-6.9691, 107.6276], // Utara Barat (Pintu Utara)
        [-6.9685, 107.6346], // Utara Timur (Jl. Telekomunikasi)
        [-6.9798, 107.6360], // Selatan Timur (Dekat Tol)
        [-6.9809, 107.6291]  // Selatan Barat (Sukapura)
    ],
    
    // Predefined Route (Jalur Marking Orange)
    predefinedRoute: [
        [-6.9744, 107.6316], // Start: Rektorat
        [-6.9730, 107.6325], // Gedung Selaru
        [-6.9715, 107.6335], // Parkir Utara
        [-6.9700, 107.6340], // Pintu Keluar Utara
        [-6.9720, 107.6310], // GKU Barat
        [-6.9740, 107.6300], // FEB Area
        [-6.9760, 107.6315], // Sport Center
        [-6.9780, 107.6330], // Asrama
        [-6.9790, 107.6345], // Exit Point Timur
        [-6.9744, 107.6316]  // Back to Start
    ],
    
    routeTolerance: 50 // Meter tolerance dari rute
};

// ===== CAPACITY THRESHOLDS =====
const CAPACITY_CONFIG = {
    low: { max: 50, color: '#66BB6A', label: 'Normal', class: 'capacity-green' },
    medium: { min: 50, max: 60, color: '#FDD835', label: 'Sedang', class: 'capacity-yellow' },
    high: { min: 60, max: 80, color: '#F57C00', label: 'Tinggi', class: 'capacity-orange' },
    critical: { min: 80, max: 100, color: '#E53935', label: 'Kritis', class: 'capacity-red' }
};

// ===== OPERATION TARGETS =====
const OPERATION_CONFIG = {
    dailyTargetTrips: 8,
    workingHoursStart: 6,  // 06:00
    workingHoursEnd: 18,   // 18:00
    updateInterval: 5000   // 5 detik
};

// ===== STORAGE KEYS =====
const STORAGE_KEYS = {
    trucks: 'swms_trucks',
    activeTruck: 'swms_active_truck',
    tripHistory: 'swms_trip_history',
    logs: 'swms_logs'
};

// ===== SENSOR HARDWARE MAPPING =====
const SENSOR_CONFIG = {
    tofSensors: 3,         // 3 sensor ToF
    tofMaxDistance: 200,   // cm (tinggi bak kosong)
    tofMinDistance: 20,    // cm (tinggi saat penuh)
    imuThreshold: 15,      // derajat kemiringan berbahaya
    gsmSignalMin: -113,    // dBm (sinyal lemah)
    gsmSignalMax: -51      // dBm (sinyal kuat)
};