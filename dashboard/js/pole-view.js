// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense — Pole Inspector View (Level 3)
// ═══════════════════════════════════════════════════════════════════

const PoleView = {
    currentPole: null,
    refreshInterval: null,

    async load(poleId) {
        this.currentPole = poleId;
        const content = document.getElementById('poleContent');

        try {
            const res = await fetch(`/api/poles/${poleId}`);
            const pole = await res.json();

            if (pole.error) {
                content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div>${pole.error}</div></div>`;
                return;
            }

            this.render(pole);

            // Auto-refresh
            if (this.refreshInterval) clearInterval(this.refreshInterval);
            this.refreshInterval = setInterval(() => this.refresh(), 5000);
        } catch (err) {
            console.error('[PoleView] Load error:', err);
            content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div>Failed to load pole data</div></div>`;
        }
    },

    async refresh() {
        if (!this.currentPole) return;
        try {
            const res = await fetch(`/api/poles/${this.currentPole}`);
            const pole = await res.json();
            if (!pole.error) {
                this.updateMetrics(pole);
                this.renderCharts(pole);
            }
        } catch { }
    },

    stopRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    render(pole) {
        const content = document.getElementById('poleContent');
        const statusClass = pole.status === 'NORMAL' ? 'normal' :
            pole.status === 'OFFLINE' ? 'offline' : 'fault';
        const riskClass = pole.riskLevel?.toLowerCase() || 'low';

        content.innerHTML = `
      <!-- Pole Header -->
      <div class="pole-header animate-in">
        <div>
          <div class="pole-id">${pole.poleId}</div>
          <div class="pole-meta">
            Feeder: ${pole.feederId} &nbsp;|&nbsp; District: ${pole.districtId} &nbsp;|&nbsp;
            Last seen: <span id="poleLastSeen">${this.formatTime(pole.lastSeen)}</span>
          </div>
        </div>
        <div style="display: flex; gap: var(--space-md); align-items: center;">
          <span class="badge ${statusClass}" id="poleStatusBadge">${pole.status}</span>
          <span class="badge ${riskClass}" id="poleRiskBadge">${pole.riskLevel || 'LOW'}</span>
        </div>
      </div>

      <!-- Live Metrics -->
      <div class="pole-gauges animate-in" style="animation-delay: 0.1s">
        <div class="card metric-card">
          <div class="metric-value" id="poleVoltage">${pole.voltage.toFixed(1)}<span class="metric-unit">V</span></div>
          <div class="metric-label">AC Voltage</div>
          <div class="metric-bar">
            <div class="progress-bar"><div class="fill ${this.voltageColor(pole.voltage)}" style="width: ${Math.min(100, (pole.voltage / 260) * 100)}%"></div></div>
          </div>
        </div>
        <div class="card metric-card">
          <div class="metric-value" id="poleCurrent">${pole.current.toFixed(1)}<span class="metric-unit">A</span></div>
          <div class="metric-label">AC Current</div>
          <div class="metric-bar">
            <div class="progress-bar"><div class="fill ${this.currentColor(pole.current)}" style="width: ${Math.min(100, (pole.current / 30) * 100)}%"></div></div>
          </div>
        </div>
        <div class="card metric-card">
          <div class="metric-value" id="poleTemp">${pole.temperature.toFixed(1)}<span class="metric-unit">°C</span></div>
          <div class="metric-label">Temperature</div>
          <div class="metric-bar">
            <div class="progress-bar"><div class="fill ${this.tempColor(pole.temperature)}" style="width: ${Math.min(100, (pole.temperature / 100) * 100)}%"></div></div>
          </div>
        </div>
        <div class="card metric-card">
          <div class="metric-value" id="poleHealth">${pole.healthScore.toFixed(0)}<span class="metric-unit">%</span></div>
          <div class="metric-label">Health Score</div>
          <div class="metric-bar">
            <div class="progress-bar"><div class="fill ${this.healthColor(pole.healthScore)}" style="width: ${pole.healthScore}%"></div></div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid-2 animate-in" style="margin-bottom: var(--space-xl); animation-delay: 0.2s">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Voltage & Current — 24h Trend</span>
          </div>
          <div class="chart-container">
            <canvas id="poleVoltCurrentChart"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Temperature & Health — 24h Trend</span>
          </div>
          <div class="chart-container">
            <canvas id="poleTempHealthChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Maintenance + Info -->
      <div class="grid-2 animate-in" style="margin-bottom: var(--space-xl); animation-delay: 0.3s">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Maintenance Recommendation</span>
          </div>
          <div id="poleMaintenanceInfo"></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Pole Details</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm);">
            <div style="font-size: 0.8rem; color: var(--text-muted);">Power</div>
            <div style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-bright);" id="polePower">${pole.power.toFixed(0)}W</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Relay State</div>
            <div style="font-size: 0.8rem; font-weight: 600;" id="poleRelay"><span style="color: ${pole.relayState ? 'var(--accent-green)' : 'var(--accent-red)'};">${pole.relayState ? 'ON (Connected)' : 'OFF (Tripped)'}</span></div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Signal</div>
            <div style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-bright);" id="poleSignal">${pole.signal} dBm</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Uptime</div>
            <div style="font-size: 0.8rem; font-family: var(--font-mono); color: var(--text-bright);" id="poleUptime">${this.formatUptime(pole.uptime)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Anomalies</div>
            <div style="font-size: 0.8rem;" id="poleAnomalyCount">${pole.anomalies?.length || 0} detected</div>
          </div>
        </div>
      </div>

      <!-- Event Log -->
      <div class="card animate-in" style="animation-delay: 0.4s">
        <div class="card-header">
          <span class="card-title">Event Log</span>
          <span class="text-muted" style="font-size: 0.72rem;">${pole.events?.length || 0} events</span>
        </div>
        <div class="table-wrapper" style="max-height: 300px; overflow-y: auto;">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Value</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody id="poleEventLog"></tbody>
          </table>
        </div>
      </div>
    `;

        this.renderCharts(pole);
        this.renderMaintenance(pole.maintenance);
        this.renderEventLog(pole.events || []);
    },

    updateMetrics(pole) {
        const el = (id) => document.getElementById(id);
        if (!el('poleVoltage')) return;

        el('poleVoltage').innerHTML = `${pole.voltage.toFixed(1)}<span class="metric-unit">V</span>`;
        el('poleCurrent').innerHTML = `${pole.current.toFixed(1)}<span class="metric-unit">A</span>`;
        el('poleTemp').innerHTML = `${pole.temperature.toFixed(1)}<span class="metric-unit">°C</span>`;
        el('poleHealth').innerHTML = `${pole.healthScore.toFixed(0)}<span class="metric-unit">%</span>`;
        el('polePower').textContent = `${pole.power.toFixed(0)}W`;
        el('poleSignal').textContent = `${pole.signal} dBm`;
        el('poleLastSeen').textContent = this.formatTime(pole.lastSeen);

        if (el('poleRelay')) {
            el('poleRelay').innerHTML = pole.relayState
                ? '<span style="color: var(--accent-green);">ON (Connected)</span>'
                : '<span style="color: var(--accent-red);">OFF (Tripped)</span>';
        }

        const statusClass = pole.status === 'NORMAL' ? 'normal' : pole.status === 'OFFLINE' ? 'offline' : 'fault';
        if (el('poleStatusBadge')) {
            el('poleStatusBadge').className = `badge ${statusClass}`;
            el('poleStatusBadge').textContent = pole.status;
        }
    },

    renderCharts(pole) {
        if (!pole.history || pole.history.length < 2) return;

        const labels = Charts.formatTimeLabels(pole.history.map(h => h.timestamp));
        const voltages = pole.history.map(h => h.voltage);
        const currents = pole.history.map(h => h.current);
        const temps = pole.history.map(h => h.temperature);
        const healths = pole.history.map(h => h.healthScore);

        // Voltage & Current chart
        Charts.createLineChart('poleVoltCurrentChart', labels, [
            {
                label: 'Voltage (V)',
                data: voltages,
                borderColor: ChartColors.blue,
                backgroundColor: ChartColors.blueDim,
                fill: true,
                yAxisID: 'y',
            },
            {
                label: 'Current (A)',
                data: currents,
                borderColor: ChartColors.amber,
                backgroundColor: ChartColors.amberDim,
                fill: true,
                yAxisID: 'y1',
            },
        ], {
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } },
                y: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: ChartColors.gridLine },
                    ticks: { maxTicksLimit: 6 },
                    title: { display: true, text: 'Voltage (V)', color: ChartColors.blue },
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    grid: { display: false },
                    ticks: { maxTicksLimit: 6 },
                    title: { display: true, text: 'Current (A)', color: ChartColors.amber },
                },
            },
        });

        // Temperature & Health chart
        Charts.createLineChart('poleTempHealthChart', labels, [
            {
                label: 'Temperature (°C)',
                data: temps,
                borderColor: ChartColors.red,
                backgroundColor: ChartColors.redDim,
                fill: true,
                yAxisID: 'y',
            },
            {
                label: 'Health (%)',
                data: healths,
                borderColor: ChartColors.green,
                backgroundColor: ChartColors.greenDim,
                fill: true,
                yAxisID: 'y1',
            },
        ], {
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0 } },
                y: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: ChartColors.gridLine },
                    ticks: { maxTicksLimit: 6 },
                    title: { display: true, text: 'Temp (°C)', color: ChartColors.red },
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    grid: { display: false },
                    ticks: { maxTicksLimit: 6 },
                    min: 0,
                    max: 100,
                    title: { display: true, text: 'Health (%)', color: ChartColors.green },
                },
            },
        });
    },

    renderMaintenance(maintenance) {
        const container = document.getElementById('poleMaintenanceInfo');
        if (!container || !maintenance) {
            if (container) container.innerHTML = '<div class="text-muted">No data</div>';
            return;
        }

        const riskClass = maintenance.riskLevel.toLowerCase();
        const riskColor = maintenance.riskLevel === 'CRITICAL' ? 'var(--accent-red)' :
            maintenance.riskLevel === 'HIGH' ? '#ff9800' :
                maintenance.riskLevel === 'MODERATE' ? 'var(--accent-amber)' : 'var(--accent-green)';

        container.innerHTML = `
      <div class="maintenance-card risk-${riskClass}" style="padding: var(--space-md);">
        <div class="maint-header">
          <span class="badge ${riskClass}">${maintenance.riskLevel} RISK</span>
          ${maintenance.estimatedDaysToFailure !== null ?
                `<span style="font-size: 0.8rem; color: ${riskColor}; font-weight: 600;">~${maintenance.estimatedDaysToFailure} days to failure</span>` : ''}
        </div>
        <div class="maint-recommendation" style="margin: var(--space-sm) 0;">${maintenance.recommendation}</div>
        ${maintenance.factors.length > 0 ? `
          <ul class="maint-factors">
            ${maintenance.factors.map(f => `<li>${f}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
    },

    renderEventLog(events) {
        const tbody = document.getElementById('poleEventLog');
        if (!tbody) return;

        if (!events.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px;">No events recorded</td></tr>';
            return;
        }

        tbody.innerHTML = events.slice(-20).reverse().map(e => {
            const sevClass = e.severity === 'CRITICAL' ? 'critical' : e.severity === 'FAULT' ? 'fault' : 'warning';
            const time = new Date(e.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            return `
        <tr>
          <td class="text-mono">${time}</td>
          <td><span class="badge ${sevClass}">${e.type}</span></td>
          <td><span class="badge ${sevClass}">${e.severity}</span></td>
          <td class="text-mono">${e.value ? e.value.toFixed(1) : '-'}</td>
          <td>${e.message}</td>
        </tr>
      `;
        }).join('');
    },

    // Helpers
    voltageColor(v) {
        if (v > 253 || v < 207) return 'red';
        if (v > 248 || v < 212) return 'amber';
        return 'green';
    },
    currentColor(c) { return c > 28 ? 'red' : c > 25 ? 'amber' : 'blue'; },
    tempColor(t) { return t > 80 ? 'red' : t > 65 ? 'amber' : 'green'; },
    healthColor(h) { return h < 35 ? 'red' : h < 60 ? 'amber' : 'green'; },

    formatTime(ts) {
        if (!ts) return '--:--:--';
        return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    },

    formatUptime(seconds) {
        if (!seconds) return '--';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    },
};
