/* ===================================
   CONFIGURATION FILE
   Smart Waste Monitoring System
   =================================== */

// ===== MQTT CONFIGURATION =====
// Broker: HiveMQ Cloud (Free #1) - Telkom University
// Web  → port 8884 WSS  |  ESP32+SIM800L → port 8883 TLS
const MQTT_CONFIG = {
    host: "ad88ee6f121e4c71933d6feb4208621a.s1.eu.hivemq.cloud",
    port: 8884,        // WebSocket Secure (WSS) - untuk browser
    path: "/mqtt",
    clientId: "swms_web_" + Math.random().toString(16).substr(2, 8),
    username: "cd_monitoring_armadatrucksampah",
    password: "CU7g.9MVkgD2!WA",
    topic: "truck/monitoring/data",
    qos: 1,
    useSSL: true,
    keepAlive: 60,
    cleanSession: true
};

// ===== MAP CONFIGURATION =====
const MAP_CONFIG = {
    // Telkom University - Jl. Telekomunikasi No.1, Terusan Buah Batu, Bandung
    center: [-6.9735, 107.6303],
    zoom: 16,

    // Rute default yang otomatis ditampilkan saat peta pertama kali dibuka
    defaultRoute: 'morning',

    // Telkom University Geofence Boundary (polygon area kampus)
    campusBoundary: [
        [-6.9687, 107.6278],  // Utara Barat - Pintu Masuk Utama
        [-6.9687, 107.6354],  // Utara Timur - Jl. Telekomunikasi sisi timur
        [-6.9803, 107.6360],  // Selatan Timur - Dekat Tol Padaleunyi
        [-6.9807, 107.6276]   // Selatan Barat - Batas Sukapura
    ],

    routeTolerance: 50 // Meter tolerance dari rute
};

// ===== WASTE COLLECTION POINTS (TITIK PENGAMBILAN SAMPAH) =====
// Koordinat berdasarkan posisi aktual gedung di kampus Telkom University Bandung
const WASTE_POINTS = [
    {
        id: "WP-01",
        name: "Gedung Bangkit (Rektorat)",
        location: [-6.9733, 107.6306],
        type: "building",
        capacity: 240,
        priority: "high",
        schedule: ["06:00", "14:00"],
        status: "pending"
    },
    {
        id: "WP-02",
        name: "Gedung Selaru (Teknik Informatika)",
        location: [-6.9718, 107.6332],
        type: "building",
        capacity: 240,
        priority: "high",
        schedule: ["06:30", "14:30"],
        status: "pending"
    },
    {
        id: "WP-03",
        name: "Parkir Utara",
        location: [-6.9705, 107.6316],
        type: "public",
        capacity: 120,
        priority: "medium",
        schedule: ["07:00"],
        status: "pending"
    },
    {
        id: "WP-04",
        name: "Student Center & Kantin Utara",
        location: [-6.9697, 107.6308],
        type: "canteen",
        capacity: 240,
        priority: "high",
        schedule: ["07:00", "12:00", "17:00"],
        status: "pending"
    },
    {
        id: "WP-05",
        name: "Gedung GKU (Kuliah Umum)",
        location: [-6.9749, 107.6300],
        type: "building",
        capacity: 240,
        priority: "medium",
        schedule: ["08:00", "15:30"],
        status: "pending"
    },
    {
        id: "WP-06",
        name: "Gedung FEB (Ekonomi & Bisnis)",
        location: [-6.9757, 107.6291],
        type: "building",
        capacity: 240,
        priority: "medium",
        schedule: ["08:30"],
        status: "pending"
    },
    {
        id: "WP-07",
        name: "Sport Center",
        location: [-6.9763, 107.6318],
        type: "public",
        capacity: 120,
        priority: "low",
        schedule: ["09:00", "16:00"],
        status: "pending"
    },
    {
        id: "WP-08",
        name: "Asrama Putra",
        location: [-6.9782, 107.6329],
        type: "dormitory",
        capacity: 240,
        priority: "high",
        schedule: ["06:00", "18:00"],
        status: "pending"
    },
    {
        id: "WP-09",
        name: "Asrama Putri",
        location: [-6.9778, 107.6348],
        type: "dormitory",
        capacity: 240,
        priority: "high",
        schedule: ["06:00", "18:00"],
        status: "pending"
    },
    {
        id: "WP-10",
        name: "Kantin Selatan (Area GSG)",
        location: [-6.9767, 107.6337],
        type: "canteen",
        capacity: 240,
        priority: "high",
        schedule: ["07:00", "12:00", "17:00"],
        status: "pending"
    }
];

// ===== PREDEFINED ROUTES =====
const ROUTE_TEMPLATES = {
    morning: {
        id: "ROUTE-MORNING",
        name: "Rute Pagi (06:00 - 10:00)",
        description: "Pengambilan sampah area gedung dan asrama pagi hari",
        color: "#F57C00",
        startTime: "06:00",
        endTime: "10:00",
        waypoints: [
            { pointId: "WP-08", order: 1 },
            { pointId: "WP-09", order: 2 },
            { pointId: "WP-01", order: 3 },
            { pointId: "WP-02", order: 4 },
            { pointId: "WP-03", order: 5 },
            { pointId: "WP-04", order: 6 }
        ],
        estimatedDuration: 120,
        status: "active"
    },
    
    afternoon: {
        id: "ROUTE-AFTERNOON",
        name: "Rute Siang (12:00 - 16:00)",
        description: "Pengambilan sampah kantin dan area publik",
        color: "#2E7D32",
        startTime: "12:00",
        endTime: "16:00",
        waypoints: [
            { pointId: "WP-04", order: 1 },
            { pointId: "WP-10", order: 2 },
            { pointId: "WP-05", order: 3 },
            { pointId: "WP-02", order: 4 },
            { pointId: "WP-07", order: 5 }
        ],
        estimatedDuration: 90,
        status: "active"
    },
    
    evening: {
        id: "ROUTE-EVENING",
        name: "Rute Sore (15:00 - 18:00)",
        description: "Pengambilan sampah akhir hari",
        color: "#1976D2",
        startTime: "15:00",
        endTime: "18:00",
        waypoints: [
            { pointId: "WP-04", order: 1 },
            { pointId: "WP-10", order: 2 },
            { pointId: "WP-08", order: 3 },
            { pointId: "WP-09", order: 4 },
            { pointId: "WP-07", order: 5 }
        ],
        estimatedDuration: 90,
        status: "active"
    },
    
    custom: {
        id: "ROUTE-CUSTOM",
        name: "Rute Custom",
        description: "Rute yang dapat disesuaikan manual",
        color: "#9C27B0",
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