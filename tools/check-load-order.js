// Find load-time code in js file i that (transitively) reaches a function declared in a later file.
const fs = require('fs'), path = require('path'), acorn = require('acorn'), walk = require('acorn-walk');
const dir = process.argv[2];
const files = [...fs.readFileSync(path.join(dir, '..', 'index.html'), 'utf8').matchAll(/<script src="js\/([^"]+)"/g)].map(m => m[1]); // load order from index.html
const srcs = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8'));
const decl = {}; // name -> {file, node}
const asts = srcs.map((s, i) => acorn.parse(s, {ecmaVersion: 'latest', sourceType: 'script'}));
asts.forEach((ast, i) => { for (const st of ast.body) if (st.type === 'FunctionDeclaration') decl[st.id.name] = {file: i, node: st}; });
// identifiers referenced anywhere inside a node
function refsAll(node) { const s = new Set(); walk.full(node, n => { if (n.type === 'Identifier') s.add(n.name); }); return s; }
// identifiers referenced at load time: skip function bodies unless immediately invoked
function refsNow(node) {
  const s = new Set();
  (function visit(n, invoked) {
    if (!n || typeof n.type !== 'string') return;
    if ((n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression' || n.type === 'FunctionDeclaration') && !invoked) return;
    if ((n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') && invoked) { visit(n.body, false); return; }
    if (n.type === 'CallExpression' || n.type === 'NewExpression' || n.type === 'TaggedTemplateExpression') {
      const c = n.callee || n.tag;
      if (c.type === 'Identifier') s.add(c.name);
      // a function passed straight into a call may be invoked right away (forEach, map, sort...)
      (n.arguments || []).forEach(a => { if (a.type === 'Identifier') s.add(a.name); });
      visit(c, c.type === 'FunctionExpression' || c.type === 'ArrowFunctionExpression');
      (n.arguments || []).forEach(a => visit(a, a.type === 'FunctionExpression' || a.type === 'ArrowFunctionExpression')); return;
    }
    for (const k in n) { if (k === 'type' || k === 'start' || k === 'end') continue; const v = n[k];
      if (Array.isArray(v)) v.forEach(x => x && typeof x.type === 'string' && visit(x, false));
      else if (v && typeof v.type === 'string') visit(v, false); }
  })(node, false);
  return s;
}
const fnRefs = {}; for (const k in decl) fnRefs[k] = refsNow(decl[k].node.body);
let problems = 0;
asts.forEach((ast, i) => {
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration') continue;
    const start = refsNow(st), seenF = new Set(), q = [...start];
    while (q.length) { const id = q.pop(); if (!decl[id] || seenF.has(id)) continue; seenF.add(id);
      if (decl[id].file > i) { problems++; console.log(`${files[i]} line ${srcs[i].slice(0, st.start).split('\n').length}: load-time code reaches ${id}() from ${files[decl[id].file]}`); }
      for (const r of fnRefs[id]) q.push(r); }
  }
});
console.log('problems', problems);
