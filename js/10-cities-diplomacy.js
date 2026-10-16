"use strict";
/* ---------- Cities changing hands ---------- */
function resolveCities(){
  const dead = G.cities.filter(c => c.dead);
  for(const c of dead){
    if(G.ended) return;
    if(c.hold && c.owner > 1 && c.killer!==PLAYER){ c.dead = false; c.killer = 0; c.hp = cityMax(c)*.5; continue; }  // only you can take a hidden stronghold
    if(c.killer>0 && c.killer!==c.owner && (c.killer===PLAYER || rival(c.killer).alive)) captureCity(c, c.killer);
    else destroyCity(c);
  }
}
function captureCity(c, nw){
  const old = c.owner;
  if(old===PLAYER && c.capital){ endGame(false, c, rival(nw).name); return; }
  const wasCap = c.capital;
  c.dead = false; c.killer = 0; c.owner = nw; c.capital = false; c.born = G.t; c.capT = G.t;
  c.pop = Math.max(1, c.pop-1); c.hp = cityMax(c)*.35; c.food = 0;
  for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++){
    const x=c.x+dx, y=c.y+dy; if(!inb(x,y)) continue; const i = idx(x,y);
    if(Math.max(Math.abs(dx),Math.abs(dy)) <= 1){ if(G.own[i]===old || !G.own[i]) G.own[i] = nw; continue; }
    if(G.own[i]!==old) continue;
    if(!G.cities.some(k => k!==c && k.owner===old && Math.abs(k.x-x)<=3 && Math.abs(k.y-y)<=3)) G.own[i] = nw;
  }
  if(old > 1) moraleHit(rival(old), wasCap ? 30 : 20);
  if(nw > 1){ const rn = rival(nw); rn.morale = Math.min(100, (rn.morale ?? 70) + 8); }
  if(old>1 && wasCap){ const ro = rival(old); ro.capLost = true; if(ro.proj){ ro.proj = null; ro.projAt = G.t + 240; toast(ro.name+'’s starship program collapsed','good'); } }
  R.dirty = true; R.bdirty = true;
  const at = {x:c.x+.5, y:c.y+.5};
  burst(c.x+.5, c.y+.5, 22, ocol(nw));
  if(nw===PLAYER){
    G.stats.captured++; G.stats.forced = (G.stats.forced||0) + 1; if(G.stats.firstCapT == null) G.stats.firstCapT = G.t; if(G.t < 480) G.stats.capEarly = (G.stats.capEarly||0) + 1; lifeAdd('captured'); rival(old).lost++; rival(old).lastBy = PLAYER;
    c.unrest = G.t + 60; c.prevOwner = old; G.warmon = (G.warmon||0) + 1;
    toast('You captured '+c.name+'. It is restless for 60s: no output, and it may rise up if '+rival(old).name+'’s troops return', 'good', at);
    if(G.warmon === 3 || G.warmon === 8) toast('Your conquests alarm the world. Every nation trusts you less', 'warn'); float(c.name+' is yours', c.x+.5, c.y-.4, '#ffd98a', 1.8); SFX.found();
    G.rivals.forEach(r => { if(r.alive && r.id!==old) r.rel -= 4; });
  } else if(old===PLAYER){
    G.stats.lost++; if(G.stats.firstLostT == null) G.stats.firstLostT = G.t;
    toast(c.name+' was taken by '+rival(nw).name, 'bad', at); R.shake = 6; SFX.fall();
  } else {
    rival(old).lost++; rival(old).lastBy = nw;
    toast(rival(nw).name+' took '+c.name+' from '+rival(old).name, '', at);
  }
  if(old!==PLAYER && old>1){
    if(!citiesOf(old).length) eliminate(old);
    else if(wasCap) promote(old);
  }
  if(nw===PLAYER && wasCap && old > 1 && !G.arena && !G.demo && rival(old).alive && citiesOf(old).length){ R.conqQ = {r:old, c:c.id}; }
}
function destroyCity(c){
  const o = c.owner; (R.rubble || (R.rubble = [])).push({x:c.x+.5, y:c.y+.98, t:G.t});
  if(o===PLAYER && c.capital){ endGame(false, c); return; }
  G.cities = G.cities.filter(x => x !== c);
  for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){
    const x=c.x+dx, y=c.y+dy; if(!inb(x,y) || G.own[idx(x,y)]!==o) continue;
    let keep=false; for(const k of G.cities) if(k.owner===o && Math.abs(k.x-x)<=2 && Math.abs(k.y-y)<=2){ keep=true; break; }
    if(!keep) clearTile(idx(x,y));
  }
  burst(c.x+.5, c.y+.5, 30, '#ffb35c'); burst(c.x+.5, c.y+.3, 16, '#6c6862');
  R.dirty = true;
  const at = {x:c.x+.5, y:c.y+.5};
  if(o===PLAYER && c.razed){ toast(c.name+' is put to the torch', 'warn', at); R.shake = 6; SFX.fall(); }
  else if(o===PLAYER){ G.stats.lost++; toast(c.brk ? c.name+' breaks away from your empire' : c.name+' has fallen to raiders', 'bad', at); R.shake = 6; SFX.fall(); }
  else {
    toast('Raiders burned '+c.name+' of '+rival(o).name, '', at);
    if(c.capital && rival(o).proj){ rival(o).proj = null; rival(o).projAt = G.t + 240; }
    if(!citiesOf(o).length) eliminate(o);
    else if(c.capital) promote(o);
  }
}
function promote(o){
  const cs = citiesOf(o); if(!cs.length) return;
  cs.sort((a,b) => b.pop-a.pop); cs[0].capital = true;
}
function eliminate(o){
  const r = rival(o); if(r && r.hold){ holdFall(o); return; } if(!r.alive) return;
  r.alive = false; r.status = 'gone';
  G.units.forEach(u => { if(u.owner===o && u.hp>0){ u.hp=0; u.dead=true; burst(u.x,u.y,4,r.col); } });
  for(let i=0;i<G.own.length;i++) if(G.own[i]===o){ G.own[i] = 0; G.bmap[i] = 0; }
  R.bdirty = true;
  G.rwars = G.rwars.filter(w => w.a!==o && w.b!==o);
  G.offers = (G.offers||[]).filter(q => q.r!==o);
  R.dirty = true;
  banner(r.name, 'A nation falls'); toast(r.name+' is no more', 'warn');
  if(r.mystery && r.lastBy===PLAYER) metMystery(r);
  if(r.lastBy===PLAYER){ earnChest('You conquered '+r.name); learnLegend(r); }
  checkVictory();
}
function checkVictory(){
  if(G.decline && !G.decline.win && !G.decline.done && !G.rivals.some(x => x.alive && !x.vassal) && !G.ended && !G.won){ G.declPrev = G.decline; G.decline = null; G.endless = false; G.conquest = true; endGame(true, null, null, 'conquest'); return; }
  if(G.decline) return;
  if(!G.rivals.some(x => x.alive && !x.vassal) && !G.ended && !G.won){ G.conquest = true; endGame(true, null, null, 'conquest'); }
}
/* ---------- Conquest choice: absorb, vassal or raze when a rival capital falls ---------- */
function openConquest(q){
  const r = rival(q.r), c = G.cities.find(k => k.id===q.c); if(!r || !r.alive) return;
  const P = NATIONS_P.find(n => n.id===r.people) || {start:[]}, line = P.start[0], C = CARDS[line];
  const has = !!slotOf(line), room = G.cards.length < cardSlots(), nc = citiesOf(r.id).length, trib = (Math.max(1, nc)*.6).toFixed(1);
  const lineTxt = !C ? '' : has ? ' Their veterans swell your '+cardName(PLAYER, line)+'.' : room ? ' '+C.n+' join you as a support line for this game.' : ' Their veterans join you (no free troop slot for their line).';
  showEvent({gate:6, kicker:'Conquest', img:KIT.vic_conquest, title:(c ? c.name : 'Their capital')+' is yours', text:'The '+r.name+' still hold '+nc+' cit'+(nc===1 ? 'y' : 'ies')+'. Their leader kneels. What becomes of them?',
    opts:[
      {l:'Absorb them', ic:KIT.u_absorb, s:'Their cities and army join your empire.'+lineTxt+' Their towns are restless for a minute', f:() => conqAbsorb(r.id, line)},
      {l:'Make them a vassal', ic:KIT.u_vassal, s:'They keep their land, fight beside you and pay '+trib+' influence a second. Vassals count as conquered', f:() => conqVassal(r.id)},
      {l:'Raze the capital', ic:KIT.u_raze, s:'Burn '+(c ? c.name : 'it')+' for a War Chest and Glory. Every other nation trusts you less', f:() => conqRaze(r.id, c)}]});
}
function conqAbsorb(id, line){
  const r = rival(id); if(!r || !r.alive) return;
  const before = new Set(citiesOf(PLAYER).map(c => c.id));
  r.conq = true; absorb(r);
  for(const c of citiesOf(PLAYER)) if(!before.has(c.id)){ c.unrest = G.t + 60; c.prevOwner = id; }
  if(line && CARDS[line] && !slotOf(line) && G.cards.length < cardSlots()){
    G.cards.push({id:line, lvl:Math.min(lvlFloor(PLAYER), cardCap(line)), evo:null, str:isUnlocked(line) ? 0 : 1});
    computeSyn(); refreshStats(); R.armyKey = '';
    bigMoment({tier:'epic', kick:'Absorbed', title:CARDS[line].n, sub:'The '+r.name+'’s finest join your army for this game', col:r.col, img:troopImg(line, Math.min(8, lvlFloor(PLAYER)))});
  }
  G.stats.absorbed = (G.stats.absorbed||0) + 1;
}
function conqVassal(id){
  const r = rival(id); if(!r || !r.alive) return;
  r.vassal = true; r.status = 'ally'; r.rel = 95; r.allyT = G.t; r.truceT = 0;
  G.rwars = G.rwars.filter(w => w.a!==id && w.b!==id);
  banner(r.name, 'Bends the knee', KIT.u_vassal); toast(r.name+' is now your vassal: they keep their land, fight your enemies and pay tribute','good');
  SFX.era && SFX.era(); G.stats.vassals = (G.stats.vassals||0) + 1;
  checkVictory();
}
function conqRaze(id, c){
  const r = rival(id);
  if(c && c.owner===PLAYER && !c.dead){ c.razed = true; destroyCity(c); }
  G.razed = (G.razed||0) + 1;
  G.rivals.forEach(x => { if(x.alive && x.id!==id) x.rel -= 20; });
  if(r && r.alive) r.morale = Math.max(0, (r.morale ?? 70) - 25);
  earnChest('You razed the capital of '+(r ? r.name : 'your enemy'));
  toast('The world hears of the burning. Every nation trusts you less','warn');
}
function absorb(r){
  if(!r.alive) return;
  for(const c of G.cities) if(c.owner===r.id){ c.owner = PLAYER; c.capital = false; c.born = G.t; G.stats.captured++; }
  for(let i=0;i<N*N;i++) if(G.own[i]===r.id) G.own[i] = PLAYER;
  for(const u of G.units) if(u.owner===r.id && ROLE[u.kind]){ if(u.hero){ u.hp = 0; u.dead = true; continue; } u.owner = PLAYER; u.tgt = 0; u.tcity = 0; u.fol = 0; }
  r.alive = false; r.status = 'joined'; r.proj = null; learnLegend(r);
  G.rwars = G.rwars.filter(w => w.a!==r.id && w.b!==r.id);
  G.offers = (G.offers||[]).filter(q => q.r!==r.id);
  R.dirty = true; R.bdirty = true;
  const cap = G.cities.find(c => c.owner===PLAYER && Math.hypot(c.x,c.y) >= 0 && c.born===G.t);
  if(r.surrendering) earnChest(r.name+' surrendered to you');
  if(r.mystery) metMystery(r);
  banner(r.name, 'Joins your empire'); toast(r.name+' is now part of your empire', 'good', cap ? {x:cap.x+.5, y:cap.y+.5} : null); SFX.era();
  checkVictory();
}

/* ---------- Diplomacy ---------- */
function relLabel(v){ return v<=-50 ? 'Hostile' : v<=-15 ? 'Wary' : v<15 ? 'Neutral' : v<50 ? 'Friendly' : 'Devoted'; }
function addRWar(a,b,dur){
  const lo=Math.min(a,b), hi=Math.max(a,b);
  if(G.rwars.some(w => w.a===lo && w.b===hi)) return;
  G.rwars.push({a:lo, b:hi, end:G.t+dur});
}
function declareWar(att, tgt){
  const r = rival(att===PLAYER ? tgt : att);
  if(r.vassal && att!==PLAYER) return;
  if(r.vassal){ r.vassal = false; toast(r.name+' is no longer your vassal','warn'); }
  if(!r.alive || r.status==='war') return;
  const wasAlly = r.status==='ally';
  r.status = 'war'; r.rel = Math.min(r.rel, -60); r.weary = 0; r.warStart = G.t; r.offeredPeace = G.t;
  const cap = capitalOf(r.id), at = cap ? {x:cap.x+.5, y:cap.y+.5} : null;
  if(att===PLAYER){
    G.rivals.forEach(o => { if(o!==r && o.alive) o.rel -= wasAlly ? 25 : 10; });
    toast('You declared war on '+r.name, 'warn', at); banner(r.name, 'War declared'); SFX.warn();
  } else {
    banner(r.name, 'Declares war on you'); toast(r.leader+' of '+r.name+' declares war', 'bad', at); SFX.warn(); MUS.sting('war'); R.shake = 3;
  }
  G.rivals.forEach(o => { if(o.alive && o.status==='ally' && o!==r){ addRWar(o.id, r.id, 150); toast(o.name+' joins the war against '+r.name, 'good'); } });
  R.raidForce = true;
}
function formCoalition(why){
  if(G.coal) return;
  G.coal = true; G.alarm = 3; G.rwars = [];
  banner('The world unites', 'Coalition'); R.shake = 6; SFX.warn(); MUS.sting('coal');
  toast(why==='ship' ? 'Your starship alarms the world. Every nation not allied with you declares war' : 'You have grown too strong. The surviving nations unite against you','bad');
  toast('Your people rally to defend the homeland. Cities +25% health','good');
  G.rivals.forEach(r => { if(!r.alive) return; if(r.status==='ally'){ r.rel = Math.min(r.rel, 85); return; } if(r.status!=='war'){ r.status = 'war'; r.rel = Math.min(r.rel, -60); r.weary = 0; r.warStart = G.t; r.offeredPeace = G.t; } });
  G.offers = (G.offers||[]).filter(q => q.k==='surrender');
  R.raidForce = true;
}
function makePeace(r){
  r.status = 'peace'; r.rel = Math.max(r.rel, -25); r.peaceT = G.t; r.weary = 0;
  banner(r.name, 'Peace'); toast('Peace with '+r.name, 'good');
}
function diplomacy(dt){
  for(const r of G.rivals){ if(!r.alive || !r.vassal) continue; if(r.status!=='ally') r.status = 'ally'; r.rel = Math.max(r.rel, 90); r.allyT = r.allyT || G.t; G.influence = Math.min(600, G.influence + Math.max(1, citiesOf(r.id).length)*.6*dt); }
  expireOffers();
  const st = alarmStage();
  if(st > (G.alarm||0)){
    G.alarm = st;
    if(st===3) formCoalition('conquest');
    else { banner('The world is '+ALARM[st].n.toLowerCase(), 'World alarm'); toast(ALARM[st].d, 'warn'); if(st===2){ G.rwars = []; } }
  }
  if(Math.floor(G.t/2) !== Math.floor((G.t-dt)/2)){
    G.rivals.forEach(r => { r.border = 0; r.near = 99; for(const a of citiesOf(PLAYER)) for(const b of citiesOf(r.id)) r.near = Math.min(r.near, Math.hypot(a.x-b.x, a.y-b.y)); });
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){
      if(G.own[idx(x,y)]!==PLAYER) continue;
      const ns=[x>0?G.own[idx(x-1,y)]:0, x<N-1?G.own[idx(x+1,y)]:0, y>0?G.own[idx(x,y-1)]:0, y<N-1?G.own[idx(x,y+1)]:0];
      for(const o of ns) if(o>1) rival(o).border++;
    }
  }
  for(const r of G.rivals){
    if(!r.alive) continue;
    if(!r.proj && r.projAt && G.t >= r.projAt && rEra() >= 5){
      r.proj = {p:0, m:0}; const cap = capitalOf(r.id);
      banner(r.name, 'Starship program'); toast(r.name+' has begun building a starship. Stop them or win first', 'bad', cap ? {x:cap.x+.5, y:cap.y+.5} : null); SFX.warn();
    }
    if(r.proj){
      r.proj.p += dt/(600 - 15*Math.min(10, citiesOf(r.id).length));
      if(r.proj.m < 1 && r.proj.p >= .5){ r.proj.m = 1; toast(r.name+'’s starship is half built', 'bad'); }
      if(r.proj.m < 2 && r.proj.p >= .85){ r.proj.m = 2; toast(r.name+'’s starship is nearly ready', 'bad'); R.shake = 3; }
      if(r.proj.p >= 1){ endGame(false, null, null, 'rivalship', r); return; }
    }
    if(G.coal && r.status==='ally'){
      r.rel -= dt*.12;
      if(r.rel < 50){ r.status = 'peace'; declareWar(r.id, PLAYER); toast(r.name+' abandons you and joins the coalition','bad'); continue; }
    }
    if(r.status==='war'){
      r.weary += dt;
      if(!r.offeredSurrender && r.weary > 90 && (citiesOf(r.id).length <= 1 || (r.capLost && r.lost >= 2) || ((r.morale ?? 70) < 15 && r.lost >= 3))){ r.offeredSurrender = G.t; queueDiplo('surrender', r.id); }
      const losing = r.lost > 0 || unitCount(r.id) < unitCount(PLAYER)*.6;
      if(!G.coal && r.weary > (losing ? 30 : 60) && G.t - r.offeredPeace > 45 && Math.random() < .08){ r.offeredPeace = G.t; queueDiplo('peace', r.id); }
      continue;
    }
    const target = TRAITS[r.trait].base + S.charm + (r.status==='trade'?15:0) + (r.status==='ally'?25:0) - Math.min(50, r.border*1.5) - (r.near < 19 ? (19 - r.near)*2.8 : 0) - 14*(G.alarm||0) - (CR(10) ? 15 : 0) - Math.min(30, 3*(G.warmon||0));
    r.rel += (target - r.rel)*.02*dt;
    r.rel = clamp(r.rel, -100, 100);
    r.think -= dt; if(r.think > 0) continue;
    r.think = rnd(7,11);
    const tension = Math.min(.35, r.border*.012 + (r.near < 19 ? (19 - r.near)*.016 : 0));
    const warChance = (r.trait==='warlike' ? .4 : .12) + tension;
    if(r.status==='peace' && G.t > 150 && G.t - r.peaceT > 60 && (r.rel < -30 || (tension > .12 && r.rel < 5)) && Math.random() < warChance && reachWar(r.id, PLAYER)){ if(tension > .12) toast(r.name+' will not tolerate your borders on its doorstep','bad'); declareWar(r.id, PLAYER); }
    else if(r.status==='trade' && r.rel < -5){ r.status = 'peace'; toast(r.name+' ended your trade deal', 'warn'); }
    else if(r.status==='ally' && r.rel < 15){ r.status = 'trade'; toast(r.name+' left your alliance', 'warn'); }
    else if(r.status==='peace' && r.rel >= 25 && Math.random() < .3) queueDiplo('trade', r.id);
    else if(r.status==='trade' && r.rel >= 60 && Math.random() < .2) queueDiplo('ally', r.id);
    else if(r.trait==='warlike' && r.status==='peace' && r.rel < 0 && G.t > 120 && G.t - (r.tribT||0) > 180 && Math.random() < .08){ r.tribT = G.t; queueDiplo('tribute', r.id); }
  }
  G.rwarCheck -= dt;
  if(G.rwarCheck <= 0){
    G.rwarCheck = rnd(40,70);
    const ended = G.rwars.filter(w => w.end < G.t);
    ended.forEach(w => toast(rival(w.a).name+' and '+rival(w.b).name+' made peace'));
    G.rwars = G.rwars.filter(w => w.end >= G.t);
    const alive = G.rivals.filter(r => r.alive);
    if(alive.length >= 2 && G.t > 100 && (G.alarm||0) < 2 && Math.random() < .35){
      const [a,b] = shuffle(alive.slice());
      const lo=Math.min(a.id,b.id), hi=Math.max(a.id,b.id);
      if(!G.rwars.some(w => w.a===lo && w.b===hi) && !(a.status==='ally' && b.status==='ally') && reachWar(a.id, b.id)){
        addRWar(a.id, b.id, rnd(70,130));
        const ca = capitalOf(a.id), cb = capitalOf(b.id);
        toast(a.name+' and '+b.name+' are at war', '', ca && cb ? {x:(ca.x+cb.x)/2+.5, y:(ca.y+cb.y)/2+.5} : null);
      }
    }
  }
}
function queueDiplo(k, rid){
  if(!G.offers) G.offers = [];
  if(G.offers.some(q => q.k===k && q.r===rid)) return;
  if(!G.offerLog) G.offerLog = {};
  const lk = k+':'+rid; if(k!=='surrender' && G.t - (G.offerLog[lk] ?? -999) < 150) return;
  G.offerLog[lk] = G.t;
  const o = {id:G.nid++, k, r:rid, exp:G.t + (k==='surrender' ? 90 : 60)}, ev = diploEvent(o);
  if(!ev) return;
  G.offers.push(o);
  toast('✉ '+ev.title+'. Answer in Diplomacy (N)', k==='tribute' ? 'warn' : (k==='surrender' || k==='peace') ? 'good' : '');
  if(modal==='diplo') renderDiplo();
}
function resolveOffer(id, c){
  const o = (G.offers||[]).find(x => x.id===id); if(!o) return;
  G.offers = G.offers.filter(x => x !== o);
  const ev = diploEvent(o); if(ev) (c==='a' ? ev.a : ev.b).f();
  G.rivals.forEach(r => r.rel = clamp(r.rel,-100,100));
  SFX.tick();
}
function expireOffers(){
  G.offers = (G.offers||[]).filter(o => {
    const ev = diploEvent(o); if(!ev) return false;
    if(G.t <= o.exp) return true;
    if(o.k==='tribute'){ const rv = rival(o.r); rv.rel -= 12; toast(rv.name+' is insulted that you ignored its envoys','warn'); }
    return false;
  });
}
function diploEvent(q){
  const r = rival(q.r); if(!r || !r.alive) return null;
  const nm = r.name, ld = r.leader;
  if(q.k==='trade' && r.status==='peace') return {kicker:'Diplomacy', title:nm+' proposes a trade deal', text:ld+' offers to open the roads between your peoples.',
    a:{l:'Open the roads', s:'Food, production and science +10%. Influence grows faster', f:() => { r.status='trade'; r.rel+=5; toast('Trading with '+nm,'good'); }},
    b:{l:'Decline', s:'Relations drop', f:() => { r.rel -= 10; }}};
  if(q.k==='ally' && r.status==='trade') return {kicker:'Diplomacy', title:nm+' seeks an alliance', text:ld+' proposes you stand together against raiders and rivals alike.',
    a:{l:'Swear the alliance', s:'Army upkeep 20% cheaper. They join your wars', f:() => { r.status='ally'; r.allyT=G.t; r.rel+=5; toast('Allied with '+nm,'good'); }},
    b:{l:'Decline politely', s:'Relations drop a little', f:() => { r.rel -= 6; }}};
  if(q.k==='tribute' && r.status==='peace') return {kicker:'Diplomacy', title:ld+' demands tribute', text:'Envoys from '+nm+' say the price of peace is '+COST.gift+' influence.',
    a:{l:'Pay '+COST.gift+' influence', s:G.influence>=COST.gift ? 'Relations improve' : 'You can’t afford it. Relations drop', f:() => { if(G.influence>=COST.gift){ G.influence-=COST.gift; r.rel+=12; } else r.rel -= 15; }},
    b:{l:'Refuse', s:'Relations fall sharply. War may follow', f:() => { r.rel -= 25; }}};
  if(q.k==='surrender' && r.status==='war') return {kicker:'Surrender', title:nm+' offers to surrender', text:'With its armies broken, '+ld+' offers to bow to your crown. Its cities, lands and soldiers would become yours.',
    a:{l:'Accept their surrender', s:nm+' joins your empire, and you earn a War Chest', f:() => { r.surrendering = true; absorb(r); }},
    b:{l:'Fight on', s:'Take their cities by force', f:() => {}}};
  if(q.k==='peace' && r.status==='war') return {kicker:'Diplomacy', title:nm+' sues for peace', text:'Messengers from '+ld+' ask to end the war.',
    a:{l:'Accept peace', s:'The fighting stops', f:() => makePeace(r)},
    b:{l:'Fight on', s:'The war continues', f:() => {}}};
  return null;
}

function playerAct(act, rid){
  const r = rival(rid); if(!r || !r.alive) return;
  if(act==='gift'){
    if(G.influence < COST.gift || r.status==='war') return;
    G.influence -= COST.gift; const gain = 18/(1+r.gifts*.3); r.rel = clamp(r.rel+gain,-100,100); r.gifts++;
    toast(r.name+' accepts your gift','good');
  } else if(act==='trade'){
    if(r.status!=='peace' || r.rel < 10 || G.influence < COST.trade) return;
    G.influence -= COST.trade; r.status = 'trade'; r.rel += 5; toast('Trading with '+r.name,'good');
  } else if(act==='untrade'){
    if(r.status!=='trade') return; r.status = 'peace'; r.rel -= 10; toast('Trade with '+r.name+' ended','warn');
  } else if(act==='ally'){
    if(r.status!=='trade' || r.rel < 50 || G.influence < COST.ally) return;
    G.influence -= COST.ally; r.status = 'ally'; r.allyT = G.t; r.rel += 5; toast('Allied with '+r.name,'good');
  } else if(act==='union'){
    if(r.status!=='ally' || r.rel < unionRel() || G.influence < unionCost() || G.t - r.allyT < 90 || citiesOf(r.id).length >= citiesOf(PLAYER).length) return;
    G.influence -= unionCost(); absorb(r);
    G.rivals.forEach(o => { if(o.alive) o.rel -= 15; }); toast('The other nations fear they are next','warn');
  } else if(act==='unally'){
    if(r.status!=='ally') return; r.vassal = false; r.status = 'trade'; r.rel -= 15; toast('You left the alliance with '+r.name,'warn');
  } else if(act==='war'){
    declareWar(PLAYER, r.id);
  } else if(act==='peace'){
    if(r.status!=='war' || G.coal || G.influence < COST.peace || G.t - r.peaceTry < 10) return;
    r.peaceTry = G.t;
    const accept = r.weary >= 25 || r.lost > 0 || unitCount(PLAYER) > unitCount(r.id)*1.5;
    if(accept){ G.influence -= COST.peace; makePeace(r); }
    else toast(r.name+' refuses peace for now','warn');
  }
  SFX.tick();
}

function battleAlerts(){
  if(!R.battleT) R.battleT = new Map();
  const cells = new Map();
  for(const u of G.units){
    if(u.hp<=0 || u.owner!==PLAYER || !u.tgt) continue;
    const k = ((u.x/6)|0)+','+((u.y/6)|0), c = cells.get(k) || {n:0, x:0, y:0}; c.n++; c.x += u.x; c.y += u.y; cells.set(k, c);
  }
  for(const [k, c] of cells){
    const cx = c.x/c.n, cy = c.y/c.n; let foes = 0, boss = null;
    for(const v of G.units){ if(v.hp<=0 || v.owner===PLAYER || (v.x-cx)**2+(v.y-cy)**2 > 49) continue; foes++; if((v.hero && v.owner!==PLAYER) || (v.owner===0 && v.kind==='warlord')) boss = v; }
    const siege = citiesOf(PLAYER).find(ct => (ct.x+.5-cx)**2+(ct.y+.5-cy)**2 < 25 && ct.hp < cityMax(ct)*.7);
    if(c.n + foes < 20 && !boss && !siege) continue;
    if(G.t - (R.battleT.get(k) || -999) < 60) continue;
    R.battleT.set(k, G.t);
    const near = G.cities.reduce((b, ct) => { const d = (ct.x-cx)**2+(ct.y-cy)**2; return !b || d < b.d ? {ct, d} : b; }, null);
    const where = near ? ' near '+near.ct.name : '';
    const msg = boss ? '⚔ '+(boss.hero ? boss.name : 'A Warlord')+' is in battle'+where+'. Watch' : siege ? '⚔ '+siege.name+' is under siege. Watch' : '⚔ Battle'+where+': '+(c.n+foes)+' troops clashing. Watch';
    toast(msg, boss || siege ? 'bad' : 'warn', {x:cx, y:cy, watch:true});
    break;
  }
}
function computeRaidTargets(){
  R.raidT.clear(); R.danger.clear(); R.dangerAll = new Map(); R.hostsN = [];
  for(const o of [PLAYER, ...G.rivals.filter(r => r.alive).map(r => r.id)]){
    let dc = null, dn = 0; const list = [];
    for(const c of citiesOf(o)){ let n = 0; for(const u of G.units){ if(u.hp>0 && u.owner!==o && (u.owner===0 || atWar(o, u.owner)) && Math.abs(u.x-c.x-.5)<5 && Math.abs(u.y-c.y-.5)<5) n++; }
      const hit = c.hp < cityMax(c)*.98 && n >= 1;
      if(n >= 3 || hit){ list.push(c.id); if(n > dn){ dn = n; dc = c; } } }
    if(dc) R.danger.set(o, dc.id);
    if(list.length) R.dangerAll.set(o, list);
  }
  const owners = [PLAYER, ...G.rivals.filter(r => r.alive).map(r => r.id)];
  for(const o of owners){
    if(!warringAny(o)) continue;
    const mine = citiesOf(o); if(!mine.length) continue;
    const cands = [];
    for(const c of G.cities){
      if(c.dead || !atWar(o,c.owner) || c.owner===0) continue;
      let near = 1e9; for(const m of mine){ const d=Math.hypot(m.x-c.x, m.y-c.y); if(d<near) near=d; }
      cands.push([near, c]);
    }
    cands.sort((p,q) => p[0]-q[0]);
    if(o !== PLAYER && G.proj && G.proj.parts && atWar(o, PLAYER)){
      const ids = G.proj.decoyT > G.t && G.proj.decoy ? [G.proj.decoy] : G.proj.parts.map(pt => pt.c);
      const pri = cands.filter(([, c]) => ids.includes(c.id));
      if(pri.length) cands.splice(0, cands.length, ...pri);
    }
    let bc = null, plan = null, best = NAV_INF;
    for(const [, c] of cands.slice(0, 3)){ const pl = raidPlan(o, c); if(pl && pl.dist < best){ best = pl.dist; bc = c; plan = pl; } }
    if(!bc){ R.raidGo.delete(o); R.raidT.delete(o); continue; }
    R.raidT.set(o, bc.id);
    const sx = plan.sx, sy = plan.sy;
    const prev = R.raidS.get(o);
    if(!prev || prev.c!==bc.id) R.raidGo.set(o, false);
    R.raidS.set(o, {x:sx, y:sy, c:bc.id});
    let tot=0, atS=0, atC=0;
    for(const u of G.units){
      if(u.owner!==o || u.hp<=0 || !u.card || u.kind==='support' || !isRaider(u)) continue;
      tot++;
      if((u.x-sx)**2+(u.y-sy)**2 < 6.25) atS++;
      if((u.x-bc.x-.5)**2+(u.y-bc.y-.5)**2 < 42) atC++;
    }
    const go = R.raidGo.get(o);
    (R.raidLate || (R.raidLate = new Map())).set(o, atS >= 3);
    if(!go && tot && atS >= Math.max(3, Math.ceil(tot*.6))){ R.raidGo.set(o, true); hostWarn(o, bc, atS); }
    if(o!==PLAYER && bc.owner===PLAYER) hostNote(o, bc, sx, sy);
    else if(go && atC < Math.max(2, tot*.2)) R.raidGo.set(o, false);
  }
}
