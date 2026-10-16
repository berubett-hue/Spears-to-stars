"use strict";
/* ---------- Update ---------- */
function update(dt){
  if(R.conqQ && !modal && !G.ended){ const q = R.conqQ; R.conqQ = null; openConquest(q); if(modal) return; }
  if(G.govQ != null && !modal && !G.ended && !G.demo && !G.arena){ const a = G.govQ; G.govQ = null; openGov(a); if(modal) return; }
  G.t += dt;
  for(const k in G.cd) G.cd[k] = Math.max(0, G.cd[k]-dt);
  for(const k in G.buff) G.buff[k] = Math.max(0, G.buff[k]-dt);
  G.econAcc += dt;
  while(G.econAcc >= .5){ G.econAcc -= .5; if(R.bdirty) rebuildB(); econ(.5); rivalEcon(.5); if(!G.arena){ moraleTick(.5); battleTick(.5); focusTick(); levyTick(.5); unrestTick(); if(G.decline) declineTick(); } diplomacy(.5); constructBuildings(.5); if(!G.arena){ hostTick(); holdTick(); govTick(); siteTick(.5); hordeTick(.5); prosTick(.5); } }
  if(!G.arena && !modal){ G.eraT = (G.eraT||0) + dt; if(G.eraT > 1){ G.eraT = 0; const o = G.eraIdx; if(Math.min(eraOfLevel(G.level||0), timeEra(G.t)) > o){ refreshStats(); if(G.eraIdx > o) eraUp(o); } } }
  const dm = DOCT[G.doctrine];
  G.borderAcc += (.45 + .12*citiesOf(PLAYER).length) * (1+S.border) * dm.border * dt;
  while(G.borderAcc >= 1){ G.borderAcc -= 1; claimOne(PLAYER); }
  const re = rEra();
  for(const r of G.rivals){
    if(!r.alive) continue;
    r.borderAcc += (.4 + .1*citiesOf(r.id).length) * (1+.25*re) * dt;
    while(r.borderAcc >= 1){ r.borderAcc -= 1; claimOne(r.id); }
  }
  for(const c of G.cities){
    const mx = cityMax(c);
    if(c.hp < mx && !(G.decline && !G.decline.done && c.owner===PLAYER && !c.capital)) c.hp = Math.min(mx, c.hp + (1.2+.3*c.pop)*(c.owner===PLAYER ? (1+S.regen)*(proto('bunkers') && isPart(c) ? 3 : 1) : 1)*((R.cb.get(c.id)||{}).hospital ? 2 : 1)*dt);
  }
  if(!G.decline && !G.won && !G.ended && !G.demo && !G.arena && !G.proj){ if(G.t >= 900) startDecline(false); else if(G.t >= 780 && !G.declWarn){ G.declWarn = 1; banner('Your empire nears its peak', 'At 15:00 the decline begins'); toast('Win before 15:00, or the Decline and Fall begins','warn'); } else if(G.t >= 870 && !G.declWarn2){ G.declWarn2 = 1; toast('30 seconds until the Decline and Fall','bad'); } }
  waves();
  G.raidAcc -= dt;
  if(G.raidAcc <= 0 || R.raidForce){ G.raidAcc = 1; R.raidForce = false; navTick(); computeRaidTargets(); R.hosts = R.hostsN || []; battleAlerts(); }
  const cityById = new Map(G.cities.map(c => [c.id,c]));
  heroTick(dt);
  const unitById = new Map(G.units.map(u => [u.id,u]));
  updateUnits(dt, cityById, unitById);
  updateFires(dt); updateBarrage(dt); poiTick(dt);
  R.fogAcc = (R.fogAcc||0) + dt; if(R.fogAcc > .4){ R.fogAcc = 0; fogTick(); }
  updateTowers(dt);
  G.units = G.units.filter(u => u.hp > 0);
  resolveCities();
  if(G.ended || (G.won && modal==='end')) return;
  if(G.musterT === undefined) G.musterT = 40;
  G.musterT -= dt;
  if(G.musterT <= 0){ G.musterT += 40; G.rivals.forEach(r => { if(r.alive){ rivalPick(r); if(Math.random() < DF().extra) rivalPick(r); } }); }
  G.achAcc = (G.achAcc||0) + dt; if(G.achAcc > 2){ G.achAcc = 0; if(!G.arena && !G.demo){ statTick(); questCheck(false); } checkAch(); }
  if(modal) return;
  if(G.t < (G.gate||0)) return;
  if((G.chestQ||[]).length){ openChest(); return; }
  if(G.supQ){ G.supQ = false; if(G.cards.length < cardSlots() && openSupport()) return; }
  if(G.sci >= levelCost(G.level||0)){
    if(levelOptions().length) openChoices();
    else {
      G.sci = levelCost(G.level||0);
      if(!G.maxed){ G.maxed = true; banner('Your build is complete', 'Every troop and civic maxed'); toast('No more level-ups. From now on your science speeds up starship parts','good'); }
    }
  } else if(G.maxed && levelOptions().length) G.maxed = false;
  else if(G.t >= G.nextEvent) openEvent();
}

/* ---------- Draft ---------- */
const eraCount = () => G.techs.filter(id => BYID[id].era===G.eraIdx && !BYID[id].adv).length;
function techAvailable(t, need){
  if(G.techs.includes(t.id) || t.era > G.eraIdx) return false;
  if(!t.req.every(r => G.techs.includes(r))) return false;
  if(t.obs && S.tiers[t.obs[0]] >= t.obs[1]) return false;
  if(t.adv && eraCount() < KEY_NEED) return false;
  if(t.era < G.eraIdx-1 && !t.line && !TECH_ABIL[t.id] && !need.has(t.id)) return false;
  return true;
}
function draftChoices(){
  const n = 3 + S.choices;
  const need = new Set(); TECHS.forEach(t => { if(!G.techs.includes(t.id) && t.era >= G.eraIdx-1) t.req.forEach(r => need.add(r)); });
  const avail = TECHS.filter(t => techAvailable(t, need));
  const choices = [];
  const key = avail.find(t => t.adv); if(key) choices.push(key);
  const evos = EVOS.filter(e => !G.techs.includes(e.id) && e.req.every(r => G.techs.includes(r)));
  if(evos.length && choices.length < n) choices.push(evos[rint(evos.length)]);
  const path = new Set(), nextKey = TECHS.find(t => t.adv===G.eraIdx+1);
  const walk = id => { if(G.techs.includes(id) || path.has(id)) return; path.add(id); BYID[id].req.forEach(walk); };
  if(nextKey) nextKey.req.forEach(walk); else if(!G.techs.includes('space')) walk('space');
  const pool = avail.filter(t => !t.adv).map(t => ({t, w:(t.era===G.eraIdx ? 3 : 1.4)*(t.line ? 1.3 : 1)*(path.has(t.id) ? 4 : 1)*(t.proj ? 6 : 1)*(TECH_ABIL[t.id] && G.cards.some(sl => CARDS[sl.id].tags.includes(TECH_ABIL[t.id])) ? 1.6 : 1)}));
  while(choices.length < n && pool.length){
    const tot = pool.reduce((a,b)=>a+b.w,0); let r = Math.random()*tot, k = 0;
    for(;k<pool.length;k++){ if((r -= pool[k].w) <= 0) break; }
    k = Math.min(k, pool.length-1);
    choices.push(pool[k].t); pool.splice(k,1);
  }
  const bp = shuffle(BOONS.slice());
  while(choices.length < n && bp.length) choices.push(bp.pop());
  const left = key ? '' : (TECHS.find(t => t.adv===G.eraIdx+1) ? ' · keystone needs '+Math.max(0,KEY_NEED-eraCount())+' more '+ERAS[G.eraIdx]+' tech'+(KEY_NEED-eraCount()===1?'':'s') : '');
  R.draftKick = 'Discovery ' + (G.picks+1) + ' · ' + ERAS[G.eraIdx] + ' Era' + (eraCount()<KEY_NEED ? left : '');
  return choices;
}

/* ---------- A new age: choose a support line ---------- */

/* ---------- Hidden peoples: each secret troop line is the core of a people ---------- */
const SPERK = {
  wolves:(u, s0) => { s0.spd *= 1.15; if(CARDS[u.card] && CARDS[u.card].tags.includes('Mounted')) s0.dmg *= 1.1; },
  firemonks:(u, s0) => { const t = (CARDS[u.card]||{}).tags || []; if(t.includes('Fire') || t.includes('Holy')) s0.dmg *= 1.15; if(!u.hero) s0.selfheal = Math.max(s0.selfheal||0, .008); },
  golems:(u, s0) => { if(((CARDS[u.card]||{}).tags||[]).includes('Titan')) s0.hp *= 1.2; },
  skylancers:(u, s0) => { if(u.hero) s0.spd *= 1.2; else if(((CARDS[u.card]||{}).tags||[]).includes('Mounted')) s0.dmg *= 1.2; },
  colossus:(u, s0) => { if(((CARDS[u.card]||{}).tags||[]).includes('Titan')){ s0.hp *= 1.25; s0.dmg *= 1.25; } }
};
const SBAL = {wolves:.92, firemonks:.9, golems:1, skylancers:.95, shadows:.78, colossus:1.5};
const secretPeople = id => NATIONS_P.find(n => n.id===id && n.secret);
/* a secret line fights only for its own people until that people's three quests are done */
const lineAllowed = id => !CARDS[id] || !CARDS[id].secret || (G && G.core===id) || questAll(id);
const lineEra = id => { const x = CARDS[id].secret && SECRETS.find(q => q.id===id); return x ? Math.max(0, ERAS.indexOf(x.era)) : CARDS[id].era; };
function supportOptions(n){
  const ids = Object.keys(CARDS).filter(id => lineEra(id) <= G.eraIdx && isUnlocked(id) && lineAllowed(id) && !slotOf(id) && !(G.banned||[]).includes('troop:'+id) && !G.cards.some(sl => { const ev = sl.evo && UEVO.find(e => e.id===sl.evo); return ev && ev.with===id; }));
  return shuffle(ids).slice(0, n || 3).map(id => ({ucard:'new', id}));
}
function openSupport(){
  const ch = supportOptions(3); if(!ch.length) return false;
  R.supMode = true; R.choices = ch; R.mchoices = []; R.pickedT = false; R.pickedM = true; R.pickT = null;
  const k = G.cards.length - (G.freeSlots||0);
  R.draftTitle = 'The '+ERAS[G.eraIdx]+' Age · choose a support line';
  R.draftKick = 'Support '+k+' of '+(CR(8) ? 1 : 2)+' · it fights beside your core, '+cardName(PLAYER, G.core)+' · Reroll or Banish to fish, or Skip to decide later';
  modal = 'draft'; R.openedAt = performance.now();
  renderChoices();
  const ov = $('#ovDraft'); if(ov && ov.querySelector){ ov.hidden = false; SFX.open && SFX.open(); }
  return true;
}
function openChoices(){
  R.supMode = false;
  R.draftTitle = null; R.choices = levelOptions(); if(R.choices.some(t => t && t.str)) G.strOff = 1; R.mchoices = []; R.pickedT = false; R.pickedM = true; R.pickT = null;
  R.draftKick = 'Level '+((G.level||0)+1)+' · '+ERAS[G.eraIdx]+' Age'+(G.eraIdx < 5 ? ' · '+eraNote() : '');
  modal = 'draft'; R.openedAt = performance.now();
  renderChoices();
  const ov = $('#ovDraft'); if(!ov || !ov.querySelector) return;
  ov.hidden = false; SFX.open();
}

/* ---------- The build, made visible ---------- */
function buildTags(t){
  const out = [], add = (k, txt) => out.push({k, txt});
  if(!t || !G || !G.cards) return out;
  const own = id => slotOf(id), syn = g => R.syn[g]||0;
  if((t.ucard==='new' || t.ucard==='lvl') && CARDS[t.id]){
    const C = CARDS[t.id], sl = own(t.id);
    if(t.ucard==='new'){
      if(G.core && CARDS[G.core] && t.id!==G.core){ const CC = CARDS[G.core], hunt = huntersOf(CC).filter(g => preyOf(C).includes(g)); if(hunt.length) add('cover', 'Covers your core: hunts '+hunt.join(', ')); if(C.tags.some(g => CC.tags.includes(g))) add('syn2', 'Same type as your core'); }
      for(const g of C.tags) if(SYN[g] && SYN[g].some(([n]) => syn(g)+1 === n)) add('syn', 'Activates '+g+' synergy');
      for(const g of C.tags) if(SYN[g] && syn(g) >= 2) add('syn2', 'Joins your '+g+' synergy');
      const partners = COMBOS.filter(c => (c.a===t.id && (c.b ? own(c.b) : G.cards.some(x => CARDS[x.id].tags.includes(c.tag)))) || (c.b===t.id && own(c.a)) || (c.tag && C.tags.includes(c.tag) && own(c.a)));
      for(const c of partners) add('combo', 'Combo · '+c.n);
      for(const e of UEVO) if(e.union && known(e) && evoUsable(e) && ((e.from===t.id && own(e.with)) || (e.with===t.id && own(e.from)))) add('evo', 'Union path · '+e.n);
      for(const e of UEVO) if(!e.union && known(e) && e.from===t.id && relicLv(e.relic)) add('evo', 'Evolution path · '+e.n);
    } else if(sl && !sl.evo){
      const nl = sl.lvl + 1, rd = evoReady({id:t.id, lvl:nl, evo:null});
      if(rd && !evoReady(sl)) add('ready', known(rd) ? rd.n+' ready at the next War Chest' : 'Something will stir at the next War Chest');
      else if(!rd){ for(const e of knownEvos(t.id)){ const L = evLv(e); if(e.from===t.id && nl <= L){ add('evo', e.n+' · Lv '+nl+' of '+L); break; } if(e.with===t.id && own(e.from) && nl <= L){ add('evo', e.n+' · partner Lv '+nl+' of '+L); break; } } }
      if(nl===8) add('ready', 'Final form');
    }
  } else if((t.ucard==='rnew' || t.ucard==='rlvl') && RELICS[t.id]){
    const lv = relicLv(t.id);
    for(const e of UEVO) if(!e.union && e.relic===t.id && own(e.from) && !own(e.from).evo){
      if(known(e)) add(lv ? 'evo' : 'ready', (lv ? 'Fuels ' : 'Unlocks ')+e.n+' for your '+CARDS[e.from].n);
      else if(!lv) add('hint', '? Something stirs with your '+CARDS[e.from].n);
    }
  }
  return out;
}
const BT_IC = {syn:'⚡', syn2:'⚡', combo:'✦', evo:'◆', ready:'★', hint:'◇', cover:'⛨'};
function buildTagsHTML(t){ const L = buildTags(t); return L.length ? '<span class="btags">'+L.slice(0, 3).map(x => '<i class="bt bt-'+x.k+'">'+BT_IC[x.k]+' '+esc(x.txt)+'</i>').join('')+'</span>' : ''; }
const isBuildPick = t => buildTags(t).some(x => x.k !== 'syn2' && x.k !== 'hint');
function buildStripHTML(){
  if(!G || !G.cards) return '';
  let h = '<div class="bstrip"><span class="bs-h">Your build</span><span class="bs-row">';
  for(const sl of G.cards){ const lv = Math.min(8, sl.lvl), u = USPR.ok && USPR.m[sl.id] ? artURL('us_'+sl.id+'_'+lv+'_'+pcol(), () => uPortrait(sl.id, lv)) : ''; h += '<span class="bs-u'+(sl.evo ? ' ev' : '')+(isCore(sl.id) ? ' core' : '')+'" title="'+esc((isCore(sl.id) ? 'Core · ' : 'Support · ')+cardName(PLAYER, sl.id))+'">'+(isCore(sl.id) ? '<em>'+(KIT.mk_core ? kImg('mk_core', 'coreic') : '♛')+'</em>' : '')+(u ? '<img src="'+u+'" alt="">' : '')+'<b>'+(sl.evo ? '★' : lv)+'</b></span>'; }
  for(let k=G.cards.length; k<cardSlots(); k++) h += '<span class="bs-u empty"><b>+</b></span>';
  if(G.core && !G.demo){ const nxt = G.eraIdx < 1 ? 'Support slot in the Classical Age' : (G.eraIdx < 2 && !CR(8)) ? 'Second support in the Medieval Age' : ''; if(nxt && G.cards.length >= cardSlots()) h += '<span class="bs-next">'+nxt+'</span>'; }
  h += '</span><span class="bs-row">'+(G.relics||[]).map(r => '<span class="bs-c" title="'+esc(RELICS[r.id].n)+'">'+(KIT['cv_'+r.id] ? '<img src="'+KIT['cv_'+r.id]+'" alt="">' : '<i>'+esc(RELICS[r.id].n.slice(0,2))+'</i>')+'<b>'+r.lvl+'</b></span>').join('')+'</span>';
  const tags = Object.keys(R.syn||{}).filter(g => SYN[g]).sort((a,b) => R.syn[b] - R.syn[a]);
  h += '<span class="bs-row bs-syn">'+tags.map(g => { const n = R.syn[g], need = SYN[g][0][0]; return '<i class="'+(n >= need ? 'on' : '')+'">⚡ '+g+' '+Math.min(n, need)+'/'+need+'</i>'; }).join('');
  for(const c of COMBOS){ const on = (c.b ? slotOf(c.a) && slotOf(c.b) : slotOf(c.a) && G.cards.some(x => CARDS[x.id].tags.includes(c.tag))); if(on) h += '<i class="on combo">✦ '+esc(c.n)+'</i>'; }
  if(G.core) h += '<i class="'+(G.focus ? 'on focus' : 'focus')+'" title="Core troops get +15% health and damage at 50% of your army and +30% at 75%. Rivals counter a focused core harder">♛ Focus '+Math.round((G.focusPct||0)*100)+'%'+(G.focus ? ' · +'+15*G.focus+'%' : ' · 50% for +15%')+'</i>';
  h += '</span>';
  const paths = G.cards.map(sl => evoStatus(sl)).filter(es => es.state==='path' || es.state==='ready').slice(0, 2);
  if(paths.length) h += '<span class="bs-row bs-evo">'+paths.map(es => '<i class="'+(es.state==='ready' ? 'ready' : '')+'">'+(es.state==='ready' ? '★ ' : '◆ ')+esc(es.txt)+'</i>').join('')+'</span>';
  return h + '</div>';
}
function renderChoices(){
  const ov = $('#ovDraft'); if(!ov || !ov.querySelector) return;
  $('#draftTitle').textContent = R.draftTitle || 'Level up · military, science or expansion?';
  $('#secT').hidden = false; $('#secM').hidden = true;
  $('#draftKicker').textContent = R.draftKick||'';
  const el = $('#cards');
  { const bs = $('#buildStrip'); if(bs) bs.innerHTML = R.shipPick ? '' : buildStripHTML(); }
  el.innerHTML = R.choices.map(t => { const p = pillarOf(t); let h = cardHTML(t); const bt = buildTagsHTML(t); if(bt) h = h.replace('<span class="era">', bt+'<span class="era">'); if(isBuildPick(t)) h = h.replace(/^<button class="card/, '<button class="card buildpick'); if((t.ucard==='lvl' && slotOf(t.id) && slotOf(t.id).lvl + 1 >= 8) || buildTags(t).some(x => x.k==='ready')) h = h.replace(/^<button class="card/, '<button class="card legendpick'); return p ? h.replace(/<span class="btags">|<span class="era">/, m => '<span class="pillar p-'+p+'">'+PILLARS[p]+'</span>'+m) : h; }).join(''); el.classList.remove('done');
  [...el.children].forEach((c,i) => c.addEventListener('click', () => { if(performance.now() - R.openedAt < 350) return; if(R.banMode){ draftBanish(R.choices[i]); return; } choose(R.choices[i]); }));
  el.classList.toggle('banmode', !!R.banMode); draftTools();
}
function pickDone(){ R.banMode = false; { const d = document.getElementById('dtools'); if(d) d.hidden = true; } modal = null; const ov = $('#ovDraft'); if(ov) ov.hidden = true; G.gate = G.t + 8; playRankFx(); }
function pillarOf(t){ if(t.ucard==='new' || t.ucard==='lvl') return 'mil'; if(t.ucard==='rnew' || t.ucard==='rlvl') return RELICS[t.id].p; if(t.ucard==='space') return 'sci'; return null; }
const banKey = t => t && (t.ucard==='new' || t.ucard==='lvl') ? 'troop:'+t.id : t && (t.ucard==='rnew' || t.ucard==='rlvl') ? 'civic:'+t.id : null;
const isBanned = t => { const k = banKey(t); return !!k && (G.banned||[]).includes(k); };
const banName = t => t.ucard==='new' || t.ucard==='lvl' ? CARDS[t.id].n : RELICS[t.id].n;
function draftTools(){
  const el = document.getElementById('dtools'); if(!el || !el.classList) return;
  const on = modal==='draft' && !R.shipPick && G && !G.ended;
  el.hidden = !on; if(!on) return;
  const rr = G.rerolls ?? 3, bn = G.banishes ?? 3;
  el.innerHTML = '<button id="dtR"'+(rr > 0 ? '' : ' disabled')+'>⟳ Reroll <small>'+rr+' left · R</small></button>'+
    '<button id="dtB" class="'+(R.banMode ? 'on' : '')+'"'+(bn > 0 ? '' : ' disabled')+'>✖ '+(R.banMode ? 'Tap a card to banish it' : 'Banish')+' <small>'+bn+' left · B</small></button>'+
    '<button id="dtS">Skip <small>'+(R.supMode ? 'decide later' : '+40 influence')+' · K</small></button>';
  const b = id => document.getElementById(id);
  b('dtR').addEventListener('click', draftReroll); b('dtB').addEventListener('click', () => { if((G.banishes ?? 3) > 0){ R.banMode = !R.banMode; renderChoices(); } }); b('dtS').addEventListener('click', draftSkip);
}
function draftReroll(){ if(modal!=='draft' || R.shipPick || (G.rerolls ?? 3) <= 0) return; G.rerolls = (G.rerolls ?? 3) - 1; R.banMode = false; R.choices = R.supMode ? supportOptions(3) : levelOptions(); if(R.choices.some(t => t && t.str)) G.strOff = 1; R.openedAt = performance.now() - 200; renderChoices(); SFX.tick && SFX.tick(); }
function draftSkip(){ if(modal!=='draft' || R.shipPick) return; R.banMode = false; choose({ucard:'skip'}); }
function draftBanish(t){
  const k = banKey(t); if(!k){ toast('That card can’t be banished','warn'); return; }
  if((G.banishes ?? 3) <= 0) return;
  if(!G.banned) G.banned = []; G.banned.push(k); G.banishes = (G.banishes ?? 3) - 1; R.banMode = false;
  toast(banName(t)+' is banished for the rest of this game','good');
  R.choices = R.supMode ? supportOptions(3) : levelOptions();
  if(R.supMode && !R.choices.length){ choose({ucard:'skip'}); return; } if(R.choices.some(t => t && t.str)) G.strOff = 1; R.openedAt = performance.now() - 200; renderChoices(); SFX.tick && SFX.tick();
}
function levelOptions(){
  const pool = {mil:[], sci:[], exp:[]};
  G.cards.forEach(sl => { if(sl.lvl < cardCap(sl.id)) pool.mil.push({t:{ucard:'lvl', id:sl.id}, w:3}); });
  if(G.cards.length < cardSlots()){
    const nw = [];
    for(const id in CARDS) if(lineEra(id) <= G.eraIdx && !slotOf(id) && isUnlocked(id) && lineAllowed(id) && (!G.list || G.list.includes(id)) && !G.cards.some(sl => { const ev = sl.evo && UEVO.find(e => e.id===sl.evo); return ev && ev.with===id; })) nw.push({t:{ucard:'new', id}, w:1.4 + CARDS[id].era*.25});
    shuffle(nw).slice(0, 4).forEach(x => pool.mil.push(x));
    if(false){ // strangers retired: the draft only offers troops from your army list
      const lk = Object.keys(CARDS).filter(id => !isUnlocked(id) && !CARDS[id].secret && CARDS[id].era <= G.eraIdx && !slotOf(id) && !!achFor(id));
      if(lk.length){ pool.mil.push({t:{ucard:'new', id:lk[rint(lk.length)], str:1}, w:1e6}); }
    }
  }
  (G.relics||[]).forEach(r => { if(r.lvl < RELICS[r.id].max) pool[RELICS[r.id].p].push({t:{ucard:'rlvl', id:r.id}, w:2.5}); });
  if((G.relics||[]).length < relicSlots()) for(const k in RELICS) if(!relicLv(k)) pool[RELICS[k].p].push({t:{ucard:'rnew', id:k}, w:RELICS[k].p==='mil' ? 1.2 : 2});
  for(const k in pool) pool[k] = pool[k].filter(x => !isBanned(x.t));
  const draw = list => { if(!list.length) return null; const tot = list.reduce((a,x) => a + x.w, 0); let r = Math.random()*tot; for(let i=0;i<list.length;i++){ if((r -= list[i].w) <= 0) return list.splice(i,1)[0].t; } return list.pop().t; };
  const out = [];
  out.push(shipReady() ? {ucard:'space'} : draw(pool.sci));
  out.push(draw(pool.mil)); out.push(draw(pool.exp));
  for(let k=0;k<3;k++) if(!out[k]){ const alt = [pool.mil, pool.sci, pool.exp].filter(l => l.length).sort((a,b) => b.length - a.length)[0]; out[k] = alt ? draw(alt) : null; }
  const res = out.filter(Boolean);
  res.sort((a,b) => ['mil','sci','exp'].indexOf(pillarOf(a)) - ['mil','sci','exp'].indexOf(pillarOf(b)));
  if(res.length && res.length < 3) res.push({ucard:'heal'});
  if(res.length && res.length < 3) res.push({ucard:'gold'});
  return res;
}
function rankUp(id, lvl){
  const C = CARDS[id], st = LV_BASE[lvl] || {}, nm = cardName(PLAYER, id), prev = formOf(id, lvl-1).n;
  let msg = prev+' become '+nm+' (Lv '+lvl+')';
  if(lvl===ABIL_LV) msg += '. Special attack unlocked';
  if(st.f) msg += '. ★ '+featText(C, st.f);
  toast(msg, 'good');
  if(lvl!==8 && lvl!==ABIL_LV) banner(nm, C.n+' · '+FORM_ERA[lvl-1]+' form');
  R.rankFx = {id, lvl, t:0};
}

/* ---------- Big moments: the upgrades that change your army get a proper reveal ---------- */
function bigMoment(o){
  if(!G || G.demo || G.arena) return;
  (R.momQ || (R.momQ = [])).push(o); if(!R.momOn) momNext();
}
function momNext(){
  const o = (R.momQ||[]).shift(); const el = $('#moment'); if(!o || !el || !el.querySelector){ R.momOn = false; return; }
  R.momOn = true; const legend = o.tier==='legend'; buzz(legend ? [40, 50, 80] : 35);
  el.className = 'moment '+(legend ? 'legend' : 'epic'); el.style.setProperty('--mc', o.col || '#ffd36a');
  el.innerHTML = '<i class="rays"></i><div class="mbox">'+(o.img ? '<img src="'+o.img+'" alt="">' : '')+'<small>'+esc(o.kick||'')+'</small><b>'+esc(o.title||'')+'</b>'+(o.sub ? '<span>'+esc(o.sub)+'</span>' : '')+'</div>';
  el.hidden = false; void el.offsetWidth; el.classList.add('on');
  MUS.sting && MUS.sting(o.sting || (legend ? 'legend' : 'epic'));
  R.slowmo = Math.max(R.slowmo||0, legend ? 1.4 : .9); R.whiteT = Math.max(R.whiteT||0, legend ? .45 : .25); R.shake = Math.min(6, (R.shake||0) + (legend ? 3 : 1.5));
  if(o.at){ ring(o.at.x, o.at.y, .3, legend ? 4 : 2.5, o.col || '#ffd36a', 1); burst(o.at.x, o.at.y - .4, legend ? 40 : 22, o.col || '#ffd36a'); }
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.hidden = true; momNext(); }, 450); }, legend ? 3000 : 2200);
}
const troopImg = (id, lv) => USPR.ok && USPR.m[id] ? artURL('us_'+id+'_'+lv+'_'+pcol(), () => uPortrait(id, lv)) : '';
const centerOf = id => { let x = 0, y = 0, n = 0; for(const u of G.units){ if(u.owner===PLAYER && u.card===id && u.hp > 0){ x += u.x; y += u.y; n++; } } return n ? {x:x/n, y:y/n} : null; };
function playRankFx(){
  if(R.modFx){ const ids = R.modFx; R.modFx = null; for(const u of G.units) if(u.owner===PLAYER && ids.includes(u.card) && u.hp > 0){ ring(u.x, u.y, .1, .8, '#fff1cf', .7); burst(u.x, u.y-.3, 5, '#fff1cf'); } }
  const f = R.rankFx; if(!f) return; R.rankFx = null;
  if(f.lvl===8 || f.lvl===ABIL_LV){ const C = CARDS[f.id]; bigMoment({tier:f.lvl===8 ? 'legend' : 'epic', kick:f.lvl===8 ? '▲ Legendary · the final form ▲' : '⚔ Special attack unlocked', title:cardName(PLAYER, f.id), sub:f.lvl===8 ? (SIG[f.id] ? 'Signature: '+SIG[f.id].n : C.n+' reach their peak') : (ABIL[C.tags.find(g => ABIL[g])] || {}).d || '', col:f.lvl===8 ? '#ffd36a' : '#ff9a5a', img:troopImg(f.id, f.lvl), at:centerOf(f.id)}); }
  const ev = cardEvo(PLAYER, f.id), col = ev ? ev.col : rankOf(f.lvl) >= 3 ? '#ffd36a' : '#fff1cf';
  let n = 0;
  for(const u of G.units){
    if(u.owner!==PLAYER || u.card!==f.id || u.hp<=0) continue;
    ring(u.x, u.y, .1, .8, col, .7); burst(u.x, u.y-.3, 5, col);
    if(n++ < 4) float('Lv '+f.lvl, u.x, u.y-.9, col, 1.4);
  }
  SFX.pick && SFX.pick();
}
function playEvoFx(){
  const ev = R.evoFx; if(!ev) return; R.evoFx = null;
  let sx = 0, sy = 0, n = 0;
  for(const u of G.units){
    if(u.owner!==PLAYER || u.card!==ev.from || u.hp<=0) continue;
    ring(u.x, u.y, .1, 1.4, ev.col, .9); ring(u.x, u.y, .1, .7, '#fff', .5); burst(u.x, u.y-.3, 12, ev.col); burst(u.x, u.y-.4, 6, '#ffd36a');
    sx += u.x; sy += u.y; n++;
  }
  if(n){ CAM.x = sx/n; CAM.y = sy/n; CAM.z = Math.max(CAM.z, 26); float(ev.n+'!', sx/n, sy/n-1.2, ev.col, 2.4); }
  bigMoment({tier:'legend', kick:ev.union ? '✦ A union is forged ✦' : '✦ Evolution ✦', title:ev.n, sub:ev.d, col:ev.col, img:artURL('evp_'+ev.id+'_'+pcol(), () => evoPortrait(ev)), at:n ? {x:sx/n, y:sy/n} : null});
  R.shake = Math.min(8, (R.shake||0) + 5);
}
function earnChest(src){
  if(!G.chestQ) G.chestQ = [];
  G.chestQ.push(src);
  toast('War Chest earned: '+src,'good');
}
function chestOptions(){
  const opts = [];
  G.cards.forEach(sl => { if(sl.lvl < cardCap(sl.id)) opts.push({ucard:'lvl', id:sl.id}); });
  (G.relics||[]).forEach(r => { if(r.lvl < RELICS[r.id].max) opts.push({ucard:'rlvl', id:r.id}); });
  return shuffle(opts.filter(t => !isBanned(t))).slice(0, (hasArt('seal') ? 4 : 3) + LG('spoils'));
}
function applyLevel(t){
  if(t.ucard==='lvl'){ const sl = slotOf(t.id); sl.lvl = Math.min(cardCap(t.id), sl.lvl+1); mxAdd(t.id, 15); rankUp(t.id, sl.lvl); G.units.forEach(u => { if(u.owner===PLAYER && u.card===t.id) u.hp = uStat(u).hp; }); }
  else if(t.ucard==='rlvl'){ const r = G.relics.find(x => x.id===t.id); r.lvl = Math.min(RELICS[t.id].max, r.lvl+1); toast(RELICS[t.id].n+' reaches level '+r.lvl,'good'); }
  computeSyn(); refreshStats(); R.armyKey = '';
}
function openChest(){
  const src = G.chestQ.shift(); G.chestsOpened = (G.chestsOpened||0) + 1;
  R.chestOpts = null;
  const ov = $('#ovChest');
  const ready = G.cards.map(sl => ({sl, ev:evoReady(sl)})).find(x => x.ev);
  try { chestAnim(src, !!ready); } catch(e){}
  modal = 'chest';
  $('#chestSrc') && ($('#chestSrc').textContent = 'War Chest · '+src);
  if(ready){
    const {sl, ev} = ready; sl.evo = ev.id; let line; const fresh = !known(ev); if(fresh){ META.disc.add(ev.id); META.seen.add(ev.id); saveDisc(); }
    if(ev.union){
      if(G.core===ev.with) G.core = ev.from;
      G.cards = G.cards.filter(x => x.id !== ev.with);
      for(const u of G.units) if(u.owner===PLAYER && u.card===ev.with){ u.card = ev.from; u.kind = CARDS[ev.from].role; }
      line = 'Union: '+CARDS[ev.from].n+' and '+CARDS[ev.with].n+' fuse into one. A troop slot is free again';
    } else line = 'Evolution: '+CARDS[ev.from].n+' + '+RELICS[ev.relic].n;
    G.stats.evos = (G.stats.evos||0) + 1; R.evoFx = ev;
    computeSyn(); G.units.forEach(u => { if(u.owner===PLAYER && u.card===ev.from) u.hp = uStat(u).hp; }); R.armyKey = '';
    if(!ov || !ov.querySelector) return;
    $('#chestTitle').textContent = fresh ? '✦ New '+(ev.legend ? 'legendary union' : ev.union ? 'union' : 'evolution')+' discovered!' : ev.union ? 'A union is forged' : 'An evolution';
    setTimeout(checkAch, 0);
    const eart = artURL('e_'+ev.id, () => unitSprite({owner:PLAYER, card:ev.from}).n);
    $('#chestList').innerHTML = '<div class="loot big">'+(eart ? '<span class="cart evoart" style="--ec:'+ev.col+'"><img src="'+eart+'" alt="" style="height:96px"></span>' : '')+'<b>'+esc(ev.n)+'</b><span>'+esc(line)+'</span><em>'+esc(ev.d)+'</em></div>';
    $('#btnChest').hidden = false;
    ov.hidden = false; SFX.era(); R.shake = 4; return;
  }
  const opts = chestOptions();
  if(!opts.length){
    G.army += 80*(1 + .4*G.eraIdx);
    if(!ov || !ov.querySelector) return;
    $('#chestTitle').textContent = 'Gold';
    $('#chestList').innerHTML = '<div class="loot"><b>Treasury</b><span>Everything you own is at max level. Stored production for troops tops up</span></div>';
    $('#btnChest').hidden = false; ov.hidden = false; SFX.era(); return;
  }
  R.chestOpts = opts; R.openedAt = performance.now();
  if(!ov || !ov.querySelector) return;
  $('#chestTitle').textContent = 'Pick one free upgrade';
  $('#chestList').innerHTML = '<div class="cards">'+opts.map(cardHTML).join('')+'</div>';
  [...$('#chestList .cards').children].forEach((el,i) => el.addEventListener('click', () => { if(performance.now() - R.openedAt < 350) return; pickChest(i); }));
  $('#btnChest').hidden = true;
  ov.hidden = false; SFX.era();
}
function pickChest(i){
  if(performance.now() < (R.chestLock||0)) return;
  const t = R.chestOpts && R.chestOpts[i]; if(!t) return;
  R.chestOpts = null; applyLevel(t); SFX.pick(); closeChest();
}
function closeChest(){ if(performance.now() < (R.chestLock||0)) return; if(R.chestOpts){ pickChest(0); return; } modal = null; $('#ovChest').hidden = true; G.gate = G.t + 6; R.armyKey = ''; playRankFx(); playEvoFx(); }
function abilLine(id){
  const C = CARDS[id];
  const lv = slotOf(id) ? slotOf(id).lvl : 0;
  return C.tags.filter(g => ABIL[g]).map(g => { const A = ABIL[g], on = lv >= ABIL_LV; return '<span class="abil'+(on ? ' on' : '')+'">⚔ '+A.n+(on ? '' : ' · at level '+ABIL_LV)+'</span>'; }).join('');
}
function relicCardHTML(t){
  const R0 = RELICS[t.id], lv = relicLv(t.id), nl = lv + 1;
  const evs = UEVO.filter(e => e.relic===t.id && known(e)), mine = evs.filter(e => slotOf(e.from) && !slotOf(e.from).evo);
  let extra = '<span class="lvbar">'+Array.from({length:R0.max}, (_,i) => '<i class="'+(i < lv ? 'on' : i===lv ? 'nx' : '')+'"></i>').join('')+'</span>';
  if(SHIP_REQ.includes(t.id)) extra += '<span class="abil">Space Program needs Writing 5 and Astronomy 3</span>';
  if(mine.length) extra += '<span class="evo">◆ Evolves '+mine.map(e => CARDS[e.from].n+' at Lv '+evLv(e)+' → '+e.n).join(', ')+'</span>';
  else if(evs.length) extra += '<span class="abil">Evolution catalyst for '+evs.map(e => CARDS[e.from].n).join(', ')+'</span>';
  return '<button class="card is-relic" style="--era:#b48ae0"><span class="era"><i></i>'+(lv ? 'Civic level '+nl : 'New civic')+'</span><b>'+R0.n+'</b><span class="desc">'+R0.d+(lv ? ' (now '+lv+' → '+nl+')' : '')+'</span>'+extra+'</button>';
}
function unitCardHTML(t){
  if(t.ucard==='site') return siteCardHTML(t);
  if(t.ucard==='proto') return protoCardHTML(t);
  if(t.ucard==='space') return '<button class="card is-key" style="--era:var(--sci)"><span class="era"><i></i>Wonder of the age</span><b>Space Program</b><span class="desc">Choose three launch sites to build starship parts (at least 4 minutes; the Build stance speeds them). Every nation that isn’t your ally declares war and marches on them. Pick defense protocols as the build advances, then hold every site through a two-minute launch to win</span><span class="adv">Science victory</span></button>';
  if(t.ucard==='rnew' || t.ucard==='rlvl') return relicCardHTML(t);
  if(t.ucard==='heal') return '<button class="card is-unit" style="--era:var(--food)"><span class="era"><i></i>Field hospital</span><b>Tend the wounded</b><span class="desc">Every troop heals to full and every city is repaired</span></button>';
  if(t.ucard==='gold') return '<button class="card is-unit" style="--era:var(--lamp)"><span class="era"><i></i>Tribute</span><b>Fill the coffers</b><span class="desc">+80 influence for diplomacy</span></button>';
  if(t.ucard==='reinf') return '<button class="card is-unit" style="--era:var(--prod)"><span class="era"><i></i>Reinforcements</span><b>Call up the reserves</b><span class="desc">One fresh squad of every unit in your army marches out now</span></button>';
  if(t.ucard==='chest') return '<button class="card is-unit" style="--era:var(--prod)"><span class="era"><i></i>Treasury</span><b>Fill the treasury</b><span class="desc">Stored production for troops tops up and every city is repaired</span></button>';
  const C = CARDS[t.id], sl = slotOf(t.id), tags = '<span class="tagrow">'+C.tags.map(g => '<i class="tag'+((R.syn[g]||0) >= 1 ? ' on' : '')+'">'+g+'</i>').join('')+'</span>';
  if(t.ucard==='evo'){
    const ev = UEVO.find(e => e.id===t.ev);
    return '<button class="card is-evo" style="--era:var(--lamp)"><span class="era"><i></i>Unit evolution</span><b>'+ev.n+'</b><span class="desc">'+ev.d+'</span><span class="recipe">'+evoRecipe(ev)+'</span></button>';
  }
  let label, desc, extra = '';
  if(t.ucard==='new'){
    const jl = Math.min(lvlFloor(PLAYER), cardCap(t.id)); label = G.core && !G.demo ? 'New support line' : 'New troop line'; desc = '<b class="morph">'+esc(formOf(t.id, jl).n)+(jl > 1 ? ' · joins at Lv '+jl : '')+'</b>'+C.d;
    const sq = squadSize(PLAYER, t.id); extra += '<span class="up">Squads of '+sq+' · each takes '+supOf(t.id)+' army room · '+({guard:'holds cities',rider:'hunts raiders',archer:'fires from range',siege:'breaks walls in war',support:'follows your troops',titan:'smashes through crowds'})[C.role]+'</span>';
    const partners = COMBOS.filter(c => (c.a===t.id && (c.b ? slotOf(c.b) : G.cards.some(s => CARDS[s.id].tags.includes(c.tag)))) || (c.b===t.id && slotOf(c.a)) || (c.tag && C.tags.includes(c.tag) && slotOf(c.a)));
    extra += vsHTML(t.id) + abilLine(t.id) + ladderHTML(t.id, 1);
    if(t.str){ const a = achFor(t.id); extra = '<span class="rankup">✦ A troop you have not unlocked. Try it this game. Unlock for good: '+esc(a ? a.d : '')+'</span>' + extra; }
    { const kn = knownEvos(t.id); if(kn.length) extra += '<span class="abil">'+kn.map(ev => (ev.union ? 'Union' : 'Evolution')+': '+evoRecipe(ev)+' → '+ev.n).join('<br>')+'</span>'; else if(hasHidden(t.id)) extra += '<span class="abil">◆ ? This line hides an evolution</span>'; }
  } else {
    const nl = sl.lvl + 1; label = (isCore(t.id) ? '♛ Core · ' : G.core && !G.demo ? 'Support · ' : '')+'Level '+nl+' · '+FORM_ERA[nl-1]; desc = '<b class="morph">'+esc(formOf(t.id, sl.lvl).n)+' → '+esc(formOf(t.id, nl).n)+'</b>'+lvText(C, nl);
    if(nl===8) extra += '<span class="rankup">▲ Legendary: the final form'+(SIG[t.id] ? ' · signature '+SIG[t.id].n : '')+'</span>';
    extra += vsHTML(t.id);
    extra += ladderHTML(t.id, sl.lvl);
    if(nl < EVO_LV && !sl.evo){ const es = evoStatus({id:t.id, lvl:nl, evo:null}); if(es.state==='hidden') extra += '<span class="abil">◆ ? A hidden evolution awaits this line</span>'; }
    if(nl===EVO_LV && !sl.evo){ const kn = knownEvos(t.id).filter(e => evLv(e)===EVO_LV); if(kn.length) extra += '<span class="evo">◆ '+kn.map(ev => ev.union ? 'Can unite into '+ev.n+' with '+CARDS[ev.from===t.id ? ev.with : ev.from].n : 'Can evolve into '+ev.n+' with '+RELICS[ev.relic].n).join(' · ')+' when you open a War Chest</span>'; else if(hasHidden(t.id)) extra += '<span class="evo">◆ ? At this level, something may stir…</span>'; }
    extra += '<span class="lvbar">'+Array.from({length:8}, (_,i) => '<i class="'+(i < sl.lvl ? 'on' : i===sl.lvl ? 'nx' : i >= cardCap(t.id) ? 'lock' : '')+'"></i>').join('')+'</span>';
    if(G.core && !G.demo && !isCore(t.id) && nl >= 7 && lineCap(t.id) < 8) extra += '<span class="abil">Supports top out at Lv 7. Your core, or a union, can reach Lv 8</span>';
    if(nl >= mCap(t.id)) extra += '<span class="abil">Mastery '+mRank(t.id)+' '+mStars(t.id)+': this line tops out at Lv '+mCap(t.id)+'. Field it in more games to raise the cap</span>';
  }
  return '<button class="card is-unit" style="--era:var(--prod)"><span class="era"><i></i>'+label+'</span><b>'+(t.ucard==='new' ? C.n : sl && sl.evo ? cardName(PLAYER, t.id) : C.n)+'</b><span class="desc">'+desc+'</span>'+tags+extra+'</button>';
}
const CIVIC_ART = {writing:'library', commerce:'market', philosophy:'univ', engineering:'workshop', medicine:'hospital', astronomy:'observatory', frontier:'house', laws:'castle', agri:'granary', masonry:'mine', cartography:'dock', trade:'bank', forge:'factory', drill:'barracks', quarter:'lumber', roads:'stable', spyglass:'tower', college:'bunker', hall:'aqueduct'};
function artURL(key, make){
  if(!R.art) R.art = {};
  if(R.art[key] !== undefined) return R.art[key];
  let url = '';
  try { const c = make(); url = c && c.toDataURL ? c.toDataURL() : ''; if(typeof url !== 'string' || !url.startsWith('data:')) url = ''; } catch(e){ url = ''; }
  return R.art[key] = url;
}
function cardArt(t){
  let url = '';
  if(t.ucard==='new' || t.ucard==='lvl' || t.ucard==='evo'){ const sl = slotOf(t.id), lv = t.ucard==='new' ? lvlFloor(PLAYER) : sl ? Math.min(8, sl.lvl + (t.ucard==='lvl' ? 1 : 0)) : 1, ev = sl && sl.evo ? UEVO.find(e => e.id===sl.evo) : null; url = USPR.ok && !ev ? artURL('us_'+t.id+'_'+lv+'_'+pcol(), () => uPortrait(t.id, lv)) : artURL('u_'+t.id+'_'+lv+'_'+(ev ? ev.id : ''), () => unitSprite({owner:PLAYER, card:t.id, lvl:lv, ev}).n); }
  else if((t.ucard==='rnew' || t.ucard==='rlvl') && KIT['cv_'+t.id]) url = KIT['cv_'+t.id];
  else if(t.ucard==='proto' && KIT['pr_'+t.id]) url = KIT['pr_'+t.id];
  else if(t.ucard==='space' || t.ucard==='site') url = KIT.ship_2;
  else if(t.ucard==='rnew' || t.ucard==='rlvl') url = BSPR.ok && bPortrait(CIVIC_ART[t.id] || 'house') ? artURL('bs_'+t.id+'_'+cultOf(PLAYER)+pcol(), () => bPortrait(CIVIC_ART[t.id] || 'house')) : artURL('b_'+t.id, () => paintBuilding(CIVIC_ART[t.id] || 'house', R.pal[PLAYER], 2));
  else if(t.ucard==='space' || t.ucard==='site') url = artURL('b_launch', () => paintBuilding('launch', R.pal[PLAYER], 2));
  else if(t.ucard==='proto') url = artURL('p_'+t.id, () => paintBuilding(PROTOS[t.id].art, R.pal[PLAYER], 2));
  else if(t.ucard==='heal') url = artURL('b_heal', () => paintBuilding('hospital', R.pal[PLAYER], 2));
  else if(t.ucard==='gold') url = artURL('b_gold', () => paintBuilding('bank', R.pal[PLAYER], 2));
  if(!url) return '';
  const big = (t.ucard==='new' || t.ucard==='lvl') && CARDS[t.id] ? Math.round(58*Math.min(1.4, Math.max(.9, formSize(t.id, (slotOf(t.id)||{lvl:1}).lvl)))) : 72;
  return '<span class="cart"><img src="'+url+'" alt="" style="height:'+big+'px"></span>';
}
function cardHTML(t){
  if(t.ucard){ const h = unitCardHTML(t), a = cardArt(t); return a ? h.replace(/^(<button[^>]*>)/, '$1'+a) : h; }
  const isEvo = !!t.evo, isBoon = !!t.boon;
  const label = isEvo ? 'Evolution' : isBoon ? 'Boon' : ERAS[t.era];
  const col = isEvo ? 'var(--lamp)' : isBoon ? 'var(--muted)' : ERACOL[t.era];
  let extra = '';
  if(t.adv) extra += '<span class="adv">Advances to the '+ERAS[t.adv]+' Era</span>';
  if(isEvo) extra += '<span class="recipe">' + t.req.map(r => BYID[r].n).join(' + ') + '</span>';
  else if(!isBoon && EVO_PARTS.has(t.id)) extra += '<span class="evo">◆ Part of an evolution</span>';
  if(TECH_ABIL[t.id]){ const g = TECH_ABIL[t.id]; extra += '<span class="abil on">⚔ Unlocks '+ABIL[g].n+' for '+g+' units</span>'; }
  return '<button class="card'+(isEvo?' is-evo':'')+(t.adv?' is-key':'')+'" style="--era:'+col+'"><span class="era"><i></i>'+label+'</span><b>'+t.n+'</b><span class="desc">'+t.d+'</span>'+extra+'</button>';
}
function choose(t){
  if(!t) return;
  if(R.supMode){ R.supMode = false;
    if(t.ucard==='new' && G.cards.length < cardSlots()){ G.cards.push({id:t.id, lvl:Math.min(lvlFloor(PLAYER), cardCap(t.id)), evo:null}); G.stats.maxCards = Math.max(G.stats.maxCards||0, G.cards.length); mxAdd(t.id, 10); bigMoment({tier:'epic', kick:'A new support line', title:cardName(PLAYER, t.id), sub:CARDS[t.id].d, col:'#9fd0ff', img:troopImg(t.id, Math.min(8, lvlFloor(PLAYER)))}); toast(formName(PLAYER, t.id)+' join your army as a support line','good'); }
    else toast('Support slot left open. New lines will show up in your level-ups','good');
    computeSyn(); refreshStats(); R.armyKey = ''; pickDone(); SFX.pick(); return; }
  if(t.ucard==='site' || t.ucard==='proto'){ shipChoose(t); return; }
  G.sci = Math.max(0, G.sci - levelCost(G.level||0));
  G.level = (G.level||0) + 1; G.picks++;
  const oldEra = G.eraIdx;
  if(t.ucard==='rnew'){ if((G.relics||[]).length < relicSlots()) G.relics.push({id:t.id, lvl:1}); toast(RELICS[t.id].n+' adopted','good'); }
  else if(t.ucard==='rlvl'){ const r = G.relics.find(x => x.id===t.id); r.lvl = Math.min(RELICS[t.id].max, r.lvl+1); toast(RELICS[t.id].n+' reaches level '+r.lvl,'good'); }
  else if(t.ucard==='new'){ if(G.cards.length < cardSlots()) G.cards.push({id:t.id, lvl:Math.min(lvlFloor(PLAYER), cardCap(t.id)), evo:null, str:t.str ? 1 : 0}); G.stats.maxCards = Math.max(G.stats.maxCards||0, G.cards.length); mxAdd(t.id, 10);
    if(t.str){ const a = achFor(t.id); banner(CARDS[t.id].n, 'A stranger joins, for this game only'); toast('A stranger joins: '+CARDS[t.id].n+' fight for you this game. Unlock them for good: '+(a ? a.d : ''),'good'); }
    else toast(formName(PLAYER, t.id)+' join your army','good'); }
  else if(t.ucard==='lvl'){ const sl = slotOf(t.id); sl.lvl = Math.min(cardCap(t.id), sl.lvl+1); mxAdd(t.id, 15); rankUp(t.id, sl.lvl); }
  else if(t.ucard==='heal'){ G.units.forEach(u => { if(u.owner===PLAYER && u.card) u.hp = uStat(u).hp; }); citiesOf(PLAYER).forEach(c => c.hp = cityMax(c)); toast('Your troops and cities are restored','good'); }
  else if(t.ucard==='gold'){ G.influence = Math.min(600, G.influence + 80); toast('+80 influence','good'); }
  else if(t.ucard==='skip'){ G.influence = Math.min(600, G.influence + 40); toast('Skipped. +40 influence','good'); }
  else if(t.ucard==='reinf'){ const cap = capitalOf(PLAYER); let room = pArmyMax() - armySup(PLAYER); G.cards.forEach(sl => { for(let k=0;k<squadSize(PLAYER, sl.id) && room >= supOf(sl.id);k++, room -= supOf(sl.id)) spawnUnit(PLAYER, threatCity(PLAYER) || cap, sl.id); }); toast('The reserves march out','good'); }
  else if(t.ucard==='chest'){ G.army += 80*(1 + .4*G.eraIdx); citiesOf(PLAYER).forEach(c => c.hp = cityMax(c)); toast('The treasury is full','good'); }
  computeSyn(); refreshStats(); R.armyKey = '';
  if(t.id) G.units.forEach(u => { if(u.owner===PLAYER && u.card===t.id) u.hp = uStat(u).hp; });
  pickDone(); SFX.pick();
  if(t.ucard==='space') startShip();
  if(G.eraIdx > oldEra) eraUp(oldEra);
}
function eraUp(oldEra){
  {
    G.rerolls = (G.rerolls ?? 3) + 1;
    banner(ERAS[G.eraIdx]+' Age', 'A new age dawns · your army modernizes'); SFX.era(); MUS.sting('era'); ageUp(G.eraIdx);
    toast('A new age: troops can now reach Lv '+lvlCap(PLAYER)+', and new buildings rise in your cities','good');
    modernize();
    if(G.eraIdx===3 || G.eraIdx===5) toast('Your cities rebuild in the style of the '+ERAS[G.eraIdx]+' Age','good');
    if(G.eraIdx===1 && G.core) toast('A support slot opens. Choose a support line','good');
    else if(G.eraIdx===2) toast((G.core && !CR(8) ? 'A second support slot and a civic slot open' : 'A civic slot opens'),'good');
    else if(G.eraIdx===4) toast('A civic slot opens','good');
    if(G.core && !G.demo && G.cards.length < cardSlots()) G.supQ = true;
    if(!G.demo && !G.arena && G.govAsked) G.govQ = G.eraIdx;
  }
}
