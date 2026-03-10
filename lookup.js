/* ============================================================
   lookup.js — Part Number Lookup Module
   Handles: single part photo upload, AI identification,
   returns part number guess, specs, and confidence.
   ============================================================ */

const lookupModule = (() => {

  let _dataUrl = null;

  // ── Init ──────────────────────────────────────────────────
  function init() {
    const root = document.getElementById('lookup-root');
    if (!root) return;

    root.innerHTML = `
      <div class="info-card">
        <div class="info-card-title">// HOW IT WORKS</div>
        <div class="info-card-text">
          Photograph or upload an unknown part. The AI will analyze its shape,
          features, and markings to suggest a part number, category, and specifications.
          Best results come from clear, well-lit photos.
        </div>
      </div>

      <div class="single-upload" id="lk-panel" onclick="document.getElementById('lk-input').click()">
        <div class="panel-label"><span class="panel-dot"></span>UNKNOWN PART PHOTO</div>
        <div class="upload-inner" id="lk-inner">
          <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.2" style="width:40px;height:40px">
            <circle cx="12" cy="12" r="4"/>
            <path d="M2 12C2 12 5 5 12 5s10 7 10 7-3 7-10 7S2 12 2 12z"/>
          </svg>
          <div class="upload-hint">Upload or photograph a part to identify it</div>
        </div>
        <button class="clear-btn" onclick="lookupModule.clear(event)">✕ CLEAR</button>
        <input type="file" id="lk-input" class="upload-input" accept="image/*"
          onchange="lookupModule.handleFile(event)"/>
      </div>

      <button class="btn-primary" id="lk-analyze-btn" onclick="lookupModule.run()" disabled>
        <span>◈ &nbsp; IDENTIFY PART</span>
      </button>

      <div class="error-box" id="lk-error"></div>

      <div class="loading-bar" id="lk-loading">
        <div class="spinner"></div>
        <span id="lk-loading-msg">SCANNING PART...</span>
      </div>

      <div class="results-panel" id="lk-results">
        ${app.resultsHeader('PART IDENTIFIED')}
        <div class="results-body" id="lk-results-body"></div>
      </div>
    `;
  }

  // ── File Handling ─────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    _dataUrl = await app.readFile(file);

    const panel = document.getElementById('lk-panel');
    const inner = document.getElementById('lk-inner');
    panel.classList.add('has-image');

    const old = inner.querySelector('.preview-img');
    if (old) old.remove();
    const img = document.createElement('img');
    img.className = 'preview-img';
    img.src = _dataUrl;
    inner.appendChild(img);

    document.getElementById('lk-analyze-btn').disabled = false;
  }

  function clear(e) {
    e.stopPropagation();
    _dataUrl = null;
    document.getElementById('lk-panel').classList.remove('has-image');
    const inner = document.getElementById('lk-inner');
    const old = inner.querySelector('.preview-img');
    if (old) old.remove();
    document.getElementById('lk-input').value = '';
    document.getElementById('lk-analyze-btn').disabled = true;
    document.getElementById('lk-results').classList.remove('visible');
  }

  // ── Run Analysis ──────────────────────────────────────────
  async function run() {
    const btn     = document.getElementById('lk-analyze-btn');
    const loading = document.getElementById('lk-loading');
    const msgEl   = document.getElementById('lk-loading-msg');
    const errorEl = document.getElementById('lk-error');
    const results = document.getElementById('lk-results');

    btn.disabled = true;
    errorEl.classList.remove('visible');
    results.classList.remove('visible');
    loading.classList.add('visible');

    const msgs = ['SCANNING PART...', 'ANALYZING GEOMETRY...', 'CROSS-REFERENCING DATABASE...', 'ESTIMATING PART NUMBER...', 'COMPILING SPECS...'];
    let idx = 0;
    msgEl.textContent = msgs[0];
    const cycle = setInterval(() => { idx = (idx+1) % msgs.length; msgEl.textContent = msgs[idx]; }, 1800);

    try {
      const prompt = `You are an expert industrial parts identifier for a manufacturing company.
Analyze this part photo and return ONLY a valid JSON object:
{
  "partName": "<name of the part>",
  "partCategory": "<category: fastener, bearing, bracket, housing, gear, shaft, etc.>",
  "suggestedPartNumber": "<a realistic part number format e.g. BRG-6204-2RS or HEX-M8-SS>",
  "confidence": <0-100 confidence in identification>,
  "material": "<inferred material>",
  "estimatedDimensions": "<rough size estimate if determinable>",
  "commonUses": ["<use 1>", "<use 2>"],
  "visibleMarkings": "<any text, stamps, or engravings visible>",
  "condition": "<New | Good | Worn | Damaged>",
  "notes": "<any additional identification notes>",
  "alternateNames": ["<alias 1>", "<alias 2>"]
}`;

      const raw = await app.callClaude({
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: app.toMime(_dataUrl), data: app.toBase64(_dataUrl) } },
            { type: 'text', text: prompt }
          ]
        }],
        maxTokens: 1000
      });

      const d = app.parseJSON(raw);
      renderResults(d);

      app.addToHistory({
        type: 'Part Lookup',
        timestamp: new Date(),
        summary: `${d.partName} — ${d.suggestedPartNumber}`,
        verdict: `${d.confidence}% confidence`,
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
    const body    = document.getElementById('lk-results-body');
    const results = document.getElementById('lk-results');
    const confColor = d.confidence >= 75 ? 'var(--accent)' : d.confidence >= 50 ? 'var(--caution)' : 'var(--warn)';

    const usesHtml = (d.commonUses || []).map(u => `<span class="tag-item info">${u}</span>`).join('');
    const altHtml  = (d.alternateNames || []).map(a => `<span class="tag-item">${a}</span>`).join('');

    body.innerHTML = `
      <div class="match-score-row">
        <span class="score-label">ID CONFIDENCE</span>
        <div class="score-bar-wrap">
          <div class="score-bar-fill" id="scoreBarFill" style="width:0%"></div>
        </div>
        <span class="score-pct" style="color:${confColor}">${d.confidence}%</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:22px">
        <div class="result-section" style="margin-bottom:0">
          <div class="result-section-title">PART NAME</div>
          <div class="result-text">${d.partName}</div>
        </div>
        <div class="result-section" style="margin-bottom:0">
          <div class="result-section-title">CATEGORY</div>
          <div class="result-text">${d.partCategory}</div>
        </div>
      </div>

      <div class="result-section">
        <div class="result-section-title">SUGGESTED PART NUMBER</div>
        <div style="font-family:var(--font-mono);font-size:20px;color:var(--accent);letter-spacing:3px;margin-top:4px">${d.suggestedPartNumber}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:22px">
        <div class="result-section" style="margin-bottom:0">
          <div class="result-section-title">MATERIAL</div>
          <div class="result-text">${d.material || '—'}</div>
        </div>
        <div class="result-section" style="margin-bottom:0">
          <div class="result-section-title">DIMENSIONS</div>
          <div class="result-text">${d.estimatedDimensions || '—'}</div>
        </div>
        <div class="result-section" style="margin-bottom:0">
          <div class="result-section-title">CONDITION</div>
          <div class="result-text">${d.condition || '—'}</div>
        </div>
      </div>

      ${d.visibleMarkings ? `
      <div class="result-section">
        <div class="result-section-title">VISIBLE MARKINGS</div>
        <div class="result-text">${d.visibleMarkings}</div>
      </div>` : ''}

      <div class="result-section">
        <div class="result-section-title">COMMON USES</div>
        <div class="tag-list">${usesHtml || '<span class="tag-item">—</span>'}</div>
      </div>

      ${altHtml ? `
      <div class="result-section">
        <div class="result-section-title">ALSO KNOWN AS</div>
        <div class="tag-list">${altHtml}</div>
      </div>` : ''}

      ${d.notes ? `
      <div class="verdict-box">
        <div class="verdict-icon">ℹ</div>
        <div>
          <div class="verdict-title">IDENTIFICATION NOTES</div>
          <div class="verdict-text">${d.notes}</div>
        </div>
      </div>` : ''}
    `;

    results.classList.add('visible');
    app.animateScoreBar(d.confidence);
  }

  return { init, handleFile, clear, run };

})();

document.addEventListener('DOMContentLoaded', () => lookupModule.init());
