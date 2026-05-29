/* ===================================
   LEAFLET MAP HANDLER WITH ROUTING MACHINE
   Smart Waste Monitoring System
   - Rute mengikuti jalan nyata via OSRM
   - Rute pagi otomatis tampil saat peta dibuka
   =================================== */

let map = null;
let truckMarker = null;
let campusPolygon = null;
let routingControl = null;   // Leaflet Routing Machine control (gantikan routePolyline)
let routePolyline = null;    // Fallback jika OSRM tidak tersedia
let traveledPolyline = null;
let traveledCoords = [];
let trailMarkers = [];          // gray breadcrumb dots untuk riwayat pergerakan
let lastTruckCoord = null;      // untuk hitung arah hadap (heading) truck
let showingRoute = false;
let wastePointMarkers = [];
let currentRoute = null;

const TRAIL_MAX_MARKERS = 80;   // batas jumlah breadcrumb agar peta tidak penuh
const TRAIL_MIN_GAP_M   = 8;    // jarak minimum (meter) antar breadcrumb baru

// ===== INITIALIZE MAP =====
function initMap() {
    map = L.map('map').setView(MAP_CONFIG.center, MAP_CONFIG.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    drawCampusBoundary();
    drawWastePoints();
    createTruckMarker();

    addLog("Peta dimuat. Area: Telkom University", "success");

    setTimeout(() => {
        if (map) {
            map.invalidateSize();
            // Auto-load rute default (pagi) setiap kali peta dibuka
            loadActiveRoute();
        }
    }, 600);
}

// ===== DRAW CAMPUS GEOFENCE =====
function drawCampusBoundary() {
    campusPolygon = L.polygon(MAP_CONFIG.campusBoundary, {
        color: '#2E7D32',
        fillColor: '#66BB6A',
        fillOpacity: 0.12,
        weight: 3,
        dashArray: '6, 4'
    }).addTo(map);

    campusPolygon.bindPopup(`
        <div style="font-family:Poppins,sans-serif;min-width:180px;">
            <b style="color:#2E7D32;font-size:14px;">Telkom University</b><br>
            <small style="color:#666;">Jl. Telekomunikasi No.1, Bandung</small><br>
            <small style="color:#888;">Zona Operasional Truck Sampah</small>
        </div>
    `);
}

// ===== DRAW WASTE COLLECTION POINTS =====
function drawWastePoints() {
    wastePointMarkers.forEach(marker => map.removeLayer(marker));
    wastePointMarkers = [];

    let points = getWastePoints();

    points.forEach((point) => {
        const iconConfig = POINT_ICONS[point.type] || POINT_ICONS.public;

        const wasteIcon = L.divIcon({
            html: `
                <div style="
                    background-color: ${iconConfig.color};
                    color: white;
                    padding: 8px;
                    border-radius: 50%;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
                    text-align: center;
                    border: 3px solid white;
                    position: relative;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <i class="fa-solid ${iconConfig.icon}" style="font-size:14px;"></i>
                    ${point.status === 'collected' ?
                        '<div style="position:absolute;top:-5px;right:-5px;background:#4CAF50;width:13px;height:13px;border-radius:50%;border:2px solid white;"></div>'
                        : ''}
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            className: 'custom-waste-marker'
        });

        const marker = L.marker(point.location, { icon: wasteIcon }).addTo(map);

        const popupContent = `
            <div style="font-family:Poppins,sans-serif;min-width:200px;">
                <h4 style="margin:0 0 8px 0;color:#263238;font-weight:600;font-size:13px;">${point.name}</h4>
                <div style="font-size:11px;color:#666;line-height:1.8;">
                    <p style="margin:2px 0;"><i class="fa-solid fa-tag" style="width:16px;color:#2E7D32;"></i> <b>ID:</b> ${point.id}</p>
                    <p style="margin:2px 0;"><i class="fa-solid fa-dumpster" style="width:16px;color:#F57C00;"></i> <b>Kapasitas:</b> ${point.capacity}L</p>
                    <p style="margin:2px 0;"><i class="fa-solid fa-flag" style="width:16px;color:#1976D2;"></i> <b>Prioritas:</b> ${point.priority.toUpperCase()}</p>
                    <p style="margin:2px 0;"><i class="fa-solid fa-clock" style="width:16px;color:#757575;"></i> <b>Jadwal:</b> ${point.schedule.join(', ')}</p>
                    <p style="margin:2px 0;"><i class="fa-solid fa-circle" style="width:16px;color:${point.status === 'collected' ? '#4CAF50' : '#FFC107'};"></i> <b>Status:</b> ${getStatusText(point.status)}</p>
                </div>
                <div style="margin-top:10px;display:flex;gap:5px;">
                    ${point.status !== 'collected' ?
                        `<button onclick="markAsCollected('${point.id}')"
                                style="flex:1;background:#4CAF50;color:white;border:none;padding:6px 4px;border-radius:4px;cursor:pointer;font-size:11px;font-family:Poppins,sans-serif;">
                            <i class="fa-solid fa-check"></i> Collected
                        </button>` : ''}
                    <button onclick="showPointDetails('${point.id}')"
                            style="flex:1;background:#2E7D32;color:white;border:none;padding:6px 4px;border-radius:4px;cursor:pointer;font-size:11px;font-family:Poppins,sans-serif;">
                        <i class="fa-solid fa-info"></i> Detail
                    </button>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 240 });
        wastePointMarkers.push(marker);
    });

    addLog(`${points.length} titik pengambilan sampah ditampilkan`, "info");
}

// ===== GET STATUS TEXT =====
function getStatusText(status) {
    return { pending: 'Belum Diambil', collected: 'Sudah Diambil', skipped: 'Dilewati' }[status] || status;
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
        addLog(`✓ ${point.name} ditandai sudah diambil`, "success");
        if (currentRoute) checkRouteCompletion();
    }
}

// ===== SHOW POINT DETAILS =====
function showPointDetails(pointId) {
    const points = getWastePoints();
    const point = points.find(p => p.id === pointId);
    if (point) {
        alert(`Detail Titik Pengambilan:\n\n` +
              `ID: ${point.id}\nNama: ${point.name}\nTipe: ${point.type}\n` +
              `Kapasitas: ${point.capacity}L\nPrioritas: ${point.priority}\n` +
              `Jadwal: ${point.schedule.join(', ')}\nStatus: ${getStatusText(point.status)}\n` +
              `Koordinat: ${point.location[0]}, ${point.location[1]}`);
    }
}

// ===== CREATE TRUCK ICON (dengan rotasi sesuai arah) =====
// headingDeg: 0 = utara, 90 = timur, dst. null = tidak diputar.
function buildTruckIcon(headingDeg) {
    const rot = (headingDeg === null || headingDeg === undefined) ? 0 : headingDeg;
    return L.divIcon({
        html: `
            <div style="
                position:relative;width:42px;height:42px;
                transform:rotate(${rot}deg);transition:transform 0.4s ease;">
                <div style="
                    background-color:#F57C00;color:white;
                    border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.4);
                    border:3px solid white;width:42px;height:42px;
                    display:flex;align-items:center;justify-content:center;">
                    <!-- ikon diputar balik agar tetap tegak, hanya pointer yang ikut arah -->
                    <i class="fa-solid fa-truck-moving"
                       style="font-size:16px;transform:rotate(${-rot}deg);"></i>
                </div>
                <!-- pointer arah hadap di atas ikon -->
                <div style="
                    position:absolute;top:-7px;left:50%;
                    transform:translateX(-50%);
                    width:0;height:0;
                    border-left:6px solid transparent;
                    border-right:6px solid transparent;
                    border-bottom:9px solid #F57C00;
                    filter:drop-shadow(0 -1px 1px rgba(0,0,0,0.3));"></div>
            </div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        className: 'custom-truck-marker'
    });
}

// ===== CREATE TRUCK MARKER =====
function createTruckMarker() {
    const truckIcon = buildTruckIcon(null);

    // Posisi awal = pusat kampus (menunggu data GPS sebenarnya)
    const startPos = MAP_CONFIG.center;
    truckMarker = L.marker(startPos, { icon: truckIcon, zIndexOffset: 1000 }).addTo(map);
    truckMarker.bindPopup(`
        <div style="font-family:Poppins,sans-serif;">
            <b>Truck Sampah</b><br>
            <small>Menunggu data GPS dari ESP32-S3...</small>
        </div>
    `);
}

// ===== DRAW ROUTE MENGGUNAKAN LEAFLET ROUTING MACHINE =====
// Rute akan mengikuti jalan nyata di Telkom University via OSRM
function drawRoute(routeKey) {
    // Hapus routing control lama
    if (routingControl) {
        try { map.removeControl(routingControl); } catch(e) {}
        routingControl = null;
    }
    if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
    }

    // Hapus order markers lama
    map.eachLayer(layer => {
        if (layer.options && layer.options.className === 'route-order-marker') {
            map.removeLayer(layer);
        }
    });

    const route = ROUTE_TEMPLATES[routeKey];
    if (!route) {
        addLog("Rute tidak ditemukan", "error");
        return;
    }

    const points = getWastePoints();
    const latlngs = route.waypoints
        .map(wp => {
            const point = points.find(p => p.id === wp.pointId);
            return point ? L.latLng(point.location[0], point.location[1]) : null;
        })
        .filter(ll => ll !== null);

    if (latlngs.length < 2) {
        addLog("Koordinat tidak cukup untuk rute ini", "error");
        return;
    }

    // Buat routing control dengan OSRM (mengikuti jalan nyata)
    try {
        routingControl = L.Routing.control({
            waypoints: latlngs,
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            show: false,
            collapsible: false,
            lineOptions: {
                styles: [{
                    color: route.color,
                    opacity: 0.88,
                    weight: 6
                }],
                extendToWaypoints: true,
                missingRouteTolerance: 0
            },
            router: new L.Routing.OSRMv1({
                serviceUrl: 'https://routing.openstreetmap.de/routed-car/route/v1',
                profile: 'driving',
                useHints: false
            }),
            createMarker: function(i, waypoint) {
                const wpData = route.waypoints[i];
                const wastePoint = wpData ? points.find(p => p.id === wpData.pointId) : null;

                const isFirst = (i === 0);
                const isLast = (i === latlngs.length - 1);
                let bg = route.color;
                let label = `${i + 1}`;
                if (isFirst) label = 'S';   // Start
                if (isLast)  label = 'F';   // Finish

                const orderIcon = L.divIcon({
                    html: `<div style="
                        background: ${bg};
                        color: white;
                        border: 2.5px solid white;
                        border-radius: 50%;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        font-size: 12px;
                        box-shadow: 0 2px 7px rgba(0,0,0,0.45);
                        font-family: Poppins, sans-serif;
                    ">${label}</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                    className: 'route-order-marker'
                });

                const m = L.marker(waypoint.latLng, { icon: orderIcon });
                if (wastePoint) {
                    m.bindPopup(`
                        <div style="font-family:Poppins,sans-serif;font-size:12px;">
                            <b>Stop ${i + 1}: ${wastePoint.name}</b><br>
                            <small>${wastePoint.type} | Prioritas: ${wastePoint.priority}</small>
                        </div>
                    `);
                }
                return m;
            }
        }).addTo(map);

        routingControl.on('routesfound', function(e) {
            // Sembunyikan panel instruksi LRM
            const container = routingControl.getContainer();
            if (container) container.style.display = 'none';

            const r = e.routes[0];
            const distKm  = (r.summary.totalDistance / 1000).toFixed(1);
            const durMin  = Math.round(r.summary.totalTime / 60);

            // Fit peta ke bounds rute
            if (r.bounds) {
                map.fitBounds(r.bounds, { padding: [60, 60] });
            }

            updateActiveRouteInfo(route, distKm, durMin);
            addLog(`Rute "${route.name}" berhasil dimuat via jalan nyata (${distKm}km, ~${durMin} menit)`, "success");
        });

        routingControl.on('routingerror', function(e) {
            console.warn("OSRM routing error, pakai mode fallback:", e.error.message);
            addLog(`OSRM tidak tersedia, rute ditampilkan mode offline`, "warning");
            drawRouteFallback(route, points);
        });

    } catch (err) {
        console.warn("LRM tidak tersedia, pakai fallback:", err);
        drawRouteFallback(route, points);
    }

    // Simpan rute aktif ke localStorage
    currentRoute = { ...route, key: routeKey };
    localStorage.setItem(STORAGE_KEYS.activeRoute, JSON.stringify(currentRoute));

    showingRoute = true;
    const btnText = document.getElementById('route-btn-text');
    if (btnText) btnText.textContent = "Sembunyikan Rute";

    updateActiveRouteInfo(route);
}

// ===== FALLBACK: Rute garis lurus jika OSRM tidak tersedia =====
function drawRouteFallback(route, points) {
    if (routePolyline) {
        map.removeLayer(routePolyline);
    }

    const coords = route.waypoints
        .map(wp => {
            const p = points.find(pt => pt.id === wp.pointId);
            return p ? p.location : null;
        })
        .filter(c => c !== null);

    routePolyline = L.polyline(coords, {
        color: route.color,
        weight: 6,
        opacity: 0.8,
        dashArray: '12, 8'
    }).addTo(map);

    // Tambah urutan stop
    route.waypoints.forEach((wp, i) => {
        const p = points.find(pt => pt.id === wp.pointId);
        if (!p) return;
        const icon = L.divIcon({
            html: `<div style="background:${route.color};color:white;border:2px solid white;border-radius:50%;
                width:26px;height:26px;display:flex;align-items:center;justify-content:center;
                font-weight:700;font-size:11px;box-shadow:0 2px 5px rgba(0,0,0,0.4);">${i + 1}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            className: 'route-order-marker'
        });
        L.marker(p.location, { icon }).addTo(map)
            .bindPopup(`<b>Stop ${i + 1}</b><br>${p.name}`);
    });

    map.fitBounds(routePolyline.getBounds(), { padding: [60, 60] });
    updateActiveRouteInfo(route, null, route.estimatedDuration);
}

// ===== UPDATE INFO RUTE DI SIDEBAR =====
function updateActiveRouteInfo(route, distKm, durMin) {
    const infoEl = document.getElementById('active-route-info');
    if (!infoEl) return;

    const distText = distKm ? `${distKm} km` : '-';
    const durText  = durMin  ? `~${durMin} mnt`
                   : route.estimatedDuration ? `~${route.estimatedDuration} mnt` : '-';

    infoEl.innerHTML = `
        <div style="border-left:3px solid ${route.color};padding-left:8px;margin-bottom:8px;">
            <p class="font-semibold text-white text-xs mb-1">${route.name}</p>
            <p class="text-green-200" style="font-size:10px;line-height:1.6;">
                ${route.waypoints.length} titik &nbsp;|&nbsp; ${distText} &nbsp;|&nbsp; ${durText}
            </p>
            ${route.startTime ? `<p class="text-green-300" style="font-size:10px;">${route.startTime} – ${route.endTime}</p>` : ''}
        </div>
        <button onclick="showRouteSelectionModal()"
                class="w-full bg-white text-green-dark py-2 rounded-lg hover:bg-gray-100 transition"
                style="font-size:11px;font-weight:600;">
            <i class="fa-solid fa-exchange-alt mr-1"></i> Ganti Rute
        </button>
    `;
}

// ===== LOAD ACTIVE ROUTE (auto-load rute pagi jika belum ada tersimpan) =====
function loadActiveRoute() {
    const saved = localStorage.getItem(STORAGE_KEYS.activeRoute);
    if (saved) {
        try {
            const savedRoute = JSON.parse(saved);
            const routeKey = savedRoute.key ||
                Object.keys(ROUTE_TEMPLATES).find(k => ROUTE_TEMPLATES[k].id === savedRoute.id);
            if (routeKey && ROUTE_TEMPLATES[routeKey]) {
                drawRoute(routeKey);
                return;
            }
        } catch (err) {
            console.warn("Error loading saved route:", err);
        }
    }
    // Default: tampilkan rute pagi secara otomatis
    const defaultKey = (MAP_CONFIG && MAP_CONFIG.defaultRoute) || 'morning';
    drawRoute(defaultKey);
}

// ===== TOGGLE ROUTE VISIBILITY =====
function toggleRoute() {
    if (showingRoute) {
        if (routingControl) {
            try { map.removeControl(routingControl); } catch(e) {}
            routingControl = null;
        }
        if (routePolyline) {
            map.removeLayer(routePolyline);
            routePolyline = null;
        }
        map.eachLayer(layer => {
            if (layer.options && layer.options.className === 'route-order-marker') {
                map.removeLayer(layer);
            }
        });

        showingRoute = false;
        const btnText = document.getElementById('route-btn-text');
        if (btnText) btnText.textContent = "Tampilkan Rute";
        addLog("Rute disembunyikan", "info");
    } else {
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
                    <div style="width:20px;height:20px;background:${route.color};border-radius:50%;flex-shrink:0;"></div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-dark-text text-sm">${route.name}</h4>
                        <p class="text-xs text-gray-500">${route.description}</p>
                        <p class="text-xs text-gray-400 mt-1">
                            <i class="fa-solid fa-clock mr-1"></i>${route.startTime || '-'} – ${route.endTime || '-'}
                            &nbsp;|&nbsp; <i class="fa-solid fa-location-dot mr-1"></i>${route.waypoints.length} titik
                        </p>
                    </div>
                </div>
            </div>`;
    }).join('');

    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full max-w-2xl soft-shadow">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-dark-text">
                    <i class="fa-solid fa-route text-green-dark mr-2"></i>Pilih Rute Operasional
                </h3>
                <button onclick="closeRouteModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fa-solid fa-times text-xl"></i>
                </button>
            </div>
            <div class="space-y-3 max-h-96 overflow-y-auto">${routes}</div>
            <div class="mt-4 pt-4 border-t border-gray-200">
                <button onclick="showRouteBuilder()"
                        class="w-full bg-green-dark text-white py-2 rounded-lg hover:bg-green-600 transition">
                    <i class="fa-solid fa-plus mr-2"></i>Buat Rute Custom
                </button>
            </div>
        </div>`;

    document.body.appendChild(modal);
}

function selectRoute(routeKey) {
    closeRouteModal();
    drawRoute(routeKey);
}

function closeRouteModal() {
    const modal = document.getElementById('route-modal');
    if (modal) modal.remove();
}

// ===== CHECK ROUTE COMPLETION =====
function checkRouteCompletion() {
    if (!currentRoute) return;
    const points = getWastePoints();
    const routePoints = currentRoute.waypoints.map(wp => points.find(p => p.id === wp.pointId));
    const completed = routePoints.filter(p => p && p.status === 'collected').length;
    const total = routePoints.length;

    if (completed === total) {
        addLog(`🎉 Rute "${currentRoute.name}" selesai! (${total}/${total} titik)`, "success");
    } else {
        addLog(`Progress rute: ${completed}/${total} titik selesai`, "info");
    }
}

// ===== UPDATE TRUCK POSITION (dari data GPS MQTT) =====
function updateTruckPosition(coords) {
    if (!truckMarker) return;

    // Hitung arah hadap (heading) dari posisi sebelumnya ke posisi baru
    let heading = null;
    if (lastTruckCoord) {
        const moved = calculateDistance(lastTruckCoord, coords);
        if (moved >= 1) { // hanya update arah jika benar-benar bergerak (>1m)
            heading = calculateBearing(lastTruckCoord, coords);
        }
    }

    // Geser marker + putar ikon sesuai arah
    truckMarker.setLatLng(coords);
    if (heading !== null) {
        truckMarker.setIcon(buildTruckIcon(heading));
    }

    const user = getCurrentUser();
    const capacity = document.getElementById('val-capacity')?.textContent || '0%';

    truckMarker.setPopupContent(`
        <div style="font-family:Poppins,sans-serif;">
            <b>${user ? user.truckId : 'Truck'}</b><br>
            <small>Kapasitas: ${capacity}</small><br>
            <small>GPS: ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}</small>
        </div>
    `);

    // ----- Jejak abu-abu: garis + breadcrumb dots -----
    traveledCoords.push(coords);
    if (!traveledPolyline) initTraveledPath();
    traveledPolyline.setLatLngs(traveledCoords);

    addTrailMarker(coords);

    lastTruckCoord = coords;
    checkProximityToWastePoints(coords);
}

// ===== TAMBAH BREADCRUMB ABU-ABU (riwayat pergerakan) =====
function addTrailMarker(coords) {
    // Jangan menumpuk breadcrumb terlalu rapat
    if (trailMarkers.length > 0) {
        const last = trailMarkers[trailMarkers.length - 1].getLatLng();
        const gap = calculateDistance([last.lat, last.lng], coords);
        if (gap < TRAIL_MIN_GAP_M) return;
    }

    const dotIcon = L.divIcon({
        html: `<div style="
            width:9px;height:9px;border-radius:50%;
            background:#9E9E9E;border:1.5px solid #ffffff;
            box-shadow:0 1px 2px rgba(0,0,0,0.3);"></div>`,
        iconSize: [9, 9],
        iconAnchor: [4.5, 4.5],
        className: 'trail-dot-marker'
    });

    const m = L.marker(coords, { icon: dotIcon, interactive: false, zIndexOffset: 500 }).addTo(map);
    trailMarkers.push(m);

    // Batasi jumlah breadcrumb: buang yang paling lama
    while (trailMarkers.length > TRAIL_MAX_MARKERS) {
        const old = trailMarkers.shift();
        map.removeLayer(old);
    }
}

// ===== HITUNG BEARING (arah) ANTAR DUA KOORDINAT =====
// Hasil 0-360 derajat, 0 = utara.
function calculateBearing(from, to) {
    const lat1 = from[0] * Math.PI / 180;
    const lat2 = to[0]   * Math.PI / 180;
    const dLon = (to[1] - from[1]) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
}

// ===== INITIALIZE TRAVELED PATH (garis jejak abu-abu) =====
function initTraveledPath() {
    traveledPolyline = L.polyline([], {
        color: '#9E9E9E',
        weight: 3,
        opacity: 0.75,
        dashArray: '1, 6',     // garis putus-putus halus, kesan jejak
        lineCap: 'round'
    }).addTo(map);
}

// ===== CHECK PROXIMITY TO WASTE POINTS =====
function checkProximityToWastePoints(coords) {
    const points = getWastePoints();
    const threshold = 30; // meter
    points.forEach(point => {
        const dist = calculateDistance(coords, point.location);
        if (dist < threshold && point.status === 'pending') {
            addLog(`📍 Mendekati titik: ${point.name} (${dist.toFixed(0)}m)`, "info");
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

// ===== POINT IN POLYGON (Ray Casting) =====
function isPointInPolygon(point, polygon) {
    let x = point[0], y = point[1], inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i][0], yi = polygon[i][1];
        let xj = polygon[j][0], yj = polygon[j][1];
        let intersect = ((yi > y) !== (yj > y)) &&
                        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// ===== CHECK ROUTE COMPLIANCE =====
function checkRouteCompliance(coords) {
    const el = document.getElementById('route-compliance');
    if (!el) return;

    if (!showingRoute || !currentRoute) {
        el.textContent = "Tidak ada rute aktif";
        el.className = "text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded";
        return;
    }

    const points = getWastePoints();
    const routeCoords = currentRoute.waypoints
        .map(wp => { const p = points.find(pt => pt.id === wp.pointId); return p ? p.location : null; })
        .filter(c => c !== null);

    const minDist = Math.min(...routeCoords.map(rc => calculateDistance(coords, rc)));

    if (minDist > MAP_CONFIG.routeTolerance) {
        el.textContent = `Menyimpang ${minDist.toFixed(0)}m dari rute!`;
        el.className = "text-xs px-2 py-1 bg-red-500 text-white rounded";
        addLog(`⚠ Truck menyimpang ${minDist.toFixed(0)}m dari rute`, "warning");
    } else {
        el.textContent = "Mengikuti rute ✓";
        el.className = "text-xs px-2 py-1 bg-green-light text-white rounded";
    }
}

// ===== CALCULATE DISTANCE (Haversine) =====
function calculateDistance(coord1, coord2) {
    const R = 6371e3;
    const φ1 = coord1[0] * Math.PI / 180;
    const φ2 = coord2[0] * Math.PI / 180;
    const Δφ = (coord2[0] - coord1[0]) * Math.PI / 180;
    const Δλ = (coord2[1] - coord1[1]) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ===== CENTER MAP TO CAMPUS =====
function centerToCampus() {
    map.setView(MAP_CONFIG.center, MAP_CONFIG.zoom);
    addLog("Peta dipusatkan ke area kampus Telkom University", "info");
}

// ===== CLEAR TRAVELED PATH =====
function clearTraveledPath() {
    traveledCoords = [];
    if (traveledPolyline) traveledPolyline.setLatLngs([]);

    // Hapus semua breadcrumb abu-abu
    trailMarkers.forEach(m => map.removeLayer(m));
    trailMarkers = [];
    lastTruckCoord = null;

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
    addLog("Semua titik pengambilan direset ke pending", "success");
}