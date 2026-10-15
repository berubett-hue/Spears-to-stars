"use strict";
/* ---------- The Red Horde: a rare barbarian empire ----------
   In about one game in three, a horde nation rises in the wilds a few minutes in: a great tent capital,
   two tent towns and the Great Khan. Until its capital burns it sends raiding parties at your cities.
   It is built from barbarian camps (guards, loot pile, hero walks in to burn it), so it never counts as
   a rival and never blocks a victory. Burning the capital breaks the Horde and pays out a big prize. */
const HORDE_CHANCE = .35, HORDE_RAID = 42;
const HORDE_ART = {cap:'art/horde/horde_capital.webp', town:'art/horde/horde_town.webp', tower:'art/horde/horde_tower.webp'};
const HORDE_PIC = 'art/horde/ev_horde.webp', HORDE_KHAN = 'art/horde/horde_khan.webp', HORDE_FLAG = 'art/horde/horde_banner.webp';
const HIMG = {};
atBoot(function(){ if(typeof Image === 'undefined') return; for(const k in HORDE_ART){ try { const im = new Image(); im.src = HORDE_ART[k]; HIMG[k] = im; } catch(e){} } });
const hordeOk = k => HIMG[k] && HIMG[k].complete && HIMG[k].naturalWidth > 0;
const hordePoi = p => p && p.horde;

function hordeInit(){
  G.horde = null;
  if(G.demo || G.arena || G.diff===0) return;
  if(Math.random() < HORDE_CHANCE) G.hordeAt = 240 + Math.random()*120;
}
function hordeSite(){
  const cap = capitalOf(PLAYER); let best = null, bs = -1e9;
  for(let n=0;n<600;n++){
    const x = 5+rint(N-10), y = 5+rint(N-10), i = idx(x,y), t = G.ter[i];
    if(t===WATER || t===MOUNT || G.own[i]) continue;
    let dc = 1e9; for(const c of G.cities) dc = Math.min(dc, Math.hypot(c.x-x, c.y-y));
    if(dc < 7) continue;
    let dp = 1e9; for(const p of (G.pois||[])) dp = Math.min(dp, Math.hypot(p.x-x, p.y-y));
    for(const s of (G.sites||[])) dp = Math.min(dp, Math.hypot(s.x-x, s.y-y));
    if(dp < 4) continue;
    const dh = cap ? Math.hypot(cap.x-x, cap.y-y) : 20;
    const sc = Math.min(dc, 12) + Math.min(dh, 26)*.4 + Math.random()*2;
    if(sc > bs){ bs = sc; best = {x, y}; }
  }
  return best;
}
function hordeTownSpot(cx, cy, taken){
  for(let n=0;n<80;n++){
    const a = Math.random()*6.283, d = 3.5 + Math.random()*1.8, x = Math.round(cx + Math.cos(a)*d), y = Math.round(cy + Math.sin(a)*d);
    if(x < 2 || y < 2 || x > N-3 || y > N-3) continue; const t = G.ter[idx(x,y)];
    if(t===WATER || t===MOUNT || G.own[idx(x,y)]) continue;
    if(taken.some(q => Math.hypot(q.x-x, q.y-y) < 3)) continue;
    return {x, y};
  }
  return null;
}
function hordeRise(){
  const s = hordeSite(); if(!s){ G.hordeAt = null; return; }
  const cap = {id:G.nid++, k:'camp', x:s.x, y:s.y, st:'ok', t:G.t, big:true, horde:'cap', armed:1};
  const pts = [cap], towns = [];
  for(let k=0;k<2;k++){ const q = hordeTownSpot(s.x, s.y, pts); if(!q) continue; const p = {id:G.nid++, k:'camp', x:q.x, y:q.y, st:'ok', t:G.t, big:true, horde:k ? 'tower' : 'town', armed:1}; pts.push(p); towns.push(p); }
  pts.forEach(p => G.pois.push(p));
  G.horde = {cap:cap.id, towns:towns.map(p => p.id), t0:G.t, next:G.t + 30, refill:G.t + 25, broken:false, max:0};
  hordeGuards(cap); towns.forEach(hordeGuards);
  G.horde.max = G.units.filter(u => u.camp===cap.id && u.hp > 0).length;
  reveal(s.x+.5, s.y+.5, 6); fogTick && fogTick();
  bigMoment({tier:'legend', kick:'A horde nation rises', title:'The Red Horde', sub:'Their raiders will hit your cities until you burn the Khan’s capital', col:'#e0473b', img:HORDE_PIC, at:{x:s.x+.5, y:s.y+.5}});
  toast('The Red Horde has risen in the '+dirTo(s)+'. Burn their capital to stop the raids and claim the Khan’s hoard','bad',{x:s.x+.5, y:s.y+.5});
  SFX.warn && SFX.warn(); R.shake = Math.min(6, (R.shake||0) + 3);
}
const dirTo = s => { const c = capitalOf(PLAYER); if(!c) return 'wilds'; const dx = s.x - c.x, dy = s.y - c.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north'); };
function hordeGuard(p, kd, hx, hy, mul){
  spawnBarb(kd, clamp(hx, .5, N-.5), clamp(hy, .5, N-.5), mul);
  const b = G.units[G.units.length-1]; b.camp = p.id; b.hx = hx; b.hy = hy; return b;
}
function hordeGuards(p){
  const cap = p.horde==='cap';
  const kinds = cap ? ['warlord','brute','brute','brute','brute','warband','warband','warband','warband','warband','warband','raider','raider','raider','raider']
                    : ['brute','brute','warband','warband','warband','warband','raider','raider'];
  kinds.forEach((kd, j) => {
    const a = j/kinds.length*6.283, r = j ? (cap ? 1.7 : 1.3) : .2, b = hordeGuard(p, kd, p.x+.5+Math.cos(a)*r, p.y+.5+Math.sin(a)*r, cap ? (j ? 1.7 : 2.4) : 1.5);
    if(cap && !j){ b.name = 'The Great Khan'; b.chief = 1; b.khan = 1; }
    else if(!cap && !j){ b.hp *= 2; b.max *= 2; b.dmg *= 1.4; b.chief = 1; }
  });
}
function hordeTick(dt){
  if(G.demo || G.arena) return;
  if(!G.horde){ if(G.hordeAt && G.t >= G.hordeAt && !G.decline && !G.ended){ G.hordeAt = null; hordeRise(); } return; }
  const H = G.horde; if(H.broken) return;
  const cap = G.pois.find(p => p.id===H.cap && !p.dead);
  if(!cap || cap.st!=='ok'){ H.broken = true; return; }
  // the Khan's guard refills while no one stands at his gates
  const guards = G.units.filter(u => u.camp===cap.id && u.hp > 0).length;
  const near = G.units.some(u => u.owner===PLAYER && u.hp > 0 && (u.x-cap.x-.5)**2 + (u.y-cap.y-.5)**2 < 81);
  if(G.t >= H.refill){ H.refill = G.t + 22; if(!near && guards < H.max){ const a = Math.random()*6.283; hordeGuard(cap, Math.random() < .3 ? 'brute' : 'warband', cap.x+.5+Math.cos(a)*1.6, cap.y+.5+Math.sin(a)*1.6, 1.7); } }
  if(G.t >= H.next && citiesOf(PLAYER).length){
    H.next = G.t + HORDE_RAID*(G.decline ? .7 : 1);
    let nb = 0; for(const u of G.units) if(u.owner===0 && u.hp>0) nb++;
    const live = [cap, ...H.towns.map(id => G.pois.find(p => p.id===id && !p.dead && p.st==='ok')).filter(Boolean)];
    const from = live[rint(live.length)], mins = (G.t - H.t0)/60;
    const n = Math.min(Math.max(0, 250 - nb), Math.round((4 + 1.6*Math.min(6, mins) + live.length)*DF().barb));
    if(n <= 0) return;
    for(let k=0;k<n;k++){
      const a = Math.random()*6.283, d = 1.5 + Math.random()*1.5;
      spawnBarb(k===0 && mins > 2 ? 'brute' : pickType(G.t), clamp(from.x+.5+Math.cos(a)*d, .5, N-.5), clamp(from.y+.5+Math.sin(a)*d, .5, N-.5), 1.1);
      const b = G.units[G.units.length-1]; b.hr = 1;
    }
    const tgt = nearestMine(from.x, from.y);
    toast('The Red Horde sends '+n+' raiders'+(tgt ? ' toward '+tgt.name : ''),'warn',{x:from.x+.5, y:from.y+.5});
  }
}
function nearestMine(x, y){ let best = null, bd = 1e9; for(const c of G.cities){ if(c.dead || c.owner!==PLAYER) continue; const d = (c.x-x)**2 + (c.y-y)**2; if(d < bd){ bd = d; best = c; } } return best; }
/* the hero walks into a burned Horde camp */
function hordeLoot(p, h){
  const at = {x:p.x+.5, y:p.y+.5}; p.dead = true;
  G.stats.camps = (G.stats.camps||0) + 1; lifeAdd('camps'); lifeAdd('holds');
  const cap = p.horde==='cap', v = Math.round((cap ? 160 : 80)*eraCash()); G.influence = Math.min(600, G.influence + v);
  const n = (cap ? 7 : 4) + Math.min(3, G.eraIdx||0), before = G.units.length; joinBand(h, n, true);
  for(let k=before;k<G.units.length;k++){ const u = G.units[k]; if(u.owner===PLAYER && u.merc){ u.elite = 1; u.hp = uStat(u).hp; ring(u.x, u.y, .1, .8, '#ffd36a', .7); } }
  SFX.q && SFX.q('horn', h.x, h.y, .9); burst(at.x, at.y, 22, '#ff9a52');
  if(cap){
    G.stats.horde = (G.stats.horde||0) + 1; if(G.horde) G.horde.broken = true;
    for(const u of G.units) if(u.hr && u.hp > 0){ u.hr = 0; }
    bigMoment({tier:'legend', kick:'✦ The Red Horde is broken ✦', title:'The Khan’s Hoard', sub:'+'+n+' elite riders join your band · +'+v+' influence · a War Chest', col:'#e0473b', img:HORDE_KHAN, at});
    earnChest('You burned the capital of the Red Horde');
    gainArt('Taken from the Great Khan’s tent', 'hold');
    setTimeout(() => { try { giveHint(at); } catch(e){} }, 3600);
  } else {
    lootPop({tier:'legend', kick:'✦ A Horde town burns ✦', title:'Their Champions Kneel!', gain:'+'+n+' elite troops join your band · +'+v+' influence', big:'+'+n+' ★', line:'The Horde grows weaker. Their capital still sends raiders until it burns.', at});
  }
}
function hordeGoals(){
  const H = G && G.horde; if(!H || H.broken) return [];
  const cap = G.pois.find(p => p.id===H.cap && !p.dead); if(!cap) return [];
  const left = G.units.filter(u => u.camp===cap.id && u.hp > 0).length, mx = Math.max(H.max, left);
  return [{id:'horde', ic:'u_raid', img:HORDE_FLAG, name:'Burn the Red Horde', d:left ? left+' of the Khan’s guard still stand' : 'Their capital is open: walk your hero in to burn it', v:mx - left, g:mx}];
}
/* drawing helper for drawPois: returns true when it drew the camp */
function hordeDraw(x, p){
  const k = p.horde; if(!hordeOk(k)) return false;
  const im = HIMG[k], w = k==='cap' ? 3.6 : 2.7, hh = w*im.height/im.width, cx = p.x+.5, by = p.y+1.15;
  x.fillStyle = 'rgba(0,0,0,.32)'; x.beginPath(); x.ellipse(cx, by-.12, w*.44, w*.14, 0, 0, 6.283); x.fill();
  x.imageSmoothingEnabled = true; x.drawImage(im, cx - w/2, by - hh, w, hh); x.imageSmoothingEnabled = false;
  return true;
}
