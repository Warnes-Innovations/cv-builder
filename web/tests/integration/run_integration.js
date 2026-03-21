#!/usr/bin/env node
// Copyright (C) 2026 Gregory R. Warnes
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// This file is part of CV-Builder.
// For commercial licensing, contact greg@warnes-innovations.com

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
const ROOT = process.cwd();

function serveFile(req, res) {
  try {
    let reqPath = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(ROOT, reqPath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const stream = fs.createReadStream(filePath);
    res.writeHead(200, { 'Content-Type': getMime(filePath) });
    stream.pipe(res);
  } catch (e) {
    res.writeHead(500); res.end(String(e));
  }
}

function getMime(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

async function run() {
  const server = http.createServer(serveFile);
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Static server running at http://localhost:${PORT}/`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const url = `http://localhost:${PORT}/web/tests/integration/session_precedence_test.html`;
  console.log('Navigating to', url);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Wait for the harness to populate results
    await page.waitForSelector('#out', { timeout: 20_000 });
    const out = await page.$eval('#out', el => el.textContent || '');
    console.log('Harness output:\n', out);

    const pass1 = /PASS: achievementEdits restored/.test(out);
    const pass2 = /PASS: saved decisions \(extra_skills\) restored/.test(out);
    const pass3 = /PASS: buildSummaryFocusSection used session summary/.test(out);

    await browser.close();
    server.close();

    if (pass1 && pass2 && pass3) {
      console.log('All checks passed');
      process.exit(0);
    } else {
      console.error('One or more checks failed');
      process.exit(2);
    }
  } catch (err) {
    console.error('Integration test error:', err);
    try { await browser.close(); } catch(_){}
    server.close();
    process.exit(3);
  }
}

run();
