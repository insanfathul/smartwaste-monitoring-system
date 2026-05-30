/* ===================================
   ANALYTICS & TRIP TRACKING (revisi — selaras dengan map.js)
   Smart Waste Monitoring System

   Perubahan dari versi awal:
   - Memakai calculateDistance() milik map.js (tidak duplikat Haversine).
   - TIDAK mendefinisikan ulang checkRouteCompletion() (sudah ada di map.js).
     Sebagai gantinya, map.js cukup memanggil onRouteCompleted() saat rute
     dinyatakan selesai (lihat catatan integrasi di bawah).
   - Penyelesaian trip mengikuti definisi map.js: semua titik berstatus
     'collected'. Ini konsisten dengan tombol "Collected" di popup peta.
   =================================== */

const tripState = {
    distanceMeters: 0,
    lastCoords: null,
    startTime: null,
    peakCapacity: 0,
    lastCapacity: 0,
    routeKey: null
};

const GPS_JITTER_THRESHOLD_M = 3;   // abaikan gerakan < 3 m (GPS jitter)

// Helper jarak: pakai milik map.js bila ada, fallback bila belum termuat.
function _distM(a, b) {
    if (typeof calculateDistance === 'function') return calculateDistance(a, b);
    const R = 6371000, toRad = d => d * Math.PI / 180;
    const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
    const x = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
}

// ===== 1. AKUMULASI JARAK — panggil dari updateTruckPosition() =====
function trackDistance(lat, lng) {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
    if (!tripState.startTime) startTrip();

    const coords = [lat, lng];
    if (tripState.lastCoords) {
        const d = _distM(tripState.lastCoords, coords);
        if (d >= GPS_JITTER_THRESHOLD_M) tripState.distanceMeters += d;
    }
    tripState.lastCoords = coords;
    refreshAnalyticsUI();
}

// ===== 2. TRACK KAPASITAS — panggil dari updateCapacityDisplay() =====
function trackCapacity(percent) {
    if (!tripState.startTime) startTrip();
    tripState.lastCapacity = percent;
    if (percent > tripState.peakCapacity) tripState.peakCapacity = percent;
    refreshAnalyticsUI();
}

// ===== MULAI TRIP =====
function startTrip() {
    tripState.startTime = new Date().toISOString();
    tripState.distanceMeters = 0;
    tripState.lastCoords = null;
    tripState.peakCapacity = 0;
    tripState.lastCapacity = 0;
    tripState.routeKey = (typeof getActiveRouteId === 'function') ? getActiveRouteId() : null;
    if (typeof addLog === 'function') {
        addLog("🚛 Trip dimulai — perekaman jarak & muatan aktif", "info");
    }
}

// ===== DIPANGGIL OLEH map.js SAAT RUTE SELESAI =====
// Tambahkan panggilan onRouteCompleted(currentRoute) di dalam
// checkRouteCompletion() pada map.js, di cabang completed === total.
function onRouteCompleted(route) {
    if (!tripState.startTime) return; // tidak ada trip berjalan

    const volumePerBin = (typeof getBinVolumeLiters === 'function') ? getBinVolumeLiters() : 240;
    const loadLiters = (tripState.peakCapacity / 100) * volumePerBin;

    const record = {
        id: "TRIP-" + Date.now(),
        date: new Date().toISOString(),
        routeId: route ? route.id : "UNKNOWN",
        routeName: route ? route.name : "Tanpa rute",
        truckId: (typeof getCurrentUser === 'function' && getCurrentUser())
            ? getCurrentUser().truckId : "-",
        distanceKm: +(tripState.distanceMeters / 1000).toFixed(2),
        loadLiters: +loadLiters.toFixed(1),
        peakCapacity: +tripState.peakCapacity.toFixed(1),
        pointsVisited: route ? route.waypoints.length : 0,
        durationMin: Math.round((Date.now() - new Date(tripState.startTime).getTime()) / 60000)
    };

    saveTripRecord(record);
    if (typeof addLog === 'function') {
        addLog(`✓ Trip tercatat: ${record.distanceKm} km, muatan ±${record.loadLiters} L`, "success");
    }
    if (typeof addTrip === 'function') addTrip(); // update prediksi target harian (charts.js)

    tripState.startTime = null; // reset untuk trip berikutnya
    refreshAnalyticsUI();
    if (typeof renderTripHistory === 'function') renderTripHistory();
}

// ===== PERSISTENSI =====
function _recKey() {
    return (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS.tripRecords)
        ? STORAGE_KEYS.tripRecords : 'swms_trip_records';
}
function getTripRecords() {
    try { return JSON.parse(localStorage.getItem(_recKey())) || []; }
    catch (e) { return []; }
}
function saveTripRecord(record) {
    const recs = getTripRecords();
    recs.unshift(record);
    localStorage.setItem(_recKey(), JSON.stringify(recs.slice(0, 100)));
}
function clearTripRecords() {
    if (!confirm('Hapus seluruh riwayat trip? Tindakan ini tidak bisa dibatalkan.')) return;
    localStorage.removeItem(_recKey());
    if (typeof renderTripHistory === 'function') renderTripHistory();
    if (typeof addLog === 'function') addLog("Riwayat trip dibersihkan", "info");
}

// ===== UI: TRIP BERJALAN =====
function refreshAnalyticsUI() {
    const distEl = document.getElementById('analytics-distance');
    const loadEl = document.getElementById('analytics-load');
    const capEl = document.getElementById('analytics-capacity');

    if (distEl) distEl.textContent = (tripState.distanceMeters / 1000).toFixed(2) + ' km';
    if (loadEl) {
        const v = (typeof getBinVolumeLiters === 'function') ? getBinVolumeLiters() : 240;
        loadEl.textContent = ((tripState.peakCapacity / 100) * v).toFixed(0) + ' L';
    }
    if (capEl) capEl.textContent = tripState.peakCapacity.toFixed(0) + '%';
}

// ===== UI: TABEL RIWAYAT =====
function renderTripHistory() {
    const tbody = document.getElementById('history-tbody');
    const emptyEl = document.getElementById('history-empty');
    if (!tbody) return;

    const records = getTripRecords();
    if (records.length === 0) {
        tbody.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        updateAnalyticsSummary(records);
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    tbody.innerHTML = records.map(r => {
        const d = new Date(r.date);
        const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
                <td class="px-4 py-3"><div class="font-medium text-dark-text">${tgl}</div>
                    <div class="text-xs text-gray-400">${jam}</div></td>
                <td class="px-4 py-3 text-dark-text">${r.routeName}</td>
                <td class="px-4 py-3 font-semibold text-green-dark">${r.distanceKm} km</td>
                <td class="px-4 py-3 text-dark-text">${r.loadLiters} L</td>
                <td class="px-4 py-3 text-center">${r.pointsVisited}</td>
                <td class="px-4 py-3 text-center text-gray-500">${r.durationMin} mnt</td>
            </tr>`;
    }).join('');

    updateAnalyticsSummary(records);
}

// ===== UI: RINGKASAN AGREGAT =====
function updateAnalyticsSummary(records) {
    const totalDist = records.reduce((s, r) => s + r.distanceKm, 0);
    const totalLoad = records.reduce((s, r) => s + r.loadLiters, 0);
    const n = records.length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('summary-total-distance', totalDist.toFixed(1) + ' km');
    set('summary-total-load', totalLoad.toFixed(0) + ' L');
    set('summary-total-trips', n);
    set('summary-avg-distance', n ? (totalDist / n).toFixed(2) + ' km' : '0 km');
}

/* ===================================
   CATATAN INTEGRASI (revisi)

   A. config.js — tambahkan (lihat config-additions.js):
      - WP-11, WP-12 ke WASTE_POINTS
      - ikon "tps" ke POINT_ICONS
      - STORAGE_KEYS.tripRecords = 'swms_trip_records'
      - fungsi getBinVolumeLiters() & getActiveRouteId()

   B. map.js → updateTruckPosition(coords), tambah SATU baris
      tepat setelah `lastTruckCoord = coords;` :
          trackDistance(coords[0], coords[1]);

   C. map.js → checkRouteCompletion(), di cabang `completed === total`,
      tambah SATU baris:
          if (typeof onRouteCompleted === 'function') onRouteCompleted(currentRoute);

   D. ui.js → updateCapacityDisplay(percent), tambah di akhir fungsi:
          if (typeof trackCapacity === 'function') trackCapacity(percent);

   E. index.html — muat sebelum main.js:
          <script src="js/analytics.js?v=1.0.6"></script>

   Catatan: jarak diakumulasi dari GPS real-time (sesuai pilihanmu).
   "Trip selesai" mengikuti definisi map.js yang sudah ada (semua titik
   collected), agar tidak ada dua logika yang bertabrakan.
   =================================== */
