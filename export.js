/* ============================================================
   export.js — Export Report Module
   Generates a formatted HTML report of all session scans
   and triggers a browser download.
   ============================================================ */

const exportModule = (() => {

  function init() {
    const root = document.getElementById('export-root');
    if (!root) return;
    render();
  }

  function render() {
    const root = document.getElementById('export-root');
    if (!root) return;

    const history = app.getHistory();

    root.innerHTML = `
      <div class="info-card">
        <div class="info-card-title">// EXPORT SESSION REPORT</div>
        <div class="info-card-text">
          Download a complete HTML report of all scans from this session.
          The report includes all findings, verdicts, and recommendations
          in a clean, printable format.
        </div>
      </div>

      ${history.length === 0 ? `
        <div class="history-empty">// NO SCANS TO EXPORT — RUN SOME ANALYSES FIRST</div>
      ` : `
        <div style="background:var(--panel);border:1px solid var(--border);padding:20px 24px;margin-bottom:24px">
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--muted);letter-spacing:2px;margin-bottom:16px">// REPORT PREVIEW</div>
          ${history.map(entry => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="font-family:var(--font-mono);font-size:10px;color:var(--muted)">${getTypeIcon(entry.type)}</span>
              <span style="font-family:var(--font-mono);font-size:10px;color:var(--accent2);letter-spacing:1px">${entry.type.toUpperCase()}</span>
              <span style="font-size:13px;color:var(--text);flex:1">${entry.summary}</span>
              <span style="font-family:var(--font-mono);font-size:10px;color:var(--muted)">${app.formatTime(entry.timestamp)}</span>
            </div>
          `).join('')}
          <div style="margin-top:14px;font-family:var(--font-mono);font-size:11px;color:var(--muted)">
            ${history.length} SCAN${history.length !== 1 ? 'S' : ''} TOTAL
          </div>
        </div>

        <button class="btn-primary" onclick="exportModule.download()">
          <span>↗ &nbsp; DOWNLOAD REPORT (HTML)</span>
        </button>
      `}
    `;
  }

  function download() {
    const history = app.getHistory();
    if (history.length === 0) return;

    const reportHtml = buildReport(history);
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `partscan-report-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildReport(history) {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const sections = history.map((entry, i) => {
      const d = entry.data || {};
      const num = history.length - i;

      let details = '';

      if (entry.type === 'Part Comparison') {
        details = `
          <p><strong>Part Type:</strong> ${d.partType || '—'}</p>
          <p><strong>Match Score:</strong> ${d.matchScore}%</p>
          <p><strong>Verdict:</strong> ${d.verdict}</p>
          <p><strong>Similarities:</strong> ${(d.similarities || []).join(', ') || '—'}</p>
          <p><strong>Differences:</strong> ${(d.differences || []).join(', ') || 'None'}</p>
          ${d.condition_notes ? `<p><strong>Condition:</strong> ${d.condition_notes}</p>` : ''}
          <p><strong>Recommendation:</strong> ${d.recommendation || '—'}</p>`;
      } else if (entry.type === 'Blueprint Analysis') {
        details = `
          <p><strong>Part Name:</strong> ${d.partName || '—'}</p>
          <p><strong>Category:</strong> ${d.partCategory || '—'}</p>
          <p><strong>Material:</strong> ${d.material || '—'}</p>
          <p><strong>Manufacturing Method:</strong> ${d.manufacturingMethod || '—'}</p>
          <p><strong>Tolerance:</strong> ${d.tolerance || '—'}</p>
          <p><strong>Key Dimensions:</strong> ${(d.keyDimensions || []).join(', ') || '—'}</p>
          <p><strong>Improvements:</strong> ${(d.improvements || []).join('; ') || 'None'}</p>
          <p><strong>Concerns:</strong> ${(d.concerns || []).join('; ') || 'None'}</p>
          <p><strong>Assessment:</strong> ${d.overallAssessment || '—'}</p>
          <p><strong>Ready to Fabricate:</strong> ${d.readyToFabricate ? 'Yes' : 'No — Review Required'}</p>`;
      } else if (entry.type === 'Part Lookup') {
        details = `
          <p><strong>Part Name:</strong> ${d.partName || '—'}</p>
          <p><strong>Category:</strong> ${d.partCategory || '—'}</p>
          <p><strong>Suggested Part Number:</strong> <strong style="font-size:16px">${d.suggestedPartNumber || '—'}</strong></p>
          <p><strong>Confidence:</strong> ${d.confidence}%</p>
          <p><strong>Material:</strong> ${d.material || '—'}</p>
          <p><strong>Estimated Dimensions:</strong> ${d.estimatedDimensions || '—'}</p>
          <p><strong>Condition:</strong> ${d.condition || '—'}</p>
          ${d.visibleMarkings ? `<p><strong>Visible Markings:</strong> ${d.visibleMarkings}</p>` : ''}
          <p><strong>Common Uses:</strong> ${(d.commonUses || []).join(', ') || '—'}</p>
          ${d.notes ? `<p><strong>Notes:</strong> ${d.notes}</p>` : ''}`;
      }

      return `
        <div class="scan-entry">
          <div class="scan-header">
            <span class="scan-num">#${String(num).padStart(3,'0')}</span>
            <span class="scan-type">${entry.type.toUpperCase()}</span>
            <span class="scan-summary">${entry.summary}</span>
            <span class="scan-time">${app.formatTime(entry.timestamp)}</span>
          </div>
          <div class="scan-body">${details}</div>
        </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>PartScan Report — ${date}</title>
<style>
  body { font-family: 'Barlow', sans-serif; background: #0d0f0f; color: #d4dbd8; margin: 0; padding: 40px; }
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow:wght@300;400;600&display=swap');
  h1 { font-family: 'Share Tech Mono', monospace; color: #00e5a0; letter-spacing: 3px; font-size: 24px; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #5a6663; letter-spacing: 2px; margin-bottom: 40px; }
  .scan-entry { background: #141717; border: 1px solid #2a2f2f; margin-bottom: 20px; }
  .scan-header { background: rgba(0,229,160,0.06); border-bottom: 1px solid #2a2f2f; padding: 12px 20px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .scan-num { font-family: 'Share Tech Mono', monospace; font-size: 11px; color: #5a6663; }
  .scan-type { font-family: 'Share Tech Mono', monospace; font-size: 10px; color: #00b3ff; letter-spacing: 2px; border: 1px solid #00b3ff; padding: 2px 8px; }
  .scan-summary { flex: 1; font-size: 14px; color: #d4dbd8; }
  .scan-time { font-family: 'Share Tech Mono', monospace; font-size: 10px; color: #5a6663; }
  .scan-body { padding: 20px 24px; }
  .scan-body p { margin-bottom: 8px; font-size: 13px; line-height: 1.7; font-weight: 300; }
  .scan-body strong { color: #00e5a0; font-weight: 600; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #2a2f2f; font-family: 'Share Tech Mono', monospace; font-size: 10px; color: #5a6663; letter-spacing: 2px; }
</style>
</head>
<body>
  <h1>PART<span style="color:#fff">SCAN</span> — SESSION REPORT</h1>
  <div class="subtitle">GENERATED: ${date.toUpperCase()} &nbsp;|&nbsp; ${history.length} SCAN${history.length !== 1 ? 'S' : ''}</div>
  ${sections}
  <div class="footer">PARTSCAN AI MANUFACTURING INTELLIGENCE &nbsp;|&nbsp; REPORT END</div>
</body>
</html>`;
  }

  function getTypeIcon(type) {
    const icons = { 'Part Comparison': '⬡', 'Blueprint Analysis': '◫', 'Part Lookup': '◈' };
    return icons[type] || '◉';
  }

  return { init, render, download };

})();

document.addEventListener('DOMContentLoaded', () => exportModule.init());
