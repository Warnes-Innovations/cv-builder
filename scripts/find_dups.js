const fs = require('fs');
const path = require('path');
const patterns = [
  {kind:'func_decl', re:/^\s*(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/},
  {kind:'var_func', re:/^\s*(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s+)?function\s*\(/},
  {kind:'arrow', re:/^\s*(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/},
  {kind:'obj_literal', re:/^\s*(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{/}
];
const defs = {};
function walk(dir) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    if (e.isDirectory()) {
      walk(path.join(dir, e.name));
    } else if (/\.jsx?$|\.tsx?$/.test(e.name)) {
      const p = path.join(dir, e.name);
      const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
      lines.forEach((line, idx) => {
        patterns.forEach(({kind, re}) => {
          const m = line.match(re);
          if (m) {
            const name = m[1];
            defs[name] = defs[name] || [];
            defs[name].push({path:p, line:idx+1, kind, code:line.trim()});
          }
        });
      });
    }
  }
}
walk('web');
for (const name of Object.keys(defs).sort((a,b)=>defs[b].length-defs[a].length||a.localeCompare(b))) {
  if (defs[name].length > 1) {
    console.log(`${name} has ${defs[name].length} defs`);
    defs[name].forEach(d => console.log(`  ${d.path}:${d.line} [${d.kind}] ${d.code}`));
    console.log('');
  }
}
