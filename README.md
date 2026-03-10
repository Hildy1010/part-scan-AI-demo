# PartScan — AI Manufacturing Intelligence

A browser-based AI tool for manufacturing and fabrication teams. Upload part photos, blueprints, and technical drawings — Claude's vision AI analyzes and compares them instantly.

**Live Demo:** https://hildy1010.github.io/part-scan-AI-demo/

---

## Features

- **Part Comparison** — Upload a reference part and an unknown part. AI scores similarity, identifies matching features, flags differences, and returns a verdict.
- **Blueprint Analysis** — Upload a blueprint image or PDF. AI extracts dimensions, material, manufacturing method, and suggests improvements.
- **Part Number Lookup** — Photograph an unknown part. AI identifies it and suggests a part number with confidence score.
- **Scan History** — All analyses from your session are logged and viewable in one place.
- **Export Report** — Download a full HTML report of your session's findings.

---

## Project Structure

```
part-scan-AI-demo/
│
├── index.html          # Main shell — navigation layout, page containers
├── css/
│   └── styles.css      # All styling, CSS variables, animations, layout
├── js/
│   ├── app.js          # Core controller — API calls, state, shared utilities
│   ├── compare.js      # Part comparison feature
│   ├── blueprint.js    # Blueprint upload and analysis
│   ├── lookup.js       # Part number identification
│   ├── history.js      # Session scan history
│   └── export.js       # Report generation and download
└── README.md
```

### Why this structure?
Each file has a single, clear responsibility:
- **HTML** handles structure and layout only
- **CSS** handles all visual presentation
- **app.js** is the shared brain — API calls, navigation, utilities
- Each feature module is self-contained and independently readable

---

## Setup

1. Clone or download this repository
2. Open `index.html` in any modern browser
3. Enter your [Anthropic API key](https://console.anthropic.com) in the sidebar
4. Upload images and start analyzing

No server required. No build tools. No dependencies to install.

---

## Technologies

- Vanilla HTML, CSS, JavaScript
- [Anthropic Claude API](https://docs.anthropic.com) (claude-opus-4) for vision AI
- Google Fonts (Share Tech Mono + Barlow)

---

## Built By

Developed as a proof-of-concept for AI-assisted manufacturing workflows.
