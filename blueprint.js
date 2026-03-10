/* ============================================================
   blueprint.js — Blueprint Analysis Module
   Handles: PDF or image blueprint upload, AI analysis,
   renders findings, dimensions, material notes, suggestions.
   ============================================================ */

const blueprintModule = (() => {

  let _file = null;      // Raw File object
  let _dataUrl = null;   // Base64 dataURL

  // ── Init ──────────────────────────────────────────────────
  function init() {
    const root = document.getElementById('blueprint-root');
    if (!root) return;

    root.innerHTML = `
      <div class="info-card">
        <div class="info-card-title">// HOW IT WORKS</div>
        <div class="info-card-text">
          Upload a blueprint image (JPG, PNG) or PDF drawing.
          The AI will extract key specifications, identify part type,
          flag potential improvements, and note any concerns.
        </div>
      </div>

      <div class="single-upload" id="bp-panel" onclick="document.getElementById('bp-input').click()">
        <div class="panel-label"><span class="panel-dot"></span>BLUEPRINT / TECHNICAL DRAWING</div>
        <div class="upload-inner" id="bp-inner">
          <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.2" style="width:40px;height:40px">
            <rect x="2" y="3" width="20" height="18" rx="1"/>
            <path d="M7 8h10M7 12h10M7 16h6"/>
          </svg>
          <div class="upload-hint">Upload blueprint image or PDF</div>
        </div>
        <button class="clear-btn" onclick="blueprintModule.clear(event)">✕ CLEAR</button>
        <input type="file" id="bp-input" class="upload-input" accept="image/*,application/pdf"
          onchange="blueprintModule.handleFile(event)"/>
      </div>

      <button class="btn-primary" id="bp-analyze-btn" onclick="blueprintModule.run()" disabled>
        <span>◫ &nbsp; ANALYZE BLUEPRINT</span>
      </button>

      <div class="error-box" id="bp-error"></div>

      <div class="loading-bar" id="bp-loading">
        <div class="spinner"></div>
        <span id="bp-loading-msg">READING BLUEPRINT...</span>
      </div>

      <div class="results-panel" id="bp-results">
        ${app.resultsHeader('BLUEPRINT ANALYSIS COMPLETE')}
        <div class="results-body" id="bp-results-body"></div>
      </div>
    `;
  }

  // ── File Handling ─────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    _file = file;
    _dataUrl = await app.readFile(file);

    const panel = document.getElementById('bp-panel');
    const inner = document.getElementById('bp-inner');
    panel.classList.add('has-image');

    const old = inner.querySelector('.preview-img, .file-badge');
    if (old) old.remove();

    if (file.type === 'application/pdf') {
      // Show PDF badge instead of image preview
      const badge = document.createElement('div');
      badge.className = 'file-badge';
      badge.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;';
      badge.innerHTML = `
        <span style="font-size:36px;opacity:0.6">📄</span>
        <span style="font-family:var(--font-mono);font-size:12px;color:var(--accent);letter-spacing:2px">${file.name}</span>
        <span style="font-family:var(--font-mono);font-size:10px;color:var(--muted)">${(file.size / 1024).toFixed(1)} KB</span>
      `;
      inner.appendChild(badge);
    } else {
      const img = document.createElement('img');
      img.className = 'preview-img';
      img.src = _dataUrl;
      inner.appendChild(img);
    }

    document.getElementById('bp-analyze-btn').disabled = false;
  }

  function clear(e) {
    e.stopPropagation();
    _file = null;
    _dataUrl = null;
    const panel = document.getElementById('bp-panel');
    const inner = document.getElementById('bp-inner');
    panel.classList.remove('has-image');
    const old = inner.querySelector('.preview-img, .file-badge');
    if (old) old.remove();
    document.getElementById('bp-input').value = '';
    document.getElementById('bp-analyze-btn').disabled = true;
    document.getElementById('bp-results').classList.remove('visible');
  }

  // ── Run Analysis ──────────────────────────────────────────
  async function run() {
    const btn     = document.getElementById('bp-analyze-btn');
    const loading = document.getElementById('bp-loading');
    const msgEl   = document.getElementById('bp-loading-msg');
    const errorEl = document.getElementById('bp-error');
    const results = document.getElementById('bp-results');

    btn.disabled = true;
    errorEl.classList.remove('visible');
    results.classList.remove('visible');
    loading.classList.add('visible');

    const msgs = ['READING BLUEPRINT...', 'EXTRACTING SPECIFICATIONS...', 'ANALYZING GEOMETRY...', 'IDENTIFYING IMPROVEMENTS...', 'COMPILING REPORT...'];
    let idx = 0;
    msgEl.textContent = msgs[0];
    const cycle = setInterval(() => { idx = (idx+1) % msgs.length; msgEl.textContent = msgs[idx]; }, 1800);

    try {
      const isPdf = _file.type === 'application/pdf';
      const contentBlock = isPdf
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: app.toBase64(_dataUrl) } }
        : { type: 'image', source: { type: 'base64', media_type: app.toMime(_dataUrl), data: app.toBase64(_dataUrl) } };

      const prompt = `You are a senior manufacturing engineer analyzing a technical blueprint or drawing.
Carefully examine the document and return ONLY a valid JSON object:
{
  "partName": "<identified part name or description>",
  "partCategory": "<category e.g. structural, fastener, housing, bracket, etc.>",
  "keyDimensions": ["<dim 1>", "<dim 2>", ...],
  "material": "<inferred or stated material if visible>",
  "tolerance": "<tolerance notes if visible, or 'Not specified'>",
  "manufacturingMethod": "<likely manufacturing method e.g. CNC, casting, stamping>",
  "improvements": ["<suggested improvement 1>", "<suggested improvement 2>"],
  "concerns": ["<concern 1>", ...],
  "overallAssessment": "<2-3 sentence summary of the blueprint quality and part feasibility>",
  "readyToFabricate": <true|false>
}`;

      const raw = await app.callClaude({
        messages: [{
          role: 'user',
          content: [contentBlock, { type: 'text', text: prompt }]
        }],
        maxTokens: 1200
      });

      const d = app.parseJSON(raw);
      renderResults(d);

      app.addToHistory({
        type: 'Blueprint Analysis',
        timestamp: new Date(),
        summary: `${d.partName} — ${d.readyToFabricate ? 'READY' : 'NEEDS REVIEW'}`,
        verdict: d.readyToFabricate ? 'READY' : 'REVIEW',
        data: d
      });

    } catch (err) {
      errorEl.textContent = 'ERROR: ' + err.message;
      errorEl.classList.add('visible');
      btn.disabled = false;
    }

    clearInterval(cycle);
    loading.classList.remove('visible');
    btn.disabled = false;
  }

  // ── Render Results ────────────────────────────────────────
  function renderResults(d) {
    const body    = document.getElementById('bp-results-body');
    const results = document.getElementById('bp-results');
    const ready   = d.readyToFabricate;

    const dimsHtml = (d.keyDimensions || []).map(dim => `<span class="tag-item info">${dim}</span>`).join('');
    const improvHtml = (d.improvements || []).map(i => `<li style="margin-bottom:6px;font-size:13px;color:var(--text);font-weight:300">${i}</li>`).join('');
    const concernHtml = (d.concerns || []).map(c => `<li style="margin-bottom:6px;font-size:13px;color:var(--warn);font-weight:300">${c}</li>`).join('');

    body.innerHTML = `
      <div class="result-section">
        <div class="result-section-title">PART IDENTIFIED</div>
        <div class="result-text">${d.partName} <span style="color:var(--muted);font-size:12px">// ${d.partCategory}</span></div>
      </div>

      <div class="result-section">
        <div class="result-section-title">KEY DIMENSIONS</div>
        <div class="tag-list">${dimsHtml || '<span class="tag-item">Not detected</span>'}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px">
        <div class="result-section" style="margin-bottom:0">
          <div class="result-section-title">MATERIAL</div>
          <div class="result-text">${d.material || '—'}</div>
        </div>
        <div class="result-section" style="margin-bottom:0">
          <div class="result-section-title">MFG METHOD</div>
          <div class="result-text">${d.manufacturingMethod || '—'}</div>
        </div>
      </div>

      <div class="result-section">
        <div class="result-section-title">TOLERANCE</div>
        <div class="result-text">${d.tolerance || 'Not specified'}</div>
      </div>

      ${improvHtml ? `
      <div class="result-section">
        <div class="result-section-title">SUGGESTED IMPROVEMENTS</div>
        <ul style="padding-left:16px;margin-top:6px">${improvHtml}</ul>
      </div>` : ''}

      ${concernHtml ? `
      <div class="result-section">
        <div class="result-section-title">CONCERNS FLAGGED</div>
        <ul style="padding-left:16px;margin-top:6px">${concernHtml}</ul>
      </div>` : ''}

      <div class="verdict-box ${ready ? '' : 'caution'}">
        <div class="verdict-icon">${ready ? '✓' : '⚠'}</div>
        <div>
          <div class="verdict-title">${ready ? 'READY TO FABRICATE' : 'REVIEW REQUIRED'}</div>
          <div class="verdict-text">${d.overallAssessment}</div>
        </div>
      </div>
    `;

    results.classList.add('visible');
  }

  return { init, handleFile, clear, run };

})();

document.addEventListener('DOMContentLoaded', () => blueprintModule.init());
