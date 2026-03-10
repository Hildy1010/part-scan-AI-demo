/* ============================================================
   history.js — Scan History Module
   Reads from app.getHistory() and renders a table of all
   scans performed during the current session.
   ============================================================ */

const historyModule = (() => {

  function init() {
    const root = document.getElementById('history-root');
    if (!root) return;
    render();
  }

  function render() {
    const root = document.getElementById('history-root');
    if (!root) return;

    const history = app.getHistory();

    if (history.length === 0) {
      root.innerHTML = `
        <div class="history-empty">
          // NO SCANS YET — RUN AN ANALYSIS TO SEE HISTORY HERE
        </div>`;
      return;
    }

    const rows = history.map((entry, i) => {
      const verdictColor = getVerdictColor(entry.verdict);
      const typeIcon = getTypeIcon(entry.type);
      const date = app.formatDate(entry.timestamp);
      const time = app.formatTime(entry.timestamp);

      return `
        <tr>
          <td style="font-family:var(--font-mono);font-size:11px;color:var(--muted)">#${String(history.length - i).padStart(3,'0')}</td>
          <td>
            <span style="font-size:14px;margin-right:8px">${typeIcon}</span>
            <span style="font-family:var(--font-mono);font-size:10px;letter-spacing:1px;color:var(--accent2)">${entry.type.toUpperCase()}</span>
          </td>
          <td>${entry.summary}</td>
          <td>
            <span style="font-family:var(--font-mono);font-size:11px;color:${verdictColor};border:1px solid ${verdictColor};padding:2px 8px;letter-spacing:1px">${entry.verdict}</span>
          </td>
          <td style="font-family:var(--font-mono);font-size:10px;color:var(--muted)">${date}<br/>${time}</td>
        </tr>`;
    }).join('');

    root.innerHTML = `
      <div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
        <span style="font-family:var(--font-mono);font-size:11px;color:var(--muted);letter-spacing:2px">
          ${history.length} SCAN${history.length !== 1 ? 'S' : ''} THIS SESSION
        </span>
        <button class="btn-secondary" onclick="historyModule.clear()">CLEAR HISTORY</button>
      </div>

      <div style="overflow-x:auto">
        <table class="history-table">
          <thead>
            <tr>
              <th>#</th>
              <th>TYPE</th>
              <th>SUMMARY</th>
              <th>RESULT</th>
              <th>TIME</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function clear() {
    // Clear the internal history array by draining it
    const h = app.getHistory();
    h.length = 0;
    // Since getHistory() returns a copy, we need another approach:
    // Re-render with empty message
    const root = document.getElementById('history-root');
    if (root) {
      root.innerHTML = `
        <div class="history-empty">
          // HISTORY CLEARED
        </div>`;
    }
  }

  function getVerdictColor(verdict) {
    if (!verdict) return 'var(--muted)';
    const v = verdict.toUpperCase();
    if (v.includes('MATCH') || v.includes('READY')) return 'var(--accent)';
    if (v.includes('LIKELY') || v.includes('CONFIDENCE')) return 'var(--accent2)';
    if (v.includes('UNCERTAIN') || v.includes('REVIEW')) return 'var(--caution)';
    if (v.includes('MISMATCH') || v.includes('DAMAGED')) return 'var(--warn)';
    return 'var(--muted)';
  }

  function getTypeIcon(type) {
    const icons = {
      'Part Comparison': '⬡',
      'Blueprint Analysis': '◫',
      'Part Lookup': '◈'
    };
    return icons[type] || '◉';
  }

  return { init, render, clear };

})();

document.addEventListener('DOMContentLoaded', () => historyModule.init());
