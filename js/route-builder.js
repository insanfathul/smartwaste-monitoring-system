/* ===================================
   ROUTE BUILDER
   Smart Waste Monitoring System
   =================================== */

let customRoutePoints = [];

function showRouteBuilder() {
    closeRouteModal();
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50';
    modal.id = 'route-builder-modal';
    
    const points = getWastePoints();
    const pointsList = points.map(point => `
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input type="checkbox" id="custom-${point.id}" value="${point.id}"
                   class="w-4 h-4 text-green-dark">
            <label for="custom-${point.id}" class="flex-1 cursor-pointer">
                <span class="font-medium text-dark-text">${point.name}</span>
                <span class="text-xs text-gray-500 block">${point.id} - ${point.type}</span>
            </label>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full max-w-3xl soft-shadow max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-dark-text">
                    <i class="fa-solid fa-wand-magic-sparkles text-green-dark mr-2"></i>
                    Buat Rute Custom
                </h3>
                <button onclick="closeRouteBuilder()" class="text-gray-400 hover:text-gray-600">
                    <i class="fa-solid fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="mb-4">
                <label class="block text-sm font-medium text-dark-text mb-2">Nama Rute</label>
                <input type="text" id="custom-route-name" 
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                       placeholder="Contoh: Rute Khusus Pagi">
            </div>
            
            <div class="mb-4">
                <label class="block text-sm font-medium text-dark-text mb-2">
                    Pilih Titik Pengambilan (urutan sesuai checklist)
                </label>
                <div class="space-y-2 max-h-64 overflow-y-auto">
                    ${pointsList}
                </div>
            </div>
            
            <div class="flex gap-3">
                <button onclick="saveCustomRoute()" 
                        class="flex-1 bg-green-dark text-white py-2 rounded-lg hover:bg-green-600 transition">
                    <i class="fa-solid fa-save mr-2"></i>Simpan & Gunakan
                </button>
                <button onclick="closeRouteBuilder()" 
                        class="px-6 bg-gray-300 text-dark-text py-2 rounded-lg hover:bg-gray-400 transition">
                    Batal
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function saveCustomRoute() {
    const name = document.getElementById('custom-route-name').value.trim();
    
    if (!name) {
        alert('Nama rute harus diisi!');
        return;
    }
    
    const points = getWastePoints();
    const selectedPoints = [];
    
    points.forEach(point => {
        const checkbox = document.getElementById(`custom-${point.id}`);
        if (checkbox && checkbox.checked) {
            selectedPoints.push({
                pointId: point.id,
                order: selectedPoints.length + 1
            });
        }
    });
    
    if (selectedPoints.length < 2) {
        alert('Minimal pilih 2 titik untuk membuat rute!');
        return;
    }
    
    // Create custom route
    ROUTE_TEMPLATES.custom = {
        id: "ROUTE-CUSTOM-" + Date.now(),
        name: name,
        description: "Rute custom yang dibuat manual",
        color: "#9C27B0",
        waypoints: selectedPoints,
        status: "active"
    };
    
    closeRouteBuilder();
    drawRoute('custom');
    
    addLog(`Rute custom "${name}" berhasil dibuat dengan ${selectedPoints.length} titik`, "success");
}

function closeRouteBuilder() {
    const modal = document.getElementById('route-builder-modal');
    if (modal) modal.remove();
}