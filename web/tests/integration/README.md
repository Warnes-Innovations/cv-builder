Integration test: session precedence

Open `session_precedence_test.html` in a browser (serve the repo root with a static server so `/web/app.js` is reachable) and observe the pass/fail lines in the page output and browser console.

Quick run via Python's simple HTTP server from the repo root:

```bash
python -m http.server 8000
# then open http://localhost:8000/web/tests/integration/session_precedence_test.html
```

Notes:
- This is a lightweight harness (not automated CI). For headless automation, run with Playwright or Puppeteer pointed at the same URL.
