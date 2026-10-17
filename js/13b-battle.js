"use strict";
/* ---------- Field battles you can read ----------
   Rival generals call their banners and ride out to meet a host that marches on their cities. Every general's
   band holds a battle line: the front line stays in front, archers stay behind it, riders work the flanks, and
   nobody chases across the map. Counters call themselves out, a badge over each block shows who has the edge,
   the battle bar lists the matchups, and a short card after each big battle says which line beat which.
   Fighting inside your own borders gives +15% damage (home ground), for you and for them.
   Hooks: heroAI -> rivalMuster; followerTarget / nationStep -> lineLeash; strike -> homeMul, batNote;
   battleTick -> batBegin / batClose; render and arDraw -> drawBattleBadges; hud -> batSumHud. */

/* does line a beat line b in the counter web */
function beats(a, b){
  const A = CARDS[a], B = CARDS[b]; if(!A || !B) return false;
  const pr = WEB[A.tags[0]]; if(pr && pr.some(g => B.tags.includes(g))) return true;
  if(A.pierce && B.tags.includes('Titan')) return true;
  return !!(A.tags[0]==='Ranged' && B.fly);
}
const HOME_MUL = 1.15;
const homeMul = u => (!G || G.arena || G.demo || u.owner <= 0 || G.own[tileAt(u.x, u.y)] !== u.owner) ? 1 : HOME_MUL;

/* ---- the battle line: how far from its place in the line a soldier will go for a target ---- */
const LEASH = {guard:2.4, titan:2.4, rider:5, archer:1.6, siege:1.2, support:3};
function lineLeash(u, h){
  let L = LEASH[u.kind] ?? 2.4;
  if(u.kind==='archer' || u.kind==='siege') L += uStat(u).rng;
  const front = u.kind==='guard' || u.kind==='titan';
  if(h.owner===PLAYER){ const o = G.order||'charge'; if(o==='charge') L += front ? 1.6 : .6; else if(o==='hold') L -= .6; }
  else L += front ? 1.4 : .5;
  return L;
}
/* is target v inside soldier u's reach from his place in the line (or already on him) */
function inLine(u, h, v, sl, L){ const s = sl || bandSlot(u, h); return (v.x-s.x)**2 + (v.y-s.y)**2 < (L ?? lineLeash(u, h))**2 || (v.x-u.x)**2 + (v.y-u.y)**2 < 1.69; }

/* ---- rival generals call their banners and meet an invading host in the field ---- */
const MUS_R = 11, MUS_CD = 70;
function hostBand(h){ return h ? ((R.bandC && R.bandC.get(h.id)) || 0) : 0; }
function rivalBanners(u, own){
  const keep = new Set();
  for(const c of citiesOf(own)){ let b = null, bd = 30; for(const v of G.units){ if(v.owner!==own || v.hp<=0 || !v.card || v.hero || v.fol===u.id || v.kind==='siege') continue; const d = (v.x-c.x-.5)**2 + (v.y-c.y-.5)**2; if(d < bd){ bd = d; b = v; } } if(b) keep.add(b); }
  let n = 0;
  for(const v of G.units){
    if(v.owner!==own || v.hp<=0 || !v.card || v.hero || v.levy || keep.has(v) || v.fol===u.id) continue;   // levies never leave their walls
    if((v.x-u.x)**2 + (v.y-u.y)**2 > 576) continue;
    v.fol = u.id; v.gar = 0; v.tgt = 0; v.tcity = 0; v.fmT = G.t + 20; v.rout = 0; n++;
  }
  return n;
}
function rivalMuster(u, own){
  if(G.demo || G.arena || own <= 1){ u.mus = null; return false; }
  const r = rival(own); if(!r || !r.alive || r.hold || r.vassal || !atWar(PLAYER, own)){ u.mus = null; return false; }
  const ph = heroOf(PLAYER), pb = hostBand(ph);
  let tc = null, td = 1e9;
  if(ph && pb >= 5) for(const c of G.cities){ if(c.owner!==own || c.dead) continue; const d = Math.hypot(c.x+.5-ph.x, c.y+.5-ph.y); if(d < td){ td = d; tc = c; } }
  let M = u.mus;
  const threat = tc && td < (M ? MUS_R + 5 : MUS_R);
  if(!threat){
    if(!M) return false;
    if(G.t - M.seen > 14){ u.mus = null; return false; }
    const c = G.cities.find(k => k.id===M.c && k.owner===own && !k.dead); if(!c){ u.mus = null; return false; }
    u.goal = {x:c.x+.5, y:c.y+1.2}; u.tcity = 0; return true;
  }
  if(!M){
    if(G.t < (r.musCd||0) || u.hp < uStat(u).hp*.45) return false;
    r.musCd = G.t + MUS_CD;
    const got = rivalBanners(u, own), band = G.units.filter(v => v.fol===u.id && v.hp > 0).length;
    M = u.mus = {t0:G.t, seen:G.t, c:tc.id, n:band, toast:0};
    u.err = null;
    if(got >= 3){ const H = HEROES[u.hero] || {};
      toast('⚑ '+u.name+' calls the '+r.name+' banners: '+band+' troops march out to meet your host'+(H.act ? '. Watch for his '+H.act : ''), 'warn', {x:u.x, y:u.y, watch:true});
      SFX.q && SFX.q('horn', u.x, u.y, .8); }
  }
  M.seen = G.t; M.c = tc.id;
  const band = G.units.filter(v => v.fol===u.id && v.hp > 0);
  let near = 0; for(const v of band) if((v.x-u.x)**2 + (v.y-u.y)**2 < 30) near++;
  const dh = Math.hypot(ph.x-u.x, ph.y-u.y);
  // too weak to take the field: stand under the city's towers instead
  const weak = band.length < pb*.55 && band.length < 10;
  if(weak){ u.goal = {x:tc.x+.5, y:tc.y+1}; u.tcity = 0; return true; }
  if(dh < 4.5){ u.goal = null; u.tcity = 0; return true; }   // in the fight: let him pick his own targets
  if(dh < 7.5){ u.goal = {x:ph.x, y:ph.y}; u.tcity = 0; return true; }
  // gather first between the city and the invader, then march out together
  const mx = tc.x+.5 + (ph.x - tc.x - .5)*.35, my = tc.y+.5 + (ph.y - tc.y - .5)*.35;
  if(near < band.length*.65 && G.t - M.t0 < 16){ u.goal = {x:mx, y:my}; u.tcity = 0; return true; }
  u.goal = {x:ph.x, y:ph.y}; u.tcity = 0; return true;
}

/* ---- the battle in progress: who is hitting whom, and the counters called out ---- */
function batNote(u, t, dmg){
  if(!G || G.demo || !(dmg > 0) || !u.card || !t.card || u.hero || t.hero || t.owner <= 0) return;
  const mine = u.owner===PLAYER, theirs = t.owner===PLAYER;
  if(!mine && !theirs && !G.arena) return;
  if(!G.arena){ const B = R.bat; if(B && G.t - (B.last||0) < 3){ const k = mine ? u.card+'|'+t.card : t.card+'|'+u.card, e = B.mx[k] || (B.mx[k] = {o:0, i:0}); if(mine) e.o += dmg; else e.i += dmg; } }
  if(!beats(u.card, t.card) || !onScr(t.x, t.y)) return;
  const k = 'cn:'+u.owner+':'+u.card+':'+t.card, now = R.now||0; if(!R.mvT) R.mvT = {};
  if((R.mvT[k]||0) > now) return; R.mvT[k] = now + 3.2;
  const good = mine || (G.arena && u.owner===1);
  float(good ? '▲ '+cardName(u.owner, u.card)+' counter' : '▼ '+cardName(u.owner, u.card)+' counter', t.x, t.y - 1.05, good ? '#a8f07a' : '#ff9a7a', 1.3);
  ring(t.x, t.y, .1, .8, good ? '#a8f07a' : '#ff9a7a', .4);
}
/* matchups on the field right now: [[mine, theirs, who has the edge]] */
function batMatchups(B, h){
  const RR = 7.5, mine = {}, th = {};
  for(const u of G.units){ if(u.hp<=0 || !u.card || u.hero || (u.x-h.x)**2 + (u.y-h.y)**2 > RR*RR) continue; if(u.owner===PLAYER) mine[u.card] = (mine[u.card]||0) + 1; else if(u.owner===B.o) th[u.card] = (th[u.card]||0) + 1; }
  const out = [];
  for(const a in mine) for(const b in th){ const up = beats(a, b), dn = beats(b, a); if(up !== dn) out.push({a, b, up, w:mine[a]*th[b]}); }
  out.sort((p, q) => (q.up - p.up) || (q.w - p.w));
  const ups = out.filter(m => m.up).slice(0, 2), dns = out.filter(m => !m.up).slice(0, 2);
  return ups.concat(dns);
}
function batBegin(b){
  b.mx = {}; b.hp0 = 0;
  const r = rival(b.o); if(!r || b.n0 < 8 || G.t - (R.batBanT||-99) < 45) return;
  R.batBanT = G.t; const h = heroOf(PLAYER); if(!h) return;
  const ms = batMatchups(b, h), up = ms.find(m => m.up), dn = ms.find(m => !m.up);
  const sub = up ? 'Your '+cardName(PLAYER, up.a)+' beat their '+cardName(b.o, up.b) : dn ? 'Their '+cardName(b.o, dn.b)+' beat your '+cardName(PLAYER, dn.a) : 'No line has the edge. It comes down to numbers';
  banner('Battle of '+b.name, sub);
  SFX.q && SFX.q('horn', h.x, h.y, 1); MUS.sting && MUS.sting('war');
}
/* the battle is over (or moved on): say what happened, line against line */
function batClose(B){
  if(!B || B.closed || G.demo || G.arena) return; B.closed = true;
  const dur = (B.last||G.t) - B.t0; if(dur < 6) return;
  const rows = Object.entries(B.mx||{}).map(([k, e]) => { const [a, b] = k.split('|'); return {a, b, o:e.o, i:e.i}; }).filter(e => e.o + e.i > 60);
  if(!rows.length) return;
  rows.sort((p, q) => (q.o + q.i) - (p.o + p.i));
  const r = rival(B.o), h = heroOf(PLAYER);
  const won = B.broken || B.v > .62 || (B.nE||0) <= 1, lost = !h || B.v < .36 || (B.nU||0) <= 1;
  const res = won && !lost ? 'Victory' : lost && !won ? 'Defeat' : 'Hard fought';
  const sm = rows.slice(0, 3).map(e => { const k = e.o > e.i*1.35 ? 'beat' : e.i > e.o*1.35 ? 'lost to' : 'traded blows with'; return {a:e.a, b:e.b, k, o:Math.round(e.o), i:Math.round(e.i), cnt:beats(e.a, e.b) ? 1 : beats(e.b, e.a) ? -1 : 0}; });
  R.batSum = {t:performance.now(), res, name:B.name, foe:r ? r.name : 'the enemy', col:r ? r.col : '#c66', o:B.o, rows:sm};
  (G.batLog || (G.batLog = [])).push({t:Math.round(G.t), res, name:B.name, foe:r ? r.name : '', rows:sm});
  if(G.batLog.length > 12) G.batLog.shift();
  R.batSumKey = '';
}
function batSumHud(){
  const el = document.getElementById('batSum'); if(!el || !el.classList) return;
  const S = R.batSum, pn = performance.now();
  if(!S || !G || G.demo || G.arena || modal==='end' || pn - S.t > 9500){ if(!el.hidden){ el.hidden = true; el.innerHTML = ''; } return; }
  if(R.batSumKey === S.t) return; R.batSumKey = S.t;
  const ic = (o, id) => { const s = troopImg(id, Math.min(8, cardLevel(o, id)||1)); return s ? '<img src="'+s+'" alt="">' : ''; };
  el.innerHTML = '<div class="bs-h"><b class="'+(S.res==='Victory' ? 'w' : S.res==='Defeat' ? 'l' : '')+'">'+esc(S.res)+'</b><span>Battle of '+esc(S.name)+' · against the '+esc(S.foe)+'</span></div>'+
    S.rows.map(e => '<div class="bs-r '+(e.k==='beat' ? 'w' : e.k==='lost to' ? 'l' : '')+'">'+ic(PLAYER, e.a)+'<span>Your <b>'+esc(cardName(PLAYER, e.a))+'</b> '+e.k+' their <b style="color:'+S.col+'">'+esc(cardName(S.o, e.b))+'</b>'+(e.cnt > 0 ? ' <i class="up">▲ counter</i>' : e.cnt < 0 ? ' <i class="dn">▼ countered</i>' : '')+'</span>'+ic(S.o, e.b)+'<small>'+e.o+' dealt · '+e.i+' taken</small></div>').join('');
  el.hidden = false; el.onclick = () => { R.batSum = null; el.hidden = true; };
}
/* the matchup strip inside the battle bar */
function batChips(B){
  const h = heroOf(PLAYER); if(!h) return '';
  if(!B.chT || G.t - B.chT > 1){ B.chT = G.t; B.ch = batMatchups(B, h); }
  if(!B.ch || !B.ch.length) return '';
  const ic = (o, id) => { const s = troopImg(id, Math.min(8, cardLevel(o, id)||1)); return s ? '<img src="'+s+'" alt="">' : ''; };
  return '<div class="bmx">'+B.ch.map(m => '<span class="'+(m.up ? 'up' : 'dn')+'" title="'+esc((m.up ? 'Your '+cardName(PLAYER, m.a)+' beat their '+cardName(B.o, m.b) : 'Their '+cardName(B.o, m.b)+' beat your '+cardName(PLAYER, m.a)))+'">'+ic(PLAYER, m.a)+'<i>'+(m.up ? '▶' : '◀')+'</i>'+ic(B.o, m.b)+'</span>').join('')+'</div>';
}

/* ---- a badge over every block in a battle: what it is, and whether it has the edge ---- */
function drawBattleBadges(x, us, z, px, arena){
  const cs = arena ? 4.5 : 2.8, cells = new Map();
  for(const u of us){
    if(!u.card || u.hero || u.owner <= 0 || u.hp <= 0 || u.air > 0) continue;
    if(!arena && !(u.tgt || u.eng || u.wnd)) continue;
    const k = u.owner+':'+u.card+':'+Math.floor(u.x/cs)+','+Math.floor(u.y/cs); let c = cells.get(k);
    if(!c){ c = {o:u.owner, id:u.card, x:0, y:0, n:0, top:1e9}; cells.set(k, c); }
    c.x += u.x; c.y += u.y; c.n++; c.top = Math.min(c.top, u.y);
  }
  const L = [...cells.values()].filter(c => c.n >= (arena ? 3 : 2)); if(!L.length) return;
  for(const c of L){ c.x /= c.n; c.y /= c.n; c.up = false; c.dn = false; }
  for(const a of L) for(const b of L){ if(a.o===b.o || (a.x-b.x)**2 + (a.y-b.y)**2 > 42) continue; if(beats(a.id, b.id)) a.up = true; if(beats(b.id, a.id)) a.dn = true; }
  const r = 12*px, top = arena ? 1 : PLAYER; let drawn = 0;
  x.save();
  for(const c of L){
    if(drawn++ > 40) break;
    const cx = c.x, cy = c.top - .95 - r, mine = c.o===top, col = arena ? (c.o===1 ? '#f4b84a' : '#6ea8f7') : mine ? '#ffe3a3' : ocol(c.o);
    x.globalAlpha = .9; x.fillStyle = 'rgba(8,10,14,.82)'; x.beginPath(); x.arc(cx, cy, r, 0, 6.283); x.fill();
    const ic = squadIcon(c.id, Math.min(8, cardLevel(c.o, c.id)||1));
    if(ic && ic.width){ const s0 = r*1.75, w = s0*ic.width/Math.max(ic.width, ic.height), h = s0*ic.height/Math.max(ic.width, ic.height); x.save(); x.beginPath(); x.arc(cx, cy, r*.9, 0, 6.283); x.clip(); x.imageSmoothingEnabled = false; x.drawImage(ic, cx - w/2, cy - h/2, w, h); x.restore(); }
    x.globalAlpha = 1; x.strokeStyle = col; x.lineWidth = 2.2*px; x.beginPath(); x.arc(cx, cy, r, 0, 6.283); x.stroke();
    // the edge: a green up-arrow when this block faces a line it beats, a red down-arrow when it faces its counter
    const tri = (dx, up, fill) => { const s = 5.5*px, ax = cx + dx, ay = cy - r*.55; x.fillStyle = fill; x.strokeStyle = 'rgba(5,8,10,.95)'; x.lineWidth = 1.5*px; x.beginPath(); if(up){ x.moveTo(ax, ay - s); x.lineTo(ax + s, ay + s*.6); x.lineTo(ax - s, ay + s*.6); } else { x.moveTo(ax, ay + s); x.lineTo(ax + s, ay - s*.6); x.lineTo(ax - s, ay - s*.6); } x.closePath(); x.stroke(); x.fill(); };
    if(c.up) tri(r*.95, true, '#8fe86a');
    if(c.dn) tri(c.up ? -r*.95 : r*.95, false, '#ff6a5a');
  }
  x.restore(); x.globalAlpha = 1;
}
