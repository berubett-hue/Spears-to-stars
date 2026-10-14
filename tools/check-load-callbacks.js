const fs=require('fs'), path=require('path'), acorn=require('acorn');
const dir=process.argv[2]; const files = [...fs.readFileSync(path.join(dir, '..', 'index.html'), 'utf8').matchAll(/<script src="js\/([^"]+)"/g)].map(m => m[1]); // load order from index.html
files.forEach((f,i)=>{ const s=fs.readFileSync(path.join(dir,f),'utf8'); const ast=acorn.parse(s,{ecmaVersion:'latest'});
  for(const st of ast.body){ if(st.type==='FunctionDeclaration') continue; const hits=[];
    (function v(n,inv){ if(!n||typeof n.type!=='string') return;
      if((n.type==='FunctionExpression'||n.type==='ArrowFunctionExpression') && !inv) return;
      if((n.type==='FunctionExpression'||n.type==='ArrowFunctionExpression') && inv){ v(n.body,false); return; }
      if(n.type==='AssignmentExpression' && n.left.type==='MemberExpression' && /^on/.test(n.left.property.name||'')) hits.push('.'+n.left.property.name+'=');
      if(n.type==='CallExpression'){ const c=n.callee; const nm=c.type==='Identifier'?c.name:(c.property&&c.property.name); if(['addEventListener','setTimeout','setInterval','requestAnimationFrame','then','load','ready','snapshot'].includes(nm)) hits.push(nm+'()');
        v(c, c.type==='FunctionExpression'||c.type==='ArrowFunctionExpression'); n.arguments.forEach(a=>v(a,false)); return; }
      for(const k in n){ if(k==='type'||k==='start'||k==='end') continue; const x=n[k]; if(Array.isArray(x)) x.forEach(y=>v(y,false)); else if(x&&typeof x.type==='string') v(x,false); } })(st,false);
    if(hits.length) console.log(f, s.slice(0,st.start).split('\n').length, [...new Set(hits)].join(' '), '|', s.slice(st.start, st.start+90).replace(/\n/g,' '));
  } });
