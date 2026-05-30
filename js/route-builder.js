/* ===================================
   ROUTE BUILDER (upgrade)
   Smart Waste Monitoring System

   Peningkatan:
   - Urutan stop ditentukan oleh ANGKA URUTAN yang diketik user
     (bukan sekadar urutan centang) → rute custom jauh lebih fleksibel.
   - Pilihan warna rute.
   - Validasi inline (tanpa alert() yang mengganggu).
   - Otomatis mencakup semua titik termasuk WP-11 & WP-12 yang baru.
   =================================== */

function showRouteBuilder() {
    closeRouteModal();
    closeRouteBuilder();

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50';
    modal.id = 'route-builder-modal';

    const points = getWastePoints();
    const pointsList = points.map(point => `
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input type="checkbox" id="custom-${point.id}" value="${point.id}"
                   onchange="toggleOrderInput('${point.id}')"
                   class="w-4 h-4 text-green-dark flex-shrink-0">
            <label for="custom-${point.id}" class="flex-1 cursor-pointer min-w-0">
                <span class="font-medium text-dark-text text-sm">${point.name}</span>
                <span class="text-xs text-gray-500 block">${point.id} · ${point.type}</span>
            </label>
            <input type="number" min="1" id="order-${point.id}" placeholder="#"
                   disabled
                   class="w-14 px-2 py-1 border border-gray-300 rounded text-center text-sm
                          disabled:bg-gray-100 disabled:text-gray-300 flex-shrink-0"
                   title="Urutan kunjungan">
        </div>
    `).join('');

    const colors = [
        { name: 'Ungu', val: '#9C27B0' }, { name: 'Tosca', val: '#00897B' },
        { name: 'Merah', val: '#E53935' }, { name: 'Biru', val: '#1976D2' },
        { name: 'Oranye', val: '#F57C00' }
    ];
    const colorOpts = colors.map((c, i) => `
        <label class="cursor-pointer">
            <input type="radio" name="route-color" value="${c.val}" class="peer sr-only" ${i === 0 ? 'checked' : ''}>
            <span class="block w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-dark-text transition"
                  style="background:${c.val};" title="${c.name}"></span>
        </label>`).join('');

    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full max-w-3xl soft-shadow max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-dark-text">
                    <i class="fa-solid fa-wand-magic-sparkles text-green-dark mr-2"></i>
                    Buat Rute Custom
                </h3>
                <button onclick="closeRouteBuilder()" aria-label="Tutup"
                        class="text-gray-400 hover:text-gray-600">
                    <i class="fa-solid fa-times text-xl"></i>
                </button>
            </div>

            <div class="mb-4">
                <label class="block text-sm font-medium text-dark-text mb-2">Nama Rute</label>
                <input type="text" id="custom-route-name"
                       class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-dark focus:outline-none"
                       placeholder="Contoh: Rute Khusus Pagi">
            </div>

            <div class="mb-4">
                <label class="block text-sm font-medium text-dark-text mb-2">Warna Rute</label>
                <div class="flex gap-3">${colorOpts}</div>
            </div>

            <div class="mb-2">
                <label class="block text-sm font-medium text-dark-text mb-1">
                    Pilih & Urutkan Titik
                </label>
                <p class="text-xs text-gray-400 mb-2">
                    Centang titik, lalu isi nomor urutan kunjungan (1, 2, 3, …).
                </p>
                <div class="space-y-2 max-h-64 overflow-y-auto pr-1">${pointsList}</div>
            </div>

            <div id="builder-error" class="hidden mb-3 p-2 bg-red-50 text-red-600 text-sm rounded-lg">
                <i class="fa-solid fa-circle-exclamation mr-1"></i>
                <span id="builder-error-text"></span>
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
        </div>`;

    document.body.appendChild(modal);
}

// Aktif/nonaktifkan input urutan mengikuti centang.
function toggleOrderInput(pointId) {
    const cb = document.getElementById(`custom-${pointId}`);
    const order = document.getElementById(`order-${pointId}`);
    if (!cb || !order) return;
    order.disabled = !cb.checked;
    if (!cb.checked) order.value = '';
}

function showBuilderError(msg) {
    const box = document.getElementById('builder-error');
    const txt = document.getElementById('builder-error-text');
    if (box && txt) { txt.textContent = msg; box.classList.remove('hidden'); }
}

function saveCustomRoute() {
    const name = document.getElementById('custom-route-name').value.trim();
    if (!name) { showBuilderError('Nama rute harus diisi.'); return; }

    const color = (document.querySelector('input[name="route-color"]:checked') || {}).value || '#9C27B0';

    const points = getWastePoints();
    const selected = [];
    points.forEach(point => {
        const cb = document.getElementById(`custom-${point.id}`);
        const orderEl = document.getElementById(`order-${point.id}`);
        if (cb && cb.checked) {
            const order = parseInt(orderEl.value, 10);
            selected.push({ pointId: point.id, order: isNaN(order) ? 999 : order });
        }
    });

    if (selected.length < 2) { showBuilderError('Pilih minimal 2 titik untuk membuat rute.'); return; }

    // Cek nomor urutan ganda.
    const orders = selected.map(s => s.order);
    if (new Set(orders).size !== orders.length) {
        showBuilderError('Nomor urutan tidak boleh sama. Periksa kembali.');
        return;
    }

    // Urutkan sesuai angka yang diisi user.
    selected.sort((a, b) => a.order - b.order);
    selected.forEach((s, i) => s.order = i + 1);

    ROUTE_TEMPLATES.custom = {
        id: "ROUTE-CUSTOM-" + Date.now(),
        name: name,
        description: "Rute custom yang dibuat manual",
        color: color,
        waypoints: selected,
        status: "active"
    };

    closeRouteBuilder();
    drawRoute('custom');
    addLog(`Rute custom "${name}" dibuat: ${selected.length} titik`, "success");
}

function closeRouteBuilder() {
    const modal = document.getElementById('route-builder-modal');
    if (modal) modal.remove();
}
