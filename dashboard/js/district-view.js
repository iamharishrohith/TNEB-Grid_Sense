// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense — District View (Level 2)
// ═══════════════════════════════════════════════════════════════════

const DistrictView = {
    currentDistrict: null,
    chartInstances: {},

    async load(districtId) {
        this.currentDistrict = districtId;
        const content = document.getElementById('districtContent');

        try {
            const [districtRes, polesRes] = await Promise.all([
                fetch(`/api/districts/${districtId}`),
                fetch('/api/poles'),
            ]);

            const district = await districtRes.json();
            if (district.error) {
                content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div>${district.error}</div></div>`;
                return;
            }

            const allPoles = await polesRes.json();
            const districtPoles = allPoles.filter(p => p.districtId === districtId);

            this.render(district, districtPoles);
        } catch (err) {
            console.error('[DistrictView] Load error:', err);
            content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div>Failed to load district data</div></div>`;
        }
    },

    render(district, poles) {
        const content = document.getElementById('districtContent');
        const riskClass = district.riskLevel.toLowerCase();

        content.innerHTML = `
      <!-- District KPIs -->
      <div class="kpi-grid animate-in">
        <div class="card kpi-card">
          <div class="kpi-icon" style="background: var(--accent-blue-dim); color: var(--accent-blue);">📡</div>
          <div class="kpi-value">${district.poleCount}</div>
          <div class="kpi-label">Total Poles</div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-icon" style="background: var(--accent-green-dim); color: var(--accent-green);">✓</div>
          <div class="kpi-value">${district.activePoles}</div>
          <div class="kpi-label">Active</div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-icon" style="background: var(--accent-red-dim); color: var(--accent-red);">⚡</div>
          <div class="kpi-value">${district.faultCount}</div>
          <div class="kpi-label">Faults</div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-icon" style="background: var(--accent-amber-dim); color: var(--accent-amber);">🌡️</div>
          <div class="kpi-value">${district.overheatCount}</div>
          <div class="kpi-label">Overheats</div>
        </div>
        <div class="card kpi-card">
          <div class="kpi-icon" style="background: var(--accent-cyan-dim); color: var(--accent-cyan);">⚡</div>
          <div class="kpi-value">${district.totalLoad.toFixed(1)}</div>
          <div class="kpi-label">Load (kW)</div>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="grid-2 animate-in" style="margin-bottom: var(--space-xl); animation-delay: 0.1s">
        <div class="card">
          <div class="card-header">
            <span class="card-title">District Health</span>
            <span class="badge ${riskClass}">${district.riskLevel}</span>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-xl);">
            <div class="health-circle" id="districtHealthCircle"></div>
            <div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-sm);">
                Average Voltage: <span class="text-mono" style="color: var(--text-bright);">${district.avgVoltage.toFixed(1)}V</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-sm);">
                Feeders: <span class="text-mono" style="color: var(--text-bright);">${district.feeders.length}</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">
                Offline: <span class="text-mono" style="color: ${district.offlinePoles > 0 ? 'var(--accent-red)' : 'var(--text-bright)'};">${district.offlinePoles}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Load Distribution</span>
          </div>
          <div class="chart-container" style="height: 180px;">
            <canvas id="districtLoadChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Feeder Cards -->
      <div class="card animate-in" style="animation-delay: 0.2s">
        <div class="card-header">
          <span class="card-title">Feeders</span>
        </div>
        <div class="feeder-grid" id="feederGrid"></div>
      </div>

      <!-- Poles Table -->
      <div class="card animate-in" style="margin-top: var(--space-lg); animation-delay: 0.3s">
        <div class="card-header">
          <span class="card-title">All Poles in ${district.districtId}</span>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Pole ID</th>
                <th>Feeder</th>
                <th>Voltage</th>
                <th>Current</th>
                <th>Temperature</th>
                <th>Power (W)</th>
                <th>Health</th>
                <th>Relay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="districtPolesTable"></tbody>
          </table>
        </div>
      </div>
    `;

        // Render health circle
        this.renderHealthCircle(district.avgHealthScore);

        // Render feeder cards
        this.renderFeeders(district.feeders);

        // Render poles table
        this.renderPolesTable(poles);

        // Render load chart
        this.renderLoadChart(district.feeders);
    },

    renderHealthCircle(score) {
        const container = document.getElementById('districtHealthCircle');
        if (!container) return;

        const circumference = 2 * Math.PI * 48;
        const offset = circumference - (score / 100) * circumference;

        const color = score >= 80 ? 'var(--accent-green)' :
            score >= 60 ? 'var(--accent-amber)' :
                score >= 35 ? '#ff9800' : 'var(--accent-red)';

        container.innerHTML = `
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle class="bg-ring" cx="60" cy="60" r="48"/>
        <circle class="fg-ring" cx="60" cy="60" r="48"
                stroke="${color}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                style="transform: rotate(-90deg); transform-origin: center;"/>
      </svg>
      <div class="health-text">${score.toFixed(0)}%</div>
    `;
    },

    renderFeeders(feeders) {
        const grid = document.getElementById('feederGrid');
        if (!grid) return;

        grid.innerHTML = feeders.map(f => {
            const healthColor = f.avgHealthScore >= 80 ? 'var(--accent-green)' :
                f.avgHealthScore >= 60 ? 'var(--accent-amber)' :
                    f.avgHealthScore >= 35 ? '#ff9800' : 'var(--accent-red)';
            const atcColor = f.atcLoss > 12 ? 'var(--accent-red)' :
                f.atcLoss > 8 ? 'var(--accent-amber)' : 'var(--accent-green)';

            return `
        <div class="card feeder-card" onclick="app.selectFeeder('${f.feederId}')">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="feeder-id">${f.feederId}</span>
            <span class="badge ${f.faultPoles > 0 ? 'fault' : 'normal'}">${f.faultPoles > 0 ? f.faultPoles + ' faults' : 'OK'}</span>
          </div>
          <div class="feeder-stats">
            <div class="feeder-stat">
              <span class="stat-val">${f.poleCount}</span>
              <span class="stat-label">Poles</span>
            </div>
            <div class="feeder-stat">
              <span class="stat-val" style="color: ${healthColor}">${f.avgHealthScore.toFixed(0)}%</span>
              <span class="stat-label">Health</span>
            </div>
            <div class="feeder-stat">
              <span class="stat-val">${f.totalLoad.toFixed(1)}</span>
              <span class="stat-label">Load (kW)</span>
            </div>
            <div class="feeder-stat">
              <span class="stat-val" style="color: ${atcColor}">${f.atcLoss.toFixed(1)}%</span>
              <span class="stat-label">AT&C Loss</span>
            </div>
          </div>
          ${f.criticalPoles.length > 0 ? `
            <div style="margin-top: var(--space-sm); font-size: 0.72rem; color: var(--accent-red);">
              ⚠ Critical: ${f.criticalPoles.join(', ')}
            </div>
          ` : ''}
        </div>
      `;
        }).join('');
    },

    renderPolesTable(poles) {
        const tbody = document.getElementById('districtPolesTable');
        if (!tbody) return;

        const sorted = [...poles].sort((a, b) => a.healthScore - b.healthScore);

        tbody.innerHTML = sorted.map(p => {
            const statusBadge = p.status === 'NORMAL'
                ? '<span class="badge normal">Normal</span>'
                : p.status === 'OFFLINE'
                    ? '<span class="badge offline">Offline</span>'
                    : `<span class="badge fault">${p.status}</span>`;

            const healthColor = p.healthScore >= 80 ? 'var(--accent-green)' :
                p.healthScore >= 60 ? 'var(--accent-amber)' :
                    p.healthScore >= 35 ? '#ff9800' : 'var(--accent-red)';

            return `
        <tr onclick="app.selectPole('${p.poleId}')">
          <td style="color: var(--accent-blue); font-family: var(--font-mono); font-weight: 600;">${p.poleId}</td>
          <td class="text-mono">${p.feederId}</td>
          <td class="text-mono">${p.voltage.toFixed(1)}V</td>
          <td class="text-mono">${p.current.toFixed(1)}A</td>
          <td class="text-mono">${p.temperature.toFixed(1)}°C</td>
          <td class="text-mono">${p.power.toFixed(0)}</td>
          <td style="color: ${healthColor}; font-weight: 700; font-family: var(--font-mono);">${p.healthScore.toFixed(0)}%</td>
          <td>${p.relayState ? '<span style="color: var(--accent-green);">ON</span>' : '<span style="color: var(--accent-red);">OFF</span>'}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
        }).join('');
    },

    renderLoadChart(feeders) {
        const labels = feeders.map(f => f.feederId.replace('FDR-', ''));
        const data = feeders.map(f => f.totalLoad);

        const colors = feeders.map(f =>
            f.avgHealthScore >= 80 ? ChartColors.green :
                f.avgHealthScore >= 60 ? ChartColors.amber :
                    ChartColors.red
        );

        Charts.createBarChart('districtLoadChart', labels, [{
            label: 'Load (kW)',
            data,
            backgroundColor: colors.map(c => c.replace('1)', '0.6)')),
            borderColor: colors,
            borderWidth: 1,
            borderRadius: 4,
        }]);
    },
};
