"use strict";
/* ---------- Events ---------- */
const EVENTS = [
  {id:'plague', title:'Plague in {cap}', text:'Sickness spreads through the crowded streets of your capital.',
    a:{l:'Quarantine the city', s:'{cap} loses 1 citizen', f:x => { x.cap.pop = Math.max(1, x.cap.pop-1); }},
    b:{l:'Keep the markets open', s:'Half the time, every city loses 1 citizen', f:() => {
      if(Math.random()<.5){ citiesOf(PLAYER).forEach(c => c.pop = Math.max(1,c.pop-1)); toast('The plague spread','bad'); } else toast('The plague burned itself out','good'); }}},
  {id:'tribute', title:'A raider chieftain demands tribute', text:'Riders arrive from the dark under a white flag. Pay, or their kin will come in force.',
    a:{l:'Pay the tribute', s:'Lose your stored production', f:() => { G.army = 0; G.settler *= .3; }},
    b:{l:'Refuse', s:'The next raid is 60% larger', f:() => { G.waveBoost = 1.6; }}},
  {id:'harvest', title:'Bountiful harvest', text:'The granaries overflow after a mild season.',
    a:{l:'Hold a feast', s:'{cap} gains 2 citizens', f:x => { x.cap.pop = Math.min(5+S.popCap, x.cap.pop+2); }},
    b:{l:'Sell the surplus abroad', s:'+40 influence', f:() => { G.influence += 40; }}},
  {id:'scholars', title:'Wandering scholars', text:'A caravan of scholars asks for shelter and a place to teach.',
    a:{l:'Welcome them', s:'Your next discovery jumps halfway', f:() => { G.sci += researchCost()*.5; }},
    b:{l:'Put them to work', s:'Production +10% for the rest of the game', f:() => { G.evEffects.push({prod:.1}); }}},
  {id:'quake', title:'The earth shakes', text:'An earthquake cracks the walls of {city}.',
    a:{l:'Rebuild at once', s:'Spend most of your stored production', f:() => { G.army *= .3; G.settler *= .3; }},
    b:{l:'Let the walls stand cracked', s:'{city} drops to 30% health', f:x => { x.city.hp = Math.min(x.city.hp, cityMax(x.city)*.3); }}},
  {id:'prophet', title:'A prophet speaks', text:'A preacher draws crowds in the market square of {city}.',
    a:{l:'Build a great temple', s:'Cities +20% health for the rest of the game', f:() => { G.evEffects.push({cityhp:.2}); }},
    b:{l:'Send missionaries abroad', s:'Every nation’s relations +12', f:() => { G.rivals.forEach(r => { if(r.alive && r.status!=='war') r.rel += 12; }); }}},
  {id:'mercs', title:'Mercenaries for hire', text:'A company of sellswords offers its blades to {cap}.',
    a:{l:'Hire them', s:'2 Horse Raiders now, but stored settlers are spent', f:x => { spawnUnit(PLAYER, x.cap, 'horse'); spawnUnit(PLAYER, x.cap, 'horse'); G.settler = 0; }},
    b:{l:'Send them away', s:'Half the time, they turn raider', f:() => {
      if(Math.random()<.5){ const side=rint(4); for(let k=0;k<4;k++){ const p=edgePoint(side,rnd(4,N-4),.5); spawnBarb('warband',p[0],p[1]); } toast('The mercenaries turned raider to the '+DIRS[side],'warn'); }
      else toast('The mercenaries rode away','good'); }}},
  {id:'refugees', title:'Refugees at the gates', text:'Families fleeing the wars between nations arrive at {city}.',
    a:{l:'Take them in', s:'{city} gains 2 citizens', f:x => { x.city.pop = Math.min(5+S.popCap, x.city.pop+2); }},
    b:{l:'Turn them away', s:'+20 influence from grateful neighbors who wanted them back', f:() => { G.influence += 20; }}}
];
function openEvent(){
  G.nextEvent = G.t + rnd(160,220);
  const avail = EVENTS.filter(e => !G.recentEvents.includes(e.id));
  const ev = avail[rint(avail.length)];
  G.recentEvents.push(ev.id); if(G.recentEvents.length > 3) G.recentEvents.shift();
  const cap = capitalOf(PLAYER);
  const others = citiesOf(PLAYER).filter(c => !c.capital);
  const city = others.length ? others[rint(others.length)] : cap;
  const fill = s => s.replace(/\{cap\}/g, cap.name).replace(/\{city\}/g, city.name);
  const ctx = {cap, city};
  showEvent({kicker:'Event', title:fill(ev.title), text:fill(ev.text),
    art:ev.id, a:{l:fill(ev.a.l), s:fill(ev.a.s), f:() => ev.a.f(ctx)}, b:{l:fill(ev.b.l), s:fill(ev.b.s), f:() => ev.b.f(ctx)}});
}
function showEvent(ev){
  R.event = ev;
  modal = 'event';
  const ov = $('#ovEvent'); if(!ov || !ov.querySelector) return;
  { const ea = $('#evArt'), u = ev.img || (ev.art != null && EVART[ev.art] != null ? KIT['ev_'+EVART[ev.art]] : ''); if(ea){ ea.hidden = !u; if(u) ea.src = u; } }
  $('#evKicker').textContent = ev.kicker;
  $('#evTitle').textContent = ev.title;
  $('#evText').textContent = ev.text;
  $('#evChoices').innerHTML = (ev.opts || [ev.a, ev.b]).map(o => o.pic ? '<button class="choice has-pic"><img src="'+o.pic+'" alt=""><b>'+esc(o.l)+'</b><span>'+esc(o.s)+'</span></button>' : o.ic ? '<button class="choice has-ic"><img src="'+o.ic+'" alt=""><b>'+esc(o.l)+'</b><span>'+esc(o.s)+'</span></button>' : '<button class="choice"><b>'+esc(o.l)+'</b><span>'+esc(o.s)+'</span></button>').join('');
  [...$('#evChoices').children].forEach((el,i) => el.addEventListener('click', () => {
    if(performance.now() - R.openedAt < 220) return;
    resolveEvent(i);
  }));
  R.openedAt = performance.now();
  ov.hidden = false;
  SFX.open();
}
function resolveEvent(i){
  const ev = R.event; if(!ev) return;
  (ev.opts ? ev.opts[i] : (i===0 ? ev.a : ev.b)).f();
  G.rivals.forEach(r => r.rel = clamp(r.rel,-100,100));
  refreshStats();
  modal = null; R.event = null; G.gate = G.t + (ev.gate ?? 15);
  const ov = $('#ovEvent'); if(ov) ov.hidden = true;
  SFX.pick();
}

/* ---------- Decrees ---------- */
function decree(k){
  if(!running || modal || paused || !G || G.ended || G.cd[k] > 0) return;
  if(G.influence < DCOST[k]){ toast('Needs '+DCOST[k]+' influence','warn'); return; }
  G.influence -= DCOST[k];
  G.cd[k] = DECREES[k];
  if(k==='mobilize'){
    const room = Math.max(0, Math.min(6, Math.floor(pArmyMax() - armySup(PLAYER))));
    for(let n=0;n<room;n++) spawnUnit(PLAYER, threatCity(PLAYER));
    G.buff.rally = 12;
    toast('Mobilized: '+(room ? room+' troops raised and ' : '')+'+50% damage for 12s','good');
  } else if(k==='golden'){
    G.buff.golden = 20;
    toast('A golden age begins: +50% yields for 20s','good');
  } else if(k==='fortify'){
    citiesOf(PLAYER).forEach(c => c.hp = Math.min(cityMax(c), c.hp + cityMax(c)*.5));
    G.buff.fortify = 10;
    toast('Walls manned: cities repaired and towers fire 50% faster','good');
  }
  SFX.decree();
}
function setDoctrine(d){ if(!G || G.ended) return; G.doctrine = d; syncDoctrine(); SFX.tick(); }
function syncDoctrine(){ document.querySelectorAll('#doctrine button').forEach(b => b.classList.toggle('on', !!G && b.dataset.d === G.doctrine)); }

/* ---------- End ---------- */

/* ---------- Morale: rivals break when they lose ---------- */

/* ---------- Rival cities call up levies; conquered cities are restless ---------- */
function levyTick(dt){
  const dl = R.dangerAll, re = rEra();
  for(const r of G.rivals){
    if(!r.alive) continue; const L = (dl && dl.get(r.id)) || [];
    for(const c of citiesOf(r.id)){
      const max = 1 + Math.floor(c.pop/2) + re + (c.capital ? 3 : 0);
      if(c.levy == null) c.levy = max;
      const hot = L.includes(c.id) && G.units.some(u => u.owner===PLAYER && u.hp > 0 && Math.abs(u.x-c.x-.5) < 5 && Math.abs(u.y-c.y-.5) < 5);
      if(hot){
        c.levyQ = G.t; c.levyT = (c.levyT||0) - dt;
        if(c.levyT <= 0 && c.levy >= 1){ c.levyT = 1.5; c.levy -= 1; const card = pickCard(r.id), sq = squadSize(r.id, card);
          for(let k=0;k<sq;k++){ const u = spawnUnit(r.id, c, card); if(u){ u.gar = c.id; u.levy = 1; } }
          if(G.t - (r.levyNote||-99) > 25){ r.levyNote = G.t; toast(c.name+' calls up its levies'+(c.capital ? '. Capitals fight hardest' : ''), 'warn', {x:c.x+.5, y:c.y+.5}); } }
      } else {
        c.levy = Math.min(max, c.levy + dt/20);
        if(G.t - (c.levyQ||-99) > 30) for(const u of G.units) if(u.levy && u.owner===r.id && u.gar===c.id && u.hp > 0 && !u.tgt){ u.hp = 0; u.dead = true; c.levy = Math.min(max, c.levy + 1/Math.max(1, squadSize(r.id, u.card))); }
      }
    }
  }
}
function unrestTick(){
  for(const c of citiesOf(PLAYER)){
    if(!(c.unrest > G.t)) continue;
    const r = c.prevOwner > 1 ? rival(c.prevOwner) : null; if(!r || !r.alive || !atWar(PLAYER, r.id)) continue;
    let them = 0, us = 0; for(const u of G.units){ if(u.hp<=0 || Math.abs(u.x-c.x-.5) > 4 || Math.abs(u.y-c.y-.5) > 4) continue; if(u.owner===r.id && !u.hero) them++; else if(u.owner===PLAYER) us++; }
    if(them >= 7 && us <= 1 && !c.rose){ c.rose = 1; toast(c.name+' rises up and returns to '+r.name, 'bad', {x:c.x+.5, y:c.y+.5}); c.unrest = 0; captureCity(c, r.id); return; }
  }
}
function metMystery(r){
  if(!r.mystery || (META.met = META.met || []).includes(r.mystery)) return;
  META.met.push(r.mystery); lifeDirty = true; saveLife();
  const sp = secretPeople(r.mystery); if(!sp) return;
  banner('They were '+sp.n, 'A hidden people'); toast('The mysterious nation was '+sp.n+'. Their riddle is in your Collection. Find their secret to lead them', 'good');
}
function moraleHit(r, n){
  if(!r || !r.alive || !G || G.arena) return; const m0 = r.morale ?? 70; r.morale = clamp(m0 - n, 0, 100);
  if(m0 >= 30 && r.morale < 30 && G.t - (r.morNote||-99) > 30){ r.morNote = G.t; const c = capitalOf(r.id); toast(r.name+'’s morale is breaking. Their troops may flee', 'good', c ? {x:c.x+.5, y:c.y+.5} : null); }
  if(m0 >= 15 && r.morale < 15 && G.t - (r.morBan||-99) > 60){ r.morBan = G.t; banner(r.name, 'Their armies rout'); }
}
function moraleTick(dt){
  for(const r of G.rivals){
    if(!r.alive) continue; const base = CR(3) ? 85 : 70, m = r.morale ?? base;
    r.morale = m + (base - m)*Math.min(1, .012*dt);
    if(r.morale >= 35) continue;
    const p = (35 - r.morale)/35*dt;
    for(const u of G.units){
      if(u.owner!==r.id || u.hp<=0 || u.hero || !u.card || u.rout > 0 || !(u.tgt || u.tcity)) continue;
      if(u.hp < uStat(u).hp*.5 && Math.random() < p){ u.rout = 4 + Math.random()*3; u.tgt = 0; u.tcity = 0; u.fol = 0; if(G.t - (r.routFx||-9) > 1.2){ r.routFx = G.t; if(onScr(u.x, u.y)) float('ROUT!', u.x, u.y-.8, '#c8f0a0', 1); } }
    }
  }
}
function desertOne(r, dt){
  r.desT = (r.desT ?? 0) - dt; if(r.desT > 0) return; r.desT = 1;
  const u = G.units.find(v => v.owner===r.id && v.hp > 0 && !v.hero && !v.levy && v.card && !v.tgt && !v.tcity && !(v.rout > 0));
  if(!u) return; u.hp = 0; u.dead = true;
  if(onScr(u.x, u.y)) float('deserts', u.x, u.y-.6, '#c9c2b0', .9);
  if(G.t - (r.desNote||-99) > 60){ r.desNote = G.t; toast(r.name+'’s soldiers desert as its cities fall', 'good'); }
}
function hostWarn(o, c, n){
  if(o===PLAYER || G.arena || G.demo || !c || c.owner!==PLAYER) return; const r = rival(o); if(!r || G.t - (r.hostNote||-99) < 40) return;
  r.hostNote = G.t; toast('⚔ '+r.name+'’s host marches on '+c.name+' · '+n+' troops', n >= 15 ? 'bad' : 'warn', {x:c.x+.5, y:c.y+.5}); MUS.sting && MUS.sting('host');
  if(n >= 20){ banner(r.name+' marches', 'On '+c.name+' · '+n+' troops'); SFX.warn && SFX.warn(); }
}

/* ---------- Grades ---------- */
const GRADES = [{n:'Bronze', c:'#d89a5a', g:0}, {n:'Silver', c:'#dfe4ec', g:60}, {n:'Gold', c:'#ffd36a', g:150}, {n:'Star', c:'#bfe6ff', g:300}];
function gradeOf(){
  let p = 0; const why = [];
  if(G.t < 720){ p += 2; why.push('won before 12:00'); } else if(G.t < 840){ p += 1; why.push('won before 14:00'); }
  const gone = G.rivals.filter(r => !r.alive).length;
  if(gone >= G.rivals.length){ p += 2; why.push('every nation conquered or joined'); } else if(gone >= 4){ p += 1; why.push(gone+' nations brought down'); }
  if(!(G.stats.lost||0)){ p += 1; why.push('no city lost'); }
  if(!(G.stats.heroFalls||0)){ p += 1; why.push('your general never fell'); }
  return {i: p >= 6 ? 3 : p >= 4 ? 2 : p >= 2 ? 1 : 0, why};
}

/* ---------- Quests: three for each people ---------- */
const Q_REW = [150, 300, 600];
const tk = g => (G.tk||{})[g]||0;
const kills = () => (G.stats.kills||0) + (G.stats.nkills||0);
const QUESTS = {
  horde:[{d:'Field 150 troops at once', g:150, v:() => G.stats.peakArmy||0}, {d:'Defeat 2,500 enemies in one game', g:2500, v:kills}, {d:'Win before 13:00', g:1, win:1, v:() => G.won && G.t < 780 ? 1 : 0}],
  legion:[{d:'Lose no city in the first 10 minutes', g:600, v:() => Math.min(600, Math.floor(G.stats.firstLostT ?? G.t))}, {d:'Take 8 cities by force in one game', g:8, v:() => G.stats.forced||0}, {d:'Win without losing a city', g:1, win:1, v:() => G.won && !G.stats.lost ? 1 : 0}],
  steppe:[{d:'Your Mounted troops defeat 600 enemies in one game', g:600, v:() => tk('Mounted')}, {d:'Capture a city before 5:00', g:1, v:() => (G.stats.firstCapT ?? 1e9) < 300 ? 1 : 0}, {d:'Win by conquest', g:1, win:1, v:() => G.won && G.winKind==='conquest' ? 1 : 0}],
  elephant:[{d:'Your Titans defeat 500 enemies in one game', g:500, v:() => tk('Titan')}, {d:'Slay 3 rival generals in one game', g:3, v:() => G.stats.gens||0}, {d:'Win at Crown 2 or higher', g:1, win:1, v:() => G.won && CR(2) ? 1 : 0}],
  longbow:[{d:'Your Ranged troops defeat 1,500 enemies in one game', g:1500, v:() => tk('Ranged')}, {d:'Reach the Industrial Age without your general falling', g:1, v:() => G.eraIdx >= 4 && !G.stats.heroFalls ? 1 : 0}, {d:'Win by launching the starship', g:1, win:1, v:() => G.won && G.winKind==='science' ? 1 : 0}],
  temple:[{d:'Hold 400 influence at once', g:400, v:() => Math.floor(G.stats.peakInf||0)}, {d:'Have 2 allies at once', g:2, v:() => G.stats.peakAllies||0}, {d:'Win by diplomacy', g:1, win:1, v:() => G.won && G.winKind==='diplomacy' ? 1 : 0}],
  khanate:[{d:'Capture 3 cities before 8:00', g:3, v:() => G.stats.capEarly||0}, {d:'Field 2 evolved troop lines at once', g:2, v:() => G.stats.peakEvo||0}, {d:'Win by conquest before 14:00', g:1, win:1, v:() => G.won && G.winKind==='conquest' && G.t < 840 ? 1 : 0}],
  merchant:[{d:'Hold 3 trade deals at once', g:3, v:() => G.stats.peakTrade||0}, {d:'Reach 60 science per second', g:60, v:() => Math.floor(G.stats.peakSci||0)}, {d:'Win by diplomacy at Crown 1 or higher', g:1, win:1, v:() => G.won && G.winKind==='diplomacy' && CR(1) ? 1 : 0}],
  star:[{d:'Reach the Modern Age before 12:00', g:1, v:() => (G.stats.modernT ?? 1e9) < 720 ? 1 : 0}, {d:'Discover an evolution or union during a game', g:1, v:() => Math.min(1, G.stats.disc||0)}, {d:'Win by launching the starship at Crown 2 or higher', g:1, win:1, v:() => G.won && G.winKind==='science' && CR(2) ? 1 : 0}],
  bastion:[{d:'Hold 7 cities at once', g:7, v:() => G.stats.peakCities||0}, {d:'Defeat 3,000 enemies in one game', g:3000, v:kills}, {d:'Win without losing a city at Crown 2 or higher', g:1, win:1, v:() => G.won && !G.stats.lost && CR(2) ? 1 : 0}],
  wolves:[{d:'Field 120 troops at once', g:120, v:() => G.stats.peakArmy||0}, {d:'Your Mounted troops defeat 800 enemies in one game', g:800, v:() => tk('Mounted')}, {d:'Win by conquest before 14:00', g:1, win:1, v:() => G.won && G.winKind==='conquest' && G.t < 840 ? 1 : 0}],
  firemonks:[{d:'Your Fire troops defeat 600 enemies in one game', g:600, v:() => tk('Fire')}, {d:'Lose no city in the first 12 minutes', g:720, v:() => Math.min(720, Math.floor(G.stats.firstLostT ?? G.t))}, {d:'Win at Crown 2 or higher', g:1, win:1, v:() => G.won && CR(2) ? 1 : 0}],
  golems:[{d:'Take 8 cities by force in one game', g:8, v:() => G.stats.forced||0}, {d:'Your Titans defeat 500 enemies in one game', g:500, v:() => tk('Titan')}, {d:'Win without losing a city', g:1, win:1, v:() => G.won && !G.stats.lost ? 1 : 0}],
  skylancers:[{d:'Capture 3 cities before 8:00', g:3, v:() => G.stats.capEarly||0}, {d:'Your Mounted troops defeat 600 enemies in one game', g:600, v:() => tk('Mounted')}, {d:'Win by conquest at Crown 1 or higher', g:1, win:1, v:() => G.won && G.winKind==='conquest' && CR(1) ? 1 : 0}],
  shadows:[{d:'Slay 4 rival generals in one game', g:4, v:() => G.stats.gens||0}, {d:'Your Ranged troops defeat 1,500 enemies in one game', g:1500, v:() => tk('Ranged')}, {d:'Win before 13:00', g:1, win:1, v:() => G.won && G.t < 780 ? 1 : 0}],
  colossus:[{d:'Your Titans defeat 800 enemies in one game', g:800, v:() => tk('Titan')}, {d:'Reach the Modern Age before 12:00', g:1, v:() => (G.stats.modernT ?? 1e9) < 720 ? 1 : 0}, {d:'Win at Crown 3 or higher', g:1, win:1, v:() => G.won && CR(3) ? 1 : 0}],
  northmen:[{d:'Slay 4 Warlords in one game', g:4, v:() => G.stats.warlords||0}, {d:'Reach a 50-kill streak', g:50, v:() => G.stats.best||0}, {d:'Win by conquest at Crown 1 or higher', g:1, win:1, v:() => G.won && G.winKind==='conquest' && CR(1) ? 1 : 0}]
};
const questAll = id => !!QUESTS[id] && [0,1,2].every(k => META.qd.has(id+':'+k));
function statTick(){
  const st = G.stats, mx = (k, v) => { st[k] = Math.max(st[k]||0, v); };
  mx('peakArmy', unitCount(PLAYER)); mx('peakInf', G.influence||0); mx('peakAllies', allyCount()); mx('peakTrade', tradeCount());
  mx('peakCities', citiesOf(PLAYER).length); mx('peakSci', (G.rates||{}).s||0); mx('peakEvo', G.cards.filter(sl => sl.evo).length);
  if(G.eraIdx >= 5 && st.modernT == null) st.modernT = G.t;
  if(G.eraIdx >= 2 && !st.medC){ st.medC = 1; lifeAdd('med'); }
  if((st.warlords||0) > (META.life.bestWl||0)){ META.life.bestWl = st.warlords; lifeDirty = true; }
  { const bb = (k, v) => { if((v||0) > (META.life['b_'+k]||0)){ META.life['b_'+k] = v; lifeDirty = true; } }; bb('cities', st.peakCities); bb('wl', st.warlords); bb('sling', ((G.dmg||{})[PLAYER+':slingers']||{}).k); }
  // riddles sharpen when you field the right line high enough
  for(const e of UEVO){
    if(e.legend || known(e) || (META.hint[e.id]||0) >= 1) continue;
    const sl = slotOf(e.from); if(!sl || sl.lvl < evLv(e)) continue;
    META.hint[e.id] = 1; lifeDirty = true; (G.sharp = G.sharp || []).push(e.id);
    toast('A riddle sharpens: '+(e.union ? 'a union' : 'an evolution')+' of the '+CARDS[e.from].n+' line waits at Lv '+evLv(e)+'. See the Collection', 'good');
  }
}
function questCheck(final){
  if(!G || G.demo || G.arena || !G.perk || !QUESTS[G.perk]) return;
  QUESTS[G.perk].forEach((q, k) => {
    const id = G.perk+':'+k; let v = 0; try { v = q.v(); } catch(e){}
    if(v > (META.q[id]||0)){ META.q[id] = v; lifeDirty = true; }
    if(META.qd.has(id) || v < q.g || (q.win && !final)) return;
    META.qd.add(id); const rw = Q_REW[k]; META.glory += rw; META.gloryT += rw; G.questGlory = (G.questGlory||0) + rw; (G.questsDone = G.questsDone || []).push(k); lifeDirty = true; saveLife();
    const all = questAll(G.perk);
    if(!final){ MUS.sting && MUS.sting('quest'); const h = heroOf(PLAYER); lootPop({tier:all ? 'legend' : 'epic', kick:'✦ Quest complete ✦', title:q.d, gain:'+'+rw+' Glory', big:'+'+rw+' ◆', line:all ? 'All three '+G.natName+' quests done. Your starting troops now begin at Lv 2.' : 'Quest '+(k+1)+' of 3 for the '+G.natName+'.', at:h ? {x:h.x, y:h.y} : null}); }
  });
}
function endMeta(won){
  if(G.metaDone || G.demo) return; G.metaDone = true;
  statTick(); questCheck(true);
  const nat = G.perk, c = G.crown||0;
  if(won){
    if(G.winKind==='conquest') lifeAdd('wConq'); else if(G.winKind==='diplomacy') lifeAdd('wDip'); else if(G.winKind==='prosperity') lifeAdd('wPros'); else lifeAdd('wSci');
    if(!(G.stats.lost||0)) lifeAdd('wNoLoss');
    if(G.diff !== 0){
      if(c > (META.life.topCrown ?? -1)){ META.life.topCrown = c; lifeDirty = true; }
      lifeAdd('wKing'); if(c >= 1) lifeAdd('wC1');
      G.grade = gradeOf();
      const pb = META.pb[nat]; G.firstClear = pb == null || pb < c; if(G.firstClear) META.pb[nat] = c;
      META.pg[nat] = Math.max(META.pg[nat] ?? -1, G.grade.i);
      if(c >= (META.crown||0) && c < 10){ META.crown = c + 1; G.newCrown = c + 1; }
    }
  }
  const snap = (G.snap||{}).sec || {}, stir = [];
  for(const x of SECRETS){ const a = ACH.find(q => q.id===x.id); if(!a || !a.prog || isUnlocked(x.id)) continue; let v = 0; try { v = a.prog()[0]; } catch(e){} if(v > (snap[x.id] ?? v)) stir.push(x.id); }
  META.stir = stir; G.stir = stir; saveLife();
}

/* ---------- Progress you can see ---------- */
const unlName = id => CARDS[id] ? CARDS[id].n : id.startsWith('nat:') ? (NATIONS_P.find(n => 'nat:'+n.id===id)||{}).n : 'The Crown ladder';
function progSnap(){
  const ach = {}, sec = {};
  for(const a of ACH){ if(!a.prog || isUnlocked(a.id)) continue; let v = 0; try { v = a.prog()[0]; } catch(e){} (a.secret ? sec : ach)[a.id] = v; }
  G.snap = {ach, sec, q:Object.assign({}, META.q)};
}
function nextList(n){
  const out = [];
  for(const a of ACH){ if(a.secret || isUnlocked(a.id) || !a.prog) continue; let p; try { p = a.prog(); } catch(e){ continue; } if(p[0] >= p[1]) continue; out.push({name:achName(a), d:a.d, p, f:Math.min(1, p[0]/p[1])}); }
  for(const nn of NATIONS_P) if(natOK(nn)) QUESTS[nn.id].forEach((q, k) => { const id = nn.id+':'+k; if(META.qd.has(id) || q.win) return; const b = META.q[id]||0; out.push({name:nn.n+' quest', d:q.d, p:[b, q.g], f:Math.min(1, b/q.g)}); });
  const c = META.crown||0; if(c < 10 && c >= 1) out.push({name:'Crown '+(c+1)+' · '+CROWNS[c+1].n, d:'Win at Crown '+c, p:[0, 1], f:.05});
  return out.sort((a,b) => b.f - a.f).slice(0, n);
}
function nextHTML(n, title){
  const L = nextList(n); if(!L.length) return '';
  return '<div class="nextun"><h4>'+title+'</h4>'+L.map(x => '<div class="nx"><b>'+esc(x.name)+'</b><span>'+esc(x.d)+'</span><span class="pbar"><s style="width:'+(x.f*100).toFixed(1)+'%"></s></span><small>'+Math.min(x.p[0], x.p[1]).toLocaleString()+' / '+x.p[1].toLocaleString()+'</small></div>').join('')+'</div>';
}
function endCrownHTML(){
  let h = '';
  if(G.won && G.grade){ const gr = GRADES[G.grade.i]; h += '<div class="grade" style="--gc:'+gr.c+'">'+kImg('gr_'+G.grade.i, 'gimg')+'<b>'+gr.n+' grade</b><span>'+(G.grade.why.length ? G.grade.why.join(' · ') : 'Win faster, lose no cities and bring every nation down for a better grade')+'</span></div>'; }
  if(G.newCrown) h += '<div class="crownup">'+kImg('cr_'+crTier(G.newCrown), 'gimg')+'<b>Crown '+G.newCrown+' unlocked · '+esc(CROWNS[G.newCrown].n)+'</b><span>'+esc(CROWNS[G.newCrown].d)+'. Glory ×'+crownMul(G.newCrown)+'</span></div>';
  else if(G.won && G.diff===0) h += '<p class="lnote">Chieftain wins do not open Crowns. Win on King to climb.</p>';
  return h;
}
function endMovedHTML(){
  let h = '', rows = [];
  const sn = (G.snap||{}).ach || {};
  for(const a of ACH){ if(a.secret || !(a.id in sn) || !a.prog) continue; let p; try { p = a.prog(); } catch(e){ continue; } const was = sn[a.id], done = isUnlocked(a.id); if(p[0] > was || done) rows.push('<div class="mv"><b>'+esc(unlName(a.id))+'</b><span>'+(done ? '✓ Unlocked' : Math.min(was, p[1]).toLocaleString()+' → '+Math.min(p[0], p[1]).toLocaleString()+' / '+p[1].toLocaleString())+'</span></div>'); }
  if(G.perk && QUESTS[G.perk]){ const sq = (G.snap||{}).q || {}; QUESTS[G.perk].forEach((q, k) => { const id = G.perk+':'+k, now = META.q[id]||0, fresh = (G.questsDone||[]).includes(k); if(fresh) rows.push('<div class="mv q"><b>'+kImg('mk_quest')+'Quest · '+esc(q.d)+'</b><span>✓ Complete · +'+Q_REW[k]+' Glory banked</span></div>'); else if(!META.qd.has(id) && now > (sq[id]||0)) rows.push('<div class="mv q"><b>'+kImg('mk_quest')+'Quest · '+esc(q.d)+'</b><span>Best '+Math.min(now, q.g).toLocaleString()+' / '+q.g.toLocaleString()+'</span></div>'); }); }
  if((G.sharp||[]).length) rows.push('<div class="mv"><b>◇ '+G.sharp.length+' riddle'+(G.sharp.length > 1 ? 's' : '')+' sharpened</b><span>Read them in the Collection</span></div>');
  if((G.stir||[]).length) rows.push('<div class="mv stir"><b>✦ Something stirred</b><span>'+G.stir.length+' secret'+(G.stir.length > 1 ? 's' : '')+' moved closer this game</span></div>');
  if(rows.length) h += '<h3>Progress this game</h3><div class="moved">'+rows.join('')+'</div>';
  h += nextHTML(2, 'Closest next');
  return h;
}
function peopleProgHTML(id){
  const pb = META.pb[id], pg = META.pg[id], qs = QUESTS[id] || [];
  let h = '<div class="pprog"><span class="pbadge">'+(pb == null ? 'No Crown win yet' : kImg('cr_'+crTier(Math.max(1, pb)))+'Best win: Crown '+pb)+(pg != null && pg >= 0 ? ' · '+kImg('gr_'+pg)+'<i style="color:'+GRADES[pg].c+'">'+GRADES[pg].n+' grade</i>' : '')+'</span>';
  h += qs.map((q, k) => { const qid = id+':'+k, dn = META.qd.has(qid), b = Math.min(q.g, META.q[qid]||0); return '<div class="pq'+(dn ? ' done' : '')+'"><b>'+kImg('mk_quest')+(dn ? '✓ ' : '')+esc(q.d)+'</b><small>+'+Q_REW[k]+' Glory</small>'+(!dn && q.g > 1 ? '<span class="pbar"><s style="width:'+(b/q.g*100).toFixed(1)+'%"></s></span><small>Best '+b.toLocaleString()+' / '+q.g.toLocaleString()+'</small>' : '')+'</div>'; }).join('');
  if(META.df && META.df[id]) h += '<small class="pqall">Decline and Fall best: held '+fmt(META.df[id])+'</small>';
  h += '<small class="pqall">'+(questAll(id) ? '✦ All quests done: starting troops begin at Lv 2' : 'Finish all three: starting troops begin at Lv 2')+'</small></div>';
  return h;
}

/* ---------- Artifacts: each has a home and a riddle ---------- */
const ART_SRC = {sunbanner:'camp', standard:'hold', cuirass:'camp', drum:'camp', chalice:'ruins', aegis:'ruins', blade:'hold', boots:'ruins', horn:'camp', lodestone:'ruins', phoenix:'hold', lens:'ruins', crown:'hold', plough:'ruins', anvil:'camp', scroll:'ruins', idol:'hold', compass:'ruins', chart:'camp', seal:'hold'};
const ART_RID = {sunbanner:'A banner that remembers the sun. Raiders fly it badly.', standard:'An eagle that never let its legion break.', cuirass:'Bronze skin, still warm from the last wearer.', drum:'It beats faster than any heart.', chalice:'Drink, and wounds forget themselves.', aegis:'A shield the old gods carried.', blade:'Forged from a fallen star. Only the strongest Warlord keeps it.', boots:'Wings where no bird would fly.', horn:'One call, and the brave answer sooner.', lodestone:'A stone that pulls men, not iron.', phoenix:'A feather from the bird that will not stay dead.', lens:'Glass that makes small truths large.', crown:'A crown won by coin, not blood.', plough:'Golden grain that never runs out.', anvil:'An anvil never meant for human hands.', scroll:'A scroll older than writing.', idol:'A green god that feeds on battle.', compass:'It points to where you have not been.', chart:'A map that knows the hidden places.', seal:'The mark of an emperor who opened every chest.'};
const ART_WHERE = {ruins:['Ruins', () => LIFE().ruins||0, 12], camp:['Barbarian camps', () => LIFE().camps||0, 10], hold:['Warlord strongholds', () => LIFE().holds||0, 3]};
function artRiddleHTML(k){
  const w = ART_WHERE[ART_SRC[k]||'ruins'], have = w[1](), sharp = have >= w[2];
  return '<span>“'+esc(ART_RID[k]||'')+'”<br>Most often found in: '+w[0]+(sharp ? '<br>Rumor says: '+esc(ARTS[k].d) : '<br><small>Search '+(w[2]-have)+' more '+w[0].toLowerCase()+' to learn more</small>')+'</span>';
}
