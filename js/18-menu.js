"use strict";
/* ---------- Main menu ---------- */
const MENU_OV = ['#ovStart','#ovEnd','#ovPause','#ovDraft','#ovEvent','#ovDiplo','#ovArmy','#ovLedger','#ovChest','#ovCollect','#ovFind','#ovArena','#ovHow','#ovOpts','#ovLegacy','#ovUnl'];
function goHome(keep){
  if(keep && G && !G.demo && !G.ended && running) R.keepG = {G, cam:{x:CAM.x, y:CAM.y, z:CAM.z}};
  else if(!keep) R.keepG = null;
  paused = false; modal = null; R.menuOv = null; R.follow = null;
  MENU_OV.forEach(s => { const e = $(s); if(e) e.hidden = true; });
  if(!META.ack) META.ack = new Set(META.unl);
  $('#ovHome').hidden = false; uiImgs(); kitImgs();
  startDemo(); refreshHome(); showBest();
}
function startDemo(){
  R.demoReset = false; const app = $('#app');
  if(META.noDemo){ G = null; running = false; if(app) app.classList.add('demo'); resize(); return; }
  try { newGame(true); } catch(e){ G = null; running = false; return; }
  G.seen.fill(1); running = true; paused = false;
  if(app) app.classList.add('demo'); resize();
  const c = capitalOf(PLAYER); CAM.z = Math.max(zLimits().min, Math.min(VW, VH)/26); CAM.x = c.x+.5; CAM.y = c.y+.5; clampCam();
  R.camTo = null; R.camFree = true; R.follow = null; R.demoT = 0; R.demoTo = null;
}
function demoTick(dt){
  if(R.demoReset || G.t > 1500){ startDemo(); return; }
  G.sci = 0; G.nextEvent = G.t + 999; G.chestQ = []; if(G.settle){ try { autoSettle(); } catch(e){ G.settle = null; } }
  if(modal && ['draft','muster','event','chest','find','end'].includes(modal)){ ['#ovDraft','#ovEvent','#ovChest','#ovFind','#ovEnd'].forEach(s => { const e = $(s); if(e) e.hidden = true; }); modal = null; }
  R.demoT -= dt;
  if(R.demoT <= 0 || !R.demoTo){
    R.demoT = 9 + Math.random()*5;
    const fights = new Map(); for(const u of G.units){ if(u.hp <= 0 || !u.tgt) continue; const k = ((u.x/6)|0)+','+((u.y/6)|0), f = fights.get(k) || {n:0, x:0, y:0}; f.n++; f.x += u.x; f.y += u.y; fights.set(k, f); }
    let best = null; for(const f of fights.values()) if(f.n >= 6 && (!best || f.n > best.n)) best = f;
    const spots = G.cities.filter(c => !c.dead).map(c => ({x:c.x+.5, y:c.y+.5})).concat((G.pois||[]).filter(p => p.k==='wonder').map(p => ({x:p.x+.5, y:p.y+.5})));
    R.demoTo = best && Math.random() < .6 ? {x:best.x/best.n, y:best.y/best.n} : spots[rint(spots.length)] || {x:N/2, y:N/2};
    R.demoZ = Math.max(zLimits().min, Math.min(VW, VH)/(16 + Math.random()*14));
  }
  const k = Math.min(1, dt*.32); CAM.x += (R.demoTo.x - CAM.x)*k; CAM.y += (R.demoTo.y - CAM.y)*k; CAM.z += ((R.demoZ||CAM.z) - CAM.z)*k*.6; clampCam();
}
function refreshHome(){
  const gl = $('#hGlory'); if(!gl) return;
  gl.textContent = (META.glory||0).toLocaleString();
  const L = META.life; $('#hStats').textContent = L.games ? L.games+' game'+(L.games===1 ? '' : 's')+' · '+L.wins+' win'+(L.wins===1 ? '' : 's') : 'Your first empire awaits';
  $('#hContinue').hidden = !R.keepG;
  const dot = (id, on) => { const b = $(id), d = b && b.querySelector && b.querySelector('.dot'); if(d) d.hidden = !on; };
  dot('#hLegacy', lgCan());
  dot('#hUnlocks', !!META.ack && [...META.unl].some(id => !META.ack.has(id) && !BASE_UNLOCKED.includes(id)));
  dot('#btnCollect', (META.colSeen||'') !== colSig() && META.life.games > 0);
  { const hn = $('#hNext'); if(hn && META.life.games > 0) hn.innerHTML = nextHTML(2, 'Closest unlocks'); }
}
function openMenuOv(id){ R.menuOv = id; const e = $('#'+id); if(e) e.hidden = false; SFX.init(); SFX.tick && SFX.tick(); }
function closeMenuOv(){ const id = R.menuOv; R.menuOv = null; if(id){ const e = $('#'+id); if(e) e.hidden = true; } if(id==='ovStart' || id==='ovWiz'){} refreshHome(); }
function openWizard(){ $('#ovHome').hidden = true; R.menuOv = null; $('#ovStart').hidden = false; SFX.init(); buildNatPick(); wizStep(0); }
function wizStep(i){
  R.wiz = i;
  document.querySelectorAll('#ovStart .wstep').forEach(e => e.hidden = +e.dataset.s !== i);
  document.querySelectorAll('#wizSteps button').forEach(b => { b.classList.toggle('on', +b.dataset.s===i); b.classList.toggle('done', +b.dataset.s < i); });
  $('#wNext').hidden = i===2; $('#btnBegin').hidden = i!==2; $('#wBack').textContent = i===0 ? 'Main menu' : 'Back';
  if(i===1) buildListPick(); if(i===2) wizSummary();
  const sh = document.querySelector('#ovStart .sheet'); if(sh) sh.scrollTop = 0;
}
function wizSummary(){
  const el = $('#wizSum'); if(!el) return;
  const nat = NATIONS_P.find(n => n.id===R.nation && natOK(n)) || NATIONS_P[0], list = armyListFor(nat);
  const lg = LEGACY.filter(L => META.lg[L.k]).map(L => L.d(META.lg[L.k]));
  el.innerHTML = '<h3>Your empire</h3><div class="sum-row">'+(HSPR.ok && (HSPR.m[nat.id] || HEROES[nat.id]) ? '<img src="'+hsprPortrait(nat.id)+'" alt="">' : '')+'<div><b>'+esc(nat.n)+'</b><span>'+esc(HEROES[nat.id].n)+' · '+esc(nat.perk)+'</span></div></div>'+
    '<p class="lnote"><b>Core:</b> '+CARDS[coreOf(nat)].n+' <em class="stars">'+mStars(coreOf(nat))+'</em>'+(nat.start.length > 1 ? ' · plus '+nat.start.filter(id => id!==coreOf(nat)).map(id => CARDS[id].n).join(', ')+' as a free support' : '')+'. <b>Supports:</b> chosen when the Classical and Medieval Ages dawn, from every line you have unlocked</p>'+
    '<p class="lnote"><b>Legacy:</b> '+(lg.length ? lg.join(' · ') : 'none yet. Spend Glory in Legacy from the main menu')+'</p>'+
    '<p class="lnote"><b>Challenge:</b> '+(R.diff===0 ? 'Chieftain' : 'Crown '+(R.crown||0)+' · '+CROWNS[R.crown||0].n)+(questAll(nat.id) ? ' · <b>Quests done:</b> starting troops at Lv 2' : '')+'</p>';
}
function renderLegacy(){
  $('#lgGlory').textContent = (META.glory||0).toLocaleString();
  const el = $('#legGrid'); if(!el) return;
  el.innerHTML = LEGACY.map(L => { const r = META.lg[L.k]||0, mx = r >= L.max, c = mx ? 0 : lgCost(L.k), ok = !mx && META.glory >= c;
    return '<div class="leg-item'+(r ? ' has' : '')+(mx ? ' max' : '')+'">'+(UIA['l_'+L.k] ? '<img class="licon" src="'+UIA['l_'+L.k]+'" alt="">' : '<i class="lic">'+L.ic+'</i>')+'<div class="lt"><b>'+L.n+'</b><span class="pips">'+Array.from({length:L.max}, (_,i) => '<s class="'+(i < r ? 'on' : '')+'"></s>').join('')+'</span></div><span class="ld">'+(r ? esc(L.d(r)) : 'Not bought yet')+(mx ? '' : '<br><em>Next: '+esc(L.d(r+1))+'</em>')+'</span><button data-lg="'+L.k+'" class="'+(ok ? 'primary' : 'secondary')+'"'+(ok ? '' : ' disabled')+'>'+(mx ? 'Maxed' : '<i class="coin"></i> '+c.toLocaleString())+'</button></div>'; }).join('');
  el.querySelectorAll('button[data-lg]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.lg, L = LEGACY.find(x => x.k===k), r = META.lg[k]||0; if(r >= L.max) return; const c = lgCost(k); if(META.glory < c) return;
    META.glory -= c; META.life.lgSpent = (META.life.lgSpent||0) + c; META.lg[k] = r+1; saveLife(); SFX.init(); SFX.pick && SFX.pick(); renderLegacy(); refreshHome();
  }));
  const rf = $('#btnRefund'); if(rf) rf.disabled = !lgTotal();
}
function openLegacy(){ renderLegacy(); openMenuOv('ovLegacy'); }
function unlRows(){
  const rows = [];
  for(const a of ACH){
    if(a.secret && !isUnlocked(a.id)) continue;
    const done = isUnlocked(a.id), p = a.prog ? a.prog() : null, kind = a.id.startsWith('nat:') ? 'Peoples' : a.id.startsWith('diff:') ? 'Crowns' : 'Troops';
    const name = kind==='Troops' ? CARDS[a.id].n : kind==='Peoples' ? (NATIONS_P.find(n => 'nat:'+n.id===a.id)||{}).n : 'The Crown ladder';
    rows.push({id:a.id, kind, name, d:a.d, done, p, frac: done ? 1 : p ? Math.min(1, p[0]/p[1]) : 0, fresh: done && META.ack && !META.ack.has(a.id), troop: kind==='Troops' ? a.id : null});
  }
  for(const n of NATIONS_P) if(!n.lock && !n.secret){ const need = n.start, got = need.filter(isUnlocked).length; rows.push({id:'nat:'+n.id, kind:'Peoples', name:n.n, d:'Unlock '+need.map(id => CARDS[id].n).join(' and '), done:got===need.length, p:need.length > 1 ? [got, need.length] : null, frac:got/need.length, fresh:false}); }
  for(const n of NATIONS_P) if(natOK(n)) QUESTS[n.id].forEach((q, k) => { const id = n.id+':'+k, dn = META.qd.has(id), b = Math.min(q.g, META.q[id]||0); rows.push({id:'q:'+id, kind:'Quests', name:n.n+' · quest '+(k+1), d:q.d+' · +'+Q_REW[k]+' Glory', done:dn, p:q.g > 1 ? [b, q.g] : null, frac:dn ? 1 : b/q.g, fresh:false}); });
  { const c = META.crown||0; for(let i=1;i<=10;i++) rows.push({id:'cr:'+i, kind:'Crowns', name:'Crown '+i+' · '+CROWNS[i].n, d:i <= c ? CROWNS[i].d : 'Win at Crown '+(i-1)+' to open it', done:i <= c, p:null, frac:i <= c ? 1 : 0, fresh:false}); }
  for(const id of Object.keys(CARDS).filter(isUnlocked)){ const r = mRank(id); if(r >= MX_T.length) continue; const xp = META.mx[id]||0, lo = MX_T[r-1]||0; rows.push({id:'mx:'+id, kind:'Mastery', name:CARDS[id].n+' · rank '+(r+1), d:mPerk(r+1), done:false, p:[xp, MX_T[r]], frac:(xp-lo)/(MX_T[r]-lo), fresh:false, troop:id}); }
  return rows;
}
function renderUnlocks(){
  const rows = unlRows(), sec = ['Troops','Peoples','Crowns','Quests','Mastery'];
  const total = rows.filter(r => r.kind!=='Mastery'), done = total.filter(r => r.done).length;
  $('#unlKicker').textContent = 'Unlocks · '+done+' of '+total.length+' complete';
  let h = '';
  for(const k of sec){
    const list = rows.filter(r => r.kind===k).sort((a,b) => (b.fresh - a.fresh) || (a.done - b.done) || (b.frac - a.frac));
    if(!list.length) continue;
    h += '<h3>'+k+(k==='Mastery' ? ' · next ranks' : ' · '+list.filter(r => r.done).length+' of '+list.length)+'</h3><div class="unl-list">';
    for(const r of (k==='Mastery' ? list.slice(0, 8) : list)){
      const img = r.troop && USPR.ok && USPR.m[r.troop] ? artURL('ul_'+r.troop+'_'+(r.done || k==='Mastery' ? 'a' : 'b'), () => uPortrait(r.troop, k==='Mastery' ? Math.min(8, mCap(r.troop)+1) : 1)) : '';
      h += '<div class="unl'+(r.done ? ' done' : '')+(r.fresh ? ' fresh' : '')+'">'+(img ? '<img class="'+(r.done || k==='Mastery' ? '' : 'sil')+'" src="'+img+'" alt="">' : '<i class="uic">'+(r.done ? '✓' : '?')+'</i>')+
        '<div><b>'+esc(r.name)+(r.fresh ? ' <em class="new">New</em>' : '')+'</b><span>'+esc(r.d)+'</span>'+(!r.done && r.p ? '<span class="pbar"><s style="width:'+(r.frac*100).toFixed(1)+'%"></s></span><small>'+Math.min(r.p[0], r.p[1]).toLocaleString()+' / '+r.p[1].toLocaleString()+'</small>' : '')+'</div>'+(r.done ? '<i class="ok">✓</i>' : '')+'</div>';
    }
    h += '</div>';
  }
  h += '<h3>Secrets · '+SECRETS.filter(x => isUnlocked(x.id)).length+' of '+SECRETS.length+' found</h3><p class="lnote">'+SECRETS.length+' secret troop lines are hidden in this land. Their conditions are unknown. Their clues are in the Collection.</p>';
  $('#unlBody').innerHTML = h;
}
function openUnlocks(){ renderUnlocks(); openMenuOv('ovUnl'); if(!META.ack) META.ack = new Set(); META.unl.forEach(id => META.ack.add(id)); saveLife(); }
function openOpts(){
  const L = META.life; $('#optLife').textContent = L.games+' games · '+L.wins+' wins · '+L.kills.toLocaleString()+' enemies defeated · '+(META.gloryT||0).toLocaleString()+' Glory earned in all';
  $('#optFx').value = SFX.vol; $('#optMus').value = MUS.vol; $('#optSnd').checked = SFX.on; $('#optMusOn').checked = MUS.on; $('#optDemo').checked = !META.noDemo;
  document.querySelectorAll('#optShake button').forEach(b => b.classList.toggle('on', +b.dataset.v===SHAKE_LV));
  openMenuOv('ovOpts');
}
function continueGame(){
  const k = R.keepG; if(!k) return; R.keepG = null;
  G = k.G; $('#app').classList.remove('demo');
  fogInit(); S = null; refreshStats(); running = true; paused = false; modal = null; R.bdirty = true; rebuildB(); computeSyn();
  CAM.x = k.cam.x; CAM.y = k.cam.y; CAM.z = k.cam.z; R.camFree = false; R.camTo = null;
  setupVisuals(); syncDoctrine(); resize(); clampCam(); fogTick();
  $('#ovHome').hidden = true; R.armyKey = ''; hud(); drawMini(); SFX.init();
}
function openPause(){
  if(!G || G.ended || modal) return;
  paused = true;
  $('#pauseKicker').textContent = 'Paused at '+fmt(G.t)+' · '+ERAS[G.eraIdx]+' Era';
  $('#cxArmy').textContent = armyText(PLAYER)+'. Army budget '+(G.rates.a||0).toFixed(1)+' production/s, upkeep '+(G.rates.u||0).toFixed(1)+'/s. More production, or the Defend doctrine, grows your army.';
  const conq = G.rivals.filter(r => !r.alive).length, ships = G.rivals.filter(r => r.alive && r.proj).map(r => r.name+' '+Math.floor(r.proj.p*100)+'%');
  $('#cxGoal').textContent = 'Conquest: '+conq+' of '+G.rivals.length+' nations conquered or joined. Science: '+(G.proj && G.proj.parts ? 'starship '+Math.floor(shipPct()*100)+'% built'+(G.proj.launching ? ', launching in '+Math.ceil(G.proj.launch)+'s' : '') : 'in the Modern Era, raise Writing to level 5 and Astronomy to level 3 to unlock the Space Program')+'.'+(ships.length ? ' Rival starships: '+ships.join(', ')+'.' : '');
  const nx = ERA_LV[G.eraIdx+1];
  $('#cxEra').textContent = nx ? 'You are level '+(G.level||0)+'. '+eraNote()+': your army modernizes and new buildings rise.' : 'You have reached the final era. Space Program appears once Writing is level 5 and Astronomy level 3.';
  $('#cxTechs').innerHTML = (G.relics||[]).length ? G.relics.map(r => '<span class="pill">'+RELICS[r.id].n+' '+r.lvl+'</span>').join('') : '<span class="empty">No civics yet.</span>';
  $('#cxEvos').innerHTML = UEVO.filter(e => known(e) && evoUsable(e) && (slotOf(e.from) || (e.with && slotOf(e.with)))).map(e => '<div><em>'+e.n+'</em> · '+evoRecipe(e)+'</div>').join('') || '<div>Evolutions stay hidden until you discover them. The Collection has clues.</div>';
  $('#ovPause').hidden = false;
}
function closePause(){ paused = false; $('#ovPause').hidden = true; }
