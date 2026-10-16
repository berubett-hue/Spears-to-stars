"use strict";
/* ---------- Prosperity victory: win by growing a great empire ----------
   From the Renaissance, hold 6 cities, 4 of the 6 resource sites and a wonder inside your borders at the
   same time. That starts a Golden Age of Prosperity: keep it all for 90 seconds while every nation that
   is not your ally turns on you, and you win. Losing a condition pauses the clock and it slowly drains.
   The Expand stance makes the clock run faster. */
const PROS = {cities:6, sites:4, wonders:1, era:3, hold:90};
function prosState(){
  const c = citiesOf(PLAYER).length, s = (G.sites||[]).filter(x => x.owner===PLAYER).length, w = (G.pois||[]).filter(p => p.k==='wonder' && !p.dead && G.own[idx(p.x, p.y)]===PLAYER).length;
  return {c, s, w, ok:G.eraIdx >= PROS.era && c >= PROS.cities && s >= PROS.sites && w >= PROS.wonders};
}
function prosTick(dt){
  if(G.demo || G.arena || G.ended || G.won || G.decline) return;
  const P = G.pros || (G.pros = {v:0, on:false, told:false});
  const st = prosState();
  if(st.ok){
    if(!P.on){
      P.on = true;
      if(!P.told){ P.told = true;
        banner('A Golden Age of Prosperity', 'Hold your cities, sites and wonder for '+PROS.hold+' seconds');
        toast('Your empire is the envy of the world. Keep '+PROS.cities+' cities, '+PROS.sites+' resource sites and a wonder for '+PROS.hold+' seconds to win. The jealous nations are coming','good');
        bigMoment({tier:'legend', kick:'A Golden Age of Prosperity', title:'Hold for '+PROS.hold+' seconds', sub:'Every nation that is not your ally turns on you', col:'#ffd36a'});
        G.rivals.forEach(r => { if(r.alive && r.status!=='ally' && r.status!=='war' && !r.vassal){ try { declareWar(r.id, PLAYER); } catch(e){ r.status = 'war'; } } });
        G.rivals.forEach(r => { if(r.alive && r.status==='war'){ r.army += 80*(1 + .3*rEra()); } });
        R.raidForce = true; SFX.warn && SFX.warn();
      } else toast('Prosperity restored. The Golden Age clock runs again','good');
    }
    P.v = Math.min(PROS.hold, P.v + dt*(G.doctrine==='expand' ? 1.25 : 1));
    if(P.v >= PROS.hold){ G.prosWon = true; endGame(true, null, null, 'prosperity'); }
  } else {
    if(P.on){ P.on = false; toast('Your Golden Age falters: '+prosMissing(st)+'. The clock drains until you restore it','warn'); }
    P.v = Math.max(0, P.v - dt*.5);
  }
}
function prosMissing(st){
  const m = [];
  if(st.c < PROS.cities) m.push((PROS.cities - st.c)+' more cit'+(PROS.cities - st.c===1 ? 'y' : 'ies'));
  if(st.s < PROS.sites) m.push((PROS.sites - st.s)+' more resource site'+(PROS.sites - st.s===1 ? '' : 's'));
  if(st.w < PROS.wonders) m.push('a wonder inside your borders');
  if(G.eraIdx < PROS.era) m.push('the Renaissance Age');
  return m.join(', ') || 'nothing';
}
/* Goals panel line, from the Classical Age on */
function prosGoals(){
  if(!G || G.demo || G.arena || G.won || G.decline || (G.eraIdx||0) < 1) return [];
  const st = prosState(), P = G.pros || {v:0};
  if(P.v > 0 || st.ok) return [{id:'pros', ic:'u_g_glory', name:'Golden Age · prosperity victory', d:st.ok ? 'Hold on: '+Math.ceil(PROS.hold - P.v)+'s to victory' : 'Paused: need '+prosMissing(st), v:Math.floor(P.v), g:PROS.hold, ready:st.ok ? 1 : 0}];
  const parts = Math.min(st.c, PROS.cities) + Math.min(st.s, PROS.sites) + Math.min(st.w, PROS.wonders);
  return [{id:'pros', ic:'u_g_glory', name:'Prosperity victory', d:st.c+'/'+PROS.cities+' cities · '+st.s+'/'+PROS.sites+' sites · '+(st.w ? 'wonder ✓' : 'no wonder')+(G.eraIdx < PROS.era ? ' · from the Renaissance' : ''), v:parts, g:PROS.cities + PROS.sites + PROS.wonders}];
}
