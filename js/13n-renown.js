"use strict";
/* ---------- Renown: your general grows from his own deeds ----------
   Kills near him, rival generals and Warlords slain, and cities taken with him at the gates earn Renown.
   Three ranks a game. Each rank offers two boons: one sharpens his ability, one suits his kind of general.
   Picking never pauses the game: his rank badge glows on his card until you choose. */
const REN_AT = [0, 100, 260, 480];
const REN_ROLE = {legate:'tank', maharaja:'tank', warden:'tank', khan:'fast', goldkhan:'fast', jarl:'fast', warcry:'lead', oracle:'lead', doge:'lead', engineer:'lead', ranger:'lead'};
const REN_GEN = {
  tank:[{k:'hide', n:'Iron Hide', d:'+25% health'}, {k:'recover', n:'Unbroken', d:'Returns from a fall twice as fast'}, {k:'second', n:'Second Wind', d:'Once per life, at a quarter health he heals half'}],
  fast:[{k:'blade', n:'Blademaster', d:'+25% damage'}, {k:'stride', n:'Outrider', d:'He and his band move 15% faster'}, {k:'second', n:'Second Wind', d:'Once per life, at a quarter health he heals half'}],
  lead:[{k:'muster', n:'Warmaster', d:'His gathering circle reaches 1.5 tiles farther and his band deals +10% damage'}, {k:'recover', n:'Unbroken', d:'Returns from a fall twice as fast'}, {k:'legend', n:'Living Legend', d:'His presence reaches half again as far'}]
};
const renAbil = (r, act) => [null, {k:'swift', n:'Swift '+act, d:act+' recharges 30% faster'}, {k:'mighty', n:'Mighty '+act, d:act+' is half again as strong'}, {k:'echo', n:act+' Echo', d:act+' strikes a second time two seconds later'}][r];
const hasRen = k => !!(G && !G.arena && G.ren && G.ren.got && G.ren.got.includes(k));
const renRank = () => (G && G.ren) ? G.ren.rank : 0;
function renOpts(r){
  const H = HEROES[G.perk] || HEROES.legion, role = REN_ROLE[H.aura] || 'lead';
  return [renAbil(r, H.act), REN_GEN[role][r-1]];
}
/* earn Renown */
function renAdd(n, why, at){
  if(!G || G.demo || G.arena || !n) return;
  const P = G.ren || (G.ren = {v:0, rank:0, got:[], pend:0});
  if(P.rank + P.pend >= 3) return;
  P.v += n;
  while(P.rank + P.pend < 3 && P.v >= REN_AT[P.rank + P.pend + 1]){
    P.pend++;
    const h = heroOf(PLAYER), nm = (h && h.name) || (HEROES[G.perk]||{}).n || 'Your general';
    banner('Renown rank '+(P.rank + P.pend), nm+' is famed across the land');
    toast(nm+' reached Renown rank '+(P.rank + P.pend)+'. Tap the ★ on his card to choose a boon', 'good', h ? {x:h.x, y:h.y} : null);
    if(h){ ring(h.x, h.y, .2, 2.2, '#ffd36a', .8); burst(h.x, h.y-.6, 16, '#fff1cf'); }
    SFX.era && SFX.era(); R.renKey = '';
  }
  if(why && at && onScr(at.x, at.y) && n >= 20) float('+'+n+' Renown', at.x, at.y-1.2, '#ffd36a', 1.2);
}
/* a kill by your side near your general, or a big kill anywhere by him and his band */
function renKill(v, att){
  if(att!==PLAYER || !G || G.demo || G.arena) return;
  const h = heroOf(PLAYER); if(!h) return;
  const near = (v.x-h.x)**2 + (v.y-h.y)**2 < 20.25, boss = v.owner===0 && BARB[v.kind] && BARB[v.kind].boss;
  if(v.hero && v.owner > 1 && near) renAdd(40, 1, v);
  else if(boss && near) renAdd(30, 1, v);
  else if(near) renAdd(1);
}
function renCity(c){ const h = heroOf(PLAYER); if(h && (c.x+.5-h.x)**2 + (c.y+.5-h.y)**2 < 20.25) renAdd(40, 1, {x:c.x+.5, y:c.y+.5}); }
function renPick(k){
  const P = G && G.ren; if(!P || !P.pend) return;
  const r = P.rank + 1, o = renOpts(r).find(x => x && x.k===k); if(!o) return;
  P.rank = r; P.pend--; P.got.push(k); R.renKey = '';
  const h = heroOf(PLAYER); if(h){ ring(h.x, h.y, .2, 1.8, '#ffd36a', .7); if(k==='hide') h.hp = Math.min(uStat(h).hp, h.hp*1.25); }
  toast('★ '+o.n+': '+o.d, 'good'); SFX.pick && SFX.pick();
  renClose();
}
/* ability echo, checked from the hero's own update */
function renTick(u){
  if(u.owner!==PLAYER || !u.echoT || G.t < u.echoT) return;
  u.echoT = 0; const a0 = u.acd; u.acd = 0; u.echoing = 1; try { heroActive(u); } catch(e){} u.echoing = 0; u.acd = a0;
}
/* ---- the badge on the hero card and the little pick panel ---- */
function renHud(){
  const b = document.getElementById('hcRen'); if(!b || !b.classList || !G) return;
  const P = G.ren || {v:0, rank:0, got:[], pend:0};
  const full = P.rank + P.pend >= 3, next = REN_AT[Math.min(3, P.rank + P.pend + 1)], prev = REN_AT[P.rank + P.pend] || 0;
  const key = P.rank+':'+P.pend+':'+(full ? 'f' : Math.floor((P.v - prev)/Math.max(1, next - prev)*20));
  if(R.renKey === key) return; R.renKey = key;
  const f = full ? 1 : clamp((P.v - prev)/Math.max(1, next - prev), 0, 1);
  b.classList.toggle('pend', P.pend > 0);
  b.innerHTML = '<b>'+'★'.repeat(P.rank)+'<i>'+'☆'.repeat(3 - P.rank)+'</i></b><s style="width:'+(f*100).toFixed(0)+'%"></s>';
  b.title = P.pend ? 'Renown rank '+(P.rank+1)+' reached: choose a boon' : full ? 'Renown: every rank earned' : 'Renown '+Math.floor(P.v)+' / '+next+': kills near your general, generals and Warlords slain, cities taken with him there';
}
function renOpen(){
  const P = G && G.ren; const el = document.getElementById('renPick'); if(!el) return;
  if(!P || !P.pend){ const all = (G && G.ren && G.ren.got || []).map(k => { for(let r=1;r<=3;r++){ const o = renOpts(r).find(x => x && x.k===k); if(o) return o; } return null; }).filter(Boolean);
    toast(all.length ? 'Renown boons: '+all.map(o => o.n).join(', ') : 'Renown grows from kills near your general, generals and Warlords slain, and cities taken with him there', 'good'); return; }
  const r = P.rank + 1, opts = renOpts(r);
  el.innerHTML = '<p>Renown rank '+r+' · choose a boon</p>'+opts.map(o => '<button data-ren="'+o.k+'"><b>'+esc(o.n)+'</b><span>'+esc(o.d)+'</span></button>').join('')+'<button class="rp-x" data-renx="1">Later</button>';
  el.hidden = false;
  el.querySelectorAll('[data-ren]').forEach(b => b.onclick = e => { e.stopPropagation(); renPick(b.dataset.ren); });
  const x = el.querySelector('[data-renx]'); if(x) x.onclick = e => { e.stopPropagation(); renClose(); };
}
function renClose(){ const el = document.getElementById('renPick'); if(el) el.hidden = true; }
/* bound from 19-main.js with the other HUD buttons */
function renBind(){ const b = document.getElementById('hcRen'); if(b && b.addEventListener) b.addEventListener('click', e => { e.stopPropagation(); const el = document.getElementById('renPick'); if(el && !el.hidden) renClose(); else renOpen(); }); }
