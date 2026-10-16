"use strict";
BOOT_Q.splice(0).forEach(f => { try { f(); } catch(e){} });
/* ---------- Loop ---------- */
const KEYS = new Set();
let lastT = 0;
function frame(now){
  requestAnimationFrame(frame);
  const dtr = Math.min(.05, Math.max(0, (now - lastT)/1000)); lastT = now;
  R.now = now/1000;
  if(G){
    let kx = 0, ky = 0, ax = 0, ay = 0;
    if(KEYS.has('a')) kx -= 1; if(KEYS.has('d')) kx += 1; if(KEYS.has('w')) ky -= 1; if(KEYS.has('s')) ky += 1;
    if(R.joy){ kx += R.joy.x; ky += R.joy.y; }
    if(KEYS.has('arrowleft')) ax -= 1; if(KEYS.has('arrowright')) ax += 1; if(KEYS.has('arrowup')) ay -= 1; if(KEYS.has('arrowdown')) ay += 1;
    const hsel = heroOf(PLAYER);
    R.heroDir = hsel ? {x:kx, y:ky} : null;
    if(!hsel){ ax += kx; ay += ky; }
    if(hsel && (kx || ky)){ if(R.follow){ R.follow = null; R.camZ = null; syncWatch(); } if(R.camFree){ R.camFree = false; R.camTo = null; } }
    if(ax || ay){ const sp = 720/CAM.z*dtr; CAM.x += ax*sp; CAM.y += ay*sp; R.camTo = null; R.camFree = true; if(R.follow){ R.follow = null; R.camZ = null; syncWatch(); } clampCam(); }
    if(hsel && !R.camFree && !R.follow && running && !G.ended){ const k = 1 - Math.pow(.02, dtr), ty = hsel.y + (R.camOffY||0)/CAM.z; CAM.x += (hsel.x - CAM.x)*k; CAM.y += (ty - CAM.y)*k; R.camTo = null; clampCam(); }

    if(R.camTo){
      const k = 1 - Math.pow(.002, dtr);
      CAM.x += (R.camTo.x - CAM.x)*k; CAM.y += (R.camTo.y - CAM.y)*k;
      const zt = R.camZ || 16; if(CAM.z < zt) CAM.z += (zt - CAM.z)*k;
      clampCam();
      if(Math.hypot(R.camTo.x-CAM.x, R.camTo.y-CAM.y) < .05) R.camTo = null;
    }
    if(R.follow && running && !paused && !G.ended){
      R.follow.t -= dtr;
      if(R.follow.t <= 0){ R.follow.t = .5; const b = findBattle(R.follow) || findBattle(); if(b){ R.follow.x = b.x; R.follow.y = b.y; R.camTo = {x:b.x, y:b.y}; } }
    }
  }
  if(G && G.demo) demoTick(dtr);
  const live = G && running && !paused && !modal && !G.ended;
  if(live){
    let rem = dtr*speed*(G.settle ? .5 : 1);
    if(R.slowmo > 0 && !(R.ageFx && R.ageFx.t0 == null)){ R.slowmo -= dtr; rem *= R.slowmo > .5 ? .25 : .25 + (.5 - R.slowmo)*1.5; }
    while(rem > 1e-6){ const st = Math.min(.05, rem); update(st); rem -= st; if(modal || G.ended) break; }
  }
  fxStep((live || (G && G.ended)) ? dtr : 0);
  draw(); SFX.flush && SFX.flush();
  miniAcc += dtr; if(miniAcc > .25){ miniAcc = 0; drawMini(); }
  hudAcc += dtr; if(hudAcc > .12){ hudAcc = 0; hud(); }
}

function meterDefault(){ let v = null; try { v = localStorage.getItem('eh-meter'); } catch(e){} R.meterOff = v==null ? (innerWidth < 900) : v==='0'; R.dmgH = []; }
function begin(){
  SFX.init();
  $('#app').classList.remove('demo');
  newGame(); meterDefault();
  resize();
  const cap = capitalOf(PLAYER);
  CAM.z = clamp(Math.min(VW,VH)/18, zLimits().min, zLimits().max);
  CAM.x = cap.x+.5; CAM.y = cap.y+.5; clampCam(); R.camTo = null; R.camFree = false; R.follow = null;
  running = true; paused = false; modal = null; R.keepG = null; R.menuOv = null;
  MENU_OV.concat(['#ovHome']).forEach(s => { const e = $(s); if(e) e.hidden = true; });
  $('#app').classList.remove('demo'); resize();
  R.armyKey = '';
  $('#btnSpeed').textContent = '1×';
  G.order = 'charge'; syncOrders();
  hud(); drawMini();
}

/* ---------- Input ---------- */
function bindCamera(){
  const ptrs = new Map();
  let pan = null, pinch = null;
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, {x:e.offsetX, y:e.offsetY});
    if(ptrs.size === 1){ pan = {sx:e.offsetX, sy:e.offsetY, cx:CAM.x, cy:CAM.y, moved:false}; pinch = null; }
    else if(ptrs.size === 2){
      const [a,b] = [...ptrs.values()];
      pinch = {d:Math.hypot(a.x-b.x, a.y-b.y)||1, mx:(a.x+b.x)/2, my:(a.y+b.y)/2, z:CAM.z, cx:CAM.x, cy:CAM.y};
      if(pan) pan.moved = true;
    }
    R.camTo = null; if(R.follow){ R.follow = null; R.camZ = null; syncWatch(); }
  });
  cv.addEventListener('pointerleave', () => { R.hover = null; });
  cv.addEventListener('pointermove', e => {
    if(e.pointerType==='mouse' && !ptrs.size){ const [wx,wy] = toWorld(e.offsetX, e.offsetY); R.hover = {x:Math.floor(wx), y:Math.floor(wy)}; }
    if(!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, {x:e.offsetX, y:e.offsetY});
    if(pinch && ptrs.size >= 2){
      const [a,b] = [...ptrs.values()];
      const d = Math.hypot(a.x-b.x, a.y-b.y)||1, mx = (a.x+b.x)/2, my = (a.y+b.y)/2;
      const wx = pinch.cx + (pinch.mx - VW/2)/pinch.z, wy = pinch.cy + (pinch.my - VH/2)/pinch.z;
      const L = zLimits(); CAM.z = clamp(pinch.z*d/pinch.d, L.min, L.max);
      CAM.x = wx - (mx - VW/2)/CAM.z; CAM.y = wy - (my - VH/2)/CAM.z; clampCam();
    } else if(pan){
      const dx = e.offsetX - pan.sx, dy = e.offsetY - pan.sy;
      if(Math.abs(dx) + Math.abs(dy) > 7){ pan.moved = true; cv.classList.add('dragging'); }
      if(pan.moved){ CAM.x = pan.cx - dx/CAM.z; CAM.y = pan.cy - dy/CAM.z; clampCam(); R.camFree = true; }
    }
  });
  const end = e => {
    if(!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if(ptrs.size === 0){
      if(pan && !pan.moved && e.type==='pointerup') tapMap(e.offsetX, e.offsetY);
      pan = null; pinch = null; cv.classList.remove('dragging');
    } else if(ptrs.size === 1){
      const [a] = [...ptrs.values()];
      pan = {sx:a.x, sy:a.y, cx:CAM.x, cy:CAM.y, moved:true}; pinch = null;
    }
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.pow(1.0015, -e.deltaY), e.offsetX, e.offsetY); R.camTo = null; R.camZ = null; }, {passive:false});
  if(mini){
    let mdrag = false;
    const go = e => { const r = mini.getBoundingClientRect(); CAM.x = (e.clientX-r.left)/r.width*N; CAM.y = (e.clientY-r.top)/r.height*N; R.camTo = null; clampCam(); };
    mini.addEventListener('pointerdown', e => { mdrag = true; mini.setPointerCapture && mini.setPointerCapture(e.pointerId); go(e); });
    mini.addEventListener('pointermove', e => { if(mdrag) go(e); });
    mini.addEventListener('pointerup', () => { mdrag = false; });
    mini.addEventListener('pointercancel', () => { mdrag = false; });
  }
  $('#btnZoomIn').addEventListener('click', () => zoomAt(1.4, VW/2, VH/2));
  $('#btnZoomOut').addEventListener('click', () => zoomAt(1/1.4, VW/2, VH/2));
  $('#btnHome').addEventListener('click', () => { const c = G && capitalOf(PLAYER); if(c) focusOn(c.x+.5, c.y+.5); });
}
function selectHero(){
  const h = heroOf(PLAYER);
  if(!h){ toast('Your hero returns in '+Math.max(0, Math.ceil(G.hero.t - G.t))+'s','warn'); return; }
  R.camFree = false; R.follow = null; syncWatch(); R.camTo = {x:h.x, y:h.y};
}
function heroGarrison(){ const h = heroOf(PLAYER); if(!h) return;
  if(!G.units.some(v => v.fol===h.id && v.hp>0)){ let r = 0; for(const v of G.units) if(v.owner===PLAYER && v.rel){ v.rel = 0; r++; } toast(r ? r+' troops march back to your general' : 'No released troops to recall','good'); hostTick(); return; }
  const c = nearOwnCity(h, 2.5); let n = 0; for(const v of G.units) if(v.fol===h.id && v.hp>0){ v.fol = 0; v.rel = 1; if(c) v.home = c.id; n++; } toast(n ? n+' troops leave the band'+(c ? ' to guard '+c.name : ' and head home') : 'No troops in the band','good'); h.gatherT = G.t + 6; }
/* Call the Banners: every troop on the map marches to your general, at a forced-march pace */
const BAN_CD = 90, BAN_T = 35, BAN_MARCH = 30;
function callBanners(){
  if(!G || G.ended) return;
  const h = heroOf(PLAYER); if(!h){ toast('Your general must be on the field to call the banners','warn'); return; }
  if(G.t < (G.banCd||0)){ toast('The banners can be called again in '+Math.ceil(G.banCd - G.t)+'s','warn'); return; }
  let n = 0;
  for(const v of G.units){
    if(v.owner!==PLAYER || v.hp<=0 || !v.card || v.hero) continue;
    const far = (v.x-h.x)**2 + (v.y-h.y)**2 > 36;
    if(v.fol!==h.id || far){ v.gar = 0; v.rel = 0; v.fol = h.id; v.tgt = 0; v.tcity = 0; n++; if(onScr(v.x, v.y)) ring(v.x, v.y, .1, .6, '#ffd36a', .5); }
    v.fmT = G.t + BAN_MARCH;
  }
  if(!n){ toast('Every troop already marches with your general','good'); return; }
  G.banCd = G.t + BAN_CD; G.banT = G.t + BAN_T;
  const H = HEROES[h.hero] || {};
  banner('Call the Banners', n+' troops march to '+(H.n || 'your general'));
  toast('⚑ '+n+' troops break off and march to your general. Your cities keep only their towers until you Release (G)','good',{x:h.x, y:h.y});
  SFX.q && SFX.q('horn', h.x, h.y, 1); MUS.sting && MUS.sting('focus');
  ring(h.x, h.y, .3, 4.5, '#ffd36a', 1); ring(h.x, h.y, .2, 2.5, '#fff1cf', .8); float('TO ME!', h.x, h.y-1.4, '#ffd36a', 1.6); R.floats[R.floats.length-1].big = 1;
  R.shake = Math.min(6, (R.shake||0) + 2);
  hostTick();
}
function heroUse(){ const h = heroOf(PLAYER); if(!h){ toast('Your hero returns in '+Math.max(0, Math.ceil(G.hero.t - G.t))+'s','warn'); return; } if((h.acd||0) > 0){ toast(HEROES[h.hero].act+' is ready in '+Math.ceil(h.acd)+'s','warn'); return; } if(!heroActive(h)) toast('No targets for '+HEROES[h.hero].act,'warn'); }
function heroHud(){
  const el = document.getElementById('heroCard'); if(!el || !el.classList || !G || !G.hero) return;
  const h = heroOf(PLAYER), key = G.hero.key || G.perk, H = HEROES[key] || HEROES.legion;
  el.classList.toggle('sel', !!h && !R.camFree); el.classList.toggle('dead', !h);
  const lv = h ? h.hlv : heroLv(PLAYER, key), fol = h ? G.units.filter(v => v.fol===h.id && v.hp>0).length : 0;
  const k2 = key+lv+(HSPR2.ok ? 'b' : '')+(HSPR3.ok ? 'c' : '');
  if(R.heroArt !== k2){ R.heroArt = k2; const img = document.getElementById('hcImg'); if(img) img.src = (HSPR.ok && hsprPortrait(key, heroTier(lv))) || artURL('hero_'+key+'_'+lv, () => unitSprite({owner:PLAYER, card:H.line, lvl:lv}).n); }
  document.getElementById('hcName').textContent = H.n;
  document.getElementById('hcHp').style.width = (h ? clamp(h.hp/uStat(h).hp, 0, 1)*100 : 0)+'%';
  document.getElementById('hcSub').textContent = h ? formOf(H.line, lv).n+' · band of '+fol : 'Returns in '+Math.max(0, Math.ceil(G.hero.t - G.t))+'s';
  const act = document.getElementById('hcAct'), cd = h ? (h.acd||0) : H.cd;
  document.getElementById('hcActN').textContent = H.act; { const ai = document.getElementById('hcActI'), u = KIT['ab_'+ABKEY[key]]; if(ai && u && ai.getAttribute('src') !== u) ai.src = u; } act.classList.toggle('ready', !!h && cd <= 0);
  document.getElementById('hcCd').style.height = (h ? clamp(cd/H.cd, 0, 1)*100 : 100)+'%';
  act.title = H.act+': '+H.ad+' (Space). '+H.sig;
  { const bb = document.getElementById('hcBan'); if(bb){ const cd = Math.max(0, (G.banCd||0) - G.t); bb.disabled = !h; bb.classList.toggle('ready', !!h && cd <= 0); bb.classList.toggle('live', (G.banT||0) > G.t);
      document.getElementById('hcBanCd').style.height = (h ? clamp(cd/BAN_CD, 0, 1)*100 : 100)+'%'; document.getElementById('hcBanK').textContent = cd > 0 ? Math.ceil(cd)+'s' : 'Y'; } }
  const rb = document.getElementById('hcRally');
  rb.disabled = !fol;
  document.getElementById('hcRallyN').textContent = 'Release';
  document.getElementById('hcRallyK').textContent = fol ? 'G' : 'no band';
  const ak = (G.arts||[]).join(',');
  if(R.heroArts !== ak){ R.heroArts = ak; const row = document.getElementById('hcArtRow'), ab = document.getElementById('hcArts');
    if(row){ row.innerHTML = (G.arts||[]).map(k => '<img src="'+artImg(k)+'" alt="'+esc(ARTS[k].n)+'" title="'+esc(ARTS[k].n+': '+ARTS[k].d)+'">').join('') + '<s></s>'.repeat(Math.max(0, ART_CAP - (G.arts||[]).length)); }
    const an = document.getElementById('hcArtN'); if(an) an.textContent = (G.arts||[]).length+'/'+ART_CAP; if(ab && ab.classList) ab.classList.toggle('got', (G.arts||[]).length > 0); }
}
function tapMap(sx, sy){
  if(!G || !running || G.ended) return;
  const [fx, fy] = toWorld(sx, sy);
  if(fx < 0 || fy < 0 || fx > N || fy > N) return;
  if(G.settle){
    const tx = Math.floor(fx), ty = Math.floor(fy);
    if(!placeCity(tx, ty)) toast('You can\u2019t settle there. Pick a lit spot','warn');
    return;
  }
  const hh = heroOf(PLAYER);
  if(!hh){ toast('Your hero returns in '+Math.max(0, Math.ceil(G.hero.t - G.t))+'s','warn'); return; }
  {
    const tc = G.cities.find(c => !c.dead && Math.abs(c.x+.5-fx) < .7 && Math.abs(c.y+.5-fy) < .7);
    if(tc && tc.owner!==PLAYER && atWar(PLAYER, tc.owner)){ hh.tcity = tc.id; hh.goal = null; if(G.order==='fall') setOrder('charge'); toast('⚔ Assault on '+tc.name+'. Your band will not stop until it falls','good'); }
    else { const w = G.own[tileAt(fx, fy)]; if(!navOk(PLAYER)[w]){ toast(rival(w).name+'’s borders are closed. Declare war or ally to pass','warn'); return; } hh.goal = {x:clamp(fx,.3,N-.3), y:clamp(fy,.3,N-.3)}; hh.tcity = 0; }
    R.heroMark = {x:fx, y:fy, t:.8}; SFX.tick(); return;
  }
}
function bind(){
  try { kitImgs(); } catch(e){}
  $('#btnBegin').addEventListener('click', begin);
  { const app = $('#app'), setF = (k, v) => { app.classList.toggle(k, v); try { localStorage.setItem('eh-'+k, v ? '1' : '0'); } catch(e){} setTimeout(resize, 30); setTimeout(resize, 260); };
    try { const small = window.innerWidth < 700; ['ctop','cbot'].forEach(k => { const v = localStorage.getItem('eh-'+k); if(v==='1' || (v==null && false && k==='ctop')) app.classList.add(k); }); } catch(e){}
    $('#foldTop').addEventListener('click', () => { setF('ctop', !app.classList.contains('ctop')); $('#foldTop').title = app.classList.contains('ctop') ? 'Show more' : 'Show less'; });
    $('#foldBot').addEventListener('click', () => { setF('cbot', !app.classList.contains('cbot')); $('#foldBot').title = app.classList.contains('cbot') ? 'Show more' : 'Show less'; }); }
  { const vf = $('#volFx'), vm = $('#volMus'); try { const a = localStorage.getItem('eh-sfxvol'), b = localStorage.getItem('eh-musvol'); if(a != null) SFX.vol = +a; if(b != null) MUS.vol = +b; } catch(e){}
    if(vf && vf.addEventListener){ vf.value = SFX.vol; vf.addEventListener('input', () => { SFX.init(); SFX.setVol(+vf.value); SFX.q('clang', CAM.x, CAM.y, 1); }); }
    if(vm && vm.addEventListener){ vm.value = MUS.vol; vm.addEventListener('input', () => MUS.setVol(+vm.value)); } }
  $('#hcSel').addEventListener('click', () => { if(G && running && !modal) selectHero(); });
  $('#hcAct').addEventListener('click', () => { if(G && running && !modal && !paused) heroUse(); });
  $('#hcArts') && $('#hcArts').addEventListener('click', () => { if(G && running && !modal && !paused){ R.armyArts = true; openArmy(); } });
  document.querySelectorAll('#orders button').forEach(b => b.addEventListener('click', () => setOrder(b.dataset.o)));
  $('#btnFollow').addEventListener('click', () => { if(G && running && !modal) selectHero(); });
  $('#hcRally').addEventListener('click', () => { if(G && running && !modal && !paused) heroGarrison(); });
  { const bb = $('#hcBan'); if(bb) bb.addEventListener('click', () => { if(G && running && !modal && !paused) callBanners(); }); }
  $('#btnAgain').addEventListener('click', begin);
  $('#btnMenu').addEventListener('click', () => goHome(false));
  $('#btnRestart').addEventListener('click', () => goHome(true));
  $('#hStart').addEventListener('click', openWizard);
  $('#hContinue').addEventListener('click', continueGame);
  $('#hLegacy').addEventListener('click', openLegacy);
  $('#hUnlocks').addEventListener('click', openUnlocks);
  const howTab = k => { document.querySelectorAll('#howTabs button').forEach(b => b.classList.toggle('on', b.dataset.ht===k)); document.querySelectorAll('#ovHow .how-sec').forEach(x => x.hidden = x.dataset.hs!==k); const sh = document.querySelector('#ovHow .sheet'); if(sh) sh.scrollTop = 0; };
  document.querySelectorAll('#howTabs button').forEach(b => b.addEventListener('click', () => { howTab(b.dataset.ht); SFX.tick && SFX.tick(); }));
  $('#hHow').addEventListener('click', () => { howTab('basics'); openMenuOv('ovHow'); });
  $('#hOpts').addEventListener('click', openOpts);
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeMenuOv));
  $('#wBack').addEventListener('click', () => { if(R.wiz > 0) wizStep(0); else { $('#ovStart').hidden = true; $('#ovHome').hidden = false; refreshHome(); } });
  $('#wNext').addEventListener('click', () => wizStep(2));
  document.querySelectorAll('#wizSteps button').forEach(b => b.addEventListener('click', () => wizStep(+b.dataset.s)));
  $('#btnRefund').addEventListener('click', () => { if(!lgTotal() || !confirm('Refund every Legacy rank? You get back all the Glory you spent.')) return; META.glory += META.life.lgSpent||0; META.life.lgSpent = 0; META.lg = {}; saveLife(); renderLegacy(); refreshHome(); });
  $('#btnResetProg').addEventListener('click', () => { if(!confirm('Erase every unlock, discovery, mastery, Glory and Legacy rank? This cannot be undone.')) return; try { ['eh-unlocks','eh-disc','eh-life','eh-list'].forEach(k => localStorage.removeItem(k)); } catch(e){} location.reload(); });
  { const of = $('#optFx'), om = $('#optMus');
    of.addEventListener('input', () => { SFX.init(); SFX.setVol(+of.value); const vf = $('#volFx'); if(vf) vf.value = of.value; SFX.q && SFX.q('clang', CAM.x, CAM.y, 1); });
    om.addEventListener('input', () => { SFX.init(); MUS.setVol(+om.value); const vm = $('#volMus'); if(vm) vm.value = om.value; });
    $('#optSnd').addEventListener('change', e => { SFX.init(); SFX.setOn(e.target.checked); const b = $('#btnSound'); if(b) b.classList.toggle('off', !SFX.on); });
    $('#optMusOn').addEventListener('change', e => { if(e.target.checked !== MUS.on) R.toggleMusic(); });
    document.querySelectorAll('#optShake button').forEach(b => b.addEventListener('click', () => { SHAKE_LV = +b.dataset.v; try { localStorage.setItem('eh-shake', String(SHAKE_LV)); } catch(e){} document.querySelectorAll('#optShake button').forEach(x => x.classList.toggle('on', x===b)); SFX.tick && SFX.tick(); }));
    $('#optDemo').addEventListener('change', e => { META.noDemo = !e.target.checked; saveLife(); if(!$('#ovHome').hidden) startDemo(); }); }
  $('#btnEndless').addEventListener('click', () => startDecline(true));
  $('#btnResume').addEventListener('click', () => { SFX.init(); closePause(); });
  $('#btnPause').addEventListener('click', () => { if(paused) closePause(); else openPause(); });
  $('#btnDipClose').addEventListener('click', closeDiplo);
  $('#btnArmyClose').addEventListener('click', closeArmy);
  $('#btnLedgerClose').addEventListener('click', closeLedger);
  $('#btnWatch').addEventListener('click', watchBattle);
  $('#btnArmyArena').addEventListener('click', openArena);
  $('#btnArmyCol').addEventListener('click', openCollect);
  $('#btnStartArena').addEventListener('click', () => { SFX.init(); openArena(); });
  $('#btnArenaClose').addEventListener('click', closeArena);
  $('#btnChest').addEventListener('click', closeChest);
  $('#btnCollect').addEventListener('click', () => { SFX.init(); openCollect(); });
  $('#btnColClose').addEventListener('click', closeCollect);
  $('#btnArenaGo').addEventListener('click', () => { SFX.init(); if(AR.done || AR.t > 0) arBuild(); AR.live = true; $('#btnArenaGo').textContent = 'Fighting…'; arMeter(); });
  $('#btnArenaSpeed').addEventListener('click', e => { AR.speed = AR.speed===1 ? 2 : AR.speed===2 ? 4 : 1; e.currentTarget.textContent = 'Speed '+AR.speed+'×'; });
  $('#btnLedger').addEventListener('click', () => { if(modal==='ledger') closeLedger(); else openLedger(); });
  { const vc = $('#vicChip'); if(vc) vc.addEventListener('click', () => { R.lTab = 'vic'; R.meterOff = false; try { localStorage.setItem('eh-ltab', 'vic'); } catch(e){} R.meterT = -9; meterTick(); SFX.tick && SFX.tick(); }); }
  { const nt = $('#natTog'); if(nt) nt.addEventListener('click', () => { R.natAll = !R.natAll; try { localStorage.setItem('eh-natall', R.natAll ? '1' : '0'); } catch(e){} SFX.tick && SFX.tick(); hud(); }); }
  document.querySelectorAll('.ltabs button').forEach(b => b.addEventListener('click', () => { R.ledgerTab = b.dataset.t; renderLedger(); SFX.tick(); }));
  $('#armybar').addEventListener('click', openArmy);
  $('#btnAutoSettle').addEventListener('click', () => { if(G && G.settle) autoSettle(); });
  $('#dipOffers').addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button[data-off]'); if(!b) return;
    resolveOffer(+b.dataset.off, b.dataset.c); renderDiplo();
  });
  $('#envoy').addEventListener('click', () => openDiplo(0));
  $('#dipList').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if(!b || b.disabled) return;
    const act = b.dataset.act, rid = +b.dataset.r;
    if(act==='look'){ const c = capitalOf(rid); if(c){ closeDiplo(); focusOn(c.x+.5, c.y+.5); } return; }
    if(act==='war'){
      if(!(R.warArm && R.warArm.r===rid && performance.now() < R.warArm.until)){ R.warArm = {r:rid, until:performance.now()+3000}; renderDiplo(); setTimeout(() => { if(modal==='diplo') renderDiplo(); }, 3050); return; }
      R.warArm = null;
    }
    playerAct(act, rid);
    renderDiplo();
  });
  speed = 1;
  const syncMusicBtn = () => { const b = $('#btnMusic'); b.classList.toggle('off', !MUS.on); b.setAttribute('aria-label', MUS.on ? 'Music on' : 'Music off'); };
  try { if(localStorage.getItem('eh-music')==='0') MUS.on = false; } catch(e){}
  syncMusicBtn();
  R.toggleMusic = () => { SFX.init(); MUS.setOn(!MUS.on); syncMusicBtn(); };
  $('#btnMusic').addEventListener('click', () => R.toggleMusic());
  $('#btnSound').addEventListener('click', e => {
    SFX.init(); SFX.setOn(!SFX.on);
    e.currentTarget.classList.toggle('off', !SFX.on);
    e.currentTarget.setAttribute('aria-label', SFX.on ? 'Sound on' : 'Sound off');
  });
  document.querySelectorAll('#doctrine button').forEach(b => b.addEventListener('click', () => setDoctrine(b.dataset.d)));
  document.querySelectorAll('#decrees button').forEach(b => b.addEventListener('click', () => decree(b.dataset.k)));
  bindCamera();
  window.addEventListener('keydown', e => {
    if(e.key==='Escape' && R.menuOv){ closeMenuOv(); return; }
    if(!G || !running || G.demo) return;
    const k = e.key.toLowerCase();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){
      if(!modal && !paused){ KEYS.add(k); if(k.startsWith('arrow')) e.preventDefault(); }
      return;
    }
    if(e.repeat) return;
    if(modal==='draft' && !R.shipPick && (k==='r' || k==='b' || k==='k')){ if(k==='r') draftReroll(); else if(k==='k') draftSkip(); else if((G.banishes ?? 3) > 0){ R.banMode = !R.banMode; renderChoices(); } return; }
    if(/^[1-5]$/.test(k) && (modal==='draft' || modal==='muster' || (modal==='chest' && R.chestOpts))){
      if(modal==='chest') pickChest(+k-1); else { const c = (modal==='muster' ? R.mchoices : R.choices)[+k-1]; if(c) choose(c); }
      return;
    }
    if(modal && /^[1-5]$/.test(k)) return;
    if(k==='1') setDoctrine('expand'); else if(k==='2') setDoctrine('build'); else if(k==='3') setDoctrine('defend');
    else if(k==='z') decree('mobilize'); else if(k==='x') decree('golden'); else if(k==='c') decree('fortify');
    else if(k==='q' && !modal && !paused) setOrder('charge');
    else if(k==='e' && !modal && !paused) setOrder('hold');
    else if(k==='r' && !modal && !paused) setOrder('fall');
    else if(k==='f'){ const c = capitalOf(PLAYER); if(c) focusOn(c.x+.5, c.y+.5); }
    else if(k==='n'){ if(modal==='diplo') closeDiplo(); else openDiplo(0); }
    else if(k==='v'){ if(modal==='army') closeArmy(); else openArmy(); }
    else if(k==='m' && e.shiftKey){ SFX.init(); MUS.skip(); toast('♪ Next piece','good'); }
    else if(k==='m') R.toggleMusic();
    else if(k==='l'){ if(modal==='ledger') closeLedger(); else openLedger(); }
    else if(k==='t' && !modal) toggleMeter();
    else if(k==='b') watchBattle();
    else if(k==='=' || k==='+') zoomAt(1.4, VW/2, VH/2);
    else if(k==='-') zoomAt(1/1.4, VW/2, VH/2);
    else if(k===' '){ e.preventDefault(); if(modal==='diplo') closeDiplo(); else if(!modal && !paused) heroUse(); }
    else if(k==='p'){ if(paused) closePause(); else if(!modal) openPause(); }
    else if(k==='h'){ if(!modal && !paused) selectHero(); }
    else if(k==='g'){ if(!modal && !paused) heroGarrison(); }
    else if(k==='y'){ if(!modal && !paused) callBanners(); }
    else if(k==='escape'){ if(modal==='diplo') closeDiplo(); else if(modal==='army') closeArmy(); else if(modal==='ledger') closeLedger(); else if(modal==='arena') closeArena(); else if(modal==='collect') closeCollect(); else if(modal==='chest' && !R.chestOpts) closeChest(); else if(paused) closePause(); }
    else if(modal==='chest' && R.chestOpts && /^[1-3]$/.test(k)) pickChest(+k-1);
    else if((modal==='draft' || modal==='muster') && /^[1-5]$/.test(k)){ const c = (modal==='muster' ? R.mchoices : R.choices)[+k-1]; if(c) choose(c); }
  });
  window.addEventListener('keyup', e => KEYS.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => KEYS.clear());
  document.addEventListener('visibilitychange', () => { KEYS.clear(); if(document.hidden && running && G && !G.demo && !G.ended && !modal && !paused) openPause(); });
  if(window.ResizeObserver) new ResizeObserver(resize).observe($('#stage'));
  window.addEventListener('resize', resize);
}

/* ---------- Boot ---------- */
window.EH = { openConquest, conqVassal, banner, holdPic, eliminate, checkVictory, bigMoment, troopImg, startDecline, declareWar, heroOf, rival, citiesOf, hostAct, openChest, earnChest, openEvent, cityMax, poiTouch, lootPop, spawnBarb, spawnUnit, get CARDS(){ return CARDS; }, ageUp, streakKill, levelOptions, openChoices, renderChoices, endGame, capitalOf, get MAPS(){ return MAPS; }, buildTerrain, mapTrample, mapSync, get BSPR(){ return BSPR; }, get USPR(){ return USPR; }, get FXA(){ return FXA; }, get AR_(){ return AR; }, arReset, draftReroll, draftSkip, draftBanish, closeFind, fogTick, gainArt, poiTick, reveal, get ARTS(){ return ARTS; }, openLedger, openArena, openCollect, sheet(sc, own){ sc = sc||4; own = own||PLAYER; const ids = Object.keys(CARDS), c = document.createElement('canvas'); c.width = 8*22*sc; c.height = ids.length*18*sc; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#4a5a32'; g.fillRect(0,0,c.width,c.height); ids.forEach((id, r) => { for(let l=1;l<=8;l++){ const sp = formSprite(id, l, own, null, rankOf(l)).n; g.drawImage(sp, (l-1)*22*sc + sc, r*18*sc + (16-sp.height)*sc, sp.width*sc, sp.height*sc); } }); return c.toDataURL(); }, setNation(n){ R.nation = n; }, get CAM(){ return CAM; }, get MUS(){ return MUS; }, get SFX(){ return SFX; }, earnChest, openChest, startShip, powerOf, resolveOffer, closeChest, unlockCard, get META(){ return META; }, newGame, update, choose, resolveEvent, playerAct, placeCity, autoSettle, computeSites, get S(){ return S; }, get R(){ return R; }, get G(){ return G; }, get modal(){ return modal; }, get choices(){ return modal==='muster' ? R.mchoices : R.choices; }, setRunning(v){ running = v; } };

function start(data){
  R.nation = R.nation || 'horde';
  bind(); resize(); showBest(); buildNatPick();
  if(data && data.G && data.G.v===2 && data.G.rivals && data.G.own && data.G.own.length===N*N && data.G.bmap && data.G.cards && data.G.eraPicks!==undefined && data.G.musterT!==undefined && data.G.offers && data.G.relics && data.G.level!==undefined && data.G.chestQ){
    G = data.G; if(!G.seen) G.seen = new Array(N*N).fill(1); G.pois = G.pois || []; G.arts = G.arts || []; fogInit(); S = null; refreshStats(); running = true; R.bdirty = true; rebuildB(); computeSyn();
    if(data.cam){ CAM.x = data.cam.x; CAM.y = data.cam.y; CAM.z = data.cam.z; }
    setupVisuals(); syncDoctrine(); clampCam(); fogTick();
    $('#ovStart').hidden = true; $('#ovHome').hidden = true;
    openPause();
  } else goHome(false);
  requestAnimationFrame(t => { lastT = t; frame(t); });
}
const hot = window.claude && window.claude.hot;
try { hot && hot.snapshot && hot.snapshot(() => (G && !G.ended && running) ? {G, cam:{x:CAM.x, y:CAM.y, z:CAM.z}} : {}); } catch(e){}
if(hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
