/* ===================================
   CHARTS HANDLER
   Smart Waste Monitoring System
   =================================== */

let capacityChart = null;
let chartData = {
    capacity: []
};

// ===== INITIALIZE CHARTS =====
function initCharts() {
    initCapacityChart();
    updatePredictionDisplay();
}

// ===== CAPACITY CHART =====
function initCapacityChart() {
    const ctx = document.getElementById('capacityChart');
    if (!ctx) return;
    
    capacityChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: Array(10).fill('-'),
            datasets: [{
                label: 'Kapasitas Bak Sampah (%)',
                data: Array(10).fill(0),
                backgroundColor: 'rgba(102, 187, 106, 0.2)',
                borderColor: '#2E7D32',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    display: true
                }
            }
        }
    });
}

// ===== UPDATE CHART =====
function updateChart(chartType, newValue) {
    if (chartType === 'capacity' && capacityChart) {
        // Shift data
        capacityChart.data.labels.shift();
        capacityChart.data.labels.push(
            new Date().toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        );
        
        capacityChart.data.datasets[0].data.shift();
        capacityChart.data.datasets[0].data.push(newValue);
        
        // Change color based on value
        if (newValue >= 80) {
            capacityChart.data.datasets[0].borderColor = '#E53935';
            capacityChart.data.datasets[0].backgroundColor = 'rgba(229, 57, 53, 0.2)';
        } else if (newValue >= 60) {
            capacityChart.data.datasets[0].borderColor = '#F57C00';
            capacityChart.data.datasets[0].backgroundColor = 'rgba(245, 124, 0, 0.2)';
        } else if (newValue >= 50) {
            capacityChart.data.datasets[0].borderColor = '#FDD835';
            capacityChart.data.datasets[0].backgroundColor = 'rgba(253, 216, 53, 0.2)';
        } else {
            capacityChart.data.datasets[0].borderColor = '#2E7D32';
            capacityChart.data.datasets[0].backgroundColor = 'rgba(102, 187, 106, 0.2)';
        }
        
        capacityChart.update();
    }
}

// ===== UPDATE PREDICTION DISPLAY =====
function updatePredictionDisplay() {
    // Get trip history from storage
    const history = getTripHistory();
    const today = new Date().toDateString();
    const todayTrips = history.filter(trip => 
        new Date(trip.date).toDateString() === today
    );
    
    const completed = todayTrips.length;
    const target = OPERATION_CONFIG.dailyTargetTrips;
    const percentage = Math.min(100, (completed / target) * 100);
    
    document.getElementById('prediction-percentage').textContent = 
        percentage.toFixed(0) + '%';
    document.getElementById('target-trips').textContent = target + ' trip';
    document.getElementById('completed-trips').textContent = completed + ' trip';
}

// ===== GET TRIP HISTORY =====
function getTripHistory() {
    const data = localStorage.getItem(STORAGE_KEYS.tripHistory);
    return data ? JSON.parse(data) : [];
}

// ===== ADD TRIP TO HISTORY =====
function addTrip() {
    const trips = getTripHistory();
    trips.push({
        date: new Date().toISOString(),
        truckId: localStorage.getItem(STORAGE_KEYS.activeTruck)
    });
    localStorage.setItem(STORAGE_KEYS.tripHistory, JSON.stringify(trips));
    updatePredictionDisplay();
}