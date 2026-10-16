"use strict";
/* ---------- Heroes: every people has one. You steer yours; rivals' heroes follow the same rules ---------- */
const HEROES = {
  horde:{n:'The Great Chief', line:'militia', bhp:330, bdmg:20, spd:1.15, aura:'warcry', act:'War Cry', ad:'Every ally within 4 tiles attacks 70% faster for 6s', cd:22, sig:'Allies near him attack 35% faster'},
  legion:{n:'The Legate', line:'spearmen', bhp:400, bdmg:18, spd:1, aura:'legate', act:'Testudo', ad:'Allies within 3.5 tiles brace and take 60% less damage for 5s', cd:22, sig:'Allies near him take 30% less damage'},
  steppe:{n:'The Khan', line:'horse', bhp:290, bdmg:19, spd:1.5, aura:'khan', act:'Raid', ad:'He and his band move 80% faster and attack faster for 6s', cd:20, sig:'Fastest hero. Allies near him move 25% faster'},
  elephant:{n:'The Maharaja', line:'elephant', bhp:650, bdmg:30, spd:1, splash:1.3, aura:'maharaja', act:'Earthquake', ad:'Slams everything within 3 tiles for triple damage and slows it', cd:24, sig:'Toughest body. Stomps crowds. Allies near him deal 15% more damage'},
  longbow:{n:'The Ranger', line:'longbow', bhp:230, bdmg:22, spd:1.15, rng:1.5, aura:'ranger', act:'Rain of Arrows', ad:'Shoots up to 12 enemies within 5 tiles at once', cd:18, sig:'Longest bow. Marks his targets: they take 25% more damage from everyone'},
  temple:{n:'The Oracle', line:'priests', bhp:330, bdmg:0, heal:30, spd:1.05, aura:'oracle', act:'Miracle', ad:'Heals every ally within 5 tiles by 60%', cd:24, sig:'Weak fighter. Everyone near her heals 3% health every second'},
  khanate:{n:'The Golden Khan', line:'knights', bhp:360, bdmg:24, spd:1.2, aura:'goldkhan', act:'Golden Charge', ad:'Charges through the enemy line for quadruple damage, slowing everyone hit', cd:20, sig:'His charges hit twice as hard and slow their targets'},
  merchant:{n:'The Doge', line:'crossbow', bhp:250, bdmg:16, spd:1.05, aura:'doge', act:'Hire Mercenaries', ad:'Spends 50 influence to hire 4 troops who join his band', cd:30, sig:'Kills near him pay influence. Can hire mercenaries straight into his band'},
  star:{n:'The Grand Engineer', line:'catapult', bhp:240, bdmg:26, spd:.95, rng:2, aura:'engineer', act:'Barrage', ad:'Rains 6 shells on the biggest enemy crowd in range', cd:22, sig:'Longest range. Double damage to walls. Repairs cities he stands in'},
  bastion:{n:'The Warden', line:'shieldwall', bhp:650, bdmg:10, spd:.95, aura:'warden', act:'Bastion', ad:'Takes no damage for 5s and draws every enemy within 5 tiles', cd:24, sig:'Huge health. Enemies near him attack him first'},
  northmen:{n:'The Jarl', line:'militia', bhp:320, bdmg:22, spd:1.15, aura:'jarl', act:'Berserk', ad:'+60% damage, heavy lifesteal and +30% speed for 8s', cd:22, sig:'Heals 30% of the damage he deals. +8% damage for every follower lost'},
  wolves:{n:'The Pack Lord', line:'wolves', bhp:300, bdmg:20, spd:1.45, aura:'khan', act:'The Hunt', ad:'He and his band move 80% faster and attack faster for 6s', cd:20, sig:'Allies near him move 25% faster'},
  firemonks:{n:'The Abbess of Ash', line:'firemonks', bhp:300, bdmg:14, heal:20, spd:1.05, aura:'oracle', act:'Purifying Flame', ad:'Heals every ally within 5 tiles by 60%', cd:24, sig:'Everyone near her heals 3% health every second'},
  golems:{n:'The Stonewright', line:'golems', bhp:700, bdmg:24, spd:.85, splash:1.2, aura:'maharaja', act:'Rockslide', ad:'Slams everything within 3 tiles for triple damage and slows it', cd:24, sig:'Stone body. Allies near him deal 15% more damage'},
  skylancers:{n:'The Wing Marshal', line:'skylancers', bhp:340, bdmg:24, spd:1.35, aura:'goldkhan', act:'Sky Charge', ad:'Charges through the enemy line for quadruple damage, slowing everyone hit', cd:20, sig:'Her charges hit twice as hard and slow their targets'},
  shadows:{n:'The Veiled Queen', line:'shadows', bhp:240, bdmg:24, spd:1.2, rng:1.5, aura:'ranger', act:'Night Volley', ad:'Shoots up to 12 enemies within 5 tiles at once', cd:18, sig:'Marks her targets: they take 25% more damage from everyone'},
  colossus:{n:'The Iron Prophet', line:'colossus', bhp:720, bdmg:28, spd:.85, rng:1.2, aura:'warden', act:'Iron Bulwark', ad:'Takes no damage for 5s and draws every enemy within 5 tiles', cd:24, sig:'Huge health. Enemies near him attack him first'}
};
/* ---------- The peoples of the world: each has its own color, temperament, leader and guarded legend ---------- */
const PEOPLE = {
  horde:{col:'#e8823a', trait:'warlike', leader:'Khagan Urda'},
  legion:{col:'#b03050', trait:'warlike', leader:'Consul Varro', legend:'thunder'},
  steppe:{col:'#6fb7f0', trait:'warlike', leader:'Khan Temir', legend:'skyriders'},
  elephant:{col:'#a07ae0', trait:'mercantile', leader:'Maharaja Devan', legend:'colossus'},
  longbow:{col:'#4fb860', trait:'mercantile', leader:'Queen Ysolde', legend:'phantom'},
  temple:{col:'#ece8dc', trait:'scholarly', leader:'High Priestess Oren', legend:'angels'},
  khanate:{col:'#e9b949', trait:'warlike', leader:'Golden Khan Batu', legend:'paladins'},
  merchant:{col:'#2fb8a8', trait:'mercantile', leader:'Doge Marin'},
  star:{col:'#5868e8', trait:'scholarly', leader:'Archon Pell'},
  bastion:{col:'#98a4b0', trait:'scholarly', leader:'Warden Elsabet'},
  northmen:{col:'#e070b8', trait:'warlike', leader:'Jarl Hakon'},
  wolves:{col:'#8a6a48', trait:'warlike', leader:'Pack Lord Varg'},
  firemonks:{col:'#ff5a3c', trait:'scholarly', leader:'Abbess Cinder'},
  golems:{col:'#c0a070', trait:'scholarly', leader:'Stonewright Orm'},
  skylancers:{col:'#80e0ff', trait:'warlike', leader:'Wing Marshal Aeryn'},
  shadows:{col:'#6a4a9a', trait:'mercantile', leader:'The Veiled Queen'},
  colossus:{col:'#d0d040', trait:'scholarly', leader:'The Iron Prophet'}
};
let SHAKE_LV = 1; try { const v = localStorage.getItem('eh-shake'); if(v != null) SHAKE_LV = +v; } catch(e){}
const shakeMul = () => [0, .45, 1][SHAKE_LV] ?? .45;
const ERA_T = [0, 180, 330, 480, 630, 780];
const timeEra = t => { let e = 0; while(e < 5 && t >= ERA_T[e+1]) e++; return e; };
function eraNote(){ const e = G.eraIdx; if(e >= 5) return ''; const lv = ERA_LV[e+1], tt = ERA_T[e+1], needL = Math.max(0, lv - (G.level||0)), needT = Math.max(0, tt - G.t);
  return 'The '+ERAS[e+1]+' Age dawns '+(needL ? 'at level '+lv+(needT > 0 ? ', and not before '+fmt(tt) : '') : needT > 0 ? 'at '+fmt(tt) : 'any moment'); }
const pcol = () => (G && G.pcol) || '#e9b949';
/* ---------- Borders: a nation's land is closed to everyone it is not at war or allied with ---------- */
const NAV_INF = 32767;
const isAlly = (a,b) => (a===PLAYER && b>1 && rival(b) && rival(b).status==='ally') || (b===PLAYER && a>1 && rival(a) && rival(a).status==='ally') || (!!G.coal && a>1 && b>1 && !!rival(a) && !!rival(b) && rival(a).status==='war' && rival(b).status==='war');
function navOk(o){
  if(!R.navOk || R.navOkV !== R.navV){ R.navOk = {}; R.navOkV = R.navV; }
  let m = R.navOk[o]; if(m) return m;
  m = new Uint8Array(16); m[0] = 1;
  for(let w=1; w<16; w++){ if(w===o) m[w] = 1; else if(w===PLAYER || (w>1 && rival(w))) m[w] = (atWar(o,w) || isAlly(o,w)) ? 1 : 0; else m[w] = 1; }
  return R.navOk[o] = m;
}
function navSig(){ return (G.coal ? 'C' : '')+G.rivals.map(r => r.status[0]).join('')+'|'+G.rwars.map(w => w.a+'-'+w.b).join(','); }
function navTick(){ const s = navSig(); if(s !== R.navSigS){ R.navSigS = s; R.navV = (R.navV||0) + 1; R.nav = new Map(); } }
const tileAt = (x, y) => idx(clamp(Math.floor(x),0,N-1), clamp(Math.floor(y),0,N-1));
function lineClear(ok, x0, y0, x1, y1){
  const d = Math.hypot(x1-x0, y1-y0), n = Math.ceil(d/.5);
  for(let k=1; k<=n; k++){ const t = k/n; if(!ok[G.own[tileAt(x0+(x1-x0)*t, y0+(y1-y0)*t)]]) return false; }
  return true;
}
function navField(o, ti, extra){
  if(!R.nav) R.nav = new Map();
  const k = o+':'+ti+(extra ? ':'+extra : ''); const f = R.nav.get(k);
  if(f && G.t - f.t < 4) return f.d;
  let ok = navOk(o); if(extra){ ok = ok.slice(); ok[extra] = 1; }
  const d = new Int16Array(N*N).fill(NAV_INF), q = R.navQ || (R.navQ = new Int32Array(N*N));
  let h = 0, tl = 0; d[ti] = 0; q[tl++] = ti;
  while(h < tl){
    const i = q[h++], x = i % N, y = (i / N) | 0, nd = d[i] + 1;
    if(x > 0){ const j = i-1; if(d[j]===NAV_INF && ok[G.own[j]]){ d[j] = nd; q[tl++] = j; } }
    if(x < N-1){ const j = i+1; if(d[j]===NAV_INF && ok[G.own[j]]){ d[j] = nd; q[tl++] = j; } }
    if(y > 0){ const j = i-N; if(d[j]===NAV_INF && ok[G.own[j]]){ d[j] = nd; q[tl++] = j; } }
    if(y < N-1){ const j = i+N; if(d[j]===NAV_INF && ok[G.own[j]]){ d[j] = nd; q[tl++] = j; } }
  }
  if(R.nav.size > 90) R.nav.clear();
  R.nav.set(k, {d, t:G.t});
  return d;
}
/* the next point a unit of owner o should walk to on its way to (tx,ty), or null to walk straight */
function navPoint(u, o, tx, ty){
  if(o <= 0 || G.arena) return null;
  const ok = navOk(o), ci = tileAt(u.x, u.y);
  if(!ok[G.own[ci]]){
    const cx = Math.floor(u.x), cy = Math.floor(u.y); let best = null, bd = 1e9;
    for(let r=1; r<=8 && !best; r++) for(let dy=-r; dy<=r; dy++) for(let dx=-r; dx<=r; dx++){ if(Math.max(Math.abs(dx),Math.abs(dy)) !== r) continue; const x = cx+dx, y = cy+dy; if(x<0||y<0||x>=N||y>=N) continue; if(!ok[G.own[idx(x,y)]]) continue; const dd = dx*dx+dy*dy + ((x+.5-tx)**2+(y+.5-ty)**2)*.02; if(dd < bd){ bd = dd; best = {x:x+.5, y:y+.5}; } }
    return best;
  }
  const dd = Math.hypot(tx-u.x, ty-u.y);
  if(dd < 1.1) return null;
  const nv = u.nv;
  if(nv && G.t - nv.t < .6 && Math.abs(nv.tx-tx) + Math.abs(nv.ty-ty) < .8){ if(nv.direct) return null; }
  else { const direct = lineClear(ok, u.x, u.y, tx, ty); u.nv = {t:G.t, tx, ty, direct}; if(direct) return null; }
  const f = navField(o, tileAt(tx, ty)), cd = f[ci];
  if(cd === NAV_INF){ u.noPath = G.t; return {x:u.x, y:u.y}; }
  const cx = ci % N, cy = (ci / N) | 0; let best = ci, bv = cd;
  for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++){
    if(!dx && !dy) continue; const x = cx+dx, y = cy+dy; if(x<0||y<0||x>=N||y>=N) continue;
    const j = idx(x,y); let v = f[j]; if(v === NAV_INF) continue;
    if(dx && dy){ if(f[idx(cx+dx,cy)]===NAV_INF || f[idx(cx,cy+dy)]===NAV_INF) continue; v -= .4; }
    if(v < bv){ bv = v; best = j; }
  }
  if(best === ci) return null;
  return {x:(best % N)+.5, y:((best / N)|0)+.5};
}
/* can a reach b's cities if they went to war? */
function reachWar(a, b){
  const ca = capitalOf(a); if(!ca) return false;
  const f = navField(a, idx(ca.x, ca.y), b);
  return citiesOf(b).some(c => f[idx(c.x, c.y)] !== NAV_INF);
}
/* path distance from one of o's cities to city c, and a staging point about 5 tiles short of it */
function raidPlan(o, c){
  const f = navField(o, idx(c.x, c.y));
  let hc = null, hd = NAV_INF;
  for(const m of citiesOf(o)){ const v = f[idx(m.x, m.y)]; if(v < hd){ hd = v; hc = m; } }
  if(!hc) return null;
  let i = idx(hc.x, hc.y), guard = 0;
  while(f[i] > 5 && guard++ < 400){
    const x = i % N, y = (i/N)|0; let b = i;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const xx = x+dx, yy = y+dy; if(xx<0||yy<0||xx>=N||yy>=N) continue; const j = idx(xx,yy); if(f[j] < f[b]) b = j; }
    if(b === i) break; i = b;
  }
  return {dist:hd, sx:(i % N)+.5, sy:((i/N)|0)+.5};
}

const HERO_RESPAWN = 60;
const heroOf = o => { if(!G) return null; const id = o===PLAYER ? (G.hero||{}).id : ((rival(o)||{}).hero||{}).id; if(!id) return null; const u = G.units.find(v => v.id===id); return u && u.hp > 0 ? u : null; };
const heroLv = (o, key) => { const H = HEROES[key]; return clamp(Math.max(cardLevel(o, H.line), lvlFloor(o) + 1), 1, lvlCap(o)); };
const folCap = o => 999;
function rivalHeroKey(r){
  if(r.heroKey && HEROES[r.heroKey]) return r.heroKey;
  const used = new Set(G.rivals.filter(q => q !== r && q.heroKey).map(q => q.heroKey));
  const cands = Object.keys(HEROES).filter(k => (r.cards||[]).includes(HEROES[k].line) && !used.has(k));
  if(cands.length) return r.heroKey = cands.sort((a,b) => ((r.lv||{})[HEROES[b].line]||1) - ((r.lv||{})[HEROES[a].line]||1))[0];
  const free = Object.keys(HEROES).filter(k => !used.has(k) && k !== G.perk && !(secretPeople(k) && !natOK(secretPeople(k))));
  if(free.length) return r.heroKey = free[rint(free.length)];
  let best = null, bl = -1;
  for(const k in HEROES){ const H = HEROES[k]; if(!(r.cards||[]).includes(H.line)) continue; if(H.line==='militia' && k !== (r.trait==='warlike' ? 'northmen' : 'horde')) continue; const l = (r.lv||{})[H.line] || 1; if(l > bl){ bl = l; best = k; } }
  return best || ({warlike:'steppe', mercantile:'merchant', scholarly:'temple'})[r.trait] || 'legion';
}
function spawnHero(o){
  const cap = capitalOf(o); if(!cap) return null;
  const key = o===PLAYER ? (HEROES[G.perk] ? G.perk : 'legion') : rivalHeroKey(rival(o)), H = HEROES[key];
  const u = spawnUnit(o, cap, H.line); if(!u) return null;
  u.hero = key; u.hlv = heroLv(o, key); u.r = .42; u.acd = 6; u.rage = 0;
  u.name = o===PLAYER ? (REG(9) ? H.n.replace(/^The /, 'The Imperial ') : H.n) : GEN_NAMES[rint(GEN_NAMES.length)]+' '+H.n.replace(/^The /, 'the ');
  u.hp = uStat(u).hp;
  if(o===PLAYER){ G.hero = {id:u.id, key, t:0}; }
  else { const r = rival(o); r.hero = {id:u.id, key, t:0}; }
  return u;
}
function heroTick(dt){
  if(G.arena) return;
  if(!G.hero) G.hero = {id:0, key:G.perk, t:3};
  if(!heroOf(PLAYER) && G.t >= G.hero.t && capitalOf(PLAYER)){ const u = spawnHero(PLAYER); if(u && G.t > 5){ toast(u.name+' returns to the capital','good',{x:u.x, y:u.y}); } }
  for(const r of G.rivals){
    if(!r.alive) continue;
    if(!r.hero) r.hero = {id:0, t:30 + rnd(0, 40)};
    if(!heroOf(r.id) && G.t >= r.hero.t){ const u = spawnHero(r.id); if(u && atWar(PLAYER, r.id)) toast(r.name+' sends '+u.name+' into the field','warn',{x:u.x, y:u.y}); }
  }
}
/* aura effects a hero gives nearby allies */
function heroAuras(u){
  const out = {cd:1, spd:1, dmg:1, def:1};
  if(!R.heroes || !R.heroes.length || u.hero) return out;
  for(const h of R.heroes){
    if(h.owner!==u.owner || h.hp<=0) continue;
    if(u.fol===h.id && h.owner===PLAYER){ if(hasArt('sunbanner')) out.dmg *= 1.15; if(hasArt('drum')) out.cd *= .85; if(hasArt('standard')) out.def *= .85; if(hasArt('boots')) out.spd *= 1.15; if(G.bless && G.bless.k==='war') out.dmg *= 1.3; }
    const d2 = (h.x-u.x)**2+(h.y-u.y)**2; if(d2 > 9) continue;
    const a = HEROES[h.hero].aura;
    if(a==='warcry') out.cd *= .74; else if(a==='khan') out.spd *= 1.25; else if(a==='maharaja') out.dmg *= 1.15; else if(a==='legate') out.def *= .7;
    if(h.raid > 0 && u.fol===h.id){ out.spd *= 1.8; out.cd *= .75; }
    if(u.fol===h.id && h.owner===PLAYER && proto('rally')) out.dmg *= 1.2;
    if(u.fol===h.id && h.owner===PLAYER){ const o = G.order||'charge'; if(o==='charge'){ out.dmg *= 1.15; out.spd *= 1.15; out.def *= 1.1; } else if(o==='hold'){ out.def *= .72; } else { out.def *= .6; out.spd *= 1.35; out.dmg *= .6; } }
  }
  return out;
}
function heroActive(u){
  if(!u || u.hp<=0 || (u.acd||0) > 0) return false;
  const H = HEROES[u.hero], own = u.owner, st = uStat(u);
  const allies = r => G.units.filter(v => v.owner===own && v.hp>0 && v.card && (v.x-u.x)**2+(v.y-u.y)**2 < r*r);
  const foes = r => G.units.filter(v => v.hp>0 && atWar(own, v.owner) && (v.x-u.x)**2+(v.y-u.y)**2 < r*r);
  const a = H.aura;
  if(a==='warcry'){ allies(4).forEach(v => { if(!v.ab) v.ab = {}; v.frenzy = 6; }); ring(u.x, u.y, .2, 4, '#ff7a5a', .7); }
  else if(a==='legate'){ allies(3.5).forEach(v => v.brace = 5); ring(u.x, u.y, .2, 3.5, '#d8e4f0', .7); }
  else if(a==='khan'){ u.raid = 6; ring(u.x, u.y, .2, 2.5, '#ffe9a0', .6); }
  else if(a==='maharaja'){ foes(3).forEach(v => { v.slow = 3; hitUnit(v, st.dmg*3, own, false); }); ring(u.x, u.y, .3, 3, '#c8a878', .7); burst(u.x, u.y, 18, '#a08868'); R.shake = Math.min(6, (R.shake||0) + 3); }
  else if(a==='ranger'){ const fs = foes(5).slice(0, 12); if(!fs.length) return false; fs.forEach(v => { R.projs.push({sk:formOf(u.card, u.hlv||1).sh || 'arrow', x0:u.x, y0:u.y-.2, x1:v.x, y1:v.y-.1, life:.3, max:.3, col:'#fff1cf', w:1, kind:'arrow'}); hitUnit(v, st.dmg*1.5, own, false); v.mark = 5; }); }
  else if(a==='oracle'){ allies(5).forEach(v => { const mx = uStat(v).hp; v.hp = Math.min(mx, v.hp + mx*.6); }); ring(u.x, u.y, .3, 5, '#7ae08a', .8); burst(u.x, u.y-.4, 14, '#7ae08a'); }
  else if(a==='goldkhan'){
    const t = foes(5).sort((p,q) => ((p.x-u.x)**2+(p.y-u.y)**2) - ((q.x-u.x)**2+(q.y-u.y)**2))[0]; if(!t) return false;
    const d = Math.hypot(t.x-u.x, t.y-u.y) || 1, dx = (t.x-u.x)/d, dy = (t.y-u.y)/d, len = Math.min(d+1.5, 4.5), sx = u.x, sy = u.y, ex = clamp(u.x+dx*len, .5, N-.5), ey = clamp(u.y+dy*len, .5, N-.5), L = Math.hypot(ex-sx, ey-sy) || 1;
    for(const v of G.units){ if(v.hp<=0 || !atWar(own, v.owner)) continue; const k = clamp(((v.x-sx)*(ex-sx)+(v.y-sy)*(ey-sy))/(L*L), 0, 1); if((v.x-sx-(ex-sx)*k)**2+(v.y-sy-(ey-sy)*k)**2 < .5){ hitUnit(v, st.dmg*4, own, false); v.slow = 2.5; } }
    for(let k=0;k<7;k++) burst(sx+(ex-sx)*k/6, sy+(ey-sy)*k/6, 3, '#ffd36a');
    u.lastCharge = {mx:(sx+ex)/2, my:(sy+ey)/2, ang:Math.atan2(ey-sy, ex-sx)};
    u.x = ex; u.y = ey;
  }
  else if(a==='doge'){
    if(own===PLAYER){ if(G.influence < 50){ if(own===PLAYER) toast('Hiring mercenaries needs 50 influence','warn'); return false; } G.influence -= 50; }
    const cap = capitalOf(own), ids = ownerCards(own).filter(id => CARDS[id].role!=='support'); if(!ids.length) return false;
    for(let k=0;k<4;k++){ const m = spawnUnit(own, {x:u.x-.5, y:u.y-.5, id:cap ? cap.id : 0}, ids[rint(ids.length)]); if(m){ m.home = cap ? cap.id : 0; m.fol = u.id; } }
    ring(u.x, u.y, .2, 2, '#ffd36a', .6); burst(u.x, u.y-.3, 10, '#ffd36a');
  }
  else if(a==='engineer'){
    const fs = foes(st.rng + 1); if(!fs.length) return false;
    let best = fs[0], bn = 0; for(const v of fs){ let n = 0; for(const w of fs) if((w.x-v.x)**2+(w.y-v.y)**2 < 2.25) n++; if(n > bn){ bn = n; best = v; } }
    R.barrage = R.barrage || []; for(let k=0;k<6;k++) R.barrage.push({x:best.x+rnd(-1,1), y:best.y+rnd(-1,1), t:k*.3, own, dmg:st.dmg*1.6, ux:u.x, uy:u.y, card:u.card, lv:u.hlv});
  }
  else if(a==='warden'){ u.inv = 5; ring(u.x, u.y, .2, 5, '#d8e4f0', .8); }
  else if(a==='jarl'){ u.berserk = 8; ring(u.x, u.y, .2, 2, '#ff5a4a', .6); burst(u.x, u.y-.3, 10, '#ff5a4a'); }
  { const AS = ABIL_SPR[a]; if(AS && onScr(u.x, u.y, 4)){ let ax = u.x, ay = u.y, ang = 0;
      if(a==='engineer' && R.barrage && R.barrage.length){ const b = R.barrage[R.barrage.length-1]; ax = b.x; ay = b.y; }
      if(a==='goldkhan' && u.lastCharge){ ax = u.lastCharge.mx; ay = u.lastCharge.my; ang = u.lastCharge.ang; }
      sAnim({n:AS[0], x:ax, y:ay, s:AS[1], ang, life:AS[2] ? 1.4 : 1, max:AS[2] ? 1.4 : 1, fol:AS[2] ? u : null, fade:1}); } }
  u.acd = H.cd*(own===PLAYER && hasArt('horn') ? .75 : 1); u.abT = R.now;
  float(H.act+'!', u.x, u.y-1.3, own===PLAYER ? '#ffe3a3' : '#ffb7a8', 1.4);
  if(own===PLAYER) SFX.pick && SFX.pick();
  return true;
}
function updateBarrage(dt){
  if(!R.barrage || !R.barrage.length) return;
  for(const b of R.barrage){
    b.t -= dt; if(b.t > 0 || b.done) continue; b.done = true;
    if(R.projs.length < 400) R.projs.push({sk:'shell', x0:b.ux, y0:b.uy-.2, x1:b.x, y1:b.y, life:.35, max:.35, col:'#fff', w:1.6, kind:'ball'});
    R.cc = b.card; for(const v of G.units){ if(v.hp<=0 || !atWar(b.own, v.owner) || (v.x-b.x)**2+(v.y-b.y)**2 > 1.44) continue; hitUnit(v, b.dmg, b.own, false); } R.cc = null;
    burst(b.x, b.y, 10, '#ffb35c'); ring(b.x, b.y, .1, 1.2, '#ffcf7a', .35);
  }
  R.barrage = R.barrage.filter(b => !b.done);
}
function rallyAt(h, c){
  if(!h || !c || c.owner!==h.owner) return 0;
  const cap = folCap(h.owner); let have = G.units.filter(v => v.fol===h.id && v.hp>0).length, n = 0;
  const pool = G.units.filter(v => v.owner===h.owner && v.hp>0 && v.card && !v.hero && !v.fol && !v.gar && !v.rel && v.home===c.id).sort((a,b) => (a.kind==='support') - (b.kind==='support'));
  for(const v of pool){ if(have >= cap) break; v.fol = h.id; have++; n++; ring(v.x, v.y, .1, .5, '#fff1cf', .4); }
  return n;
}
function garrisonAt(h, c){
  if(!h || !c || c.owner!==h.owner) return 0; let n = 0;
  for(const v of G.units) if(v.fol===h.id && v.hp>0){ v.fol = 0; v.home = c.id; n++; }
  return n;
}
const nearOwnCity = (h, r) => { let best = null, bd = (r||1.6)**2; for(const c of G.cities){ if(c.owner!==h.owner || c.dead) continue; const d = (c.x+.5-h.x)**2+(c.y+.5-h.y)**2; if(d < bd){ bd = d; best = c; } } return best; };
function heroAI(u, cityById){
  if((u.ait = (u.ait||0) - .5) > 0) return; u.ait = 1;
  const own = u.owner, cap = capitalOf(own); if(!cap) return;
  const war = warringAny(own), dg = R.danger.get(own), fol = G.units.filter(v => v.fol===u.id && v.hp>0).length;
  const near = nearOwnCity(u, 1.8);
  if(near && fol < folCap(own)*.7) rallyAt(u, near);
  if(dg){ const c = cityById.get(dg); if(c){ u.goal = {x:c.x+.5, y:c.y+.5}; u.tcity = 0; return; } }
  if(!war){ u.tcity = 0; const d = Math.hypot(cap.x+.5-u.x, cap.y+.5-u.y); if(d > 2.5) u.goal = {x:cap.x+.5+rnd(-1,1), y:cap.y+.5+rnd(-1,1)}; return; }
  if(fol < Math.min(4, folCap(own)*.4)){ u.tcity = 0; u.goal = {x:cap.x+.5, y:cap.y+.5}; return; }
  const sp = R.raidS.get(own), tid = R.raidT.get(own);
  if(tid && R.raidGo.get(own)){ u.tcity = tid; u.goal = null; return; }
  if(sp){ u.tcity = 0; u.goal = {x:sp.x, y:sp.y}; return; }
  if(tid){ u.tcity = tid; u.goal = null; }
}
function heroStep(u, dt, cityById, unitById){
  const own = u.owner, H = HEROES[u.hero];
  u.hlv = heroLv(own, u.hero); u.card = H.line; u.kind = CARDS[H.line].role;
  if(u.acd > 0) u.acd -= dt; if(u.inv > 0) u.inv -= dt; if(u.raid > 0) u.raid -= dt; if(u.berserk > 0) u.berserk -= dt;
  const st = uStat(u);
  { const was = u.enr; u.enr = u.hp < st.hp*.5; if(u.enr && !was && onScr(u.x, u.y)){ ring(u.x, u.y, .2, 1.8, '#ff6a4a', .9); burst(u.x, u.y-.5, 14, '#ff8a5a'); if(own===PLAYER) float('ENRAGED!', u.x, u.y-1.2, '#ff8a5a', 1.2); }
    if(G.t - (u.lastHit||0) > 4 && u.hp < st.hp) u.hp = Math.min(st.hp, u.hp + st.hp*.035*dt); }
  if(own !== PLAYER){ heroAI(u, cityById); if(u.teleT && G.t >= u.teleT){ u.teleT = 0; heroActive(u); } }
  const step = (tx, ty, d, mul) => {
    const wp = navPoint(u, own, tx, ty); if(wp){ tx = wp.x; ty = wp.y; d = Math.hypot(tx-u.x, ty-u.y); if(d < 1e-3) return; }
    const ti = idx(clamp(Math.floor(u.x),0,N-1), clamp(Math.floor(u.y),0,N-1));
    const s = st.spd*mul*(formFly(u.card, u.hlv) ? 1 : MOVE[G.ter[ti]])*(u.slow > 0 ? .5 : 1)*(u.raid > 0 ? 1.8 : 1)*(u.berserk > 0 ? 1.3 : 1);
    const m = Math.min(d, s*dt); u.x = clamp(u.x + (tx-u.x)/d*m, .3, N-.3); u.y = clamp(u.y + (ty-u.y)/d*m, .3, N-.3); u.mv = (u.mv||0) + m;
    if(Math.abs(tx-u.x) > .05) u.fx = tx<u.x ? -1 : 1;
  };
  // healing: Oracle aura and slow regen out of combat
  u.ht = (u.ht||0) - dt;
  let foeNear = false;
  if(u.ht <= 0){
    u.ht = .5;
    for(const v of G.units){ if(v.hp>0 && atWar(own, v.owner) && (v.x-u.x)**2+(v.y-u.y)**2 < 16){ foeNear = true; break; } }
    u.calm = !foeNear;
    if(H.aura==='oracle'){ let healed = false; for(const v of G.units){ if(v.owner!==own || v.hp<=0 || !v.card || (v.x-u.x)**2+(v.y-u.y)**2 > 9) continue; const mx = uStat(v).hp; if(v.hp < mx){ v.hp = Math.min(mx, v.hp + mx*.015); healed = true; } } if(healed) burst(u.x, u.y-.5, 3, '#7ae08a'); }
    if(own===PLAYER && hasArt('chalice')){ u.hp = Math.min(st.hp, u.hp + st.hp*.005); for(const v of G.units){ if(v.fol!==u.id || v.hp<=0) continue; const mx = uStat(v).hp; if(v.hp < mx) v.hp = Math.min(mx, v.hp + mx*.005); } }
    if(H.aura==='engineer'){ const c = nearOwnCity(u, 1.2); if(c) c.hp = Math.min(cityMax(c), c.hp + cityMax(c)*.01); }
    if(G.t >= (u.gatherT||0)){
      const cap = folCap(own); let have = 0; for(const v of G.units) if(v.fol===u.id && v.hp>0) have++;
      let got = 0;
      const dgc = R.danger.get(own);
      if(have < cap) for(const v of G.units){ if(have >= cap) break; if(v.owner!==own || v.hp<=0 || !v.card || v.hero || v.fol || v.gar || v.rel || (v.x-u.x)**2+(v.y-u.y)**2 > gatherR(own)**2) continue; if(dgc && v.home===dgc && v.tgt) continue; v.fol = u.id; have++; got++; if(own===PLAYER && onScr(v.x, v.y)) fxAdd({k:'ring', x:v.x, y:v.y, s:.45, life:.3, max:.3, col:'#ffd36a'}); }
      if(got && own===PLAYER){ float('+'+got, u.x, u.y-1.1, '#ffe3a3', .8); SFX.q('horn', u.x, u.y, .6); }
    }
  }
  u.hp = Math.min(st.hp, u.hp + st.hp*(u.calm ? .02 : .003)*dt);
  // steering: WASD while selected, else a tap order, else the AI goal
  const dir = own===PLAYER ? R.heroDir : null;
  if(dir && (dir.x || dir.y)){ u.goal = null; u.tcity = 0; const L = Math.hypot(dir.x, dir.y), nx = u.x+dir.x/L*.6, ny = u.y+dir.y/L*.6, w = G.own[tileAt(nx, ny)];
    if(navOk(own)[w]) step(u.x+dir.x/L*1.05, u.y+dir.y/L*1.05, 1.05, 1);
    else if(own===PLAYER && G.t - (R.bordT||0) > 3){ R.bordT = G.t; toast((rival(w) ? rival(w).name+'’s' : 'Those')+' borders are closed. Declare war or ally to pass','warn'); } }
  else if(u.goal){ const d = Math.hypot(u.goal.x-u.x, u.goal.y-u.y); if(d < .25) u.goal = null; else step(u.goal.x, u.goal.y, d, 1); }
  const moving = !!((dir && (dir.x || dir.y)) || u.goal);
  // targeting: attack while moving if something is in range, otherwise hunt nearby
  if(u.rt <= 0){
    const asl = own===PLAYER && u.tcity && !moving;
    u.rt = .3; let best = 1e9, t = null; const reach = asl ? st.rng + .5 : moving ? st.rng + .4 : Math.max(4, st.rng + 1), okm = navOk(own);
    for(const v of G.units){ if(v.hp<=0 || !atWar(own, v.owner) || !okm[G.own[tileAt(v.x, v.y)]]) continue; const d = Math.hypot(v.x-u.x, v.y-u.y); if(d < reach && d < best){ best = d; t = v; } }
    u.tgt = t ? t.id : 0;
  }
  let tgt = unitById.get(u.tgt); if(tgt && tgt.hp <= 0) tgt = null;
  if(tgt && own===PLAYER && u.tcity && !moving && Math.hypot(tgt.x-u.x, tgt.y-u.y) > st.rng + tgt.r*.5 + .3) tgt = null;
  if(own===PLAYER && u.tcity && G.t - (u.markT||0) > 1.6){ const c0 = cityById.get(u.tcity); if(c0 && !c0.dead && atWar(own, c0.owner)){ u.markT = G.t; ring(c0.x+.5, c0.y+.5, .3, 1.5, '#ff8a5a', .7); } }
  if(tgt){
    const d = Math.hypot(tgt.x-u.x, tgt.y-u.y);
    if(!moving) u.fx = tgt.x<u.x ? -1 : 1;
    if(CARDS[u.card].tags.some(g => ABIL[g] && ABIL[g].cd)) useAbilities(u, st, tgt, d, own);
    if(tgt.hp > 0){
      if(d > st.rng + tgt.r*.5){ if(!moving) step(tgt.x, tgt.y, d, 1); }
      else if(u.cd <= 0 && st.dmg > 0){ u.cd = st.cd*(u.frenzy > 0 ? .59 : 1)*(u.raid > 0 ? .75 : 1); u.atT = R.now; strike(u, tgt, st, own); }
    }
    if(own !== PLAYER && !moving && !u.teleT && (u.acd||0) <= 0){ const n = G.units.filter(v => v.hp>0 && atWar(own, v.owner) && (v.x-u.x)**2+(v.y-u.y)**2 < 9).length; if(n >= 3 && Math.random() < .4){ const ph = heroOf(PLAYER), near = ph && (ph.x-u.x)**2 + (ph.y-u.y)**2 < 100; if(near){ u.teleT = G.t + 2; SFX.tele && SFX.tele(); if(onScr(u.x, u.y)){ float('⚠ '+((HEROES[u.hero]||{}).act || 'Ability'), u.x, u.y-1.3, '#ffb35c', 1.6); ring(u.x, u.y, .3, 1.6, '#ffb35c', .8); } } else heroActive(u); } }
    return;
  }
  if(u.tcity && !moving){
    const c = cityById.get(u.tcity);
    if(c && !c.dead && atWar(own, c.owner)){
      const d = Math.hypot(c.x+.5-u.x, c.y+.5-u.y), reach = st.rng > 1.2 ? st.rng : .8;
      if(d > reach) step(c.x+.5, c.y+.5, d, 1);
      else if(u.cd <= 0){ u.cd = st.cd; u.atT = R.now; SFX.q(meleeStyle(u)==='stomp' ? 'stomp' : 'clang', u.x, u.y, 1.1); damageCity(c, st.dmg*st.wall, own); if(R.projs.length < 400) R.projs.push({sk:formOf(u.card, u.hlv).sh, x0:u.x, y0:u.y-.2, x1:c.x+.5, y1:c.y+.3, life:.25, max:.25, col:own===PLAYER?'#fff1cf':ocol(own), w:1.4, kind:'arrow'}); }
      return;
    }
    u.tcity = 0;
  }
}
/* followers: stay with their hero and fight what he fights */
function nearFoe(u, r){
  let best = r*r, t = null; const okm = navOk(u.owner);
  for(const v of G.units){ if(v.hp<=0 || !atWar(u.owner, v.owner) || !okm[G.own[tileAt(v.x, v.y)]]) continue; const d = (v.x-u.x)**2 + (v.y-u.y)**2; if(d < best){ best = d; t = v; } }
  return t;
}
const ORD_R = {charge:7, hold:3.2, fall:0};
function followerTarget(u, h){
  if(h.owner===PLAYER && G.order==='fall') return null;
  const ac = h.owner===PLAYER && h.tcity ? G.cities.find(c => c.id===h.tcity && !c.dead) : null;
  if(ac && u.kind==='siege') return null;
  if(u.kind==='siege' && enemyCityNear(u.owner, h.x, h.y, 6)) return null;
  let best = 1e9, t = null; const okm = navOk(u.owner);
  if(ac){ for(const v of G.units){ if(v.hp<=0 || !atWar(u.owner, v.owner) || !okm[G.own[tileAt(v.x, v.y)]]) continue; const dc = Math.hypot(v.x-ac.x-.5, v.y-ac.y-.5), d = Math.hypot(v.x-u.x, v.y-u.y); if(dc > 3.2 && d > 1.2) continue; if(d < best){ best = d; t = v; } } return t; }
  for(const v of G.units){ if(v.hp<=0 || !atWar(u.owner, v.owner) || !okm[G.own[tileAt(v.x, v.y)]]) continue; const dh = Math.hypot(v.x-h.x, v.y-h.y); if(dh > (h.owner===PLAYER ? ORD_R[G.order||'charge'] : 4.5) + (u.kind==='rider' ? 2 : 0)) continue; const d = roleScore(u, v, Math.hypot(v.x-u.x, v.y-u.y)) - (v.hero==='bastion' ? 3 : 0); if(d < best){ best = d; t = v; } }
  return t;
}

const TPREF = {warlike:['Mounted','Titan','Line'], mercantile:['Ranged','Fire','Siege'], scholarly:['Support','Holy','Ranged']};
const BTAGS = {raider:['Mounted'], warband:['Swarm'], brute:['Titan'], ram:['Siege'], warlord:['Titan']};
const BARB = {
  raider:{hp:10,dmg:3,spd:1.5,r:.2},
  warband:{hp:24,dmg:5,spd:1.08,r:.26},
  brute:{hp:72,dmg:10,spd:.74,r:.34},
  ram:{hp:55,dmg:26,spd:.68,r:.3,siege:1},
  warlord:{hp:700,dmg:30,spd:.58,r:.55,boss:1}
};
const BOSSES = [
  {t:300,n:1,msg:'A Warlord marches out of the dark'},
  {t:600,n:2,msg:'Two Warlords lead a host into the light'},
  {t:840,n:1,great:1,msg:'The Great Horde has come'}
];

const rnd = (a,b) => a + Math.random()*(b-a);
const rint = n => Math.floor(Math.random()*n);
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const idx = (x,y) => y*N + x;
const inb = (x,y) => x>=0 && y>=0 && x<N && y<N;
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rint(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const fmt = t => { t=Math.max(0,Math.floor(t)); return Math.floor(t/60)+':'+String(t%60).padStart(2,'0'); };
const hexRgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const rgbHex = (r,g,b) => '#'+[r,g,b].map(v => Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
