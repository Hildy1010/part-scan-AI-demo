/* ============================================================
   app.js — Core Application Controller
   Handles: navigation, API key state, shared utilities,
   and the global scan history store.
   ============================================================ */

const app = (() => {

  // ── State ──────────────────────────────────────────────────
  let _apiKey = '';
  let _currentPage = 'compare';

  // Scan history lives here — all modules push into this array
  const _history = [];

  // Loading message cycles used across modules
  const LOADING_MSGS = [
    'INITIALIZING VISION ANALYSIS...',
    'PROCESSING IMAGE DATA...',
    'RUNNING AI COMPARISON...',
    'SCORING SIMILARITY...',
    'GENERATING REPORT...'
  ];

  // ── API Key Management ────────────────────────────────────
  function saveApiKey() {
    const val = document.getElementById('apiKey').value.trim();
    const statusEl = document.getElementById('apiStatus');
    if (!val || !val.startsWith('sk-')) {
      statusEl.textContent = '✕ INVALID KEY FORMAT';
      statusEl.className = 'api-status err';
      return;
    }
    _apiKey = val;
    statusEl.textContent = '✓ KEY SAVED';
    statusEl.className = 'api-status ok';
  }

  function getApiKey() {
    // Always read fresh from input in case user typed without hitting SET
    const inputVal = document.getElementById('apiKey').value.trim();
    if (inputVal) _apiKey = inputVal;
    return _apiKey;
  }

  // ── Navigation ────────────────────────────────────────────
  function navigate(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Show target page
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');

    // Highlight nav item
    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');

    _currentPage = page;

    // Notify modules that their page is now active
    if (page === 'history' && typeof historyModule !== 'undefined') {
      historyModule.render();
    }
    if (page === 'export' && typeof exportModule !== 'undefined') {
      exportModule.render();
    }
  }

  // ── History Store ─────────────────────────────────────────
  function addToHistory(entry) {
    // entry = { type, timestamp, summary, verdict, data }
    _history.unshift({ ...entry, id: Date.now() });
  }

  function getHistory() {
    return [..._history];
  }

  // ── Anthropic API Call ────────────────────────────────────
  // Central function all modules use to call Claude
  async function callClaude({ messages, maxTokens = 1000 }) {
    const key = getApiKey();
    if (!key) throw new Error('No API key set. Enter your Anthropic API key in the sidebar.');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: maxTokens,
        messages
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content.map(i => i.text || '').join('');
  }

  // ── Utility Helpers ───────────────────────────────────────

  // Convert a dataURL to base64 string
  function toBase64(dataUrl) {
    return dataUrl.split(',')[1];
  }

  // Extract mime type from dataURL
  function toMime(dataUrl) {
    return dataUrl.split(';')[0].split(':')[1];
  }

  // Read a file input as a dataURL (returns Promise)
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }

  // Parse JSON from Claude's response (strips markdown fences)
  function parseJSON(raw) {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }

  // Animate a loading message element through a cycle
  function startLoadingCycle(el) {
    let idx = 0;
    el.textContent = LOADING_MSGS[0];
    return setInterval(() => {
      idx = (idx + 1) % LOADING_MSGS.length;
      el.textContent = LOADING_MSGS[idx];
    }, 1800);
  }

  // Format a timestamp nicely
  function formatTime(date = new Date()) {
    return date.toLocaleTimeString('en-US', { hour12: false });
  }

  function formatDate(date = new Date()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Render a standard results header
  function resultsHeader(label = 'ANALYSIS COMPLETE') {
    return `
      <div class="results-header">
        <span class="results-tag">// ${label}</span>
        <span class="results-timestamp">${formatTime()}</span>
      </div>`;
  }

  // Build a score bar row
  function scoreRow(score, color) {
    return `
      <div class="match-score-row">
        <span class="score-label">SIMILARITY SCORE</span>
        <div class="score-bar-wrap">
          <div class="score-bar-fill" id="scoreBarFill" style="width:0%"></div>
        </div>
        <span class="score-pct" style="color:${color}">${score}%</span>
      </div>`;
  }

  // Animate score bar after render
  function animateScoreBar(score) {
    setTimeout(() => {
      const bar = document.getElementById('scoreBarFill');
      if (bar) bar.style.width = score + '%';
    }, 100);
  }

  // Map verdict string to color
  function verdictColor(verdict) {
    const map = {
      'MATCH': 'var(--accent)',
      'LIKELY MATCH': 'var(--accent2)',
      'UNCERTAIN': 'var(--caution)',
      'MISMATCH': 'var(--warn)'
    };
    return map[verdict] || 'var(--accent)';
  }

  // ── Public API ────────────────────────────────────────────
  return {
    saveApiKey,
    getApiKey,
    navigate,
    addToHistory,
    getHistory,
    callClaude,
    toBase64,
    toMime,
    readFile,
    parseJSON,
    startLoadingCycle,
    formatTime,
    formatDate,
    resultsHeader,
    scoreRow,
    animateScoreBar,
    verdictColor
  };

})();
