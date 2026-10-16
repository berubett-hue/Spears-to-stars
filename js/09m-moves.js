"use strict";
/* ---------- Troop moves: every line fights its own way from Lv 1 ----------
   Each line has one move you can see from across the field. Rivals use the same moves. The hooks live in
   strike() and nationStep() in 09-combat.js; this file holds the data, the shared helpers, the delayed
   blasts (bombs and siege shells) and the combo tracker. */
const MOVES = {
  militia:   {n:'Pile On', d:'Every other Warband hitting the same enemy adds +8% damage, up to +40%', col:'#ff7a5a'},
  spearmen:  {n:'Set Spears', d:'Riders that strike them are thrown back, stunned, and take 40% of the blow back', col:'#ffd98a'},
  shieldwall:{n:'Shields Up', d:'Blocks 1 in 3 arrows and shots outright, and every 6s taunts nearby enemies to attack it', col:'#9fd0ff'},
  slingers:  {n:'Pin Down', d:'Stones pin enemies, slowing them 35% for 1.5s. They back away from melee between shots', col:'#d8d0c0'},
  longbow:   {n:'Arrow Rain', d:'Arrows come down as a rain that also hits enemies around the target for 20%', col:'#e8c890'},
  crossbow:  {n:'Punch Through', d:'Every bolt goes on through to the enemy behind for 60%, and hits Titans, generals and Warlords 30% harder', col:'#bff6ff'},
  grenadiers:{n:'Lit Fuse', d:'Bombs hit, fizz for a moment, then blast everything nearby, knock it back and leave it burning', col:'#ff9a4a'},
  horse:     {n:'Hit and Run', d:'Strike, wheel away, then ride back in at a gallop so every pass is a charge', col:'#f0e0b0'},
  knights:   {n:'Shock Charge', d:'A charge scatters the enemy, throwing back everything around the target. Then they reform for a moment before the next', col:'#ffe9a0'},
  elephant:  {n:'Fling', d:'Every blow throws small troops through the air, stunning them where they land', col:'#e0c8a0'},
  catapult:  {n:'Bombardment', d:'A red circle marks where each shot will fall. A second later it lands harder, in a wider blast', col:'#ff6a5a'},
  airships:  {n:'Bombing Run', d:'Drops a bomb on any enemy it drifts over, on top of its own attack', col:'#b8f08a'},
  priests:   {n:'Mending Light', d:'Beams of light mend the wounded and lift pins, stuns and slows', col:'#8ae89a'},
  banner:    {n:'Rally Pulse', d:'Every 4s in battle the banner pulses: allies inside move 20% faster and shake off stuns and pins', col:'#ffd36a'},
  wolves:    {n:'Pack Hunt', d:'Every other wolf on the same prey adds +8% damage, up to +40%', col:'#bfe0ff'},
  firemonks: {n:'Kindle', d:'Their blows set the ground alight under the enemy', col:'#ffb35c'},
  golems:    {n:'Fling', d:'Every blow throws small troops through the air, stunning them where they land', col:'#d8c098'},
  skylancers:{n:'Shock Charge', d:'A charge scatters the enemy, throwing back everything around the target', col:'#fff1cf'},
  shadows:   {n:'Ambush', d:'The first shot at each enemy strikes from the dark for extra damage', col:'#c8a8ff'},
  colossus:  {n:'Fling', d:'Every blow throws small troops through the air, stunning them where they land', col:'#9fe8ff'}
};
/* which mechanic a line uses (secret lines borrow one) */
const MOVE_OF = {wolves:'militia', golems:'elephant', colossus:'elephant', skylancers:'knights'};
const mvKey = u => (!u || u.hero || !u.card) ? null : (MOVE_OF[u.card] || u.card);
/* a clock that also runs in the Proving Grounds */
const MT = () => (G && G.arena && typeof AR !== 'undefined') ? AR.t : (G ? G.t : 0);
const isTitanish = v => !!(v.hero || (v.owner===0 && BARB[v.kind] && BARB[v.kind].boss) || (v.card && CARDS[v.card] && CARDS[v.card].tags.includes('Titan')));
const isMountedU = u => !!(u.card && CARDS[u.card] && CARDS[u.card].tags.includes('Mounted'));
const moveLine = id => MOVES[id] ? '<span class="abil on mvl" style="--mc:'+MOVES[id].col+'">✦ '+MOVES[id].n+' · '+MOVES[id].d+'</span>' : '';
const showFor = own => own===PLAYER || (G && G.arena) || Math.random() < .35;

/* a short word over the fight, at most every 2.5s per line and side */
function moveFloat(u, text, x, y){
  const k = u.owner+':'+u.card, now = R.now||0; if(!R.mvT) R.mvT = {};
  if((R.mvT[k]||0) > now || !onScr(x ?? u.x, y ?? u.y) || !showFor(u.owner)) return;
  R.mvT[k] = now + 2.5;
  const M = MOVES[u.card] || {}; float(text || M.n+'!', x ?? u.x, (y ?? u.y) - .9, M.col || '#fff1cf', 1.1);
}
/* push a unit away from a point; it hops through the air and lands (purely its position changes) */
function knock(v, fx, fy, dist, stun, hop){
  if(!v || v.hp <= 0 || v.hero || (v.owner===0 && BARB[v.kind] && BARB[v.kind].boss)) return;
  const dx = v.x - fx, dy = v.y - fy, L = Math.hypot(dx, dy) || 1;
  let nx = clamp(v.x + dx/L*dist, .5, N-.5), ny = clamp(v.y + dy/L*dist, .5, N-.5);
  if(!G.arena && G.ter){ const ti = idx(clamp(Math.floor(nx),0,N-1), clamp(Math.floor(ny),0,N-1)); if(G.ter[ti]===WATER){ nx = v.x; ny = v.y; } }
  v.airS = {x:v.x, y:v.y}; v.air = v.airM = hop || .3; v.airH = Math.min(.9, dist*.6);
  v.x = nx; v.y = ny;
  if(stun) v.stun = Math.max(v.stun||0, stun);
}
/* ---- delayed blasts: bomber fuses, siege shells, airship bombs ---- */
function queueBlast(o){ if(!R.bombs) R.bombs = []; if(R.bombs.length < 120) R.bombs.push(o); }
function bombTick(){
  if(!R.bombs || !R.bombs.length) return;
  const now = MT(), keep = [];
  for(const b of R.bombs){
    if(now < b.at){ keep.push(b); continue; }
    R.cc = b.card; R.ca = null;
    let n = 0;
    for(const v of G.units){
      if(v.hp<=0 || v.inv > 0 || !atWar(b.own, v.owner)) continue;
      const d2 = (v.x-b.x)**2 + (v.y-b.y)**2; if(d2 > b.rad*b.rad) continue;
      let dmg = d2 < .2 ? b.dmg : b.dmg*(b.edge ?? .6);
      if(b.kg && nearTag(b.own, 'Line', v.x, v.y, 1.3)){ dmg *= 1.5; comboHit(b.own, 'kground', v.x, v.y); }
      if(v.brace > 0) dmg *= .4;
      const h0 = v.hp; v.hp -= dmg; v.fl = .08; v.hitT = G.t; recDmg(b.own, Math.min(h0, dmg), v.hp<=0);
      if(v.hp<=0) killUnit(v, b.own);
      else { if(b.knock) knock(v, b.x, b.y, b.knock, .35, .25); if(b.burn) v.burnT = MT() + 3; }
      n++;
    }
    if(b.fire){ if(!R.fires) R.fires = []; if(R.fires.length < 40) R.fires.push({x:b.x, y:b.y, r:Math.max(.6, b.rad*.7), life:3, max:3, dps:b.dmg*.18, own:b.own, card:b.card}); if(b.ff) comboHit(b.own, 'firestorm', b.x, b.y); }
    R.cc = null;
    if(onScr(b.x, b.y)){ fxImpact(b.x, b.y, b.big ? 'shell' : 'bomb', b.big ? 1.3 : .9); ring(b.x, b.y, .15, b.rad, b.col || '#ffcf7a', .35); }
  }
  R.bombs = keep;
}
function drawBlasts(x, vis){
  if(!R.bombs || !R.bombs.length) return;
  const now = MT(), t = R.now||0;
  for(const b of R.bombs){
    if(vis && !vis(b.x, b.y, 2)) continue;
    const left = b.at - now, p = clamp(1 - left/(b.wait||1), 0, 1);
    if(b.warn){   // siege: a red target ring that closes in
      x.globalAlpha = .25 + .45*p; x.strokeStyle = '#ff4a3a'; x.lineWidth = .07;
      x.beginPath(); x.ellipse(b.x, b.y, b.rad, b.rad*.5, 0, 0, 6.283); x.stroke();
      x.globalAlpha = .12 + .2*p; x.fillStyle = '#ff4a3a'; x.beginPath(); x.ellipse(b.x, b.y, b.rad*(1-p*.85), b.rad*.5*(1-p*.85), 0, 0, 6.283); x.fill();
      x.globalAlpha = .8; x.strokeStyle = '#ffd0c8'; x.lineWidth = .04; x.beginPath(); x.moveTo(b.x-.2, b.y); x.lineTo(b.x+.2, b.y); x.moveTo(b.x, b.y-.1); x.lineTo(b.x, b.y+.1); x.stroke();
    } else if(b.fuse){   // bomber: a bomb on the ground with a fizzing fuse
      x.globalAlpha = 1; x.fillStyle = '#1e1a16'; x.beginPath(); x.arc(b.x, b.y-.08, .1, 0, 6.283); x.fill();
      x.strokeStyle = '#8a6a3a'; x.lineWidth = .03; x.beginPath(); x.moveTo(b.x+.05, b.y-.16); x.lineTo(b.x+.1, b.y-.24); x.stroke();
      const fl = Math.sin(t*40) > 0; x.fillStyle = fl ? '#ffd36a' : '#ff7a2a'; x.beginPath(); x.arc(b.x+.11, b.y-.26, fl ? .05 : .035, 0, 6.283); x.fill();
      x.globalAlpha = .18 + .25*p; x.strokeStyle = '#ffb35c'; x.lineWidth = .04; x.beginPath(); x.ellipse(b.x, b.y, b.rad, b.rad*.5, 0, 0, 6.283); x.stroke();
    } else if(b.drop){   // airship bomb falling
      const hh = (1-p)*1.6; x.globalAlpha = .3 + .4*p; x.fillStyle = '#000'; x.beginPath(); x.ellipse(b.x, b.y, .1, .04, 0, 0, 6.283); x.fill();
      x.globalAlpha = 1; x.fillStyle = '#2a2622'; x.beginPath(); x.ellipse(b.x, b.y - hh, .07, .1, 0, 0, 6.283); x.fill();
    }
  }
  x.globalAlpha = 1;
}
/* little status marks under and over troops: pinned, stunned, burning */
function drawStatus(x, u, h){
  const now = MT(), t = R.now||0;
  if(u.pinT > now){ x.globalAlpha = .75; x.fillStyle = '#d8d0c0'; for(let k=0;k<3;k++){ const a = t*2 + k*2.09; x.fillRect(u.x + Math.cos(a)*.28 - .03, u.y + .25 + Math.sin(a)*.1 - .03, .06, .06); } }
  if(u.stun > 0){ x.globalAlpha = .95; x.fillStyle = '#ffe680'; for(let k=0;k<3;k++){ const a = t*6 + k*2.09; x.fillRect(u.x + Math.cos(a)*.22 - .035, u.y + .3 - h - .12 + Math.sin(a)*.07 - .035, .07, .07); } }
  if(u.burnT > now){ x.globalAlpha = .55 + .3*Math.sin(t*20 + u.id); x.fillStyle = '#ff7a2a'; x.fillRect(u.x - .1, u.y + .1, .08, .14); x.fillStyle = '#ffd36a'; x.fillRect(u.x + .03, u.y + .14, .06, .1); }
  if(u.tauntT > now && u.tauntBy){ x.globalAlpha = .6; x.strokeStyle = '#9fd0ff'; x.lineWidth = .04; x.beginPath(); x.arc(u.x, u.y - h + .05, .09, 0, 6.283); x.stroke(); }
  x.globalAlpha = 1;
}

/* ---------- Combos: pairs of lines that set each other up ---------- */
function comboHit(own, id, x, y){
  if(own!==PLAYER && !(G && G.arena)) return;
  const C = COMBOS.find(c => c.id===id); if(!C) return;
  if(!G.arena){
    G.cmb = G.cmb || {}; const first = !G.cmb[id]; G.cmb[id] = (G.cmb[id]||0) + 1;
    META.cmb = META.cmb || {}; const ever = !META.cmb[id]; META.cmb[id] = (META.cmb[id]||0) + 1; lifeDirty = true;
    if(first && !G.demo){
      if(ever){ bigMoment({tier:'epic', kick:'✦ Combo discovered ✦', title:C.n, sub:C.d, col:'#ffd36a'}); MUS.sting && MUS.sting('quest'); }
      else toast('Combo: '+C.n+'. '+C.d, 'good', {x, y});
    }
  }
  const k = 'c:'+id, now = R.now||0; if(!R.mvT) R.mvT = {};
  if((R.mvT[k]||0) > now || !onScr(x, y)) return;
  R.mvT[k] = now + 1.8;
  float('✦ '+C.n, x, y - 1.1, '#ffd36a', 1.3);
}
