"use strict";
/* ---------- Economy ---------- */
function econ(dt){
  const dm = DOCT[G.doctrine], gold = G.buff.golden>0 ? 1.5 : 1;
  const tb = tradeCount()*.1*(1+S.tradeBoost);
  const fM = (1+S.food+S.all+tb)*(dm.food||1)*gold, pM = (1+S.prod+S.all+tb)*gold, sM = (1+S.sci+S.all+tb)*(dm.sci||1)*gold;
  const mine = citiesOf(PLAYER);
  const used = new Uint8Array(N*N), WM = R.wmul || {f:1,p:1,s:1};
  const AM = {f:WM.f*(hasArt('plough') ? 1.15 : 1), p:WM.p*(hasArt('anvil') ? 1.15 : 1), s:WM.s*(hasArt('scroll') ? 1.15 : 1)};
  for(const c of G.cities) used[idx(c.x,c.y)] = 1;
  let F=0, P=0, SC=0, mk=0;
  const cap = 5 + S.popCap;
  for(const c of mine){
    const cand = [];
    for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){
      const x=c.x+dx, y=c.y+dy; if(!inb(x,y)) continue;
      const i=idx(x,y); if(G.own[i]!==PLAYER || used[i]) continue;
      const yy=tileYield(i); cand.push([yy[0]*1.1+yy[1]+yy[2]*1.2, i, yy]);
    }
    cand.sort((a,b) => b[0]-a[0]);
    let f=2, p=2, s=2 + c.pop*.6;
    const n = Math.min(c.pop, cand.length);
    for(let k=0;k<n;k++){ const it=cand[k]; used[it[1]]=1; f+=it[2][0]; p+=it[2][1]; s+=it[2][2]; }
    const bm = R.cb.get(c.id) || {};
    let capb = 0;
    for(const k in bm){ const df = BDEF[k]; if(!df) continue; const e = df.e, n = bm[k]; f += (e.f||0)*n; p += (e.p||0)*n; s += (e.s||0)*n; mk += (e.i||0)*n; capb += (e.cap||0)*n; }
    f*=fM*AM.f; p*=pM*AM.p; s*=sM*AM.s; if(c.unrest > G.t){ p *= .1; s *= .1; f = Math.min(f, c.pop); }
    if(G.decline && !G.decline.done){ p *= G.declMul||1; s *= G.declMul||1; }
    c.prod = p;
    const net = f - c.pop;
    c.food += net*dt;
    const th = 12 + 6*Math.pow(c.pop,1.4);
    const hcap = 3 + S.popCap + Math.min(12, bm.house||0) + capb;
    if(c.food >= th){
      if(c.pop < hcap){ c.pop++; c.food = 0; c.hp += 25*(1+S.cityhp); }
      else c.food = th;
    } else if(c.food < -th*.6 && c.pop > 1){ c.pop--; c.food = 0; }
    F+=net; P+=p; SC+=s;
  }
  const inf = ((.4 + .1*mine.length + mk)*(1+S.infl) + .25*tradeCount()*(1+S.tradeBoost)) * gold * (hasArt('crown') ? 1.25 : 1);
  G.rates = {f:F, p:P, s:SC, i:inf};
  G.sci += SC*dt;
  G.influence = Math.min(600, G.influence + inf*dt);
  G.culture = (G.culture||0) + inf*dt;
  R.myTiles = ownedCount(PLAYER);
  const bl = borderLvl();
  if(bl > (G.bLvl||0)){ G.bLvl = bl; toast('Your influence spreads. Each city can now hold '+tilesPerCity(bl)+' tiles','good'); }
  if(R.myTiles >= tileCap(PLAYER) && G.capTold !== bl && G.t > 30){ G.capTold = bl; toast('Your borders are at their limit. Earn influence to push them out','warn'); }
  const pr = P*dt;
  G.settler += pr*dm.settler; G.army += pr*dm.army;
  let rep = pr*dm.repair;
  const sc = settlerCost();
  if(mine.length >= cityCap()){
    G.settle = null; R.sites = null;
    if(G.settler > sc){ rep += G.settler - sc; G.settler = sc; }
    if(G.settler >= sc && G.capNote !== G.eraIdx){ G.capNote = G.eraIdx; toast('City limit reached. The next era allows more, or take cities by war','warn'); }
  } else if(G.settler >= sc){
    if(G.settler > sc){ rep += G.settler - sc; G.settler = sc; }
    if(!G.settle){ G.settle = {t:G.t}; R.sites = null; toast('A settler is ready. Tap a lit spot to found a city','good'); SFX.open(); }
    else if(G.t - G.settle.t > 15) autoSettle();
  }
  /* during the Decline your realm's levies march without pay: no upkeep, no disbanding, a steady trickle of troops */
  const budget = P*dm.army, upk = (G.decline && !G.decline.done) ? 0 : armyUpkeep();
  G.rates.a = budget; G.rates.u = upk;
  G.army += (budget - upk)*dt;
  let have = armySup(PLAYER), spare = budget - upk;
  if(G.army < 0){ G.army = 0; if(spare < 0 && have > 0) disbandOne(); }
  for(let g=0; g<40; g++){
    const id = pickCard(PLAYER), cost = soldierCost(id), uu = unitUpkeep(id), sp = supOf(id);
    if(have + sp > pArmyMax() + .01) break;
    if(G.army < cost || (spare < uu && G.buff.rally <= 0)) break;
    const mc = musterCity(PLAYER); if(!mc) break;
    G.army -= cost; spawnUnit(PLAYER, mc, id); have += sp; spare -= uu;
  }
  { const n = unitCount(PLAYER), avg = n > 0 ? Math.max(.1, upk/Math.max(.5, have)) : unitUpkeep(pickCard(PLAYER))/supOf(pickCard(PLAYER)); G.armySup = have; G.armyCap = Math.round(Math.min(pArmyMax(), Math.max(have, budget/avg))); }
  const poolCap = 120*(1 + .3*G.eraIdx);
  if(G.army > poolCap){ rep += G.army - poolCap; G.army = poolCap; }
  if(rep > 0){
    const hurt = mine.filter(c => c.hp < cityMax(c) && !(G.decline && !G.decline.done && !c.capital));
    if(hurt.length){ const each = rep*2/hurt.length; hurt.forEach(c => c.hp = Math.min(cityMax(c), c.hp+each)); }
  }
  G.stats.peak = Math.max(G.stats.peak, ownedCount(PLAYER));
  if(G.proj && G.proj.parts && !G.won && !G.ended) shipStep(dt, P);
}

/* ---------- Space Program: pick three launch sites, survive a long build, choose your defenses ---------- */
const SHIP_MIN_BUILD = 240;
const PROTOS = {
  shield:{n:'Missile Shield', d:'Towers in launch-site cities reach 1.5 tiles farther and fire twice as fast', art:'radar'},
  bunkers:{n:'Hardened Sites', d:'Launch-site cities get double health and repair three times as fast', art:'bunker'},
  militia:{n:'Home Guard', d:'Each launch site raises 8 defenders now, and 4 more with every enemy wave during launch', art:'barracks'},
  decoy:{n:'Decoy Sites', d:'For 2 minutes every enemy army marches on a decoy city instead of your launch sites', art:'house'},
  envoys:{n:'Secret Envoys', d:'Buy a 3-minute truce with one coalition nation (their armies go home)', art:'library'},
  rally:{n:'Hero of the Hour', d:'Your hero’s band deals 20% more damage, and your hero returns in 20 seconds instead of 60 while the program runs', art:'castle'},
  scorched:{n:'Scorched Earth', d:'Enemy troops inside your borders move 35% slower', art:'lumber'},
  accel:{n:'Crash Program', d:'The rest of the build goes 30% faster, but every launch site loses a quarter of its health now', art:'factory'},
  walls:{n:'Fortress Network', d:'Every city gets +50% health and its towers deal 50% more damage', art:'castle'}
};
const proto = k => !!(G && G.proj && G.proj.proto && G.proj.proto[k]);
const isPart = c => !!(G && G.proj && G.proj.parts && G.proj.parts.some(pt => pt.c===c.id));
function exposure(c){
  let best = 99, who = null;
  for(let dy=-14; dy<=14; dy++) for(let dx=-14; dx<=14; dx++){ const x = c.x+dx, y = c.y+dy; if(x<0||y<0||x>=N||y>=N) continue; const o = G.own[idx(x,y)]; if(o > 1 && rival(o) && rival(o).alive){ const d = Math.hypot(dx,dy); if(d < best){ best = d; who = rival(o).name; } } }
  return {d:best, who};
}
function siteOptions(){
  const used = new Set((G.proj.sites||[])), cs = citiesOf(PLAYER).filter(c => !used.has(c.id)).sort((a,b) => (b.prod||0) - (a.prod||0)).slice(0, 4);
  return cs.map(c => ({ucard:'site', cid:c.id}));
}
function protoOptions(){
  const taken = G.proj.proto || {};
  return shuffle(Object.keys(PROTOS).filter(k => !taken[k])).slice(0, 3).map(k => ({ucard:'proto', id:k}));
}
function openShipPick(kind){
  R.choices = kind==='site' ? siteOptions() : protoOptions(); R.mchoices = []; R.shipPick = kind;
  if(!R.choices.length){ if(kind==='site') finishSites(); return; }
  const n = (G.proj.sites||[]).length;
  R.draftTitle = kind==='site' ? 'Choose launch site '+(n+1)+' of 3' : 'Defense protocol · choose one';
  R.draftKick = kind==='site' ? 'Big cities build their part faster. Frontline cities are closer to the enemy' : 'Starship '+Math.floor(shipPct()*100)+'% built · the coalition is coming for your launch sites';
  modal = 'draft'; R.openedAt = performance.now();
  renderChoices();
  const ov = $('#ovDraft'); if(!ov || !ov.querySelector) return; ov.hidden = false; SFX.open && SFX.open();
}
function shipChoose(t){
  modal = null; const ov = $('#ovDraft'); if(ov) ov.hidden = true; R.draftTitle = null;
  if(t.ucard==='site'){
    G.proj.sites = G.proj.sites || []; G.proj.sites.push(t.cid); markLaunch(t.cid);
    const c = G.cities.find(x => x.id===t.cid); if(c) toast(c.name+' will build a starship part','good',{x:c.x+.5, y:c.y+.5});
    if(G.proj.sites.length < 3 && citiesOf(PLAYER).length > G.proj.sites.length) openShipPick('site'); else finishSites();
    return;
  }
  if(t.ucard==='proto') applyProto(t.id);
}
function finishSites(){
  const s = G.proj.sites || []; const cs = shipCities();
  while(s.length < 3 && cs.length) s.push(cs[s.length % cs.length].id);
  G.proj.parts = s.slice(0,3).map(cid => ({c:cid, p:0, rate:0}));
  G.proj.parts.forEach(pt => markLaunch(pt.c));
  /* phase one: only your neighbors take up arms. The whole world unites once a third of the ship is built */
  G.alarm = Math.max(G.alarm||0, 2); let n = 0;
  for(const r of G.rivals){ if(!r.alive || r.status==='ally' || r.status==='war') continue; if((r.near||99) < 27 && reachWar(r.id, PLAYER)){ r.status = 'war'; r.rel = Math.min(r.rel, -50); r.weary = 0; r.warStart = G.t; r.offeredPeace = G.t; n++; } }
  banner('Starship', n ? 'Your neighbors take up arms' : 'The world watches');
  toast((n ? n+' neighboring nation'+(n>1 ? 's declare' : ' declares')+' war. ' : '')+'The rest of the world will unite against you when a third of the ship is built','bad');
  R.raidForce = true;
  openShipPick('proto');
}
function applyProto(k){
  const P = PROTOS[k]; G.proj.proto = G.proj.proto || {}; G.proj.proto[k] = 1;
  banner(P.n, 'Defense protocol'); toast(P.n+': '+P.d,'good');
  const parts = G.proj.parts.map(pt => G.cities.find(c => c.id===pt.c)).filter(Boolean);
  if(k==='militia') for(const c of parts) shipGuard(c, 8);
  if(k==='decoy'){ const far = citiesOf(PLAYER).filter(c => !isPart(c)).sort((a,b) => exposure(a).d - exposure(b).d)[0]; if(far){ G.proj.decoy = far.id; G.proj.decoyT = G.t + 120; toast('Rumors say the rockets are in '+far.name,'good',{x:far.x+.5, y:far.y+.5}); } }
  if(k==='envoys'){ const r = G.rivals.filter(r => r.alive && r.status==='war').sort((a,b) => b.rel - a.rel)[0]; if(r){ r.status = 'peace'; r.truceT = G.t + 180; r.peaceT = G.t; toast(r.name+' agrees to a secret truce for 3 minutes','good'); } }
  if(k==='accel') for(const c of parts) c.hp *= .75;
  if(k==='bunkers' || k==='walls') for(const c of citiesOf(PLAYER)) c.hp = Math.min(cityMax(c), c.hp*1.5);
  R.raidForce = true;
}
function shipGuard(c, n){
  const ids = G.cards.map(s => s.id).filter(id => CARDS[id].role!=='support'); if(!ids.length) return;
  const best = ids.sort((a,b) => cardLevel(PLAYER,b)*CARDS[b].hp - cardLevel(PLAYER,a)*CARDS[a].hp)[0];
  for(let k=0;k<n;k++) spawnUnit(PLAYER, c, ids[k % ids.length] || best);
}
function siteCardHTML(t){
  const c = G.cities.find(x => x.id===t.cid); if(!c) return '<button class="card"><b>?</b></button>';
  const ex = exposure(c), rate = Math.min((c.prod||0) + (G.rates.p||0)*.04, PART_NEED/SHIP_MIN_BUILD), mins = Math.max(SHIP_MIN_BUILD, PART_NEED/Math.max(1, (c.prod||0) + (G.rates.p||0)*.04))/60;
  const tag = ex.d <= 6 ? '<span class="evo" style="color:#ff8a7e">⚠ Frontline · '+Math.round(ex.d)+' tiles from '+esc(ex.who)+'</span>' : ex.d < 99 ? '<span class="abil">Border · '+Math.round(ex.d)+' tiles from '+esc(ex.who)+'</span>' : '<span class="abil on">Interior · far from every rival</span>';
  return '<button class="card is-key" style="--era:var(--sci)"><span class="era"><i></i>Launch site</span><b>'+esc(c.name)+'</b><span class="desc">Production '+Math.round(c.prod||0)+' · its part takes about '+mins.toFixed(1)+' min'+(c.capital ? ' · your capital' : '')+'</span>'+tag+'</button>';
}
function protoCardHTML(t){
  const P = PROTOS[t.id];
  return '<button class="card is-relic" style="--era:#7ab8f0"><span class="era"><i></i>Protocol</span><b>'+P.n+'</b><span class="desc">'+P.d+'</span></button>';
}

/* Starship: three parts in three cities. Starting it unites the world against you */
function shipCities(){ return citiesOf(PLAYER).slice().sort((a,b) => (b.prod||0) - (a.prod||0)); }
function markLaunch(cid){
  const c = G.cities.find(x => x.id===cid); if(!c) return;
  const i = findBTile(c, 'house'); if(i >= 0){ G.bmap[i] = BK.indexOf('launch'); R.bnew.set(i, G.t); R.bdirty = true; }
}
function startShip(){
  if(G.t >= 1080) toast('The Space Program holds off the decline. While it lasts, the age does not end','good');
  G.proj = {sites:[], parts:null, launch:0, launching:false, stage:0, proto:{}};
  banner('Space Program', 'Choose three launch sites'); SFX.era();
  openShipPick('site');
}
function shipEscalate(s){
  const re = rEra();
  G.rivals.forEach(r => { if(r.alive && r.status==='war'){ r.army += 120*s*(1 + .3*re); if(r.hero && !heroOf(r.id)) r.hero.t = G.t; } });
  banner('The coalition', s >= 3 ? 'Throws everything at your launch sites' : 'Masses fresh armies'); SFX.warn(); R.shake = Math.min(8, (R.shake||0) + 3);
  R.raidForce = true;
}
function shipStep(dt, P){
  const pr = G.proj;
  for(const pt of pr.parts){
    let c = G.cities.find(x => x.id===pt.c);
    if(!c || c.owner!==PLAYER || c.dead){
      if(pt.p > 0){ toast('A launch site has fallen. Half of its part is lost and the work moves to another city','bad', c ? {x:c.x+.5, y:c.y+.5} : null); R.shake = 4; }
      pt.p *= .5;
      if(pr.launching){ pr.launching = false; pr.launch = 0; banner('Launch halted', 'A part city has fallen'); }
      const used = new Set(pr.parts.map(x => x.c)); const cand = shipCities();
      c = cand.find(x => !used.has(x.id)) || cand[0];
      pt.c = c ? c.id : 0; if(c) markLaunch(c.id);
      if(!c) continue;
    }
    pt.rate = (c.prod||0) + P*.04 + (G.maxed ? (G.rates.s||0)*.6 : 0); pt.p = Math.min(PART_NEED, pt.p + Math.min(pt.rate*(G.doctrine==='build' ? 1.25 : 1), PART_NEED/SHIP_MIN_BUILD)*(proto('accel') ? 1.3 : 1)*dt);
  }
  for(const r of G.rivals){ if(r.alive && r.truceT && G.t >= r.truceT){ r.truceT = 0; if(r.status==='peace'){ r.status = 'war'; r.warStart = G.t; toast(r.name+'’s truce is over. They march again','bad'); } } }
  if(!pr.launching && (pr.stage||0) < 2 && shipPct() >= ((pr.stage||0)+1)/3){ pr.stage = (pr.stage||0) + 1; if(pr.stage===1) formCoalition('ship'); shipEscalate(pr.stage); if(!modal) openShipPick('proto'); else pr.pendingPick = true; }
  if(pr.pendingPick && !modal){ pr.pendingPick = false; openShipPick('proto'); }
  if(!pr.launching && pr.parts.every(pt => pt.p >= PART_NEED)){
    pr.launching = true; pr.launch = LAUNCH_T;
    banner('Launch window', 'Hold every launch site for '+LAUNCH_T/60+' minutes'); SFX.warn(); R.shake = 5; shipEscalate(3);
    const side = rint(4), p = edgePoint(side, rnd(8,N-8), .5);
    spawnBarb('warlord', p[0], p[1], 2.5 + Math.max(0, G.t-840)/300);
    for(let j=0;j<50;j++){ const q = edgePoint((side+rint(3)+3)%4, rnd(2,N-2), rnd(0,2)); spawnBarb(pickType(G.t), q[0], q[1]); }
    toast('Every enemy marches on your launch sites','bad');
  }
  if(pr.launching){
    pr.launch -= dt;
    pr.wave = (pr.wave ?? 30) - dt;
    if(pr.wave <= 0 && pr.launch > 5){
      pr.wave = 30;
      const side = rint(4); for(let j=0;j<24;j++){ const q = edgePoint((side+j)%4, rnd(2,N-2), rnd(0,2)); spawnBarb(pickType(G.t), q[0], q[1]); }
      G.rivals.forEach(r => { if(r.alive && r.status==='war'){ r.army += 200; } });
      toast('Fresh enemies march on your launch sites','bad'); R.shake = 3;
      if(proto('militia')) pr.parts.forEach(pt => { const c = G.cities.find(x => x.id===pt.c); if(c) shipGuard(c, 4); });
    }
    if(pr.launch <= 0) endGame(true, null, null, 'science');
  }
}
function shipPct(){ if(!G.proj || !G.proj.parts) return 0; return G.proj.parts.reduce((a,pt) => a + Math.min(1, pt.p/PART_NEED), 0)/3; }
function rivalDecrees(r, dt){
  if(!G.diff) return;
  r.cd = r.cd || {m:rnd(30,90), g:rnd(60,150), f:rnd(20,60)}; r.buff = r.buff || {m:0, g:0, f:0};
  for(const k in r.cd) r.cd[k] -= dt; for(const k in r.buff) r.buff[k] = Math.max(0, r.buff[k] - dt);
  const sc = CR(7) ? .7 : 1, cap = capitalOf(r.id), at = cap ? {x:cap.x+.5, y:cap.y+.5} : null;
  if(r.cd.m <= 0 && r.status==='war' && (R.raidGo.get(r.id) || R.danger.get(r.id))){
    r.cd.m = 150*sc; r.buff.m = 12;
    const c = musterCity(r.id) || capitalOf(r.id); for(let n=0;n<4;n++) spawnUnit(r.id, c);
    toast('⚔ '+r.name+' mobilizes against you!','bad', at);
  }
  if(r.cd.f <= 0 && R.danger.get(r.id) && warringAny(r.id)){
    r.cd.f = 120*sc; r.buff.f = 10;
    citiesOf(r.id).forEach(c => c.hp = Math.min(cityMax(c), c.hp + cityMax(c)*.25));
    if(r.status==='war') toast(r.name+' mans its walls','warn', at);
  }
  if(r.cd.g <= 0 && !warringAny(r.id) && Math.random() < .02){ r.cd.g = 180*sc; r.buff.g = 20; }
}
function rivalEcon(dt){
  const re = rEra();
  for(const r of G.rivals){
    if(!r.alive) continue;
    const T = TRAITS[r.trait], cs = citiesOf(r.id);
    if(!cs.length) continue;
    let prod = 0;
    for(const c of cs){
      c.food += (1.2 + c.pop*.3)*T.grow*dt;
      const th = 12 + 6*Math.pow(c.pop,1.4);
      if(c.food >= th){ if(c.pop < 6+re*3){ c.pop++; c.food=0; } else c.food = th; }
      const bm = R.cb.get(c.id) || {}; let nb = 0; for(const k in bm) nb += bm[k];
      prod += 2 + c.pop*1.1 + Math.min(40, nb)*.6;
    }
    const boost = rivalBoost();
    prod *= (1 + .25*re + .04*re*re)*T.econ*boost*((r.buff && r.buff.g > 0) ? 1.5 : 1);
    const vsP = !G.arena && atWar(r.id, PLAYER);
    if(vsP){ prod *= 1.35; if(!r.mobil){ r.mobil = 1; r.army += 25*(1 + .3*re)*cs.length; } } else r.mobil = 0;
    r.prod = prod;
    rivalDecrees(r, dt);
    const share = warringAny(r.id) ? .8 : T.army;
    r.army += prod*share*dt; r.settler += prod*(1-share)*dt;
    const sc = 40*Math.pow(cs.length,1.5);
    if(cs.length < 3+Math.floor(re*.7) && r.settler >= sc){
      const s = findSite(r.id);
      if(s){ r.settler -= sc; foundCity(s.x, s.y, r.id, false); } else r.settler = sc;
    } else if(r.settler > sc) r.settler = sc;
    if((r.lastEra||0) < re){ r.lastEra = re; rivalPick(r); }
    let ubase = 1 + .3*re, ucap = (3 + cs.length*2 + (r.trait==='warlike' ? 3 : 0))*2.4*(1 + .3*re)*boost*(CR(3) ? 1.15 : 1)*clamp(.5 + .5*(r.morale ?? 70)/70, .5, 1.15);
    if(vsP) ucap = Math.max(ucap, armySup(PLAYER)*.5*clamp(.5 + .5*(r.morale ?? 70)/70, .5, 1.15));
    let wsum = 0; for(const u of G.units) if(u.owner===r.id && u.hp>0 && u.card && !u.hero && !u.levy) wsum += rUp(r.id, u.card);
    { const mc = wsum < ucap ? musterCity(r.id) : null, per = 1 + Math.floor(cs.length/3);
      if(mc) for(let g=0; g<per && wsum < ucap; g++){ const id = pickCard(r.id), c = CARDS[id].cost*ubase*formCost((r.lv||{})[id]||1); if(r.army < c) break; r.army -= c; spawnUnit(r.id, mc, id); wsum += rUp(r.id, id); } }
    if(r.army > 60*ubase) r.army = 60*ubase;
    if(!G.arena && r.lost > 0 && wsum > ucap*1.2) desertOne(r, dt);
  }
}

function claimOne(o){
  let best=-1e9, bi=-1;
  const fl = o===PLAYER ? G.flag : null;
  const cs = citiesOf(o); if(!cs.length) return;
  if(o===PLAYER){ if(R.myTiles >= tileCap(PLAYER)) return; } else if(ownedCount(o) >= tileCap(o)) return;
  const bx = o===PLAYER ? .35*borderLvl() : .3*rBorderLvl();
  const [bx0,by0,bx1,by1] = cityBox(o, 8);
  for(let y=Math.max(0,by0-1);y<=Math.min(N-1,by1+1);y++) for(let x=Math.max(0,bx0-1);x<=Math.min(N-1,bx1+1);x++){
    const i=idx(x,y); if(G.own[i]) continue;
    if(!((x>0&&G.own[i-1]===o) || (x<N-1&&G.own[i+1]===o) || (y>0&&G.own[i-N]===o) || (y<N-1&&G.own[i+N]===o))) continue;
    let dc=1e9, cc=null;
    for(const c of cs){ const d=Math.hypot(c.x-x,c.y-y); if(d<dc){ dc=d; cc=c; } }
    const reach = 2.2 + Math.min(4, cc.pop*.5) + (o===PLAYER && S.border>=1 ? 1 : 0) + bx;
    if(dc > reach) continue;
    let sc = tileValue(i)*.6 - dc*.55 + Math.random()*.8;
    if(G.ter[i]===WATER) sc -= (o===PLAYER && S.coastal) ? .3 : 1.2;
    if(fl) sc -= Math.hypot(x+.5-fl.x, y+.5-fl.y)*.22;
    if(sc > best){ best=sc; bi=i; }
  }
  if(bi >= 0){ G.own[bi]=o; if(o===PLAYER){ R.flash.set(bi,G.t); R.myTiles++; } R.dirty=true; }
}

function siteInfo(o,x,y){
  if(x<1 || y<1 || x>=N-1 || y>=N-1) return null;
  const i = idx(x,y), t = G.ter[i];
  if(t===WATER || t===MOUNT) return null;
  if(G.own[i] && G.own[i]!==o) return null;
  if(o===PLAYER && G.seen && !G.seen[i]) return null;
  const maxD = o===PLAYER ? 8 + S.settleDist : 8;
  let dmin = 1e9;
  for(const c of G.cities){
    const d = Math.hypot(c.x-x, c.y-y);
    if(c.owner===o){ if(d < 5) return null; if(d < dmin) dmin = d; }
    else if(d < 5.5) return null;
  }
  if(dmin > maxD) return null;
  let f=0, p=0, s=0, foreign=0;
  for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){
    if(!inb(x+dx,y+dy)) continue; const j = idx(x+dx,y+dy);
    const yy = o===PLAYER ? tileYield(j) : YIELD[G.ter[j]];
    f += yy[0]; p += yy[1]; s += yy[2];
    if(G.own[j] && G.own[j]!==o) foreign++;
  }
  const coast = [[1,0],[-1,0],[0,1],[0,-1]].some(([a,b]) => G.ter[idx(x+a,y+b)]===WATER);
  return {f, p, s, hill:t===HILLS, dmin, foreign, coast};
}
const siteScore = (o,x,y,inf) => (inf.f*1.1 + inf.p + inf.s*1.2)*.3 - inf.foreign + (G.own[idx(x,y)]===o ? 1.5 : 0) - Math.abs(inf.dmin-6)*.4 + (inf.hill ? 1.2 : 0) + resPull(x, y);
function cityBox(o, pad){
  let x0=N, y0=N, x1=0, y1=0;
  for(const c of G.cities) if(c.owner===o){ x0=Math.min(x0,c.x); y0=Math.min(y0,c.y); x1=Math.max(x1,c.x); y1=Math.max(y1,c.y); }
  return [Math.max(1,x0-pad), Math.max(1,y0-pad), Math.min(N-2,x1+pad), Math.min(N-2,y1+pad)];
}
function findSite(o){
  if(!citiesOf(o).length) return null;
  const fl = o===PLAYER ? G.flag : null, cap = capitalOf(o);
  const maxD = o===PLAYER ? 8 + S.settleDist : 8;
  const danger = new Uint8Array(N*N);
  for(const u of G.units){ if(u.hp<=0 || !atWar(o,u.owner)) continue; const tx=clamp(Math.floor(u.x),0,N-1), ty=clamp(Math.floor(u.y),0,N-1); danger[idx(tx,ty)]++; }
  const [x0,y0,x1,y1] = cityBox(o, Math.ceil(maxD)+1);
  let best=-1e9, bs=null;
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const inf = siteInfo(o,x,y); if(!inf) continue;
    let dz = 0;
    for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) if(inb(x+dx,y+dy)) dz += danger[idx(x+dx,y+dy)];
    let sc = siteScore(o,x,y,inf) + Math.random()*.5 - dz*2;
    if(fl) sc -= Math.hypot(x+.5-fl.x, y+.5-fl.y)*.45;
    else if(cap) sc -= Math.hypot(x-cap.x, y-cap.y)*.12;
    // your auto-placed towns lean toward the middle of the map and away from its edges
    if(o===PLAYER && !fl){ sc -= Math.hypot(x+.5-N/2, y+.5-N/2)*.11; const ed = Math.min(x, y, N-1-x, N-1-y); if(ed < 7) sc -= (7-ed)*.7; }
    if(sc > best){ best=sc; bs={x,y}; }
  }
  return bs;
}
function computeSites(){
  const list = [];
  const [x0,y0,x1,y1] = cityBox(PLAYER, Math.ceil(8 + S.settleDist)+1);
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const inf = siteInfo(PLAYER,x,y); if(!inf) continue;
    list.push({x, y, inf, sc:siteScore(PLAYER,x,y,inf)});
  }
  let mn=1e9, mx=-1e9; list.forEach(s => { mn=Math.min(mn,s.sc); mx=Math.max(mx,s.sc); });
  list.forEach(s => s.q = mx>mn ? (s.sc-mn)/(mx-mn) : 1);
  list.slice().sort((a,b) => b.sc-a.sc).slice(0,3).forEach(s => s.best = true);
  R.sites = list; R.sitesT = R.now;
}
function placeCity(x,y){
  if(!G.settle || !siteInfo(PLAYER,x,y)) return false;
  G.settler = Math.max(0, G.settler - settlerCost());
  G.settle = null; R.sites = null;
  foundCity(x, y, PLAYER, false);
  return true;
}
function autoSettle(){
  if(!G.settle) return;
  const s = findSite(PLAYER);
  if(s) placeCity(s.x, s.y);
  else { G.settle = null; R.sites = null; toast('No room for a new city nearby','warn'); }
}
function disbandOne(){
  let pick = null;
  for(const u of G.units) if(u.owner===PLAYER && u.hp>0 && ROLE[u.kind] && !u.merc && (!pick || u.id > pick.id)) pick = u;
  if(!pick) return;
  pick.hp = 0; pick.dead = true; burst(pick.x, pick.y, 4, '#8a8580');
  if(!R.disbandNote || G.t - R.disbandNote > 20){ R.disbandNote = G.t; toast('Production can\u2019t pay your army\u2019s upkeep. Units are leaving','warn'); }
}
