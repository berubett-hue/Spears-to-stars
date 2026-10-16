"use strict";
/* ---------- Decline and Fall: every empire falls ---------- */
const DF_ACTS = [null,
  {n:'The provinces slip away', d:'Your far cities break away one by one. Stand your general in a city to hold it'},
  {n:'The pretenders rise', d:'The peoples you conquered take up arms, led by pretenders to their old thrones'},
  {n:'The barbarian tide', d:'The wild lands empty onto your borders from every side'},
  {n:'The dark age', d:'Everything comes at once. Protect your capital and your way of life'}];
const DF_STAR = {n:'Answer from the stars', d:'Your launch was seen. Something comes down from the sky'};
const dfAct = d => d < 60 ? 1 : d < 120 ? 2 : d < 180 ? 3 : 4;
const dfEpitaph = h => h < 60 ? 'A brief flicker of glory' : h < 150 ? 'A dynasty remembered' : h < 240 ? 'An age that shaped the world' : 'An empire of legend';
function startDecline(fromWin){
  if(G.decline || G.demo || G.arena) return;
  G.decline = {t0:G.t, win:!!fromWin, act:0, bosses:0, k0:(G.stats.kills||0) + (G.stats.nkills||0), star:fromWin && G.winKind==='science', nextReb:G.t + 15, nextPre:0, nextTide:0, nextDark:0};
  if(fromWin) G.lifeDone = true;
  G.endless = true; modal = null; const ov = $('#ovEnd'); if(ov) ov.hidden = true;
  SFX.warn && SFX.warn(); { const cap = capitalOf(PLAYER); bigMoment({tier:'legend', sting:'decline', col:'#ff5a3c', kick:fromWin ? '⚔ The end game begins' : '⌛ Your empire has reached its peak', title:'Decline and Fall', sub:'Protect your capital and your way of life', at:cap ? {x:cap.x+.5, y:cap.y+.5} : null}); }
  /* the fall starts at once: revolts, raiders and a wave within seconds */
  G.decline.nextReb = G.t + 2; G.waveBoost = Math.max(G.waveBoost||1, 1.25); if(!(G.nextWave < G.t + 8)) G.nextWave = G.t + 8;
  toast(fromWin ? 'Your victory is saved. Now the empire unravels: protect your capital and your way of life. Every minute pays Glory' : 'Your empire has peaked and begins to unravel. Protect your capital and your way of life', 'bad');
}
function dfCity(pref){
  const cs = citiesOf(PLAYER); if(!cs.length) return null;
  const pool = pref ? cs.filter(pref) : [];
  const list = (pool.length ? pool : cs.filter(c => !c.capital).length ? cs.filter(c => !c.capital) : cs);
  return list[rint(list.length)];
}
function dfBand(c, n, types, mul, lead, col){
  if(!c) return null; const rc = col ? hexRgb(col) : (() => { const p = hexRgb(pcol()); return p.map(v => Math.round(v*.45 + 120*.55)); })(); let nb = 0; for(const u of G.units) if(u.owner===0 && u.hp > 0) nb++;
  n = Math.min(n, Math.max(0, (G.decline ? 300 : 240) - nb));
  let boss = null;
  if(lead){ const a = Math.random()*6.283; spawnBarb('warlord', clamp(c.x+.5+Math.cos(a)*2.5, .5, N-.5), clamp(c.y+.5+Math.sin(a)*2.5, .5, N-.5), mul); boss = G.units[G.units.length-1]; boss.name = lead; boss.reb = 1; boss.rc = rc; }
  for(let k=0;k<n;k++){ const a = Math.random()*6.283, r0 = 1.5 + Math.random()*2; spawnBarb(types[rint(types.length)], clamp(c.x+.5+Math.cos(a)*r0, .5, N-.5), clamp(c.y+.5+Math.sin(a)*r0, .5, N-.5)); { const ru = G.units[G.units.length-1]; ru.reb = 1; ru.rc = rc; } }
  return boss;
}
function declineTick(){
  const D = G.decline; if(!D || D.done) return;
  const d = G.t - D.t0, m = d/60, act = dfAct(d);
  dfUnravel(D, m);
  G.declMul = Math.max(.25, 1 - d/360);
  G.declScale = Math.pow(1.45, m) * (1 + m*.05);
  dfEnd(D, d);
  if(act !== D.act){ D.act = act; const A = (act===4 && D.star) ? DF_STAR : DF_ACTS[act]; banner('Act '+['','I','II','III','IV'][act]+' · '+A.n, A.d); toast(A.d, 'bad'); if(act > 1) MUS.sting && MUS.sting('act'); }
  if(G.t >= D.nextReb){ D.nextReb = G.t + Math.max(18, 35 - m*2); const c = dfCity(); if(c){ dfBand(c, 4 + Math.min(16, Math.floor(m*2)), ['warband','raider','brute'], 1); toast('⚑ '+c.name+' revolts! Rebels rise in its streets', 'bad', {x:c.x+.5, y:c.y+.5}); } }
  if(act >= 2 && G.t >= D.nextPre){ D.nextPre = G.t + Math.max(25, 45 - m*2); const c = dfCity(k => k.prevOwner > 1); const rv = c && c.prevOwner > 1 ? rival(c.prevOwner) : null;
    const nm = rv ? 'The Pretender of '+rv.name : 'A Rebel Pretender'; const b = dfBand(c, 8 + Math.floor(m*2), ['warband','brute','raider'], 1 + m*.3, nm, rv ? rv.col : null);
    if(c){ toast('♛ '+nm+' raises an army at '+c.name, 'bad', {x:c.x+.5, y:c.y+.5}); } }
  if(act >= 2 && G.t >= D.nextTide){ D.nextTide = G.t + Math.max(8, 26 - m*2); G.waveBoost = Math.max(G.waveBoost||1, 1.5 + m*.25); if(G.nextWave > G.t + 6) G.nextWave = G.t + 6; }
  if(act >= 4 && G.t >= D.nextDark){ D.nextDark = G.t + 60; const side = rint(4), p = edgePoint(side, rnd(8,N-8), .5);
    spawnBarb('warlord', p[0], p[1], 2 + m*.4); const b = G.units[G.units.length-1]; b.name = D.star ? 'The Star-born' : 'The Last Warlord';
    for(let j=0;j<40;j++){ const q = edgePoint((side+rint(3)+3)%4, rnd(2,N-2), rnd(0,2)); spawnBarb(pickType(G.t), q[0], q[1]); }
    banner(b.name, D.star ? 'Fire falls from the sky' : 'The dark age deepens'); toast(b.name+' comes for your capital', 'bad', {x:p[0], y:p[1]}); R.shake = Math.min(6, (R.shake||0) + 3); }
}
/* the empire unravels: far cities slip away unless your general stands in them */
function dfUnravel(D, m){
  const cap = capitalOf(PLAYER); if(!cap) return; const h = heroOf(PLAYER);
  const cs = citiesOf(PLAYER).filter(c => !c.capital && !c.dead); if(!cs.length){ if(!D.last && D.lostN){ D.last = true; banner('The Last Stand', 'Only '+cap.name+' remains. Protect your capital and your way of life'); toast('Only '+cap.name+' remains. Protect your capital and your way of life', 'bad', {x:cap.x+.5, y:cap.y+.5}); MUS.sting && MUS.sting('act'); R.shake = Math.min(6, (R.shake||0) + 3); G.waveBoost = Math.max(G.waveBoost||1, 1.6); } return; }
  const far = Math.max(1, ...cs.map(c => Math.hypot(c.x-cap.x, c.y-cap.y)));
  for(const c of cs){
    const held = h && Math.hypot(h.x-(c.x+.5), h.y-(c.y+.5)) < 3.2;
    if(held){ if(!c.dfHeld){ c.dfHeld = 1; float('Held', c.x+.5, c.y-.6, '#ffd36a', 1.2); } continue; }
    c.dfHeld = 0;
    const rate = (.009 + .0025*m) * (.6 + .8*Math.hypot(c.x-cap.x, c.y-cap.y)/far);
    c.hp -= cityMax(c)*rate*.5;
    if(!c.dfWarn && c.hp < cityMax(c)*.5){ c.dfWarn = 1; toast('⚑ '+c.name+' is slipping away. Stand your general in it to hold it', 'warn', {x:c.x+.5, y:c.y+.5}); }
    if(c.hp <= 0){ c.hp = 0; c.dead = true; c.killer = 0; c.brk = 1; D.lostN = (D.lostN||0) + 1; }
  }
}
/* the end of the age: like the reaper, it cannot be stopped */
const DF_END = 1200;
const dfEndAt = D => D.endAt || (D.endAt = Math.max(DF_END, D.t0 + 180));
function dfEnd(D, d){
  const ea = dfEndAt(D);
  if(G.t >= ea - 60 && !D.endWarn){ D.endWarn = 1; banner('The end of the age approaches', 'In one minute, the End comes for '+((capitalOf(PLAYER)||{}).name || 'your capital')); toast('In 60 seconds the End of the Age marches on your capital. It cannot be stopped', 'bad'); MUS.sting && MUS.sting('act'); }
  if(G.t >= ea && G.t >= (D.nextEnd||0)){
    D.nextEnd = G.t + 25; const cap = capitalOf(PLAYER); if(!cap) return;
    const ang = Math.random()*6.283, p = [clamp(cap.x+.5+Math.cos(ang)*14, 1, N-1), clamp(cap.y+.5+Math.sin(ang)*14, 1, N-1)];
    spawnBarb('warlord', p[0], p[1], 1); const b = G.units[G.units.length-1];
    b.name = 'The End of the Age'; b.hp = b.max = 1e9; b.dmg *= 40; b.spd *= 1.4; b.endless = 1; b.reb = 1; b.rc = [30,20,40];
    if(!D.endN){ banner('The End of the Age', 'Nothing lasts forever. Make your last stand'); bigMoment({tier:'legend', sting:'decline', col:'#b04aff', kick:'☠ It cannot be stopped ☠', title:'The End of the Age', sub:'Hold '+cap.name+' to the last', at:{x:p[0], y:p[1]}}); }
    D.endN = (D.endN||0) + 1; toast('☠ The End of the Age marches on '+cap.name, 'bad', {x:p[0], y:p[1]}); R.shake = Math.min(8, (R.shake||0) + 4);
  }
}
function declineEnd(){
  const D = G.decline; if(!D || D.done) return; D.done = true;
  D.held = Math.max(0, G.t - D.t0); D.kills = Math.max(0, (G.stats.kills||0) + (G.stats.nkills||0) - D.k0);
  const pb = (META.df = META.df || {})[G.perk] || 0; D.best = D.held > pb; D.pb = pb; if(D.best) META.df[G.perk] = Math.floor(D.held);
  META.life.dfBest = Math.max(META.life.dfBest||0, Math.floor(D.held)); lifeDirty = true;
  D.parts = [['Held for '+fmt(D.held), Math.round(D.held/60*80)], ['Bosses slain', D.bosses*50], ['Foes cut down', Math.round(D.kills*.05)]].filter(x => x[1] > 0);
  if(D.win){ const dm = G.diff===0 ? .8 : crownMul(G.crown||0), sub = D.parts.reduce((a,x) => a + x[1], 0), tot = Math.round(sub*dm); G.glory = {parts:D.parts, dm, total:tot}; META.glory += tot; META.gloryT += tot; }
  saveLife();
}
function declineUI(){
  const D = G.decline; if(!D || !D.done) return;
  const kick = $('#endKicker'), tt = $('#endTitle'); if(kick) kick.textContent = 'Decline and Fall'+(D.win ? ' · after your victory' : ' · after your peak');
  if(tt) tt.textContent = dfEpitaph(D.held);
  const rows = Object.keys(G.dmg||{}).filter(k => k.startsWith(PLAYER+':') && CARDS[k.slice(2)]).sort((a,b) => G.dmg[b].d - G.dmg[a].d), top = rows[0] ? cardName(PLAYER, rows[0].slice(2)) : '—';
  const st = [[fmt(D.held), 'Held after the peak'], [D.best ? 'New best!' : fmt(D.pb), D.best ? 'Personal record' : 'Your best as '+(G.natName||'this people')], [D.kills.toLocaleString(), 'Foes cut down'], [D.bosses, 'Pretenders and Warlords slain'], [top, 'Top troop line'], [ERAS[G.eraIdx], 'Era reached']];
  const es = $('#endStats'); if(es) es.innerHTML = st.map(x => '<div class="stat"><b>'+esc(String(x[0]))+'</b><span>'+x[1]+'</span></div>').join('') + endProgHTML();
  const ea = $('#endArt'), di = D.held < 120 ? 0 : D.held < 300 ? 1 : D.held < 600 ? 2 : 3; if(ea && (KIT['df_'+di] || KIT.vic_defeat)) ea.src = KIT['df_'+di] || KIT.vic_defeat;
}
function declineHud(){
  const el = $('#declChip'); if(!el || !el.querySelector) return;
  const D = G && G.decline; if(!D || D.done || G.demo){ if(!el.hidden) el.hidden = true; return; }
  el.hidden = false; const d = G.t - D.t0, act = dfAct(d), A = (act===4 && D.star) ? DF_STAR : DF_ACTS[act];
  const txt = kImg('mk_rebel')+'<b>Decline and Fall</b><span>Act '+['','I','II','III','IV'][act]+' · '+A.n+'</span><em>'+(G.t >= dfEndAt(D) ? '☠ The End · ' : G.t >= dfEndAt(D) - 60 ? '☠ The End in '+Math.ceil(dfEndAt(D) - G.t)+'s · ' : D.last ? 'Last stand · ' : citiesOf(PLAYER).length+' cities · ')+'Held '+fmt(d)+'</em>';
  if(el.innerHTML !== txt) el.innerHTML = txt;
}
function endGame(won, fallenCap, by, kind, who){
  if(G.demo){ R.demoReset = true; return; }
  if(G.decline && won) return;
  if(G.decline && !won && !G.decline.done) declineEnd();
  if(won && !G.arena){ G.won = true; G.winKind = kind==='science' ? 'science' : kind==='prosperity' ? 'prosperity' : (G.rivals.filter(r => r.status==='joined' && !r.conq).length > G.rivals.length/2 ? 'diplomacy' : 'conquest'); }
  if(!G.arena && !G.lifeDone) endMeta(won);
  MUS.sting((G.decline && G.decline.done) ? 'epitaph' : won ? 'win' : 'lose');
  if(won && !G.arena && (G.newCrown || G.grade)) setTimeout(() => { if(G.newCrown) MUS.sting('crown'); else MUS.sting('grade', {i:G.grade.i}); }, 4600);
  if(!G.arena && !G.lifeDone){ G.glory = calcGlory(won); META.glory += G.glory.total; META.gloryT += G.glory.total; if(won){ lifeAdd('wins'); G.cards.forEach(sl => mxAdd(sl.id, 60)); if(G.cards.some(sl => sl.id==='priests')) lifeAdd('wHeal'); if(CR(5)) lifeAdd('wEmp'); } saveLife(); }
  if(won){ G.won = true; G.winKind = kind==='science' ? 'science' : kind==='prosperity' ? 'prosperity' : (G.rivals.filter(r => r.status==='joined' && !r.conq).length > G.rivals.length/2 ? 'diplomacy' : 'conquest'); modal = 'end'; checkAch(); }
  else {
    G.ended = true;
    if(fallenCap){ burst(fallenCap.x+.5, fallenCap.y+.5, 50, '#ffb35c'); focusOn(fallenCap.x+.5, fallenCap.y+.5); }
    R.shake = 10; SFX.fall();
  }
  saveBest();
  const ov = $('#ovEnd'); if(!ov || !ov.querySelector) return;
  if(!won && kind==='rivalship'){ G.ended = true; const cap = capitalOf(who.id); if(cap) focusOn(cap.x+.5, cap.y+.5); }
  const joined = G.rivals.filter(r => r.status==='joined' && !r.conq).length;
  { const ea = $('#endArt'); if(ea){ const joinedN = G.rivals.filter(r => r.status==='joined' && !r.conq).length; ea.src = KIT['vic_'+(!won ? 'defeat' : kind==='science' ? 'science' : kind==='prosperity' ? 'diplomacy' : joinedN > G.rivals.length/2 ? 'diplomacy' : 'conquest')]; } }
  { const rb = $('#endRibbon'); if(rb){ rb.src = UIA[won ? 'victory' : 'defeat']; rb.alt = won ? 'Victory' : 'Defeat'; rb.style.display = (G.decline && G.decline.done) ? 'none' : ''; } }
  $('#endKicker').textContent = won ? (kind==='science' ? 'Science victory' : kind==='prosperity' ? 'Prosperity victory' : joined > G.rivals.length/2 ? 'Diplomatic victory' : 'Conquest victory') : 'Defeat';
  $('#endTitle').textContent = won ? (kind==='science' ? 'Your starship lifts off' : kind==='prosperity' ? 'Your empire is the envy of the world' : 'Every nation answers to you')
    : kind==='rivalship' ? who.name+' reached the stars first'
    : fallenCap ? (by ? fallenCap.name+' was taken by '+by : fallenCap.name+' has fallen') : 'The capital has fallen';
  const st = [
    [fmt(G.t),'Survived'], [ERAS[G.eraIdx],'Era reached'], ['Lv '+(G.level||0),'Empire level'],
    [G.rivals.filter(r => !r.alive).length+'/'+G.rivals.length,'Nations conquered'], [G.stats.captured,'Cities taken'], [G.stats.kills,'Raiders slain']
  ];
  $('#endStats').innerHTML = st.map(s => '<div class="stat"><b>'+s[0]+'</b><span>'+s[1]+'</span></div>').join('') + endProgHTML();
  if(G.decline && G.decline.done) declineUI();
  { const sh = ov.querySelector('.sheet'); if(sh) sh.scrollTop = 0; }
  gloryTally();
  $('#btnEndless').hidden = !won || !!G.decline;
  ['#ovDraft','#ovEvent','#ovDiplo','#ovPause'].forEach(s => { const e=$(s); if(e) e.hidden = true; });
  if(won && kind==='science'){ modal = 'end'; launchCine(() => { ov.hidden = false; }); }
  else setTimeout(() => { ov.hidden = false; const sh = ov.querySelector('.sheet'); if(sh) sh.scrollTop = 0; }, won ? 300 : 1600);
}
function calcGlory(won){
  const st = G.stats, dm = G.diff===0 ? .8 : crownMul(G.crown||0), parts = [
    ['Time survived', Math.round(G.t/60*12)],
    ['Eras reached', 50*(G.eraIdx||0)],
    ['Enemies defeated', (st.kills||0) + 2*(st.nkills||0)],
    ['Cities founded', 10*(st.founded||0)],
    ['Cities taken', 30*(st.captured||0)],
    ['Warlords slain', 40*(st.warlords||0)],
    ['Capitals razed', 60*(G.razed||0)],
    ['The Red Horde burned', 150*(st.horde||0)],
    ['Resource sites held', 15*((G.sites||[]).filter(s => s.owner===PLAYER).length)],
    ['Wild sites', 15*((st.ruins||0) + (st.camps||0) + (st.wonders||0))],
    ['Victory', won ? 400 : 0],
    [G.grade ? GRADES[G.grade.i].n+' grade' : '', won && G.grade ? GRADES[G.grade.i].g : 0],
    ['First Crown '+(G.crown||0)+' win as '+(G.natName||'this people'), won && G.firstClear ? 100 + 40*(G.crown||0) : 0],
    ['First '+(G.winKind||'')+' win as '+(G.natName||'this people'), won && G.firstKind ? FIRST_KIND_GLORY : 0],
    ...((G.decline && G.decline.done && G.decline.parts) ? G.decline.parts : [])
  ].filter(p => p[1] > 0);
  const sub = parts.reduce((a,p) => a+p[1], 0), total = Math.round(sub*dm);
  return {parts, dm, total};
}
function gloryTally(){
  const el = $('#endGlory'); if(!el || !G.glory) return; const g = G.glory;
  el.innerHTML = '<h3>Glory earned</h3><div class="gl-rows">'+g.parts.map((p,i) => '<div class="gl-row" style="animation-delay:'+(0.25 + i*.18)+'s"><span>'+p[0]+'</span><b>+'+p[1].toLocaleString()+'</b></div>').join('')+(g.dm !== 1 ? '<div class="gl-row" style="animation-delay:'+(0.25 + g.parts.length*.18)+'s"><span>'+(G.diff===0 ? 'Chieftain' : 'Crown '+(G.crown||0))+'</span><b>×'+g.dm+'</b></div>' : '')+'</div><div class="gl-total"><i class="coin"></i> <b id="glCount">0</b> Glory</div><p class="lnote">Spend it in Legacy from the main menu. You have '+META.glory.toLocaleString()+' in all.</p>';
  const t0 = performance.now(), dur = 900 + g.parts.length*180, b = $('#glCount');
  const step = now => { const k = Math.min(1, (now - t0 - 300)/dur); if(b) b.textContent = Math.max(0, Math.round(g.total*Math.max(0, k))).toLocaleString(); if(k < 1) requestAnimationFrame(step); else SFX.pick && SFX.pick(); };
  requestAnimationFrame(step);
}
function endProgHTML(){
  const g = G.mxg || {}, ids = Object.keys(g).filter(id => CARDS[id]).sort((a,b) => g[b]-g[a]);
  let h = '<div class="endprog">'+endCrownHTML()+'<h3>Mastery earned</h3>';
  h += ids.length ? '<div class="meter">'+ids.map(id => { const r = mRank(id), xp = META.mx[id]||0; return '<div class="mrow"><span>'+CARDS[id].n+' <em class="stars">'+mStars(id)+'</em></span><b>+'+g[id]+' XP<small> · '+(r < MX_T.length ? xp+' / '+MX_T[r]+' to rank '+(r+1) : 'mastered')+'</small></b><i><s style="width:'+(r < MX_T.length ? Math.min(100, (xp-(MX_T[r-1]||0))/(MX_T[r]-(MX_T[r-1]||0))*100) : 100).toFixed(1)+'%"></s></i></div>'; }).join('')+'</div>' : '<p class="lnote">No troop earned mastery this game.</p>';
  if(G.newUnl && G.newUnl.length) h += '<p class="lnote">✦ Unlocked: '+G.newUnl.map(id => CARDS[id] ? CARDS[id].n : (NATIONS_P.find(n => 'nat:'+n.id===id)||{}).n || 'the Crown ladder').join(', ')+'</p>';
  h += endMovedHTML();
  return h + '</div>';
}
function saveBest(){
  try { const best = +localStorage.getItem('empireHeaven.best') || 0; if(G.t > best) localStorage.setItem('empireHeaven.best', String(Math.floor(G.t))); } catch(e){}
}
function showBest(){
  let best = 0; try { best = +localStorage.getItem('empireHeaven.best') || 0; } catch(e){}
  const el = $('#best'); if(el) el.textContent = best ? 'Longest reign: '+fmt(best) : '';
}
