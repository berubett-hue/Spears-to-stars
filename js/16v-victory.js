"use strict";
/* ---------- Victory tab: how close each of the four ways to win is, live ----------
   Lives beside Damage and Goals in the left panel. The closest path also shows as a small chip on the
   rivals row; tapping it opens this tab. */
const VIC_IC = {conq:'u_charge', dip:'u_peace', sci:'cv_astronomy', pros:'u_g_glory'};
function vicPaths(){
  if(!G || !G.rivals) return [];
  const n = G.rivals.length, out = [];
  // conquest: every nation down (vassals count)
  const taken = G.rivals.filter(r => !r.alive || r.vassal).length;
  out.push({k:'conq', n:'Conquest', v:taken, g:n, d:taken >= n ? 'Every nation has fallen' : (n - taken)+' nation'+(n - taken===1 ? '' : 's')+' left to take by war or as vassals'});
  // diplomacy: every nation down, more than half of them joined by union
  const joined = G.rivals.filter(r => r.status==='joined' && !r.conq).length, need = Math.floor(n/2) + 1;
  out.push({k:'dip', n:'Diplomacy', v:Math.min(joined, need), g:need, d:joined >= need ? 'Enough nations joined. Bring down the rest to win' : dipNext()});
  // science: the starship
  if(G.proj && G.proj.parts){
    const pct = shipPct();
    out.push({k:'sci', n:'Science', v:G.proj.launching ? 100 : Math.floor(pct*100), g:100, d:G.proj.launching ? 'Launch in '+Math.ceil(G.proj.launch)+'s: hold every launch site' : 'Starship '+Math.floor(pct*100)+'% built. Defend your launch sites'});
  } else {
    const w = Math.min(5, relicLv('writing')), a = Math.min(3, relicLv('astronomy')), e = G.eraIdx >= 4 ? 2 : 0, ready = shipReady && shipReady();
    const miss = []; if(G.eraIdx < 4) miss.push('the Industrial Age'); if(w < 5) miss.push('Writing '+w+'/5'); if(a < 3) miss.push('Astronomy '+a+'/3');
    out.push({k:'sci', n:'Science', v:w + a + e, g:10, d:G.proj ? 'Choose your launch sites' : ready ? 'Space Program ready: pick it at your next level-up' : 'Needs '+miss.join(', ')});
  }
  // prosperity: a Golden Age held for 90 seconds
  if(typeof prosState === 'function'){
    const st = prosState(), P = G.pros || {v:0};
    if(P.v > 0 || st.ok) out.push({k:'pros', n:'Prosperity', v:Math.floor(P.v), g:PROS.hold, d:st.ok ? 'Golden Age: hold on for '+Math.ceil(PROS.hold - P.v)+'s' : 'Paused: need '+prosMissing(st)});
    else out.push({k:'pros', n:'Prosperity', v:Math.min(st.c, PROS.cities) + Math.min(st.s, PROS.sites) + Math.min(st.w, PROS.wonders), g:PROS.cities + PROS.sites + PROS.wonders,
      d:st.c+'/'+PROS.cities+' cities · '+st.s+'/'+PROS.sites+' sites · '+(st.w ? 'wonder ✓' : 'no wonder')+(G.eraIdx < PROS.era ? ' · opens in the Renaissance' : '')});
  }
  out.forEach(p => p.f = clamp(p.v/Math.max(1, p.g), 0, 1));
  return out;
}
/* what stands between you and your next union */
function dipNext(){
  const mine = citiesOf(PLAYER).length, live = G.rivals.filter(r => r.alive);
  const al = live.filter(r => r.status==='ally').sort((a,b) => b.rel - a.rel)[0];
  if(!al){ const tr = live.filter(r => r.status==='trade').sort((a,b) => b.rel - a.rel)[0]; return tr ? 'Ally with the '+tr.name+' first (relations 50+, '+COST.ally+' influence)' : 'Make peace and trade with a nation, then ally with it'; }
  if(G.t - al.allyT < 90) return 'The '+al.name+' can join you in '+Math.ceil(90 - (G.t - al.allyT))+'s';
  if(al.rel < unionRel()) return 'Raise relations with the '+al.name+' to '+unionRel()+' (gifts help)';
  if(citiesOf(al.id).length >= mine) return 'The '+al.name+' must have fewer cities than you to join';
  if(G.influence < unionCost()) return 'Union with the '+al.name+' needs '+unionCost()+' influence';
  return 'The '+al.name+' is ready to join: open Diplomacy (N)';
}
function vicBest(){ const L = vicPaths().filter(p => p.k!=='conq' || p.v > 0); return L.sort((a,b) => b.f - a.f)[0] || null; }
function vicHTML(){
  const L = vicPaths(); if(!L.length) return '';
  const best = L.slice().sort((a,b) => b.f - a.f)[0];
  return '<div class="gl-list vic">'+L.map(p => '<div class="gl-r'+(p===best ? ' pin' : '')+'" title="'+esc(p.n+': '+p.d)+'"><span class="gl-i"><img src="'+(KIT[VIC_IC[p.k]] || '')+'" alt=""></span><span class="gl-n"><b>'+p.n+'</b><small>'+esc(p.d)+'</small></span><span class="gl-v">'+Math.round(p.f*100)+'%</span><span class="gl-b"><s style="width:'+(p.f*100).toFixed(1)+'%"></s></span></div>').join('')+'</div>';
}
/* the closest win, on the rivals row */
function vicChip(){
  const el = $('#vicChip'); if(!el || !el.querySelector || !G || G.demo || G.arena || holdUI()) return;
  if(G.decline || G.won){ el.hidden = true; return; }
  const b = vicBest(); if(!b){ el.hidden = true; return; }
  const txt = b.n+' '+Math.round(b.f*100)+'%';
  if(el.dataset.t !== txt){ el.dataset.t = txt; el.innerHTML = '<img src="'+(KIT[VIC_IC[b.k]] || '')+'" alt=""><b>'+txt+'</b>'; el.title = 'Closest win: '+b.n+'. '+b.d+'. Tap for all four'; }
  el.hidden = false;
}
