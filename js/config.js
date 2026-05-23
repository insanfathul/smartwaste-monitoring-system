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
    topic: "truck/monitoring/data", // Will be updated based on user login
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
    session: 'swms_session',
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
    
    routeTolerance: 50 // Meter tolerance dari rute
};

// ===== WASTE COLLECTION POINTS (TITIK PENGAMBILAN SAMPAH) =====
const WASTE_POINTS = [
    {
        id: "WP-01",
        name: "Gedung Rektorat",
        location: [-6.9744, 107.6316],
        type: "building", // building, canteen, dormitory, public
        capacity: 240, // liter
        priority: "high", // high, medium, low
        schedule: ["06:00", "14:00"], // jam pengambilan
        status: "pending" // pending, collected, skipped
    },
    {
        id: "WP-02",
        name: "Gedung Selaru (Fakultas Teknik)",
        location: [-6.9730, 107.6325],
        type: "building",
        capacity: 240,
        priority: "high",
        schedule: ["06:30", "14:30"],
        status: "pending"
    },
    {
        id: "WP-03",
        name: "Parkir Utara",
        location: [-6.9715, 107.6335],
        type: "public",
        capacity: 120,
        priority: "medium",
        schedule: ["07:00"],
        status: "pending"
    },
    {
        id: "WP-04",
        name: "Kantin Utara",
        location: [-6.9700, 107.6340],
        type: "canteen",
        capacity: 240,
        priority: "high",
        schedule: ["07:30", "12:00", "15:00"],
        status: "pending"
    },
    {
        id: "WP-05",
        name: "GKU Barat (Gedung Kuliah Umum)",
        location: [-6.9720, 107.6310],
        type: "building",
        capacity: 240,
        priority: "medium",
        schedule: ["08:00", "15:30"],
        status: "pending"
    },
    {
        id: "WP-06",
        name: "Fakultas Ekonomi & Bisnis",
        location: [-6.9740, 107.6300],
        type: "building",
        capacity: 240,
        priority: "medium",
        schedule: ["08:30"],
        status: "pending"
    },
    {
        id: "WP-07",
        name: "Sport Center",
        location: [-6.9760, 107.6315],
        type: "public",
        capacity: 120,
        priority: "low",
        schedule: ["09:00", "16:00"],
        status: "pending"
    },
    {
        id: "WP-08",
        name: "Asrama Putra",
        location: [-6.9780, 107.6330],
        type: "dormitory",
        capacity: 240,
        priority: "high",
        schedule: ["06:00", "18:00"],
        status: "pending"
    },
    {
        id: "WP-09",
        name: "Asrama Putri",
        location: [-6.9785, 107.6340],
        type: "dormitory",
        capacity: 240,
        priority: "high",
        schedule: ["06:00", "18:00"],
        status: "pending"
    },
    {
        id: "WP-10",
        name: "Kantin Selatan",
        location: [-6.9790, 107.6345],
        type: "canteen",
        capacity: 240,
        priority: "high",
        schedule: ["07:00", "12:00", "17:00"],
        status: "pending"
    }
];

// ===== PREDEFINED ROUTES (RUTE-RUTE YANG TERSEDIA) =====
const ROUTE_TEMPLATES = {
    // Rute Pagi (Morning Route)
    morning: {
        id: "ROUTE-MORNING",
        name: "Rute Pagi (06:00 - 10:00)",
        description: "Pengambilan sampah area gedung dan asrama pagi hari",
        color: "#F57C00", // Orange
        startTime: "06:00",
        endTime: "10:00",
        waypoints: [
            { pointId: "WP-08", order: 1 }, // Asrama Putra
            { pointId: "WP-09", order: 2 }, // Asrama Putri
            { pointId: "WP-01", order: 3 }, // Rektorat
            { pointId: "WP-02", order: 4 }, // Selaru
            { pointId: "WP-03", order: 5 }, // Parkir Utara
            { pointId: "WP-04", order: 6 }  // Kantin Utara
        ],
        estimatedDuration: 120, // minutes
        status: "active"
    },
    
    // Rute Siang (Afternoon Route)
    afternoon: {
        id: "ROUTE-AFTERNOON",
        name: "Rute Siang (12:00 - 16:00)",
        description: "Pengambilan sampah kantin dan area publik",
        color: "#2E7D32", // Green
        startTime: "12:00",
        endTime: "16:00",
        waypoints: [
            { pointId: "WP-04", order: 1 }, // Kantin Utara
            { pointId: "WP-10", order: 2 }, // Kantin Selatan
            { pointId: "WP-05", order: 3 }, // GKU
            { pointId: "WP-02", order: 4 }, // Selaru
            { pointId: "WP-07", order: 5 }  // Sport Center
        ],
        estimatedDuration: 90,
        status: "active"
    },
    
    // Rute Sore (Evening Route)
    evening: {
        id: "ROUTE-EVENING",
        name: "Rute Sore (15:00 - 18:00)",
        description: "Pengambilan sampah akhir hari",
        color: "#1976D2", // Blue
        startTime: "15:00",
        endTime: "18:00",
        waypoints: [
            { pointId: "WP-04", order: 1 }, // Kantin Utara
            { pointId: "WP-10", order: 2 }, // Kantin Selatan
            { pointId: "WP-08", order: 3 }, // Asrama Putra
            { pointId: "WP-09", order: 4 }, // Asrama Putri
            { pointId: "WP-07", order: 5 }  // Sport Center
        ],
        estimatedDuration: 90,
        status: "active"
    },
    
    // Rute Custom (dapat ditambah sesuai kebutuhan)
    custom: {
        id: "ROUTE-CUSTOM",
        name: "Rute Custom",
        description: "Rute yang dapat disesuaikan manual",
        color: "#9C27B0", // Purple
        waypoints: [],
        status: "inactive"
    }
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
    workingHoursStart: 6,
    workingHoursEnd: 18,
    updateInterval: 5000
};

// ===== STORAGE KEYS =====
const STORAGE_KEYS = {
    session: 'swms_session',
    tripHistory: 'swms_trip_history',
    logs: 'swms_logs',
    activeRoute: 'swms_active_route',
    wastePoints: 'swms_waste_points'
};

// ===== SENSOR HARDWARE MAPPING =====
const SENSOR_CONFIG = {
    tofSensors: 3,
    tofMaxDistance: 200,
    tofMinDistance: 20,
    imuThreshold: 15,
    gsmSignalMin: -113,
    gsmSignalMax: -51
};

// ===== ICON MAPPING FOR WASTE POINTS =====
const POINT_ICONS = {
    building: {
        icon: "fa-building",
        color: "#2E7D32"
    },
    canteen: {
        icon: "fa-utensils",
        color: "#F57C00"
    },
    dormitory: {
        icon: "fa-bed",
        color: "#1976D2"
    },
    public: {
        icon: "fa-trash",
        color: "#757575"
    }
};