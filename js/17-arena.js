"use strict";
/* ---------- Proving Grounds: two armies, the game's real combat, a damage meter ---------- */
const AR = {era:2, size:40, abil:true, speed:1, teams:[{rows:[]},{rows:[]}], st:null, live:false, raf:0, last:0, t:0, done:null, saved:null, meterAcc:0};
const AR_SWAP = ['spr','pal','parts','projs','floats','rings','fires','corpses','pc','pt','syn','rsyn','fights','raidT','raidS','raidGo','shake','cc','ca','abT'];
function arSwapIn(){
  AR.saved = {G, S, r:{}};
  AR_SWAP.forEach(k => AR.saved.r[k] = R[k]);
  G = AR.st.G; S = AR.st.S;
  AR_SWAP.forEach(k => R[k] = AR.st.r[k]);
}
function arSwapOut(){
  AR_SWAP.forEach(k => AR.st.r[k] = R[k]);
  AR.st.G = G; AR.st.S = S;
  G = AR.saved.G; S = AR.saved.S;
  AR_SWAP.forEach(k => R[k] = AR.saved.r[k]);
  AR.saved = null;
}
function arDefaults(){
  if(G && G.cards && G.cards.length){
    AR.teams[0].rows = G.cards.map(sl => ({id:sl.id, lvl:sl.lvl, evo:!!sl.evo}));
    AR.era = G.eraIdx;
    const foes = G.rivals.filter(r => r.alive).sort((a,b) => powerOf(b.id) - powerOf(a.id));
    AR.teams[1].rows = foes.length ? arFromRival(foes[0]) : arRandom();
  } else if(!AR.teams[0].rows.length){
    AR.teams[0].rows = [{id:'militia', lvl:4, evo:false}, {id:'slingers', lvl:3, evo:false}, {id:'priests', lvl:2, evo:false}];
    AR.teams[1].rows = [{id:'spearmen', lvl:4, evo:false}, {id:'longbow', lvl:3, evo:false}, {id:'horse', lvl:2, evo:false}];
  }
}
function arFromRival(r){ return r.cards.map(id => ({id, lvl:(r.lv||{})[id]||1, evo:false})); }
function arRandom(){ const ids = shuffle(Object.keys(CARDS).filter(id => !CARDS[id].secret || isUnlocked(id))).slice(0, 2+rint(3)); return ids.map(id => ({id, lvl:Math.max(1, Math.min(8, AR.era + 1 + rint(3))), evo:false})); }
function arBuild(){
  const era = AR.era, tA = AR.teams[0].rows, tB = AR.teams[1].rows;
  const g = {arena:{abil:AR.abil, home:{1:{id:-1, x:13, y:40, owner:1}, 2:{id:-2, x:42, y:40, owner:2}}}, units:[], cards:tA.map(r => ({id:r.id, lvl:r.lvl, evo:r.evo ? (UEVO.find(e => e.from===r.id && !e.legend)||{}).id || null : null})),
    techs:[], boons:[], evEffects:[], relics:[], eraIdx:era, t:era*170+1, cities:[], rwars:[], buff:{rally:0,golden:0,fortify:0}, cd:{}, doctrine:'build', perk:'', nid:1, stats:{kills:0},
    ter:new Array(N*N).fill(PLAINS), own:new Array(N*N).fill(0), dmg:{}, adm:{}, fielded:{},
    rivals:[{id:2, name:'Challengers', col:'#6ea8f7', alive:true, status:'war', trait:'mercantile', cards:tB.map(r => r.id), lv:Object.fromEntries(tB.map(r => [r.id, r.lvl])), evo:Object.fromEntries(tB.filter(r => r.evo).map(r => [r.id, (UEVO.find(e => e.from===r.id && !e.legend)||{}).id]))}]};
  AR.st = {G:g, S:null, r:{spr:{}, pal:{1:{C:'#e9b949', c:'#9a6f1e', L:'#ffe6a0'}, 2:teamPal('#6ea8f7')}, parts:[], projs:[], floats:[], rings:[], fires:[], corpses:[], pc:new Map(), pt:new Map(), syn:{}, rsyn:{}, fights:new Map(), raidT:new Map(), raidS:new Map(), raidGo:new Map(), shake:0, cc:null, ca:null, abT:{}}};
  arSwapIn();
  try {
    S = computeStats();
    computeSyn();
    for(const [own, rows, x0, dir] of [[1, tA, 22, 1], [2, tB, 34, -1]]){
      const ids = rows.map(r => r.id); if(!ids.length) continue;
      const cnt = {}; let up = 0, n = 0;
      const syn = synOf(own);
      while(up < AR.size && n < 70){
        let best = 1e9, pick = ids[0];
        for(const id of ids){ const r = (cnt[id]||0)/squadSize(own, id); if(r < best){ best = r; pick = id; } }
        const C = CARDS[pick]; cnt[pick] = (cnt[pick]||0) + 1; n++;
        up += C.up*(C.tags.includes('Swarm') && (syn.Swarm||0) >= 2 ? .6 : 1);
      }
      G.fielded[own] = cnt;
      const lanes = {guard:0, titan:0, rider:1, archer:2, siege:3, support:1.5};
      const byLane = {};
      for(const id of ids) for(let k=0;k<(cnt[id]||0);k++){
        const C = CARDS[id], lane = lanes[C.role] ?? 1, li = byLane[lane] = (byLane[lane]||0) + 1;
        const u = spawnUnit(own, G.arena.home[own], id);
        u.x = x0 - dir*(lane*1.5 + Math.floor((li-1)/9)*.9) + rnd(-.2,.2);
        u.y = 40 + (((li-1)%9) - 4)*.85 + (C.role==='rider' ? (li%2 ? -3 : 3) : 0) + rnd(-.2,.2);
        u.fx = dir; u.home = -own;
      }
    }
  } finally { arSwapOut(); }
  AR.t = 0; AR.done = null; AR.live = false; AR.meterAcc = 0;
}
function arStep(dt){
  arSwapIn();
  try {
    const unitById = new Map(G.units.map(u => [u.id, u]));
    updateUnits(dt, new Map(), unitById); updateFires(dt);
    G.units = G.units.filter(u => u.hp > 0);
    fxStep(dt);
    AR.t += dt;
    const a = G.units.filter(u => u.owner===1).length, b = G.units.filter(u => u.owner===2).length;
    if(!a || !b || AR.t > 120){
      const pa = powerOf(1), pb = powerOf(2);
      AR.done = {win: !b && a ? 1 : !a && b ? 2 : pa===pb ? 0 : pa > pb ? 1 : 2, a, b, t:AR.t, timeout:AR.t > 120};
      AR.live = false;
    }
  } finally { arSwapOut(); }
}
function arDraw(){
  const cv2 = $('#arenaCv'); if(!cv2 || !cv2.getContext) return;
  const W = cv2.clientWidth, H = cv2.clientHeight, dpr = Math.min(2, window.devicePixelRatio||1);
  if(cv2.width !== Math.round(W*dpr)){ cv2.width = Math.round(W*dpr); cv2.height = Math.round(H*dpr); }
  const x = cv2.getContext('2d'); x.setTransform(1,0,0,1,0,0); x.imageSmoothingEnabled = false;
  x.fillStyle = '#5d6b3a'; x.fillRect(0, 0, cv2.width, cv2.height);
  arSwapIn();
  try {
    const z = cv2.width/30, ox = 13, oy = 40 - cv2.height/z/2;
    x.setTransform(z, 0, 0, z, -ox*z, -oy*z);
    for(let gy=Math.floor(oy); gy<oy+cv2.height/z+1; gy++) for(let gx=ox; gx<ox+31; gx++){ if(((gx*7+gy*13)%5)===0){ x.fillStyle = 'rgba(40,52,24,.35)'; x.fillRect(gx+.3, gy+.6, .12, .05); } }
    for(const f of R.fires){ const a = Math.min(1, f.life/f.max*2); x.globalAlpha = .3*a; x.fillStyle = '#ff7a2a'; x.beginPath(); x.arc(f.x, f.y, f.r, 0, 6.283); x.fill(); x.globalAlpha = .35*a; x.fillStyle = '#ffd36a'; x.beginPath(); x.arc(f.x, f.y, f.r*.5, 0, 6.283); x.fill(); }
    x.globalAlpha = 1;
    drawDecals(x, null);
    for(const cp of R.corpses){ x.save(); x.globalAlpha = Math.max(0, 1-cp.t/1.6)*.8; x.translate(cp.x, cp.y+.25); x.rotate(cp.fx*1.35); x.drawImage(cp.img, -cp.w/2, -cp.h, cp.w, cp.h); x.restore(); }
    x.globalAlpha = 1;
    for(const u of G.units.slice().sort((a,b) => a.y-b.y)){
      const L = unitLook(u), img = L.img, scl = L.scl, w = L.w, h0 = L.h, dy = L.dy, h = h0 - dy - (L.rk||L.ev ? 3/16*scl : 0), C = CARDS[u.card];
      if(C.auraR){ x.strokeStyle = 'rgba(255,255,255,.15)'; x.lineWidth = .05; x.beginPath(); x.arc(u.x, u.y+.1, u.card==='banner' ? bannerR(u.owner) : uStat(u).auraR, 0, 6.283); x.stroke(); }
      drawUnitGlow(x, u, L);
      if(u.brace > 0){ x.strokeStyle = 'rgba(216,228,240,.7)'; x.lineWidth = .06; x.beginPath(); x.arc(u.x, u.y, .45, 0, 6.283); x.stroke(); }
      if(u.frenzy > 0){ x.fillStyle = 'rgba(255,90,60,.35)'; x.fillRect(u.x-w*.4, u.y+.2, w*.8, .1); }
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(u.x-w*.35, u.y+.24, w*.7, .07);
      const lo = u.lg > 0 ? (u.lg/.12)*.22 : 0, ux = u.x + (u.lx||0)*lo, uy = u.y + (u.ly||0)*lo;
      if(u.fx < 0){ x.save(); x.translate(ux, 0); x.scale(-1, 1); x.drawImage(img, -w/2, uy+.3-h0+dy, w, h0); x.restore(); } else x.drawImage(img, ux-w/2, uy+.3-h0+dy, w, h0);
      const f = u.hp/uStat(u).hp; x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(u.x-.25, u.y+.34, .5, .06); x.fillStyle = u.owner===1 ? '#f4b84a' : '#6ea8f7'; x.fillRect(u.x-.25, u.y+.34, .5*clamp(f,0,1), .06);
    }
    x.lineCap = 'round';
    for(const p of R.projs){ drawProj(x, p); x.globalAlpha = 1; }
    drawFx(x, null);
    x.globalAlpha = 1;
    for(const r of R.rings){ const t = 1 - r.life/r.max; x.globalAlpha = (1-t)*.85; x.strokeStyle = r.col; x.lineWidth = .09; x.beginPath(); x.arc(r.x, r.y, r.r0 + (r.r1-r.r0)*t, 0, 6.283); x.stroke(); }
    for(const p of R.parts){ x.globalAlpha = clamp(p.life/p.max*1.4,0,1); x.fillStyle = p.col; x.fillRect(p.x-p.sz/2, p.y-p.sz/2, p.sz, p.sz); }
    x.globalAlpha = 1;
    x.setTransform(1,0,0,1,0,0);
    x.font = '400 '+Math.round(14*dpr)+'px StarsPix, sans-serif'; x.textAlign = 'center';
    for(const f of R.floats){ const px = (f.x-ox)*z, py = (f.y-oy)*z; x.globalAlpha = clamp(f.life/f.max*1.5,0,1); x.lineWidth = 3.5*dpr; x.strokeStyle = 'rgba(5,8,10,.95)'; x.strokeText(f.text, px, py); x.fillStyle = f.col; x.fillText(f.text, px, py); }
    x.globalAlpha = 1; x.textAlign = 'left';
    x.font = '600 '+Math.round(13*dpr)+'px "Barlow Semi Condensed", sans-serif';
    const a = G.units.filter(u => u.owner===1).length, b = G.units.filter(u => u.owner===2).length;
    x.fillStyle = '#f4b84a'; x.fillText('Gold · '+a+' troops', 10*dpr, 20*dpr);
    x.textAlign = 'right'; x.fillStyle = '#9cc4ff'; x.fillText(b+' troops · Blue', cv2.width-10*dpr, 20*dpr);
    x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText(fmt(AR.t), cv2.width/2, 20*dpr); x.textAlign = 'left';
  } finally { arSwapOut(); }
}
function arMeter(){
  const el = $('#arenaMeter'); if(!el || !AR.st) return;
  const g = AR.st.G, rows = [];
  for(const own of [1,2]){
    const tm = AR.teams[own-1].rows;
    for(const r of tm){ const e = g.dmg[own+':'+r.id] || {d:0,k:0}; rows.push({own, n:(r.evo && r.lvl >= EVO_LV && UEVO.find(x => x.from===r.id && !x.legend) || CARDS[r.id]).n, lvl:r.lvl, d:e.d, k:e.k, f:(g.fielded[own]||{})[r.id]||0}); }
  }
  const mx = Math.max(1, ...rows.map(r => r.d));
  const ab = Object.keys(g.adm).map(k => { const [own, tag] = k.split(':'); return {own:+own, n:ABIL[tag].n, d:g.adm[k]}; }).sort((a,b) => b.d-a.d);
  let h = '';
  if(AR.done){ const d = AR.done; h += '<p class="ar-win '+(d.win===1 ? 'gold' : d.win===2 ? 'blue' : '')+'">'+(d.win===0 ? 'A draw' : (d.win===1 ? 'Gold' : 'Blue')+' wins')+' in '+fmt(d.t)+(d.timeout ? ' (time ran out, judged on army power)' : '')+' · '+(d.win===2 ? d.b : d.a)+' troops left standing</p>'; }
  h += '<div class="ar-cols">';
  for(const own of [1,2]){
    h += '<div><h3 style="color:'+(own===1 ? 'var(--lamp-2)' : '#9cc4ff')+'">'+(own===1 ? 'Gold' : 'Blue')+' · damage dealt</h3>';
    for(const r of rows.filter(r => r.own===own).sort((a,b) => b.d-a.d)) h += '<div class="mrow"><span>'+r.n+' <em>Lv '+r.lvl+' · ×'+r.f+'</em></span><b>'+Math.round(r.d).toLocaleString()+'<small> · '+r.k+' kills</small></b><i><s style="width:'+(r.d/mx*100).toFixed(1)+'%;background:'+(own===1 ? '#f4b84a' : '#6ea8f7')+'"></s></i></div>';
    const mine = ab.filter(a => a.own===own);
    if(mine.length) h += '<p class="lnote">'+mine.map(a => '⚔ '+a.n+' '+Math.round(a.d).toLocaleString()).join(' · ')+'</p>';
    h += '</div>';
  }
  el.innerHTML = h + '</div>';
}
function arControls(){
  const el = $('#arenaCtl'); if(!el) return;
  const opt = (sel, ti) => { let h = ''; for(const id in CARDS){ if(CARDS[id].secret && !isUnlocked(id) && id!==sel) continue; const lk = ti===0 && !isUnlocked(id) && id!==sel; h += '<option value="'+id+'"'+(id===sel ? ' selected' : '')+(lk ? ' disabled' : '')+'>'+CARDS[id].n+(lk ? ' (locked)' : '')+'</option>'; } return h; };
  const loadOpts = () => '<option value="">Load an army…</option>'+(G && G.cards ? '<option value="you">Your army</option>'+G.rivals.filter(r => r.alive).map(r => '<option value="r'+r.id+'">'+esc(r.name)+'</option>').join('') : '')+'<option value="rand">Random</option>';
  let h = '<div class="ar-top"><label>Era <select data-k="era">'+ERAS.map((n,i) => '<option value="'+i+'"'+(i===AR.era ? ' selected' : '')+'>'+n+'</option>').join('')+'</select></label>'+
    '<label>Battle size <select data-k="size">'+[[24,'Skirmish'],[40,'Battle'],[64,'War']].map(([v,n]) => '<option value="'+v+'"'+(v===AR.size ? ' selected' : '')+'>'+n+'</option>').join('')+'</select></label>'+
    '<label class="chk"><input type="checkbox" data-k="abil"'+(AR.abil ? ' checked' : '')+'> Special attacks</label></div><div class="ar-cols">';
  AR.teams.forEach((tm, ti) => {
    const syn = tagCount(tm.rows.map(r => r.id)), on = Object.keys(SYN).filter(g => (syn[g]||0) >= SYN[g][0][0]);
    const combos = COMBOS.filter(c => tm.rows.some(r => r.id===c.a) && (c.b ? tm.rows.some(r => r.id===c.b) : tm.rows.some(r => CARDS[r.id].tags.includes(c.tag))));
    h += '<div class="ar-team '+(ti ? 'blue' : 'gold')+'"><div class="ar-th"><b>'+(ti ? 'Blue' : 'Gold')+'</b><select data-load="'+ti+'">'+loadOpts()+'</select></div>';
    tm.rows.forEach((r, ri) => {
      const ev = UEVO.find(e => e.from===r.id && known(e) && !e.legend);
      h += '<div class="ar-row"><select data-t="'+ti+'" data-r="'+ri+'" data-f="id">'+opt(r.id, ti)+'</select><select data-t="'+ti+'" data-r="'+ri+'" data-f="lvl">'+[1,2,3,4,5,6,7,8].map(l => '<option value="'+l+'"'+(l===r.lvl ? ' selected' : '')+'>'+l+' · '+esc(formOf(r.id, l).n)+'</option>').join('')+'</select>'+
        (ev ? '<label class="chk" title="'+esc(ev.n+': '+ev.d)+'"><input type="checkbox" data-t="'+ti+'" data-r="'+ri+'" data-f="evo"'+(r.evo ? ' checked' : '')+(r.lvl < EVO_LV ? ' disabled' : '')+'>◆</label>' : '<span class="chk"></span>')+
        '<button data-t="'+ti+'" data-r="'+ri+'" data-f="del" aria-label="Remove">✕</button></div>';
    });
    if(tm.rows.length < 6) h += '<button class="ar-add" data-add="'+ti+'">+ Add a unit</button>';
    h += '<p class="lnote">'+(on.length ? on.map(g => g+' '+syn[g]).join(' · ') : 'No synergies')+(combos.length ? ' · ◆ '+combos.map(c => c.n).join(', ') : '')+'</p></div>';
  });
  el.innerHTML = h + '</div>';
  el.querySelectorAll('select[data-k], input[data-k]').forEach(s => s.addEventListener('change', () => { const k = s.dataset.k; AR[k] = k==='abil' ? s.checked : +s.value; arReset(); }));
  el.querySelectorAll('[data-f]').forEach(s => s.addEventListener(s.tagName==='BUTTON' ? 'click' : 'change', () => {
    const tm = AR.teams[+s.dataset.t].rows, ri = +s.dataset.r, f = s.dataset.f;
    if(f==='del') tm.splice(ri, 1); else if(f==='evo') tm[ri].evo = s.checked; else if(f==='lvl'){ tm[ri].lvl = +s.value; if(tm[ri].lvl < EVO_LV) tm[ri].evo = false; } else { tm[ri].id = s.value; tm[ri].evo = false; }
    arReset();
  }));
  el.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => { const tm = AR.teams[+b.dataset.add].rows; const free = Object.keys(CARDS).filter(id => !tm.some(r => r.id===id) && (b.dataset.add!=='0' || isUnlocked(id))); tm.push({id:free[rint(free.length)], lvl:3, evo:false}); arReset(); }));
  el.querySelectorAll('[data-load]').forEach(s => s.addEventListener('change', () => {
    const ti = +s.dataset.load, v = s.value; if(!v) return;
    AR.teams[ti].rows = v==='you' ? G.cards.map(sl => ({id:sl.id, lvl:sl.lvl, evo:!!sl.evo})) : v==='rand' ? arRandom() : arFromRival(rival(+v.slice(1)));
    arReset();
  }));
}
function arReset(){ arBuild(); arControls(); arMeter(); arDraw(); $('#btnArenaGo').textContent = 'Fight'; }
function openArena(){
  if(modal && modal!=='army' && modal!=='ledger') return;
  if(modal==='army') closeArmy(); if(modal==='ledger') closeLedger();
  R.arenaPrev = modal; modal = 'arena';
  arDefaults(); $('#ovArena').hidden = false; arReset(); SFX.tick();
  const loop = now => {
    if(modal!=='arena') return;
    AR.raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, Math.max(0, (now - (AR.last||now))/1000)); AR.last = now;
    if(AR.live){ let rem = dt*AR.speed; while(rem > 1e-6 && AR.live){ const s = Math.min(.05, rem); arStep(s); rem -= s; } AR.meterAcc += dt; if(AR.meterAcc > .3 || !AR.live){ AR.meterAcc = 0; arMeter(); } if(!AR.live) $('#btnArenaGo').textContent = 'Fight again'; }
    else { arSwapIn(); try { fxStep(dt); } finally { arSwapOut(); } }
    arDraw(); SFX.flush && SFX.flush();
  };
  AR.last = 0; AR.raf = requestAnimationFrame(loop);
}
function closeArena(){ modal = null; AR.live = false; cancelAnimationFrame(AR.raf); $('#ovArena').hidden = true; }

function openCollect(){
  const prev = modal; if(prev && prev!=='army') return;
  R.colPrev = prev; modal = 'collect';
  const visT = Object.keys(CARDS).filter(id => !CARDS[id].secret || isUnlocked(id)), got = visT.filter(isUnlocked).length;
  $('#colKicker').textContent = 'Collection · '+got+' of '+visT.length+' troops · '+NATIONS_P.filter(natOK).length+' of '+NATIONS_P.length+' peoples · '+'Crown '+(META.crown||0)+' of 10 open';
  const L0 = META.life, bar = (a, b) => '<span class="pbar"><s style="width:'+Math.min(100, a/b*100).toFixed(1)+'%"></s></span>';
  let h = nextHTML(3, 'Closest unlocks') + '<p class="lnote">'+L0.games+' games · '+L0.wins+' wins · '+L0.kills.toLocaleString()+' enemies defeated · '+L0.founded+' cities founded · '+L0.ruins+' ruins explored</p>';
  h += '<h3>Troops</h3><p class="lnote col-how">Each troop line is <b>one unit that modernizes as it levels</b>: Lv 1 is its Ancient form, Lv 8 its Future form. Field a line in your games to earn <b>mastery</b>, which unlocks its later forms for good.</p><div class="tr-grid">';
  for(const id of Object.keys(CARDS).filter(id => !CARDS[id].secret).sort((a,b) => (isUnlocked(b) - isUnlocked(a)) || CARDS[a].era - CARDS[b].era)){
    const C = CARDS[id], on = isUnlocked(id), a = achFor(id), r = mRank(id), xp = META.mx[id]||0, cap = mCap(id), has = USPR.ok && USPR.m[id];
    const big = has ? artURL('cpb_'+id+'_'+(on ? cap : 1), () => uPortrait(id, on ? Math.min(8, cap) : 1)) : '';
    const pic = big ? '<img class="tr-pic" src="'+big+'" alt="">' : '<i class="tr-pic"></i>';
    if(on){
      const ladder = FORM_ERA.map((era, i) => { const lv = i+1, ok = lv <= cap, u = has ? artURL('cl_'+id+'_'+lv, () => uPortrait(id, lv)) : ''; return '<span class="rung'+(ok ? '' : ' lk')+'" title="Lv '+lv+' · '+(ok ? esc(C.forms[i].n) : '???')+' · '+era+(ok ? '' : ' · unlocks at mastery '+(lv-6))+'">'+(u ? '<img src="'+u+'" alt="">' : '')+'<i>'+lv+'</i></span>'; }).join('');
      h += '<div class="tr-card"><div class="tr-top">'+pic+'<div><b>'+C.n+'</b><em class="stars">'+mStars(id)+'</em><span class="tr-role">'+esc(C.d)+'</span>'+vsHTML(id)+'</div></div>'+
        '<div class="ladder">'+ladder+'</div><div class="ladder-cap"><span>Ancient</span><span>Future</span></div>'+
        '<div class="tr-m"><span>Mastery '+r+(r < MX_T.length ? ' · '+xp.toLocaleString()+' / '+MX_T[r].toLocaleString()+' XP. Next: '+mPerk(r+1) : ' · fully mastered')+'</span>'+(r < MX_T.length ? bar(xp - (MX_T[r-1]||0), MX_T[r] - (MX_T[r-1]||0)) : '')+'</div>'+
        '<details><summary>More</summary><span>'+C.tags.join(' · ')+(SIG[id] ? '<br>✦ Lv 8 signature: '+esc(SIG[id].n) : '')+'<br>'+C.forms.map((f, i) => i < cap ? esc(f.n) : '???').join(' → ')+'</span></details></div>';
    } else {
      const p = a && a.prog ? a.prog() : null;
      h += '<div class="tr-card locked"><div class="tr-top">'+pic+'<div><b>??? troop line</b><span class="tr-role">Unlock: '+esc(a ? a.d : '')+'</span>'+(p ? bar(p[0], p[1])+'<small>'+Math.min(p[0], p[1]).toLocaleString()+' / '+p[1].toLocaleString()+'</small>' : '')+'</div></div></div>';
    }
  }
  h += '</div><h3>Peoples</h3><p class="lnote col-how">Each people brings its own <b>general</b>, a hero you steer yourself, plus a starting troop and a bonus.</p><div class="tr-grid">'+NATIONS_P.map(n => {
    const ok = natOK(n), a = n.lock ? ACH.find(x => x.id==='nat:'+n.id) : null, H = HEROES[n.id] || {}, u = HSPR.ok && (HSPR.m[n.id] || HEROES[n.id]) ? hsprPortrait(n.id) : '';
    const pic = u ? '<img class="tr-pic hero" src="'+u+'" alt="" style="--pc:'+PEOPLE[n.id].col+'">' : '<i class="tr-pic"></i>';
    if(ok) return '<div class="tr-card"><div class="tr-top">'+pic+'<div><b><i class="sw" style="background:'+PEOPLE[n.id].col+'"></i>'+esc(n.n)+'</b><span class="tr-gen">'+esc(H.n || '')+'</span><span class="tr-role">'+esc(n.perk)+'</span><span class="tr-ab"><em>'+esc(H.act || '')+'</em> · '+esc(H.ad || '')+'</span><span class="tr-ab">Always: '+esc(H.sig || '')+'</span><span class="tr-ab">Starts with '+n.start.map(id => CARDS[id].n).join(' and ')+'</span></div></div>'+
      '<div class="ladder gen3">'+[['Ancient',1],['Gunpowder',2],['Future',3]].map(([lbl,t]) => { const pu = hsprPortrait(n.id, t); return '<span class="rung" title="'+lbl+' look">'+(pu ? '<img src="'+pu+'" alt="">' : '')+'<i>'+lbl+'</i></span>'; }).join('')+'</div>'+peopleProgHTML(n.id)+'</div>';
    if(n.secret){ const sc = SECRETS.find(x => x.id===n.id) || {}, met = (META.met||[]).includes(n.id); return '<div class="tr-card locked"><div class="tr-top">'+pic+'<div><b>'+(met ? esc(n.n) : '??? people')+'</b><span class="tr-gen">'+(met ? 'You have met them' : 'A hidden people')+'</span><span class="tr-role">“'+esc(sc.clue||'')+'”</span><span class="tr-ab">Find the secret of their troops to lead them</span></div></div></div>'; }
    const need = a ? null : n.start.filter(id => !isUnlocked(id)), p = a && a.prog ? a.prog() : null;
    return '<div class="tr-card locked"><div class="tr-top">'+pic+'<div><b>??? people</b><span class="tr-gen">An unknown general</span><span class="tr-role">'+esc(a ? 'Unlock: '+a.d : 'Unlock the '+need.map(id => CARDS[id].n).join(' and ')+' troop line'+(need.length > 1 ? 's' : ''))+'</span>'+(p ? bar(p[0], p[1])+'<small>'+Math.min(p[0], p[1]).toLocaleString()+' / '+p[1].toLocaleString()+'</small>' : '')+'</div></div></div>'; }).join('');
  h += '</div><h3>Civics</h3><div class="col-grid">'+Object.keys(RELICS).map(k => '<div class="col-item">'+(KIT['cv_'+k] ? '<img class="ai" src="'+KIT['cv_'+k]+'" alt="">' : '')+'<b>'+RELICS[k].n+'</b><span>'+RELICS[k].d+' per level, up to level '+RELICS[k].max+'</span></div>').join('')+'</div>';
  const evItem = e => { const k = known(e), sn = META.seen.has(e.id), hn = META.hint[e.id]||0, eu = artURL('evp_'+e.id+'_'+pcol(), () => evoPortrait(e)), pic = eu ? '<img class="evo'+(k ? '' : ' sil')+'" src="'+eu+'" alt="" style="--ec:'+e.col+'">' : '';
    if(!k && hn >= 2) return '<div class="col-item">'+pic+'<b>◇ '+e.n+' · recipe found</b><span>'+evoRecipe(e)+'. Not yet forged: bring both to a War Chest.</span></div>';
    if(!k && hn === 1) return '<div class="col-item locked">'+pic+'<b>'+(sn ? e.n : '???')+' · fragment <em class="pips">◆◆◇</em></b><span>The '+CARDS[e.from].n+' line at Lv '+evLv(e)+' + ??? · Clue: “'+e.clue+'”</span></div>';
    if(k) return '<div class="col-item">'+pic+'<b>✦ '+e.n+'</b><span>'+evoRecipe(e)+'. '+e.d+(e.legend && !META.leg.has(e.id) ? ' Defeat a nation that fields it to forge it yourself.' : '')+'</span></div>';
    return '<div class="col-item locked">'+pic+'<b>'+(sn ? e.n+' · seen in battle' : '???')+(e.legend ? '' : ' <em class="pips">◆◇◇</em>')+'</b><span>Riddle: “'+e.clue+'”'+(e.legend ? '. Only a nation that fields it can teach you' : '<br><small>Sharpens when you field the right line at Lv '+evLv(e)+', or find a torn page in ruins</small>')+'</span></div>'; };
  const base = UEVO.filter(e => !e.legend), legs = UEVO.filter(e => e.legend);
  h += '<h3>Evolutions and unions · '+base.filter(known).length+' of '+base.length+' discovered</h3><div class="col-grid">'+base.map(evItem).join('')+'</div>';
  { const ak = Object.keys(ARTS); h += '<h3>Artifacts · '+ak.filter(k => META.arts.has(k)).length+' of '+ak.length+' found</h3><div class="col-grid">'+ak.map(k => META.arts.has(k) ? '<div class="col-item"><img class="ai" src="'+artImg(k)+'" alt=""><b>'+esc(ARTS[k].n)+'</b><span>'+esc(ARTS[k].d)+'</span></div>' : '<div class="col-item locked"><img class="ai" src="'+artImg(k)+'" alt=""><b>???</b>'+artRiddleHTML(k)+'</div>').join('')+'</div>'; }
  { const found = SECRETS.filter(x => isUnlocked(x.id)).length;
    h += '<h3>Secret troops · '+found+' of '+SECRETS.length+' found</h3><p class="lnote col-how">Six peoples are hidden in this land. Find the secret of their troops and you can lead them. Read the clues.</p><div class="col-grid">'+SECRETS.map(x => { const on = isUnlocked(x.id), C = CARDS[x.id], lv = on ? Math.min(8, mCap(x.id)) : 1, u = USPR.ok && USPR.m[x.id] ? artURL('sec_'+x.id+'_'+lv, () => uPortrait(x.id, lv)) : '';
      if(on) return '<div class="col-item secret-item">'+(u ? '<img class="evo" src="'+u+'" alt="" style="--ec:#c8a8ff">' : '')+'<b>✦ '+esc(C.n)+' <em class="stars">'+mStars(x.id)+'</em></b><span>'+esc(C.d)+'<br>'+vsHTML(x.id)+(SIG[x.id] ? '<br>✦ Lv 8 signature: '+esc(SIG[x.id].n) : '')+'</span></div>';
      const stirred = (META.stir||[]).includes(x.id); return '<div class="col-item locked secret-item'+(stirred ? ' stirred' : '')+'">'+(u ? '<img class="evo sil sec" src="'+u+'" alt="">' : '<i class="secret">?</i>')+'<b>??? · '+x.era+'</b><span>“'+x.clue+'”'+(stirred ? '<br><em class="stir">✦ Something stirred in your last game…</em>' : '')+'</span></div>'; }).join('')+'</div>'; }
  h += '<h3>Legendary unions · '+legs.filter(e => META.leg.has(e.id)).length+' of '+legs.length+' learned</h3><div class="col-grid">'+legs.map(evItem).join('')+'</div>';
  h += '<p class="lnote">Recipes stay hidden until you discover one. Max a troop line, pair it with the right civic or line, and open a War Chest to find out. Each rival nation guards one legendary union, which it fields late in the game: defeat that nation to learn it. Unions and evolutions happen when you open a War Chest. Only bosses carry them: barbarian Warlords and rival heroes. Conquering a nation or accepting its surrender also earns one.</p>';
  $('#colBody').innerHTML = h; $('#ovCollect').hidden = false; SFX.tick();
  colTabs(); META.colSeen = colSig(); saveLife(); refreshHome();
}
const COL_TABS = [['troops','Troops'],['peoples','Peoples'],['evos','Evolutions'],['arts','Artifacts'],['secrets','Secrets'],['civics','Civics']];
function colTabs(){
  const body = $('#colBody'), bar = $('#colTabs'); if(!body || !bar || !body.children) return;
  let cur = 'troops';
  for(const el of [...body.children]){
    if(el.tagName==='H3'){ const t = el.textContent; cur = /^Troops/.test(t) ? 'troops' : /^Peoples/.test(t) ? 'peoples' : /^Civics/.test(t) ? 'civics' : /^Artifacts/.test(t) ? 'arts' : /^Secret/.test(t) ? 'secrets' : 'evos'; }
    el.dataset.tab = cur;
  }
  const show = k => { R.colTab = k; for(const el of [...body.children]) el.hidden = el.dataset.tab !== k; bar.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t===k)); };
  bar.innerHTML = COL_TABS.map(([k,n]) => '<button data-t="'+k+'" role="tab">'+(UIA['t_'+k] ? '<img src="'+UIA['t_'+k]+'" alt="">' : '')+'<span>'+n+'</span></button>').join('');
  bar.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { show(b.dataset.t); SFX.tick && SFX.tick(); }));
  show(R.colTab || 'troops');
}
const colSig = () => [META.unl.size, META.disc.size, Object.values(META.hint).reduce((a,b) => a+b, 0), META.arts.size, Object.keys(CARDS).map(mRank).join('')].join('|');
function closeCollect(){ modal = R.colPrev || null; R.colPrev = null; $('#ovCollect').hidden = true; refreshHome(); }
function buildListPick(){
  const el = $('#listPick'); if(!el || !el.querySelectorAll) return;
  const nat = NATIONS_P.find(n => n.id===R.nation && natOK(n)) || NATIONS_P[0], cur = armyListFor(nat), fixed = nat.start;
  const ids = Object.keys(CARDS).filter(isUnlocked).sort((a,b) => CARDS[a].era - CARDS[b].era), lockedN = Object.keys(CARDS).filter(id => !CARDS[id].secret && !isUnlocked(id)).length;
  el.innerHTML = ids.map(id => { const on = cur.includes(id), fx = fixed.includes(id), C = CARDS[id];
    const img = USPR.ok && USPR.m[id] ? artURL('lp_'+id+'_'+pcol(), () => uPortrait(id, Math.min(8, mCap(id)))) : '';
    return '<button data-u="'+id+'" class="'+(on ? 'on' : '')+(fx ? ' fixed' : '')+'">'+(img ? '<img src="'+img+'" alt="">' : '<i class="noimg"></i>')+'<b>'+C.n+'</b><span>'+(fx ? 'Your people’s troop' : C.tags.slice(0,2).join(' · ')+(C.era ? ' · from '+ERAS[C.era] : ''))+'</span><em>'+mStars(id)+' · Lv '+mCap(id)+'</em></button>'; }).join('') +
    (lockedN ? '<p class="lnote">'+lockedN+' more troop lines to unlock, and secrets beyond them. See the Collection.</p>' : '');
  const k = $('#listKicker'); if(k) k.textContent = 'Your army · '+cur.length+' of '+LIST_MAX+' troop lines';
  el.querySelectorAll('button[data-u]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.u; if(fixed.includes(id)) return;
    let L = cur.slice();
    if(L.includes(id)) L = L.filter(x => x!==id);
    else { if(L.length >= LIST_MAX){ const j = L.map((x,i) => fixed.includes(x) ? -1 : i).filter(i => i >= 0).pop(); if(j == null) return; L.splice(j, 1); } L.push(id); }
    R.list = L; try { localStorage.setItem('eh-list', JSON.stringify(L)); } catch(e){}
    SFX.tick && SFX.tick(); buildListPick();
  }));
}
function buildNatPick(){
  try { buildListPick(); } catch(e){}
  const el = $('#natPick'); if(!el || !el.querySelectorAll) return;
  if(!NATIONS_P.find(n => n.id===R.nation && natOK(n))) R.nation = 'horde';
  el.innerHTML = NATIONS_P.filter(n => !n.secret || natOK(n) || (META.met||[]).includes(n.id)).map(n => { const ok = natOK(n), lockA = !ok && (n.secret ? {d:(achFor(n.id)||{}).d || '“'+((SECRETS.find(x => x.id===n.id)||{}).clue||'')+'”'} : n.lock ? ACH.find(a => a.id==='nat:'+n.id) : achFor(n.start.find(id => !isUnlocked(id))));
    return '<button data-n="'+n.id+'" class="'+(R.nation===n.id ? 'on' : '')+(ok ? '' : ' locked')+'"'+(ok ? '' : ' disabled')+'>'+(HSPR.ok && (HSPR.m[n.id] || HEROES[n.id]) ? '<img class="np-hero" src="'+hsprPortrait(n.id)+'" alt="'+esc(HEROES[n.id].n)+'">' : '')+'<b><i class="sw" style="background:'+PEOPLE[n.id].col+'"></i>'+n.n+(ok ? '' : ' 🔒')+'</b><span>'+(ok ? 'Starts with '+n.start.map(id => CARDS[id].n).join(' and ')+'. '+n.perk+'. Hero: '+HEROES[n.id].n+'. '+HEROES[n.id].sig+'.' : 'Locked. '+(lockA ? lockA.d : '')+' to unlock them.')+'</span></button>'; }).join('');
  el.querySelectorAll('button:not([disabled])').forEach(b => b.addEventListener('click', () => { R.nation = b.dataset.n; buildNatPick(); }));
  const dp = $('#diffPick'); if(dp && dp.querySelectorAll){
    if(R.diff == null){ try { R.diff = localStorage.getItem('eh-diff')==='0' ? 0 : 1; } catch(e){ R.diff = 1; } }
    if(R.diff === 2) R.diff = 1;
    if(R.crown == null){ try { R.crown = +(localStorage.getItem('eh-crown')||0) || 0; } catch(e){ R.crown = 0; } }
    const mc = META.crown||0; R.crown = Math.max(0, Math.min(R.crown, mc)); const on = R.diff !== 0, c = R.crown;
    dp.innerHTML = '<button data-d="0" class="'+(on ? '' : 'on')+'"><b>Chieftain</b><span>Learning mode. Gentler rivals and smaller raids. Glory ×0.8, and wins do not count for Crowns</span></button>'+
      '<button data-d="1" class="'+(on ? 'on' : '')+'"><b>'+(c ? kImg('cr_'+crTier(c))+'Crown '+c+' · '+CROWNS[c].n : 'King · Crown 0')+'</b><span>'+(c ? 'Glory ×'+crownMul(c)+'. Every twist up to Crown '+c+' is in play' : 'The intended challenge. Rivals counter your army. Win to open Crown 1')+'</span></button>'+
      '<div class="crownrow">'+Array.from({length:11}, (_, i) => '<button data-c="'+i+'" class="'+(on && i===c ? 'on' : '')+(i > mc ? ' locked' : '')+'"'+(i > mc ? ' disabled title="Win at Crown '+(i-1)+' to open"' : ' title="'+esc(CROWNS[i].n)+'"')+'>'+(i > mc ? '🔒' : i===0 ? 'K' : i)+'</button>').join('')+'</div>'+
      '<div class="crowntw">'+(on && c ? CROWNS.slice(1, c+1).map((cr, i) => '<span><b>'+(i+1)+' · '+esc(cr.n)+'</b> '+esc(cr.d)+'</span>').join('') : mc ? '<span>Pick a Crown above. Each one adds a twist on top of the ones below it, and pays more Glory.</span>' : '<span>Win on King to open the Crown ladder: ten Crowns, each adding a twist and more Glory.</span>')+'</div>';
    dp.querySelectorAll('button[data-d]').forEach(b => b.addEventListener('click', () => { R.diff = +b.dataset.d; try { localStorage.setItem('eh-diff', String(R.diff)); } catch(e){} buildNatPick(); }));
    dp.querySelectorAll('button[data-c]:not([disabled])').forEach(b => b.addEventListener('click', () => { R.crown = +b.dataset.c; R.diff = 1; try { localStorage.setItem('eh-crown', String(R.crown)); localStorage.setItem('eh-diff', '1'); } catch(e){} buildNatPick(); }));
  }
}

const UIA = {"logo":"art/uia/logo.png","logo2":"art/uia/logo2.png","logo3":"art/uia/logo3.webp","crest":"art/uia/crest.png","victory":"art/uia/victory.png","defeat":"art/uia/defeat.png","i_start":"art/menu/i_start.png","i_cont":"art/menu/i_cont.png","i_legacy":"art/menu/i_legacy.png","i_collect":"art/menu/i_collect.png","i_unlock":"art/menu/i_unlock.png","i_arena":"art/menu/i_arena.png","i_how":"art/menu/i_how.png","i_opts":"art/menu/i_opts.png","t_troops":"art/tabs/t_troops.png","t_peoples":"art/tabs/t_peoples.png","t_evos":"art/tabs/t_evos.png","t_arts":"art/tabs/t_arts.png","t_secrets":"art/tabs/t_secrets.png","t_civics":"art/tabs/t_civics.png","t_extra":"art/tabs/t_extra.png","l_might":"art/legacy/l_might.png","l_vigor":"art/legacy/l_vigor.png","l_swift":"art/legacy/l_swift.png","l_hero":"art/legacy/l_hero.png","l_harvest":"art/legacy/l_harvest.png","l_industry":"art/legacy/l_industry.png","l_wisdom":"art/legacy/l_wisdom.png","l_renown":"art/legacy/l_renown.png","l_walls":"art/legacy/l_walls.png","l_treasury":"art/legacy/l_treasury.png","l_muster":"art/legacy/l_muster.png","l_fortune":"art/legacy/l_fortune.png","l_exile":"art/legacy/l_exile.png","l_spoils":"art/legacy/l_spoils.png"};
function uiImgs(root){ (root||document).querySelectorAll('img[data-ui]').forEach(im => { const u = UIA[im.dataset.ui]; if(u && im.getAttribute('src') !== u) im.src = u; }); }
