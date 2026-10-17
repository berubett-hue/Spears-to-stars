// controlled invasion: at warm-up's end, your general leads a host (MUL x the rival's whole army, your own
// lines at the rival's level) against the nearest rival and assaults its nearest city. Nobody else is at war.
// Reports: did the city fall, how fast, what the host lost, whether the general fell.
// usage: node tools/sim-invade.js [nation] [runs] [warmup] [mul]
const path = require('path'), fs = require('fs'), log = (...a) => fs.writeSync(1, a.join(' ')+'\n');
const nat = process.argv[2] || 'legion', RUNS = +(process.argv[3] || 6), WARM = +(process.argv[4] || 300), MUL = +(process.argv[5] || 1.3), LIM = 150;
const out = [];
for(let run = 0; run < RUNS; run++){
  const {X, EH} = require('./harness.js')(path.join(__dirname, '..'));
  for(const id in X.CARDS) if(!X.CARDS[id].secret) X.META.unl.add(id);
  EH.R.autoCity = true; EH.setNation(nat); EH.R.diff = 1; EH.R.crown = 0; EH.newGame(); EH.setRunning(true);
  const G = X.G; G.hordeAt = null;
  const skip = () => { if(EH.modal==='draft' || EH.modal==='muster') EH.choose(EH.choices[0]); else if(EH.modal==='chest'){ EH.R.chestLock = 0; EH.closeChest(); } else if(EH.modal==='find') EH.closeFind(); else if(EH.modal==='event') EH.resolveEvent(0); };
  const step = T => { while(G.t < T && !G.ended){ if(EH.modal && EH.modal !== 'end'){ skip(); continue; } if(EH.modal==='end') break; EH.update(.05); } };
  step(WARM);
  if(G.ended || !X.heroOf(1)){ log('skip run', run); continue; }
  // everyone at peace, then war with the nearest rival
  for(const r of G.rivals) if(r.alive && r.status==='war'){ r.status = 'peace'; r.peaceT = G.t; }
  G.rwars = [];
  const cap = X.capitalOf(1), h = X.heroOf(1);
  const rv = G.rivals.filter(r => r.alive && !r.hold && X.citiesOf(r.id).length).sort((a, b) => { const d = r => Math.min(...X.citiesOf(r.id).map(c => Math.hypot(c.x-cap.x, c.y-cap.y))); return d(a) - d(b); })[0];
  const foeN = G.units.filter(u => u.owner===rv.id && u.hp>0 && u.card && !u.hero).length;
  // your host: your lines, levelled to match theirs
  const rl = Math.max(1, ...Object.values(rv.lv || {1:1}));
  for(const c of G.cards) c.lvl = Math.max(c.lvl, Math.min(rl, 8));
  for(const u of G.units) if(u.owner===1 && u.card && !u.hero){ u.hp = 0; u.dead = true; }
  const ids = G.cards.map(c => c.id).filter(id => X.CARDS[id].role !== 'support');
  const want = Math.max(10, Math.round(foeN*MUL));
  for(let k=0;k<want;k++){ const u = X.spawnUnit(1, cap, ids[k % ids.length]); if(u){ u.fol = h.id; u.inv0 = 1; u.x = h.x + Math.random() - .5; u.y = h.y + Math.random() - .5; } }
  X.declareWar(1, rv.id);
  const t0 = G.t, host0 = want; let fell = false, tFell = null, heroDied = false, maxFoe = 0;
  const tc = X.citiesOf(rv.id).sort((a, b) => Math.hypot(a.x-h.x, a.y-h.y) - Math.hypot(b.x-h.x, b.y-h.y))[0];
  let aiT = 0;
  while(G.t < t0 + LIM && !G.ended){
    if(EH.modal && EH.modal !== 'end'){ skip(); continue; } if(EH.modal==='end') break;
    EH.update(.05);
    if(tc.owner===1 || tc.dead || !G.cities.includes(tc)){ fell = true; tFell = Math.round(G.t - t0); break; }
    const hh = X.heroOf(1); if(!hh){ heroDied = true; continue; }
    if(G.t < aiT) continue; aiT = G.t + .5;
    const d = Math.hypot(tc.x+.5-hh.x, tc.y+.5-hh.y);
    // a sensible player: walk with the host; near the city, fight what is in the field first, then assault
    const foes = G.units.filter(v => v.hp > 0 && v.owner===rv.id && (v.x-hh.x)**2 + (v.y-hh.y)**2 < 36).length; maxFoe = Math.max(maxFoe, foes);
    if(foes >= 4){ hh.goal = null; hh.tcity = 0; }
    else if(d > 2.4){ hh.goal = {x:tc.x+.5, y:tc.y+.5}; hh.tcity = 0; }
    else { hh.goal = null; hh.tcity = tc.id; }
    if((hh.acd||0) <= 0 && foes >= 3) X.heroActive(hh);
  }
  const left = G.units.filter(u => u.owner===1 && u.hp>0 && u.inv0).length;
  const res = {run, rival:rv.name, foeArmy:foeN, host:host0, lvl:rl, fell, tFell, hostLeft:left, lostPct:Math.round((1 - left/host0)*100), heroDied, maxFoeSeen:maxFoe};
  out.push(res); log(JSON.stringify(res));
}
const n = out.length || 1, avg = k => (out.reduce((a, r) => a + (+r[k]||0), 0)/n).toFixed(2);
log('SUMMARY', nat, 'runs', out.length, 'fell', avg('fell'), 'tFell(of fallen)', (out.filter(r => r.fell).reduce((a, r) => a + r.tFell, 0)/Math.max(1, out.filter(r => r.fell).length)).toFixed(0), 'lostPct', avg('lostPct'), 'heroDied', avg('heroDied'), 'maxFoeSeen', avg('maxFoeSeen'));
