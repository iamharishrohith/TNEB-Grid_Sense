// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense — State Overview View (Level 1)
//  Shows all 38 Tamil Nadu districts
// ═══════════════════════════════════════════════════════════════════

const StateView = {
  districts: [],
  stats: null,

  async load() {
    try {
      const [statsRes, districtsRes, eventsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/districts'),
        fetch('/api/events?limit=30'),
      ]);

      this.stats = await statsRes.json();
      this.districts = await districtsRes.json();
      const events = await eventsRes.json();

      this.renderKPIs(this.stats);
      this.renderMap(this.districts);
      this.renderDistrictTable(this.districts);
      this.renderEventFeed(events);
      this.updateHealthBadge(this.stats);
    } catch (err) {
      console.error('[StateView] Load error:', err);
    }
  },

  renderKPIs(stats) {
    document.getElementById('kpiTotalPoles').textContent = stats.totalPoles;
    document.getElementById('kpiActivePoles').textContent = stats.activePoles;
    document.getElementById('kpiFaults').textContent = stats.totalFaults;
    document.getElementById('kpiOverheats').textContent = stats.totalOverheats;
    document.getElementById('kpiLoad').textContent = stats.totalLoad.toFixed(1);

    const badge = document.getElementById('faultBadge');
    badge.textContent = stats.totalFaults;
    badge.style.display = stats.totalFaults > 0 ? 'block' : 'none';
  },

  renderMap(districts) {
    const container = document.getElementById('tnMapContainer');

    // Approximate geographic placement of all 38 TN districts on a grid
    // Arranged to roughly mirror Tamil Nadu's geography
    const districtPositions = {
      // ─── NORTH Zone (top of map) ───
      'TIRUVALLUR': { col: 5, row: 0 },
      'CHENNAI': { col: 6, row: 0 },
      'RANIPET': { col: 3, row: 0 },
      'VELLORE': { col: 4, row: 0 },
      'TIRUPATHUR': { col: 3, row: 1 },
      'TIRUVANNAMALAI': { col: 4, row: 1 },
      'KANCHEEPURAM': { col: 5, row: 1 },
      'CHENGALPATTU': { col: 6, row: 1 },

      // ─── WEST Zone (left side) ───
      'KRISHNAGIRI': { col: 2, row: 1 },
      'DHARMAPURI': { col: 2, row: 2 },
      'SALEM': { col: 3, row: 2 },
      'NAMAKKAL': { col: 3, row: 3 },
      'ERODE': { col: 2, row: 3 },
      'TIRUPPUR': { col: 2, row: 4 },
      'COIMBATORE': { col: 1, row: 4 },
      'THE NILGIRIS': { col: 1, row: 3 },
      'KARUR': { col: 3, row: 4 },

      // ─── EAST Zone (right side) ───
      'KALLAKURICHI': { col: 5, row: 2 },
      'VILUPPURAM': { col: 4, row: 2 },
      'CUDDALORE': { col: 5, row: 3 },
      'ARIYALUR': { col: 4, row: 4 },
      'PERAMBALUR': { col: 4, row: 3 },
      'TIRUCHIRAPPALLI': { col: 3, row: 5 },
      'THANJAVUR': { col: 4, row: 5 },
      'MAYILADUTHURAI': { col: 5, row: 4 },
      'NAGAPATTINAM': { col: 5, row: 5 },
      'TIRUVARUR': { col: 4, row: 6 },

      // ─── SOUTH Zone (bottom) ───
      'PUDUKKOTTAI': { col: 3, row: 6 },
      'SIVAGANGA': { col: 3, row: 7 },
      'MADURAI': { col: 2, row: 6 },
      'DINDIGUL': { col: 2, row: 5 },
      'THENI': { col: 1, row: 6 },
      'RAMANATHAPURAM': { col: 4, row: 7 },
      'VIRUDHUNAGAR': { col: 2, row: 7 },
      'THOOTHUKUDI': { col: 3, row: 8 },
      'TENKASI': { col: 1, row: 8 },
      'TIRUNELVELI': { col: 2, row: 8 },
      'KANNIYAKUMARI': { col: 2, row: 9 },
    };

    // Short display names for tight grid cells
    const shortNames = {
      'TIRUVALLUR': 'T.VALLUR',
      'CHENNAI': 'CHENNAI',
      'RANIPET': 'RANIPET',
      'VELLORE': 'VELLORE',
      'TIRUPATHUR': 'T.PATHUR',
      'TIRUVANNAMALAI': 'T.MALAI',
      'KANCHEEPURAM': 'KANCHI',
      'CHENGALPATTU': 'C.PATTU',
      'KRISHNAGIRI': 'K.GIRI',
      'DHARMAPURI': 'D.PURI',
      'SALEM': 'SALEM',
      'NAMAKKAL': 'NAMKL',
      'ERODE': 'ERODE',
      'TIRUPPUR': 'TIRUPPR',
      'COIMBATORE': 'CBE',
      'THE NILGIRIS': 'NILGIRS',
      'KARUR': 'KARUR',
      'KALLAKURICHI': 'K.RICHI',
      'VILUPPURAM': 'V.PURAM',
      'CUDDALORE': 'CUDDAL',
      'ARIYALUR': 'ARIYALR',
      'PERAMBALUR': 'P.BALUR',
      'TIRUCHIRAPPALLI': 'TRICHY',
      'THANJAVUR': 'TANJORE',
      'MAYILADUTHURAI': 'M.THURAI',
      'NAGAPATTINAM': 'N.PTNM',
      'TIRUVARUR': 'T.VARUR',
      'PUDUKKOTTAI': 'PUDUKTI',
      'SIVAGANGA': 'SIVAG',
      'MADURAI': 'MADURAI',
      'DINDIGUL': 'DINDGL',
      'THENI': 'THENI',
      'RAMANATHAPURAM': 'RMNTHAM',
      'VIRUDHUNAGAR': 'V.NAGAR',
      'THOOTHUKUDI': 'TUTICOR',
      'TENKASI': 'TENKASI',
      'TIRUNELVELI': 'T.NELVLI',
      'KANNIYAKUMARI': 'K.KUMARI',
    };

    // Build district lookup
    const dMap = {};
    for (const d of districts) dMap[d.districtId] = d;

    const cellW = 72, cellH = 42, padX = 10, padY = 10, gapX = 3, gapY = 3;
    const cols = 8, rows = 10;
    const svgW = padX * 2 + cols * (cellW + gapX);
    const svgH = padY * 2 + rows * (cellH + gapY) + 30;

    let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" class="tn-map-svg">`;

    // Title
    svg += `<text x="${svgW / 2}" y="14" text-anchor="middle" fill="var(--text-bright)" font-size="11" font-weight="700" letter-spacing="1">TAMIL NADU — 38 DISTRICTS</text>`;

    // Zone labels
    const zoneColors = {
      NORTH: 'rgba(79, 140, 255, 0.4)',
      EAST: 'rgba(38, 198, 218, 0.4)',
      WEST: 'rgba(179, 136, 255, 0.4)',
      SOUTH: 'rgba(255, 183, 77, 0.4)',
    };

    // Render district cells
    for (const [name, pos] of Object.entries(districtPositions)) {
      const d = dMap[name];
      const x = padX + pos.col * (cellW + gapX);
      const y = padY + 20 + pos.row * (cellH + gapY);

      if (!d) {
        // District not yet in data (shouldn't happen now)
        svg += `
          <g>
            <rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="5"
                  fill="var(--bg-tertiary)" stroke="var(--border-default)" stroke-width="0.5" opacity="0.4"/>
            <text x="${x + cellW / 2}" y="${y + 18}" class="district-label" fill="var(--text-muted)" font-size="6.5" font-weight="600">${shortNames[name] || name.substring(0, 6)}</text>
            <text x="${x + cellW / 2}" y="${y + 30}" class="district-label" fill="var(--text-muted)" font-size="6">No data</text>
          </g>
        `;
        continue;
      }

      const health = d.avgHealthScore;
      let fillColor, borderColor;
      if (health < 35) {
        fillColor = 'rgba(255, 82, 82, 0.12)';
        borderColor = 'var(--accent-red)';
      } else if (health < 60) {
        fillColor = 'rgba(255, 152, 0, 0.12)';
        borderColor = '#ff9800';
      } else if (health < 80) {
        fillColor = 'rgba(255, 183, 77, 0.12)';
        borderColor = 'var(--accent-amber)';
      } else {
        fillColor = 'rgba(76, 175, 80, 0.12)';
        borderColor = 'var(--accent-green)';
      }

      const faultDot = d.faultCount > 0 ? `<circle cx="${x + cellW - 7}" cy="${y + 7}" r="3.5" fill="var(--accent-red)" opacity="0.9"/>
        <text x="${x + cellW - 7}" y="${y + 9.5}" class="district-label" fill="white" font-size="5" font-weight="700">${d.faultCount}</text>` : '';

      svg += `
        <g class="district-group" onclick="app.selectDistrict('${name}')" style="cursor:pointer">
          <rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="5"
                fill="${fillColor}" stroke="${borderColor}" stroke-width="1.2"/>
          ${faultDot}
          <text x="${x + cellW / 2}" y="${y + 14}" class="district-label" fill="var(--text-bright)" font-size="7" font-weight="700">${shortNames[name]}</text>
          <text x="${x + cellW / 2}" y="${y + 25}" class="district-label" fill="${borderColor}" font-size="7" font-weight="600">${health.toFixed(0)}%</text>
          <text x="${x + cellW / 2}" y="${y + 35}" class="district-label" fill="var(--text-muted)" font-size="6">${d.poleCount}P | ${d.totalLoad.toFixed(0)}kW</text>
        </g>
      `;
    }

    // Legend
    const ly = svgH - 18;
    svg += `
      <g>
        <rect x="${padX}" y="${ly}" width="8" height="8" rx="2" fill="rgba(76,175,80,0.12)" stroke="var(--accent-green)" stroke-width="0.5"/>
        <text x="${padX + 11}" y="${ly + 7}" font-size="7" fill="var(--text-muted)">Healthy</text>

        <rect x="${padX + 55}" y="${ly}" width="8" height="8" rx="2" fill="rgba(255,183,77,0.12)" stroke="var(--accent-amber)" stroke-width="0.5"/>
        <text x="${padX + 68}" y="${ly + 7}" font-size="7" fill="var(--text-muted)">Moderate</text>

        <rect x="${padX + 125}" y="${ly}" width="8" height="8" rx="2" fill="rgba(255,152,0,0.12)" stroke="#ff9800" stroke-width="0.5"/>
        <text x="${padX + 136}" y="${ly + 7}" font-size="7" fill="var(--text-muted)">High Risk</text>

        <rect x="${padX + 195}" y="${ly}" width="8" height="8" rx="2" fill="rgba(255,82,82,0.12)" stroke="var(--accent-red)" stroke-width="0.5"/>
        <text x="${padX + 206}" y="${ly + 7}" font-size="7" fill="var(--text-muted)">Critical</text>

        <circle cx="${padX + 265}" cy="${ly + 4}" r="3.5" fill="var(--accent-red)" opacity="0.9"/>
        <text x="${padX + 271}" y="${ly + 7}" font-size="7" fill="var(--text-muted)">Faults</text>
      </g>
    `;

    svg += '</svg>';
    container.innerHTML = svg;
  },

  renderDistrictTable(districts) {
    const tbody = document.getElementById('districtTableBody');

    if (!districts.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-muted" style="text-align:center;padding:30px;">No data yet</td></tr>';
      return;
    }

    // Sort by health score ascending (worst first)
    const sorted = [...districts].sort((a, b) => a.avgHealthScore - b.avgHealthScore);

    tbody.innerHTML = sorted.map(d => {
      const riskBadge = `<span class="badge ${d.riskLevel.toLowerCase()}">${d.riskLevel}</span>`;
      const healthColor = d.avgHealthScore >= 80 ? 'var(--accent-green)' :
        d.avgHealthScore >= 60 ? 'var(--accent-amber)' :
          d.avgHealthScore >= 35 ? '#ff9800' : 'var(--accent-red)';
      return `
        <tr onclick="app.selectDistrict('${d.districtId}')">
          <td class="district-name">${d.districtId}</td>
          <td>${d.poleCount}</td>
          <td>${d.activePoles}</td>
          <td style="color: ${d.faultCount > 0 ? 'var(--accent-red)' : 'var(--text-primary)'}">${d.faultCount}</td>
          <td style="color: ${healthColor}; font-weight: 700; font-family: var(--font-mono);">${d.avgHealthScore.toFixed(1)}%</td>
          <td class="text-mono">${d.totalLoad.toFixed(1)}</td>
          <td class="text-mono">${d.avgVoltage.toFixed(1)}V</td>
          <td>${riskBadge}</td>
        </tr>
      `;
    }).join('');
  },

  renderEventFeed(events) {
    const feed = document.getElementById('eventFeed');
    const countEl = document.getElementById('eventCount');

    countEl.textContent = `${events.length} events`;

    if (!events.length) {
      feed.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✓</div>
          <div>No fault events — Grid is healthy</div>
        </div>
      `;
      return;
    }

    feed.innerHTML = events.slice(0, 20).map(e => {
      const iconClass = e.severity === 'CRITICAL' ? 'critical' : e.severity === 'FAULT' ? 'fault' : 'warning';
      const icon = e.severity === 'CRITICAL' ? '🔴' : e.severity === 'FAULT' ? '🟠' : '🟡';
      const time = new Date(e.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      return `
        <div class="event-item">
          <div class="event-icon ${iconClass}">${icon}</div>
          <div class="event-body">
            <div class="event-msg">${e.message}</div>
            <div class="event-meta">
              <span>${e.poleId}</span>
              <span>${e.districtId}</span>
              <span>${time}</span>
            </div>
          </div>
          <span class="badge ${iconClass}" style="align-self: center;">${e.severity}</span>
        </div>
      `;
    }).join('');
  },

  updateHealthBadge(stats) {
    const badge = document.getElementById('stateHealthBadge');
    if (stats.avgHealthScore >= 80) {
      badge.className = 'badge normal';
      badge.textContent = 'Healthy';
    } else if (stats.avgHealthScore >= 60) {
      badge.className = 'badge warning';
      badge.textContent = 'Moderate';
    } else if (stats.avgHealthScore >= 35) {
      badge.className = 'badge high';
      badge.textContent = 'At Risk';
    } else {
      badge.className = 'badge critical';
      badge.textContent = 'Critical';
    }
  },

  handleUpdate(data) {
    fetch('/api/stats')
      .then(r => r.json())
      .then(stats => this.renderKPIs(stats))
      .catch(() => { });
  },
};
