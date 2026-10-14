"use strict";
/* ---------- HUD ---------- */
let hudAcc = 0;
function buildStrip(){
  const el = $('#nations'); if(!el || !el.querySelectorAll) return;
  el.innerHTML = G.rivals.map(r => '<button class="nation" data-r="'+r.id+'" style="--nc:'+r.col+'"><i></i><span class="nm">'+esc(r.name)+'</span><span class="st"></span></button>').join('');
  el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => openDiplo(+b.dataset.r)));
}

/* ---------- Damage meter: how every line is doing, live ---------- */
const fmtK = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e4 ? Math.round(n/1e3)+'k' : n >= 1e3 ? (n/1e3).toFixed(1)+'k' : String(Math.round(n));
function meterTick(){
  const el = $('#dmgMeter'); if(!el || !el.querySelector) return;
  if(!G || G.demo || G.arena || modal==='end'){ el.hidden = true; return; }
  el.hidden = false;
  const now = G.t, H = R.dmgH || (R.dmgH = []);
  if(!H.length || now - H[H.length-1].t >= 1){ const snap = {}; for(const k in (G.dmg||{})) if(k.startsWith(PLAYER+':')) snap[k] = G.dmg[k].d; H.push({t:now, d:snap}); while(H.length > 12) H.shift(); }
  const mk = String(G.cards.length)+(R.meterOff ? 'x' : '')+R.lTab+(R.gAll ? 'a' : '')+R.pin;
  if(now - (R.meterT||-9) < .5 && el.dataset.k === mk) return;
  R.meterT = now; el.dataset.k = mk;
  let GL = []; try { GL = goalsLive(); goalsTrack(GL); } catch(e){}
  el.classList.toggle('off', !!R.meterOff);
  const old = H.find(h => now - h.t <= 10.5) || H[0], span = Math.max(1, now - old.t);
  const rows = [];
  const row = (key, name, img, ev) => { const e = (G.dmg||{})[PLAYER+':'+key] || {d:0, k:0}; rows.push({key, name, img, ev, d:e.d, k:e.k, dps:Math.max(0, (e.d - (old.d[PLAYER+':'+key]||0))/span)}); };
  for(const sl of G.cards){ const lv = Math.min(8, sl.lvl), u = USPR.ok && USPR.m[sl.id] ? artURL('us_'+sl.id+'_'+lv+'_'+pcol(), () => uPortrait(sl.id, lv)) : ''; row(sl.id, cardName(PLAYER, sl.id), u, !!sl.evo); }
  row('hero', (heroOf(PLAYER)||{}).name || 'Your general', HSPR.ok && (HSPR.m[G.perk] || HEROES[G.perk]) ? hsprPortrait(G.perk) : '', false);
  if(((G.dmg||{})[PLAYER+':tower']||{}).d) row('tower', 'Towers', '', false);
  rows.sort((a,b) => b.d - a.d);
  const mx = Math.max(1, ...rows.map(r => r.d)), tot = rows.reduce((a,r) => a + r.d, 0), tdps = rows.reduce((a,r) => a + r.dps, 0);
  const gt = R.lTab==='goals', dot = !gt && R.gDot != null && now - R.gDot < 4;
  el.innerHTML = '<div class="lp-h"><button class="lp-t'+(gt ? '' : ' on')+'" data-tab="dmg" title="Damage meter"><img class="ui-ic" src="'+KIT.u_dmg+'" alt=""><b>Damage</b><span>'+fmtK(tdps)+'/s</span></button><button class="lp-t'+(gt ? ' on' : '')+'" data-tab="goals" title="Goals you can reach this game"><img class="ui-ic" src="'+KIT.u_goals+'" alt=""><b>Goals</b>'+(dot ? '<i class="dot"></i>' : '<span>'+GL.length+'</span>')+'</button><button class="lp-c" id="dmToggle" title="Show or hide (T)">'+(R.meterOff ? '▸' : '▾')+'</button></div>'+
    (R.meterOff ? '' : gt ? goalsHTML(GL) : rows.map(r => '<div class="dm-r'+(r.ev ? ' ev' : '')+'" title="'+esc(r.name)+': '+Math.round(r.d).toLocaleString()+' damage · '+r.k.toLocaleString()+' kills"><span class="dm-i">'+(r.img ? '<img src="'+r.img+'" alt="">' : '<i>'+(r.key==='tower' ? '▲' : '?')+'</i>')+'</span><span class="dm-n">'+esc(r.name)+'</span><span class="dm-v">'+fmtK(r.dps)+'/s <small>'+fmtK(r.d)+'</small></span><span class="dm-b"><s style="width:'+(r.d/mx*100).toFixed(1)+'%"></s></span></div>').join(''));
  const tg = el.querySelector('#dmToggle'); if(tg) tg.onclick = e => { e.stopPropagation(); toggleMeter(); };
  el.onclick = e => { const t = e.target.closest ? e.target.closest('[data-tab],[data-pin],[data-more]') : null; if(!t) return; e.stopPropagation();
    if(t.dataset.tab){ R.lTab = t.dataset.tab; if(R.meterOff) R.meterOff = false; try { localStorage.setItem('eh-ltab', R.lTab); } catch(er){} }
    else if(t.dataset.pin){ R.pin = R.pin===t.dataset.pin ? '' : t.dataset.pin; try { localStorage.setItem('eh-pin', R.pin); } catch(er){} SFX.tick && SFX.tick(); }
    else if(t.dataset.more) R.gAll = !R.gAll;
    R.meterT = -9; meterTick(); };
}
function toggleMeter(){ R.meterOff = !R.meterOff; try { localStorage.setItem('eh-meter', R.meterOff ? '0' : '1'); } catch(e){} R.meterT = -9; meterTick(); }


/* ---------- v80: HUD art helpers ---------- */
const UTI = {};
function uiTint(){
  const col = pcol(); if(R.uiTintC === col) return;
  const imgs = document.querySelectorAll ? document.querySelectorAll('img[data-tint]') : []; let ok = true;
  imgs.forEach(im => { const k = im.dataset.kit; if(!KIT[k]) return; let src = UTI[k]; if(!src){ src = UTI[k] = new Image(); src.src = KIT[k]; }
    if(!src.complete || !src.naturalWidth){ ok = false; return; }
    const u = artURL('ut_'+k+'_'+col, () => { const c = mkCanvas(src.naturalWidth, src.naturalHeight); c.getContext('2d').drawImage(src, 0, 0); return greenTint(c, hexRgb(col)); }); if(u && im.getAttribute('src') !== u) im.src = u; });
  if(ok) R.uiTintC = col;
}
try { R.natAll = localStorage.getItem('eh-natall') === '1'; } catch(e){}
try { R.pin = localStorage.getItem('eh-pin') || ''; } catch(e){}
try { R.lTab = localStorage.getItem('eh-ltab') || 'dmg'; } catch(e){}
/* ---------- Goals: what this game can still unlock ---------- */
const G_REQ = {longbow:'slingers', knights:'horse', crossbow:'longbow'};
function goalsLive(){
  const out = [], inArmy = id => G.cards.some(sl => sl.id===id);
  if(G.perk && QUESTS[G.perk]) QUESTS[G.perk].forEach((q, k) => { const qid = G.perk+':'+k; if(META.qd.has(qid) || q.win) return; let v = 0; try { v = q.v(); } catch(e){} out.push({id:'q:'+qid, ic:'u_goals', name:(G.natName || 'People')+' quest '+(k+1), d:q.d+' · +'+Q_REW[k]+' Glory', v, g:q.g}); });
  for(const a of ACH){ if(isUnlocked(a.id) || !a.prog) continue; let p; try { p = a.prog(); } catch(e){ continue; } if(!p || p[1] <= 1 || p[0] >= p[1]) continue; if(G_REQ[a.id] && !inArmy(G_REQ[a.id])) continue;
    if(a.secret){ const sc = SECRETS.find(x => x.id===a.id); out.push({id:'a:'+a.id, ic:'u_g_hidden', name:'A hidden people', d:sc ? '“'+sc.clue+'”' : '???', v:p[0], g:p[1]}); }
    else { const nat = a.id.startsWith('nat:'); out.push({id:'a:'+a.id, ic:nat ? 'u_g_people' : 'u_g_troop', img:CARDS[a.id] ? troopImg(a.id, 1) : '', name:'Unlock '+achName(a), d:a.d, v:p[0], g:p[1]}); } }
  for(const sl of G.cards){ const r = mRank(sl.id); if(r >= MX_T.length) continue; const x = META.mx[sl.id]||0, lo = r ? MX_T[r-1] : 0; out.push({id:'m:'+sl.id, ic:'u_g_mastery', img:troopImg(sl.id, Math.min(8, sl.lvl)), name:cardName(PLAYER, sl.id)+' · mastery '+(r+1), d:mPerk(r+1), v:Math.floor(x - lo), g:MX_T[r] - lo}); }
  for(const sl of G.cards){ let st; try { st = evoStatus(sl); } catch(e){ continue; }
    if(st.state==='ready') out.push({id:'e:'+sl.id, ic:'u_g_relic', name:known(st.ev) ? st.ev.n : 'Something stirs', d:'Ready · slay a rival general to awaken it', v:1, g:1, ready:1});
    else if(st.state==='path' && st.ev && st.ev.from===sl.id){ const L = evLv(st.ev); out.push({id:'e:'+sl.id, ic:'u_g_relic', name:st.ev.n, d:st.txt, v:Math.min(sl.lvl, L), g:L}); } }
  try { out.push(...holdGoals()); } catch(e){}
  out.forEach(o => { o.f = Math.min(1, o.v/Math.max(1, o.g)); });
  out.sort((a,b) => (b.id===R.pin) - (a.id===R.pin) || (b.ready||0) - (a.ready||0) || b.f - a.f);
  return out;
}
function goalsTrack(L){
  const prev = R.gPrev || (R.gPrev = {}), now = G.t; const seen = {};
  let moved = null;
  for(const o of L){ seen[o.id] = 1; const p = prev[o.id];
    if(p && o.v > p.v){ o.upT = now; if(Math.floor(o.f*10) > Math.floor(p.f*10) && !moved) moved = o; }
    else if(p && now - (p.upT||-9) < 1.2) o.upT = p.upT;
    prev[o.id] = {v:o.v, f:o.f, upT:o.upT, name:o.name, ic:o.ic, img:o.img}; }
  for(const id in prev){ if(seen[id]) continue; const p = prev[id]; delete prev[id];
    if(/^[aq]:/.test(id) && R.gInit){ (R.gDone = R.gDone || []).push({id, name:p.name, ic:p.ic, img:p.img, t:now}); if(R.pin===id) R.pin = ''; goalTick({name:p.name, ic:p.ic, img:p.img, f:1, done:1}); } }
  R.gDone = (R.gDone||[]).filter(d => now - d.t < 6);
  if(moved && R.gInit) { goalTick(moved); if(R.lTab !== 'goals') R.gDot = now; }
  R.gInit = true;
}
function goalTick(o){
  const el = $('#goalTick'); if(!el || !el.querySelector) return;
  el.innerHTML = '<img src="'+(o.img || KIT[o.ic] || '')+'" alt=""><b>'+esc(o.done ? o.name+' · done!' : o.name)+'</b>'+(o.done ? '' : '<span class="gtb"><s style="width:'+(o.f*100).toFixed(0)+'%"></s></span><em>'+Math.round(o.f*100)+'%</em>');
  el.classList.add('on'); clearTimeout(R.gtT); R.gtT = setTimeout(() => el.classList.remove('on'), 3200);
}
function goalsHTML(L){
  const now = G.t, rows = [];
  const row = (o, cls) => '<div class="gl-r'+cls+'" title="'+esc(o.name+': '+(o.d||''))+'"><span class="gl-i"><img src="'+(o.img || KIT[o.ic] || '')+'" alt=""></span><span class="gl-n"><b>'+esc(o.name)+'</b><small>'+esc(o.d||'')+'</small></span><span class="gl-v">'+(o.done ? 'Done!' : o.ready ? 'Ready' : fmtK(Math.min(o.v, o.g))+'/'+fmtK(o.g))+(o.done ? '' : '<button class="gl-p" data-pin="'+esc(o.id)+'" title="'+(R.pin===o.id ? 'Unpin' : 'Pin this goal to the top')+'"><img src="'+KIT.u_pin+'" alt="Pin"></button>')+'</span>'+(o.done ? '' : '<span class="gl-b"><s style="width:'+(o.f*100).toFixed(1)+'%"></s></span>')+'</div>';
  (R.gDone||[]).forEach(d => rows.push(row(Object.assign({done:1, f:1}, d), ' done')));
  const show = R.gAll ? L : L.slice(0, Math.max(0, 3 - rows.length));
  show.forEach(o => rows.push(row(o, (o.id===R.pin ? ' pin' : '')+(o.ready ? ' ready' : '')+(o.upT != null && now - o.upT < 1 ? ' up' : ''))));
  if(!rows.length) return '<div class="gl-empty">Nothing left to unlock this game. Check the Collection for what comes next.</div>';
  return '<div class="gl-list'+(R.gAll ? ' all' : '')+'">'+rows.join('')+'</div>'+(L.length > 3 ? '<button class="gl-more" data-more="1">'+(R.gAll ? 'Show fewer' : 'Show all '+L.length+' goals')+'</button>' : '');
}

/* ---------- Battles with decisions: hosts, the line, the generals ---------- */
function hostNote(o, c, sx, sy){
  if(G.arena || G.demo) return;
  let n = 0, x = 0, y = 0, sp = 0; const cc = {};
  for(const u of G.units){ if(u.owner!==o || u.hp<=0 || !u.card || u.hero || u.kind==='support' || !isRaider(u)) continue; n++; x += u.x; y += u.y; sp += uStat(u).spd; cc[u.card] = (cc[u.card]||0) + 1; }
  if(n < 6) return;
  x /= n; y /= n; sp = sp/n*.75;
  const go = !!R.raidGo.get(o), d = Math.hypot(c.x+.5-x, c.y+.5-y);
  const comp = Object.keys(cc).sort((a,b) => cc[b]-cc[a]).slice(0, 3).map(id => cardName(o, id));
  R.hostsN.push({o, n, x, y, sx, sy, c:c.id, cn:c.name, comp, go, eta:go ? Math.round(d/Math.max(.2, sp)) : null});
}
function hostAct(i, act){
  const H = (R.hosts||[])[i], h = heroOf(PLAYER); if(!H || !h) return;
  const c = G.cities.find(k => k.id===H.c);
  if(act==='meet'){ h.tcity = 0; h.goal = {x:clamp(H.go ? (H.x + (c ? c.x+.5 : H.x))/2 : H.sx, .3, N-.3), y:clamp(H.go ? (H.y + (c ? c.y+.5 : H.y))/2 : H.sy, .3, N-.3)}; setOrder('charge'); toast(h.name+' rides out to meet the '+rival(H.o).name+' host','good'); }
  else if(act==='hold'){ if(c){ h.tcity = 0; h.goal = {x:c.x+.5, y:c.y+1.2}; setOrder('hold'); toast(h.name+' holds '+c.name+'. Towers and the garrison fight beside you','good'); } }
  else if(act==='strike'){ const r = rival(H.o), tgt = citiesOf(H.o).sort((a,b) => Math.hypot(a.x-h.x, a.y-h.y) - Math.hypot(b.x-h.x, b.y-h.y))[0]; if(tgt){ h.goal = null; h.tcity = tgt.id; setOrder('charge'); toast('⚔ While their host is away, '+h.name+' strikes '+tgt.name,'good'); } }
  R.heroMark = {x:h.goal ? h.goal.x : h.x, y:h.goal ? h.goal.y : h.y, t:.8}; SFX.tick && SFX.tick(); R.hostKey = '';
}
function hostHud(){
  const el = $('#hostAlerts'); if(!el || !el.querySelector) return;
  const small = innerWidth < 760, inBat = !!(R.bat && G && G.t - R.bat.last < 3);
  const L = (!G || G.demo || G.arena || modal==='end' || (small && inBat)) ? [] : (R.hosts||[]).slice().sort((a,b) => (b.go - a.go) || (b.n - a.n)).slice(0, small ? 1 : 2);
  const key = L.map(H => H.o+':'+H.n+':'+H.go+':'+(H.eta == null ? '' : Math.ceil(H.eta/5))+':'+H.c).join('|');
  if(key === R.hostKey) return; R.hostKey = key;
  el.hidden = !L.length;
  el.innerHTML = L.map(H => { const r = rival(H.o), i = (R.hosts||[]).indexOf(H); return '<div class="host'+(H.go ? ' go' : '')+'" style="--hc:'+r.col+'"><div class="hh"><b>'+(H.go ? '⚔ ' : '⚑ ')+esc(r.name)+' host · '+H.n+'</b><span>'+(H.go ? 'Marching on '+esc(H.cn)+(H.eta != null ? ' · about '+H.eta+'s' : '') : 'Gathering to strike '+esc(H.cn))+'</span><small>'+H.comp.map(esc).join(' · ')+'</small></div>'+
    '<div class="hb"><button data-i="'+i+'" data-a="meet" title="Ride out and meet them in the field">Meet</button><button data-i="'+i+'" data-a="hold" title="Hold the city with its towers and garrison">Hold city</button><button data-i="'+i+'" data-a="strike" title="Hit their homeland while the host is away">Strike back</button></div></div>'; }).join('');
  el.querySelectorAll('button[data-a]').forEach(b => b.onclick = () => hostAct(+b.dataset.i, b.dataset.a));
}
function battleTick(dt){
  const h = heroOf(PLAYER), B = R.bat;
  if(!h){ if(B) R.bat = null; return; }
  const RR = 6.5, by = {}; let nE = 0;
  for(const u of G.units){ if(u.hp<=0 || u.owner<=1 || !u.card || !atWar(PLAYER, u.owner)) continue; if((u.x-h.x)**2 + (u.y-h.y)**2 > RR*RR) continue; (by[u.owner] = by[u.owner] || []).push(u); }
  let o = 0, best = 0; for(const k in by){ const n = by[k].filter(u => !u.hero).length; if(n > best){ best = n; o = +k; } }
  if(!o || best < 6){ if(B && G.t - B.last > 4) R.bat = null; return; }
  const r = rival(o); if(!r || !r.alive) return;
  const pw = u => { const st = uStat(u); return Math.max(0, u.hp)*st.dmg/Math.max(.2, st.cd); };
  let th = 0, rout = 0; for(const u of by[o]){ if(u.rout > 0){ rout++; continue; } th += pw(u)*(u.hero ? .5 : 1); }
  let us = 0, nU = 0; for(const u of G.units){ if(u.hp<=0 || u.owner!==PLAYER || !u.card) continue; if((u.x-h.x)**2 + (u.y-h.y)**2 > RR*RR) continue; us += pw(u)*(u.hero ? .5 : 1); nU++; }
  th *= .55 + .45*(r.morale ?? 70)/70;
  const v = us/Math.max(1, us + th);
  let b = B && B.o===o ? B : null;
  if(!b){ if(B && B.o!==o && G.t - B.last < 2) return; if(G.t < ((r.batCD)||0)) return; const c = G.cities.slice().sort((a,b2) => Math.hypot(a.x-h.x, a.y-h.y) - Math.hypot(b2.x-h.x, b2.y-h.y))[0]; b = R.bat = {o, v, t0:G.t, n0:best, hi:0, warned:false, name:c ? c.name : 'the field'}; }
  b.v += (v - b.v)*.5; b.last = G.t; b.nE = best; b.nU = nU; b.rout = rout;
  if(b.v > .68) b.hi += dt; else b.hi = 0;
  if(!b.broken && G.t - b.t0 > 3 && (b.hi >= 1 || best <= b.n0*.4)){
    b.broken = true; b.brokeT = G.t; r.batCD = G.t + 18;
    let k = 0, cx = 0, cy = 0;
    for(const u of G.units){ if(u.owner!==o || u.hp<=0 || u.hero || !u.card || (u.x-h.x)**2 + (u.y-h.y)**2 > 81) continue; u.rout = 5 + Math.random()*2.5; u.tgt = 0; u.tcity = 0; u.fol = 0; k++; cx += u.x; cy += u.y; }
    moraleHit(r, 10); G.stats.breaks = (G.stats.breaks||0) + 1;
    banner('Their line breaks!', r.name+' flees the field'); SFX.q && SFX.q('horn', h.x, h.y, 1); MUS.sting && MUS.sting('break'); R.shake = Math.min(4, (R.shake||0) + 2);
    if(k){ cx /= k; cy /= k; ring(cx, cy, .3, 3, '#c8f0a0', 1); float('ROUT ×'+k, cx, cy-1, '#c8f0a0', 1.4); }
  }
  if(!b.warned && !b.broken && G.t - b.t0 > 3 && b.v < .33){ b.warned = true; toast('Your line wavers against '+r.name+'. Hold (E) to brace or Fall back (R)', 'warn', {x:h.x, y:h.y}); }
}
function battleHud(){
  const el = $('#battleBar'); if(!el || !el.querySelector) return;
  const pn = performance.now(); if(pn - (R.bhT||0) < 150) return; R.bhT = pn;
  const h = G && !G.demo && !G.arena && modal!=='end' ? heroOf(PLAYER) : null;
  let boss = null;
  if(h){ let bd = 81; for(const u of G.units){ if(u.hp<=0 || !((u.hero && u.owner > 1 && atWar(PLAYER, u.owner)) || (u.owner===0 && BARB[u.kind] && BARB[u.kind].boss))) continue; const d = (u.x-h.x)**2 + (u.y-h.y)**2; if(d < bd){ bd = d; boss = u; } } }
  const B = h && R.bat && G.t - R.bat.last < 3 ? R.bat : null;
  if(!B && !boss){ if(!el.hidden) el.hidden = true; return; }
  el.hidden = false;
  let html = '';
  if(boss){ const st = boss.owner===0 ? {hp:boss.max||boss.hp} : uStat(boss), r = boss.owner===0 ? {name:boss.reb ? 'Rebels' : 'Barbarians', col:'#d0703a'} : rival(boss.owner), H = boss.owner===0 ? {n:'Warlord'} : (HEROES[boss.hero] || {}), tl = boss.teleT ? Math.max(0, boss.teleT - G.t) : 0;
    html += '<div class="boss" style="--bc:'+r.col+'"><div class="bn"><b>'+esc(boss.name || H.n || 'General')+'</b><span>'+esc(r.name)+(boss.enr ? ' · enraged' : '')+'</span>'+(tl > 0 ? '<em>⚠ '+esc(H.act || 'Ability')+' in '+tl.toFixed(1)+'s</em>' : '')+'</div><div class="bhp"><s style="width:'+Math.max(0, boss.hp/st.hp*100).toFixed(1)+'%"></s></div></div>'; }
  if(B){ const r = rival(B.o), pct = Math.round(B.v*100);
    html += '<div class="bat'+(B.broken && G.t - B.brokeT < 3 ? ' broke' : '')+'" style="--rc:'+r.col+'"><div class="bl"><span class="them">'+esc(r.name)+' · '+B.nE+(B.rout ? ' <i>('+B.rout+' fleeing)</i>' : '')+'</span><b>'+(B.broken ? 'Rout!' : 'Battle of '+esc(B.name))+'</b><span class="us">You · '+B.nU+'</span></div><div class="bbar"><s class="t" style="width:'+(100-pct)+'%"></s><s class="u" style="width:'+pct+'%"></s><i class="brk"></i></div></div>'; }
  el.innerHTML = html;
}

/* ---------- Core line: your army is about one troop ---------- */
function focusTick(){
  if(!G.core || G.demo) return;
  let n = 0, c = 0; for(const u of G.units){ if(u.owner!==PLAYER || u.hp<=0 || u.hero || !u.card) continue; n++; if(u.card===G.core) c++; }
  const pct = n ? c/n : 0, f = n < 12 ? 0 : pct >= .75 ? 2 : pct >= .5 ? 1 : 0;
  G.focusPct = pct;
  if(f !== (G.focus||0)){ const up = f > (G.focus||0); G.focus = f; if(up && G.t > 20){ MUS.sting && MUS.sting('focus'); } if(up && G.t > 20) toast('♛ Focus: '+Math.round(pct*100)+'% of your army is '+cardName(PLAYER, G.core)+'. Core troops +'+(15*f)+'% health and damage. Rivals will counter them harder', 'good'); }
}
function hud(){
  try { battleHud(); hostHud(); declineHud(); } catch(e){}
  try { meterTick(); } catch(e){}
  try { streakHud(); } catch(e){}
  { const bf = document.getElementById('btnFollow'); if(bf && G) bf.hidden = !(R.camFree && heroOf(PLAYER)); }
  if(!G) return;
  heroHud();
  const el = id => document.getElementById(id);
  el('eraName').textContent = ERAS[G.eraIdx]+' Era';
  el('clock').textContent = fmt(G.t);
  const f = G.rates.f;
  el('vFood').textContent = (f>=0?'+':'')+f.toFixed(1);
  el('vProd').textContent = G.rates.p.toFixed(1);
  el('vSci').textContent = G.rates.s.toFixed(1);
  el('vInfl').textContent = Math.floor(G.influence);
  el('vCities').textContent = citiesOf(PLAYER).length+'/'+cityCap();
  el('vArmy').textContent = Math.round(G.armySup ?? armySup(PLAYER))+'/'+(G.armyCap||0);
  const mc = el('mclock'); if(mc){ mc.querySelector('b').textContent = 'Lv '+(G.level||0)+(G.maxed ? ' MAX' : ''); mc.querySelector('span').textContent = ERAS[G.eraIdx]; }
  const cost = researchCost(), pct = clamp(G.sci/cost,0,1);
  el('rFill').style.width = (pct*100).toFixed(1)+'%';
  const eta = G.rates.s > 0 ? Math.max(0, Math.ceil((cost - G.sci)/G.rates.s)) : 0;
  el('rText').textContent = 'Next level-up in '+(eta>=60 ? fmt(eta) : eta+'s')+' · +'+G.rates.s.toFixed(1)+' science/s' + (G.proj && G.proj.parts ? (G.proj.launching ? ' · LAUNCH IN '+Math.ceil(G.proj.launch)+'s' : ' · Starship parts '+G.proj.parts.map(pt => Math.floor(Math.min(1, pt.p/PART_NEED)*100)+'%').join(' / ')) : '');
  { const ev = el('envoy'), n = (G.offers||[]).length; ev.hidden = !n; ev.textContent = '✉ '+n+' envoy'+(n===1 ? '' : 's'); }
  { const al = el('alarm'), a = G.alarm||0; al.hidden = !a; al.textContent = a ? 'World: '+ALARM[a].n : ''; al.className = 'alarm a'+a; }
  const sb = el('settleBar');
  if(sb){ const on = !!(G.settle && !G.ended); sb.hidden = !on; el('stage').classList.toggle('settling', on); if(on) el('settleT').textContent = Math.max(0, Math.ceil(15 - (G.t - G.settle.t))); }
  const nextBoss = BOSSES.find(b => !G.bosses[b.t]);
  const raid = el('raid');
  if(nextBoss && nextBoss.t - G.t < 30 && nextBoss.t - G.t > 0){ raid.textContent = 'Warlord in '+Math.ceil(nextBoss.t-G.t)+'s'; raid.classList.add('soon'); }
  else { const w = Math.max(0, G.nextWave - G.t); raid.textContent = w < 1 ? 'Raid now' : 'Raid in '+Math.ceil(w)+'s'; raid.classList.toggle('soon', w < 5); }
  document.querySelectorAll('#decrees button').forEach(b => {
    const k = b.dataset.k, cd = G.cd[k];
    b.querySelector('.cd').style.height = (cd/DECREES[k]*100)+'%';
    b.classList.toggle('ready', cd <= 0 && G.influence >= DCOST[k]);
    const buff = k==='mobilize' ? G.buff.rally : k==='golden' ? G.buff.golden : G.buff.fortify;
    b.classList.toggle('live', buff > 0);
  });
  el('app').classList.toggle('golden', G.buff.golden > 0);
  renderArmyBar();
  { const nv = el('nations'), nt = el('natTog'); if(nv && nt){ const all = !!R.natAll; nv.classList.toggle('all', all); nt.classList.toggle('open', all); const alive = G.rivals.filter(r => r.alive).length; const nn = el('natN'); if(nn) nn.textContent = alive; nt.title = all ? 'Show only rivals that need you' : 'Show every rival'; } }
  { const hn = el('hint'); if(hn) hn.hidden = G.t > 75; }
  uiTint();
  G.rivals.forEach(r => {
    const b = document.querySelector('.nation[data-r="'+r.id+'"]'); if(!b) return;
    b.className = 'nation '+r.status+((G.offers||[]).some(o => o.r===r.id) ? ' offer' : '')+(r.alive && r.status==='war' && citiesOf(r.id).length <= 1 ? ' low' : '');
    b.querySelector('.st').textContent = r.proj && r.alive ? 'Ship '+Math.floor(r.proj.p*100)+'%' : STATUS[r.status];
    b.classList.toggle('ship', !!(r.proj && r.alive));
  });
}

/* ---------- Diplomacy panel ---------- */
function openDiplo(focus){
  if(!G || !running || G.ended || (modal && modal!=='diplo') || paused) return;
  modal = 'diplo'; R.dipFocus = focus || 0; R.warArm = null;
  renderDiplo();
  $('#ovDiplo').hidden = false;
  SFX.tick();
  const card = focus && document.getElementById('dip-'+focus);
  if(card && card.scrollIntoView) card.scrollIntoView({block:'nearest'});
}
function closeDiplo(){ modal = null; R.warArm = null; $('#ovDiplo').hidden = true; }
function actBtn(act, rid, label, sub, ok, danger){
  const armed = act==='war' && R.warArm && R.warArm.r===rid && performance.now() < R.warArm.until;
  if(armed){ label = 'Tap again to declare war'; sub = 'Every other nation will think less of you'; }
  return '<button data-act="'+act+'" data-r="'+rid+'" class="'+(danger?'danger':'')+(armed?' armed':'')+'"'+(ok?'':' disabled')+'><b>'+label+'</b><span>'+sub+'</span></button>';
}
function renderDiplo(){
  $('#dInfl').textContent = Math.floor(G.influence);
  { const al = G.alarm||0; $('#dAlarm').hidden = !al; $('#dAlarm').innerHTML = al ? '<b>World: '+ALARM[al].n+'.</b> '+ALARM[al].d+'.' : ''; }
  { const bl = borderLvl(), nx = CULT[bl+1]; $('#dRate').textContent = '+'+G.rates.i.toFixed(1)+'/s · borders level '+bl+' ('+tilesPerCity(bl)+' tiles per city)'+(nx ? ' · next at '+nx+' earned' : ''); }
  const inf = G.influence;
  { const offs = (G.offers||[]).map(o => ({o, ev:diploEvent(o)})).filter(x => x.ev);
    $('#dipOffers').innerHTML = offs.length ? '<h3>Envoys waiting</h3>'+offs.map(({o, ev}) => '<div class="offer-card" style="--nc:'+rival(o.r).col+'"><b>'+esc(ev.title)+'</b><span>'+esc(ev.text)+' · '+Math.max(0, Math.ceil(o.exp-G.t))+'s to answer'+(o.k==='tribute' ? '. Ignoring it insults them' : '')+'</span><div class="dip-acts"><button data-off="'+o.id+'" data-c="a"><b>'+esc(ev.a.l)+'</b><span>'+esc(ev.a.s)+'</span></button><button data-off="'+o.id+'" data-c="b"><b>'+esc(ev.b.l)+'</b><span>'+esc(ev.b.s)+'</span></button></div></div>').join('') : ''; }
  $('#dipList').innerHTML = G.rivals.map(r => {
    const head = '<div class="dip-head"><i></i><div><b>'+esc(r.name)+'</b><span>'+esc(r.leader)+' · '+TRAITS[r.trait].label+'</span></div><span class="status '+r.status+'">'+STATUS_LONG[r.status]+'</span></div>';
    if(!r.alive) return '<div class="dip-card gone" id="dip-'+r.id+'" style="--nc:'+r.col+'">'+head+'<p class="dip-note">'+(r.status==='joined' ? 'Now part of your empire.' : 'This nation has fallen. Its lands lie open.')+'</p></div>';
    const rel = Math.round(r.rel), w = Math.abs(rel)/2;
    const bar = '<i style="'+(rel<0 ? 'right:50%;width:'+w+'%;background:var(--blood)' : 'left:50%;width:'+w+'%;background:var(--food)')+'"></i>';
    const cs = citiesOf(r.id).length;
    const wars = G.rwars.filter(x => x.a===r.id || x.b===r.id).map(x => rival(x.a===r.id ? x.b : x.a).name);
    let note = cs+(cs===1?' city':' cities')+' · '+armyText(r.id);
    if(wars.length) note += ' · at war with '+wars.join(', ');
    if(r.status==='war') note += ' · war weariness '+Math.min(100, Math.round(r.weary/60*100))+'%';
    if(r.status!=='war' && (r.border > 6 || (r.near||99) < 19)) note += ' · <b style="color:#ff8a7e">border tension: they resent how close you are</b>'; else if(r.border > 0 && r.status!=='war') note += ' · your borders touch theirs';
    { const h = heroOf(r.id); if(h) note += ' · '+h.name+' leads their army'; }
    if(r.proj) note += ' · building a starship ('+Math.floor(r.proj.p*100)+'%)';
    const acts = [];
    const atw = r.status==='war';
    acts.push(actBtn('gift', r.id, 'Send gift', atw ? 'Not during war' : inf>=COST.gift ? COST.gift+' influence · relations up' : 'Needs '+COST.gift+' influence', !atw && inf>=COST.gift));
    if(r.status==='trade') acts.push(actBtn('untrade', r.id, 'End trade', 'Relations drop', true));
    else if(r.status==='ally') acts.push(actBtn('untrade', r.id, 'Trading', 'Part of your alliance', false));
    else acts.push(actBtn('trade', r.id, 'Open trade', atw ? 'Not during war' : r.rel<10 ? 'Needs Neutral relations (10+)' : inf<COST.trade ? 'Needs '+COST.trade+' influence' : COST.trade+' influence · +10% yields', !atw && r.rel>=10 && inf>=COST.trade));
    if(r.status==='ally') acts.push(actBtn('unally', r.id, 'Leave alliance', 'Relations drop', true));
    else acts.push(actBtn('ally', r.id, 'Form alliance', r.status!=='trade' ? 'Needs a trade deal first' : r.rel<50 ? 'Needs Devoted relations (50+)' : inf<COST.ally ? 'Needs '+COST.ally+' influence' : COST.ally+' influence · cheaper upkeep', r.status==='trade' && r.rel>=50 && inf>=COST.ally));
    if(atw){
      const wait = G.t - r.peaceTry < 10;
      acts.push(actBtn('peace', r.id, 'Offer peace', G.coal ? 'The coalition won’t talk. Make them surrender' : wait ? 'They just refused' : inf<COST.peace ? 'Needs '+COST.peace+' influence' : COST.peace+' influence if they accept', !G.coal && !wait && inf>=COST.peace));
    } else acts.push(actBtn('war', r.id, 'Declare war', 'Your army marches on their cities', true, true));
    if(r.status==='ally'){
      const wait = Math.max(0, Math.ceil(90 - (G.t - r.allyT))), uc = unionCost(), small = citiesOf(r.id).length < citiesOf(PLAYER).length;
      acts.push(actBtn('union', r.id, 'Propose union', wait ? 'Stay allied '+wait+'s more first' : r.rel<unionRel() ? 'Needs relations of '+unionRel()+'+' : !small ? 'They must have fewer cities than you' : inf<uc ? 'Needs '+uc+' influence' : uc+' influence · they join your empire', !wait && r.rel>=unionRel() && small && inf>=uc).replace('<button ', '<button style="grid-column:1/-1" '));
    }
    return '<div class="dip-card '+r.status+(R.dipFocus===r.id?' focus':'')+'" id="dip-'+r.id+'" style="--nc:'+r.col+'">'+head+
      '<div class="rel"><div class="rel-row"><span>Relations</span><span><b>'+relLabel(rel)+'</b> '+(rel>0?'+':'')+rel+'</span></div><div class="relbar">'+bar+'</div></div>'+
      '<div class="dip-row"><p class="dip-note">'+note+'</p><button class="linkbtn" data-act="look" data-r="'+r.id+'">Show on map</button></div><div class="dip-acts">'+acts.join('')+'</div></div>';
  }).join('');
}

function renderArmyBar(){
  const el = $('#armybar'); if(!el || !G || !el.querySelectorAll) return;
  const slots = cardSlots(), key = slots+JSON.stringify(G.cards)+JSON.stringify(G.relics||[]);
  if(key===R.armyKey) return; R.armyKey = key;
  let h = '';
  for(let i=0;i<slots;i++){
    const sl = G.cards[i];
    if(sl){
      const ev = sl.evo && UEVO.find(e => e.id===sl.evo), es = evoStatus(sl), rk = rankOf(sl.lvl);
      const art = USPR.ok && !ev ? artURL('us_'+sl.id+'_'+sl.lvl+'_'+pcol(), () => uPortrait(sl.id, sl.lvl)) : artURL('s_'+sl.id+'_'+sl.lvl+'_'+(sl.evo||''), () => unitSprite({owner:PLAYER, card:sl.id, lvl:sl.lvl, ev}).n), cap = lvlCap(PLAYER);
      const pips = '<span class="pips">'+Array.from({length:8}, (_,k) => '<i class="'+(k < sl.lvl ? (k >= 7 ? 'g' : 'on') : k >= cap ? 'x' : '')+'"></i>').join('')+'</span>';
      h += '<button class="slot troop'+(ev?' evo':'')+(es.state==='ready' ? ' ready' : '')+'" title="'+esc(CARDS[sl.id].n+' · Lv '+sl.lvl+' '+FORM_ERA[sl.lvl-1]+' form'+(sl.lvl >= cap && cap < 8 ? ' · capped: '+capNote() : '')+' · '+es.txt)+'">'+(art ? '<img src="'+art+'" alt="">' : '<span></span>')+'<b>'+(isCore(sl.id) ? kImg('mk_core', 'coreic') : '')+esc(cardName(PLAYER, sl.id))+'</b><span class="trk">'+pips+esc(es.state==='hidden' ? '◆ ?' : es.txt)+'</span></button>';
    }
    else h += '<button class="slot empty"><b>Empty slot</b><span>Fill when you level up</span></button>';
  }
  for(const r of (G.relics||[])) h += '<button class="slot relic"><b>'+RELICS[r.id].n+'</b><span>Civic · Lv '+r.lvl+'</span></button>';
  el.innerHTML = h;
}
function openArmy(){
  if(!G || !running || G.ended || modal || paused) return;
  modal = 'army'; renderArmy(); $('#ovArmy').hidden = false; SFX.tick();
  if(R.armyArts){ R.armyArts = false; const a = document.getElementById('armyArts'); if(a && a.scrollIntoView) setTimeout(() => a.scrollIntoView({block:'start'}), 30); }
}
function closeArmy(){ modal = null; $('#ovArmy').hidden = true; }
function renderArmy(){
  $('#armyKicker').textContent = (G.natName ? G.natName+' · ' : '')+'game paused · level '+(G.level||0)+' · '+ERAS[G.eraIdx]+' Era';
  $('#abilList').innerHTML = Object.keys(ABIL).map(g => { const A = ABIL[g], on = hasAbil(PLAYER, g); return '<div class="'+(on?'on':'')+'"><em>'+A.n+'</em> ('+g+' troops at level '+ABIL_LV+'+) · '+A.d+'</div>'; }).join('');
  const cnt = {}; for(const u of G.units) if(u.owner===PLAYER && u.hp>0 && u.card) cnt[u.card] = (cnt[u.card]||0) + 1;
  let h = buildStripHTML();
  for(const sl of G.cards){
    const C = CARDS[sl.id], ev = sl.evo && UEVO.find(e => e.id===sl.evo), evo = UEVO.find(e => e.from===sl.id);
    h += '<div class="ucard'+(ev?' evo':'')+'"><div class="top"><b>'+esc(cardName(PLAYER, sl.id))+'</b><span class="meta">'+C.n+' · Lv '+sl.lvl+' · '+FORM_ERA[sl.lvl-1]+' · '+(cnt[sl.id]||0)+' in the field</span></div>'+
      '<span class="lvbar">'+Array.from({length:8}, (_,i) => '<i class="'+(i < sl.lvl ? 'on' : i >= cardCap(sl.id) ? 'lock' : '')+'"></i>').join('')+'</span>'+(sl.lvl < 8 ? '<span class="abil">Next: '+esc(formOf(sl.id, sl.lvl+1).n)+(sl.lvl >= cardCap(sl.id) ? ' · '+esc(sl.lvl >= mCap(sl.id) ? 'Mastery '+mRank(sl.id)+' caps this line at Lv '+mCap(sl.id)+'. '+((META.mx[sl.id]||0))+' of '+MX_T[mRank(sl.id)]+' mastery XP for the next rank' : capNote()) : '')+'</span>' : '')+(sl.str ? '<span class="rankup">✦ Stranger: fights for you this game only</span>' : '')+abilLine(sl.id)+ladderHTML(sl.id, sl.lvl)+(evoReady(sl) ? '<span class="evo">◆ '+esc(evoStatus(sl).txt)+'</span>' : (evoStatus(sl).state==='path' || evoStatus(sl).state==='hidden' ? '<span class="abil">◆ '+esc(evoStatus(sl).txt)+'</span>' : ''))+
      '<span class="tagrow">'+C.tags.map(g => '<i class="tag on">'+g+'</i>').join('')+'</span>'+vsHTML(sl.id)+(SIG[sl.id] ? '<span class="abil'+(sl.lvl >= 8 ? ' on' : '')+'">✦ Signature at Lv 8: '+SIG[sl.id].n+'. '+SIG[sl.id].d+'</span>' : '')+
      '<span class="meta">'+(ev ? ev.d : C.d)+'. Squads of '+squadSize(PLAYER, sl.id)+'. Each takes '+supOf(sl.id)+' army room.'+(!ev && knownEvos(sl.id).length ? ' '+knownEvos(sl.id).map(e => (e.union ? 'Union' : 'Evolution')+': '+evoRecipe(e)+' → '+e.n).join('. ')+' (open a War Chest).' : '')+'</span></div>';
  }
  for(let i=G.cards.length;i<cardSlots();i++) h += '<div class="ucard"><span class="meta">Empty slot. New troops appear when you level up.</span></div>';
  h += '<h3 id="armyArts">Artifacts · '+(G.arts||[]).length+' of '+ART_CAP+'</h3>' + ((G.arts||[]).length ? '<div class="artlist">'+G.arts.map(k => '<div class="ucard"><img src="'+artImg(k)+'" alt=""><b>'+esc(ARTS[k].n)+'</b><span class="meta">'+esc(ARTS[k].d)+'</span></div>').join('')+'</div>' : '<p class="lnote">None yet. Walk your hero into the wilds: ancient ruins and barbarian camps hide artifacts that last the whole game.</p>') +
    '<p class="lnote">Wild sites found: '+((G.stats.ruins||0)+(G.stats.camps||0)+(G.stats.wonders||0)+(G.stats.mercs||0))+' · ruins '+(G.stats.ruins||0)+' · camps '+(G.stats.camps||0)+' · wonders '+(G.stats.wonders||0)+(G.bless && G.bless.k==='war' ? ' · War blessing: '+Math.ceil(G.bless.t - G.t)+'s left' : '')+'</p>';
  h += '<h3>Civics · '+(G.relics||[]).length+' of '+relicSlots()+'</h3>' + ((G.relics||[]).length ? (G.relics||[]).map(r => { const evs = UEVO.filter(e => e.relic===r.id && known(e)); return '<div class="ucard"><div class="top">'+(KIT['cv_'+r.id] ? '<img class="cvi" src="'+KIT['cv_'+r.id]+'" alt="">' : '')+'<b>'+RELICS[r.id].n+'</b><span class="meta">Lv '+r.lvl+' of '+RELICS[r.id].max+'</span></div><span class="meta">'+RELICS[r.id].d+' per level'+(evs.length ? '. Evolves: '+evs.map(e => CARDS[e.from].n+' → '+e.n).join(', ') : '')+'</span></div>'; }).join('') : '<p class="lnote">No civics yet. They appear when you level up.</p>');
  h += '<p class="lnote">War Chests opened: '+(G.chestsOpened||0)+'. Only bosses carry them: slay a barbarian Warlord or a rival hero with your troops or towers (one chest per nation every 2½ minutes). Conquering a whole nation, or accepting its surrender, also earns one.</p>';
  $('#armyList').innerHTML = h;
  { const rows = G.cards.map(sl => ({n:cardName(PLAYER, sl.id), e:(G.dmg||{})['1:'+sl.id] || {d:0,k:0}})).sort((a,b) => b.e.d - a.e.d), mx = Math.max(1, ...rows.map(r => r.e.d));
    const ab = Object.keys(G.adm||{}).filter(k => k.startsWith('1:')).map(k => ({n:ABIL[k.slice(2)].n, d:G.adm[k]})).sort((a,b) => b.d-a.d);
    $('#armyRecord').innerHTML = rows.map(r => '<div class="mrow"><span>'+r.n+'</span><b>'+Math.round(r.e.d).toLocaleString()+'<small> · '+r.e.k+' kills</small></b><i><s style="width:'+(r.e.d/mx*100).toFixed(1)+'%"></s></i></div>').join('') +
      (ab.length ? '<p class="lnote">Special attacks: '+ab.map(a => '⚔ '+a.n+' '+Math.round(a.d).toLocaleString()).join(' · ')+'</p>' : '<p class="lnote">No special attacks have fired yet.</p>'); }
  $('#synList').innerHTML = Object.keys(SYN).map(g => { const n = R.syn[g]||0; return SYN[g].map(([need, txt]) => '<div class="'+(n>=need?'on':'')+'"><em>'+g+' '+Math.min(n,need)+'/'+need+'</em> · '+txt+'</div>').join(''); }).join('');
  $('#comboList').innerHTML = COMBOS.map(c => { const on = slotOf(c.a) && (c.b ? slotOf(c.b) : G.cards.some(sl => CARDS[sl.id].tags.includes(c.tag))); return '<div class="'+(on?'on':'')+'"><em>'+c.n+'</em> ('+CARDS[c.a].n+' + '+(c.b ? CARDS[c.b].n : 'any '+c.tag+' unit')+') · '+c.d+'</div>'; }).join('');
}
/* ---------- Ledger: compare nations, list everything you have ---------- */
function powerOf(o){ let s = 0; for(const u of G.units){ if(u.owner!==o || u.hp<=0 || !u.card) continue; const st = uStat(u); s += Math.sqrt(st.hp*st.dmg/Math.max(.3, st.cd)); } return Math.round(s); }
function openLedger(){
  if(!G || !running || G.ended || modal || paused) return;
  modal = 'ledger'; renderLedger(); $('#ovLedger').hidden = false; SFX.tick();
}
function closeLedger(){ modal = null; $('#ovLedger').hidden = true; }
function ledgerRows(){
  const pc = citiesOf(PLAYER);
  const rows = [{o:PLAYER, you:true, name:(G.natName||'Your empire')+' (you)', col:pcol(), era:G.eraIdx, cities:pc.length, land:ownedCount(PLAYER), pop:pc.reduce((a,c) => a+c.pop, 0), prod:G.rates.p, army:unitCount(PLAYER), power:powerOf(PLAYER), st:'', stl:'—', ship:G.proj && G.proj.parts ? shipPct() : null, alive:true}];
  for(const r of G.rivals){
    const cs = citiesOf(r.id);
    rows.push({o:r.id, name:r.name, col:r.col, era:rEra(), cities:cs.length, land:r.alive ? ownedCount(r.id) : 0, pop:cs.reduce((a,c) => a+c.pop, 0), prod:r.alive ? (r.prod||0) : 0, army:r.alive ? unitCount(r.id) : 0, power:r.alive ? powerOf(r.id) : 0,
      st:r.status, stl:r.alive ? STATUS[r.status]+(r.status!=='war' ? ' · '+relLabel(Math.round(r.rel)) : '') : STATUS_LONG[r.status], ship:r.alive && r.proj ? r.proj.p : null, alive:r.alive, trait:TRAITS[r.trait].label, leader:r.leader});
  }
  return rows;
}
function renderLedger(){
  const tab = R.ledgerTab || 'nations';
  document.querySelectorAll('.ltabs button').forEach(b => b.classList.toggle('on', b.dataset.t===tab));
  $('#ledgerKicker').textContent = 'Ledger · game paused · '+fmt(G.t);
  $('#ledgerBody').innerHTML = tab==='nations' ? ledgerNations() : ledgerEmpire();
}
function ledgerNations(){
  const rows = ledgerRows(), live = rows.filter(r => r.alive);
  const cols = [['era','Era',v => ERAS[v]], ['cities','Cities'], ['land','Land'], ['pop','People'], ['prod','Prod',v => Math.round(v)], ['army','Troops'], ['power','Power']];
  const max = {}; cols.forEach(([k]) => max[k] = Math.max(...live.map(r => r[k])));
  let h = '<div class="lwrap"><table class="ltable"><thead><tr><th>Nation</th>'+cols.map(c => '<th>'+c[1]+'</th>').join('')+'<th>Standing</th><th>Starship</th></tr></thead><tbody>';
  for(const r of rows){
    h += '<tr class="'+(r.you ? 'you' : '')+(r.alive ? '' : ' gone')+'"><td><span class="nm"><i style="background:'+r.col+'"></i>'+esc(r.name)+'</span></td>';
    for(const [k,, f] of cols){
      const v = r[k], lead = r.alive && live.length > 1 && v===max[k] && v > 0;
      h += '<td class="'+(lead ? 'lead' : '')+'">'+(r.alive || k==='cities' ? (f ? f(v) : v.toLocaleString()) : '—')+(k==='power' && r.alive ? '<span class="pbar"><b style="width:'+(max.power ? v/max.power*100 : 0).toFixed(0)+'%;background:'+r.col+'"></b></span>' : '')+'</td>';
    }
    h += '<td><span class="st '+r.st+'">'+r.stl+'</span></td><td>'+(r.ship===null ? '—' : '<b style="color:var(--blood)">'+Math.floor(r.ship*100)+'%</b>')+'</td></tr>';
  }
  h += '</tbody></table></div><p class="lnote">Gold marks the leader in each column. Power weighs every soldier’s health, damage and speed of attack, including levels, synergies and techs.'+((G.alarm||0) ? ' World alarm: <b style="color:var(--fg)">'+ALARM[G.alarm].n+'</b>.' : '')+'</p>';
  h += '<h3>Armies</h3><div class="narmy">';
  for(const r of rows){
    if(!r.alive) continue;
    const ids = ownerCards(r.o), cnt = {};
    for(const u of G.units) if(u.owner===r.o && u.hp>0 && u.card) cnt[u.card] = (cnt[u.card]||0) + 1;
    const tags = new Set(); ids.forEach(id => CARDS[id].tags.forEach(t => tags.add(t)));
    const specials = [...tags].filter(t => ABIL[t] && hasAbil(r.o, t)).map(t => ABIL[t].n);
    const syn = synOf(r.o), synOn = Object.keys(SYN).filter(g => (syn[g]||0) >= SYN[g][0][0]);
    h += '<div class="row"><div class="hd"><i style="background:'+r.col+'"></i>'+esc(r.name)+(r.you ? '' : ' <span>'+r.trait+' · '+esc(r.leader)+'</span>')+'</div><div class="chiprow">'+
      ids.map(id => '<span class="uchip">'+cardName(r.o, id)+'<em>Lv '+cardLevel(r.o, id)+'</em> <span style="color:var(--muted)">×'+(cnt[id]||0)+'</span></span>').join('')+
      specials.map(n => '<span class="uchip sp">⚔ '+n+'</span>').join('')+
      synOn.map(g => '<span class="uchip" style="border-color:rgba(122,224,138,.35);color:var(--food)">'+g+' '+syn[g]+'</span>').join('')+'</div></div>';
  }
  return h + '</div>';
}
function ledgerEmpire(){
  const pct = v => (v>0 ? '+' : '')+Math.round(v*100)+'%';
  const B = [];
  const add = (label, v, f) => { if(v) B.push([label, f ? f(v) : pct(v)]); };
  add('Food', S.food + S.all); add('Production', S.prod + S.all); add('Science', S.sci + S.all); add('Influence', S.infl);
  add('Soldier health', S.solHp); add('Soldier damage', S.solDmg); add('Soldier speed', S.solSpd);
  add('Guard health', S.guardHp); add('Rider damage', S.riderDmg); add('Rider speed', S.riderSpd); add('Archer damage', S.archerDmg); add('Archer range', S.archerRng, v => '+'+v+' tiles'); add('Siege wall damage', S.siegeWall);
  add('Army upkeep', S.upkeep); add('City health', S.cityhp); add('City repair', S.regen); add('Tower damage', S.towerDmg); add('Tower fire rate', S.towerRate); add('Tower range', S.towerRange, v => '+'+v+' tiles');
  add('Border growth', S.border); add('City size', S.popCap, v => '+'+v); add('City limit', S.cities, v => '+'+v); add('Extra draft choices', S.choices, v => '+'+v);
  B.push(['Borders', 'Level '+borderLvl()+' · '+tilesPerCity(borderLvl())+' per city']);
  B.push(['Unit level cap', String(lvlCap(PLAYER))]);
  const nat = NATIONS_P.find(n => n.id===G.perk);
  let h = '<h3>Bonuses</h3><div class="bgrid">'+B.map(([l,v]) => '<div><span>'+l+'</span><b>'+v+'</b></div>').join('')+'</div>';
  if(nat) h += '<p class="lnote"><b style="color:var(--fg)">'+nat.n+':</b> '+nat.perk+'. Doctrine: '+G.doctrine+'.</p>';
  // army
  h += '<h3>Army</h3><div class="chiprow">'+G.cards.map(sl => '<span class="uchip">'+cardName(PLAYER, sl.id)+'<em>Lv '+sl.lvl+'</em></span>').join('')+(G.relics||[]).map(r => '<span class="uchip" style="border-color:rgba(180,138,224,.5)">'+RELICS[r.id].n+'<em>Lv '+r.lvl+'</em></span>').join('')+'</div>';
  const syn = R.syn, synOn = []; for(const g in SYN) for(const [need, txt] of SYN[g]) if((syn[g]||0) >= need) synOn.push(g+': '+txt);
  const combos = COMBOS.filter(c => slotOf(c.a) && (c.b ? slotOf(c.b) : G.cards.some(sl => CARDS[sl.id].tags.includes(c.tag))));
  const specials = Object.keys(ABIL).filter(g => hasAbil(PLAYER, g));
  h += '<div class="tlist" style="margin-top:8px">'+
    (synOn.length ? synOn.map(t => '<div><b>Synergy</b> · '+t+'</div>').join('') : '<div>No synergies active yet. Pair units that share a tag.</div>')+
    combos.map(c => '<div><b>'+c.n+'</b> · '+c.d+'</div>').join('')+
    specials.map(g => { const use = G.cards.some(sl => CARDS[sl.id].tags.includes(g)); return '<div'+(use ? '' : ' style="opacity:.5"')+'><b>⚔ '+ABIL[g].n+'</b> ('+g+(use ? '' : ', none in your army')+') · '+ABIL[g].d+'</div>'; }).join('')+'</div>';
  h += '<h3>Civics</h3><div class="tlist">'+((G.relics||[]).map(r => '<div><b>'+RELICS[r.id].n+' '+r.lvl+'/'+RELICS[r.id].max+'</b> · '+RELICS[r.id].d+' per level</div>').join('') || '<div>No civics yet.</div>')+'</div>';
  if(G.boons.length) h += '<h3>Boons</h3><div class="tlist">'+G.boons.map(id => '<div><b>'+BYID[id].n+'</b> · '+BYID[id].d+'</div>').join('')+'</div>';
  if(G.evEffects.length){ const ev = {}; G.evEffects.forEach(e => { for(const k in e) ev[k] = (ev[k]||0) + e[k]; }); h += '<h3>From events</h3><div class="tlist">'+Object.keys(ev).map(k => '<div><b>'+({prod:'Production', cityhp:'City health', food:'Food', sci:'Science'}[k]||k)+'</b> · '+pct(ev[k])+'</div>').join('')+'</div>'; }
  return h;
}
