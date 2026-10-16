"use strict";
/* ---------- Combat ---------- */
function damageCity(c,dmg,att){
  if(c.dead) return;
  if(c.owner===PLAYER && G.buff.fortify>0) dmg *= .5;
  c.hp -= dmg; c.fl = .12;
  if(att===PLAYER && c.capital && c.owner > 1 && !c.hold && !G.arena){ const rv = rival(c.owner), cm = capMul(c.owner); if(rv && !rv.capWarn && cm >= 1.55){ rv.capWarn = 1; toast(c.name+' is guarded by all '+citiesOf(c.owner).length+' cities of the '+rv.name+': its walls are ×'+cm.toFixed(1)+'. Take their other cities first to weaken it', 'warn', {x:c.x+.5, y:c.y+.5}); } }
  if(c.owner===PLAYER){
    if(c.capital) R.shake = Math.min(6, R.shake+1.5);
    SFX.thud();
    if(!c.alerted || G.t - c.alerted > 20){ c.alerted = G.t; toast(c.name+' is under attack', 'warn', {x:c.x+.5, y:c.y+.5}); }
  }
  if(c.hp <= 0){ c.dead = true; c.killer = att; }
}
function recDmg(att, amt, killed){
  if(!R.cc || !(G.arena || att===PLAYER)) return;
  if(!G.dmg){ G.dmg = {}; G.adm = {}; }
  const k = att+':'+(att===PLAYER && R.ch ? 'hero' : R.cc), e = G.dmg[k] || (G.dmg[k] = {d:0, k:0}); e.d += amt; if(killed) e.k++;
  if(R.ca){ const ka = att+':'+R.ca; G.adm[ka] = (G.adm[ka]||0) + amt; }
}
/* the after-battle report: damage your lines took and healing they gave */
function recTaken(v, amt){ if(v.owner!==PLAYER || !G || G.arena || G.demo || !(amt > 0)) return; const k = v.hero ? 'hero' : v.card; if(!k) return; const T = G.dtk || (G.dtk = {}); T[k] = (T[k]||0) + amt; }
function recHeal(own, k, amt){ if(own!==PLAYER || !G || G.arena || G.demo || !k || !(amt > 0)) return; const H = G.dhl || (G.dhl = {}); H[k] = (H[k]||0) + amt; }
function healBy(v, amt, own, k){ const mx = uStat(v).hp, h0 = v.hp; v.hp = Math.min(mx, v.hp + amt); recHeal(own, k, v.hp - h0); }
function hitUnit(v,dmg,att,splash){
  if(v.hp<=0) return;
  if(v.inv > 0){ v.fl = .05; return; }
  if(v.brace > 0) dmg *= .4;
  if(v.mark > 0) dmg *= 1.25;
  if(v.rout > 0) dmg *= 1.3;
  if(v.hero && v.owner===PLAYER && hasArt('aegis') && !G.arena) dmg *= .75;
  if(v.hero){ const now = G.t; if(now - (v.dwT||0) > .5){ v.dwT = now; v.dw = 0; } const capd = Math.max(0, uStat(v).hp*.045 - (v.dw||0)); dmg = Math.min(dmg, capd); v.dw = (v.dw||0) + dmg; v.lastHit = now; }
  if(v.owner > 0 && !v.hero && R.heroes && R.heroes.length){ const A = heroAuras(v); dmg *= A.def; }
  const h0 = v.hp; v.hp -= dmg; v.fl = .08; v.hitT = G.t; recDmg(att, Math.min(h0, dmg), v.hp<=0); recTaken(v, Math.min(h0, dmg));
  if(splash){
    for(const o of G.units){
      if(o===v || o.hp<=0 || !atWar(att,o.owner)) continue;
      if((o.x-v.x)**2 + (o.y-v.y)**2 < .81){ recTaken(o, Math.min(o.hp, dmg*.5)); o.hp -= dmg*.5; o.fl=.08; if(o.hp<=0) killUnit(o,att); }
    }
  }
  if(v.hp<=0) killUnit(v,att);
}
function killUnit(v,att){
  if(v.dead) return;
  v.dead = true; v.hp = 0;
  if(v.owner===PLAYER && !G.arena && !G.demo){ const k = v.hero ? 'hero' : v.card; if(k){ const D = G.dth || (G.dth = {}); D[k] = (D[k]||0) + 1; } }
  if(att===PLAYER && !G.arena && !G.demo) streakKill(v);
  if(v.owner > 0 && v.card && CARDS[v.card] && CARDS[v.card].tags.includes('Holy') && unitAbil(v)){
    for(const o of G.units){ if(o.owner!==v.owner || o.hp<=0 || !o.card || (o.x-v.x)**2+(o.y-v.y)**2 > 2.25) continue; healBy(o, uStat(o).hp*.25, v.owner, v.card); }
    ring(v.x, v.y, .2, 1.5, '#ffe9a0'); burst(v.x, v.y-.3, 6, '#fff3c0');
  }
  if(R.corpses.length < 160 && S){ const sp = unitSprite(v).n, scl = v.owner===0 ? BSCALE[v.kind] : (CARDS[v.card]||{size:1}).size; R.corpses.push({x:v.x, y:v.y, img:sp, w:sp.width/16*scl, h:sp.height/16*scl, fx:v.fx<0 ? -1 : 1, t:0}); }
  if(att===PLAYER && !G.arena){ const dg = heroOf(PLAYER); if(dg && dg.hero==='merchant' && (dg.x-v.x)**2+(dg.y-v.y)**2 < 12.25){ G.influence += 2; } }
  if(att===PLAYER && !G.arena && hasArt('idol')){ const ih = heroOf(PLAYER); if(ih && (ih.x-v.x)**2+(ih.y-v.y)**2 < 30){ G.influence = Math.min(600, G.influence + 1); ih.hp = Math.min(uStat(ih).hp, ih.hp + uStat(ih).hp*.01); } }
  if(att===PLAYER && !G.arena){ lifeAdd('kills'); const kc = R.cc && CARDS[R.cc] && !(R.ch) ? R.cc : null; if(kc){ META.life.ck[kc] = (META.life.ck[kc]||0) + 1; mxAdd(kc, 1); G.tk = G.tk || {}; for(const g of CARDS[kc].tags) G.tk[g] = (G.tk[g]||0) + 1; } }
  if(v.owner===0){
    if(att===PLAYER){ G.stats.kills++; if(v.fod && fxDetail() && R.parts.length < 900) burst(v.x, v.y-.2, 3, '#ffb35c'); }
    if(v.camp && !G.arena) campCheck(v.camp, att);
    const boss = BARB[v.kind].boss;
    burst(v.x, v.y, boss?28:6, boss?'#ff8a3d':'#e0473b');
    if(boss){ if(G.decline && !G.decline.done) G.decline.bosses++; toast((v.name || 'A Warlord')+' has been slain','good',{x:v.x,y:v.y}); R.shake = Math.min(8,R.shake+4); if(!G.arena){ if(att===PLAYER){ G.stats.warlords = (G.stats.warlords||0) + 1; lifeAdd('warlords'); earnChest('Your troops slew a barbarian Warlord'); } } }
    SFX.kill();
  } else {
    if(v.owner > 1 && !G.arena){ const rv = rival(v.owner); if(rv) moraleHit(rv, v.hero ? 12 : .3); }
    burst(v.x, v.y, v.hero ? 26 : 5, v.owner===PLAYER ? '#fff1cf' : ocol(v.owner));
    if(att===PLAYER && v.owner>1 && !G.arena) G.stats.nkills = (G.stats.nkills||0) + 1;
    if(v.fol && !G.arena){ const h = G.units.find(x => x.id===v.fol); if(h && (h.hero==='northmen')) h.rage = (h.rage||0) + 1; }
    if(v.hero && !G.arena && att===PLAYER && v.owner > 1) lifeAdd('heroes');
    if(v.hero && !G.arena){
      for(const f of G.units) if(f.fol===v.id) f.fol = 0;
      R.shake = Math.min(8, R.shake+4);
      if(v.owner===PLAYER){
        const rs = Math.min(proto('rally') ? 20 : HERO_RESPAWN, hasArt('phoenix') ? 30 : 99); G.stats.heroFalls = (G.stats.heroFalls||0) + 1; G.hero.id = 0; G.hero.t = G.t + rs; banner(v.name, 'Has fallen'); toast(v.name+' has fallen. Back at the capital in '+rs+' seconds','bad',{x:v.x,y:v.y});
        if(att > 1 && rival(att) && rival(att).alive){ rivalPick(rival(att)); toast(rival(att).name+' grows bolder after felling your hero','warn'); }
      } else if(v.owner > 1){
        const rv = rival(v.owner); rv.hero.id = 0; rv.hero.t = G.t + (CR(5) ? 40 : HERO_RESPAWN);
        toast(v.name+' of '+rv.name+' has fallen','good',{x:v.x,y:v.y});
        if(att===PLAYER){ G.stats.gens = (G.stats.gens||0) + 1; if(G.t >= (rv.chestT||0)){ rv.chestT = G.t + 150; earnChest('Your army slew '+v.name+' of '+rv.name); } }
      }
    }
  }
}

function updateUnits(dt, cityById, unitById){
  R.pc = new Map(); R.pt = new Map(); R.heroes = G.units.filter(u => u.hero && u.hp > 0); R.ubi = unitById; R.bandC = new Map();
  for(const u of G.units){
    if(u.fol && u.hp > 0) R.bandC.set(u.fol, (R.bandC.get(u.fol)||0) + 1);
    if(u.owner<=0 || u.hp<=0 || !u.card) continue;
    const k = u.owner+':'+u.card; let a = R.pc.get(k); if(!a){ a = []; R.pc.set(k, a); } a.push(u);
    for(const tg of CARDS[u.card].tags){ const kk = u.owner+':'+tg; let b = R.pt.get(kk); if(!b){ b = []; R.pt.set(kk, b); } b.push(u); }
  }
  for(const u of G.units){
    if(u.hp<=0) continue;
    u.fl -= dt; u.cd -= dt; u.rt -= dt; if(u.lg > 0) u.lg -= dt; if(u.slow > 0) u.slow -= dt;
    if(u.ab){ for(const k in u.ab) u.ab[k] -= dt; if(u.frenzy > 0) u.frenzy -= dt; if(u.brace > 0) u.brace -= dt; }
    if(u.frenzy > 0 && !u.ab) u.frenzy -= dt; if(u.brace > 0 && !u.ab) u.brace -= dt; if(u.mark > 0) u.mark -= dt;
    if(u.stun > 0) u.stun -= dt; if(u.air > 0) u.air -= dt;
    if(u.owner===0){ if(!(u.camp && guardStep(u, dt, unitById))) barbStep(u, dt, cityById); }
    else if(u.hero){ R.cc = u.card; R.ch = 1; R.ca = null; heroStep(u, dt, cityById, unitById); R.ch = 0; }
    else { R.cc = u.card; R.ca = null; nationStep(u, dt, cityById, unitById); }
  }
  R.cc = null; R.ca = null;
  const us = G.units, n = us.length;
  for(let i=0;i<n;i++){
    const a=us[i]; if(a.hp<=0) continue;
    for(let j=i+1;j<n;j++){
      const c=us[j]; if(c.hp<=0) continue;
      if((a.hero || c.hero) && a.owner===c.owner) continue;
      const dx=c.x-a.x; if(dx>1 || dx<-1) continue;
      const dy=c.y-a.y, m=(a.r+c.r)*.9, d2=dx*dx+dy*dy;
      if(d2<m*m && d2>1e-6){ const d=Math.sqrt(d2), push=(m-d)*.5/d; a.x-=dx*push; a.y-=dy*push; c.x+=dx*push; c.y+=dy*push; }
    }
  }
}
function barbStep(b, dt, cityById){
  if(b.stun > 0) return;
  let city = cityById.get(b.tc);
  if(!city || city.dead || b.rt<=0){
    b.rt = .5; let best=1e9; city=null;
    for(const c of G.cities){ if(c.dead || (b.hr && c.owner!==PLAYER)) continue; const d=(c.x+.5-b.x)**2+(c.y+.5-b.y)**2; if(d<best){ best=d; city=c; } }
    if(!city && b.hr){ b.hr = 0; b.rt = 0; return; }
    b.tc = city ? city.id : 0;
  }
  if(!city) return;
  const siege = BARB[b.kind].siege;
  let foe = null;
  if(!siege){
    let bd = (.62+b.r)**2;
    for(const s of G.units){ if(s.hp<=0 || s.owner===0) continue; const d=(s.x-b.x)**2+(s.y-b.y)**2; if(d<bd){ bd=d; foe=s; } }
  }
  if(BARB[b.kind].boss && !b.raged && b.hp < b.max*.5){ b.raged = 1; b.abT = R.now; if(onScr(b.x, b.y, 3)){ sAnim({n:'rage', x:b.x, y:b.y, s:3, life:1.3, max:1.3, fol:b, fade:1}); float('Berserker Rage!', b.x, b.y-1.4, '#ff7a6a', 1.6); R.floats[R.floats.length-1].big = 1; } }
  if(foe){ b.fx = foe.x<b.x ? -1 : 1; if(b.cd<=0 && BARB[b.kind].boss && FXA.ok && onScr(b.x, b.y)){ const fl = foe.x < b.x; sAnim({n:'smash', x:(b.x+foe.x)/2, y:(b.y+foe.y)/2-.25, s:1.3, flip:fl, life:.28, max:.28}); }
  if(b.cd<=0){ b.cd=1/PACE.atk; b.atT = R.now; const dd=Math.hypot(foe.x-b.x,foe.y-b.y)||1; b.lg=.12; b.lx=(foe.x-b.x)/dd; b.ly=(foe.y-b.y)/dd; burst((b.x+foe.x)/2,(b.y+foe.y)/2-.15,2,'#ffb0a0'); noteFight(b.x,b.y); { const big = b.kind==='brute' || b.kind==='warlord' || b.kind==='ram'; SFX.q(big ? 'stomp' : 'whoosh', b.x, b.y, big ? .9 : .7); SFX.q(b.kind==='raider' ? 'clang' : 'thud', foe.x, foe.y, .7); } hitUnit(foe, b.dmg, 0, false); } return; }
  const cx=city.x+.5, cy=city.y+.5, dx=cx-b.x, dy=cy-b.y, d=Math.hypot(dx,dy);
  if(Math.abs(dx) > .05) b.fx = dx<0 ? -1 : 1;
  if(d < .5+b.r){ if(b.cd<=0){ b.cd=1/PACE.atk; b.atT = R.now; b.lg=.12; b.lx=dx/d; b.ly=dy/d; noteFight(b.x,b.y); SFX.q(b.kind==='ram' ? 'boom' : 'thud', b.x, b.y, .8); damageCity(city,b.dmg,0); } return; }
  const tx=clamp(Math.floor(b.x),0,N-1), ty=clamp(Math.floor(b.y),0,N-1), ti=idx(tx,ty);
  let sp = b.spd * MOVE[G.ter[ti]] * (b.slow > 0 ? .5 : 1) * (b.pinT > G.t ? .65 : 1);
  if(S.barbSlow && G.own[ti]===PLAYER) sp *= .55;
  b.x += dx/d*sp*dt; b.y += dy/d*sp*dt;
  if(G.own[ti] && !siege && !nearCity(tx,ty)){
    b.raze += dt;
    if(b.raze > 2.2){ b.raze=0; clearTile(ti); burst(tx+.5,ty+.5,6,'#ff9a52'); }
  } else b.raze = 0;
}
function isRaider(u){
  if(u.gar || u.rel) return false;
  if(u.owner===PLAYER){ if(G.doctrine==='defend' || !warringAny(PLAYER)) return false; }
  else if(!warringAny(u.owner)) return false;
  if(u.kind==='siege') return true;
  if(!G.arena && R.danger.get(u.owner)) return u.id%4===0;
  if(u.owner===PLAYER) return u.id%3!==0;
  return ((u.id*7)%10)/10 < TRAITS[rival(u.owner).trait].raid + .2;
}
function nearList(arr, x, y, r){ if(!arr) return false; const r2 = r*r; for(const v of arr) if(v.hp>0 && (v.x-x)**2+(v.y-y)**2 < r2) return true; return false; }
const nearCard = (o, id, x, y, r) => nearList(R.pc.get(o+':'+id), x, y, r);
const nearTag = (o, tg, x, y, r) => nearList(R.pt.get(o+':'+tg), x, y, r);
function splashHit(t, rad, dmg, own){
  for(const o of G.units){
    if(o===t || o.hp<=0 || o.inv > 0 || !atWar(own,o.owner)) continue;
    if((o.x-t.x)**2 + (o.y-t.y)**2 < rad*rad){ const dd = o.brace > 0 ? dmg*.4 : dmg, h0 = o.hp; recTaken(o, Math.min(h0, dd)); o.hp -= dd; o.fl = .08; recDmg(own, Math.min(h0, dd), o.hp<=0); if(o.hp<=0) killUnit(o, own); }
  }
}
function bannerR(own){ const ev = cardEvo(own, 'banner'); return CARDS.banner.auraR*(synOf(own).Support >= 2 ? 1.5 : 1)*(1 + featOf(CARDS.banner, cardLevel(own,'banner')).aura)*(ev && ev.auraMul || 1); }
function strike(u, t, st, own, mul){
  u.atT = R.now;
  let dmg = st.dmg*attackMul(u, t)*(mul||1);
  const ranged = st.rng > 1.2, mk = mvKey(u), now = MT();
  let charged = false;
  if(st.charge > 1 && ((u.mv||0) > 1.5 || st.lance) && !(u.reformT > now)){ dmg *= st.charge; charged = true; burst(t.x, t.y-.2, st.lance ? 6 : 4, '#ffe9a0'); if(u.hero==='khanate'){ dmg *= 2; t.slow = 1.5; } }
  if(u.hero==='longbow') t.mark = 4;
  if(u.hero && !t.hero && t.owner > 0 && t.card) dmg = Math.min(dmg, uStat(t).hp*.4);
  let crit = false;
  if(st.crit && !mul){ u.hits = (u.hits||0) + 1; if(u.hits % 4 === 0){ dmg *= 3; crit = true; burst(t.x, t.y-.25, 9, '#ffd36a'); ring(t.x, t.y, .1, .55, '#ffd36a', .25); if(own===PLAYER || G.arena) float('!', t.x, t.y-.6, '#ffd36a', .6); } }
  u.mv = 0;
  { const UC = !u.hero && CARDS[u.card]; if(UC && UC.ambush && !t.amb){ t.amb = 1; dmg *= UC.ambush; if(onScr(t.x, t.y)){ burst(t.x, t.y-.25, 6, '#b48cff'); if(own===PLAYER) float('Ambush!', t.x, t.y-.7, '#c8a8ff', .7); } }
    if(UC && UC.mend){ const hr = dmg*UC.mend; for(const v of G.units){ if(v.owner!==own || v.hp<=0 || !v.card || v===u || (v.x-u.x)**2+(v.y-u.y)**2 > 2.6) continue; if(v.hp < uStat(v).hp) healBy(v, hr, own, u.card); } } }
  if(nearCard(own, 'banner', u.x, u.y, bannerR(own))) dmg *= 1.4 + .2*featOf(CARDS.banner, cardLevel(own,'banner')).potent*2;
  if(u.card==='knights' && ownsCard(own,'spearmen') && nearTag(own, 'Line', t.x, t.y, 1.6)){ dmg *= 2; comboHit(own, 'anvil', t.x, t.y); }
  /* ---- line moves and the combos built on them ---- */
  if(mk==='militia'){ let n = 0; const L = R.pc && R.pc.get(own+':'+u.card); if(L) for(const v of L){ if(v!==u && v.tgt===t.id && (v.x-t.x)**2 + (v.y-t.y)**2 < 2.6) n++; } if(n){ dmg *= 1 + .08*Math.min(5, n); if(n >= 3) moveFloat(u, (MOVES[u.card]||{}).n+' ×'+(n+1), t.x, t.y); } }
  if(mk==='crossbow' && isTitanish(t)) dmg *= 1.3;
  if(u.card==='crossbow' && t.pinT > now && ownsCard(own,'slingers')){ dmg *= 1.5; comboHit(own, 'pinpierce', t.x, t.y); }
  if(u.card==='horse'){ if(t.pinT > now && ownsCard(own,'slingers')){ dmg *= 2; comboHit(own, 'rundown', t.x, t.y); } else if(t.flungT > now && ownsCard(own,'elephant')){ dmg *= 1.6; comboHit(own, 'stampede', t.x, t.y); } }
  if(u.card==='militia' && t.burnT > now && ownsCard(own,'grenadiers')){ dmg *= 1.5; comboHit(own, 'fury', t.x, t.y); }
  if(u.card==='spearmen' && t.tauntT > now && ownsCard(own,'shieldwall')){ dmg *= 1.4; comboHit(own, 'hedge', t.x, t.y); }
  if(t.owner>0 && t.card){
    const tc = CARDS[t.card];
    if(tc.tags.includes('Ranged') && nearCard(t.owner, 'shieldwall', t.x, t.y, 1.8)){ dmg *= .45; comboHit(t.owner, 'shieldbow', t.x, t.y); }
    if(nearCard(t.owner, 'banner', t.x, t.y, CARDS.banner.auraR)) dmg *= .85;
    if(ranged){ const tev = cardEvo(t.owner, t.card); if(tev && tev.arrowRes) dmg *= 1 - tev.arrowRes; }
  }
  // Shields Up: a third of arrows and shots glance off a shield wall
  if(ranged && !st.splash && t.card==='shieldwall' && t.owner > 0 && Math.random() < 1/3){ dmg = 0; if(onScr(t.x, t.y)){ for(let i=0;i<3;i++){ const a = rnd(0,6.283); fxAdd({k:'spark', x:t.x, y:t.y-.25, vx:Math.cos(a)*1.4, vy:Math.sin(a)*1.4-.6, life:.16, max:.16, col:'#cfe8ff'}); } moveFloat(t, 'Blocked!'); } }
  // delayed blasts: siege marks the ground, bombers' fuses fizz
  let deferred = false;
  if(dmg > 0 && ranged && !mul && (mk==='catapult' || mk==='grenadiers')){
    deferred = true; const sig = mk==='catapult', ff = ownsCard(own,'airships') && ownsCard(own,'grenadiers');
    queueBlast(sig ? {x:t.x, y:t.y, at:now+1, wait:1, rad:Math.max(.9, st.splash*1.2), dmg:dmg*1.15, edge:Math.min(.8, st.smul+.1), own, card:u.card, warn:true, big:true, kg:ownsCard(own,'spearmen'), fire:!!st.burn}
                   : {x:t.x, y:t.y, at:now+.5, wait:.5, rad:Math.max(.85, st.splash*1.15), dmg, edge:Math.min(1, st.smul*1.2), own, card:u.card, fuse:true, knock:.22, burn:true, fire:!!st.burn || ff, ff});
    if(sig) moveFloat(u, null, t.x, t.y);
  }
  if(dmg > 0 && !deferred) hitUnit(t, dmg, own, false);
  else if(deferred && mk==='grenadiers') hitUnit(t, dmg, own, false);   // the bomb itself hits; the fuse blast comes after
  if(dmg > 0 && !deferred && t.hp > 0){
    if(mk==='slingers'){ t.pinT = now + 1.5; }
    if(mk==='longbow' && ranged){ let rr = .2; if(u.card==='longbow' && ownsCard(own,'banner') && nearCard(own, 'banner', u.x, u.y, bannerR(own))){ rr = .45; comboHit(own, 'ironrain', t.x, t.y); } splashHit(t, .6, dmg*rr, own); if(onScr(t.x, t.y) && fxDetail() && Math.random() < .5) for(let i=0;i<3;i++) fxAdd({k:'drop', x:t.x+rnd(-.55,.55), y:t.y+rnd(-.3,.3), sk:'arrow', h:2.4, life:.36+i*.06, max:.36, sc:.8}); }
    if(!ranged && t.card==='spearmen' && isMountedU(u) && t.owner > 0){ R.cc = t.card; hitUnit(u, dmg*.4, t.owner, false); R.cc = u.card; knock(u, t.x, t.y, .7, .7, .3); if(onScr(t.x, t.y)) fxAdd({k:'spikes', x:t.x, y:t.y, a:Math.atan2(u.y-t.y, u.x-t.x), life:.5, max:.5, col:'#ffd98a'}); moveFloat(t, 'Set Spears!'); }
    if(mk==='knights' && charged){ let k = 0; for(const v of G.units){ if(k >= 6 || v.hp<=0 || !atWar(own, v.owner) || (v.x-t.x)**2 + (v.y-t.y)**2 > .95) continue; knock(v, u.x, u.y, .6, .3, .25); k++; } u.reformT = now + 1.2; if(onScr(t.x, t.y)) fxAdd({k:'shock', x:t.x, y:t.y+.05, s:1.2, life:.4, max:.4, col:'#e8d8a8'}); moveFloat(u); }
    if(mk==='elephant' && !ranged){ let k = 0; for(const v of G.units){ if(k >= 3 || v.hp<=0 || !atWar(own, v.owner) || isTitanish(v) || (v.x-t.x)**2 + (v.y-t.y)**2 > 1.1) continue; knock(v, u.x, u.y, 1.1, .5, .42); v.flungT = now + 2; k++; } if(k) moveFloat(u, 'Fling!'); }
    if(mk==='horse' && !ranged){ u.hrT = now + .65; }
    if(u.card==='firemonks' && Math.random() < .3){ if(!R.fires) R.fires = []; if(R.fires.length < 40) R.fires.push({x:t.x, y:t.y, r:.55, life:1.6, max:1.6, dps:st.dmg*.2, own, card:u.card}); }
    if(u.card==='airships' && st.splash > 0 && ownsCard(own,'grenadiers') && Math.random() < .35){ if(!R.fires) R.fires = []; if(R.fires.length < 40) R.fires.push({x:t.x, y:t.y, r:.7, life:2.5, max:2.5, dps:st.dmg*.15, own, card:u.card}); comboHit(own, 'firestorm', t.x, t.y); }
    if((mk==='crossbow' && ranged && !st.thru) || (u.card==='crossbow' && t.pinT > now && ownsCard(own,'slingers'))) pierceOn(u, t, dmg, own, st, u.card==='crossbow' && ownsCard(own,'slingers') ? 3 : 1);
    if(own===PLAYER && !G.arena && CAM.z >= 16 && !(u.dnT > R.now) && onScr(t.x, t.y)){ u.dnT = (R.now||0) + .9; R.floats.push({text:String(Math.round(dmg)), x:t.x+rnd(-.2,.2), y:t.y-.55, col:(MOVES[u.card]||{}).col || '#fff1cf', life:.7, max:.7, sm:1}); }
  }
  { const ls = (u.hero ? 0 : CARDS[u.card].lifesteal||0) + (own===PLAYER && G.perk==='northmen' ? .1 : 0) + (u.hero==='northmen' ? (u.berserk > 0 ? .6 : .3) : 0); if(ls){ const h0 = u.hp; u.hp = Math.min(st.hp, u.hp + dmg*ls); recHeal(own, u.hero ? 'hero' : u.card, u.hp - h0); } }
  if(st.splash > 0 && !deferred){
    splashHit(t, st.splash, dmg*st.smul, own);
    if(st.splash >= .5) ring(t.x, t.y, .1, st.splash, st.evc || (st.rank >= 3 ? '#ffd36a' : '#e8d8b0'), .28);
    if(st.burn){ if(!R.fires) R.fires = []; if(R.fires.length < 40) R.fires.push({x:t.x, y:t.y, r:Math.max(.5, st.splash*.6), life:2.2, max:2.2, dps:st.dmg*.12, own, card:u.card}); }
  }
  if(charged && st.trample){ splashHit(t, .75, dmg*.45, own); ring(t.x, t.y, .1, .75, '#d8c8a0', .25); }
  if(!ranged && st.cleave && !mul){
    let n = 0;
    for(const v of G.units){ if(n >= st.cleave) break; if(v===t || v.hp<=0 || !atWar(own, v.owner) || (v.x-t.x)**2+(v.y-t.y)**2 > .8) continue; hitUnit(v, dmg*.75, own, false); n++; if(CARDS[u.card].lifesteal){ const h0 = u.hp; u.hp = Math.min(st.hp, u.hp + dmg*.75*CARDS[u.card].lifesteal); recHeal(own, u.card, u.hp - h0); } R.projs.push({x0:t.x, y0:t.y-.15, x1:v.x, y1:v.y-.15, life:.12, max:.12, col:st.evc || '#fff3c0', w:.9, kind:'slash'}); }
  }
  if(ranged && st.thru){
    const dd0 = Math.hypot(t.x-u.x, t.y-u.y) || 1, bx = t.x + (t.x-u.x)/dd0*.8, by = t.y + (t.y-u.y)/dd0*.8;
    let b = null, bd = .5;
    for(const v of G.units){ if(v===t || v.hp<=0 || !atWar(own, v.owner)) continue; const d2 = (v.x-bx)**2+(v.y-by)**2; if(d2 < bd){ bd = d2; b = v; } }
    if(b){ hitUnit(b, dmg*.6, own, false); R.projs.push({x0:t.x, y0:t.y-.1, x1:b.x, y1:b.y-.1, life:.14, max:.14, col:st.evc || (own===PLAYER?'#fff1cf':ocol(own)), w:.6, kind:'arrow'}); }
  }
  if(!ranged && t.card && t.hp > 0 && t.owner > 0){
    const tc = CARDS[t.card], tl = cardLevel(t.owner, t.card);
    if(tl >= 6 && lvStyle(tc)==='shield'){ const rp = dmg*.3; R.cc = t.card; hitUnit(u, rp, t.owner, false); R.cc = u.card; ring(t.x, t.y, .1, .45, '#d8e4f0', .2); }
  }
  if(u.card==='elephant' && ownsCard(own,'banner')){ t.slow = 2; comboHit(own, 'drums', t.x, t.y); }
  const dd = Math.hypot(t.x-u.x, t.y-u.y) || 1; u.lg = .12; u.lx = (t.x-u.x)/dd; u.ly = (t.y-u.y)/dd;
  noteFight(t.x, t.y);
  const fsh = formOf(u.card, uLv(u)).sh, heavy = st.splash > 0 && ranged, sk = fsh || (heavy ? 'ball' : ranged ? 'arrow' : 'slash');
  if(mul && mul < 1 && !ranged) return;
  const fsc = fxScale(u);
  if(!ranged && !fsh){ fxMelee(u, t, fsc, crit); if(charged){ SFX.q('hooves', u.x, u.y, 1); if(fxDetail() && onScr(u.x, u.y)) smoke(u.x, u.y+.15, .2, 1, '#b8a888'); } return; }
  const pc = st.evc || (st.rank >= 3 ? '#ffd36a' : own===PLAYER?'#fff1cf':ocol(own)), pw = (heavy?1.6:ranged?.6:.7)*(st.evc ? 1.5 : 1 + .12*st.rank) + (crit ? .8 : 0);
  { const fl = deferred ? (mk==='catapult' ? .95 : .4) : ranged ? .22 : .12; if(R.projs.length < 400) R.projs.push({sk, x0:u.x, y0:u.y-.15, x1:t.x, y1:t.y-.1, life:fl, max:fl, col:pc, w:pw, kind:heavy?'ball':ranged?'arrow':'slash', imp:deferred ? null : sk, sc:fsc}); }
  const mg = sk==='bullet' && weaponOf(u.card, uLv(u))==='mg';
  if(mg && R.projs.length < 400) for(let k=1;k<3;k++) R.projs.push({sk, x0:u.x, y0:u.y-.15, x1:t.x+rnd(-.2,.2), y1:t.y-.1+rnd(-.2,.2), life:.22+k*.06, max:.22+k*.06, col:pc, w:pw});
  fxMuzzle(u, t, sk, fsc);
  SFX.q(mg ? 'mg' : SHOT_SND[sk] || 'twang', u.x, u.y, fsc);
}
/* Punch Through: a bolt carries on to the next enemies behind its target */
function pierceOn(u, t, dmg, own, st, n){
  const dd0 = Math.hypot(t.x-u.x, t.y-u.y) || 1, dx = (t.x-u.x)/dd0, dy = (t.y-u.y)/dd0; let px = t.x, py = t.y, last = t; const hit = new Set([t]);
  for(let k=0;k<n;k++){
    const bx = px + dx*.8, by = py + dy*.8; let b = null, bd = .55;
    for(const v of G.units){ if(hit.has(v) || v.hp<=0 || !atWar(own, v.owner)) continue; const d2 = (v.x-bx)**2+(v.y-by)**2; if(d2 < bd){ bd = d2; b = v; } }
    if(!b) break; hit.add(b); hitUnit(b, dmg*.6, own, false);
    if(R.projs.length < 400) R.projs.push({x0:last.x, y0:last.y-.12, x1:b.x, y1:b.y-.12, life:.14, max:.14, col:'#bff6ff', w:.7, kind:'arrow'});
    px = b.x; py = b.y; last = b;
  }
  if(last !== t && onScr(t.x, t.y)) fxAdd({k:'streak', x:u.x, y:u.y-.2, x1:last.x+dx*.6, y1:last.y-.2+dy*.6, life:.25, max:.25, col:'#bff6ff'});
}
/* Shots look their age: stones and arrows, then musket balls, tracers, rockets and finally beams */
function drawProj(x, p){
  const a = p.life/p.max, t = 1-a, sk = p.sk || p.kind;
  if(FXA.ok && sk !== 'fire' && drawProjSpr(x, p, sk)) return;
  const lerp = k => [p.x0+(p.x1-p.x0)*k, p.y0+(p.y1-p.y0)*k];
  const arc = (h) => { const [hx, hy] = lerp(t); return [hx, hy - Math.sin(t*Math.PI)*h]; };
  if(sk==='ball' || sk==='rock' || sk==='shell' || sk==='bomb'){
    const [hx, hy] = arc(sk==='rock' ? .5 : .6), r = sk==='rock' ? .07 : sk==='shell' ? .1 : .09;
    x.fillStyle = sk==='rock' ? '#6a645c' : '#1a1612'; x.beginPath(); x.arc(hx, hy, r, 0, 6.283); x.fill();
    if(sk==='bomb' && Math.sin(t*40) > 0){ x.fillStyle = '#ffd36a'; x.fillRect(hx+.05, hy-.12, .05, .05); }
    return;
  }
  if(sk==='fire' || sk==='plasma'){
    const [hx, hy] = sk==='fire' ? arc(.45) : lerp(t), c1 = sk==='fire' ? '#ff8a2a' : '#c06aff', c2 = sk==='fire' ? '#ffe08a' : '#e8f8ff';
    x.globalAlpha = .45; x.fillStyle = c1; x.beginPath(); x.arc(hx, hy, .16, 0, 6.283); x.fill();
    x.globalAlpha = 1; x.fillStyle = c2; x.beginPath(); x.arc(hx, hy, .07, 0, 6.283); x.fill();
    return;
  }
  if(sk==='rocket'){
    const [hx, hy] = arc(.35);
    for(let k=1;k<=4;k++){ const tt = Math.max(0, t - k*.07), [sx, sy] = lerp(tt); x.globalAlpha = .35*(1-k/5); x.fillStyle = '#b8b0a8'; x.beginPath(); x.arc(sx, sy - Math.sin(tt*Math.PI)*.35, .05 + k*.015, 0, 6.283); x.fill(); }
    x.globalAlpha = 1; x.fillStyle = '#e8e0d0'; x.fillRect(hx-.06, hy-.03, .12, .06); x.fillStyle = '#ff8a2a'; x.fillRect(hx-.1, hy-.02, .04, .04);
    return;
  }
  if(sk==='laser' || sk==='rail'){
    const col = p.col && p.col !== '#fff1cf' && sk==='laser' ? p.col : '#6ef0ff';
    x.globalAlpha = .35*a; x.strokeStyle = col; x.lineWidth = sk==='rail' ? .2 : .13; x.beginPath(); x.moveTo(p.x0, p.y0); x.lineTo(p.x1, p.y1); x.stroke();
    x.globalAlpha = Math.min(1, a*1.5); x.strokeStyle = '#ffffff'; x.lineWidth = sk==='rail' ? .07 : .035; x.beginPath(); x.moveTo(p.x0, p.y0); x.lineTo(p.x1, p.y1); x.stroke();
    return;
  }
  if(sk==='musket' || sk==='bullet'){
    if(sk==='musket' && t < .5){ x.globalAlpha = .4*(1 - t*2); x.fillStyle = '#d8d4cc'; x.beginPath(); x.arc(p.x0 + (p.x1-p.x0)*.06, p.y0 - .05, .1 + t*.2, 0, 6.283); x.fill(); }
    const k1 = Math.min(1, t*2.2), k0 = Math.max(0, k1 - (sk==='bullet' ? .25 : .12));
    const [ax, ay] = lerp(k0), [bx, by] = lerp(k1);
    x.globalAlpha = Math.min(1, a*1.6); x.strokeStyle = sk==='bullet' ? '#ffe9a0' : '#3a3632'; x.lineWidth = sk==='bullet' ? .045 : .06;
    x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
    return;
  }
  x.strokeStyle = sk==='bolt' ? '#5a3a1c' : p.col; x.globalAlpha = Math.min(1, a*1.4); x.lineWidth = .06*p.w*(sk==='bolt' ? 1.4 : 1);
  const k1 = Math.min(1,t*1.6), k0 = Math.max(0,t*1.6-(sk==='javelin' ? .7 : .45));
  x.beginPath(); x.moveTo(p.x0+(p.x1-p.x0)*k0, p.y0+(p.y1-p.y0)*k0); x.lineTo(p.x0+(p.x1-p.x0)*k1, p.y0+(p.y1-p.y0)*k1); x.stroke();
}
/* ---------- Battle effects: every weapon family gets a wind-up, a flight and an impact. Purely cosmetic ---------- */
function weaponOf(id, lvl){ const s = formOf(id, lvl).s, k = s[0], parts = s.slice(2).split('/'); return k==='i' ? parts[2] : k==='r' ? parts[3] : parts[0]; }
const uLv = u => u.hero ? (u.hlv||1) : cardLevel(u.owner, u.card);
function meleeStyle(u){
  const w = weaponOf(u.card, uLv(u));
  if(['spear','pike','bayonet','lance','firelance','halberd'].includes(w)) return w==='halberd' ? 'swing' : 'thrust';
  if(['elephant','armorelephant','chariot','wagon','warwagon'].includes(w)) return 'stomp';
  return 'swing';
}
const isSteel = u => { const w = weaponOf(u.card, uLv(u)); return w !== 'club' && w !== 'elephant' && w !== 'chariot'; };
function fxScale(u){ return (u.hero ? 1.7 : 1)*(u.owner > 0 && cardEvo(u.owner, u.card) ? 1.3 : 1)*((u.kind==='siege' || u.kind==='titan') ? 1.25 : 1); }
function onScr(x, y, m){ if(G && G.arena) return true; if(typeof VW==='undefined' || !VW) return false; const hw = VW/2/CAM.z + (m||1.5), hh = VH/2/CAM.z + (m||1.5); return Math.abs(x-CAM.x) < hw && Math.abs(y-CAM.y) < hh; }
const fxDetail = () => (G && G.arena) || CAM.z >= 9;
function fxAdd(o){ if(!R.fx2) R.fx2 = []; if(R.fx2.length < 700) R.fx2.push(o); }
function decal(o){ if(!R.decals) R.decals = []; R.decals.push(o); if(R.decals.length > 180) R.decals.splice(0, R.decals.length-180); }
function smoke(x, y, s, life, col){ if(!R.smoke) R.smoke = []; R.smoke.push({x, y, s, s0:s, life, max:life, vx:rnd(.08,.22), vy:rnd(-.18,-.06), col:col||'#d8d4cc'}); if(R.smoke.length > 160) R.smoke.splice(0, R.smoke.length-160); }
function fxMuzzle(u, t, sk, sc){
  if(!onScr(u.x, u.y)) return;
  const a = Math.atan2(t.y-u.y, t.x-u.x), mx = u.x + Math.cos(a)*.3*sc, my = u.y - .18 + Math.sin(a)*.3*sc, det = fxDetail();
  if(sk==='musket' || sk==='bullet' || sk==='shell'){
    fxAdd({k:'flash', x:mx, y:my, s:(sk==='shell' ? .45 : sk==='musket' ? .28 : .18)*sc, life:.07, max:.07, col:'#ffe08a'});
    if(det && (sk==='musket' || sk==='shell')) smoke(mx, my, (sk==='shell' ? .3 : .18)*sc, sk==='shell' ? 3.2 : 2.6);
    if(det && sk==='bullet' && Math.random() < .6) fxAdd({k:'brass', x:u.x, y:u.y-.2, vx:-Math.cos(a)*.6 + rnd(-.4,.4), vy:-1.4, life:.5, max:.5});
  } else if(sk==='laser' || sk==='rail' || sk==='plasma'){
    fxAdd({k:'glow', x:mx, y:my, s:(sk==='rail' ? .35 : .22)*sc, life:.12, max:.12, col:sk==='plasma' ? '#c06aff' : '#6ef0ff'});
  } else if(sk==='rocket'){
    fxAdd({k:'flash', x:mx, y:my, s:.22*sc, life:.08, max:.08, col:'#ffb35c'}); if(det) smoke(u.x - Math.cos(a)*.3, u.y - .1, .22, 1.6);
  } else if(sk==='fire'){
    fxAdd({k:'flash', x:mx, y:my, s:.2*sc, life:.1, max:.1, col:'#ff8a2a'});
  }
}
function fxImpact(x, y, kind, sc){
  if(!onScr(x, y)) return;
  const det = fxDetail(); sc = sc || 1;
  if(kind==='shell' || kind==='bomb' || kind==='rocket' || kind==='ball'){
    const big = (kind==='shell' ? 1.2 : 1)*sc;
    if(FXA.ok) sAnim({n:'fire', x, y:y-.15*big, s:1.05*big, life:.5, max:.5});
    else { fxAdd({k:'flash', x, y, s:.55*big, life:.09, max:.09, col:'#fff6d0'}); fxAdd({k:'fireball', x, y, s:.7*big, life:.45, max:.45}); }
    if(det){ for(let i=0;i<6;i++){ const a = rnd(0,6.283), s = rnd(1.2,2.6); fxAdd({k:'debris', x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 1.2, life:rnd(.4,.7), max:.7, col:Math.random() < .5 ? '#3a2e24' : '#6a5a48'}); } smoke(x, y-.1, .35*big, 2.4, '#8a8278'); }
    decal({k:'scorch', x, y, s:.45*big, life:9, max:9});
    if(big > 1.3 && G && !G.arena) R.shake = Math.min(4, (R.shake||0) + .6);
    SFX.q('boom', x, y, big);
  } else if(kind==='fire'){
    if(FXA.ok && det) sAnim({n:'fire', x, y:y-.1, s:.55*sc, life:.4, max:.4});
    for(let i=0;i<(det ? 5 : 2);i++) fxAdd({k:'ember', x:x+rnd(-.2,.2), y:y+rnd(-.1,.1), vx:rnd(-.3,.3), vy:rnd(-1.2,-.4), life:rnd(.5,1), max:1});
    decal({k:'ember', x, y, s:.3*sc, life:3, max:3});
  } else if(kind==='plasma'){
    if(FXA.ok) sAnim({n:'energy', x, y, s:.6*sc, life:.35, max:.35});
    fxAdd({k:'ring', x, y, s:.6*sc, life:.3, max:.3, col:'#c06aff'}); fxAdd({k:'glow', x, y, s:.35*sc, life:.2, max:.2, col:'#e8c8ff'});
  } else if(kind==='laser' || kind==='rail'){
    if(FXA.ok) sAnim({n:'energy', x, y, s:(kind==='rail' ? .7 : .45)*sc, life:.3, max:.3});
    for(let i=0;i<(det ? 4 : 1);i++){ const a = rnd(0,6.283); fxAdd({k:'spark', x, y, vx:Math.cos(a)*2, vy:Math.sin(a)*2-.5, life:.18, max:.18, col:'#bff8ff'}); }
    if(kind==='rail') fxAdd({k:'ring', x, y, s:.7*sc, life:.25, max:.25, col:'#6ef0ff'});
  } else if(kind==='arrow' || kind==='bolt' || kind==='javelin' || kind==='rock' || kind==='musket' || kind==='bullet'){
    if(FXA.ok && det) sAnim({n:'hit', x, y:y-.1, s:(kind==='rock' ? .55 : .45)*sc, life:.24, max:.24});
  }
  if(kind==='arrow' || kind==='bolt' || kind==='javelin'){
    if(det && Math.random() < .5) decal({k:'arrow', x:x+rnd(-.3,.3), y:y+rnd(-.1,.3), ang:rnd(-.6,.6) - 1.57, life:3, max:3, col:kind==='bolt' ? '#5a3a1c' : '#7a5a34'});
    if(det){ for(let i=0;i<2;i++){ const a = rnd(0,6.283); fxAdd({k:'spark', x, y, vx:Math.cos(a)*1.2, vy:Math.sin(a)*1.2-.4, life:.15, max:.15, col:'#c8a878'}); } }
  } else if(kind==='rock'){
    if(det) smoke(x, y, .15, 1, '#a89a88');
    for(let i=0;i<(det ? 4 : 1);i++){ const a = rnd(0,6.283); fxAdd({k:'debris', x, y, vx:Math.cos(a)*1.4, vy:Math.sin(a)*1.4-.8, life:.4, max:.4, col:'#6a645c'}); }
    if(sc > 1.2) decal({k:'crater', x, y, s:.3*sc, life:6, max:6});
  } else if(kind==='musket' || kind==='bullet'){
    if(det){ const a = rnd(0,6.283); fxAdd({k:'spark', x, y, vx:Math.cos(a), vy:Math.sin(a)-.6, life:.12, max:.12, col:'#fff1cf'}); }
  }
}
function fxMelee(u, t, sc, crit){
  if(!onScr(u.x, u.y)) return;
  const style = meleeStyle(u), a = Math.atan2(t.y-u.y, t.x-u.x), steel = isSteel(u), rr = (.38 + .12*(u.r||.2)*4)*sc;
  if(FXA.ok){
    const rider = u.kind==='rider' || (u.card && CARDS[u.card] && CARDS[u.card].role==='rider');
    const n = style==='stomp' ? 'stomp' : style==='thrust' ? (rider ? 'lance' : 'spear') : (rider ? 'saber' : 'sword'), fl = Math.cos(a) < 0;
    if(n==='stomp') sAnim({n, x:t.x, y:t.y+.05, s:1.1*sc, life:.32, max:.32});
    else sAnim({n, x:u.x + Math.cos(a)*rr*.75, y:u.y-.15 + Math.sin(a)*rr*.75, s:rr*(n==='spear' || n==='lance' ? 2.2 : 1.7)*(crit ? 1.25 : 1), ang:fl ? a - Math.PI : a, flip:fl, life:.2, max:.2});
  } else if(style==='swing') fxAdd({k:'arc', x:u.x, y:u.y-.15, a, r:rr, life:.16, max:.16, col:crit ? '#ffd36a' : '#fff6e0', w:crit ? 2 : 1});
  else if(style==='thrust') fxAdd({k:'thrust', x:u.x, y:u.y-.15, a, r:rr*1.5, life:.13, max:.13, col:crit ? '#ffd36a' : '#fff6e0'});
  else { fxAdd({k:'ring', x:t.x, y:t.y+.1, s:.5*sc, life:.3, max:.3, col:'#c8a878'}); if(fxDetail()) smoke(t.x, t.y+.1, .2*sc, 1.2, '#b8a888'); }
  if(steel && style!=='stomp' && fxDetail()){ for(let i=0;i<(crit ? 6 : 2);i++){ const b = rnd(0,6.283); fxAdd({k:'spark', x:t.x, y:t.y-.2, vx:Math.cos(b)*1.6, vy:Math.sin(b)*1.6-.5, life:.14, max:.14, col:'#fff3c0'}); } }
  if(crit) fxAdd({k:'ring', x:t.x, y:t.y, s:.55*sc, life:.22, max:.22, col:'#ffd36a'});
  SFX.q(style==='stomp' ? 'stomp' : 'whoosh', u.x, u.y, sc);
  SFX.q(style==='stomp' ? 'thud' : steel ? 'clang' : 'thud', t.x, t.y, sc);
}
function fxTick(dt){
  if(R.fx2){ const landed = []; for(const f of R.fx2){ f.life -= dt; if(f.k==='drop' && f.life <= 0 && !f.done){ f.done = true; landed.push(f); } if(f.vx !== undefined){ f.x += f.vx*dt; f.y += f.vy*dt; if(f.k==='brass' || f.k==='debris'){ f.vy += 4*dt; } else { f.vx *= .9; f.vy *= .9; } } } R.fx2 = R.fx2.filter(f => f.life > 0);
    for(const f of landed){ if(f.sk==='meteor'){ fxImpact(f.x, f.y, 'fire', 2); fxAdd({k:'shock', x:f.x, y:f.y, s:1.8, life:.5, max:.5, col:'#ffb35c'}); decal({k:'crater', x:f.x, y:f.y, s:.8, life:10, max:10}); if(G && !G.arena) R.shake = Math.min(5, (R.shake||0)+2); } else if(f.sk==='bomb') fxImpact(f.x, f.y, 'bomb', 1); else if(f.sk==='arrow'){ if(Math.random() < .6) decal({k:'arrow', x:f.x, y:f.y, ang:-1.57+rnd(-.4,.4), life:3, max:3, col:'#6a4a2a'}); } else if(f.sk==='rock') fxAdd({k:'debris', x:f.x, y:f.y, vx:rnd(-.6,.6), vy:rnd(-1.2,-.5), life:.4, max:.4, col:'#8a8478'}); } }
  if(R.smoke){ for(const s of R.smoke){ s.life -= dt; s.x += s.vx*dt; s.y += s.vy*dt; s.s += dt*.18; } R.smoke = R.smoke.filter(s => s.life > 0); }
  if(R.decals){ for(const d of R.decals) d.life -= dt; R.decals = R.decals.filter(d => d.life > 0); }
  for(const p of R.projs){ if(p.life <= 0 && !p.hit && p.imp){ p.hit = true; fxImpact(p.x1, p.y1, p.imp, p.sc); } }
}
function drawDecals(x, vis){
  if(!R.decals) return;
  for(const d of R.decals){
    if(vis && !vis(d.x, d.y, 1)) continue;
    const a = Math.min(1, d.life/d.max*1.6);
    if(d.k==='cracks'){ x.globalAlpha = .6*a; x.strokeStyle = '#2a2018'; x.lineWidth = .045; for(let i=0;i<8;i++){ const an = i*.785 + Math.sin(d.seed+i)*.3; let px = d.x, py = d.y; x.beginPath(); x.moveTo(px, py); for(let j=1;j<=3;j++){ const r = d.s*j/3*(.7 + .3*Math.abs(Math.sin(d.seed*3+i*j))), aa = an + Math.sin(d.seed+i*7+j)*.35; px = d.x + Math.cos(aa)*r; py = d.y + Math.sin(aa)*r*.5; x.lineTo(px, py); } x.stroke(); } continue; }
    if(d.k==='scorch'){ x.globalAlpha = .45*a; x.fillStyle = '#1a1410'; x.beginPath(); x.ellipse(d.x, d.y+.05, d.s, d.s*.45, 0, 0, 6.283); x.fill(); }
    else if(d.k==='crater'){ x.globalAlpha = .4*a; x.strokeStyle = '#3a3028'; x.lineWidth = .06; x.beginPath(); x.ellipse(d.x, d.y+.05, d.s, d.s*.45, 0, 0, 6.283); x.stroke(); }
    else if(d.k==='ember'){ x.globalAlpha = .5*a*(.7 + .3*Math.sin((R.now||0)*12 + d.x*7)); x.fillStyle = '#ff7a2a'; x.beginPath(); x.ellipse(d.x, d.y+.05, d.s, d.s*.45, 0, 0, 6.283); x.fill(); }
    else if(d.k==='arrow'){ x.globalAlpha = .9*a; x.strokeStyle = d.col; x.lineWidth = .035; x.beginPath(); x.moveTo(d.x, d.y); x.lineTo(d.x + Math.cos(d.ang)*.22, d.y + Math.sin(d.ang)*.22); x.stroke(); x.fillStyle = '#e8e0d0'; x.fillRect(d.x + Math.cos(d.ang)*.2 - .03, d.y + Math.sin(d.ang)*.2 - .03, .06, .06); }
  }
  x.globalAlpha = 1;
}
function drawFx(x, vis){
  if(R.smoke) for(const s of R.smoke){ if(vis && !vis(s.x, s.y, 2)) continue; const al = .16*Math.min(1, s.life/s.max*1.5); x.fillStyle = s.col; x.globalAlpha = al; x.beginPath(); x.arc(s.x, s.y, s.s, 0, 6.283); x.fill(); x.globalAlpha = al*.8; x.beginPath(); x.arc(s.x - s.s*.45, s.y + s.s*.2, s.s*.7, 0, 6.283); x.arc(s.x + s.s*.5, s.y + s.s*.15, s.s*.6, 0, 6.283); x.fill(); }
  if(R.fx2) for(const f of R.fx2){
    if(vis && !vis(f.x, f.y, 2)) continue;
    const a = clamp(f.life/f.max, 0, 1);
    if(f.k==='flash' || f.k==='glow'){ x.globalAlpha = (f.k==='glow' ? .7 : 1)*a; x.fillStyle = f.col; x.beginPath(); x.arc(f.x, f.y, f.s*(f.k==='glow' ? 1 : .6 + .4*a), 0, 6.283); x.fill(); if(f.k==='flash'){ x.fillStyle = '#ffffff'; x.beginPath(); x.arc(f.x, f.y, f.s*.4, 0, 6.283); x.fill(); } }
    else if(f.k==='fireball'){ const g = 1 - a; x.globalAlpha = .85*a; x.fillStyle = '#ff9a3c'; x.beginPath(); x.arc(f.x, f.y-g*.2, f.s*(.4 + g*.7), 0, 6.283); x.fill(); x.fillStyle = '#ffe08a'; x.beginPath(); x.arc(f.x, f.y-g*.2, f.s*(.2 + g*.3)*a, 0, 6.283); x.fill(); }
    else if(f.k==='ring'){ x.globalAlpha = .8*a; x.strokeStyle = f.col; x.lineWidth = .06; x.beginPath(); x.arc(f.x, f.y, f.s*(1.15 - a*.75), 0, 6.283); x.stroke(); }
    else if(f.k==='arc'){ x.globalAlpha = .9*a; x.strokeStyle = f.col; x.lineWidth = .05*f.w + .06*a; const sweep = (1-a)*1.6; x.beginPath(); x.arc(f.x, f.y, f.r, f.a - .9 + sweep*.0, f.a - .9 + sweep + .3); x.stroke(); }
    else if(f.k==='thrust'){ x.globalAlpha = .9*a; x.strokeStyle = f.col; x.lineWidth = .05; const r0 = f.r*.3, r1 = f.r*(.55 + .45*(1-a)); x.beginPath(); x.moveTo(f.x + Math.cos(f.a)*r0, f.y + Math.sin(f.a)*r0); x.lineTo(f.x + Math.cos(f.a)*r1, f.y + Math.sin(f.a)*r1); x.stroke(); }
    else if(f.k==='spark' || f.k==='debris' || f.k==='ember' || f.k==='brass'){ x.globalAlpha = Math.min(1, a*1.6); x.fillStyle = f.k==='ember' ? (Math.random() < .5 ? '#ffd36a' : '#ff8a2a') : f.k==='brass' ? '#e8c050' : f.col; const s = f.k==='debris' ? .07 : .045; x.fillRect(f.x-s/2, f.y-s/2, s, s); }
    else if(f.k==='sanim'){ const fr = FXA.m[f.n]; if(fr){ if(f.fol){ if(f.fol.hp > 0){ f.x = f.fol.x; f.y = f.fol.y + (f.dy||0); } } sprDraw(x, f.n, Math.min(fr.length-1, Math.floor((1-a)*fr.length)), f.x, f.y, f.s, f.ang||0, f.flip, f.fade ? Math.min(1, a*3) : 1); } }
    else if(f.k==='drop' || f.k==='spikes' || f.k==='dome' || f.k==='streak' || f.k==='lance' || f.k==='shock' || f.k==='beam' || f.k==='flag') drawSigFx(x, f, a);
    else if(f.k==='hbeam'){ x.globalAlpha = .7*a; x.strokeStyle = '#8ae89a'; x.lineWidth = .1; x.beginPath(); x.moveTo(f.x, f.y); x.lineTo(f.x1, f.y1); x.stroke(); x.globalAlpha = a; x.strokeStyle = '#eaffef'; x.lineWidth = .035; x.beginPath(); x.moveTo(f.x, f.y); x.lineTo(f.x1, f.y1); x.stroke(); }
    else if(f.k==='plus'){ x.globalAlpha = a; x.fillStyle = '#7ae08a'; x.fillRect(f.x-.08, f.y-.025, .16, .05); x.fillRect(f.x-.025, f.y-.08, .05, .16); }
  }
  x.globalAlpha = 1;
}

function ring(x, y, r0, r1, col, life){ if(!R.rings) R.rings = []; if(R.rings.length < 120) R.rings.push({x, y, r0, r1, col, life:life||.45, max:life||.45}); }
/* Signature moments: at Lv 8 every troop line's special attack gets its own spectacle and sound. Damage is unchanged */
const SIG = {
  militia:{g:'Swarm', n:'Blood Frenzy', d:'The horde paints itself red and roars into the fight', snd:'warcry'},
  spearmen:{g:'Line', n:'Phalanx', d:'A hedge of golden spears snaps forward', snd:'clang'},
  shieldwall:{g:'Line', n:'Tortoise', d:'Shields lock into a shining dome', snd:'gong'},
  slingers:{g:'Ranged', n:'Stone Hail', d:'Stones rain down from the sky', snd:'hail'},
  longbow:{g:'Ranged', n:'Arrow Storm', d:'The sky goes dark with arrows', snd:'storm'},
  crossbow:{g:'Ranged', n:'Piercing Bolts', d:'Bolts streak straight through their targets', snd:'pierce'},
  grenadiers:{g:'Fire', n:'Firestorm', d:'A towering fireball and shockwave', snd:'blast'},
  horse:{g:'Mounted', n:'Whirlwind Raid', d:'Riders tear through in a storm of dust', snd:'hooves'},
  knights:{g:'Mounted', n:'Lance of Dawn', d:'The charge becomes a blazing line of light', snd:'thunder'},
  elephant:{g:'Titan', n:'Earthshaker', d:'The ground cracks open under the stomp', snd:'quake'},
  catapult:{g:'Siege', n:'Meteor', d:'A flaming stone falls from the heavens', snd:'meteor'},
  airships:{g:'Fire', n:'Carpet Bombing', d:'A line of bombs walks across the enemy', snd:'blast'},
  priests:{g:'Support', n:'Pillar of Light', d:'A column of light heals the faithful', snd:'choir'},
  banner:{g:'Support', n:'Rally Banner', d:'A great banner rises and sends allies into a frenzy', snd:'fanfare'},
  wolves:{g:'Mounted', n:'Howl of the Pack', d:'The pack howls and the whole hunt surges forward', snd:'warcry'},
  firemonks:{g:'Fire', n:'Sacred Flame', d:'A pillar of holy fire burns foes and mends the faithful', snd:'choir'},
  golems:{g:'Titan', n:'Avalanche', d:'The earth splits and boulders rain from the sky', snd:'quake'},
  skylancers:{g:'Mounted', n:'Comet Dive', d:'The lancers fall from the sky like a burning comet', snd:'thunder'},
  shadows:{g:'Ranged', n:'Night Volley', d:'Shots fall out of a sudden darkness', snd:'storm'},
  colossus:{g:'Titan', n:'Sunbeam', d:'A blinding beam sweeps the field', snd:'blast'}
};
const sigLv = u => u.hero ? (u.hlv||1) : cardLevel(u.owner, u.card);
function sigFire(u, g, tgt){
  const S0 = SIG[u.card]; if(!S0 || S0.g !== g || sigLv(u) < 8) return false;
  const k = u.owner+':'+u.card, now = R.now||0; if(!R.sigT) R.sigT = {};
  if((R.sigT[k]||0) > now) return false;
  R.sigT[k] = now + (u.owner===PLAYER || G.arena ? 1.4 : 2.6);
  SFX.q(S0.snd, u.x, u.y, 1.3);
  if(!onScr(u.x, u.y, 3)) return true;
  const own = u.owner, col = own===PLAYER ? '#ffe3a3' : '#ffb7a8';
  float(S0.n+'!', u.x, u.y-1, col, 1.5); R.floats[R.floats.length-1].big = 1;
  const tx = tgt ? tgt.x : u.x, ty = tgt ? tgt.y : u.y, ang = Math.atan2(ty-u.y, tx-u.x);
  const drop = (x, y, sk, h, life, delay, sc) => fxAdd({k:'drop', x, y, sk, h, life:life+delay, max:life, sc:sc||1});
  switch(u.card){
    case 'militia': for(const v of G.units){ if(v.owner!==own || v.card!=='militia' || v.hp<=0 || (v.x-u.x)**2+(v.y-u.y)**2 > 6) continue; fxAdd({k:'glow', x:v.x, y:v.y+.1, s:.45, life:.9, max:.9, col:'rgba(255,60,40,.55)'}); for(let i=0;i<2;i++) fxAdd({k:'ember', x:v.x+rnd(-.2,.2), y:v.y-.2, vx:rnd(-.3,.3), vy:rnd(-1.4,-.6), life:.7, max:.7}); } ring(u.x, u.y, .2, 2.2, '#ff4a3a', .6); break;
    case 'spearmen': fxAdd({k:'spikes', x:u.x, y:u.y, a:ang, life:3, max:3, col:'#ffd98a'}); ring(u.x, u.y, .2, 1, '#ffd98a', .5); break;
    case 'shieldwall': fxAdd({k:'dome', x:u.x, y:u.y, s:.85, life:3, max:3, col:'#9fd0ff'}); break;
    case 'slingers': for(let i=0;i<9;i++) drop(tx+rnd(-1.1,1.1), ty+rnd(-.7,.7), 'rock', 3.2, .45, i*.06); break;
    case 'longbow': for(let i=0;i<18;i++) drop(tx+rnd(-1.5,1.5), ty+rnd(-1,1), 'arrow', 4, .55, i*.04); fxAdd({k:'glow', x:tx, y:ty, s:1.6, life:.9, max:.9, col:'rgba(0,0,0,.18)'}); break;
    case 'crossbow': { const fs = G.units.filter(v => v.hp>0 && atWar(own, v.owner) && (v.x-u.x)**2+(v.y-u.y)**2 < 16).slice(0, 4); if(tgt && !fs.includes(tgt)) fs.unshift(tgt); for(const v of fs.slice(0, 4)){ const a = Math.atan2(v.y-u.y, v.x-u.x), L = Math.hypot(v.x-u.x, v.y-u.y) + 2.2; fxAdd({k:'streak', x:u.x, y:u.y-.25, x1:u.x+Math.cos(a)*L, y1:u.y-.25+Math.sin(a)*L, life:.4, max:.4, col:'#bff6ff'}); fxAdd({k:'flash', x:v.x, y:v.y-.2, s:.35, life:.15, max:.15, col:'#bff6ff'}); } break; }
    case 'grenadiers': fxAdd({k:'fireball', x:tx, y:ty-.1, s:1.6, life:.9, max:.9}); fxAdd({k:'shock', x:tx, y:ty, s:2, life:.6, max:.6, col:'#ffcf7a'}); for(let i=0;i<10;i++) fxAdd({k:'ember', x:tx, y:ty-.2, vx:rnd(-2,2), vy:rnd(-2.6,-.4), life:.9, max:.9}); decal({k:'scorch', x:tx, y:ty, s:1.1, life:9, max:9}); if(own===PLAYER) R.shake = Math.min(4, (R.shake||0)+1.5); break;
    case 'horse': { const L = 3; for(let i=0;i<3;i++){ const o = (i-1)*.22, px = -Math.sin(ang)*o, py = Math.cos(ang)*o; fxAdd({k:'streak', x:u.x-Math.cos(ang)*L+px, y:u.y-Math.sin(ang)*L+py, x1:u.x+px, y1:u.y+py, life:.5, max:.5, col:'#e8d8a8'}); } for(let i=0;i<6;i++) smoke(u.x-Math.cos(ang)*i*.5+rnd(-.2,.2), u.y-Math.sin(ang)*i*.5+.1, .3, 1.4, '#c8b890'); break; }
    case 'knights': { const L = 3.2; fxAdd({k:'lance', x:u.x-Math.cos(ang)*L, y:u.y-.15-Math.sin(ang)*L, x1:u.x+Math.cos(ang)*.6, y1:u.y-.15+Math.sin(ang)*.6, life:.7, max:.7, col:'#ffe9a0'}); fxAdd({k:'flash', x:u.x+Math.cos(ang)*.6, y:u.y-.15+Math.sin(ang)*.6, s:.7, life:.3, max:.3, col:'#fff3c0'}); break; }
    case 'elephant': decal({k:'cracks', x:u.x, y:u.y+.1, s:1.6, seed:Math.random()*99, life:6, max:6}); fxAdd({k:'shock', x:u.x, y:u.y+.1, s:2.2, life:.55, max:.55, col:'#d8c098'}); fxAdd({k:'shock', x:u.x, y:u.y+.1, s:1.3, life:.4, max:.4, col:'#fff1cf'}); for(let i=0;i<10;i++) fxAdd({k:'debris', x:u.x+rnd(-.8,.8), y:u.y, vx:rnd(-1.5,1.5), vy:rnd(-3,-1.5), life:.8, max:.8, col:'#8a7458'}); if(own===PLAYER) R.shake = Math.min(6, (R.shake||0)+2.5); break;
    case 'catapult': drop(tx, ty, 'meteor', 6, .6, 0, 1.4); break;
    case 'airships': { const a = Math.atan2(ty-u.y, tx-u.x); for(let i=0;i<5;i++) drop(tx+Math.cos(a)*(i-2)*.6, ty+Math.sin(a)*(i-2)*.6, 'bomb', 2.6, .35, i*.12); break; }
    case 'priests': fxAdd({k:'beam', x:u.x, y:u.y+.2, s:.75, h:4, life:1.1, max:1.1, col:'#fff6c8'}); for(const v of G.units){ if(v.owner!==own || v.hp<=0 || !v.card || (v.x-u.x)**2+(v.y-u.y)**2 > 6.25) continue; fxAdd({k:'plus', x:v.x+rnd(-.2,.2), y:v.y-.4, vx:0, vy:-.8, life:.8, max:.8}); } break;
    case 'wolves': for(const v of G.units){ if(v.owner!==own || v.card!=='wolves' || v.hp<=0 || (v.x-u.x)**2+(v.y-u.y)**2 > 9) continue; v.frenzy = 4; ring(v.x, v.y, .1, .9, '#bfe0ff', .5); } fxAdd({k:'shock', x:u.x, y:u.y, s:2.4, life:.6, max:.6, col:'#bfe0ff'}); break;
    case 'firemonks': fxAdd({k:'beam', x:tx, y:ty+.2, s:.85, h:4, life:1.1, max:1.1, col:'#ffb35c'}); fxAdd({k:'fireball', x:tx, y:ty-.1, s:1.2, life:.8, max:.8}); for(const v of G.units){ if(v.owner!==own || v.hp<=0 || !v.card || (v.x-u.x)**2+(v.y-u.y)**2 > 9) continue; healBy(v, uStat(v).hp*.25, own, u.card); } break;
    case 'golems': decal({k:'cracks', x:tx, y:ty+.1, s:1.8, seed:Math.random()*99, life:6, max:6}); for(let i=0;i<6;i++) drop(tx+rnd(-1.2,1.2), ty+rnd(-.8,.8), 'rock', 4, .5, i*.08, 1.4); fxAdd({k:'shock', x:tx, y:ty+.1, s:2.4, life:.6, max:.6, col:'#d8c098'}); break;
    case 'skylancers': drop(tx, ty, 'meteor', 6, .55, 0, 1.1); fxAdd({k:'lance', x:u.x, y:u.y-1.4, x1:tx, y1:ty, life:.7, max:.7, col:'#fff1cf'}); break;
    case 'shadows': for(let i=0;i<16;i++) drop(tx+rnd(-1.4,1.4), ty+rnd(-1,1), 'arrow', 4, .5, i*.04); fxAdd({k:'glow', x:tx, y:ty, s:1.8, life:1, max:1, col:'rgba(60,20,100,.35)'}); break;
    case 'colossus': fxAdd({k:'lance', x:u.x+Math.cos(ang)*.6, y:u.y-1.1, x1:tx+Math.cos(ang)*1.5, y1:ty+Math.sin(ang)*1.5, life:.9, max:.9, col:'#9fe8ff'}); fxAdd({k:'shock', x:tx, y:ty, s:2.2, life:.6, max:.6, col:'#9fe8ff'}); for(const v of G.units){ if(v.hp<=0 || !atWar(own, v.owner) || (v.x-tx)**2+(v.y-ty)**2 > 2.25) continue; hitUnit(v, uStat(u).dmg*1.5, own, false); } break;
    case 'banner': fxAdd({k:'flag', x:u.x, y:u.y, life:1.6, max:1.6, col:own===PLAYER ? pcol() : ocol(own)}); fxAdd({k:'shock', x:u.x, y:u.y, s:2.6, life:.6, max:.6, col:'#ffd98a'}); break;
  }
  return true;
}
function drawSigFx(x, f, a){
  if(f.k==='drop'){
    if(f.life > f.max) return; const p = 1 - a, hh = f.h*(1-p), sc = f.sc||1;
    x.globalAlpha = .25 + .35*p; x.fillStyle = '#000'; x.beginPath(); x.ellipse(f.x, f.y+.05, .12*sc*(.5+p), .05*sc*(.5+p), 0, 0, 6.283); x.fill();
    const yy = f.y - hh; x.globalAlpha = 1;
    if(FXA.ok && (f.sk==='arrow' || f.sk==='rock' || f.sk==='bomb')){ sprDraw(x, f.sk==='bomb' ? 'shell' : f.sk, f.sk==='rock' ? ((R.now*12)|0)%4 : 0, f.x, yy, (f.sk==='arrow' ? .45 : .2)*sc, f.sk==='arrow' ? 1.35 : 0, false, 1); }
    else if(f.sk==='arrow'){ x.strokeStyle = '#6a4a2a'; x.lineWidth = .04; x.beginPath(); x.moveTo(f.x-.06, yy-.3); x.lineTo(f.x, yy); x.stroke(); x.fillStyle = '#d8d8d8'; x.fillRect(f.x-.02, yy-.03, .04, .06); }
    else if(f.sk==='rock'){ x.fillStyle = '#8a8478'; x.beginPath(); x.arc(f.x, yy, .07, 0, 6.283); x.fill(); }
    else if(f.sk==='bomb'){ x.fillStyle = '#2a2622'; x.beginPath(); x.ellipse(f.x, yy, .08, .12, 0, 0, 6.283); x.fill(); }
    else if(f.sk==='meteor'){ x.strokeStyle = 'rgba(255,140,40,.7)'; x.lineWidth = .22*sc; x.beginPath(); x.moveTo(f.x+1.2*(1-p)+.9, yy-1.4); x.lineTo(f.x+1.2*(1-p)*0, yy); x.stroke(); x.fillStyle = '#ffd36a'; x.beginPath(); x.arc(f.x, yy, .2*sc, 0, 6.283); x.fill(); x.fillStyle = '#ff7a2a'; x.beginPath(); x.arc(f.x, yy, .13*sc, 0, 6.283); x.fill(); }
  }
  else if(f.k==='spikes'){ x.globalAlpha = Math.min(1, a*2)*.95; x.strokeStyle = f.col; x.lineWidth = .05; for(let i=-3;i<=3;i++){ const an = f.a + i*.22, r0 = .25, r1 = .95 + (i%2 ? 0 : .15); x.beginPath(); x.moveTo(f.x+Math.cos(an)*r0, f.y-.1+Math.sin(an)*r0); x.lineTo(f.x+Math.cos(an)*r1, f.y-.1+Math.sin(an)*r1); x.stroke(); x.fillStyle = '#fff3c0'; x.fillRect(f.x+Math.cos(an)*r1-.03, f.y-.1+Math.sin(an)*r1-.03, .06, .06); } }
  else if(f.k==='dome'){ const al = Math.min(1, a*2.5); x.globalAlpha = .22*al; x.fillStyle = f.col; x.beginPath(); x.ellipse(f.x, f.y+.15, f.s, f.s*.95, 0, Math.PI, 0); x.fill(); x.globalAlpha = .7*al; x.strokeStyle = f.col; x.lineWidth = .04; x.beginPath(); x.ellipse(f.x, f.y+.15, f.s, f.s*.95, 0, Math.PI, 0); x.stroke(); x.globalAlpha = .35*al; for(let i=1;i<4;i++){ x.beginPath(); x.ellipse(f.x, f.y+.15, f.s*i/4, f.s*.95, 0, Math.PI, 0); x.stroke(); } }
  else if(f.k==='streak' || f.k==='lance'){ const w = f.k==='lance' ? .28 : .06; x.globalAlpha = a*.55; x.strokeStyle = f.col; x.lineWidth = w*1.8; x.lineCap = 'round'; x.beginPath(); x.moveTo(f.x, f.y); x.lineTo(f.x1, f.y1); x.stroke(); x.globalAlpha = a; x.strokeStyle = '#ffffff'; x.lineWidth = w*.5; x.beginPath(); x.moveTo(f.x, f.y); x.lineTo(f.x1, f.y1); x.stroke(); }
  else if(f.k==='shock'){ const r = f.s*(1.05 - a*.85); x.globalAlpha = .55*a; x.fillStyle = f.col; x.beginPath(); x.ellipse(f.x, f.y, r, r*.5, 0, 0, 6.283); x.fill(); x.globalAlpha = .9*a; x.strokeStyle = '#fff'; x.lineWidth = .05; x.stroke(); }
  else if(f.k==='beam'){ const al = Math.min(1, a*2)*(.8 + .2*Math.sin((R.now||0)*30)); const g = x.createLinearGradient ? x.createLinearGradient(f.x, f.y-f.h, f.x, f.y) : null; if(g){ g.addColorStop(0, 'rgba(255,246,200,0)'); g.addColorStop(.6, 'rgba(255,246,200,.6)'); g.addColorStop(1, 'rgba(255,255,255,.9)'); x.fillStyle = g; } else x.fillStyle = f.col; x.globalAlpha = al; x.fillRect(f.x-f.s/2, f.y-f.h, f.s, f.h); x.globalAlpha = al*.5; x.fillStyle = '#fff'; x.beginPath(); x.ellipse(f.x, f.y, f.s*.9, f.s*.35, 0, 0, 6.283); x.fill(); }
  else if(f.k==='flag'){ const p = 1 - a, rise = Math.min(1, p*3), fy = f.y - .4 - rise*1.4, wv = Math.sin((R.now||0)*6)*.08; x.globalAlpha = Math.min(1, a*2.5); x.fillStyle = '#3a2a14'; x.fillRect(f.x-.04, fy, .08, 1.5); x.fillStyle = f.col; x.beginPath(); x.moveTo(f.x+.04, fy); x.lineTo(f.x+.95, fy+.1+wv); x.lineTo(f.x+.8, fy+.35); x.lineTo(f.x+.95, fy+.6+wv); x.lineTo(f.x+.04, fy+.7); x.closePath(); x.fill(); x.strokeStyle = '#ffd98a'; x.lineWidth = .04; x.stroke(); }
}
function abilName(u, g){
  const k = u.owner+':'+g, now = R.now||0; if(!R.abT) R.abT = {};
  if((R.abT[k]||0) > now) return;
  if(u.owner!==PLAYER && !G.arena && Math.random() < .6) return;
  R.abT[k] = now + (G.arena ? .8 : 1.1);
  float(ABIL[g].n+'!', u.x, u.y-.75, u.owner===PLAYER ? '#ffe3a3' : '#ffb7a8', 1.1);
}
function useAbilities(u, st, tgt, d, own){
  const C = CARDS[u.card]; if(!u.ab) u.ab = {};
  for(const g of C.tags){
    const A = ABIL[g]; if(!A || !A.cd || g==='Support' || !unitAbil(u)) continue;
    if(u.ab[g] === undefined){ u.ab[g] = rnd(1, A.cd); continue; }
    if(u.ab[g] > 0) continue;
    R.ca = g; const reach = st.rng + tgt.r*.5; let fired = false;
    if(g==='Swarm'){ if(d < reach+.6){ u.frenzy = 4; fired = true; burst(u.x, u.y-.3, 4, '#ff7a5a'); } }
    else if(g==='Line'){ if(d < reach+1.2){ u.brace = 3; fired = true; ring(u.x, u.y, .15, .6, '#d8e4f0', .5); } }
    else if(g==='Ranged'){
      if(d < st.rng+1){
        const r2 = (st.rng+1)**2; let k = 0;
        for(const v of G.units){ if(k >= 4) break; if(v.hp<=0 || !atWar(own, v.owner) || (v.x-u.x)**2+(v.y-u.y)**2 > r2) continue; strike(u, v, st, own); k++; }
        fired = k > 0;
      }
    }
    else if(g==='Titan'){
      if(d < 1.7){
        for(const v of G.units){ if(v.hp<=0 || !atWar(own, v.owner) || (v.x-u.x)**2+(v.y-u.y)**2 > 2.25) continue; v.slow = 2.5; hitUnit(v, st.dmg*1.5, own, false); }
        ring(u.x, u.y, .3, 1.5, '#c8a878', .5); burst(u.x, u.y, 10, '#a08868'); if(own===PLAYER) R.shake = Math.min(3, R.shake+1); SFX.q('stomp', u.x, u.y, 1.4); if(fxDetail() && onScr(u.x, u.y)) smoke(u.x, u.y+.1, .35, 1.6, '#b8a888');
        fired = true;
      }
    }
    else if(g==='Mounted'){
      if(d < 3.4 && d > .3){
        const dx = (tgt.x-u.x)/d, dy = (tgt.y-u.y)/d, len = Math.min(d+1.1, 3.5);
        let ex = u.x+dx*len, ey = u.y+dy*len;
        const ti = idx(clamp(Math.floor(ex),0,N-1), clamp(Math.floor(ey),0,N-1));
        if(G.ter[ti]===WATER){ ex = tgt.x-dx*.3; ey = tgt.y-dy*.3; }
        const sx = u.x, sy = u.y, L = Math.hypot(ex-sx, ey-sy) || 1;
        for(const v of G.units){
          if(v.hp<=0 || !atWar(own, v.owner)) continue;
          const t = clamp(((v.x-sx)*(ex-sx)+(v.y-sy)*(ey-sy))/(L*L), 0, 1), px = sx+(ex-sx)*t, py = sy+(ey-sy)*t;
          if((v.x-px)**2+(v.y-py)**2 < .42) hitUnit(v, st.dmg*2*attackMul(u, v), own, false);
        }
        for(let k=0;k<5;k++){ burst(sx+(ex-sx)*k/4, sy+(ey-sy)*k/4, 2, '#d8c8a0'); if(fxDetail() && onScr(sx, sy)) smoke(sx+(ex-sx)*k/4, sy+(ey-sy)*k/4+.15, .2, 1.2, '#b8a888'); } SFX.q('hooves', sx, sy, 1.3);
        u.x = clamp(ex, .5, N-.5); u.y = clamp(ey, .5, N-.5); u.mv = 0; fired = true;
      }
    }
    else if(g==='Siege'){ if(d < st.rng+.6){ if(!R.fires) R.fires = []; if(R.fires.length < 40) R.fires.push({x:tgt.x, y:tgt.y, r:1, life:4, max:4, dps:st.dmg*.45, own, card:u.card}); fxImpact(tgt.x, tgt.y, 'fire', 1.3); SFX.q('fire', tgt.x, tgt.y, 1.2); fired = true; } }
    else if(g==='Fire'){
      if(d < Math.max(st.rng+.5, 2.6)){
        R.projs.push({x0:u.x, y0:u.y-.2, x1:tgt.x, y1:tgt.y, life:.3, max:.3, col:'#fff', w:1.6, kind:'ball'});
        hitUnit(tgt, st.dmg*2, own, false); splashHit(tgt, 1.2, st.dmg*1.6, own);
        ring(tgt.x, tgt.y, .2, 1.2, '#ffcf7a', .35); fxImpact(tgt.x, tgt.y, 'bomb', 1.2); fired = true;
      }
    }
    R.ca = null;
    if(fired){ u.ab[g] = A.cd*st.abm*rnd(.9,1.1); if(!sigFire(u, g, tgt)) abilName(u, g); }
  }
}
function supportMiracle(u, st, own){
  if(!unitAbil(u)) return;
  if(!u.ab) u.ab = {};
  if(u.ab.Support === undefined){ u.ab.Support = rnd(2, 12); return; }
  if(u.ab.Support > 0) return;
  let hurt = 0, foe = false;
  for(const v of G.units){
    if(v.hp<=0) continue; const d2 = (v.x-u.x)**2+(v.y-u.y)**2;
    if(v.owner===own && v.card && d2 < 6.25 && v.hp < uStat(v).hp*.7) hurt++;
    if(atWar(own, v.owner) && d2 < 16) foe = true;
  }
  const priest = st.heal > 0;
  if(priest ? hurt < 2 : !foe) return;
  for(const v of G.units){
    if(v.owner!==own || v.hp<=0 || !v.card || (v.x-u.x)**2+(v.y-u.y)**2 > 6.25) continue;
    if(priest){ healBy(v, uStat(v).hp*.3, own, u.card); } else { if(!v.ab) v.ab = {}; v.frenzy = 4; }
  }
  ring(u.x, u.y, .3, 2.5, priest ? '#7ae08a' : '#ffd98a', .6); burst(u.x, u.y-.5, 8, priest ? '#7ae08a' : '#ffd98a');
  u.ab.Support = ABIL.Support.cd*st.abm*rnd(.9,1.1); if(!sigFire(u, 'Support', null)){ SFX.q(priest ? 'chime' : 'horn', u.x, u.y, 1.2); abilName(u, 'Support'); }
}
function updateFires(dt){
  bombTick();
  if(!R.fires || !R.fires.length) return;
  for(const f of R.fires){
    f.life -= dt;
    R.cc = f.card; R.ca = 'Siege';
    for(const v of G.units){ if(v.hp<=0 || !atWar(f.own, v.owner) || (v.x-f.x)**2+(v.y-f.y)**2 > f.r*f.r) continue; hitUnit(v, f.dps*dt, f.own, false); }
    R.cc = null; R.ca = null;
    if(Math.random() < dt*6) burst(f.x+rnd(-.6,.6), f.y+rnd(-.6,.6), 1, Math.random()<.5 ? '#ff9a3c' : '#ffd36a');
  }
  R.fires = R.fires.filter(f => f.life > 0);
}
/* ---------- Battle line and battle sense ----------
   A band forms up around its general facing the enemy: melee in front, archers behind, riders on the
   flanks, siege and healers at the back. Each role picks targets its own way, the badly hurt step behind
   the line to bind their wounds, and troops regroup before assaulting a city. Rivals use the same rules. */
const ROLE_OF = {raider:'rider', warband:'guard', brute:'titan', ram:'siege', warlord:'titan'};
const roleOf = v => v.owner===0 ? (ROLE_OF[v.kind]||'guard') : v.hero ? 'titan' : (v.kind||'guard');
const isRangedU = u => u.kind==='archer' || u.kind==='siege';
function bandFront(h){
  if(h.fT > G.t && h.front) return h.front;
  h.fT = G.t + .3;
  let sx = 0, sy = 0, n = 0;
  for(const v of G.units){
    if(v.hp<=0 || v.owner===h.owner || !(v.owner===0 || atWar(h.owner, v.owner))) continue;
    const dx = v.x-h.x, dy = v.y-h.y, d2 = dx*dx + dy*dy; if(d2 > 81) continue;
    const w = 1/(1 + d2); sx += dx*w; sy += dy*w; n++;
  }
  let fx, fy;
  if(n){ const L = Math.hypot(sx, sy) || 1; fx = sx/L; fy = sy/L; h.fight = true; }
  else {
    h.fight = false; const mx = h.x - (h.lx ?? h.x), my = h.y - (h.ly ?? h.y), L = Math.hypot(mx, my);
    if(L > .05){ fx = mx/L; fy = my/L; } else if(h.front){ fx = h.front.x; fy = h.front.y; } else { fx = 0; fy = -1; }
  }
  h.lx = h.x; h.ly = h.y;
  if(h.front){ fx = h.front.x*.45 + fx*.55; fy = h.front.y*.45 + fy*.55; const L = Math.hypot(fx, fy) || 1; fx /= L; fy /= L; }
  return h.front = {x:fx, y:fy};
}
/* where this soldier stands in its general's battle line */
function bandSlot(u, h){
  const f = bandFront(h), px = -f.y, py = f.x, n = Math.max(6, (R.bandC && R.bandC.get(h.id)) || h.bandN || 8);
  const k = ((u.id*7919) % 101)/101, row = u.id % 4, W = clamp(1.4 + Math.sqrt(n)*.32, 1.8, 6.5);
  let fwd, side;
  if(u.kind==='guard' || u.kind==='titan'){ fwd = .9 + row*.42; side = (k - .5)*2*W; }
  else if(u.kind==='rider'){ fwd = .4 + (row % 2)*.5; side = (k < .5 ? -1 : 1)*(W + .5 + (row >> 1)*.5); }
  else if(u.kind==='archer'){ fwd = -.9 - (row % 2)*.45; side = (k - .5)*1.7*W; }
  else { fwd = -1.9 - (row % 2)*.45; side = (k - .5)*1.2*W; }
  const s = h.owner===PLAYER && G.order==='hold' ? .8 : 1;
  return {x:h.x + (f.x*fwd + px*side)*s, y:h.y + (f.y*fwd + py*side)*s};
}
/* role-aware target score: a lower number is a better target */
function roleScore(u, v, d){
  const rv = roleOf(v), att = v.tgt && R.ubi ? R.ubi.get(v.tgt) : null, onMe = att && att.owner===u.owner;
  switch(u.kind){
    case 'archer': return d - (onMe ? 1.6 : 0) - (rv==='archer' || rv==='siege' ? .6 : 0);
    case 'rider':  return d - (rv==='archer' || rv==='siege' || rv==='support' ? 3 : 0) + (rv==='titan' ? 1 : 0);
    case 'siege':  return d - (rv==='titan' ? 1 : 0);
    default:       return d - (onMe && att && isRangedU(att) ? 1.3 : 0) - (onMe ? .4 : 0);
  }
}
const enemyCityNear = (o, x, y, r) => { let best = null, bd = r*r; for(const c of G.cities){ if(c.dead || c.owner===o || !atWar(o, c.owner)) continue; const d = (c.x+.5-x)**2 + (c.y+.5-y)**2; if(d < bd){ bd = d; best = c; } } return best; };
function nationStep(u, dt, cityById, unitById){
  const own = u.owner, B = ROLE[u.kind];
  if(!B || !CARDS[u.card]){ u.hp = 0; return; }
  const st = uStat(u);
  let home = G.arena ? G.arena.home[own] : cityById.get(u.home);
  if(!G.arena && (!home || home.owner!==own || home.dead)){ home = capitalOf(own); if(!home){ u.hp=0; return; } u.home = home.id; }
  if(u.gar && !G.arena){ const gc = cityById.get(u.gar); if(gc && gc.owner===own && !gc.dead) home = gc; }
  if(!G.arena && u.kind!=='support' && !u.fol && !u.gar){ const dl = R.dangerAll && R.dangerAll.get(own);
    if(dl && !dl.includes(home.id) && !isRaider(u) && (G.own[tileAt(u.x, u.y)]===own || (u.x-home.x-.5)**2 + (u.y-home.y-.5)**2 < 49)){
      let best = null, bd = 1e9; for(const id of dl){ const c = cityById.get(id); if(!c || c.owner!==own || c.dead) continue; const d = (c.x+.5-u.x)**2 + (c.y+.5-u.y)**2; if(d < bd){ bd = d; best = c; } }
      if(best && bd < 900) home = best; } }
  const step = (tx,ty,d,mul) => {
    const wp = navPoint(u, own, tx, ty); if(wp){ tx = wp.x; ty = wp.y; d = Math.hypot(tx-u.x, ty-u.y); if(d < 1e-3) return; }
    const ti = idx(clamp(Math.floor(u.x),0,N-1), clamp(Math.floor(u.y),0,N-1));
    let s = st.spd*mul*(own!==PLAYER && G.own[ti]===PLAYER && proto('scorched') ? .65 : 1)*(formFly(u.card, cardLevel(own, u.card)) || (cardEvo(own, u.card)||{}).fly ? 1 : MOVE[G.ter[ti]])*(u.slow > 0 ? .5 : 1);
    if(own!==PLAYER && S.barbSlow && G.own[ti]===PLAYER) s *= .55;
    if(u.fmT > G.t) s *= 1.7;
    { const mt = MT(); if(u.pinT > mt) s *= .65; if(u.rallyT > mt) s *= 1.2; }
    const m = Math.min(d, s*dt); u.x += (tx-u.x)/d*m; u.y += (ty-u.y)/d*m; u.mv = (u.mv||0) + m;
    if(Math.abs(tx-u.x) > .05) u.fx = tx<u.x ? -1 : 1;
  };
  if(st.selfheal && u.hp < st.hp){ const h0 = u.hp; u.hp = Math.min(st.hp, u.hp + st.hp*st.selfheal*dt); if(G.t - (u.hitT ?? -99) < 3) recHeal(own, u.card, u.hp - h0); }
  if(u.stun > 0) return;   // knocked flat: up in a moment
  if(u.kind==='support'){
    if(u.rt<=0){
      u.rt = .5; let best = 81, f = null;
      let fr = null, br = 81; for(const v of G.units){ if(v.owner!==own || v.hp<=0 || v===u || v.kind==='support' || !v.card) continue; const d=(v.x-u.x)**2+(v.y-u.y)**2; if(v.kind==='rider'){ if(d<br){ br=d; fr=v; } } else if(d<best){ best=d; f=v; } } if(!f || best > 36) f = f || fr;
      u.tgt = f ? f.id : 0;
      if(u.fol){ const h = unitById.get(u.fol); if(h && h.hp>0 && h.owner===own){ u.tgt = h.id; let wb = .75, wv = null; for(const v of G.units){ if(v.owner!==own || v.hp<=0 || !v.card || v===u || v.kind==='support' || (v.x-h.x)**2 + (v.y-h.y)**2 > 25) continue; const fr = v.hp/uStat(v).hp; if(fr < wb){ wb = fr; wv = v; } } if(wv) u.tgt = wv.id; } else u.fol = 0; }
    }
    const f = unitById.get(u.tgt);
    if(f && f.hp>0 && f.owner===own){ const d = Math.hypot(f.x-u.x, f.y-u.y); if(d > 1.1) step(f.x, f.y, d, 1); }
    else { u.ang += dt*.45; const gx=home.x+.5+Math.cos(u.ang)*B.orbit, gy=home.y+.5+Math.sin(u.ang)*B.orbit, d=Math.hypot(gx-u.x, gy-u.y); if(d>.05) step(gx, gy, d, .6); }
    supportMiracle(u, st, own);
    if(u.card==='banner' && !(u.puT > MT())){ const mt = MT(); let foe = false; for(const v of G.units){ if(v.hp > 0 && atWar(own, v.owner) && (v.x-u.x)**2 + (v.y-u.y)**2 < 25){ foe = true; break; } }
      u.puT = mt + (foe ? 4 : 1);
      if(foe){ const br = bannerR(own); for(const v of G.units){ if(v.owner!==own || v.hp<=0 || !v.card || (v.x-u.x)**2 + (v.y-u.y)**2 > br*br) continue; v.rallyT = mt + 2; v.stun = 0; v.pinT = 0; } if(onScr(u.x, u.y)){ ring(u.x, u.y, .2, br, '#ffd36a', .55); fxAdd({k:'shock', x:u.x, y:u.y+.05, s:br*.6, life:.4, max:.4, col:'rgba(255,211,106,.5)'}); } } }
    if(st.heal > 0){
      u.ht = (u.ht||0) - dt;
      if(u.ht <= 0){
        u.ht = .5; let healed = false; const r2 = st.auraR*st.auraR, hl = [];
        for(const v of G.units){
          if(v.owner!==own || v.hp<=0 || !v.card || (v.x-u.x)**2+(v.y-u.y)**2 > r2) continue;
          if(u.card==='priests'){ v.pinT = 0; v.stun = 0; v.slow = 0; }
          const mx = uStat(v).hp; if(v.hp >= mx) continue;
          const bm = CARDS[v.card].tags.includes('Swarm') && ownsCard(own,'priests'); if(bm) comboHit(own, 'masses', v.x, v.y);
          healBy(v, st.heal*.5*(bm ? 3 : 1), own, u.card); healed = true; hl.push([v.hp/mx, v]);
        }
        if(u.card==='priests' && hl.length && onScr(u.x, u.y)){ hl.sort((a,b) => a[0]-b[0]); for(const [, v] of hl.slice(0, 2)) fxAdd({k:'hbeam', x:u.x, y:u.y-.35, x1:v.x, y1:v.y-.2, life:.4, max:.4}); }
        if(healed){ burst(u.x, u.y-.4, 3, '#7ae08a'); if(onScr(u.x, u.y)) fxAdd({k:'plus', x:u.x+rnd(-.4,.4), y:u.y-.5, vx:0, vy:-.6, life:.8, max:.8}); SFX.q('chime', u.x, u.y, .7); }
      }
    }
    u.hp = Math.min(st.hp, u.hp + st.hp*.04*dt);
    return;
  }
  if(u.rout > 0 && !G.arena){ u.rout -= dt; u.tgt = 0; u.tcity = 0; u.fol = 0; const dr = Math.hypot(home.x+.5-u.x, home.y+.5-u.y); if(dr > 1.4) step(home.x+.5, home.y+.5, dr, 1.15); else u.rout = 0; return; }
  let fh = null;
  if(u.fol){ fh = unitById.get(u.fol); if(!fh || fh.hp<=0 || fh.owner!==own){ u.fol = 0; fh = null; } }
  const raiding = !fh && isRaider(u);
  if(!G.arena && !u.gar && !(u.fmT > G.t) && !CARDS[u.card].tags.includes('Swarm') && !(own===PLAYER && G.order==='fall')){
    if(u.wnd){ if(u.hp >= st.hp*.62 || G.t - u.wnd > 14) u.wnd = 0; }
    else if(u.hp < st.hp*.28 && G.t - (u.hitT ?? -99) < 2.5) u.wnd = G.t;
    if(u.wnd){
      u.tgt = 0; u.tcity = 0; u.eng = false;
      let rx, ry; if(fh){ const f = bandFront(fh); rx = fh.x - f.x*2.8; ry = fh.y - f.y*2.8; } else { rx = home.x+.5; ry = home.y+.5; }
      const d = Math.hypot(rx-u.x, ry-u.y); if(d > .35) step(rx, ry, d, 1.05);
      if(G.t - (u.hitT ?? -99) > 1.5) u.hp = Math.min(st.hp, u.hp + st.hp*.06*dt);
      return;
    }
  }
  if(fh && u.fmT > G.t && (fh.x-u.x)**2 + (fh.y-u.y)**2 > 36){ u.tgt = 0; u.tcity = 0; u.eng = false; u.rt = .35; }  // forced march: answer the banners first, fight later
  else if(fh){ if(u.rt<=0){ u.rt = .35;
    // once the band engages it stays in the fight until the enemy (or the soldier) is dead, then rejoins the general
    const cur = unitById.get(u.tgt);
    const ord = own===PLAYER ? (G.order||'charge') : 'charge';
    const acx = own===PLAYER && fh.tcity ? cityById.get(fh.tcity) : null;
    let t = ord==='fall' ? null : cur && cur.hp > 0 && atWar(own, cur.owner) && (cur.x-u.x)**2 + (cur.y-u.y)**2 < 81 && (ord!=='hold' || (cur.x-fh.x)**2 + (cur.y-fh.y)**2 < 16) && (!acx || (cur.x-acx.x-.5)**2 + (cur.y-acx.y-.5)**2 < 10.5 || (cur.x-u.x)**2 + (cur.y-u.y)**2 < 1.5) ? cur : null;
    if(!t) t = followerTarget(u, fh);
    if(!t && u.eng && ord==='charge' && !acx) t = nearFoe(u, 4.5);
    let tc = 0;
    if(!t){
      const cc = u.tcity && cityById.get(u.tcity);
      if(ord==='fall') tc = 0;
      else if(acx && !acx.dead && atWar(own, acx.owner)) tc = acx.id;
      else if(cc && !cc.dead && cc.owner!==own && atWar(own, cc.owner)) tc = cc.id;
      else if(fh.tcity) tc = fh.tcity;
      else if(own===PLAYER || u.kind==='siege'){ let bd = (u.kind==='siege' ? 6 : 4.5)**2; for(const c of G.cities){ if(c.dead || c.owner===own || !atWar(own, c.owner)) continue; const d = (c.x+.5-fh.x)**2 + (c.y+.5-fh.y)**2; if(d < bd){ bd = d; tc = c.id; } } }
    }
    if(tc && !t && (u.x-fh.x)**2 + (u.y-fh.y)**2 > 30) tc = 0;   // too far ahead or behind: form up on the general first
    u.tgt = t ? t.id : 0; u.tcity = tc; u.eng = !!(t || tc);
  } }
  else if(u.rt<=0 && G.arena){
    u.rt = .3; let best = 1e9, t = null;
    for(const v of G.units){ if(v.hp<=0 || v.owner===own) continue; const d = Math.hypot(v.x-u.x, v.y-u.y) - (v.card && CARDS[v.card].tags.includes('Line') ? 1.5 : 0); if(d < best){ best = d; t = v; } }
    u.tgt = t ? t.id : 0; u.tcity = 0;
  } else if(u.rt<=0){
    u.rt = .35; let best=1e9, t=null; const okm = navOk(own);
    const reach = u.kind==='siege' ? Math.max(1.4, st.rng+.3) : raiding ? 3 : 0;
    for(const v of G.units){
      if(v.hp<=0 || !atWar(own,v.owner) || !okm[G.own[tileAt(v.x, v.y)]]) continue;
      const ds = Math.hypot(v.x-u.x, v.y-u.y);
      const eff = roleScore(u, v, ds) - (v.card && CARDS[v.card].tags.includes('Line') ? 1.5 : 0);
      if(reach){ if(ds<reach && eff<best){ best=eff; t=v; } }
      else { const dh = Math.hypot(v.x-home.x-.5, v.y-home.y-.5), inB = own===PLAYER && !u.gar && dh < 11 && G.own[tileAt(v.x, v.y)]===own; if((dh<B.home || ds<Math.min(3.5,B.home) || inB) && eff<best){ best=eff; t=v; } }
    }
    u.tgt = t ? t.id : 0;
    u.tcity = (!t && raiding) ? (R.raidT.get(own) || 0) : 0;
  }
  if(u.card==='airships' && !(u.brT > MT())){ const mt = MT(); let v0 = null; for(const v of G.units){ if(v.hp > 0 && atWar(own, v.owner) && (v.x-u.x)**2 + (v.y-u.y)**2 < .7){ v0 = v; break; } }
    u.brT = mt + (v0 ? 1.4 : .3);
    if(v0){ const ff = ownsCard(own,'grenadiers'); queueBlast({x:v0.x, y:v0.y, at:mt+.4, wait:.4, rad:.75, dmg:st.dmg*.45, edge:.6, own, card:u.card, drop:true, fire:ff, ff}); moveFloat(u, 'Bombs away!'); } }
  let tgt = unitById.get(u.tgt); if(tgt && tgt.hp<=0) tgt = null;
  if(tgt){
    const d = Math.hypot(tgt.x-u.x, tgt.y-u.y);
    u.fx = tgt.x<u.x ? -1 : 1;
    { const mk = mvKey(u), mt = MT();
      // Hit and Run: wheel away after a blow, then ride back in at a gallop
      if(mk==='horse' && u.hrT > mt){ const ax = u.x - tgt.x, ay = u.y - tgt.y, L = Math.hypot(ax, ay) || 1, sx = -ay/L*.6, sy = ax/L*.6; step(u.x + ax/L*2 + sx, u.y + ay/L*2 + sy, 2, 1.25); return; }
      // skirmishers back away from melee between shots
      if(mk==='slingers' && d < 1.05 && u.cd > .15 && !isRangedU(tgt)){ const ax = u.x - tgt.x, ay = u.y - tgt.y, L = Math.hypot(ax, ay) || 1; step(u.x + ax/L, u.y + ay/L, 1, 1); return; }
      // Shields Up: call the nearest enemies onto the shields
      if(mk==='shieldwall' && d < st.rng + 1.6 && !(u.tauT > mt)){ u.tauT = mt + 6; let k = 0; for(const v of G.units){ if(k >= 5 || v.hp<=0 || v.hero || v.owner<=0 || !atWar(own, v.owner) || v.kind==='archer' || v.kind==='siege' || (v.x-u.x)**2 + (v.y-u.y)**2 > 3.6) continue; v.tgt = u.id; v.rt = 2.5; v.tauntT = mt + 3; v.tauntBy = u.id; k++; } if(k){ if(onScr(u.x, u.y)) ring(u.x, u.y, .2, 1.9, '#9fd0ff', .5); moveFloat(u); } }
    }
    if(CARDS[u.card].tags.some(g => ABIL[g] && ABIL[g].cd)) useAbilities(u, st, tgt, d, own);
    if(tgt.hp <= 0) return;
    if(u.kind==='siege' && d < 1 && !CARDS[u.card].tags.includes('Titan')){ step(u.x*2 - tgt.x, u.y*2 - tgt.y, 1, .8); return; }
    if(u.kind==='archer' && st.rng > 1.6 && d < .85 && u.cd > 0 && fh){ const f = bandFront(fh), bx = u.x - f.x*.9, by = u.y - f.y*.9; step(bx, by, .9, .9); return; }
    if(d > st.rng + tgt.r*.5) step(tgt.x, tgt.y, d, 1);
    else if(u.cd<=0){
      u.cd = st.cd*(u.frenzy > 0 ? .59 : 1); strike(u, tgt, st, own);
      const extra = (st.twin ? 1 : 0) + (st.rng > 1.2 ? st.shots : 0);
      if(extra){
        const b2 = (st.rng+.3)**2, cand = [];
        for(const v of G.units){ if(v===tgt || v.hp<=0 || !atWar(own,v.owner)) continue; const dd=(v.x-u.x)**2+(v.y-u.y)**2; if(dd<b2) cand.push([dd, v]); }
        cand.sort((a,b) => a[0]-b[0]);
        for(let i=0; i<Math.min(extra, cand.length); i++) strike(u, cand[i][1], st, own, (st.twin && i===0) ? 1 : .5);
      }
    }
    return;
  }
  if(u.tcity){
    const c = cityById.get(u.tcity);
    if(c && !c.dead && atWar(own,c.owner)){
      const d = Math.hypot(c.x+.5-u.x, c.y+.5-u.y);
      const reach = st.rng > 1.2 ? st.rng : .8, sp = R.raidS.get(own);
      const late = sp && sp.c===c.id && R.raidGo.get(own) && d > 8 && !(R.raidLate && R.raidLate.get(own)) && G.t - (u.stC===c.id ? u.stT : G.t) < 15;
      if(sp && sp.c===c.id && (!R.raidGo.get(own) || late) && d > 4.2 && !fh){ if((sp.x-u.x)**2 + (sp.y-u.y)**2 < 2 && u.stC !== c.id){ u.stT = G.t; u.stC = c.id; }
        const ds = Math.hypot(sp.x-u.x, sp.y-u.y);
        if(ds > 1.2) step(sp.x, sp.y, ds, 1); else { u.fx = c.x+.5<u.x ? -1 : 1; u.hp = Math.min(st.hp, u.hp + st.hp*.05*dt); }
      }
      else if(d > reach) step(c.x+.5, c.y+.5, d, 1);
      else if(u.cd<=0){
        u.cd = st.cd; damageCity(c, st.dmg*st.wall, own);
        const heavy = CARDS[u.card].tags.includes('Siege');
        { const sk0 = formOf(u.card, cardLevel(own, u.card)).sh; SFX.q(heavy ? (SHOT_SND[sk0] || 'boom') : st.rng > 1.2 ? (SHOT_SND[sk0] || 'twang') : 'thud', u.x, u.y, heavy ? 1 : .8); }
        if(R.projs.length < 400) R.projs.push({sk:formOf(u.card, cardLevel(own, u.card)).sh, x0:u.x, y0:u.y-.15, x1:c.x+.5, y1:c.y+.3, life:.25, max:.25, col:own===PLAYER?'#fff1cf':ocol(own), w:heavy?1.8:.7, kind:heavy?'ball':'arrow'});
        if(heavy){ burst(c.x+.5, c.y+.4, 5, '#ffb35c'); burst(c.x+.5, c.y+.3, 4, '#8a8580'); }
      }
      return;
    }
    u.tcity = 0;
  }
  if(fh){ const sl = bandSlot(u, fh), gx = sl.x, gy = sl.y, d = Math.hypot(gx-u.x, gy-u.y); if(d > .2) step(gx, gy, d, d > 2 ? 1.2 : .9); u.hp = Math.min(st.hp, u.hp + st.hp*.02*dt); return; }
  u.ang += dt*.45;
  const gx=home.x+.5+Math.cos(u.ang)*B.orbit, gy=home.y+.5+Math.sin(u.ang)*B.orbit, d=Math.hypot(gx-u.x, gy-u.y);
  if(d>.05) step(gx, gy, d, .6);
  u.hp = Math.min(st.hp, u.hp + st.hp*.08*dt);
}

function towerParams(o){
  if(o===PLAYER){
    const hasT = S.tower > 0;
    return {range: hasT ? 2.6+S.towerRange : 1.4, dmg:(hasT?7:2.5)*eraScale(G.eraIdx)*(1+S.towerDmg),
      rate:(hasT?1.1:.7)*(1+S.towerRate)*(G.doctrine==='defend'?1.35:1)*(G.buff.fortify>0?1.5:1), twin:S.twin>0, splash:S.splash>0, col: hasT?'#ffe3a3':'#cdbf9c', w: hasT?1.2:.8};
  }
  const e = rEra();
  return {range:2.3+.3*e, dmg:6*eraScale(e)*(1+.3*e)*(CR(6) ? 1.3 : 1), rate:(1+.15*e)*((rival(o).buff||{}).f > 0 ? 1.5 : 1), twin:e>=4, splash:e>=3, col:ocol(o), w:1};
}
function updateTowers(dt){
  const P = {};
  P[PLAYER] = towerParams(PLAYER);
  G.rivals.forEach(r => { if(r.alive) P[r.id] = towerParams(r.id); }); (G.holdR||[]).forEach(r => { if(r.hold) P[r.id] = towerParams(r.id); });
  for(const c of G.cities){
    c.cd -= dt; c.fl -= dt;
    if(c.cd > 0 || c.dead) continue;
    let tp = P[c.owner]; if(!tp) continue;
    const sh = c.owner===PLAYER && proto('shield') && isPart(c);
    if(c.owner===PLAYER && (proto('walls') || sh)) tp = Object.assign({}, tp, {dmg:tp.dmg*(proto('walls') ? 1.5 : 1), rate:tp.rate*(sh ? 2 : 1), range:tp.range + (sh ? 1.5 : 0)});
    if(c.capital && c.owner > 1 && !c.hold){ const cm = capMul(c.owner); if(cm > 1) tp = Object.assign({}, tp, {dmg:tp.dmg*(.6 + .4*cm)}); }
    const rr = tp.range + (c.hill ? .5 : 0), cx=c.x+.5, cy=c.y+.5, r2=rr*rr;
    let t1=null, t2=null, d1=r2, d2=r2;
    for(const u of G.units){
      if(u.hp<=0 || !atWar(c.owner,u.owner)) continue;
      const d=(u.x-cx)**2+(u.y-cy)**2;
      if(d<d1){ t2=t1; d2=d1; t1=u; d1=d; } else if(d<d2){ t2=u; d2=d; }
    }
    if(!t1){ c.cd = .15; continue; }
    c.cd = 1/tp.rate;
    fire(c,t1,tp); if(tp.twin && t2) fire(c,t2,tp);
  }
  for(const [i,tm] of R.towers){
    const o = G.own[i], tp = P[o]; if(!tp) continue;
    let cd = (R.tcd.get(i) || 0) - dt;
    if(cd > 0){ R.tcd.set(i, cd); continue; }
    const range = 2.3 + (o===PLAYER ? S.towerRange*.5 : 0), cx = i%N+.5, cy = ((i/N)|0)+.3;
    let t1 = null, d1 = range*range;
    for(const u of G.units){ if(u.hp<=0 || !atWar(o,u.owner)) continue; const d=(u.x-cx)**2+(u.y-cy)**2; if(d<d1){ d1=d; t1=u; } }
    if(!t1){ R.tcd.set(i, .2); continue; }
    R.tcd.set(i, 1/(tp.rate*.8));
    R.projs.push({x0:cx, y0:cy-.35, x1:t1.x, y1:t1.y-.1, life:.16, max:.16, col:tp.col, w:tp.w, kind:'arrow'});
    if(o===PLAYER) R.cc = 'tower'; hitUnit(t1, tp.dmg*tm, o, false); R.cc = null;
  }
}
function fire(c,u,tp){
  R.projs.push({x0:c.x+.5, y0:c.y+.1, x1:u.x, y1:u.y-.1, life:.16, max:.16, col:tp.col, w:tp.w, kind:'arrow'});
  if(c.owner===PLAYER) R.cc = 'tower'; hitUnit(u, tp.dmg*2.2, c.owner, tp.splash); R.cc = null;
  if(c.owner===PLAYER) SFX.shot(); else SFX.q('twang', c.x+.5, c.y+.5, .7);
}
