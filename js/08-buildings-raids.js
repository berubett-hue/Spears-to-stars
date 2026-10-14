"use strict";
/* ---------- Buildings ---------- */
/* Each tech adds its own building around every city; terrain improvements and houses fill the rest */
const TBLD = [
  ['granary','Granary','pottery','granary',{f:2,cap:1}],
  ['watchtower','Watchtower','archery','tower',{tower:1}],
  ['stable','Stable','horse','stable',{mil:1}],
  ['barracks','Barracks','bronze','barracks',{mil:1}],
  ['library','Library','writing','library',{s:2}],
  ['school','School','math','univ',{s:1.5}],
  ['market','Market','currency','market',{p:1,i:.2}],
  ['academy','Academy','philo','univ',{s:2.5}],
  ['courthouse','Courthouse','laws','univ',{i:.3,cap:1}],
  ['smithy','Smithy','iron','workshop',{p:1,mil:1}],
  ['aqueduct','Aqueduct','construction','aqueduct',{cap:2}],
  ['workshop','Workshop','engineering','workshop',{p:2}],
  ['keep','Keep','feudal','castle',{mil:1}],
  ['tiltyard','Tiltyard','chivalry','stable',{mil:1}],
  ['fletcher','Fletcher','crossbow','workshop',{mil:1,tw:1}],
  ['siegeworks','Siege Works','siegecraft','barracks',{mil:1}],
  ['castle','Castle','castles','castle',{tw:1}],
  ['guildhall','Guild Hall','guilds','bank',{p:3}],
  ['observatory','Observatory','astro','observatory',{s:3}],
  ['printhouse','Printing House','press','library',{s:2,i:.3}],
  ['powdermill','Powder Mill','gunpowder','workshop',{mil:1}],
  ['armory','Armory','pikes','barracks',{mil:1}],
  ['foundry','Foundry','metallurgy','factory',{p:3}],
  ['shipyard','Shipyard','nav','dock',{f:2,water:1}],
  ['bank','Bank','banking','bank',{p:2,i:.5}],
  ['hospital','Hospital','medicine','hospital',{cap:2}],
  ['factory','Factory','industry','factory',{p:6}],
  ['milacademy','Military Academy','conscription','barracks',{mil:2}],
  ['arsenal','Arsenal','rifling','factory',{mil:1,p:1}],
  ['station','Rail Station','rail','station',{p:3,f:2}],
  ['powerplant','Power Plant','electric','power',{p:8}],
  ['bunker','Bunker','trenches','bunker',{tower:1}],
  ['radar','Radar Station','radar','radar',{tw:1}]
];
const BDEF = {}; TBLD.forEach(([k,n,tech,arch,e]) => BDEF[k] = {n, tech, arch, e});
const BK = [null,'house','farm','mine','lumber','dock', ...TBLD.map(b => b[0]), 'launch'];
const TERRAIN_TECH = {farm:'agri', mine:'mining', lumber:'bronze', dock:'sailing'};
const N4 = [[1,0],[-1,0],[0,1],[0,-1]];
const archOf = k => BDEF[k] ? BDEF[k].arch : k;
function clearTile(i){
  if(G.bmap[i]){ G.bmap[i] = 0; R.bdirty = true; burst(i%N+.5, ((i/N)|0)+.5, 8, '#6c6862'); }
  G.own[i] = 0; R.dirty = true;
}
function rebuildB(){
  R.cb = new Map(); R.towers = []; R.pmil = 0;
  const byOwner = {};
  for(const c of G.cities) (byOwner[c.owner] = byOwner[c.owner] || []).push(c);
  for(let i=0;i<N*N;i++){
    const k = G.bmap[i]; if(!k) continue;
    const o = G.own[i]; if(!o){ G.bmap[i] = 0; continue; }
    const tx = i%N, ty = (i/N)|0;
    let best = 1e9, bc = null;
    for(const c of (byOwner[o]||[])){ const d = Math.abs(c.x-tx)+Math.abs(c.y-ty); if(d<best){ best=d; bc=c; } }
    if(!bc) continue;
    let m = R.cb.get(bc.id); if(!m){ m = {}; R.cb.set(bc.id, m); }
    const nm = BK[k]; m[nm] = (m[nm]||0) + 1;
    const df = BDEF[nm];
    if(df && df.e.tower) R.towers.push([i, nm==='bunker' ? 1.3 : .6]);
    if(df && df.e.mil && o===PLAYER) R.pmil += df.e.mil;
  }
  R.bdirty = false;
}
const hasTech = (o, id) => (BYID[id] ? BYID[id].era : 0) <= (o===PLAYER ? G.eraIdx : rEra());
function findBTile(c, k){
  const o = c.owner, arch = archOf(k);
  const isTower = k==='watchtower' || k==='bunker';
  const water = k==='dock' || (BDEF[k] && BDEF[k].e.water);
  let best = -1e9, bi = -1;
  for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++){
    const x = c.x+dx, y = c.y+dy; if(!inb(x,y) || (dx===0 && dy===0)) continue;
    const i = idx(x,y); if(G.own[i]!==o || G.bmap[i]) continue;
    if(G.cities.some(q => q.x===x && q.y===y)) continue;
    const t = G.ter[i], d = Math.max(Math.abs(dx), Math.abs(dy));
    let sc;
    if(water){ if(t!==WATER || !N4.some(([a,b]) => inb(x+a,y+b) && G.ter[idx(x+a,y+b)]!==WATER)) continue; sc = -d; }
    else if(t===WATER) continue;
    else if(k==='farm'){ if(t!==GRASS && t!==PLAINS && t!==DESERT) continue; sc = -Math.abs(d-2) + (t===GRASS ? 1 : 0); }
    else if(k==='mine'){ if(t!==HILLS && t!==MOUNT) continue; sc = -d; }
    else if(k==='lumber'){ if(t!==FOREST) continue; sc = -d; }
    else if(t===MOUNT) continue;
    else if(isTower){
      if(d<2) continue;
      const edge = N4.some(([a,b]) => !inb(x+a,y+b) || G.own[idx(x+a,y+b)]!==o);
      let near = 0; for(const [ti] of R.towers) if(Math.abs(ti%N-x)<=2 && Math.abs(((ti/N)|0)-y)<=2) near++;
      sc = d + (edge ? 3 : 0) + (t===HILLS ? 2 : 0) - near*4;
    } else {
      sc = -d*2 + (k==='house' && d===1 ? 2 : 0) + (t===GRASS || t===PLAINS ? .5 : 0) + (t===FOREST ? -.5 : 0);
      if(arch==='aqueduct' || arch==='station') sc += d===2 ? 2 : 0;
    }
    sc += Math.random()*.3;
    if(sc > best){ best = sc; bi = i; }
  }
  return bi;
}
function chooseBuilding(c){
  const o = c.owner, m = R.cb.get(c.id) || {};
  const doc = o===PLAYER ? G.doctrine : {warlike:'defend', mercantile:'expand', scholarly:'build'}[rival(o).trait];
  let threat = false;
  for(const u of G.units){ if(u.hp>0 && atWar(o,u.owner) && Math.abs(u.x-c.x)<8 && Math.abs(u.y-c.y)<8){ threat = true; break; } }
  const opts = [], add = (k,w) => { if(w>0) opts.push([k,w]); };
  let tw = 0;
  for(const [k,,tech,,e] of TBLD){
    if(!hasTech(o, tech)) continue;
    if(e.tw) tw += e.tw;
    if(k==='watchtower') continue;
    if(m[k]) continue;
    const econ = e.f || e.p || e.s || e.i || e.cap;
    add(k, 6*(econ && doc==='build' ? 1.5 : 1)*(e.mil && doc==='defend' ? 1.5 : 1)*(e.tower && threat ? 2 : 1));
  }
  if(hasTech(o,'archery') && (m.watchtower||0) < 1 + tw) add('watchtower', (doc==='defend' ? 4 : 2)*(threat ? 2.5 : 1));
  if((m.house||0) < Math.min(12, Math.ceil(c.pop/1.5)+1)) add('house', doc==='expand' ? 3 : 2.2);
  for(const k in TERRAIN_TECH) if(hasTech(o, TERRAIN_TECH[k])) add(k, k==='farm' ? (doc==='expand' ? 1.8 : 1.2) : 1);
  while(opts.length){
    const tot = opts.reduce((a,b) => a+b[1], 0); let r = Math.random()*tot, j = 0;
    for(;j<opts.length;j++){ if((r -= opts[j][1]) <= 0) break; }
    j = Math.min(j, opts.length-1);
    const k = opts[j][0], i = findBTile(c, k);
    if(i >= 0) return {k, i};
    opts.splice(j, 1);
  }
  return null;
}
function constructBuildings(dt){
  if(R.bdirty) rebuildB();
  const re = rEra();
  for(const c of G.cities){
    const prod = c.owner===PLAYER ? (c.prod || 3) : (2 + c.pop*1.1)*(1 + .3*re);
    c.bp = (c.bp || 0) + prod*.5*dt*(c.owner===PLAYER && G.doctrine==='build' ? 1.4 : 1);
    const m = R.cb.get(c.id) || {}; let nb = 0; for(const k in m) nb += m[k];
    const cost = 50*Math.pow(1 + .25*nb, 1.15);
    if(c.bp < cost) continue;
    const ch = chooseBuilding(c);
    if(!ch){ c.bp = cost; continue; }
    c.bp -= cost;
    G.bmap[ch.i] = BK.indexOf(ch.k); R.bnew.set(ch.i, G.t);
    const bx = ch.i%N+.5, by = ((ch.i/N)|0)+.6;
    burst(bx, by, 6, '#b8a888');
    if(c.owner===PLAYER && BDEF[ch.k] && CAM.z >= Math.min(VW, VH)/15) float(BDEF[ch.k].n, bx, by-.9, '#ffd98a', 1.3);
    rebuildB();
  }
}
function paintBuilding(k, pal, tier){
  const c = mkCanvas(16,16), g = c.getContext && c.getContext('2d');
  if(!g || !g.fillRect) return c;
  const P = (x,y,w,h,col) => { g.fillStyle = col; g.fillRect(x,y,w,h); };
  const cone = (x, y, w) => { for(let i=0; w-2*i>0; i++) P(x+i, y-i, w-2*i, 1, i%2 ? pal.C : pal.c); };
  if(k==='farm'){
    for(let y=2;y<15;y+=3){ P(1,y,14,2, ((y/3)|0)%2 ? '#b8a040' : '#7a9a3a'); P(1,y+2,14,1,'#4a3a20'); }
    P(0,1,1,15,'#6a4a28'); P(15,1,1,15,'#6a4a28'); P(0,1,16,1,'#6a4a28');
  } else if(k==='mine'){
    P(2,7,12,7,'#5c544c'); P(3,6,10,1,'#6c645a'); P(2,13,12,1,'#3c3630');
    P(6,8,4,5,'#120c08'); P(5,7,1,6,'#94602e'); P(10,7,1,6,'#94602e'); P(5,7,6,1,'#94602e');
    P(11,12,4,2,'#6c7680'); P(11,14,1,1,'#120c08'); P(14,14,1,1,'#120c08'); P(12,11,2,1,'#d8b84a');
    P(3,9,1,1,'#d8b84a'); P(12,8,1,1,'#d8b84a');
  } else if(k==='lumber'){
    P(2,11,2,2,'#7a5a34'); P(2,11,2,1,'#c8a070'); P(12,12,2,2,'#7a5a34'); P(12,12,2,1,'#c8a070');
    P(5,10,8,2,'#8a5a2c'); P(6,8,6,2,'#a06a34'); P(5,10,1,2,'#d8b080'); P(6,8,1,2,'#d8b080'); P(12,10,1,2,'#d8b080'); P(11,8,1,2,'#d8b080');
    P(3,5,1,4,'#6a4a28'); P(2,4,3,1,'#c4ccd4');
  } else if(k==='dock'){
    P(0,6,11,3,'#7a5230'); for(let x=1;x<11;x+=2) P(x,6,1,3,'#5a3a1c');
    P(2,9,1,3,'#5a3a1c'); P(8,9,1,3,'#5a3a1c');
    P(9,12,6,2,'#6a4426'); P(10,14,4,1,'#4a2e18'); P(12,5,1,7,'#5a3a1c'); P(13,6,2,4,pal.L);
  } else if(k==='house'){
    const wall = ['#8a6a44','#8a867c','#8a4a3a'][tier], wall2 = ['#6a4e30','#66625a','#6a3428'][tier];
    const h = (x, by, w, hh) => {
      const top = by-hh;
      P(x,top,w,hh,wall); P(x,by-1,w,1,wall2); P(x+Math.floor(w/2),by-2,1,2,'#24160c');
      P(x+1,top+1,1,1,'#ffd36a'); if(w>=5) P(x+w-2,top+1,1,1,'#ffd36a');
      if(hh>=5){ P(x+1,top+3,1,1,'#ffd36a'); P(x+w-2,top+3,1,1,'#ffd36a'); }
      for(let i=0;;i++){ const x0=x-1+i, x1=x+w+1-i, row=top-1-i; if(x1-x0<=0) break; const half=Math.ceil((x1-x0)/2); P(x0,row,half,1,pal.C); P(x0+half,row,x1-x0-half,1,pal.c); }
    };
    const hh = tier===2 ? 6 : tier===1 ? 4 : 3;
    h(1,11,5,hh); h(8,15,6,hh);
  } else if(k==='library'){
    P(2,14,12,1,'#7a766c'); P(3,8,10,6,'#c8c0a8'); for(let x=4;x<12;x+=2) P(x,9,1,5,'#9a927c');
    P(2,7,12,1,'#a8a090'); P(5,5,6,2,pal.C); P(6,4,4,1,pal.C); P(7,3,2,1,pal.L); P(7,11,2,3,'#24160c');
  } else if(k==='market'){
    const stall = (x,y) => { P(x,y,5,2,pal.C); P(x+1,y,1,2,'#f0e8d8'); P(x+3,y,1,2,'#f0e8d8'); P(x,y+2,1,4,'#6a4a28'); P(x+4,y+2,1,4,'#6a4a28'); P(x,y+4,5,1,'#8a6a44'); P(x+1,y+3,1,1,'#d8b84a'); P(x+3,y+3,1,1,'#b84a3a'); };
    stall(1,4); stall(9,8); P(6,12,3,2,'#8a5a2c'); P(6,12,3,1,'#a06a34');
  } else if(k==='barracks'){
    P(1,8,14,6,'#7a6a58'); P(1,13,14,1,'#5a4c3e'); P(0,6,16,2,pal.c); P(1,5,14,1,pal.C);
    P(7,10,2,4,'#24160c'); P(3,10,1,1,'#ffd36a'); P(12,10,1,1,'#ffd36a');
    P(13,0,1,6,'#3a2a18'); P(14,0,2,3,pal.C);
  } else if(k==='tower'){
    P(4,13,8,2,'#66625a'); P(5,4,6,10,'#8a867c'); P(9,4,2,10,'#66625a');
    P(5,3,1,1,'#8a867c'); P(7,3,1,1,'#8a867c'); P(9,3,1,1,'#8a867c');
    P(5,2,6,1,pal.C); P(6,1,4,1,pal.C); P(7,0,2,1,pal.L);
    P(7,6,2,1,'#ffd36a'); P(7,10,1,2,'#24160c');
  } else if(k==='univ'){
    P(1,14,14,1,'#7a766c'); P(2,8,12,6,'#d0c8b0'); for(let x=3;x<13;x+=2) P(x,9,1,5,'#a8a090');
    for(let i=0;i<4;i++) P(2+i, 7-i, 12-i*2, 1, pal.C);
    P(7,11,2,3,'#24160c');
  } else if(k==='factory'){
    P(1,7,14,7,'#7a3e2e'); P(1,13,14,1,'#5a2a1e');
    for(let x=1;x<15;x+=4){ P(x,5,3,2,'#5a5a62'); P(x+3,6,1,1,'#3a3a42'); }
    P(11,0,2,7,'#5a2e22'); P(11,0,2,1,'#3a1a12');
    for(let x=2;x<14;x+=3) P(x,9,2,2,'#ffd36a');
    P(6,11,3,3,'#24160c');
  } else if(k==='granary'){
    P(4,4,8,10,'#b8a888'); P(10,4,2,10,'#958670'); P(4,8,8,1,'#8a7a60');
    P(5,2,6,2,pal.C); P(6,1,4,1,pal.C); P(4,4,8,1,pal.c);
    P(7,11,2,3,'#24160c'); P(12,12,3,2,'#d8c8a0'); P(1,12,3,2,'#d8c8a0');
  } else if(k==='stable'){
    P(1,7,14,7,'#8a4a2a'); P(1,13,14,1,'#5a2e18'); P(0,5,16,2,pal.c); P(2,4,12,1,pal.C);
    P(3,9,4,5,'#3a2010'); P(9,9,4,5,'#3a2010'); P(4,10,2,1,'#c8a070'); P(10,10,2,1,'#c8a070'); P(4,12,2,1,'#c8a070'); P(10,12,2,1,'#c8a070');
    P(13,9,2,2,'#7e4c28'); P(14,8,1,1,'#4c2c16');
  } else if(k==='workshop'){
    P(2,8,12,6,'#7a6a58'); P(2,13,12,1,'#5a4c3e'); P(1,6,14,2,pal.c); P(2,5,12,1,pal.C);
    P(11,1,2,5,'#5a4c3e'); P(4,9,3,3,'#c4ccd4'); P(5,10,1,1,'#120c08'); P(4,9,1,1,'#7a6a58'); P(6,11,1,1,'#7a6a58');
    P(10,9,2,2,'#ffd36a'); P(8,11,2,3,'#24160c');
  } else if(k==='aqueduct'){
    P(0,4,16,3,'#a8a090'); P(0,4,16,1,'#5fa0d0'); P(0,7,16,1,'#8a8478');
    for(const x of [1,7,13]) P(x,8,2,7,'#a8a090');
    P(3,8,4,1,'#8a8478'); P(9,8,4,1,'#8a8478'); P(0,14,16,1,'#6a665e');
  } else if(k==='castle'){
    P(3,5,10,9,'#8a867c'); P(10,5,3,9,'#66625a');
    for(let x=3;x<13;x+=2) P(x,4,1,1,'#8a867c');
    P(0,4,3,10,'#7a766c'); P(13,4,3,10,'#7a766c'); cone(0,3,3); cone(13,3,3);
    P(7,10,2,4,'#24160c'); P(5,7,1,1,'#ffd36a'); P(10,7,1,1,'#ffd36a'); P(7,7,2,1,'#ffd36a');
    P(7,0,1,4,'#3a2a18'); P(8,0,2,2,pal.C); P(0,14,16,1,'#4c4844');
  } else if(k==='bank'){
    P(1,14,14,1,'#7a766c'); P(2,7,12,7,'#e0d8c0'); for(let x=3;x<13;x+=2) P(x,8,1,5,'#b8b098');
    for(let i=0;i<3;i++) P(2+i*2, 6-i, 12-i*4, 1, '#d8b84a');
    P(2,13,12,1,pal.C); P(7,10,2,3,'#24160c');
  } else if(k==='observatory'){
    P(3,9,10,5,'#c8c0a8'); P(3,13,10,1,'#9a927c'); P(4,6,8,3,'#9aa8b8'); P(5,5,6,1,'#9aa8b8'); P(6,4,4,1,'#9aa8b8'); P(10,6,2,3,'#7a8898');
    P(8,4,1,3,'#24160c'); P(9,2,2,2,'#6c7680'); P(7,11,2,2,'#24160c'); P(4,10,1,1,'#ffd36a'); P(11,10,1,1,'#ffd36a'); P(3,8,10,1,pal.C);
  } else if(k==='hospital'){
    P(2,6,12,8,'#e8e4dc'); P(11,6,3,8,'#c8c4bc'); P(1,5,14,1,pal.C);
    P(7,7,2,4,'#4aa860'); P(6,8,4,2,'#4aa860'); P(3,8,1,1,'#ffd36a'); P(12,8,1,1,'#ffd36a'); P(3,11,1,1,'#ffd36a'); P(7,12,2,2,'#24160c');
  } else if(k==='station'){
    P(0,13,16,1,'#6c7680'); P(0,15,16,1,'#6c7680'); for(let x=0;x<16;x+=2) P(x,14,1,1,'#5a3a1c');
    P(1,6,10,6,'#8a4a3a'); P(0,5,12,1,pal.C); P(5,7,2,2,'#f0e8d8'); P(2,9,1,1,'#ffd36a'); P(9,9,1,1,'#ffd36a');
    P(11,9,5,3,'#3a3a42'); P(15,10,1,1,'#ffd36a'); P(12,8,1,1,'#3a3a42');
  } else if(k==='power'){
    P(1,9,9,5,'#6a6e78'); P(1,9,9,1,pal.C); P(3,11,1,1,'#ffd36a'); P(6,11,1,1,'#ffd36a');
    [[11,4,4],[11,5,4],[11,6,3],[11,7,3],[11,8,3],[10,9,5],[10,10,5],[10,11,5],[10,12,5],[10,13,5]].forEach(([x,y,w]) => P(x,y,w,1,'#a8acb4'));
    P(14,4,1,10,'#8a8e96');
  } else if(k==='bunker'){
    P(2,10,12,4,'#6c6a62'); P(3,9,10,1,'#7c7a72'); P(5,11,6,1,'#120c08'); P(1,13,14,1,'#a8946c'); P(1,12,2,1,'#a8946c'); P(13,12,2,1,'#a8946c');
    P(12,5,1,4,'#3a2a18'); P(13,5,2,2,pal.C);
  } else if(k==='radar'){
    P(5,11,6,3,'#6c7680'); P(7,6,2,5,'#9aa0a8'); P(4,3,8,3,'#c4ccd4'); P(5,2,6,1,'#c4ccd4'); P(7,4,2,1,'#6c7680'); P(8,1,1,1,'#ff5040'); P(5,13,6,1,pal.C);
  } else if(k==='launch'){
    P(1,13,14,2,'#6c6a62'); P(2,3,2,10,'#9a9aa0'); P(2,5,4,1,'#9a9aa0'); P(2,9,4,1,'#9a9aa0');
    P(7,3,3,10,'#e8e8f0'); P(8,1,1,2,'#e8e8f0'); P(6,10,1,3,pal.C); P(10,10,1,3,pal.C); P(7,6,3,1,pal.C); P(8,4,1,1,'#6ea8f7');
  }
  return c;
}
function drawWalls(x, c){
  const L = c.x-1+.04, T = c.y-1+.04, Rt = c.x+2-.04, B = c.y+2-.04, th = .12;
  const seg = (x0,y0,w,h) => { x.fillStyle = '#2e2c28'; x.fillRect(x0-.03,y0-.03,w+.06,h+.06); x.fillStyle = '#8a867c'; x.fillRect(x0,y0,w,h); };
  seg(L,T,1.15,th); seg(L+1.85,T,Rt-L-1.85,th); seg(L,B-th,1.15,th); seg(L+1.85,B-th,Rt-L-1.85,th);
  seg(L,T,th,1.15); seg(L,T+1.85,th,B-T-1.85); seg(Rt-th,T,th,1.15); seg(Rt-th,T+1.85,th,B-T-1.85);
  x.fillStyle = '#6a665e';
  [[L,T],[Rt,T],[L,B],[Rt,B]].forEach(([px,py]) => x.fillRect(px-.16, py-.16, .32, .32));
}
function noteFight(x,y){ R.fights.set(((x/4)|0)+','+((y/4)|0), {x, y, t:R.now}); }

/* ---------- Raids ---------- */
function lordSpot(){
  const mine = citiesOf(PLAYER), cap = capitalOf(PLAYER); if(!cap) return null;
  for(let k=0;k<40;k++){
    const a = Math.random()*6.283; let x = cap.x+.5, y = cap.y+.5;
    for(let d=0; d<40; d+=.7){
      x = cap.x+.5+Math.cos(a)*d; y = cap.y+.5+Math.sin(a)*d;
      if(x < 1 || y < 1 || x > N-1 || y > N-1) break;
      const i = idx(Math.floor(x), Math.floor(y)), o = G.own[i];
      if(o > 1) break;
      if(!o && G.ter[i]!==WATER && mine.every(c => Math.hypot(c.x-x, c.y-y) > 8)) return [x, y];
    }
  }
  return null;
}
function edgePoint(side,pos,inset){
  pos = clamp(pos,.5,N-.5);
  if(side===0) return [pos, inset+.2];
  if(side===1) return [N-.2-inset, pos];
  if(side===2) return [pos, N-.2-inset];
  return [inset+.2, pos];
}
function pickType(t){
  const w = [['raider',3]];
  if(t>40) w.push(['warband',3]);
  if(t>180) w.push(['brute',1.2+t/400]);
  if(t>360) w.push(['ram',1]);
  let tot = w.reduce((a,b)=>a+b[1],0), r = Math.random()*tot;
  for(const [k,v] of w){ if((r-=v) <= 0) return k; }
  return 'raider';
}
function waves(){
  if(!G.warn && G.t >= G.nextWave-5){
    G.warn = {side:rint(4), pos:6+Math.random()*(N-12)};
    const p = edgePoint(G.warn.side, G.warn.pos, 2);
    toast('Raiders gather to the '+DIRS[G.warn.side], 'warn', {x:p[0], y:p[1]});
    SFX.warn();
  }
  if(G.warn && G.t >= G.nextWave){
    const t = G.t;
    let nb = 0; for(const u of G.units) if(u.owner===0 && u.hp>0) nb++;
    const n = Math.min(Math.max(4, (G.decline ? 320 : 260)-nb), Math.floor((2 + t/38 + Math.pow(t/250,2)) * G.waveBoost * (G.coal ? 1.4 : 1) * DF().barb));
    G.waveBoost = 1;
    for(let k=0;k<n;k++){ const p=edgePoint(G.warn.side, G.warn.pos+rnd(-5,5), rnd(0,1.5)); spawnBarb(pickType(t), p[0], p[1]); }
    for(const u of G.units) if(u.fod && u.hp > 0 && t - (u.bt||0) > 110){ u.hp = 0; u.dead = true; }
    { const F = 1 + t/420, room = Math.max(0, (G.decline ? 300 : 240) - nb - n), extra = Math.min(room, 60, Math.floor(n*(F - 1)*1.6));
      for(let k=0;k<extra;k++){ const p=edgePoint(G.warn.side, G.warn.pos+rnd(-7,7), rnd(0,2.5)); spawnBarb(Math.random() < .6 ? 'raider' : (t > 40 ? 'warband' : 'raider'), p[0], p[1], 1/(F*1.6)); const b = G.units[G.units.length-1]; b.dmg *= .7; b.fod = 1; b.bt = t; } }
    G.warn = null;
    G.nextWave = t + Math.max(8, 20 - t*.012);
  }
  for(const B of BOSSES){
    if(G.t >= B.t && !G.bosses[B.t]){
      G.bosses[B.t] = 1;
      banner(B.great ? 'The Great Horde' : 'Warlord', 'Raid'); SFX.warn(); R.shake = 5;
      let first = null;
      for(let k=0;k<B.n;k++){
        const side=rint(4), p=(!B.great && k===0 && lordSpot()) || edgePoint(side, rnd(8,N-8), .5);
        spawnBarb('warlord', p[0], p[1], B.great ? 2.5 : 1);
        if(!first) first = {x:p[0], y:p[1]};
        if(B.great) for(let j=0;j<60;j++){ const q=edgePoint((side+rint(3)+3)%4, rnd(2,N-2), rnd(0,2)); spawnBarb(pickType(G.t), q[0], q[1]); }
      }
      toast(B.msg, 'bad', first);
    }
  }
  if(G.t >= (G.nextLord || 220) && G.t < 1000){
    G.nextLord = G.t + rnd(160, 200);
    if(!BOSSES.some(B => Math.abs(B.t - G.t) < 60)){
      const side = rint(4), p = lordSpot() || edgePoint(side, rnd(8,N-8), .5);
      spawnBarb('warlord', p[0], p[1], .7 + G.t/900);
      for(let j=0;j<10;j++) spawnBarb(pickType(G.t), clamp(p[0]+rnd(-3,3), .5, N-.5), clamp(p[1]+rnd(-3,3), .5, N-.5));
      banner('Warlord', 'Raid'); toast('A Warlord rises in the wilds beyond your borders. Slay it for a War Chest','bad',{x:p[0],y:p[1]}); SFX.warn();
    }
  }
  if(G.t > 1000 && G.t - (G.lastHorde || 840) > 200){
    G.lastHorde = G.t; banner('The Great Horde', 'Raid'); SFX.warn(); R.shake = 5;
    const side = rint(4), p = edgePoint(side, rnd(8,N-8), .5);
    spawnBarb('warlord', p[0], p[1], 2.5 + (G.t-840)/300);
    for(let j=0;j<60;j++){ const q = edgePoint((side+rint(3)+3)%4, rnd(2,N-2), rnd(0,2)); spawnBarb(pickType(G.t), q[0], q[1]); }
    toast('Another Great Horde pours out of the dark', 'bad', {x:p[0], y:p[1]});
  }
}
