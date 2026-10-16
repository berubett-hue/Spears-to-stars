"use strict";
/* ---------- Resource sites: six places on the map worth fighting over ----------
   One of each kind per game, set in the open ground between nations. A site belongs to whoever's
   borders cover it; outside any border, troops that hold it alone for a few seconds take it.
   The holder gets the bonus: the player through computeStats, rivals as extra troop damage. */
const RES = {
  iron:  {n:'Iron Mine',      d:'+15% troop damage',                    e:{solDmg:.15}},
  horses:{n:'Horse Pastures', d:'+20% mounted damage and speed, +6% speed for all troops', e:{riderDmg:.2, riderSpd:.2, solSpd:.06}},
  gold:  {n:'Gold Vein',      d:'+30% influence',                       e:{infl:.3}},
  stone: {n:'Stone Quarry',   d:'+30% city health, +40% city repair',   e:{cityhp:.3, regen:.4}},
  fields:{n:'Fertile Fields', d:'+20% food, +1 population in every city', e:{food:.2, popCap:1}},
  relic: {n:'Ancient Relic',  d:'+18% science',                         e:{sci:.18}}
};
const RES_KEYS = Object.keys(RES), RES_HOLD = 4, RES_R = 1.8, RES_GRACE = 150;
const resArt = k => 'art/resources/res_'+k+'.webp', resIcon = k => 'art/resources/ri_'+k+'.png';
const RESIMG = {};
atBoot(function(){ if(typeof Image === 'undefined') return; RES_KEYS.forEach(k => { try { const a = new Image(); a.src = resArt(k); const b = new Image(); b.src = resIcon(k); RESIMG[k] = a; RESIMG['i_'+k] = b; } catch(e){} }); });
const resOk = k => RESIMG[k] && RESIMG[k].complete && RESIMG[k].naturalWidth > 0;
/* the factions that can hold a site: you and living rivals (never strongholds, the Horde or barbarians) */
const resFaction = o => o===PLAYER || (o > 1 && G.rivals[o-2] && G.rivals[o-2].alive);

function placeSites(){
  G.sites = []; G.siteN = {};
  if(G.demo || G.arena) return;
  const pts = [];
  for(const k of shuffle(RES_KEYS.slice())){
    let best = null, bs = -1e9;
    for(let n=0;n<400;n++){
      const x = 3+rint(N-6), y = 3+rint(N-6), i = idx(x,y), t = G.ter[i];
      if(t===WATER || t===MOUNT || G.own[i]) continue;
      let dc = 1e9; for(const c of G.cities) dc = Math.min(dc, Math.hypot(c.x-x, c.y-y));
      if(dc < 6.5) continue;
      let dp = 1e9; for(const p of (G.pois||[])) dp = Math.min(dp, Math.hypot(p.x-x, p.y-y));
      if(dp < 2.5) continue;
      let ds = 1e9; for(const q of pts) ds = Math.min(ds, Math.hypot(q.x-x, q.y-y));
      // contested ground: not deep in the wilds, not on anyone's doorstep, spread apart
      const sc = -Math.abs(dc - 9)*1.2 + Math.min(ds, 16)*.8 + Math.random()*2;
      if(sc > bs){ bs = sc; best = {x, y}; }
    }
    if(best){ pts.push(best); G.sites.push({k, x:best.x, y:best.y, owner:0, who:0, prog:0}); }
  }
}
/* city founding leans toward unclaimed sites, so rivals race you for them */
function resPull(x, y){
  if(!G || !G.sites) return 0; let v = 0;
  for(const s of G.sites){ const d = Math.hypot(s.x-x, s.y-y); if(d < .5) return -6; if(d <= 2.3 && !s.owner) v += 2; }
  return v;
}
function siteTick(dt){
  if(!G.sites || !G.sites.length) return;
  let changed = false;
  for(const s of G.sites){
    const bo = G.own[idx(s.x, s.y)];
    let nu = s.owner;
    if(s.owner && !resFaction(s.owner)) nu = 0;            // its holder fell
    // an unclaimed site inside someone's borders becomes theirs (after the opening, so you can race for them)
    if(!nu && bo && resFaction(bo) && G.t > RES_GRACE){ nu = bo; s.prog = 0; s.who = 0; }
    else {
      const cx = s.x+.5, cy = s.y+.5, here = new Set(); let barb = false;
      for(const u of G.units){ if(u.hp<=0 || u.merc) continue; if((u.x-cx)**2 + (u.y-cy)**2 > RES_R*RES_R) continue; if(u.owner===0) barb = true; else if(resFaction(u.owner)) here.add(u.owner); }
      if(here.size===1 && !barb && (here.has(PLAYER) || G.t > RES_GRACE)){ const f = [...here][0]; if(f !== nu){ if(s.who !== f){ s.who = f; s.prog = 0; } s.prog += dt; if(s.prog >= (f===PLAYER ? RES_HOLD : RES_HOLD*1.5)){ nu = f; s.prog = 0; s.who = 0; } } else { s.prog = 0; s.who = 0; } }
      else if(barb && !here.size && nu){ if(s.who !== -1){ s.who = -1; s.prog = 0; } s.prog += dt; if(s.prog >= RES_HOLD*1.5){ nu = 0; s.prog = 0; s.who = 0; } }
      else { s.prog = Math.max(0, s.prog - dt); if(!s.prog) s.who = 0; }
    }
    if(nu !== s.owner){ siteChange(s, s.owner, nu); s.owner = nu; changed = true; }
  }
  if(changed){ G.siteN = {}; for(const s of G.sites) if(s.owner) G.siteN[s.owner] = (G.siteN[s.owner]||0) + 1; refreshStats(); R.resKey = ''; }
}
function siteChange(s, from, to){
  const D = RES[s.k], at = {x:s.x+.5, y:s.y+.5}; if(to > 1) try { rRenAdd(to, 30); } catch(e){}
  if(to===PLAYER){
    banner(D.n, 'Resource secured', resIcon(s.k)); SFX.found && SFX.found();
    toast(D.n+' is yours: '+D.d, 'good', at); G.stats.sites = (G.stats.sites||0) + 1;
  } else if(from===PLAYER){
    toast(to ? 'The '+rival(to).name+' took your '+D.n+'. Take it back to regain '+D.d.toLowerCase() : 'Raiders overran your '+D.n+'. Retake it', 'warn', at);
  } else if(to && fogSee(at.x, at.y)) toast('The '+rival(to).name+' claim the '+D.n, '', at);
}
function siteEffects(add){ for(const s of (G.sites||[])) if(s.owner===PLAYER) add(RES[s.k].e); }
const siteDmg = o => 1 + .05*((G && G.siteN && G.siteN[o]) || 0);

/* ---- drawing ---- */
const RES_TINT = {};
function resTinted(k, o){
  const col = o ? ocol(o) : '#b9b2a2', key = k+col; if(RES_TINT[key]) return RES_TINT[key];
  if(!resOk(k)) return null; return RES_TINT[key] = greenTint(RESIMG[k], hexRgb(col));
}
function drawSites(x, vis){
  if(!G.sites) return;
  const chart = hasArt('chart'), now = R.now||0;
  for(const s of G.sites){
    if(!vis(s.x, s.y, 2) || (!G.seen[idx(s.x, s.y)] && !chart)) continue;
    const im = resTinted(s.k, s.owner); if(!im) continue;
    const w = 2.25, hh = w*im.height/im.width, cx = s.x+.5, by = s.y+1.05;
    x.fillStyle = 'rgba(0,0,0,.3)'; x.beginPath(); x.ellipse(cx, by-.12, w*.42, w*.13, 0, 0, 6.283); x.fill();
    const pl = .5 + .5*Math.sin(now*2.4 + s.x);
    x.globalAlpha = .3 + .3*pl; x.strokeStyle = s.owner ? ocol(s.owner) : '#ffd36a'; x.lineWidth = .07; x.beginPath(); x.ellipse(cx, by-.12, w*.55, w*.18, 0, 0, 6.283); x.stroke(); x.globalAlpha = 1;
    x.imageSmoothingEnabled = true; x.drawImage(im, cx - w/2, by - hh, w, hh); x.imageSmoothingEnabled = false;
    if(s.prog > 0 && s.who){ const f = clamp(s.prog/(s.who===PLAYER ? RES_HOLD : RES_HOLD*1.5), 0, 1); x.strokeStyle = s.who===-1 ? '#e0473b' : ocol(s.who); x.lineWidth = .14; x.beginPath(); x.arc(cx, by - hh - .3, .3, -1.571, -1.571 + 6.283*f); x.stroke(); }
  }
}
function drawSiteLabels(x, sx, sy){
  if(!G.sites || CAM.z < 13 || G.demo) return;
  const chart = hasArt('chart');
  x.font = '600 11px "Barlow Semi Condensed", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'top'; x.lineWidth = 3;
  for(const s of G.sites){
    if(!G.seen[idx(s.x, s.y)] && !chart) continue;
    const [px, py] = toScreen(s.x+.5, s.y+1.15); if(px < -80 || py < -20 || px > VW+80 || py > VH+20) continue;
    const t = RES[s.k].n + (s.owner===PLAYER ? ' · yours' : s.owner ? ' · '+rival(s.owner).name : '');
    x.strokeStyle = 'rgba(5,8,10,.9)'; x.strokeText(t, px+sx, py+sy); x.fillStyle = s.owner===PLAYER ? '#ffe3a3' : s.owner ? '#f3e6c8' : '#bfe8ff'; x.fillText(t, px+sx, py+sy);
  }
}
function drawSiteMini(m, s0){
  if(!G.sites) return; const chart = hasArt('chart');
  for(const s of G.sites){
    if(!G.seen[idx(s.x, s.y)] && !chart) continue;
    const r = 3*dpr, X = (s.x+.5)*s0, Y = (s.y+.5)*s0;
    m.fillStyle = 'rgba(0,0,0,.75)'; m.beginPath(); m.moveTo(X, Y-r-dpr); m.lineTo(X+r+dpr, Y); m.lineTo(X, Y+r+dpr); m.lineTo(X-r-dpr, Y); m.fill();
    m.fillStyle = s.owner ? ocol(s.owner) : '#bfe8ff'; m.beginPath(); m.moveTo(X, Y-r); m.lineTo(X+r, Y); m.lineTo(X, Y+r); m.lineTo(X-r, Y); m.fill();
  }
}
/* ---- HUD strip: every site you have seen, lit when it is yours; tap to look at it ---- */
function resHud(){
  const el = $('#resRow'); if(!el || !el.querySelector || !G || !G.sites) return;
  const chart = hasArt('chart'), seen = G.sites.filter(s => G.seen[idx(s.x, s.y)] || chart);
  const key = seen.map(s => s.k+s.owner).join(',');
  if(key === R.resKey || holdUI()) return; R.resKey = key;
  el.hidden = !seen.length;
  el.innerHTML = seen.map(s => '<button class="resb'+(s.owner===PLAYER ? ' on' : '')+'" data-x="'+s.x+'" data-y="'+s.y+'" title="'+RES[s.k].n+': '+RES[s.k].d+(s.owner===PLAYER ? ' (yours)' : s.owner ? ' (held by the '+rival(s.owner).name+')' : ' (unclaimed)')+'"><img src="'+resIcon(s.k)+'" alt=""></button>').join('');
  el.querySelectorAll('.resb').forEach(b => b.addEventListener('click', () => { CAM.x = +b.dataset.x + .5; CAM.y = +b.dataset.y + .5; R.camFree = true; }));
}
