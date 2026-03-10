/* ============================================================
   compare.js — Part Comparison Module
   Handles: two-image upload, sends both to Claude vision,
   renders similarity score, features, verdict.
   ============================================================ */

const compareModule = (() => {

  // ── Local State ───────────────────────────────────────────
  const images = { a: null, b: null };

  // ── Init: Render UI into #compare-root ───────────────────
  function init() {
    const root = document.getElementById('compare-root');
    if (!root) return;

    root.innerHTML = `
      <div class="upload-wrapper" style="position:relative">
        <div class="upload-grid">

          <div class="upload-panel" id="cp-panel-a" onclick="document.getElementById('cp-input-a').click()">
            <div class="panel-label"><span class="panel-dot"></span>REF PART — KNOWN</div>
            <div class="upload-inner" id="cp-inner-a">
              ${uploadIcon()}
              <div class="upload-hint">Upload reference part photo</div>
            </div>
            <button class="clear-btn" onclick="compareModule.clearSlot(event,'a')">✕ CLEAR</button>
            <input type="file" id="cp-input-a" class="upload-input" accept="image/*"
              onchange="compareModule.handleFile(event,'a')"/>
          </div>

          <div class="upload-panel" id="cp-panel-b" onclick="document.getElementById('cp-input-b').click()">
            <div class="panel-label"><span class="panel-dot"></span>NEW PART — UNKNOWN</div>
            <div class="upload-inner" id="cp-inner-b">
              ${uploadIcon()}
              <div class="upload-hint">Upload part to identify</div>
            </div>
            <button class="clear-btn" onclick="compareModule.clearSlot(event,'b')">✕ CLEAR</button>
            <input type="file" id="cp-input-b" class="upload-input" accept="image/*"
              onchange="compareModule.handleFile(event,'b')"/>
          </div>

        </div>
        <div class="vs-badge">VS</div>
      </div>

      <button class="btn-primary" id="cp-analyze-btn" onclick="compareModule.run()" disabled>
        <span>⬡ &nbsp; RUN COMPARISON ANALYSIS</span>
      </button>

      <div class="error-box" id="cp-error"></div>

      <div class="loading-bar" id="cp-loading">
        <div class="spinner"></div>
        <span id="cp-loading-msg">INITIALIZING...</span>
      </div>

      <div class="results-panel" id="cp-results">
        ${app.resultsHeader('COMPARISON COMPLETE')}
        <div class="results-body" id="cp-results-body"></div>
      </div>
    `;
  }

  // ── File Handling ─────────────────────────────────────────
  async function handleFile(e, slot) {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await app.readFile(file);
    images[slot] = dataUrl;

    const panel = document.getElementById('cp-panel-' + slot);
    const inner = document.getElementById('cp-inner-' + slot);
    panel.classList.add('has-image');

    const old = inner.querySelector('.preview-img');
    if (old) old.remove();

    const img = document.createElement('img');
    img.className = 'preview-img';
    img.src = dataUrl;
    inner.appendChild(img);

    checkReady();
  }

  function clearSlot(e, slot) {
    e.stopPropagation();
    images[slot] = null;
    const panel = document.getElementById('cp-panel-' + slot);
    const inner = document.getElementById('cp-inner-' + slot);
    panel.classList.remove('has-image');
    const img = inner.querySelector('.preview-img');
    if (img) img.remove();
    document.getElementById('cp-input-' + slot).value = '';
    checkReady();
  }

  function checkReady() {
    const btn = document.getElementById('cp-analyze-btn');
    if (btn) btn.disabled = !(images.a && images.b);
  }

  // ── Run Analysis ──────────────────────────────────────────
  async function run() {
    const btn      = document.getElementById('cp-analyze-btn');
    const loading  = document.getElementById('cp-loading');
    const msgEl    = document.getElementById('cp-loading-msg');
    const errorEl  = document.getElementById('cp-error');
    const results  = document.getElementById('cp-results');

    btn.disabled = true;
    errorEl.classList.remove('visible');
    results.classList.remove('visible');
    loading.classList.add('visible');

    const cycle = app.startLoadingCycle(msgEl);

    try {
      const prompt = `You are an expert industrial parts analyst. Compare the two part images provided.
IMAGE 1 = Reference part (known, on file).
IMAGE 2 = New part (being identified).

Return ONLY a valid JSON object, no extra text:
{
  "matchScore": <0-100>,
  "partType": "<type of part>",
  "similarities": ["<feature>", ...],
  "differences": ["<difference>", ...],
  "likely_same_part": <true|false>,
  "condition_notes": "<visible condition or quality notes>",
  "recommendation": "<one clear action sentence>",
  "verdict": "<MATCH|LIKELY MATCH|UNCERTAIN|MISMATCH>"
}`;

      const raw = await app.callClaude({
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: app.toMime(images.a), data: app.toBase64(images.a) } },
            { type: 'image', source: { type: 'base64', media_type: app.toMime(images.b), data: app.toBase64(images.b) } },
            { type: 'text', text: prompt }
          ]
        }]
      });

      const d = app.parseJSON(raw);
      renderResults(d);

      // Save to history
      app.addToHistory({
        type: 'Part Comparison',
        timestamp: new Date(),
        summary: `${d.partType} — ${d.verdict}`,
        verdict: d.verdict,
        score: d.matchScore,
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
    const body    = document.getElementById('cp-results-body');
    const results = document.getElementById('cp-results');
    const color   = app.verdictColor(d.verdict);
    const isWarn  = d.verdict === 'MISMATCH';
    const isCaution = d.verdict === 'UNCERTAIN';

    const simsHtml = (d.similarities || []).map(s => `<span class="tag-item match">${s}</span>`).join('');
    const diffsHtml = (d.differences || []).map(s => `<span class="tag-item diff">${s}</span>`).join('');

    body.innerHTML = `
      ${app.scoreRow(d.matchScore, color)}

      <div class="result-section">
        <div class="result-section-title">PART TYPE</div>
        <div class="result-text">${d.partType || '—'}</div>
      </div>

      <div class="result-section">
        <div class="result-section-title">MATCHING FEATURES</div>
        <div class="tag-list">${simsHtml || '<span class="tag-item">None identified</span>'}</div>
      </div>

      <div class="result-section">
        <div class="result-section-title">DIFFERENCES DETECTED</div>
        <div class="tag-list">${diffsHtml || '<span class="tag-item match">No differences detected</span>'}</div>
      </div>

      ${d.condition_notes ? `
      <div class="result-section">
        <div class="result-section-title">CONDITION NOTES</div>
        <div class="result-text">${d.condition_notes}</div>
      </div>` : ''}

      <div class="verdict-box ${isWarn ? 'warn' : isCaution ? 'caution' : ''}">
        <div class="verdict-icon">${isWarn ? '⚠' : isCaution ? '?' : '✓'}</div>
        <div>
          <div class="verdict-title">${d.verdict}</div>
          <div class="verdict-text">${d.recommendation}</div>
        </div>
      </div>
    `;

    results.classList.add('visible');
    app.animateScoreBar(d.matchScore);
  }

  // ── Helpers ───────────────────────────────────────────────
  function uploadIcon() {
    return `<svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.2">
      <rect x="3" y="3" width="18" height="18" rx="1"/>
      <path d="M3 9h18M9 21V9"/>
    </svg>`;
  }

  // ── Public ────────────────────────────────────────────────
  return { init, handleFile, clearSlot, run };

})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => compareModule.init());
