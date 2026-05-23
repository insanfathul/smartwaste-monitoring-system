/* ===================================
   LEAFLET MAP HANDLER
   Smart Waste Monitoring System
   =================================== */

let map = null;
let truckMarker = null;
let campusPolygon = null;
let routePolyline = null;
let traveledPolyline = null;
let traveledCoords = [];
let showingRoute = false;

// ===== INITIALIZE MAP =====
function initMap() {
    // Create map centered on Telkom University
    map = L.map('map').setView(MAP_CONFIG.center, MAP_CONFIG.zoom);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Draw campus boundary (geofence)
    drawCampusBoundary();
    
    // Create truck marker
    createTruckMarker();
    
    // Initialize predefined route (hidden by default)
    createPredefinedRoute();
    
    addLog("Peta dimuat. Area: Telkom University", "success");
}

// ===== DRAW CAMPUS GEOFENCE =====
function drawCampusBoundary() {
    campusPolygon = L.polygon(MAP_CONFIG.campusBoundary, {
        color: '#2E7D32',
        fillColor: '#66BB6A',
        fillOpacity: 0.15,
        weight: 3
    }).addTo(map);
    
    campusPolygon.bindPopup(`
        <b>Telkom University</b><br>
        <small>Zona Operasional Truck Sampah</small>
    `);
}

// ===== CREATE TRUCK MARKER =====
function createTruckMarker() {
    const truckIcon = L.divIcon({
        html: `<div style="background-color: #F57C00; color: white; padding: 10px; 
                border-radius: 50%; box-shadow: 0 3px 6px rgba(0,0,0,0.3); 
                text-align:center; border: 3px solid white;">
                <i class="fa-solid fa-truck-moving"></i></div>`,
        iconSize: [40, 40],
        className: 'custom-truck-marker'
    });
    
    truckMarker = L.marker(MAP_CONFIG.center, {icon: truckIcon}).addTo(map);
    truckMarker.bindPopup(`
        <b>Truck Sampah</b><br>
        <small>Menunggu data GPS...</small>
    `);
}

// ===== CREATE PREDEFINED ROUTE =====
function createPredefinedRoute() {
    routePolyline = L.polyline(MAP_CONFIG.predefinedRoute, {
        color: '#F57C00',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10'
    });
    // Don't add to map yet (will be toggled)
}

// ===== CREATE TRAVELED PATH =====
function initTraveledPath() {
    traveledPolyline = L.polyline([], {
        color: '#F57C00',
        weight: 5,
        opacity: 0.8
    }).addTo(map);
}

// ===== UPDATE TRUCK POSITION =====
function updateTruckPosition(coords) {
    if (!truckMarker) return;
    
    // Smooth animation
    truckMarker.setLatLng(coords);
    
    // Update popup content
    const activeTruck = getActiveTruck();
    const capacity = document.getElementById('val-capacity')?.textContent || '0%';
    
    truckMarker.setPopupContent(`
        <b>${activeTruck ? activeTruck.code : 'Truck'}</b><br>
        <small>Kapasitas: ${capacity}</small><br>
        <small>Lat: ${coords[0].toFixed(5)}, Lng: ${coords[1].toFixed(5)}</small>
    `);
    
    // Add to traveled path
    traveledCoords.push(coords);
    if (!traveledPolyline) {
        initTraveledPath();
    }
    traveledPolyline.setLatLngs(traveledCoords);
    
    // Auto center map on truck (optional)
    // map.panTo(coords);
}

// ===== CHECK IF POINT IN GEOFENCE =====
function checkGeofence(coords) {
    const isInside = isPointInPolygon(coords, MAP_CONFIG.campusBoundary);
    
    if (!isInside) {
        addLog("⚠ ALERT: Truck keluar dari area Telkom University!", "warning");
        // Could trigger alert sound here
    }
}

// ===== POINT IN POLYGON ALGORITHM =====
function isPointInPolygon(point, polygon) {
    let x = point[0], y = point[1];
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i][0], yi = polygon[i][1];
        let xj = polygon[j][0], yj = polygon[j][1];
        
        let intersect = ((yi > y) != (yj > y)) && 
                        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

// ===== CHECK ROUTE COMPLIANCE =====
function checkRouteCompliance(coords) {
    if (!showingRoute) return;
    
    // Calculate distance to nearest point on route
    let minDistance = Infinity;
    
    for (let routePoint of MAP_CONFIG.predefinedRoute) {
        const dist = calculateDistance(coords, routePoint);
        if (dist < minDistance) {
            minDistance = dist;
        }
    }
    
    const routeStatus = document.getElementById('route-compliance');
    
    if (minDistance > MAP_CONFIG.routeTolerance) {
        // Outside route tolerance
        routeStatus.textContent = "Menyimpang dari rute!";
        routeStatus.className = "text-xs px-2 py-1 bg-red-500 text-white rounded";
        addLog(`⚠ Truck menyimpang ${minDistance.toFixed(0)}m dari rute yang ditentukan`, "warning");
    } else {
        // On route
        routeStatus.textContent = "Mengikuti rute ✓";
        routeStatus.className = "text-xs px-2 py-1 bg-green-light text-white rounded";
    }
}

// ===== CALCULATE DISTANCE BETWEEN TWO POINTS (HAVERSINE) =====
function calculateDistance(coord1, coord2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = coord1[0] * Math.PI / 180;
    const φ2 = coord2[0] * Math.PI / 180;
    const Δφ = (coord2[0] - coord1[0]) * Math.PI / 180;
    const Δλ = (coord2[1] - coord1[1]) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
}

// ===== TOGGLE ROUTE VISIBILITY =====
function toggleRoute() {
    showingRoute = !showingRoute;
    const btn = document.getElementById('route-btn-text');
    
    if (showingRoute) {
        map.addLayer(routePolyline);
        btn.textContent = "Sembunyikan Rute";
        addLog("Rute referensi ditampilkan (marking orange)", "info");
    } else {
        map.removeLayer(routePolyline);
        btn.textContent = "Tampilkan Rute";
        document.getElementById('route-compliance').textContent = "Rute disembunyikan";
        document.getElementById('route-compliance').className = "text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded";
    }
}

// ===== CENTER MAP TO CAMPUS =====
function centerToCampus() {
    map.setView(MAP_CONFIG.center, MAP_CONFIG.zoom);
    addLog("Peta dipusatkan ke area kampus", "info");
}

// ===== CLEAR TRAVELED PATH =====
function clearTraveledPath() {
    traveledCoords = [];
    if (traveledPolyline) {
        traveledPolyline.setLatLngs([]);
    }
    addLog("Jalur perjalanan dihapus", "info");
}