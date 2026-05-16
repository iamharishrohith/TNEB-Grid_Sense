// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense — Chart.js Utilities
// ═══════════════════════════════════════════════════════════════════

const ChartColors = {
    blue: 'rgba(79, 140, 255, 1)',
    blueDim: 'rgba(79, 140, 255, 0.15)',
    green: 'rgba(76, 175, 80, 1)',
    greenDim: 'rgba(76, 175, 80, 0.15)',
    amber: 'rgba(255, 183, 77, 1)',
    amberDim: 'rgba(255, 183, 77, 0.15)',
    red: 'rgba(255, 82, 82, 1)',
    redDim: 'rgba(255, 82, 82, 0.15)',
    cyan: 'rgba(38, 198, 218, 1)',
    cyanDim: 'rgba(38, 198, 218, 0.15)',
    purple: 'rgba(179, 136, 255, 1)',
    purpleDim: 'rgba(179, 136, 255, 0.15)',
    textMuted: 'rgba(92, 101, 132, 1)',
    gridLine: 'rgba(99, 130, 255, 0.06)',
};

// Global Chart.js defaults
Chart.defaults.color = ChartColors.textMuted;
Chart.defaults.borderColor = ChartColors.gridLine;
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10, 14, 26, 0.95)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(99, 130, 255, 0.2)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };

const Charts = {
    _instances: {},

    destroy(id) {
        if (this._instances[id]) {
            this._instances[id].destroy();
            delete this._instances[id];
        }
    },

    createLineChart(canvasId, labels, datasets, options = {}) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { position: 'top', align: 'end' },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 8, maxRotation: 0 },
                    },
                    y: {
                        grid: { color: ChartColors.gridLine },
                        ticks: { maxTicksLimit: 6 },
                        ...options.yAxis,
                    },
                },
                elements: {
                    point: { radius: 0, hoverRadius: 4 },
                    line: { tension: 0.4, borderWidth: 2 },
                },
                ...options,
            },
        });

        this._instances[canvasId] = chart;
        return chart;
    },

    createBarChart(canvasId, labels, datasets, options = {}) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: datasets.length > 1 },
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        grid: { color: ChartColors.gridLine },
                        ticks: { maxTicksLimit: 6 },
                    },
                },
                ...options,
            },
        });

        this._instances[canvasId] = chart;
        return chart;
    },

    createDoughnutChart(canvasId, labels, data, colors, options = {}) {
        this.destroy(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom' },
                },
                ...options,
            },
        });

        this._instances[canvasId] = chart;
        return chart;
    },

    // Helper to create a gradient fill
    createGradient(ctx, color, alpha = 0.3) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, color.replace('1)', `${alpha})`));
        gradient.addColorStop(1, color.replace('1)', '0.01)'));
        return gradient;
    },

    // Format time labels from ISO timestamps
    formatTimeLabels(timestamps) {
        return timestamps.map(ts => {
            const d = new Date(ts);
            return d.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
        });
    },
};
