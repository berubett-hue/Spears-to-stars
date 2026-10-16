"use strict";
/* ---------- State ---------- */
let G = null, S = null, running = false, paused = false, modal = null, speed = 1;
const R = { syn:{}, rsyn:{}, pc:new Map(), pt:new Map(), nation:'horde', cb:new Map(), towers:[], tcd:new Map(), bnew:new Map(), corpses:[], fights:new Map(), bdirty:true, pbarracks:0, parts:[], projs:[], floats:[], flash:new Map(), shake:0, dirty:true, now:0, choices:[], event:null, openedAt:0, raidT:new Map(), raidS:new Map(), raidGo:new Map(), danger:new Map(), rings:[], fires:[], myTiles:0, warArm:null, dipFocus:0, lastLayers:-1, pal:{}, spr:{} };
const CAM = { x:N/2, y:N/2, z:20 };

function computeStats(){
  const s = {food:0,prod:0,sci:0,all:0,border:0,settler:0,cityhp:0,regen:0,towerDmg:0,towerRate:0,towerRange:0,tower:0,twin:0,splash:0,solCap:0,solDmg:0,solHp:0,solSpd:0,popCap:0,settleDist:0,choices:0,cities:0,barbSlow:0,coastal:0,mining:0,infl:0,tradeBoost:0,charm:0,guardHp:0,guardDmg:0,guardRegen:0,riderSpd:0,riderDmg:0,archerDmg:0,archerRng:0,archerTwin:0,siegeWall:0,siegeHp:0,siegeSpd:0,siegeDmg:0,upkeep:0};
  const add = e => { for(const k in e) s[k] = (s[k]||0) + e[k]; };
  G.evEffects.forEach(add);
  { s.food += .05*LG('harvest'); s.prod += .05*LG('industry'); s.sci += .05*LG('wisdom'); s.infl += .1*LG('renown'); s.cityhp += .1*LG('walls'); s.solDmg += .05*LG('might'); s.solHp += .05*LG('vigor'); s.solSpd += .05*LG('swift'); }
  if(G.perk==='merchant'){ s.infl += .3; s.tradeBoost += .5; } if(G.perk==='star') s.sci += .15; if(G.perk==='bastion') s.cityhp += .4;
  (G.relics||[]).forEach(r => { const e = RELICS[r.id] && RELICS[r.id].e; if(e) for(const k in e) s[k] = (s[k]||0) + e[k]*r.lvl; });
  s.cities += Math.floor((relicLv('frontier')+1)/2);
  { const ge = govEffects(); if(ge) add(ge); siteEffects(add); }
  const er = G.eraIdx||0;
  add({all:.1*er, popCap:2*er, cityhp:.3*er, towerDmg:.25*er, regen:.25*er, tower:1, mining:er>=1?1:0, coastal:er>=2?1:0});
  s.tiers = {guard:0, rider:0, archer:0, siege:0};
  G.techs.forEach(id => { const t = BYID[id]; if(t.line) s.tiers[t.line[0]] = Math.max(s.tiers[t.line[0]], t.line[1]); });
  return s;
}
function refreshStats(){
  const mine = G.cities.filter(c => c.owner===PLAYER);
  const ratios = mine.map(c => S ? c.hp/Math.max(1,cityMax(c)) : 1);
  G.eraIdx = Math.min(eraOfLevel(G.level||0), timeEra(G.t||0));
  S = computeStats();
  mine.forEach((c,i) => c.hp = clamp(ratios[i],0,1) * cityMax(c));
}
const eraScale = e => Math.pow(1.35, e);
const rEra = () => timeEra(G.t);
const ownerEra = o => o===PLAYER ? G.eraIdx : rEra();
const rival = id => G.rivals[id-2] || (G.holdR && G.holdR[id - 2 - G.rivals.length]);
const citiesOf = o => G.cities.filter(c => c.owner===o);
const capitalOf = o => G.cities.find(c => c.owner===o && c.capital) || G.cities.find(c => c.owner===o);
const unitCount = o => { let n=0; for(const u of G.units) if(u.owner===o && u.hp>0 && !u.hero && !u.merc) n++; return n; };
const sup0 = id => { const C = CARDS[id] || CARDS.militia; return Math.max(.7, Math.pow(C.up/2.2, .7)); };
const supOf = (id, o) => { const ev = cardEvo(o || PLAYER, id); return Math.round((sup0(id) + (ev && ev.union && ev.with ? sup0(ev.with) : 0))*10)/10; };
const rUp = (o, id) => { const ev = cardEvo(o, id); return CARDS[id].up + (ev && ev.union && ev.with ? CARDS[ev.with].up : 0); };
const armySup = o => { let n=0; for(const u of G.units) if(u.owner===o && u.hp>0 && !u.hero && !u.merc && u.card) n += supOf(u.card, o); return n; };
const ocol = o => o===PLAYER ? pcol() : o===0 ? '#e0473b' : rival(o).col;
/* a rival's capital is guarded by the rest of its realm: +30% health per other city it holds, up to ×3.5.
   Take the outer cities first and the capital weakens */
function capMul(o){ if(!G || G.arena || o <= 1) return 1; if(R.capMT !== G.t){ R.capMT = G.t; R.capM = {}; } let m = R.capM[o]; if(m == null){ let n = 0; for(const c of G.cities) if(c.owner===o && !c.dead) n++; m = R.capM[o] = Math.min(3.5, 1 + .3*Math.max(0, n-1)); } return m; }
const cityMax = c => cityMax0(c)*1.5*(c.fort||1)*(c.owner===PLAYER && G && G.perk==='golems' ? 1.5 : 1)*(c.owner > 1 && CR(6) ? 1.35 : 1)*(c.owner > 1 && c.capital ? 1.4*(c.hold ? 1 : capMul(c.owner)) : 1)*(G && G.proj && G.proj.proto && c.owner===PLAYER ? (proto('walls') ? 1.5 : 1)*(proto('bunkers') && isPart(c) ? 2 : 1) : 1);
const cityMax0 = c => { const m = R.cb.get(c.id); return (60 + 25*c.pop) * (c.owner===PLAYER ? 1.2*(1 + S.cityhp)*(G.coal ? 1.25 : 1)*(c.capital ? 1.5 : 1) : (1.25 + .5*rEra())*(G.coal ? 1.3 : 1)) * (c.hill ? 1.4 : 1) * (1 + (m ? (m.keep ? .2 : 0) + (m.castle ? .3 : 0) : 0)); };
const allyCount = () => G.rivals.filter(r => r.alive && r.status==='ally').length;
const tradeCount = () => G.rivals.filter(r => r.alive && (r.status==='trade' || r.status==='ally')).length;
const upkeepMul = () => Math.max(.35, 1 + S.upkeep - .2*allyCount() - .02*Math.min(15, R.pmil||0));
const unitUpkeep = id => { const C = CARDS[id] || CARDS.militia, sw = C.tags.includes('Swarm'); return C.up*formCost(cardLevel(PLAYER, id))*(1 + .1*G.eraIdx)*upkeepMul()*(sw && (R.syn||{}).Swarm >= 2 ? .6 : 1)*(sw && G.perk==='horde' ? .7 : 1)*(1 - .07*relicLv('quarter'))*(G.core===id ? ((G.perk==='colossus' || G.perk==='golems') ? .45 : .7) : 1); };
function armyUpkeep(){ let s = 0; for(const u of G.units) if(u.owner===PLAYER && u.hp>0 && u.card && !u.hero && !u.merc) s += unitUpkeep(u.card); return s; }
const soldierCost = id => { const C = CARDS[id] || CARDS.militia; return C.cost*formCost(cardLevel(PLAYER, id))*(1 + .3*G.eraIdx)*(C.tags.includes('Swarm') && (R.syn||{}).Swarm >= 2 ? .6 : 1)*(G.core===id ? ((G.perk==='colossus' || G.perk==='golems') ? .45 : .7) : 1); };
const settlerCost = () => 40 * Math.pow(citiesOf(PLAYER).length, 1.5) * Math.max(.4, 1 + S.settler);
const cityCap = () => 2 + G.eraIdx + S.cities;
const researchCost = () => levelCost(G.level||0);
function tileYield(i){
  const t = G.ter[i]; let f=YIELD[t][0], p=YIELD[t][1], s=YIELD[t][2];
  if(S.mining && (t===HILLS||t===MOUNT)) p += 1;
  if(S.coastal && t===WATER){ f += 1; s += 1; }
  const b = G.bmap[i];
  if(b===2) f += 1.5; else if(b===3) p += 1.5; else if(b===4) p += 1; else if(b===5){ f += 1; s += .5; }
  return [f,p,s];
}
const tileValue = i => { const y=tileYield(i); return y[0]*1.1 + y[1] + y[2]*1.2; };

/* Unit cards: you draft them into army slots, level them, and evolve them. Tags create synergies */
const slotOf = id => G.cards.find(c => c.id===id);
/* Era caps: a troop can be at most two ages ahead of you. Its Future form (Lv 8) needs the Modern era plus Astronomy 3 */
const lvlCap = o => { const e = ownerEra(o); if(o===PLAYER) return e >= 5 && relicLv('astronomy') >= 3 ? 8 : Math.min(7, e + 2); if(e >= 5 && CR(7)) return 8; return Math.min(7, e + (CR(7) ? 2 : 1)); };
const lvlFloor = o => Math.max(1, ownerEra(o));
function capNote(){ const e = G.eraIdx; if(e >= 5) return relicLv('astronomy') >= 3 ? '' : 'Future forms (Lv 8) need Astronomy 3'; return 'Reach the '+ERAS[e+1]+' era to unlock Lv '+(e+3); }
function streakKill(v){
  const now = R.now || 0, S = R.streak || (R.streak = {n:0, last:0, tier:0});
  if(now - S.last > 2.5){ S.n = 0; S.tier = 0; }
  S.n++; S.last = now; G.stats.best = Math.max(G.stats.best||0, S.n);
  const T = [[10,'Rout!'],[25,'Slaughter!'],[50,'Massacre!'],[100,'Annihilation!'],[200,'Apocalypse!']];
  const ti = T.filter(x => S.n >= x[0]).length;
  if(ti > S.tier){ S.tier = ti; S.pop = now; SFX.q && SFX.q('horn', v.x, v.y, .6 + ti*.15); }
  if(!R.melt) R.melt = []; R.melt.push([now, v.x, v.y]); while(R.melt.length && now - R.melt[0][0] > .5) R.melt.shift();
  if(R.melt.length >= 6 && now - (R.meltT||0) > .9){
    let mx = 0, my = 0, k = 0; for(const m of R.melt){ if((m[1]-v.x)**2 + (m[2]-v.y)**2 < 9){ mx += m[1]; my += m[2]; k++; } }
    if(k >= 6){ R.meltT = now; mx /= k; my /= k; ring(mx, my, .3, 2.6, '#ffb35c', .9); ring(mx, my, .1, 1.6, '#fff1cf', .7); burst(mx, my, 22, '#ff8a3d'); burst(mx, my-.3, 12, '#ffe9a0'); float('MELT ×'+k, mx, my-1, '#ffb35c', 1.2); R.melt = []; }
  }
}
function streakHud(){
  const el = document.getElementById('streak'); if(!el) return;
  const S = R.streak, now = R.now || 0, on = S && S.n >= 5 && now - S.last < 2.5;
  el.classList.toggle('on', !!on);
  if(on){ const T = ['', 'Rout!', 'Slaughter!', 'Massacre!', 'Annihilation!', 'Apocalypse!'];
    el.querySelector('b').textContent = '×'+S.n; el.querySelector('span').textContent = T[S.tier] || 'Streak';
    el.classList.toggle('pop', now - (S.pop||0) < .35); el.style.setProperty('--k', String(Math.min(1, (now - S.last)/2.5))); el.dataset.t = S.tier; }
  const kt = document.getElementById('killTot'); if(kt){ const k = (G.stats.kills||0) + (G.stats.nkills||0); kt.textContent = k ? '⚔ '+k.toLocaleString()+' slain' : ''; }
}
function ageUp(era){
  const cap = capitalOf(PLAYER), h = heroOf(PLAYER), o = cap ? {x:cap.x+.5, y:cap.y+.5} : h ? {x:h.x, y:h.y} : {x:CAM.x, y:CAM.y};
  R.ageFx = {x:o.x, y:o.y, t0:null, era, hit:new Set()}; R.slowmo = 1.6; R.whiteT = .55; R.shake = Math.min(8, (R.shake||0) + 4);
}
function ageFxDraw(x, now){
  const A = R.ageFx; if(!A) return; if(A.t0 == null){ if(modal) return; A.t0 = now; }
  const t = now - A.t0, rad = t*20, life = 2.4; if(t > life){ R.ageFx = null; return; }
  const a = 1 - t/life;
  x.globalAlpha = a*.9; x.strokeStyle = '#ffd36a'; x.lineWidth = .55; x.beginPath(); x.arc(A.x, A.y, rad, 0, 6.283); x.stroke();
  x.globalAlpha = a*.6; x.strokeStyle = '#fff6dc'; x.lineWidth = .18; x.beginPath(); x.arc(A.x, A.y, Math.max(.1, rad - .9), 0, 6.283); x.stroke();
  x.globalAlpha = a*.18; x.fillStyle = '#ffd36a'; x.beginPath(); x.arc(A.x, A.y, rad, 0, 6.283); x.arc(A.x, A.y, Math.max(.1, rad - 3), 0, 6.283, true); x.fill();
  x.globalAlpha = 1;
  let n = 0; const r2 = rad*rad;
  for(const u of G.units){
    if(u.owner!==PLAYER || u.hp<=0 || A.hit.has(u.id)) continue;
    if((u.x-A.x)**2 + (u.y-A.y)**2 > r2) continue;
    A.hit.add(u.id); if(n++ > 24) continue;
    ring(u.x, u.y, .1, u.hero ? 2 : 1, '#ffd36a', .8); burst(u.x, u.y-.35, u.hero ? 16 : 5, '#fff1cf');
  }
  for(const c of G.cities) if(c.owner===PLAYER && !A.hit.has('c'+c.id) && (c.x+.5-A.x)**2 + (c.y+.5-A.y)**2 <= r2){ A.hit.add('c'+c.id); ring(c.x+.5, c.y+.5, .3, 2.4, '#ffd36a', .9); burst(c.x+.5, c.y+.2, 14, '#ffe9a0'); }
}
function modernize(){
  const fl = lvlFloor(PLAYER), up = [];
  for(const sl of G.cards) if(sl.lvl < fl){ mxAdd(sl.id, 15*(fl - sl.lvl)); sl.lvl = fl; up.push(sl.id); G.units.forEach(u => { if(u.owner===PLAYER && u.card===sl.id) u.hp = uStat(u).hp; }); }
  if(up.length){ toast('Your army modernizes: '+up.map(id => formOf(id, fl).n).join(', '),'good'); R.modFx = up; R.armyKey = ''; }
}
const ABIL_LV = 4;
const unitAbil = u => G.arena ? G.arena.abil : cardLevel(u.owner, u.card) >= ABIL_LV;
const hasAbil = (o, g) => { if(!ABIL[g] || o<=0) return false; if(G.arena) return G.arena.abil; return ownerCards(o).some(id => CARDS[id].tags.includes(g) && cardLevel(o, id) >= ABIL_LV); };
const borderLvl = () => { let l = 0; while(l < CULT.length-1 && (G.culture||0) >= CULT[l+1]) l++; return l; };
const rBorderLvl = () => Math.min(7, Math.floor(G.t/120));
const tilesPerCity = l => 18 + 8*l;
const goneCount = () => G.rivals.filter(r => !r.alive).length;
const alarmStage = () => { if(G.coal) return 3; const g = goneCount() + (CR(10) ? 1 : 0); return g >= 4 ? 3 : g >= 3 ? 2 : g >= 2 ? 1 : 0; };
function rivalBoost(){
  const st = G.alarm || 0; let m = DF().rival*[1, 1.1, 1.2, 1.3][st] + (st===3 ? .1*Math.max(0, goneCount()-4) : 0);
  const live = G.rivals.filter(r => r.alive && r.prod), avg = live.length ? live.reduce((a,r) => a + r.prod, 0)/live.length : 0;
  if(avg > 0 && G.rates) m += clamp((G.rates.p/avg - 3)*.05, 0, .25);
  return m;
}
const tileCap = o => citiesOf(o).length * tilesPerCity(o===PLAYER ? borderLvl() : rBorderLvl());
const cardSlots = () => (G.demo || G.arena || !G.core) ? Math.min(LIST_MAX, 4 + (G.eraIdx >= 2 ? 1 : 0)) : Math.min(LIST_MAX, 1 + (G.freeSlots||0) + (G.eraIdx >= 1 ? 1 : 0) + (G.eraIdx >= 2 && !CR(8) ? 1 : 0));
const coreOf = n => (n && (n.core || n.start[0])) || null;
const isCore = id => !!G && !!G.core && id===G.core;
const lineCap = id => { if(!G || G.demo || G.arena || !G.core) return 8; if(id===G.core) return 8; const sl = slotOf(id), ev = sl && sl.evo && UEVO.find(e => e.id===sl.evo); return ev && ev.union ? 8 : 7; };
const LIST_MAX = 5;
const cardCap = id => Math.min(lvlCap(PLAYER), mCap(id), lineCap(id));
function armyListFor(nat){
  let saved = [], has = false; try { const raw = localStorage.getItem('eh-list'); if(raw){ saved = JSON.parse(raw); has = true; } } catch(e){}
  if(R.list){ saved = R.list; has = true; }
  const out = nat.start.filter(isUnlocked).slice();
  for(const id of saved) if(out.length < LIST_MAX && CARDS[id] && isUnlocked(id) && !out.includes(id)) out.push(id);
  if(!has) for(const id of Object.keys(CARDS).sort((a,b) => CARDS[a].era - CARDS[b].era)) if(out.length < LIST_MAX && isUnlocked(id) && !out.includes(id)) out.push(id);
  return out;
}
const relicSlots = () => 5 + (G.eraIdx >= 2 ? 1 : 0) + (G.eraIdx >= 3 ? 1 : 0) + (G.eraIdx >= 4 ? 1 : 0);
const relicLv = k => { const r = (G.relics||[]).find(x => x.id===k); return r ? r.lvl : 0; };
function evoStatus(sl){
  if(sl.evo){ const ev = UEVO.find(e => e.id===sl.evo); return {state:'done', ev, txt:'★ '+ev.n}; }
  const rd = evoReady(sl);
  if(rd) return {state:'ready', ev:rd, txt: known(rd) ? rd.n+' ready · slay a hero' : 'Something stirs… slay a hero'};
  const kn = knownEvos(sl.id);
  if(kn.length){
    const ev = kn.find(e => e.from===sl.id) || kn[0], L = evLv(ev), need = [];
    if(ev.from===sl.id){
      if(sl.lvl < L) need.push((L-sl.lvl)+' more level'+(L-sl.lvl > 1 ? 's' : ''));
      if(ev.union){ const pt = slotOf(ev.with); if(!pt) need.push(CARDS[ev.with].n); else if(pt.lvl < L) need.push(CARDS[ev.with].n+' Lv '+L); }
      else if(!relicLv(ev.relic)) need.push(RELICS[ev.relic].n+' civic');
      return {state:'path', ev, need, txt:ev.n+': '+need.join(' + ')};
    }
    const f = slotOf(ev.from); return {state:'path', ev, txt:ev.n+': with '+CARDS[ev.from].n+(f ? ' Lv '+f.lvl+'/'+L : '')};
  }
  if(hasHidden(sl.id)) return {state:'hidden', txt:'◆ ? Hidden evolution: find its recipe in ruins, warcamps or strongholds'};
  return {state:'none', txt:STYLE_N[lvStyle(CARDS[sl.id])]};
}
function evoReady(sl){
  if(sl.evo) return null;
  for(const ev of UEVO.filter(e => e.from===sl.id).sort((a,b) => (b.legend||0) - (a.legend||0))){
    const L = evLv(ev); if(sl.lvl < L || !evoUsable(ev) || (!ev.legend && !recipeOk(ev))) continue;
    if(ev.union){ const p = slotOf(ev.with); if(p && p.lvl >= L && !p.evo) return ev; }
    else if(relicLv(ev.relic) > 0) return ev;
  }
  return null;
}

function tagCount(ids){ const t = {}; ids.forEach(id => CARDS[id] && CARDS[id].tags.forEach(g => t[g] = (t[g]||0) + 1)); return t; }
function computeSyn(){ R.syn = tagCount(G.cards.map(c => c.id)); R.rsyn = {}; G.rivals.forEach(r => R.rsyn[r.id] = tagCount(r.cards||[])); (G.holdR||[]).forEach(r => R.rsyn[r.id] = tagCount(r.cards||[])); }
const ownerCards = o => o===PLAYER ? G.cards.map(c => c.id) : (rival(o).cards || []);
const ownsCard = (o, id) => ownerCards(o).includes(id);
function cardLevel(o, id){ if(o===PLAYER){ const s = slotOf(id); return s ? s.lvl : 1; } return Math.min(8, (rival(o).lv||{})[id] || 1); }
function cardEvo(o, id){ if(o!==PLAYER){ const rv = o>1 && rival(o), e = rv && rv.evo && rv.evo[id]; return e ? UEVO.find(x => x.id===e) : null; } const s = slotOf(id); return s && s.evo ? UEVO.find(e => e.id===s.evo) : null; }
const synOf = o => (o===PLAYER ? R.syn : R.rsyn[o]) || {};
const cardName = (o, id) => { const ev = cardEvo(o, id); return ev ? ev.n : formName(o, id); };
function squadSize(o, id){
  const C = CARDS[id], ev = cardEvo(o, id);
  return C.sq + lvBonus(C, cardLevel(o,id)).sq + ((o===PLAYER ? G.perk : o > 1 && rival(o) ? rival(o).people : '')==='khanate' && C.tags.includes('Mounted') ? 1 : 0) + (ev && ev.sq || 0);
}
const PACE = {mov:1.7, atk:1.6, hp:2.6};
function uStat(u){
  const s0 = uStat0(u);
  s0.hp *= PACE.hp; s0.spd *= PACE.mov; s0.cd /= PACE.atk;
  if(u.hero && u.owner===PLAYER && G && G.ren){ if(hasRen('hide')) s0.hp *= 1.25; if(hasRen('blade')) s0.dmg *= 1.25; if(hasRen('stride')) s0.spd *= 1.15; }
  if(u.hero){ s0.cleave = Math.max(s0.cleave||0, 2); if(u.enr){ s0.dmg *= 1.3; s0.cd *= .8; } if(u.owner > 1 && CR(5)){ s0.hp *= 1.4; s0.dmg *= 1.3; } }
  if(u.owner===PLAYER && G && !G.arena && SPERK[G.perk]) SPERK[G.perk](u, s0);
  if(u.owner===PLAYER && G && !G.arena && u.card===G.core && SBAL[G.perk] && !u.hero){ s0.dmg *= SBAL[G.perk]; s0.hp *= Math.sqrt(SBAL[G.perk]); }
  if(u.elite){ s0.hp *= 1.8; s0.dmg *= 1.5; }
  if(u.owner===PLAYER && G && G.focus && u.card===G.core && !u.hero){ s0.hp *= 1 + .15*G.focus; s0.dmg *= 1 + .15*G.focus; }
  if(u.owner > 1 && G && !G.arena && G.rivals){ const rv = G.rivals[u.owner-2]; const m = rv ? (rv.morale ?? 70) : 70; if(m < 40) s0.dmg *= m < 20 ? .75 : .87; if(G.siteN && G.siteN[u.owner]) s0.dmg *= siteDmg(u.owner); }
  return s0;
}
function uStat0(u){
  const C = CARDS[u.card] || CARDS.militia, o = u.owner, k = C.role, has = t => C.tags.includes(t);
  const HB = u.hero ? HEROES[u.hero] : null, lvl = HB ? (u.hlv||1) : cardLevel(o, u.card), ev = cardEvo(o, u.card), syn = synOf(o);
  const era = o===PLAYER ? G.eraIdx : rEra();
  const sc = Math.pow(1.3, era)*(1 + .08*era)*formMul(lvl), LB = lvBonus(C, lvl);
  let hp = (HB ? HB.bhp : C.hp)*sc*(1+LB.hp), dmg = (HB ? HB.bdmg : C.dmg)*sc*(1+LB.dmg), spd = C.spd, rng = C.rng + LB.rng, cd = C.cd*(1-LB.cd), abm = 1-LB.ab, wall = C.wall || (C.role==='titan' ? 1.1 : .6), splash = C.splash || 0, smul = C.smul || .5, heal = ((HB && HB.heal) || C.heal || 0)*sc*(1+LB.dmg), auraR = C.auraR || 0, rheal = 0;
  if(o===PLAYER && G.relics && G.relics.length){
    dmg *= 1 + .1*relicLv('forge'); heal *= 1 + .1*relicLv('forge'); hp *= 1 + .1*relicLv('drill'); spd *= 1 + .08*relicLv('roads');
    if(has('Ranged') || has('Siege')) rng += .2*relicLv('spyglass');
    abm *= 1 - .08*relicLv('college'); rheal = .006*relicLv('hall');
  }
  if(o===PLAYER){
    hp *= 1 + .1*G.eraIdx; dmg *= 1 + .1*G.eraIdx;
    if(!HB && !G.arena){ const mb = mBonus(u.card); hp *= mb; dmg *= mb; }
    hp *= 1 + S.solHp + (S[k+'Hp']||0); dmg *= 1 + S.solDmg + (S[k+'Dmg']||0); spd *= 1 + S.solSpd + (S[k+'Spd']||0); rng += S[k+'Rng'] || 0;
    if(has('Siege')) wall *= 1 + S.siegeWall + (S.siegeDmg||0);
    if(G.buff.rally > 0){ dmg *= 1.5; spd *= 1.15; }
  } else if(o>1 && rival(o).buff && rival(o).buff.m > 0){ dmg *= 1.5; spd *= 1.15; }
  { if(o===PLAYER && G.doctrine==='defend') dmg *= 1.2;
    const pk = o===PLAYER ? G.perk : (o > 1 && rival(o) ? rival(o).people : null);
    if(pk==='legion' && has('Line')) hp *= 1.2;
    if(pk==='steppe' && has('Mounted')){ spd *= 1.15; dmg *= 1.1; }
    if(pk==='elephant' && has('Titan')) dmg *= 1.2;
    if(pk==='longbow' && has('Ranged')) rng += .5;
    if(pk==='temple') heal *= 1.3;
  }
  if(o > 1 && rival(o) && rival(o).trait==='warlike') dmg *= 1.15;
  if(has('Line') && syn.Line >= 2) hp *= 1.3;
  if(has('Ranged') && syn.Ranged >= 2) dmg *= 1.25;
  if(has('Titan') && syn.Titan >= 2){ hp *= 1.4; smul *= 2; }
  if(has('Siege') && syn.Siege >= 2) wall *= 1.5;
  if(has('Fire') && syn.Fire >= 2) dmg *= 1.25;
  if(has('Mounted') && syn.Mounted >= 2) spd *= 1.1;
  if(has('Support') && syn.Support >= 2) auraR *= 1.5;
  if(ev){ hp *= ev.hp || 1; dmg *= ev.dmg || 1; rng += ev.rng || 0; splash *= ev.splashMul || 1; spd *= ev.spd || 1; auraR *= ev.auraMul || 1; heal *= ev.healMul || 1; if(ev.splash){ splash = Math.max(splash, ev.splash); smul = Math.max(smul, .5); } }
  const F = featOf(C, lvl); dmg *= 1 + F.dmgB; splash *= 1 + F.blast; smul += F.smul; spd *= 1 + F.gallop; auraR *= 1 + F.aura; heal *= 1 + (C.heal ? F.potent : 0);
  if(HB){ hp *= .75; dmg *= .8; spd *= HB.spd; if(o===PLAYER){ hp *= 1 + .1*LG('hero'); dmg *= 1 + .1*LG('hero'); } if(o===PLAYER && !G.arena && G.arts && G.arts.length){ if(hasArt('cuirass')) hp *= 1.4; if(hasArt('blade')) dmg *= 1.35; if(hasArt('boots')) spd *= 1.15; if(hasArt('compass')) spd *= 1.1; } rng += HB.rng || 0; if(HB.splash){ splash = Math.max(splash, HB.splash); smul = Math.max(smul, .5); } if(o!==PLAYER) hp *= DF().gen; if(HB.aura==='engineer') wall *= 2; if(HB.aura==='northmen' || HB.aura==='jarl') dmg *= 1 + Math.min(.8, .08*(u.rage||0)); if(u.berserk > 0) dmg *= 1.6; }
  else if(u.owner > 0 && !G.arena){ const A = heroAuras(u); cd *= A.cd; spd *= A.spd; dmg *= A.dmg; }
  return {hp, dmg, spd, rng, cd, abm, wall, splash, smul, heal, auraR,
    twin: !!(ev && ev.twin) || (o===PLAYER && has('Ranged') && S.archerTwin > 0),
    selfheal: ((ev && ev.selfheal) || (has('Holy') && syn.Holy >= 2 ? .03 : 0)) + rheal,
    arrowRes: (ev && ev.arrowRes) || 0,
    charge: has('Mounted') ? (syn.Mounted >= 2 ? 2.2 : 1.5) + F.chargeB : 1,
    shots:F.shots, thru:F.thru, burn:F.burn, trample:F.trample, lance:F.lance, riposte:F.riposte, crit:F.crit, cleave:F.cleave, potent:F.potent, rank:rankOf(lvl), evc:ev ? (ev.col||'#ffd36a') : null};
}
function attackMul(u, t){ const m0 = attackMul0(u, t); return (u.owner===PLAYER && G && G.perk==='shadows' && (t.hero || (t.owner===0 && BARB[t.kind] && BARB[t.kind].boss))) ? m0*1.4 : m0; }
function attackMul0(u, t){
  const C = CARDS[u.card]; if(!C) return 1;
  const tt = t.owner===0 ? (BTAGS[t.kind] || []) : ((CARDS[t.card] || {}).tags || []);
  const has = g => C.tags.includes(g), is = g => tt.includes(g);
  const pr = WEB[C.tags[0]]; if(pr && pr.some(is)) return CMUL;
  if(C.pierce && is('Titan')) return CMUL;
  if(C.tags[0]==='Ranged' && t.owner > 0 && (CARDS[t.card]||{}).fly) return CMUL;
  return 1;
}
function pickCard(o){
  const ids = ownerCards(o).filter(id => o===PLAYER || CARDS[id].era <= rEra());
  if(!ids.length) return 'militia';
  const war = warringAny(o) && !(o===PLAYER && G.doctrine==='defend');
  const cnt = {}; for(const u of G.units) if(u.owner===o && u.hp>0 && u.card) cnt[u.card] = (cnt[u.card]||0) + 1;
  let best = 1e9, pick = (o===PLAYER && G.core && ids.includes(G.core)) ? G.core : ids[0];
  for(const id of ids){
    const C = CARDS[id]; let w = squadSize(o, id);
    if(o===PLAYER && G.core && !G.arena){ if(id===G.core) w *= 2; else { const sl = slotOf(id); if((cnt[id]||0) >= squadSize(o, id)*(2 + (sl ? sl.lvl : 1))) continue; } }
    if(C.role==='siege' && !war) w *= .35;
    if(o===PLAYER){ if(G.doctrine==='defend' && (C.tags.includes('Line') || C.tags.includes('Ranged'))) w *= 1.5; if(G.doctrine==='expand' && C.tags.includes('Mounted')) w *= 1.5; }
    const ratio = (cnt[id]||0)/w;
    if(ratio < best){ best = ratio; pick = id; }
  }
  return pick;
}
function pickRivalCard(r, maxEra){
  const pref = TPREF[r.trait];
  let best = -1e9, b = null;
  for(const id in CARDS){
    const C = CARDS[id]; if(r.cards.includes(id) || C.era > maxEra || C.secret) continue;
    let sc = C.tags.filter(t => pref.includes(t)).length*2 + C.era*1.2 + Math.random()*2;
    if(DF().counter && G.cards){
      const pt = {}; let tot = 0; G.cards.forEach(sl => { const wv = sl.lvl*(sl.id===G.core ? 1 + .6*(G.focus||0) : 1); CARDS[sl.id].tags.forEach(t => { pt[t] = (pt[t]||0) + wv; tot += wv; }); });
      for(const t in pt){ const cs = COUNTERS[t] || []; sc += DF().counter*(pt[t]/Math.max(1,tot))*2*C.tags.filter(x => cs.includes(x)).length; if(t==='Titan' && C.pierce) sc += DF().counter*(pt[t]/Math.max(1,tot))*2; }
    }
    if(C.role==='support' && r.cards.some(x => CARDS[x].role==='support')) sc -= 3;
    if(sc > best){ best = sc; b = id; }
  }
  return b;
}
function rivalLegend(r){
  if(!r.legend){ const used = new Set(G.rivals.map(q => q.legend).filter(Boolean)); const pool = UEVO.filter(e => e.legend && !used.has(e.id)); const pick = pool.length ? pool[rint(pool.length)] : UEVO.filter(e => e.legend)[rint(6)]; r.legend = pick.id; }
  if(r.legendOn || G.diff===0) return;
  const re = rEra(); if(re < (CR(7) ? 4 : 5)) return;
  const ev = UEVO.find(e => e.id===r.legend); if(!ev) return;
  if(!r.cards.includes(ev.from)){ const weak = r.cards.slice().sort((a,b) => (r.lv[a]||1) - (r.lv[b]||1))[0]; const i = r.cards.indexOf(weak); if(i >= 0) r.cards[i] = ev.from; else r.cards.push(ev.from); r.lv[ev.from] = Math.max(r.lv[ev.from]||1, r.lv[weak]||1); }
  r.lv[ev.from] = Math.max(r.lv[ev.from]||1, 7); r.evo = r.evo || {}; r.evo[ev.from] = ev.id; r.legendOn = true; R.rsyn[r.id] = tagCount(r.cards);
  seeEvo(ev);
  if(G.demo || G.arena) return;
  const known0 = META.leg.has(ev.id);
  if(!G.legShown && !known0){ G.legShown = 1; let img = ''; try { img = artURL('evp_'+ev.id+'_'+pcol(), () => evoPortrait(ev)); } catch(e){}
    bigMoment({tier:'epic', kick:'⚜ A legendary union takes the field ⚜', title:ev.n, sub:'The '+r.name+' field it. Conquer them, or win them over by union, to learn it for every game. One legend per game', col:ev.col || '#ffd36a', img}); }
  else banner(ev.n, r.name+' unveils a legend');
  toast(r.name+' fields the '+ev.n+'!'+(known0 ? '' : ' Conquer them or win their union to learn it for good'),'bad');
}
/* a legend is learned only from a nation that actually fielded it, and only one per game */
function learnLegend(r){
  const ev = r && UEVO.find(e => e.id===r.legend); if(!ev || META.leg.has(ev.id) || G.demo || G.arena) return;
  if(!r.legendOn) return;
  if(G.legGot){ toast('The '+r.name+' guarded the '+ev.n+', but you have already seized a legend this game. Defeat them in another game to learn it','warn'); return; }
  G.legGot = ev.id;
  META.leg.add(ev.id); saveDisc(); discover(ev, 'Legend seized from '+r.name);
  toast('You can now forge the '+ev.n+': '+evoRecipe(ev)+', in this game and every game after','good');
}
function rivalPick(r){
  rivalLegend(r);
  const re = rEra(), cap = lvlCap(r.id), slots = 4 + (re>=2 ? 1 : 0) + (re>=4 ? 1 : 0);
  r.lv = r.lv || {};
  for(const id of r.cards) if((r.lv[id]||1) < Math.max(1, re)) r.lv[id] = Math.max(1, re);
  const lv = r.cards.filter(id => (r.lv[id]||1) < cap);
  if(r.cards.length < slots && (r.cards.length < 3 || !lv.length || Math.random() < .35)){
    const add = pickRivalCard(r, re);
    if(add){ r.cards.push(add); r.lv[add] = Math.max(1, re); R.rsyn[r.id] = tagCount(r.cards); return; }
  }
  if(lv.length){ lv.sort((a,b) => (r.lv[b]||1) - (r.lv[a]||1)); const id = Math.random() < .55 ? lv[0] : lv[rint(lv.length)]; r.lv[id] = (r.lv[id]||1) + 1;
    if(r.lv[id] >= EVO_LV && re >= (CR(7) ? 3 : 4) && G.diff!==0){ const ev = UEVO.find(e => e.from===id && !e.union); if(ev){ r.evo = r.evo || {}; if(!r.evo[id]){ r.evo[id] = ev.id; toast(r.name+' fields '+ev.n+(known(ev) ? '' : '. A new entry fills in your Collection'),'warn'); seeEvo(ev); } } } }
}
function armyText(o){
  const cnt = {};
  for(const u of G.units) if(u.owner===o && u.hp>0 && u.card) cnt[u.card] = (cnt[u.card]||0) + 1;
  const parts = Object.keys(cnt).map(id => cnt[id]+' '+cardName(o, id));
  return parts.length ? parts.join(', ') : 'No army';
}

function atWar(a,b){
  if(a===b) return false;
  if(a===0 || b===0) return true;
  if(a===PLAYER) return rival(b).status==='war';
  if(b===PLAYER) return rival(a).status==='war';
  const lo=Math.min(a,b), hi=Math.max(a,b);
  return G.rwars.some(w => w.a===lo && w.b===hi);
}
function warringAny(o){
  if(o===PLAYER) return G.rivals.some(r => r.alive && r.status==='war');
  return rival(o).status==='war' || G.rwars.some(w => w.a===o || w.b===o);
}

function newGame(demo){
  R.tlog = []; R.tq = []; R.tcur = null; R.joy = null; R.tipCur = null; R.tipLast = -99;
  const seed = (Math.random()*2147483647)|0;
  const ter = genTerrain(seed);
  G = {v:2, seed, ter, own:new Array(N*N).fill(0), bmap:new Array(N*N).fill(0), t:0, cities:[], units:[], rivals:[], rwars:[], techs:[], boons:[], evEffects:[],
    picks:0, level:0, eraPicks:0, dmg:{}, adm:{}, cards:[], musterT:15, musterQ:0, musters:0, culture:0, bLvl:0, armyCap:0, alarm:0, coal:false, perk:'horde', natName:'', settle:null, sci:0, settler:0, army:0, influence:20, borderAcc:0, econAcc:0, raidAcc:0, rwarCheck:60,
    doctrine:'expand', flag:null, cd:{mobilize:0,golden:0,fortify:0}, buff:{rally:0,golden:0,fortify:0},
    nextWave:40, warn:null, waveBoost:1, nextEvent:150, bosses:{}, recentEvents:[], offers:[], gate:0,
    stats:{kills:0,founded:0,peak:0,lost:0,captured:0,warlords:0,nkills:0}, relics:[], chestQ:[], chestsOpened:0, nid:1, ended:false, endless:false, won:false, conquest:false,
    rates:{f:0,p:0,s:0,i:0}, eraIdx:0, names:shuffle(NAMES.slice()), pois:[], arts:[], seen:null, bless:null, rerolls:3, banishes:3, banned:[], demo:!!demo};
  G.rerolls += LG('fortune'); G.banishes += LG('exile'); G.influence += 40*LG('treasury');
  S = null; refreshStats();
  /* seven random, spread-out starts: nobody is guaranteed the middle */
  const taken = [];
  for(let k=0; k<7; k++){
    let s0 = null;
    for(const gap of [28, 24, 19, 14, 10]){ for(let t=0; t<160 && !s0; t++){ s0 = siteNear(ter, rint(N-16)+8, rint(N-16)+8, 5, taken, gap); } if(s0) break; }
    taken.push(s0 || {x:clamp(8+rint(N-16),3,N-4), y:clamp(8+rint(N-16),3,N-4)});
  }
  shuffle(taken);
  const home = taken[0];
  const nat = demo ? NATIONS_P[rint(NATIONS_P.length)] : (NATIONS_P.find(n => n.id===R.nation && natOK(n)) || NATIONS_P[0]);
  G.cards = nat.start.map(id => ({id, lvl:(!demo && questAll(nat.id)) ? 2 : 1, evo:null})); G.list = demo ? Object.keys(CARDS) : null; if(!demo){ lifeAdd('games'); saveLife(); } G.perk = nat.id; G.natName = nat.n; G.core = demo ? null : coreOf(nat); G.freeSlots = demo ? 0 : Math.max(0, nat.start.length - 1); G.focus = 0; G.focusPct = 0; G.pcol = PEOPLE[nat.id].col; G.diff = demo ? 1 : (R.diff===0 ? 0 : 1); G.crown = (demo || !G.diff) ? 0 : Math.max(0, Math.min(META.crown||0, R.crown||0)); G.questGlory = 0; G.tk = {}; G.sharp = [];
  G.relics = (nat.relics||[]).map(([id,lvl]) => ({id, lvl})); G.stats.maxCards = G.cards.length; R.syn = {}; R.rsyn = {};
  computeSyn();
  const cap = foundCity(home.x, home.y, PLAYER, true);
  for(const id of nat.start) for(let k=0;k<Math.min(3, CARDS[id].sq) + (nat.secret && CARDS[id].sq===1 ? 1 : 0);k++) spawnUnit(PLAYER, cap, id);
  const others = shuffle(NATIONS_P.filter(n => n.id !== nat.id && (!n.secret || natOK(n)))).slice(0, 6);
  let mystery = null;
  if(false && !demo){ /* masked rivals are replaced by hidden strongholds */ const hid = NATIONS_P.filter(n => n.secret && !natOK(n)); if(hid.length){ mystery = hid[rint(hid.length)]; others[others.length-1] = mystery; } }
  const spare = shuffle(UEVO.filter(e => e.legend && !others.some(n => PEOPLE[n.id].legend===e.id)).map(e => e.id));
  others.forEach((pn, k) => {
    const s = taken[k+1], P = PEOPLE[pn.id], T = TRAITS[P.trait];
    const r = {id:k+2, name:pn.n, people:pn.id, heroKey:pn.id, leader:P.leader, trait:P.trait, col:P.col, rel:T.base+rnd(-8,8), status:'peace', alive:true,
      weary:0, think:rnd(6,12), settler:0, army:0, borderAcc:0, border:0, gifts:0, lost:0, peaceT:-999, peaceTry:-999, offeredPeace:-999,
      proj:null, projAt:{scholarly:1320+rnd(0,150), mercantile:1500+rnd(0,200), warlike:1700+rnd(0,300)}[P.trait] - (CR(9) ? 180 : 0), allyT:0, morale:CR(3) ? 85 : 70};
    r.legend = P.legend || spare.pop() || 'thunder';
    if(mystery && pn.id===mystery.id){ r.mystery = pn.id; r.name = '???'; r.leader = 'A masked ruler'; }
    G.rivals.push(r);
    r.cards = pn.start.slice(); r.lv = {}; r.cards.forEach(id => r.lv[id] = 1); r.lastEra = 0;
    if(r.cards.length < 2){ const id = pickRivalCard(r, 0); if(id){ r.cards.push(id); r.lv[id] = 1; } }
    const c = foundCity(s.x, s.y, r.id, true);
    computeSyn();
    spawnUnit(r.id, c, r.cards[0]); spawnUnit(r.id, c, r.cards[1] || r.cards[0]);
  });
  if(CR(1)) for(const r of G.rivals){ const s2 = findSite(r.id); if(s2){ const c2 = foundCity(s2.x, s2.y, r.id, false); if(c2) spawnUnit(r.id, c2, r.cards[0]); } }
  fogInit(); reveal(home.x+.5, home.y+.5, 10); placePois(); placeHolds(); placeSites(); hordeInit(); R.resKey = '';
  if(!demo) progSnap();
  R.cb=new Map(); R.towers=[]; R.tcd=new Map(); R.bnew=new Map(); R.corpses=[]; R.fights=new Map(); R.bdirty=true; R.heroArts=null; R.wmul=null;
  R.parts=[]; R.projs=[]; R.floats=[]; R.conqQ = null; R.gPrev = {}; R.gInit = false; R.gDone = []; R.gDot = null; R.uiTintC = null; R.flash.clear(); R.shake=0; R.dirty=true; R.raidT.clear(); R.raidS.clear(); R.raidGo.clear(); R.danger.clear(); R.rings=[]; R.fires=[]; R.warArm=null; R.lastLayers=-1;
  speed = 1; paused = false; modal = null;
  setupVisuals();
  syncDoctrine();
  fogTick();
}

function foundCity(x,y,owner,isCap){
  const name = G.names.pop() || ('Colony ' + G.nid);
  const c = {id:G.nid++, name, x, y, owner, pop:isCap?2:1, food:0, hp:0, cd:0, fl:0, capital:!!isCap, born:G.t, hill:G.ter[idx(x,y)]===HILLS};
  c.hp = cityMax(c);
  G.cities.push(c);
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
    if(!inb(x+dx,y+dy)) continue; const i=idx(x+dx,y+dy);
    if(!G.own[i]){ G.own[i]=owner; if(owner===PLAYER) R.flash.set(i,G.t); }
  }
  G.own[idx(x,y)] = owner; G.bmap[idx(x,y)] = 0; R.bdirty = true;
  if(owner===PLAYER){ G.stats.founded++; if(!isCap && !G.arena) lifeAdd('founded'); }
  R.dirty = true;
  if(owner===PLAYER && !isCap){ float(name+' founded', x+.5, y-.4, '#ffd98a', 1.6); SFX.found(); }
  return c;
}

function spawnUnit(owner, c, card){
  if(!c) return;
  card = card || pickCard(owner);
  const C = CARDS[card] || CARDS.militia;
  const u = {id:G.nid++, owner, card, kind:C.role, x:c.x+.5+rnd(-.3,.3), y:c.y+.5+rnd(-.3,.3), hp:0, r:.17*C.size+.03, cd:0, fl:0, tgt:0, tcity:0, rt:0, home:c.id, ang:Math.random()*6.283, fx:1, mv:0};
  u.hp = uStat(u).hp;
  G.units.push(u);
  return u;
}
function spawnBarb(type,x,y,mul){
  mul = mul || 1;
  const B = BARB[type], th = 1 + G.t/80 + Math.pow(G.t/215,2), dth = 1 + G.t/240;
  const dsc = (G.decline && !G.decline.done) ? (G.declScale||1) : 1;
  const hp = B.hp*th*mul*PACE.hp*dsc;
  G.units.push({id:G.nid++, owner:0, kind:type, x, y, hp, max:hp, dmg:B.dmg*dth*(B.boss?mul*.6+.4:1)*(1 + (dsc-1)*.8), spd:B.spd*rnd(.9,1.1)*PACE.mov, r:B.r, cd:rnd(0,.6), tc:0, rt:0, raze:0, fl:0, fx:1});
}

/* a city with 3+ hostile troops at its gates is besieged and cannot raise troops */
function besieged(c){ let n = 0; for(const u of G.units){ if(u.hp<=0 || u.owner===c.owner || !(u.owner===0 || atWar(c.owner, u.owner))) continue; if(Math.abs(u.x-c.x-.5) < 3 && Math.abs(u.y-c.y-.5) < 3 && ++n >= 3) return true; } return false; }
function musterCity(o){
  const t = threatCity(o); if(!t) return null;
  if(!besieged(t)) return t;
  let best = null, bd = 1e9; for(const c of citiesOf(o)){ if(c === t || c.dead || besieged(c)) continue; const d = Math.hypot(c.x-t.x, c.y-t.y); if(d < bd){ bd = d; best = c; } }
  if(!best && o===PLAYER) return capitalOf(o) || t;
  return best;
}
function threatCity(o){
  const mine = citiesOf(o);
  let best=1e9, bc=null;
  for(const c of mine) for(const u of G.units){
    if(u.hp<=0 || !atWar(o,u.owner)) continue;
    const d=Math.hypot(u.x-c.x-.5,u.y-c.y-.5); if(d<best){ best=d; bc=c; }
  }
  if(bc && best<10) return bc;
  const counts = new Map(); G.units.forEach(u => { if(u.owner===o) counts.set(u.home,(counts.get(u.home)||0)+1); });
  let few=1e9; for(const c of mine){ const n=counts.get(c.id)||0; if(n<few){ few=n; bc=c; } }
  return bc || capitalOf(o);
}
function nearCity(x,y){ for(const c of G.cities) if(Math.abs(c.x-x)<=1 && Math.abs(c.y-y)<=1) return true; return false; }
function ownedCount(o){ let n=0; for(let i=0;i<G.own.length;i++) if(G.own[i]===o) n++; return n; }
