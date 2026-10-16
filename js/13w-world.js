"use strict";
/* ---------- A living world: rival generals with Renown and errands, rival wars you can see,
   calls for help, pledges of loyalty and grudges. Plus Fortifications and calmer city alarms. ----------
   Hooks: heroAI (errands), strike / killUnit (clashes, Renown), captureCity / destroyCity (aid, pledges),
   diplomacy() calls worldTick(dt), diploEvent() falls through to worldEvent(q). */

/* ---- Renown for every general ---- */
const REN_TITLE = ['', 'Veteran ', 'Champion ', 'Conqueror '];
const rRen = r => r ? (r.ren || (r.ren = {v:0, rank:0})) : {v:0, rank:0};
function heroRank(u){ if(!u || !u.hero || !G) return 0; if(u.owner===PLAYER) return renRank(); const r = u.owner > 1 ? rival(u.owner) : null; return r && r.ren ? r.ren.rank : 0; }
const heroSizeMul = u => 1 + .08*heroRank(u);
function rGenName(r, H){ if(!r.genName) r.genName = GEN_NAMES[rint(GEN_NAMES.length)]; return REN_TITLE[rRen(r).rank] + r.genName + ' ' + H.n.replace(/^The /, 'the '); }
function rRenAdd(o, n){
  if(!G || G.demo || G.arena || o <= 1 || !n) return;
  const r = rival(o); if(!r || !r.alive) return;
  const P = rRen(r); if(P.rank >= 3) return;
  P.v += n;
  while(P.rank < 3 && P.v >= REN_AT[P.rank + 1]){
    P.rank++;
    const h = r.hero && R.ubi ? R.ubi.get(r.hero.id) : null, H = HEROES[rivalHeroKey(r)] || HEROES.legion;
    if(h && h.hp > 0){ h.name = rGenName(r, H); ring(h.x, h.y, .2, 2, ocol(o), .8); }
    const nm = (r.genName || '') + ' ' + H.n.replace(/^The /, 'the ');
    if(atWar(PLAYER, o) || (h && fogSee(h.x, h.y)) || P.rank === 3) toast('★ '+nm+' of the '+r.name+' is now a '+REN_TITLE[P.rank].trim()+'. Slay him for a rich reward', atWar(PLAYER, o) ? 'warn' : '', h ? {x:h.x, y:h.y} : null);
  }
}
/* the general of side o, if he is on the field */
function genOf(o){ if(!R.heroes) return null; for(const h of R.heroes) if(h.owner===o && h.hp > 0) return h; return null; }

const cityDist = (o, x, y) => { let d = 1e9; for(const c of G.cities) if(c.owner===o && !c.dead) d = Math.min(d, Math.hypot(c.x-x, c.y-y)); return d; };
/* ---- errands: rival generals lead their band to claim resource sites and clear barbarian camps nearby ---- */
function rivalErrand(u, own, fol){
  if(G.demo || G.arena || own <= 1 || G.t < RES_GRACE) return false;
  const r = rival(own); if(!r || !r.alive || r.hold) return false;
  const cap = capitalOf(own); if(!cap) return false;
  let E = u.err;
  if(E){
    const done = (msg) => { u.err = null; u.errT = G.t + rnd(25, 45); if(msg) toast(msg.t, '', msg.at); return false; };
    if(G.t - E.t0 > 75 || u.noPath || u.hp < uStat(u).hp*.4 || fol < 2) return done();
    if(E.k==='site'){
      const s = (G.sites||[])[E.i]; if(!s || s.owner===own) return done();
      if(!(s.owner===0 || atWar(own, s.owner))) return done();
      u.goal = {x:s.x+.5, y:s.y+.5}; u.tcity = 0; return true;
    }
    const p = G.pois.find(q => q.id===E.id); if(!p || p.dead || p.st==='looted') return done();
    const d2 = (p.x+.5-u.x)**2 + (p.y+.5-u.y)**2;
    if(!p.armed && p.st==='ok' && d2 < 36){ p.armed = 1; campGuards(p); }
    if(p.st==='loot' && d2 < 1.6){
      p.dead = true; p.st = 'looted'; r.army = (r.army||0) + 40*(1 + .3*rEra()); rRenAdd(own, 15);
      burst(p.x+.5, p.y+.5, 12, ocol(own));
      return done(fogSeen(p.x, p.y) ? {t:'The '+r.name+' looted the barbarian camp before you could', at:{x:p.x+.5, y:p.y+.5}} : null);
    }
    u.goal = {x:p.x+.5, y:p.y+.5}; u.tcity = 0; return true;
  }
  if(G.t < (u.errT||0) || fol < 4 || u.hp < uStat(u).hp*.7) return false;
  u.errT = G.t + rnd(18, 30);
  if(G.rivals.filter(q => q.alive && q.hero && R.ubi && R.ubi.get(q.hero.id) && R.ubi.get(q.hero.id).err).length >= 3) return false;
  const okm = navOk(own), cands = [];
  for(let i=0;i<(G.sites||[]).length;i++){ const s = G.sites[i]; if(s.owner===own) continue; if(!(s.owner===0 || atWar(own, s.owner))) continue; const bo = G.own[idx(s.x, s.y)]; if(bo && bo!==own && !okm[bo]) continue; if(cityDist(own, s.x, s.y) > 20) continue; cands.push({k:'site', i, x:s.x+.5, y:s.y+.5, d:Math.hypot(s.x+.5-u.x, s.y+.5-u.y) - 2}); }
  for(const p of (G.pois||[])){ if(p.k!=='camp' || p.dead || p.horde || p.keep || (p.big && fol < 8) || !(p.st==='ok' || p.st==='loot')) continue; if(G.own[idx(p.x, p.y)]) continue; if(cityDist(own, p.x, p.y) > 24) continue; cands.push({k:'camp', id:p.id, x:p.x+.5, y:p.y+.5, d:Math.hypot(p.x+.5-u.x, p.y+.5-u.y)}); }
  if(!cands.length) return false;
  cands.sort((a,b) => a.d - b.d); const c = cands[0];
  u.err = {k:c.k, i:c.i, id:c.id, t0:G.t}; u.goal = {x:c.x, y:c.y}; u.tcity = 0;
  const seen = G.seen && G.seen[idx(Math.floor(c.x), Math.floor(c.y))];
  const mine = c.k==='site' && G.sites[c.i].owner===PLAYER;
  if((seen || mine) && G.t - (R.errToastT||-99) > 40){ R.errToastT = G.t;
    toast('⚑ '+u.name+' leads the '+r.name+' to '+(c.k==='site' ? (mine ? 'take your ' : 'claim the ')+RES[G.sites[c.i].k].n : 'raid a barbarian camp'), mine ? 'warn' : '', {x:c.x, y:c.y, watch:true}); }
  return true;
}

/* ---- rival wars you can see ---- */
function rClash(u, t){
  if(!R.rcl) R.rcl = []; const now = G.t;
  const near = R.rcl.find(c => (c.x-t.x)**2 + (c.y-t.y)**2 < 9);
  if(near){ near.t = now; return; }
  R.rcl.push({x:t.x, y:t.y, t:now}); if(R.rcl.length > 14) R.rcl.shift();
}
function genClash(u, t){
  const k = Math.min(u.owner, t.owner)+':'+Math.max(u.owner, t.owner); if(!R.gcl) R.gcl = {};
  if(G.t - (R.gcl[k] ?? -99) < 45) return; R.gcl[k] = G.t;
  const a = rival(u.owner), b = rival(t.owner); if(!a || !b) return;
  toast('⚔ '+u.name+' ('+a.name+') and '+t.name+' ('+b.name+') clash. Watch', '', {x:t.x, y:t.y, watch:true});
}
function genFell(v, att){
  if(!v.hero || v.owner <= 1) return;
  if(att > 1 && att !== v.owner){ const a = rival(att), b = rival(v.owner); rRenAdd(att, 40); if(a && b) toast(v.name+' of the '+b.name+' has fallen to the '+a.name, '', {x:v.x, y:v.y}); }
  if(att===PLAYER){ const rv = rival(v.owner), rk = rv && rv.ren ? rv.ren.rank : 0; if(rk){ renAdd(20*rk, 1, v); moraleHit(rv, 4*rk); } }
}
function drawClashMini(m, s){
  if(!R.rcl || !R.rcl.length || !G) return;
  const now = G.t;
  for(const c of R.rcl){
    const age = now - c.t; if(age > 10 || !fogSeen(c.x, c.y)) continue;
    const a = 1 - age/10, X = c.x*s, Y = c.y*s, r = 3.5*dpr;
    m.globalAlpha = .9*a; m.strokeStyle = '#05080a'; m.lineWidth = 3*dpr; m.beginPath(); m.moveTo(X-r, Y-r); m.lineTo(X+r, Y+r); m.moveTo(X+r, Y-r); m.lineTo(X-r, Y+r); m.stroke();
    m.strokeStyle = '#ffcf7a'; m.lineWidth = 1.5*dpr; m.stroke();
  }
  m.globalAlpha = 1;
}

/* ---- calls for help, pledges, grudges ---- */
function worldTick(dt){
  if(!G || G.demo || G.arena) return;
  fortTick(dt);
  if(G.t < (G.wT||0)) return; G.wT = G.t + 12;
  // calls for help: a nation losing a war asks you to join it
  if(G.t > 180 && !(G.offers||[]).some(o => o.k==='aid')){
    for(const w of shuffle((G.rwars||[]).slice())){
      for(const [x, y] of [[w.a, w.b], [w.b, w.a]]){
        const X = rival(x), Y = rival(y); if(!X || !Y || !X.alive || !Y.alive || X.vassal) continue;
        if(X.status==='war' || Y.status==='ally' || Y.vassal || atWar(PLAYER, y) || X.rel < -10) continue;
        const losing = (G.t - (X.lostT ?? -999) < 120 && X.lastBy===y) || powerOf(y) > powerOf(x)*1.6;
        if(losing && Math.random() < .5){ queueDiplo('aid', x, {foe:y}); return; }
      }
    }
  }
  // pledges: a weak, threatened neighbor offers to become your vassal
  if(G.t > 240 && G.t - (G.pledgeT ?? -999) > 200 && !(G.offers||[]).some(o => o.k==='pledge')){
    const mine = powerOf(PLAYER), cr = G.diff===0 ? 0 : (G.crown||0);
    for(const r of G.rivals){
      if(!r.alive || r.vassal || r.status==='war' || (r.near ?? 99) > 16 || !warringAny(r.id)) continue;
      const weak = citiesOf(r.id).length <= 2 || (r.morale ?? 70) < 30 || r.lost >= 2;
      if(!weak || mine < powerOf(r.id)*2) continue;
      if(Math.random() < Math.max(.05, .25 - .02*cr)){ G.pledgeT = G.t; queueDiplo('pledge', r.id); break; }
    }
  }
}
function grudge(r, why){
  if(r) r.rel -= 25; G.rivals.forEach(q => { if(q.alive && q !== r) q.rel -= 8; });
  toast((r ? 'The '+r.name+' feel betrayed: ' : '')+why+'. Every nation trusts you less', 'warn');
}
/* a city changed hands or burned: settle any aid deals and pledges */
function worldCityLost(c, old, nw){
  if(!G || G.demo || G.arena || old <= 1) return;
  const ro = rival(old); if(!ro) return;
  ro.lostT = G.t;
  for(const A of (G.aids||[])){
    if(A.done) continue;
    if(A.foe===old && (nw===PLAYER || nw===A.r)){ const X = rival(A.r); if(X && X.alive){ G.influence = Math.min(600, G.influence + 30); X.rel += 5; toast('The '+X.name+' send 30 influence: '+c.name+' has fallen', 'good', {x:c.x+.5, y:c.y+.5}); } }
    if(A.r===old && nw===A.foe && c.capital && A.hit < 5 && G.t - A.t > 30){ A.done = 1; grudge(ro, 'you swore to help them and stood aside while '+c.name+' fell'); }
  }
  if(ro.vassal && ro.pledge){
    let near = false; for(const u of G.units){ if(u.owner===PLAYER && u.hp > 0 && (u.x-c.x-.5)**2 + (u.y-c.y-.5)**2 < 49){ near = true; break; } }
    if(!near){ ro.vassal = false; ro.pledge = 0; ro.status = 'trade'; ro.rel = 35; G.rivals.forEach(q => { if(q.alive && q !== ro) q.rel -= 5; }); toast('The '+ro.name+' break their pledge: you did not defend '+c.name, 'warn', {x:c.x+.5, y:c.y+.5}); }
  }
}
function worldElim(o){
  for(const A of (G.aids||[])){ if(A.done || A.foe!==o) continue; A.done = 1; const X = rival(A.r); if(X && X.alive){ X.rel += 15; earnChest('The '+X.name+' reward you for bringing down the '+rival(o).name); } }
}
function worldPeace(r){
  for(const A of (G.aids||[])){ if(A.done || A.foe!==r.id) continue; A.done = 1; if(G.t - A.t < 120) grudge(rival(A.r), 'you made peace with their enemy within two minutes of joining their war'); }
}
function worldEvent(q, r){
  const nm = r.name, ld = r.leader;
  if(q.k==='aid'){ const Y = rival(q.foe); if(!Y || !Y.alive || !atWar(r.id, Y.id) || atWar(PLAYER, Y.id) || r.status==='war') return null;
    return {kicker:'A call for help', title:nm+' begs your aid against the '+Y.name, text:ld+' asks you to join the war against the '+Y.name+'. They pay 40 influence now, more for every city the '+Y.name+' lose, and a War Chest if they fall. Make peace too soon, or stand aside while their capital falls, and the world will remember.',
      a:{l:'Join the war', s:'War with the '+Y.name+'. +40 influence, relations with '+nm+' rise', f:() => { G.influence = Math.min(600, G.influence + 40); r.rel += 20; (G.aids || (G.aids = [])).push({r:r.id, foe:Y.id, t:G.t, hit:0}); declareWar(PLAYER, Y.id); toast('You march with the '+nm+' against the '+Y.name, 'good'); }},
      b:{l:'Stay out of it', s:'Relations drop a little', f:() => { r.rel -= 6; }}}; }
  if(q.k==='pledge'){ if(r.vassal || r.status==='war') return null;
    return {kicker:'A pledge of loyalty', title:nm+' pledge themselves to you', text:ld+' offers to bend the knee if you will protect them: they would fight for you, pay tribute, and count toward conquest. Let one of their cities fall with none of your troops nearby and they may break the pledge.',
      a:{l:'Accept their pledge', s:nm+' become your vassal. Their wars end', f:() => { r.vassal = true; r.pledge = G.t; r.status = 'ally'; r.rel = 95; r.allyT = G.t; r.truceT = 0; G.rwars = G.rwars.filter(w => w.a!==r.id && w.b!==r.id); banner(nm, 'Pledge themselves to you', KIT.u_vassal); toast('The '+nm+' are your vassals. Their enemies stand down', 'good'); checkVictory(); }},
      b:{l:'Decline', s:'Relations drop a little', f:() => { r.rel -= 4; }}}; }
  return null;
}

/* ---- Fortifications civic, and city alarms that only fire for real threats ---- */
function fortTick(dt){
  const lv = relicLv('forts'); if(!lv) return;
  const cap = capitalOf(PLAYER);
  if(lv >= 2 && cap && G.t >= (G.fortT||0)){
    G.fortT = G.t + 2; let n = 0; for(const u of G.units) if(u.fortG && u.owner===PLAYER && u.hp > 0){ n++; if(u.gar !== cap.id){ u.gar = cap.id; u.home = cap.id; } u.fol = 0; }
    if(n < 4 && G.t >= (G.fortSpawn||0)){ const id = G.core || (G.cards[0] && G.cards[0].id); const u = id ? spawnUnit(PLAYER, cap, id) : null; if(u){ u.fortG = 1; u.gar = cap.id; u.home = cap.id; } G.fortSpawn = G.t + 20; }
  }
  if(lv >= 3){
    if(!R.fortQ || G.t >= R.fortQ.t){ const quiet = {}; for(const c of citiesOf(PLAYER)) quiet[c.id] = !G.units.some(u => u.hp > 0 && (u.owner===0 || atWar(PLAYER, u.owner)) && (u.x-c.x-.5)**2 + (u.y-c.y-.5)**2 < 16); R.fortQ = {t:G.t + 1, q:quiet}; }
    for(const c of citiesOf(PLAYER)) if(R.fortQ.q[c.id]){ const mx = cityMax(c); if(c.hp < mx) c.hp = Math.min(mx, c.hp + mx*.04*dt); }
  }
}
function cityThreat(c){
  if(c.hp < cityMax(c)*.6) return true;
  let n = 0; for(const u of G.units){ if(u.hp > 0 && (u.owner===0 || atWar(c.owner, u.owner)) && (u.x-c.x-.5)**2 + (u.y-c.y-.5)**2 < 7.3) n++; }
  return n >= 4;
}
if(typeof KIT !== 'undefined' && !KIT.cv_forts && KIT.cv_masonry) KIT.cv_forts = KIT.cv_masonry;
