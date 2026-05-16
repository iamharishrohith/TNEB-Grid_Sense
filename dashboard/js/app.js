// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense — Main Application Controller
//  Navigation, WebSocket, data fetching, view orchestration
// ═══════════════════════════════════════════════════════════════════

const app = {
    currentView: 'state',
    ws: null,
    wsRetryCount: 0,
    wsRetryMax: 10,

    // ─── Init ────────────────────────────────────────────────
    init() {
        console.log('⚡ TN-GridSense Dashboard initializing...');
        this.connectWebSocket();
        this.navigate('state');

        // Update time display
        setInterval(() => {
            const now = new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false, timeZone: 'Asia/Kolkata',
            });
            document.getElementById('lastUpdateTime').textContent = now;
        }, 1000);
    },

    // ─── WebSocket ───────────────────────────────────────────
    connectWebSocket() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${location.host}/ws`;

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('[WS] Connected');
                this.wsRetryCount = 0;
                this.setWSStatus(true);
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this.handleWSMessage(msg);
                } catch { }
            };

            this.ws.onclose = () => {
                console.log('[WS] Disconnected');
                this.setWSStatus(false);
                this.retryWS();
            };

            this.ws.onerror = () => {
                this.setWSStatus(false);
            };
        } catch {
            this.setWSStatus(false);
            this.retryWS();
        }
    },

    retryWS() {
        if (this.wsRetryCount < this.wsRetryMax) {
            this.wsRetryCount++;
            const delay = Math.min(2000 * this.wsRetryCount, 15000);
            setTimeout(() => this.connectWebSocket(), delay);
        }
    },

    setWSStatus(connected) {
        const dot = document.getElementById('wsStatusDot');
        const text = document.getElementById('wsStatusText');
        if (connected) {
            dot.style.background = 'var(--accent-green)';
            text.textContent = 'Live Connected';
        } else {
            dot.style.background = 'var(--accent-red)';
            text.textContent = 'Reconnecting...';
        }
    },

    handleWSMessage(msg) {
        if (msg.type === 'telemetry') {
            if (this.currentView === 'state') {
                StateView.handleUpdate(msg.data);
            }
        }
    },

    // ─── State Selector ────────────────────────────────────────
    handleStateChange(value) {
        if (value !== 'TN') {
            // Reset to TN
            document.getElementById('stateSelect').value = 'TN';
            alert('🔒 Coming Soon!\n\nThis state is not yet available.\nOnly Tamil Nadu (38 Districts) is active in the current deployment phase.');
        }
    },

    // ─── Zone Filter ───────────────────────────────────────────
    currentZone: 'all',

    filterZone(zone) {
        this.currentZone = zone;

        // Update badge styles
        document.querySelectorAll('.zone-badge').forEach(b => {
            const z = b.getAttribute('data-zone');
            if (z === zone) {
                b.style.borderColor = 'var(--border-active)';
                b.style.fontWeight = '600';
            } else {
                b.style.borderColor = 'transparent';
                b.style.fontWeight = '400';
            }
        });

        // Filter district table rows
        const tbody = document.getElementById('districtTableBody');
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                if (zone === 'all') {
                    row.style.display = '';
                } else {
                    // Match district to zone via DISTRICT_ZONES lookup
                    const districtName = row.querySelector('.district-name')?.textContent;
                    if (districtName) {
                        const districtZone = DISTRICT_ZONES[districtName] || '';
                        row.style.display = districtZone === zone ? '' : 'none';
                    }
                }
            });
        }

        // Filter map — highlight matching zones
        if (StateView.districts.length) {
            StateView.renderMap(StateView.districts);
        }
    },

    // ─── Navigation ──────────────────────────────────────────
    navigate(view, params = {}) {
        document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

        if (this.currentView === 'pole' && view !== 'pole') {
            PoleView.stopRefresh();
        }

        this.currentView = view;

        const viewPanel = document.getElementById(`${view}View`);
        if (viewPanel) viewPanel.classList.add('active');

        const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
        if (navItem) navItem.classList.add('active');

        const titles = {
            state: 'State Overview',
            district: 'District View',
            pole: 'Pole Inspector',
            events: 'Fault Events',
            maintenance: 'Predictive Maintenance',
            atcloss: 'AT&C Loss Analysis',
        };

        document.getElementById('pageTitle').textContent = titles[view] || view;
        this.updateBreadcrumbs(view, params);

        switch (view) {
            case 'state':
                StateView.load();
                break;
            case 'district':
                if (params.districtId) DistrictView.load(params.districtId);
                break;
            case 'pole':
                if (params.poleId) PoleView.load(params.poleId);
                break;
            case 'events':
                this.loadEvents();
                break;
            case 'maintenance':
                this.loadMaintenance();
                break;
            case 'atcloss':
                this.loadATCLoss();
                break;
        }
    },

    updateBreadcrumbs(view, params) {
        const bc = document.getElementById('breadcrumbs');
        let crumbs = `<span onclick="app.navigate('state')">India</span> › <span onclick="app.navigate('state')">Tamil Nadu</span>`;

        if (view === 'district' && params.districtId) {
            crumbs += ` › <span>${params.districtId}</span>`;
        } else if (view === 'pole' && params.poleId) {
            const pole = params;
            crumbs += ` › <span onclick="app.selectDistrict('${pole.districtId || ''}')">${pole.districtId || 'District'}</span>`;
            crumbs += ` › <span>${params.poleId}</span>`;
        } else if (view !== 'state') {
            crumbs += ` › <span>${document.getElementById('pageTitle').textContent}</span>`;
        }

        bc.innerHTML = crumbs;
    },

    // ─── Quick Navigation ────────────────────────────────────
    selectDistrict(districtId) {
        this.navigate('district', { districtId });
    },

    selectPole(poleId) {
        this.navigate('pole', { poleId });
    },

    selectFeeder(feederId) {
        console.log('Feeder selected:', feederId);
    },

    // ─── Events View ─────────────────────────────────────────
    async loadEvents() {
        try {
            const res = await fetch('/api/events?limit=100');
            const events = await res.json();
            const tbody = document.getElementById('eventsTableBody');

            if (!events.length) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-muted" style="text-align:center;padding:30px;">No fault events recorded</td></tr>';
                return;
            }

            tbody.innerHTML = events.map(e => {
                const sevClass = e.severity === 'CRITICAL' ? 'critical' : e.severity === 'FAULT' ? 'fault' : 'warning';
                const time = new Date(e.timestamp).toLocaleString('en-IN', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false,
                });
                return `
          <tr onclick="app.selectPole('${e.poleId}')">
            <td class="text-mono" style="font-size: 0.72rem;">${e.id}</td>
            <td class="text-mono">${time}</td>
            <td style="color: var(--accent-blue); cursor: pointer; font-weight: 600;">${e.poleId}</td>
            <td>${e.districtId}</td>
            <td><span class="badge ${sevClass}">${e.type}</span></td>
            <td><span class="badge ${sevClass}">${e.severity}</span></td>
            <td class="text-mono">${e.value ? e.value.toFixed(1) : '-'}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${e.message}</td>
          </tr>
        `;
            }).join('');
        } catch (err) {
            console.error('[Events] Load error:', err);
        }
    },

    // ─── Maintenance View ────────────────────────────────────
    async loadMaintenance() {
        try {
            const res = await fetch('/api/analytics/maintenance');
            const recommendations = await res.json();
            const container = document.getElementById('maintenanceList');

            if (!recommendations.length) {
                container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">✓</div>
            <div>No maintenance recommendations</div>
          </div>
        `;
                return;
            }

            container.innerHTML = recommendations.map(r => {
                const riskClass = r.riskLevel.toLowerCase();
                const riskColor = r.riskLevel === 'CRITICAL' ? 'var(--accent-red)' :
                    r.riskLevel === 'HIGH' ? '#ff9800' :
                        r.riskLevel === 'MODERATE' ? 'var(--accent-amber)' : 'var(--accent-green)';

                return `
          <div class="maintenance-card risk-${riskClass}" style="padding: var(--space-md); background: var(--bg-card); border-radius: var(--radius-md); cursor: pointer;" onclick="app.selectPole('${r.poleId}')">
            <div class="maint-header">
              <span class="maint-pole">${r.poleId}</span>
              <div style="display: flex; gap: var(--space-sm); align-items: center;">
                ${r.estimatedDaysToFailure !== null ?
                        `<span style="font-size: 0.75rem; color: ${riskColor}; font-weight: 600;">~${r.estimatedDaysToFailure}d</span>` : ''}
                <span class="badge ${riskClass}">${r.riskLevel}</span>
              </div>
            </div>
            <div class="maint-recommendation">${r.recommendation}</div>
            ${r.factors.length > 0 ? `
              <ul class="maint-factors">
                ${r.factors.map(f => `<li>${f}</li>`).join('')}
              </ul>
            ` : ''}
            <div style="margin-top: var(--space-sm);">
              <div class="progress-bar" style="height: 4px;">
                <div class="fill ${r.healthScore >= 60 ? 'green' : r.healthScore >= 35 ? 'amber' : 'red'}" style="width: ${r.healthScore}%"></div>
              </div>
              <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">Health: ${r.healthScore.toFixed(0)}%</div>
            </div>
          </div>
        `;
            }).join('');
        } catch (err) {
            console.error('[Maintenance] Load error:', err);
        }
    },

    // ─── AT&C Loss View ──────────────────────────────────────
    async loadATCLoss() {
        try {
            const res = await fetch('/api/analytics/atc-loss');
            const reports = await res.json();
            const tbody = document.getElementById('atclossTableBody');

            if (!reports.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:30px;">No feeder data</td></tr>';
                return;
            }

            tbody.innerHTML = reports.map(r => {
                let statusBadge;
                if (r.possibleTheft) {
                    statusBadge = '<span class="badge critical">⚠ THEFT SUSPECTED</span>';
                } else if (r.anomalous) {
                    statusBadge = '<span class="badge warning">Anomalous</span>';
                } else {
                    statusBadge = '<span class="badge normal">Normal</span>';
                }

                const lossColor = r.lossPercentage > 15 ? 'var(--accent-red)' :
                    r.lossPercentage > 10 ? 'var(--accent-amber)' : 'var(--accent-green)';

                return `
          <tr>
            <td class="text-mono" style="font-weight: 600; color: var(--accent-blue);">${r.feederId}</td>
            <td class="text-mono">${r.inputPower.toFixed(2)}</td>
            <td class="text-mono">${r.measuredLoad.toFixed(2)}</td>
            <td class="text-mono">${r.loss.toFixed(2)}</td>
            <td class="text-mono" style="color: ${lossColor}; font-weight: 700;">${r.lossPercentage.toFixed(1)}%</td>
            <td>${statusBadge}</td>
          </tr>
        `;
            }).join('');
        } catch (err) {
            console.error('[ATCLoss] Load error:', err);
        }
    },
};

// ─── Init on DOM ready ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => app.init());
