/* ===================================
   LEAFLET MAP HANDLER WITH ROUTES
   Smart Waste Monitoring System
   =================================== */

let map = null;
let truckMarker = null;
let campusPolygon = null;
let routePolyline = null;
let traveledPolyline = null;
let traveledCoords = [];
let showingRoute = false;
let wastePointMarkers = [];
let currentRoute = null;

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
    
    // Draw waste collection points
    drawWastePoints();
    
    // Create truck marker
    createTruckMarker();
    
    // Load saved active route
    loadActiveRoute();
    
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

// ===== DRAW WASTE COLLECTION POINTS =====
function drawWastePoints() {
    // Clear existing markers
    wastePointMarkers.forEach(marker => map.removeLayer(marker));
    wastePointMarkers = [];
    
    // Get waste points from storage or use default
    let points = getWastePoints();
    
    points.forEach((point, index) => {
        const iconConfig = POINT_ICONS[point.type] || POINT_ICONS.public;
        
        // Create custom icon based on type
        const wasteIcon = L.divIcon({
            html: `
                <div style="
                    background-color: ${iconConfig.color}; 
                    color: white; 
                    padding: 8px; 
                    border-radius: 50%; 
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    text-align: center;
                    border: 3px solid white;
                    position: relative;
                ">
                    <i class="fa-solid ${iconConfig.icon}"></i>
                    ${point.status === 'collected' ? 
                        '<div style="position:absolute;top:-5px;right:-5px;background:#4CAF50;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>' 
                        : ''}
                </div>
            `,
            iconSize: [35, 35],
            className: 'custom-waste-marker'
        });
        
        const marker = L.marker(point.location, {icon: wasteIcon}).addTo(map);
        
        // Create popup content
        const popupContent = `
            <div class="waste-point-popup">
                <h4 style="margin:0 0 8px 0;color:#263238;font-weight:600;">${point.name}</h4>
                <div style="font-size:12px;color:#666;">
                    <p style="margin:4px 0;">
                        <i class="fa-solid fa-tag" style="width:16px;color:#2E7D32;"></i>
                        <b>ID:</b> ${point.id}
                    </p>
                    <p style="margin:4px 0;">
                        <i class="fa-solid fa-dumpster" style="width:16px;color:#F57C00;"></i>
                        <b>Kapasitas:</b> ${point.capacity}L
                    </p>
                    <p style="margin:4px 0;">
                        <i class="fa-solid fa-flag" style="width:16px;color:#1976D2;"></i>
                        <b>Prioritas:</b> ${point.priority.toUpperCase()}
                    </p>
                    <p style="margin:4px 0;">
                        <i class="fa-solid fa-clock" style="width:16px;color:#757575;"></i>
                        <b>Jadwal:</b> ${point.schedule.join(', ')}
                    </p>
                    <p style="margin:4px 0;">
                        <i class="fa-solid fa-circle" style="width:16px;color:${point.status === 'collected' ? '#4CAF50' : '#FFC107'};"></i>
                        <b>Status:</b> ${getStatusText(point.status)}
                    </p>
                </div>
                <div style="margin-top:10px;display:flex;gap:5px;">
                    ${point.status !== 'collected' ? 
                        `<button onclick="markAsCollected('${point.id}')" 
                                style="flex:1;background:#4CAF50;color:white;border:none;padding:6px;border-radius:4px;cursor:pointer;font-size:11px;">
                            <i class="fa-solid fa-check"></i> Collected
                        </button>` : ''}
                    <button onclick="showPointDetails('${point.id}')" 
                            style="flex:1;background:#2E7D32;color:white;border:none;padding:6px;border-radius:4px;cursor:pointer;font-size:11px;">
                        <i class="fa-solid fa-info"></i> Detail
                    </button>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        wastePointMarkers.push(marker);
    });
    
    addLog(`${points.length} titik pengambilan sampah ditampilkan`, "info");
}

// ===== GET STATUS TEXT =====
function getStatusText(status) {
    const statusMap = {
        'pending': 'Belum Diambil',
        'collected': 'Sudah Diambil',
        'skipped': 'Dilewati'
    };
    return statusMap[status] || status;
}

// ===== MARK POINT AS COLLECTED =====
function markAsCollected(pointId) {
    let points = getWastePoints();
    const point = points.find(p => p.id === pointId);
    
    if (point) {
        point.status = 'collected';
        point.collectedAt = new Date().toISOString();
        saveWastePoints(points);
        drawWastePoints();
        
        addLog(`✓ ${point.name} ditandai sebagai sudah diambil`, "success");
        
        // Check if route is completed
        if (currentRoute) {
            checkRouteCompletion();
        }
    }
}

// ===== SHOW POINT DETAILS =====
function showPointDetails(pointId) {
    const points = getWastePoints();
    const point = points.find(p => p.id === pointId);
    
    if (point) {
        alert(`Detail Titik Pengambilan:\n\n` +
              `ID: ${point.id}\n` +
              `Nama: ${point.name}\n` +
              `Tipe: ${point.type}\n` +
              `Kapasitas: ${point.capacity}L\n` +
              `Prioritas: ${point.priority}\n` +
              `Jadwal: ${point.schedule.join(', ')}\n` +
              `Status: ${getStatusText(point.status)}\n` +
              `Koordinat: ${point.location[0]}, ${point.location[1]}`
        );
    }
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

// ===== DRAW ROUTE ON MAP =====
function drawRoute(routeKey) {
    // Remove existing route
    if (routePolyline) {
        map.removeLayer(routePolyline);
    }
    
    const route = ROUTE_TEMPLATES[routeKey];
    if (!route) {
        addLog("Rute tidak ditemukan", "error");
        return;
    }
    
    // Get waypoint coordinates
    const points = getWastePoints();
    const coordinates = route.waypoints.map(wp => {
        const point = points.find(p => p.id === wp.pointId);
        return point ? point.location : null;
    }).filter(coord => coord !== null);
    
    if (coordinates.length === 0) {
        addLog("Tidak ada koordinat valid untuk rute ini", "error");
        return;
    }
    
    // Draw polyline
    routePolyline = L.polyline(coordinates, {
        color: route.color,
        weight: 5,
        opacity: 0.7,
        dashArray: '10, 10'
    }).addTo(map);
    
    // Add route markers with numbers
    route.waypoints.forEach((wp, index) => {
        const point = points.find(p => p.id === wp.pointId);
        if (point) {
            const orderIcon = L.divIcon({
                html: `<div style="
                    background: ${route.color};
                    color: white;
                    border: 2px solid white;
                    border-radius: 50%;
                    width: 25px;
                    height: 25px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 12px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">${index + 1}</div>`,
                iconSize: [25, 25],
                className: 'route-order-marker'
            });
            
            L.marker(point.location, {icon: orderIcon}).addTo(map)
                .bindPopup(`<b>Stop ${index + 1}</b><br>${point.name}`);
        }
    });
    
    // Fit map to route bounds
    map.fitBounds(routePolyline.getBounds(), {padding: [50, 50]});
    
    // Save as active route
    currentRoute = route;
    localStorage.setItem(STORAGE_KEYS.activeRoute, JSON.stringify(route));
    
    showingRoute = true;
    document.getElementById('route-btn-text').textContent = "Sembunyikan Rute";
    
    addLog(`Rute "${route.name}" ditampilkan (${route.waypoints.length} titik)`, "success");
}

// ===== LOAD ACTIVE ROUTE =====
function loadActiveRoute() {
    const saved = localStorage.getItem(STORAGE_KEYS.activeRoute);
    if (saved) {
        try {
            currentRoute = JSON.parse(saved);
            // Find route key
            const routeKey = Object.keys(ROUTE_TEMPLATES).find(
                key => ROUTE_TEMPLATES[key].id === currentRoute.id
            );
            if (routeKey) {
                drawRoute(routeKey);
            }
        } catch (error) {
            console.error("Error loading route:", error);
        }
    }
}

// ===== TOGGLE ROUTE VISIBILITY =====
function toggleRoute() {
    if (showingRoute && routePolyline) {
        map.removeLayer(routePolyline);
        showingRoute = false;
        document.getElementById('route-btn-text').textContent = "Tampilkan Rute";
        
        // Remove order markers
        map.eachLayer(layer => {
            if (layer.options.className === 'route-order-marker') {
                map.removeLayer(layer);
            }
        });
        
        addLog("Rute disembunyikan", "info");
    } else {
        // Show route selection modal
        showRouteSelectionModal();
    }
}

// ===== SHOW ROUTE SELECTION MODAL =====
function showRouteSelectionModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50';
    modal.id = 'route-modal';
    
    const routes = Object.keys(ROUTE_TEMPLATES).map(key => {
        const route = ROUTE_TEMPLATES[key];
        if (route.status !== 'active') return '';
        
        return `
            <div onclick="selectRoute('${key}')" 
                 class="p-4 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-dark transition">
                <div class="flex items-center gap-3">
                    <div style="width:20px;height:20px;background:${route.color};border-radius:50%;"></div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-dark-text">${route.name}</h4>
                        <p class="text-xs text-gray-500">${route.description}</p>
                        <p class="text-xs text-gray-400 mt-1">
                            <i class="fa-solid fa-clock mr-1"></i>${route.startTime} - ${route.endTime} 
                            | <i class="fa-solid fa-location-dot mr-1"></i>${route.waypoints.length} titik
                        </p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full max-w-2xl soft-shadow">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-dark-text">
                    <i class="fa-solid fa-route text-green-dark mr-2"></i>
                    Pilih Rute Operasional
                </h3>
                <button onclick="closeRouteModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fa-solid fa-times text-xl"></i>
                </button>
            </div>
            <div class="space-y-3 max-h-96 overflow-y-auto">
                ${routes}
            </div>
            <div class="mt-4 pt-4 border-t border-gray-200">
                <button onclick="showRouteBuilder()" 
                        class="w-full bg-green-dark text-white py-2 rounded-lg hover:bg-green-600 transition">
                    <i class="fa-solid fa-plus mr-2"></i>Buat Rute Custom
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ===== SELECT ROUTE =====
function selectRoute(routeKey) {
    closeRouteModal();
    drawRoute(routeKey);
}

// ===== CLOSE ROUTE MODAL =====
function closeRouteModal() {
    const modal = document.getElementById('route-modal');
    if (modal) {
        modal.remove();
    }
}

// ===== CHECK ROUTE COMPLETION =====
function checkRouteCompletion() {
    if (!currentRoute) return;
    
    const points = getWastePoints();
    const routePoints = currentRoute.waypoints.map(wp => 
        points.find(p => p.id === wp.pointId)
    );
    
    const completed = routePoints.filter(p => p && p.status === 'collected').length;
    const total = routePoints.length;
    
    if (completed === total) {
        addLog(`🎉 Rute "${currentRoute.name}" selesai! (${total}/${total} titik)`, "success");
        // Could trigger completion actions here
    } else {
        addLog(`Progress rute: ${completed}/${total} titik selesai`, "info");
    }
}

// ===== UPDATE TRUCK POSITION =====
function updateTruckPosition(coords) {
    if (!truckMarker) return;
    
    truckMarker.setLatLng(coords);
    
    const activeTruck = getCurrentUser();
    const capacity = document.getElementById('val-capacity')?.textContent || '0%';
    
    truckMarker.setPopupContent(`
        <b>${activeTruck ? activeTruck.truckId : 'Truck'}</b><br>
        <small>Kapasitas: ${capacity}</small><br>
        <small>Lat: ${coords[0].toFixed(5)}, Lng: ${coords[1].toFixed(5)}</small>
    `);
    
    traveledCoords.push(coords);
    if (!traveledPolyline) {
        initTraveledPath();
    }
    traveledPolyline.setLatLngs(traveledCoords);
    
    // Check proximity to waste points
    checkProximityToWastePoints(coords);
}

// ===== INITIALIZE TRAVELED PATH =====
function initTraveledPath() {
    traveledPolyline = L.polyline([], {
        color: '#FF5722',
        weight: 3,
        opacity: 0.8
    }).addTo(map);
}

// ===== CHECK PROXIMITY TO WASTE POINTS =====
function checkProximityToWastePoints(coords) {
    const points = getWastePoints();
    const proximityThreshold = 30; // meters
    
    points.forEach(point => {
        const distance = calculateDistance(coords, point.location);
        
        if (distance < proximityThreshold && point.status === 'pending') {
            addLog(`📍 Mendekati titik: ${point.name} (${distance.toFixed(0)}m)`, "info");
        }
    });
}

// ===== CHECK GEOFENCE =====
function checkGeofence(coords) {
    const isInside = isPointInPolygon(coords, MAP_CONFIG.campusBoundary);
    
    if (!isInside) {
        addLog("⚠ ALERT: Truck keluar dari area Telkom University!", "warning");
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
    if (!showingRoute || !currentRoute) {
        document.getElementById('route-compliance').textContent = "Tidak ada rute aktif";
        document.getElementById('route-compliance').className = "text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded";
        return;
    }
    
    const points = getWastePoints();
    const routeCoords = currentRoute.waypoints.map(wp => {
        const point = points.find(p => p.id === wp.pointId);
        return point ? point.location : null;
    }).filter(c => c !== null);
    
    let minDistance = Infinity;
    
    for (let routePoint of routeCoords) {
        const dist = calculateDistance(coords, routePoint);
        if (dist < minDistance) {
            minDistance = dist;
        }
    }
    
    const routeStatus = document.getElementById('route-compliance');
    
    if (minDistance > MAP_CONFIG.routeTolerance) {
        routeStatus.textContent = "Menyimpang dari rute!";
        routeStatus.className = "text-xs px-2 py-1 bg-red-500 text-white rounded";
        addLog(`⚠ Truck menyimpang ${minDistance.toFixed(0)}m dari rute`, "warning");
    } else {
        routeStatus.textContent = "Mengikuti rute ✓";
        routeStatus.className = "text-xs px-2 py-1 bg-green-light text-white rounded";
    }
}

// ===== CALCULATE DISTANCE BETWEEN TWO POINTS (HAVERSINE) =====
function calculateDistance(coord1, coord2) {
    const R = 6371e3;
    const φ1 = coord1[0] * Math.PI / 180;
    const φ2 = coord2[0] * Math.PI / 180;
    const Δφ = (coord2[0] - coord1[0]) * Math.PI / 180;
    const Δλ = (coord2[1] - coord1[1]) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
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

// ===== STORAGE FUNCTIONS =====
function getWastePoints() {
    const saved = localStorage.getItem(STORAGE_KEYS.wastePoints);
    return saved ? JSON.parse(saved) : WASTE_POINTS;
}

function saveWastePoints(points) {
    localStorage.setItem(STORAGE_KEYS.wastePoints, JSON.stringify(points));
}

// ===== RESET ALL WASTE POINTS =====
function resetWastePoints() {
    if (!confirm('Reset semua status titik pengambilan sampah?')) return;
    
    const points = getWastePoints();
    points.forEach(p => p.status = 'pending');
    saveWastePoints(points);
    drawWastePoints();
    
    addLog("Semua titik pengambilan direset", "success");
}