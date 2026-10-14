"use strict";
/* ---------- Hidden strongholds: the six hidden peoples wait on the map ----------
   A stronghold is a sleeping nation: one fortified capital, an elite garrison and its general.
   It never attacks, never trades, never expands. It lives outside G.rivals (rival() still finds it,
   because its id comes right after the last rival), so wars, alarms and victory never count it.
   Taking its capital unlocks that people for good. */
const HOLD_MAX_GUARDS = cr => 12 + 2*cr;
const HOLD_NAMES = {wolves:'Howling Hold', firemonks:'Ashen Monastery', golems:'Stoneborn Deep', skylancers:'Eyrie of the Wing', shadows:'The Veiled Court', colossus:'The Last Forge'};
function holdList(){ return (G && G.holdR) || []; }
function placeHolds(){
  G.holdR = []; G.holds = [];
  if(G.demo || G.arena || G.diff===0) return;
  const cr = G.crown||0; if(cr < 1) return;
  const elig = ACH.filter(a => a.secret && a.crown <= cr && !isUnlocked(a.id)).map(a => a.id);
  if(!elig.length) return;
  const n = Math.min(elig.length, cr >= 4 ? 2 : 1);
  shuffle(elig).slice(0, n).forEach(pid => { const s = holdSite(); if(s) makeHold(pid, s); });
}
function holdSite(){
  let best = null, bd = -1;
  for(let k=0;k<500;k++){
    const x = 4+rint(N-8), y = 4+rint(N-8), i = idx(x,y), t = G.ter[i];
    if(t===WATER || t===MOUNT || G.own[i]) continue;
    let d = 1e9;
    for(const c of G.cities) d = Math.min(d, Math.hypot(c.x-x, c.y-y));
    for(const p of (G.pois||[])) d = Math.min(d, Math.hypot(p.x-x, p.y-y) + 7);
    if(d > bd){ bd = d; best = {x, y}; }
  }
  return best;
}
function makeHold(pid, s){
  const id = G.rivals.length + 2 + G.holdR.length; if(id > 15) return null;
  const P = PEOPLE[pid] || {}, NP = NATIONS_P.find(n => n.id===pid), line = NP.start[0], cr = G.crown||0;
  const r = {id, name:NP.n, people:pid, heroKey:pid, leader:P.leader || 'A hidden ruler', trait:P.trait || 'warlike', col:P.col || '#b48ae0',
    rel:-100, status:'war', alive:false, hold:true, weary:0, think:1e9, settler:0, army:0, borderAcc:0, border:0, gifts:0, lost:0,
    peaceT:-999, peaceTry:-999, offeredPeace:-999, proj:null, projAt:{}, allyT:0, morale:100, cards:[line], lv:{}, lastEra:0, legend:null};
  r.lv[line] = Math.min(8, 4 + cr);
  G.holdR.push(r);
  const c = foundCity(s.x, s.y, id, true); c.fort = 2.6 + .4*cr; c.pop = 5; c.hp = cityMax(c); c.hold = pid; if(HOLD_NAMES[pid]) c.name = HOLD_NAMES[pid];
  for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){ const x = s.x+dx, y = s.y+dy; if(inb(x,y) && !G.own[idx(x,y)]) G.own[idx(x,y)] = id; }
  computeSyn();
  for(let k=0;k<HOLD_MAX_GUARDS(cr);k++){ const u = spawnUnit(id, c, line); if(u){ u.x = c.x+.5+rnd(-2,2); u.y = c.y+.5+rnd(-2,2); u.guard = 1; } }
  try { const h = spawnHero(id); if(h){ h.guard = 1; h.hp = uStat(h).hp; } } catch(e){}
  G.holds.push({id, pid, c:c.id, found:false, next:0});
  R.dirty = true; R.bdirty = true;
  return r;
}
function holdTick(){
  if(!G.holds || !G.holds.length) return;
  for(const h of G.holds){
    if(h.done) continue;
    const r = rival(h.id), c = G.cities.find(k => k.id===h.c); if(!r || !c) continue;
    if(!h.found && fogSee(c.x+.5, c.y+.5)){
      h.found = true;
      banner(r.name, 'A hidden stronghold');
      toast('You found the stronghold of '+r.name+'. They will never attack you. Take it and they join your peoples for good','good',{x:c.x+.5, y:c.y+.5});
      MUS.sting && MUS.sting('focus'); R.shake = Math.min(5, (R.shake||0) + 2);
    }
    // the garrison slowly refills, but never while you stand at the walls
    let n = 0; for(const u of G.units) if(u.owner===h.id && u.hp>0 && !u.hero) n++;
    const near = G.units.some(u => u.owner===PLAYER && u.hp>0 && (u.x-c.x-.5)**2 + (u.y-c.y-.5)**2 < 64);
    if(n < HOLD_MAX_GUARDS(G.crown||0) && !near && G.t >= (h.next||0)){ h.next = G.t + 20; const u = spawnUnit(h.id, c, r.cards[0]); if(u) u.guard = 1; }
  }
}
function holdFall(o){
  const r = rival(o), h = (G.holds||[]).find(q => q.id===o); if(!r || !h || h.done) return;
  h.done = true; r.hold = false; r.status = 'gone';
  G.units.forEach(u => { if(u.owner===o && u.hp>0){ u.hp = 0; u.dead = true; burst(u.x, u.y, 5, r.col); } });
  for(let i=0;i<G.own.length;i++) if(G.own[i]===o){ G.own[i] = 0; G.bmap[i] = 0; }
  R.bdirty = true; R.dirty = true;
  META.life['sh_'+h.pid] = 1; lifeDirty = true; saveLife();
  G.stats.holds = (G.stats.holds||0) + 1;
  earnChest('You took the stronghold of '+r.name);
  setTimeout(() => { try { giveHint(null); } catch(e){} }, 3600); setTimeout(() => { try { giveHint(null); } catch(e){} }, 7800);
  checkAch();
}
/* Goals panel: a found stronghold shows how close it is to falling */
function holdGoals(){
  const out = [];
  for(const h of (G.holds||[])){
    if(h.done || !h.found) continue;
    const r = rival(h.id), c = G.cities.find(k => k.id===h.c); if(!r || !c) continue;
    const f = clamp(1 - c.hp/cityMax(c), 0, 1);
    out.push({id:'h:'+h.pid, ic:'u_g_hidden', name:'Take '+r.name, d:'Their stronghold unlocks them for good', v:Math.round(f*100), g:100});
  }
  return out;
}
