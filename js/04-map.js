"use strict";
/* ---------- Terrain ---------- */
function genTerrain(seed){
  const r = mulberry32(seed);
  const lat = c => { const g=Math.ceil(N/c)+3, a=new Float32Array(g*g); for(let i=0;i<a.length;i++) a[i]=r(); return {c,g,a}; };
  const sm = t => t*t*(3-2*t);
  const smp = (L,x,y) => {
    const fx=x/L.c, fy=y/L.c, x0=Math.floor(fx), y0=Math.floor(fy), tx=sm(fx-x0), ty=sm(fy-y0), g=L.g, a=L.a;
    const top = a[y0*g+x0] + (a[y0*g+x0+1]-a[y0*g+x0])*tx;
    const bot = a[(y0+1)*g+x0] + (a[(y0+1)*g+x0+1]-a[(y0+1)*g+x0])*tx;
    return top + (bot-top)*ty;
  };
  const h1=lat(20), h2=lat(9), h3=lat(3.2), m1=lat(16), m2=lat(5.5);
  const ter = new Array(N*N);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const d = Math.hypot(x-N/2+.5, y-N/2+.5)/(N/2);
    let h = .55*smp(h1,x,y) + .3*smp(h2,x,y) + .15*smp(h3,x,y);
    h = (h-.5)*1.8 + .5 + .1*(1-d);
    const m = .65*smp(m1,x,y) + .35*smp(m2,x,y);
    let t;
    if(h<.36) t=WATER; else if(h>.84) t=MOUNT; else if(h>.72) t=HILLS;
    else if(m>.6) t=FOREST; else if(m<.32) t=DESERT; else if(m<.45) t=PLAINS; else t=GRASS;
    ter[y*N+x] = t;
  }
  return ter;
}
function siteNear(ter, px, py, rad, avoid, minGap){
  let best=-1e9, bs=null;
  for(let y=Math.max(3,Math.floor(py-rad)); y<=Math.min(N-4,Math.ceil(py+rad)); y++)
  for(let x=Math.max(3,Math.floor(px-rad)); x<=Math.min(N-4,Math.ceil(px+rad)); x++){
    const t=ter[idx(x,y)]; if(t===WATER||t===MOUNT) continue;
    if(avoid.some(a => Math.hypot(a.x-x,a.y-y) < minGap)) continue;
    let land=0, val=0;
    for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){ const tt=ter[idx(x+dx,y+dy)]; if(tt!==WATER) land++; val+=YIELD[tt][0]+YIELD[tt][1]; }
    const sc = land*.6 + val*.25 - Math.hypot(x-px,y-py)*.9;
    if(sc>best){ best=sc; bs={x,y}; }
  }
  return bs;
}

/* ---------- Exploration: fog of war, wild sites and artifacts ---------- */
const ART_CAP = 6;
const AP = {y:'#ffd36a', Y:'#b8862a', r:'#d8412f', R:'#7a1e16', w:'#94602e', W:'#5a3a1c', m:'#c4ccd4', M:'#6c7680', k:'#120c08', g:'#5fc46a', G:'#2f7a3a', b:'#4aa0e0', B:'#1e4f80', p:'#b48ae0', P:'#5e3a8a', o:'#ece0c4', c:'#8ff0e8', f:'#7a5a3c'};
const ARTS = {
  sunbanner:{n:'Sun Banner', d:'Troops in your band deal 15% more damage', i:["k.........","kyyyyyy...","kyyrryyy..","kyrrrryy..","kyyrryy...","kyyyyyyy..","k.........","w.........","w.........","W........."]},
  standard:{n:'Eagle Standard', d:'Troops in your band take 15% less damage', i:["...yyyy...","..yYyyYy..","...yyyy...","....w.....","..rrrrrr..","..rRrrRr..","..rrrrrr..","..y.w..y..","....w.....","....W....."]},
  cuirass:{n:'Bronze Cuirass', d:'Your hero has 40% more health', i:["..........",".mm....mm.",".mMmmmmMm.","..mmmmmm..","..mMmmMm..","..mmmmmm..","..mMmmMm..","...mmmm...","...MMMM...",".........."]},
  drum:{n:'War Drum', d:'Troops in your band attack 15% faster', i:["y......y..",".y....y...","..y..y....",".oooooooo.",".rrrrrrrr.",".ryryryry.",".rrrrrrrr.",".RRRRRRRR.",".oooooooo.",".........."]},
  chalice:{n:'Healing Chalice', d:'Your hero and band heal 1% of their health every second', i:["..........",".yyyyyyy..",".yrrrrry..",".yRrrrRy..","..yyyyy...","...yYy....","....y.....","...yyy....","..yYYYy...",".........."]},
  aegis:{n:'Aegis', d:'Your hero takes 25% less damage', i:["..........","...mmmm...","..mbbbbm..",".mbbybbbm.",".mbyyybbm.",".mbbybbbm.",".mbbbbbbm.","..mbbbbm..","...mmmm...",".........."]},
  blade:{n:'Starsteel Blade', d:'Your hero deals 35% more damage', i:[".........c","........cm",".......cm.","......cm..",".....cm...","..y.cm....","...ym.....","..Wwy.....",".Ww..y....","W........."]},
  boots:{n:'Winged Boots', d:'Your hero and band move 15% faster', i:["..........","o..ww.....","oo.ww.....",".o.ww.....","...ww.....","...ww.....","...wwww...","..wwwwww..","..WWWWWW..",".........."]},
  horn:{n:'Horn of Valor', d:'Your hero’s ability recharges 25% faster', i:["..........","........y.",".......oy.","......oo..",".....oo...","...ooo....",".oooo.....","yoo.......","yy........",".........."]},
  lodestone:{n:'Lodestone', d:'Your hero gathers troops from 5 tiles away instead of 3', i:["..........",".rr....mm.",".rr....mm.",".rr....mm.",".rr....mm.",".rrr..mmm.","..rrrmmm..","...rrmm...","..........",".........."]},
  phoenix:{n:'Phoenix Feather', d:'Your hero returns 30 seconds after falling instead of 60', i:["........r.",".......ry.","......ryy.",".....ryy..","....ryy...","...ryy....","..ryy.....",".rr.......",".w........","w........."]},
  lens:{n:'Scholar’s Lens', d:'Level-ups need 10% less science', i:["..mmmm....",".mccccm...","mcocccm...","mcccccm...","mcccccm...",".mccccm...","..mmmmw...","......ww..",".......ww.","........W."]},
  crown:{n:'Merchant Crown', d:'+25% influence', i:["..........","..........",".y..y..y..",".yy.yy.yy.",".yyyyyyyy.",".yryybyry.",".yyyyyyyy.",".YYYYYYYY.","..........",".........."]},
  plough:{n:'Golden Sheaf', d:'+15% food in every city', i:["..y.y.y...","..yyyyy...","...yyy....","..y.y.y...","...yyy....","....Y.....","..YYYYY...","....Y.....","...Y.Y....","..Y...Y..."]},
  anvil:{n:'Dwarven Anvil', d:'+15% production in every city', i:["..........","..........",".MMMMMMMM.","MmmmmmmmM.","..MmmmM...","...MmM....","...MmM....","..MMMMM...",".MMMMMMM..",".........."]},
  scroll:{n:'Lost Scroll', d:'+15% science in every city', i:["..........",".Wooooooo.",".wokkkoo..","..ooooooo.","..okkkkoo.","..ooooooo.","..okkkoo..",".ooooooow.",".Wwwwwwww.",".........."]},
  idol:{n:'Jade Idol', d:'Every kill your band makes gives 1 influence and heals your hero a little', i:["...gggg...","..gkggkg..","..gggggg..","..gGkkGg..","...gggg...","..gggggg..",".gGggggGg.","..gggggg..","..gG..Gg..",".GGGGGGGG."]},
  compass:{n:'Explorer’s Compass', d:'Your hero sees 4 tiles further and moves 10% faster', i:["...yyyy...","..yooooy..",".yoooroy..",".yoorroy..",".yobboy...",".yobooy...","..yooooy..","...yyyy...","..........",".........."]},
  chart:{n:'Cartographer’s Chart', d:'Every wild site on the map is marked, even in the fog', i:["..........",".oooooooo.",".obboggoo.",".obbbgggo.",".ooboogro.",".obbooggo.",".oooooooo.",".wwwwwwww.","..........",".........."]},
  seal:{n:'Imperial Seal', d:'War Chests offer 4 upgrades instead of 3', i:["..........","...rrrr...","..rrRRrr..",".rrRyyRrr.",".rrRyyRrr.","..rrRRrr..","...rrrr...","...r..r...","..r....r..",".........."]}
};
const POI_ICON = {
  ruins:["............",".mm.......mm",".mM.......mM",".mM..mm...mM",".mM..mM...mM",".mM..mM.....",".mM..mM...m.",".mM..mM...mM","MMMMMMMMMMMM"],
  camp:[".....k......",".....krr....",".....krrr...",".....k......","....wkw.....","...wwkww....","..wWwkwWw...",".wWwwkwwWw..","wWwwwkwwwWw.","WWWWWkWWWWW."],
  merc:[".....k......",".....kyy....",".....kyyy...",".....k......","....yky.....","...yrkry....","..yrykyry...",".yryrkryry..","yryrykyryry.","YYYYYkYYYYY."],
  tribe:["............","..w......w..",".www....www.","wwwww..wwwww","wWWWw..wWWWw","wWkWw..wWkWw","wWkWw..wWkWw","ffffffffffff"],
  shrine:[".....mm.....","....mccm....",".....mm.....",".....mm.....","....mmmm....","....mMmm....","....mMmm....","....mMmm....","...mmmmmm...","..MMMMMMMM.."],
  falls:["....mmmm....","...mMbbMm...","..mMMbbMMm..","..mMMbbMMm..",".mMMMbbMMMm.",".mMMMbbMMMm.","mMMMMbbMMMMm","bbbbbbbbbbbb","cbbcbbbcbbcb"],
  tree:["....gggg....","..gggGgggg..",".gggGgggGgg.","ggGgggggggGg",".gggggGgggg.","..ggwggwgg..",".....ww.....",".....ww.....","....wwww....","...WWWWWW..."],
  spire:[".....c......","....ccp.....","....cpp.....","...ccpp.c...","...cpppcp...","..cc.ppcp...","..cp.ppcpp..",".ccp.pp.cp..",".cpp.pp.cpp.","MMMMMMMMMMMM"]
};
const SHRINE = {war:{n:'Shrine of War', c:'#ff6a4a', d:'Your band deals 30% more damage for 90 seconds'}, life:{n:'Shrine of Life', c:'#7ae08a', d:'Your hero and band are fully healed'}, wisdom:{n:'Shrine of Wisdom', c:'#7ac8ff', d:'A burst of science toward your next level'}};
const WONDER = {falls:{n:'The Sky Falls', e:'f', d:'+15% food while it lies inside your borders'}, tree:{n:'The Elder Tree', e:'p', d:'+15% production while it lies inside your borders'}, spire:{n:'The Crystal Spire', e:'s', d:'+15% science while it lies inside your borders'}};
const POI_NAME = {ruins:'Ancient ruins', camp:'Barbarian camp', merc:'Mercenary camp', tribe:'Lost tribe', shrine:'Shrine', wonder:'Natural wonder'};
const hasArt = k => !!(G && G.arts && G.arts.includes(k));
const gatherR = o => o===PLAYER && hasArt('lodestone') ? 5 : 3;
const padRows = rows => { const w = Math.max(...rows.map(r => r.length)); return rows.map(r => r.padEnd(w, '.')); };
const artSpr = k => getSpr('art_'+k, () => spriteFrom(padRows(ARTS[k].i), AP));
const ARTIMG = {"sunbanner":"art/artimg/sunbanner.png","standard":"art/artimg/standard.png","cuirass":"art/artimg/cuirass.png","drum":"art/artimg/drum.png","chalice":"art/artimg/chalice.png","aegis":"art/artimg/aegis.png","blade":"art/artimg/blade.png","boots":"art/artimg/boots.png","horn":"art/artimg/horn.png","lodestone":"art/artimg/lodestone.png","phoenix":"art/artimg/phoenix.png","lens":"art/artimg/lens.png","crown":"art/artimg/crown.png","plough":"art/artimg/plough.png","anvil":"art/artimg/anvil.png","scroll":"art/artimg/scroll.png","idol":"art/artimg/idol.png","compass":"art/artimg/compass.png","chart":"art/artimg/chart.png"};
ARTIMG.seal = "art/artimg/img.png";
const artImg = k => ARTIMG[k] || artURL('art_'+k, () => artSpr(k).n);
const artHand = k => !!ARTIMG[k];
function poiSpr(p){
  if(p.k==='wonder') return getSpr('poi_'+p.sub, () => spriteFrom(padRows(POI_ICON[p.sub]), AP));
  if(p.k==='shrine') return getSpr('poi_sh_'+p.sub, () => spriteFrom(padRows(POI_ICON.shrine), Object.assign({}, AP, {c:SHRINE[p.sub].c})));
  return getSpr('poi_'+p.k, () => spriteFrom(padRows(POI_ICON[p.k]), AP));
}
const poiName = p => p.k==='wonder' ? WONDER[p.sub].n : p.k==='shrine' ? SHRINE[p.sub].n : p.k==='camp' ? (p.keep ? 'Pretender’s keep' : p.big ? 'Barbarian stronghold' : 'Barbarian camp') : POI_NAME[p.k];

/* fog of war */
const fogSee = (x, y) => !R.vis || !G || G.arena || G.demo || !!R.vis[tileAt(x, y)];
const fogSeen = (x, y) => !G || !G.seen || G.arena || !!G.seen[tileAt(x, y)];
function fogInit(){
  if(!G.seen || G.seen.length !== N*N) G.seen = new Array(N*N).fill(0);
  R.vis = new Uint8Array(N*N); R.fogAcc = 0;
  const r = mulberry32((G.seed||1) ^ 0x5f3759df), g = 7, L = new Float32Array((N/g+3)*(N/g+3)|0), gw = (N/g+3)|0; for(let i=0;i<L.length;i++) L[i] = r();
  R.fogNoise = new Int8Array(N*N);
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const fx = x/g, fy = y/g, x0 = fx|0, y0 = fy|0, tx = fx-x0, ty = fy-y0, a = L[y0*gw+x0] + (L[y0*gw+x0+1]-L[y0*gw+x0])*tx, b = L[(y0+1)*gw+x0] + (L[(y0+1)*gw+x0+1]-L[(y0+1)*gw+x0])*tx; R.fogNoise[y*N+x] = Math.round((a + (b-a)*ty)*22 - 11 + r()*6 - 3); }
}
function reveal(cx, cy, rad){
  const r2 = rad*rad, x0 = Math.max(0, Math.floor(cx-rad)), x1 = Math.min(N-1, Math.floor(cx+rad)), y0 = Math.max(0, Math.floor(cy-rad)), y1 = Math.min(N-1, Math.floor(cy+rad));
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const dx = x+.5-cx, dy = y+.5-cy; if(dx*dx+dy*dy <= r2) G.seen[y*N+x] = 1; }
}
function fogTick(){
  if(!G || G.arena) return;
  if(!R.vis || R.vis.length !== N*N || !G.seen) fogInit();
  const v = R.vis, sn = G.seen; v.fill(0);
  const fr = [false]; for(const r of G.rivals) fr[r.id] = r.alive && isAlly(PLAYER, r.id); fr[PLAYER] = true;
  const stamp = (cx, cy, rad) => {
    const r2 = rad*rad, x0 = Math.max(0, Math.floor(cx-rad)), x1 = Math.min(N-1, Math.floor(cx+rad)), y0 = Math.max(0, Math.floor(cy-rad)), y1 = Math.min(N-1, Math.floor(cy+rad));
    for(let y=y0;y<=y1;y++){ const dy = y+.5-cy, row = y*N; for(let x=x0;x<=x1;x++){ const dx = x+.5-cx; if(dx*dx+dy*dy <= r2){ v[row+x] = 1; sn[row+x] = 1; } } }
  };
  const own = G.own;
  for(let i=0;i<N*N;i++){
    const o = own[i]; if(!o || !fr[o]) continue;
    const x = i % N, y = (i/N)|0;
    for(let dy=-1;dy<=1;dy++){ const yy = y+dy; if(yy<0||yy>=N) continue; for(let dx=-1;dx<=1;dx++){ const xx = x+dx; if(xx<0||xx>=N) continue; const j = yy*N+xx; v[j] = 1; sn[j] = 1; } }
  }
  for(const c of G.cities) if(!c.dead && fr[c.owner]) stamp(c.x+.5, c.y+.5, 4.5);
  for(const u of G.units){ if(u.hp<=0 || !fr[u.owner]) continue; stamp(u.x, u.y, u.hero ? (u.owner===PLAYER ? 6.5 + (hasArt('compass') ? 4 : 0) : 5) : 2.6); }
  const cv = R.fogCv || (R.fogCv = mkCanvas(N, N)), g = cv.getContext && cv.getContext('2d');
  if(!g || !g.createImageData || !g.putImageData) return;
  if(!R.fogIm || R.fogIm.width !== N) R.fogIm = g.createImageData(N, N);
  const d = R.fogIm.data, nz = R.fogNoise;
  for(let i=0;i<N*N;i++){ const k = i*4; if(v[i]){ d[k+3] = 0; continue; } if(sn[i]){ d[k] = 8; d[k+1] = 12; d[k+2] = 16; d[k+3] = 118; continue; } const c = nz[i]; d[k] = 24 + c; d[k+1] = 31 + c; d[k+2] = 38 + c; d[k+3] = 246; }
  g.putImageData(R.fogIm, 0, 0);
}

/* wild sites */
function poiSpot(minCity, minPoi){
  for(let t=0;t<400;t++){
    const x = 3 + rint(N-6), y = 3 + rint(N-6), i = idx(x, y), te = G.ter[i];
    if(te===WATER || te===MOUNT || G.own[i]) continue;
    if(G.cities.some(c => Math.hypot(c.x-x, c.y-y) < minCity)) continue;
    if(G.pois.some(p => !p.dead && Math.hypot(p.x-x, p.y-y) < minPoi)) continue;
    return {x, y};
  }
  return null;
}
function addPoi(k, opt){
  const s = poiSpot(k==='wonder' ? 13 : 9, k==='wonder' ? 18 : 6); if(!s) return null;
  const p = Object.assign({id:G.nid++, k, x:s.x, y:s.y, st:'ok', t:G.t}, opt||{});
  if(k==='shrine' && !p.sub) p.sub = ['war','life','wisdom'][rint(3)];
  if(k==='camp' && p.big==null) p.big = Math.random() < (G.t > 300 ? .4 : .3);
  G.pois.push(p);
  return p;
}
function placePois(){
  G.pois = []; G.poiT = 70;
  shuffle(['falls','tree','spire']).forEach(w => addPoi('wonder', {sub:w}));
  const plan = ['ruins','ruins','ruins','ruins','ruins','ruins','ruins','camp','camp','camp','camp','camp','merc','merc','merc','tribe','tribe','tribe','shrine','shrine','shrine'];
  plan.forEach((k, j) => addPoi(k, k==='camp' ? {big:j < 9} : k==='shrine' ? {sub:['war','life','wisdom'][j%3]} : null));
  addPoi('camp', {big:true, keep:true});
}
function campGuards(p){
  if(p.keep){ const kinds = ['warlord','brute','brute','warband','warband','warband','warband','raider'];
    kinds.forEach((kd, j) => { const a = j/kinds.length*6.283, hx = p.x+.5+Math.cos(a)*(j ? 1.2 : .2), hy = p.y+.5+Math.sin(a)*(j ? 1.2 : .2);
      spawnBarb(kd, clamp(hx, .5, N-.5), clamp(hy, .5, N-.5), j ? 1.6 : .9); const b = G.units[G.units.length-1]; b.camp = p.id; b.hx = hx; b.hy = hy; b.reb = 1; b.rc = [212,170,80];
      if(!j){ b.name = 'The Pretender'; b.chief = 1; } });
    return; }
  const kinds = p.big ? ['brute','warband','warband','warband','warband','raider','raider'] : ['warband','raider','warband','raider'];
  kinds.forEach((kd, j) => {
    const a = j/kinds.length*6.283, hx = p.x+.5+Math.cos(a)*(j ? 1.1 : .3), hy = p.y+.5+Math.sin(a)*(j ? 1.1 : .3);
    spawnBarb(kd, clamp(hx, .5, N-.5), clamp(hy, .5, N-.5), p.big ? 1.5 : 1.1);
    const b = G.units[G.units.length-1]; b.camp = p.id; b.hx = hx; b.hy = hy;
    if(p.big && j===0){ b.hp *= 2.5; b.max *= 2.5; b.dmg *= 1.6; b.chief = 1; }
  });
}
function guardStep(b, dt, unitById){
  const p = G.pois.find(q => q.id===b.camp && !q.dead);
  if(!p){ b.camp = 0; return false; }
  const px = p.x+.5, py = p.y+.5;
  if(b.rt <= 0){
    b.rt = .4; b.gt = 0; let bd = 20.25;
    for(const s of G.units){ if(s.hp<=0 || s.owner===0) continue; const d = (s.x-b.x)**2+(s.y-b.y)**2; if(d < bd && (s.x-px)**2+(s.y-py)**2 < 56){ bd = d; b.gt = s.id; } }
  }
  let foe = b.gt ? unitById.get(b.gt) : null; if(foe && foe.hp <= 0) foe = null;
  let tx = b.hx, ty = b.hy;
  if(foe){
    const d = Math.hypot(foe.x-b.x, foe.y-b.y); b.fx = foe.x<b.x ? -1 : 1;
    if(d < .62+b.r+(foe.r||.2)*.5){ if(b.cd<=0){ b.cd = 1/PACE.atk; b.atT = R.now; b.lg = .12; b.lx = (foe.x-b.x)/(d||1); b.ly = (foe.y-b.y)/(d||1); burst((b.x+foe.x)/2, (b.y+foe.y)/2-.15, 2, '#ffb0a0'); noteFight(b.x, b.y); hitUnit(foe, b.dmg, 0, false); } return true; }
    tx = foe.x; ty = foe.y;
  }
  const dx = tx-b.x, dy = ty-b.y, d = Math.hypot(dx, dy);
  if(d < .15) return true;
  if(Math.abs(dx) > .05) b.fx = dx<0 ? -1 : 1;
  const sp = b.spd*MOVE[G.ter[tileAt(b.x, b.y)]]*(b.slow > 0 ? .5 : 1)*(foe ? 1 : .6), m = Math.min(d, sp*dt);
  b.x += dx/d*m; b.y += dy/d*m;
  return true;
}
function campCheck(id, att){
  const p = G.pois.find(q => q.id===id); if(!p || p.dead || p.st!=='ok') return;
  if(G.units.some(u => u.camp===id && u.hp > 0)) return;
  p.st = 'loot'; burst(p.x+.5, p.y+.5, 14, '#ffd36a'); ring(p.x+.5, p.y+.5, .2, 1.6, '#ffd36a', .7);
  if(att===PLAYER || fogSee(p.x+.5, p.y+.5)){ toast((p.keep ? 'Pretender’s keep' : p.big ? 'Warcamp' : 'Camp')+' cleared! A loot pile waits: walk your hero onto it','good',{x:p.x+.5, y:p.y+.5}); SFX.found && SFX.found(); float('LOOT!', p.x+.5, p.y-.4, '#ffd36a', 2); R.floats[R.floats.length-1].big = 1; }
}
/* The Host: every troop not guarding a city marches with your general. Garrisons scale with city size and only defend */
const garQuota = c => Math.max(1, Math.round((1 + Math.floor(c.pop/3) + (c.capital ? 1 : 0))*(G.doctrine==='defend' ? 1.6 : 1)));
const GAR_PREF = {guard:3, archer:2, support:0, rider:1, siege:0, titan:0};
function hostTick(){
  const h = heroOf(PLAYER), cs = citiesOf(PLAYER), byC = new Map(cs.map(c => [c.id, []])); let hostN = 0;
  for(const u of G.units){
    if(u.owner!==PLAYER || u.hp<=0 || !u.card || u.hero) continue;
    if(u.gar){ const l = byC.get(u.gar); if(l) l.push(u); else u.gar = 0; }
    else if(h && u.fol===h.id) hostN++;
  }
  const free = G.units.filter(u => u.owner===PLAYER && u.hp>0 && u.card && !u.hero && !u.gar && !u.fol && !u.rel);
  let total = 0; for(const u of G.units) if(u.owner===PLAYER && u.hp>0 && u.card && !u.hero) total++;
  let budget = (G.banT||0) > G.t ? 0 : Math.ceil(total*(G.doctrine==='defend' ? .55 : .4));
  const dl = (R.dangerAll && R.dangerAll.get(PLAYER)) || [];
  cs.sort((a,b) => (dl.includes(b.id) - dl.includes(a.id)) || (b.capital - a.capital) || (b.pop - a.pop));
  for(const c of cs){
    const l = byC.get(c.id), q = Math.min(garQuota(c), Math.max(1, budget)); budget -= Math.min(l.length, q);
    while(l.length > q){ const v = l.pop(); v.gar = 0; }
    if(l.length < q && free.length){
      free.sort((a,b) => ((GAR_PREF[CARDS[b.card].role]||0) - (GAR_PREF[CARDS[a.card].role]||0)) || (((a.x-c.x)**2+(a.y-c.y)**2) - ((b.x-c.x)**2+(b.y-c.y)**2)));
      while(l.length < q && free.length && budget > 0){ const v = free.shift(); v.gar = c.id; v.home = c.id; v.fol = 0; l.push(v); budget--; }
    }
  }
  if(h){ for(const v of free){ v.fol = h.id; hostN++; } h.bandN = hostN; }
  G.garN = [...byC.values()].reduce((a,l) => a + l.length, 0); G.hostN = hostN;
}
function setOrder(o){ if(!G || G.ended) return; G.order = o; syncOrders(); SFX.tick && SFX.tick(); const h = heroOf(PLAYER); if(h){ ring(h.x, h.y, .2, 1.4, o==='charge' ? '#ff8a5a' : o==='hold' ? '#9fd0ff' : '#c8f0a0', .8); float(o==='charge' ? 'CHARGE!' : o==='hold' ? 'HOLD!' : 'FALL BACK!', h.x, h.y-1.3, '#fff1cf', 1); } }
function syncOrders(){ document.querySelectorAll('#orders button').forEach(b => b.classList.toggle('on', !!G && b.dataset.o === (G.order||'charge'))); }
function bandUnits(h){ return G.units.filter(v => v.fol===h.id && v.hp>0); }
function joinBand(h, n, merc){
  const cap = capitalOf(PLAYER), ids = G.cards.map(s => s.id).filter(id => CARDS[id].role!=='support'); if(!ids.length) return 0;
  for(let k=0;k<n;k++){ const u = spawnUnit(PLAYER, {x:h.x-.5+rnd(-.6,.6), y:h.y-.5+rnd(-.6,.6), id:cap ? cap.id : 0}, ids[rint(ids.length)]); if(u){ u.home = cap ? cap.id : 0; u.fol = h.id; if(merc) u.merc = 1; ring(u.x, u.y, .1, .6, '#ffd36a', .5); } }
  return n;
}
const eraCash = () => 1 + .35*(G.eraIdx||0);
/* ---------- Loot reveals: every find is a moment ---------- */
const TIER = {common:{n:'Find', col:'#d8e2e6'}, rare:{n:'Rare find', col:'#7ac8ff'}, epic:{n:'Epic find', col:'#c88cff'}, legend:{n:'Legendary', col:'#ffd36a'}, danger:{n:'Ambush!', col:'#ff6a5a'}};
const pickLine = a => a[rint(a.length)];
function lootPop(o){
  const T = TIER[o.tier] || TIER.common, at = o.at;
  if(at && !G.demo){
    fxAdd({k:'beam', x:at.x, y:at.y+.2, s:o.tier==='legend' ? .9 : .6, h:o.tier==='legend' ? 5 : o.tier==='epic' ? 4 : 3, life:1.2, max:1.2, col:T.col});
    ring(at.x, at.y, .2, o.tier==='legend' ? 3 : 2, T.col, .9); burst(at.x, at.y-.5, o.tier==='legend' ? 30 : o.tier==='epic' ? 20 : 12, T.col);
    if(o.big) { float(o.big, at.x, at.y-1.3, T.col, 2); R.floats[R.floats.length-1].big = 1; }
    if(o.tier==='legend' || o.tier==='epic') R.shake = Math.min(8, (R.shake||0) + (o.tier==='legend' ? 4 : 2));
  }
  if(o.tier==='legend' || o.tier==='epic'){ MUS.sting && MUS.sting('evo'); } else if(o.tier==='danger'){ SFX.warn(); } else { SFX.found ? SFX.found() : SFX.pick(); }
  (R.lootQ || (R.lootQ = [])).push({T, tier:o.tier, kick:o.kick, title:o.title, line:o.line, gain:o.gain});
  if(!R.lootOn) lootNext();
}
function lootNext(){
  const el = document.getElementById('lootPop'); const q = R.lootQ || []; const o = q.shift();
  if(!el || !o){ R.lootOn = false; if(el) el.className = 'lootpop'; return; }
  if(modal || paused){ q.unshift(o); setTimeout(lootNext, 300); return; }
  R.lootOn = true;
  el.innerHTML = '<small style="color:'+o.T.col+'">'+esc(o.kick || o.T.n)+'</small><b>'+esc(o.title)+'</b>'+(o.gain ? '<em style="color:'+o.T.col+'">'+esc(o.gain)+'</em>' : '')+(o.line ? '<span>'+esc(o.line)+'</span>' : '');
  el.className = 'lootpop t-'+o.tier; void el.offsetWidth; el.classList.add('on');
  const hold = o.tier==='legend' ? 3400 : o.tier==='epic' ? 3000 : 2400, t0 = performance.now();
  const tick = () => { if(modal || paused){ setTimeout(tick, 200); return; } if(performance.now() - t0 < hold){ setTimeout(tick, 200); return; } el.classList.remove('on'); setTimeout(lootNext, 260); };
  setTimeout(tick, 200);
}
function poiTouch(p, h){
  const at = {x:p.x+.5, y:p.y+.5};
  if(p.k==='ruins'){
    p.dead = true; G.stats.ruins = (G.stats.ruins||0) + 1; lifeAdd('ruins');
    const r = Math.random();
    if(r < .36){ lootPop({tier:'legend', kick:'✦ Legendary relic ✦', title:'Something ancient stirs in the dust…', at}); gainArt('Found in the ruins', 'ruins'); }
    else if(r < .5 && giveHint(at)) {}
    else if(r < .56){ const sc = Math.round(levelCost(G.level||0)*.35); G.sci += sc; lootPop({tier:'rare', title:pickLine(['Ancient Tablets','A Sealed Library','The Astronomer’s Notes']), gain:'+'+sc+' science', big:'+'+sc+' ✦', line:pickLine(['Your scholars weep with joy.','Knowledge the world forgot, now yours.','Centuries of wisdom, carried home on a cart.']), at}); }
    else if(r < .7){ const v = Math.round(60*eraCash()); G.influence = Math.min(600, G.influence + v); lootPop({tier:'rare', title:pickLine(['Buried Treasure!','A King’s Hoard!','Gold Beneath the Stones!']), gain:'+'+v+' influence', big:'+'+v+' ◎', line:pickLine(['Chests of coin glitter in the rubble.','Enough gold to buy a dozen kings.','The old kings will not miss it.']), at}); }
    else if(r < .82){ const far = G.pois.filter(q => !q.dead && q!==p && !G.seen[idx(q.x, q.y)]).sort((a,b) => Math.hypot(a.x-h.x,a.y-h.y) - Math.hypot(b.x-h.x,b.y-h.y)).slice(0, 3); far.forEach(q => reveal(q.x+.5, q.y+.5, 4)); fogTick();
      lootPop({tier:'common', title:'Old Explorer’s Maps', gain:far.length ? far.length+' hidden site'+(far.length>1 ? 's' : '')+' revealed' : 'Nothing new on them', line:far.length ? 'The fog parts. Treasure waits out there.' : 'Someone got here first.', at}); }
    else if(r < .93){ joinBand(h, 3); SFX.q && SFX.q('horn', h.x, h.y, .7); lootPop({tier:'rare', title:'Survivors Emerge!', gain:'+3 warriors join your band', big:'+3 ⚔', line:pickLine(['They swear their swords to you.','Hungry, angry, and ready to fight.']), at}); }
    else { for(let k=0;k<5;k++){ const a = k/5*6.283; spawnBarb('raider', clamp(h.x+Math.cos(a)*3, .5, N-.5), clamp(h.y+Math.sin(a)*3, .5, N-.5)); } R.shake = Math.min(6, (R.shake||0)+3); lootPop({tier:'danger', kick:'Ambush!', title:'It was a trap!', line:'Raiders pour out of the ruins. Cut your way out!', at}); }
    burst(at.x, at.y, 12, '#d8c8a0');
  }
  else if(p.k==='camp'){
    if(p.st!=='loot'){ if(!p.warned){ p.warned = 1; toast('Clear the guards first','warn',at); } return; }
    p.dead = true; G.stats.camps = (G.stats.camps||0) + 1; lifeAdd('camps'); if(p.big) lifeAdd('holds');
    const v = Math.round((p.big ? 70 : 40)*eraCash()); G.influence = Math.min(600, G.influence + v);
    if(p.big){ const n = (p.keep ? 5 : 4) + Math.min(3, G.eraIdx||0), before = G.units.length; joinBand(h, n, true);
      for(let k=before;k<G.units.length;k++){ const u = G.units[k]; if(u.owner===PLAYER && u.merc){ u.elite = 1; u.hp = uStat(u).hp; ring(u.x, u.y, .1, .8, '#ffd36a', .7); } }
      SFX.q && SFX.q('horn', h.x, h.y, .9);
      lootPop({tier:'legend', kick:p.keep ? '✦ The Pretender’s keep falls ✦' : '✦ Warcamp plundered ✦', title:p.keep ? 'His Guard Kneels to You!' : 'The Warlord’s Champions!', gain:'+'+n+' elite troops join your band · +'+v+' influence', big:'+'+n+' ★', line:'Veterans, twice as tough as your own. They fight for you the rest of this game.', at});
      gainArt(p.keep ? 'Taken from the Pretender’s keep' : 'Plundered from a barbarian warcamp', 'hold');
      setTimeout(() => { try { giveHint(at); } catch(e){} }, 3600); }
    else if(Math.random() < .3){ lootPop({tier:'epic', kick:'Plunder!', title:'A relic in the loot pile!', gain:'+'+v+' influence', big:'+'+v+' ◎', at}); gainArt('Plundered from a barbarian camp', 'camp'); }
    else { const sc = Math.round(levelCost(G.level||0)*.15); G.sci += sc; lootPop({tier:'rare', kick:'Plunder!', title:pickLine(['The Camp is Yours!','Spoils of War!','Raiders’ Stash!']), gain:'+'+v+' influence · +'+sc+' science', big:'+'+v+' ◎', line:pickLine(['Stolen gold returns to honest hands. Yours.','They will not raid again.','Every coin they stole, and then some.']), at}); }
    burst(at.x, at.y, 16, '#ffd36a');
  }
  else if(p.k==='tribe'){
    p.dead = true; const n = 4 + Math.min(4, G.eraIdx||0); joinBand(h, n); SFX.q && SFX.q('horn', h.x, h.y, .8);
    lootPop({tier:'epic', kick:'A lost tribe', title:pickLine(['They Kneel Before You!','A Tribe Swears Loyalty!','The Lost Ones Return!']), gain:'+'+n+' warriors join your band', big:'+'+n+' ⚔', line:pickLine(['“We have waited generations for a leader like you.”','Spears raised, they fall in behind your banner.','Your band grows. Your enemies should worry.']), at});
  }
  else if(p.k==='merc') openMerc(p, h);
  else if(p.k==='shrine'){
    if(p.st!=='ok'){ toast(SHRINE[p.sub].n+' recharges in '+Math.ceil(p.rt - G.t)+'s','warn',at); return; }
    p.st = 'cd'; p.rt = G.t + 150; const S0 = SHRINE[p.sub]; let gain = '';
    if(p.sub==='war'){ G.bless = {k:'war', t:G.t + 90}; gain = '+30% damage for 90 seconds'; }
    else if(p.sub==='life'){ for(const v of G.units) if(v.owner===PLAYER && v.hp>0 && (v.fol===h.id || v===h)) v.hp = uStat(v).hp; gain = 'Your hero and band are fully healed'; }
    else { const sc = Math.round(levelCost(G.level||0)*.3); G.sci += sc; gain = '+'+sc+' science'; }
    lootPop({tier:'epic', kick:'Blessing', title:S0.n, gain, line:p.sub==='war' ? 'Your warriors burn with holy fury!' : p.sub==='life' ? 'Wounds close. Weary soldiers stand tall again.' : 'Visions of the future flood your scholars’ minds.', at});
    fxAdd({k:'beam', x:at.x, y:at.y+.2, s:.7, h:4.5, life:1.4, max:1.4, col:S0.c});
  }
  else if(p.k==='wonder'){
    if(p.vis) return; p.vis = 1; G.stats.wonders = (G.stats.wonders||0) + 1;
    const sc = Math.round(levelCost(G.level||0)*.4), inf = Math.round(60*eraCash()); G.sci += sc; G.influence = Math.min(600, G.influence + inf);
    lootPop({tier:'legend', kick:'✦ Natural wonder discovered ✦', title:WONDER[p.sub].n, gain:'+'+sc+' science · +'+inf+' influence', big:'WONDER!', line:WONDER[p.sub].d+'. Claim it inside your borders!', at}); setTimeout(() => giveHint(at), 3600);
  }
}
function poiTick(dt){
  if(G.arena || G.demo || !G.pois) return;
  R.poiAcc = (R.poiAcc||0) + dt; if(R.poiAcc < .2) return; R.poiAcc = 0;
  const h = heroOf(PLAYER);
  const wm = {f:1, p:1, s:1};
  for(const p of G.pois){
    if(p.dead) continue;
    const o = G.own[idx(p.x, p.y)];
    if(p.k==='wonder'){ if(o===PLAYER){ wm[WONDER[p.sub].e] *= 1.15; if(!p.mine){ p.mine = 1; toast(WONDER[p.sub].n+' lies inside your borders. '+WONDER[p.sub].d,'good',{x:p.x+.5, y:p.y+.5}); } } else p.mine = 0; }
    else if(o && o!==PLAYER){ p.dead = true; for(const u of G.units) if(u.camp===p.id) u.camp = 0; continue; }
    if(p.k==='camp' && !p.armed && R.vis && R.vis[idx(p.x, p.y)]){ p.armed = 1; campGuards(p); }
    if(p.k==='shrine' && p.st==='cd' && G.t >= p.rt) p.st = 'ok';
    if(!h) { p.near = false; continue; }
    const near = (h.x-p.x-.5)**2 + (h.y-p.y-.5)**2 < (p.k==='wonder' ? 2.6 : 1.7);
    if(near && (!p.near || (p.k==='camp' && p.st==='loot'))) poiTouch(p, h);
    p.near = near;
  }
  R.wmul = wm;
  G.pois = G.pois.filter(p => !p.dead);
  if(G.t >= (G.poiT||70)){
    G.poiT = G.t + 45;
    if(G.pois.filter(p => p.k!=='wonder').length < 22){
      const w = [['ruins',3],['camp',3.2],['merc',1.3],['tribe',1.3],['shrine',.8]], tot = w.reduce((a,b) => a+b[1], 0); let r = Math.random()*tot, k = 'ruins';
      for(const [kk, ww] of w){ if((r -= ww) <= 0){ k = kk; break; } }
      addPoi(k);
    }
  }
  if(G.bless && G.t > G.bless.t) G.bless = null;
}

/* the find window: artifacts and mercenaries */
function openFind(o){
  modal = 'find'; R.openedAt = performance.now(); R.findO = o;
  const ov = $('#ovFind'); if(!ov || !ov.querySelector) return;
  { const sh = ov.querySelector('.sheet'); if(sh && sh.classList) sh.classList.toggle('legend', !!o.legend); }
  try {
  $('#findKick').textContent = o.kick || 'Discovery'; $('#findTitle').textContent = o.title || '';
  $('#findBody').innerHTML = o.body || '';
  const bt = $('#findBtns'); bt.innerHTML = (o.btns||[]).map((b,i) => '<button class="'+(b.cls||'primary')+'" data-i="'+i+'"'+(b.off ? ' disabled' : '')+'>'+esc(b.t)+'</button>').join('');
  [...bt.querySelectorAll('button')].forEach(el => el.addEventListener('click', () => { if(performance.now() - R.openedAt < 300) return; const b = o.btns[+el.dataset.i]; if(b && b.fn) b.fn(); }));
  if(o.swap) [...$('#findBody').querySelectorAll('[data-sw]')].forEach(el => el.addEventListener('click', () => { if(performance.now() - R.openedAt < 300) return; o.swap(+el.dataset.sw); }));
  } catch(e){}
  ov.hidden = false; SFX.open && SFX.open();
}
function closeFind(){ modal = null; const ov = $('#ovFind'); if(ov) ov.hidden = true; R.armyKey = ''; }
const artLoot = (k, big) => '<div class="loot'+(big ? ' big' : '')+'"><span class="cart artart'+(big ? ' relic' : '')+'"><img src="'+artImg(k)+'" alt=""'+(artHand(k) ? ' class="hand"' : '')+'></span><b>'+esc(ARTS[k].n)+'</b><span>'+esc(ARTS[k].d)+'</span></div>';
function rollArt(kind){
  const pool = Object.keys(ARTS).filter(k => !G.arts.includes(k)); if(!pool.length) return null;
  const w = pool.map(k => (META.arts.has(k) ? 1 : 2)*(kind && ART_SRC[k]===kind ? 3 : 1)), tot = w.reduce((a,b) => a+b, 0); let r = Math.random()*tot;
  for(let i=0;i<pool.length;i++) if((r -= w[i]) <= 0) return pool[i];
  return pool[pool.length-1];
}
function artTaken(k){
  if(k==='chart') for(const p of G.pois) reveal(p.x+.5, p.y+.5, 2.5);
  G.stats.arts = (G.stats.arts||0) + 1; R.heroArts = null; fogTick(); setTimeout(checkAch, 0);
}
function gainArt(src, kind){
  const k = rollArt(kind); if(!k){ G.influence = Math.min(600, G.influence + 100); toast('A relic you already carry: +100 influence','good'); return; }
  const fresh = !META.arts.has(k); META.arts.add(k); saveDisc();
  const h = heroOf(PLAYER); if(h){ ring(h.x, h.y, .2, 1.8, '#ffd36a', .9); burst(h.x, h.y-.5, 18, '#ffd36a'); }
  MUS.sting && MUS.sting('evo');
  if(G.arts.length < ART_CAP){
    G.arts.push(k); artTaken(k);
    openFind({legend:1, kick:'✦ '+src+' ✦', title:(fresh ? 'NEW! ' : '')+ARTS[k].n, body:artLoot(k, true)+'<p class="lnote">Your hero carries it for the rest of this game ('+G.arts.length+' of '+ART_CAP+'). '+(fresh ? 'It is now in your Collection.' : '')+'</p>', btns:[{t:'Take it', fn:closeFind}]});
    return;
  }
  openFind({kick:src+' · your hero can carry '+ART_CAP, title:ARTS[k].n, body:artLoot(k, true)+'<p class="lnote">Your hero’s pack is full. Tap an artifact to leave it behind and take this one, or leave this one for 100 influence.</p><div class="artswap">'+G.arts.map((a,i) => '<button class="card" data-sw="'+i+'"><img src="'+artImg(a)+'" alt=""><b>'+esc(ARTS[a].n)+'</b><span class="desc">'+esc(ARTS[a].d)+'</span></button>').join('')+'</div>',
    swap:i => { const old = G.arts[i]; G.arts[i] = k; artTaken(k); toast('Left the '+ARTS[old].n+' behind and took the '+ARTS[k].n,'good'); closeFind(); },
    btns:[{t:'Leave it (+100 influence)', cls:'secondary', fn:() => { G.influence = Math.min(600, G.influence + 100); closeFind(); }}]});
}
function openMerc(p, h){
  const cost = Math.round(55*eraCash()*(1 + .25*(G.stats.mercs||0))), n = 5 + Math.min(3, G.eraIdx||0), ok = G.influence >= cost;
  openFind({kick:'Mercenary camp', title:'Sellswords for hire', body:'<div class="loot big"><span class="cart artart"><img src="'+(MAPS.ok ? artURL('poiA_merc', () => mapPortrait('merc')) : artURL('poi_merc', () => poiSpr({k:'merc'}).n))+'" alt=""></span><b>'+n+' sellswords</b><span>They join your band and fight until they fall. They cost no upkeep.</span><em>Price: '+cost+' influence · you have '+Math.floor(G.influence)+'</em></div>',
    btns:[{t:ok ? 'Hire for '+cost+' influence' : 'Need '+cost+' influence', off:!ok, fn:() => { if(G.influence < cost) return; G.influence -= cost; joinBand(h, n, true); p.dead = true; G.stats.mercs = (G.stats.mercs||0) + 1; toast(n+' sellswords join your band','good',{x:p.x+.5, y:p.y+.5}); closeFind(); }}, {t:'Not now', cls:'secondary', fn:closeFind}]});
}

/* drawing */
function drawPois(x, vis){
  if(!G.pois) return;
  const now = R.now||0, chart = hasArt('chart');
  for(const p of G.pois){
    if(p.dead || !vis(p.x, p.y, 2)) continue;
    if(!G.seen[idx(p.x, p.y)] && !chart) continue;
    if(p.keep && p.st!=='loot' && kOk('poi_keep')){
      const im = TINTC.keep || (TINTC.keep = greenTint(KIMG.poi_keep, [196, 52, 40])), w = 3.1, hh = w*im.height/im.width, cx = p.x+.5, by = p.y+1.1;
      x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(cx, by-.12, w*.44, w*.13, 0, 0, 6.283); x.fill();
      x.imageSmoothingEnabled = true; x.drawImage(im, cx - w/2, by - hh, w, hh); x.imageSmoothingEnabled = false;
      continue;
    }
    const A = poiArt(p);
    if(A){
      const v = A.v, w = v[2]*KPOI*A.mul, hh = w*v[3]/v[2], cx = p.x+.5, by = p.y+.95;
      x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(cx, by-.08, w*.42, w*.12, 0, 0, 6.283); x.fill();
      const live = p.k==='shrine' ? p.st==='ok' : p.k==='wonder' ? !p.vis : p.k==='camp' ? p.st==='loot' : true;
      if(live){ const pl = .5 + .5*Math.sin(now*3 + p.id); x.globalAlpha = .25 + .3*pl; x.strokeStyle = p.k==='shrine' ? SHRINE[p.sub].c : '#ffd36a'; x.lineWidth = .06; x.beginPath(); x.ellipse(cx, by-.08, w*.55 + .1*pl, w*.18 + .04*pl, 0, 0, 6.283); x.stroke(); x.globalAlpha = 1; }
      x.imageSmoothingEnabled = CAM.z*dpr*KPOI < 1; x.drawImage(MAPS.img, v[0], v[1], v[2], v[3], cx - w/2, by - hh, w, hh); x.imageSmoothingEnabled = false;
      continue;
    }
    const s = poiSpr(p).n, w = (p.k==='wonder' ? 2 : 1.25), hh = w*s.height/s.width, cx = p.x+.5, by = p.y+.85;
    x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(cx, by, w*.42, w*.12, 0, 0, 6.283); x.fill();
    const live = p.k==='shrine' ? p.st==='ok' : p.k==='wonder' ? !p.vis : p.k==='camp' ? p.st==='loot' : true;
    if(live){ const pl = .5 + .5*Math.sin(now*3 + p.id); x.globalAlpha = .25 + .3*pl; x.strokeStyle = p.k==='shrine' ? SHRINE[p.sub].c : '#ffd36a'; x.lineWidth = .06; x.beginPath(); x.ellipse(cx, by, w*.55 + .1*pl, w*.18 + .04*pl, 0, 0, 6.283); x.stroke(); x.globalAlpha = 1; }
    if(p.k==='shrine' && p.st!=='ok') x.globalAlpha = .5;
    x.drawImage(s, cx - w/2, by - hh, w, hh);
    x.globalAlpha = 1;
    if(p.k==='camp' && p.st==='loot') drawChestIcon(x, cx, by - hh - .25, 1);
  }
}
function drawPoiLabels(x, sx, sy){
  if(!G.pois || CAM.z < 13 || G.demo) return;
  const chart = hasArt('chart');
  x.font = '600 11px "Barlow Semi Condensed", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'top'; x.lineWidth = 3;
  for(const p of G.pois){
    if(p.dead || (!G.seen[idx(p.x, p.y)] && !chart)) continue;
    const [px, py] = toScreen(p.x+.5, p.y+1.05); if(px < -60 || py < -20 || px > VW+60 || py > VH+20) continue;
    let t = poiName(p); if(p.k==='camp' && p.st==='loot') t = 'Loot'; if(p.k==='shrine' && p.st!=='ok') t += ' · '+Math.ceil(p.rt - G.t)+'s';
    x.strokeStyle = 'rgba(5,8,10,.9)'; x.strokeText(t, px+sx, py+sy); x.fillStyle = p.k==='camp' && p.st!=='loot' ? '#ff9a8a' : '#f3e6c8'; x.fillText(t, px+sx, py+sy);
  }
}
const POI_DOT = {ruins:'#d8c8a0', camp:'#ff5a46', merc:'#ffd36a', tribe:'#7ae08a', shrine:'#7ac8ff', wonder:'#ffffff'};
function drawPoiMini(m, s){
  if(!G.pois) return;
  const chart = hasArt('chart');
  for(const p of G.pois){
    if(p.dead || (!G.seen[idx(p.x, p.y)] && !chart)) continue;
    const c = p.k==='camp' && p.st==='loot' ? '#ffd36a' : p.k==='shrine' ? SHRINE[p.sub].c : POI_DOT[p.k], r = (p.k==='wonder' ? 2.6 : 1.9)*dpr;
    m.fillStyle = 'rgba(0,0,0,.7)'; m.fillRect((p.x+.5)*s - r/2 - dpr*.6, (p.y+.5)*s - r/2 - dpr*.6, r + dpr*1.2, r + dpr*1.2);
    m.fillStyle = c; m.fillRect((p.x+.5)*s - r/2, (p.y+.5)*s - r/2, r, r);
  }
}
