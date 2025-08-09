// scripts/generate-index.js
const fs = require('fs');
const path = require('path');

const TARGET_DIR = process.env.TARGET_DIR || 'docs';
const outDir = path.resolve(process.cwd(), TARGET_DIR);
const outFile = path.join(outDir, 'index.html');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function readTitle(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const m = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (m && m[1]) return m[1].trim();
  } catch (e) {
    // ignore
  }
  return null;
}

function slugToLabel(filename) {
  const name = filename.replace(/\.html$/i, '');
  return name.replace(/[-_.]/g, ' ');
}

const files = fs.readdirSync(outDir)
  .filter(f => /\.html$/i.test(f))
  .filter(f => !/^index(\.html)?$/i.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

// If no html files present in target dir, try scanning repo root for convenience
if (files.length === 0 && TARGET_DIR !== '.') {
  const rootFiles = fs.readdirSync(process.cwd())
    .filter(f => /\.html$/i.test(f))
    .filter(f => !/^index(\.html)?$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  if (rootFiles.length > 0) {
    console.log('No .html under', TARGET_DIR, '— found HTML files in repo root. Listing them (paths will be root-relative).');
    rootFiles.forEach(f => files.push(path.relative(outDir, path.join(process.cwd(), f))));
  }
}

const entries = files.map(fname => {
  const full = path.join(outDir, fname);
  const altFull = path.join(process.cwd(), fname); // in case file sits in repo root
  const title = readTitle(full) || readTitle(altFull) || slugToLabel(path.basename(fname));
  return { file: fname, title };
});

// build HTML
const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>HTML 페이지 목록</title>
  <style>
    :root{--bg:#0f1724;--card:#0b1220;--accent:#06b6d4;--muted:#9ca3af}
    html,body{height:100%}
    body{
      margin:0;font-family:Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
      background:linear-gradient(180deg,#071024 0%, #071a2a 100%);color:#e6eef6;
      display:flex;align-items:flex-start;justify-content:center;padding:48px 20px;
    }
    .wrap{max-width:1000px;width:100%}
    header{display:flex;align-items:center;gap:16px;margin-bottom:20px}
    h1{margin:0;font-size:20px}
    p.lead{margin:0;color:var(--muted)}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:18px}
    a.card{
      display:block;padding:14px;border-radius:12px;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06));
      text-decoration:none;color:inherit;box-shadow:0 6px 18px rgba(2,6,23,0.6);transition:transform .14s, box-shadow .14s;
      border:1px solid rgba(255,255,255,0.03);
    }
    a.card:hover{transform:translateY(-6px);box-shadow:0 20px 40px rgba(2,6,23,0.6)}
    .title{font-weight:600;margin-bottom:6px}
    .meta{font-size:13px;color:var(--muted)}
    .search{margin-left:auto}
    input[type="search"]{
      appearance:none;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.04);
      background:rgba(255,255,255,0.02);color:inherit;outline:none;width:220px
    }
    footer{margin-top:28px;color:var(--muted);font-size:13px}
    .empty{padding:28px;border-radius:12px;background:rgba(255,255,255,0.02);text-align:center;color:var(--muted)}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>HTML 페이지 목록</h1>
        <p class="lead">이 폴더(${TARGET_DIR})의 HTML 파일을 자동으로 나열합니다.</p>
      </div>
      <div class="search" style="margin-left:auto">
        <input id="q" type="search" placeholder="검색 (파일명 또는 제목)">
      </div>
    </header>

    <main>
      <div id="grid" class="grid">
        ${entries.map(e => `
          <a class="card" href="./${encodeURI(e.file)}" title="${escapeHtml(e.title)}">
            <div class="title">${escapeHtml(e.title)}</div>
            <div class="meta">${escapeHtml(e.file)}</div>
          </a>
        `).join('')}
      </div>

      ${entries.length === 0 ? `<div class="empty">이 폴더에 다른 HTML 파일이 없습니다.</div>` : ''}
    </main>

    <footer>
      자동 생성된 페이지 — 생성 시간: ${new Date().toLocaleString()}
    </footer>
  </div>

  <script>
    const items = Array.from(document.querySelectorAll('.card'));
    const q = document.getElementById('q');
    function normalize(s){ return s.trim().toLowerCase(); }
    q.addEventListener('input', () => {
      const v = normalize(q.value);
      items.forEach(card => {
        const t = normalize(card.querySelector('.title').textContent + ' ' + card.querySelector('.meta').textContent);
        card.style.display = t.includes(v) ? 'block' : 'none';
      });
    });
  </script>
</body>
</html>`;

// helper escape
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

// write file
fs.writeFileSync(outFile, html, 'utf8');
console.log('Generated', outFile);
