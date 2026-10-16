"use strict";
/* ---------- One-time tips: the first time something matters, light up its button and say how to use it ----------
   Each tip shows once per player (remembered in this browser), one at a time, never during a popup.
   "?" opens How to Play at the matching tab; Options can switch tips off or replay them. */
const PH = () => !!R.phone;
const TIPS = [
  {id:'start',   when:() => G.t > 2, tab:'basics', sel:() => PH() ? '#joy' : '#hcSel',
    t:() => PH() ? 'Drag this joystick, or tap the map, to march your general. Troops that step inside his circle join his band.' : 'Click the map, or steer with WASD, to march your general. Troops that step inside his circle join his band. Click his card to bring the camera back.'},
  {id:'level',   when:() => (G.level||0) >= 1, tab:'army', sel:() => '.research',
    t:() => 'Science fills this bar. Every level you pick one of three cards: a new troop line, an upgrade or a civic.'},
  {id:'settle',  when:() => !!G.settle, urgent:1, tab:'empire', sel:() => '#settleBar',
    t:() => 'A settler is ready. Tap one of the lit spots on the map to found a city there, or tap Auto and it picks one for you.'},
  {id:'orders',  when:() => bandSize() >= 5, tab:'army', sel:() => '#orders',
    t:() => 'Your band follows your general. Charge sends it at nearby enemies, Hold keeps it tight around him, Fall back pulls it out to heal.'},
  {id:'ability', when:() => G.t > 70 && !!heroOf(PLAYER), tab:'army', sel:() => '#hcAct',
    t:() => 'Your general’s special ability. Use it when the enemy is close; the shading shows it recharging.'},
  {id:'stance',  when:() => G.t > 95, tab:'empire', sel:() => PH() && document.getElementById('app').classList.contains('cbot') ? '#hcMore' : '#doctrine',
    t:() => (PH() ? 'Tap More to find your stances. ' : '')+'Expand spends production on new cities, Build on growth and science, Defend on a bigger army that stays home.'},
  {id:'rivals',  when:() => G.t > 125, tab:'empire', sel:() => '#natTog',
    t:() => 'Your rivals. Tap one to gift, trade, ally or declare war. Diplomacy is one of the four ways to win.'},
  {id:'win',     when:() => G.t > 150 && !G.decline, tab:'winning', sel:() => '#vicChip',
    t:() => 'Your closest way to win. Tap it to see all four: conquest, diplomacy, science and prosperity.'},
  {id:'site',    when:() => (G.sites||[]).some(s => G.seen[idx(s.x, s.y)]), tab:'world', sel:() => '#resRow',
    t:() => 'You found a resource site. Stand your troops on it for a few seconds to take its bonus. These icons are the sites you have seen; tap one to look at it.'},
  {id:'decree',  when:() => G.t > 60 && G.influence >= 60, tab:'empire', sel:() => PH() && document.getElementById('app').classList.contains('cbot') ? '#hcMore' : '#decrees',
    t:() => (PH() ? 'Tap More for your decrees. ' : '')+'You have influence to spend: Mobilize for damage, Golden Age for yields, Fortify to repair your cities.'},
  {id:'release', when:() => bandSize() >= 12, tab:'army', sel:() => '#hcRally',
    t:() => 'Release sends your band to guard the nearest city. Your general can gather a new one.'},
  {id:'minimap', when:() => G.t > 210, tab:'basics', sel:() => '#mini',
    t:() => 'Tap the minimap to look anywhere. The camera stays there until you move your general again.'},
  {id:'banners', when:() => G.t > 260 && !!heroOf(PLAYER), tab:'army', sel:() => '#hcBan',
    t:() => 'Call the Banners brings every troop on the map to your general for a big push. While they are away your cities keep only their towers.'},
  {id:'camp',    when:() => (G.pois||[]).some(p => p.k==='camp' && p.armed && !p.dead && G.seen[idx(p.x, p.y)]), tab:'world', sel:() => '#mini',
    t:() => 'A barbarian camp. Clear its guards, then walk your general onto the loot pile.'},
  {id:'gov',     when:() => !!G.gov && !modal, tab:'empire', sel:() => PH() && document.getElementById('app').classList.contains('cbot') ? '#hcMore' : '#mclock',
    t:() => 'You will choose a government again at every new age. Your current one is shown '+(PH() ? 'under More' : 'here')+'.'},
  {id:'horde',   when:() => !!G.horde && !G.horde.broken, urgent:1, tab:'world', sel:() => '#dmgMeter',
    t:() => 'The Red Horde raids you until its capital burns. Kill the Khan’s guard, then walk your general in. The Goals tab tracks it.'},
  {id:'hold',    when:() => (G.holds||[]).some(h => h.found && !h.done), tab:'world', sel:() => null,
    t:() => 'A hidden stronghold. It never attacks, but it is very hard to take. Take it and that people is yours for good.'},
  {id:'pros',    when:() => G.eraIdx >= 3 && !G.decline, tab:'winning', sel:() => '#vicChip',
    t:() => 'Prosperity is open: hold 6 cities, 4 resource sites and a wonder at once, then keep them for 90 seconds.'},
  {id:'science', when:() => typeof shipReady==='function' && shipReady(), tab:'winning', sel:() => '.research',
    t:() => 'The Space Program is ready. It will be one of your cards at the next level-up.'},
  {id:'decline', when:() => !!G.decline && !G.decline.done, urgent:1, tab:'winning', sel:() => '#declChip',
    t:() => 'The Decline has begun. Far cities slip away unless your general stands in them. Protect your capital as long as you can.'}
];
function bandSize(){ const h = heroOf(PLAYER); return h ? ((R.bandC && R.bandC.get(h.id)) || h.bandN || 0) : 0; }
function tipsSeen(){ if(R.tipSeen) return R.tipSeen; let a = []; try { a = JSON.parse(localStorage.getItem('eh-tips') || '[]'); } catch(e){} return R.tipSeen = new Set(a); }
function tipMark(id){ const s = tipsSeen(); s.add(id); try { localStorage.setItem('eh-tips', JSON.stringify([...s])); } catch(e){} }
const tipsOn = () => { try { return localStorage.getItem('eh-tipsoff') !== '1'; } catch(e){ return true; } };
function tipTick(){
  if(!G || G.demo || G.arena || G.ended || !running) return;
  const now = performance.now(); if(now - (R.tipT0||0) < 500) return; R.tipT0 = now;
  const cur = R.tipCur;
  if(cur){ if(G.t >= cur.until) tipHide(); return; }
  if(!tipsOn() || modal || paused) return;
  const seen = tipsSeen(), gap = G.t - (R.tipLast ?? -99);
  for(const T of TIPS){
    if(seen.has(T.id)) continue;
    if(!seen.has('start') && T.id !== 'start') continue;   // the first tip is always how to move
    let ok = false; try { ok = T.when(); } catch(e){}
    if(!ok) continue;
    if(gap < (T.urgent ? 6 : 16)) return;
    tipShow(T); return;
  }
}
function tipShow(T){
  const el = $('#tipCard'); if(!el || !el.querySelector) return;
  tipMark(T.id);
  const text = T.t(); let sel = null; try { sel = T.sel(); } catch(e){}
  const tgt = sel ? document.querySelector(sel) : null;
  el.querySelector('.tc-t').textContent = text;
  el.dataset.tab = T.tab || 'basics';
  el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  if(tgt && tgt.offsetParent !== null){ tgt.classList.add('tip-hl'); }
  R.tipCur = {id:T.id, until:G.t + (T.urgent ? 11 : 9), tgt:tgt || null};
  R.tipLast = G.t;
  try { msgLog('Tip: '+text, 'good'); } catch(e){}
}
function tipHide(){
  const el = $('#tipCard'), cur = R.tipCur; R.tipCur = null;
  if(cur && cur.tgt && cur.tgt.classList) cur.tgt.classList.remove('tip-hl');
  if(el && el.classList){ el.classList.remove('in'); el.classList.add('out'); setTimeout(() => { if(!R.tipCur) el.hidden = true; }, 220); }
}
function howTab(k){
  document.querySelectorAll('#howTabs button').forEach(b => b.classList.toggle('on', b.dataset.ht===k));
  document.querySelectorAll('#ovHow .how-sec').forEach(x => x.hidden = x.dataset.hs!==k);
  const sh = document.querySelector('#ovHow .sheet'); if(sh) sh.scrollTop = 0;
}
/* "?" on a tip: pause and open How to Play at that tab; Back resumes */
function tipHelp(){
  const el = $('#tipCard'), tab = (el && el.dataset.tab) || 'basics'; tipHide();
  if(!G || modal) return;
  paused = true; R.howGame = true; howTab(tab); openMenuOv('ovHow');
}
function tipsBind(){
  const el = document.getElementById('tipCard'); if(!el || !el.querySelector) return;
  el.querySelector('.tc-q').addEventListener('click', e => { e.stopPropagation(); tipHelp(); });
  el.querySelector('.tc-x').addEventListener('click', e => { e.stopPropagation(); tipHide(); });
  const ot = document.getElementById('optTips'); if(ot){ ot.checked = tipsOn(); ot.addEventListener('change', e => { try { localStorage.setItem('eh-tipsoff', e.target.checked ? '0' : '1'); } catch(er){} if(!e.target.checked) tipHide(); }); }
  const rt = document.getElementById('optTipsReset'); if(rt) rt.addEventListener('click', () => { R.tipSeen = new Set(); try { localStorage.setItem('eh-tips', '[]'); localStorage.setItem('eh-tipsoff', '0'); } catch(e){} if(ot) ot.checked = true; rt.textContent = 'Tips will show again'; });
}
atBoot(tipsBind);
