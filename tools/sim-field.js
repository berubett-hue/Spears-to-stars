// field battle in the open: your general and N troops against a rival general and N troops, both at Lv 3
// usage: node tools/sim-field.js [nation] [runs] [n]
const path = require('path'), fs = require('fs'), log = (...a) => fs.writeSync(1, a.join(' ')+'\n');
const nat = process.argv[2] || 'legion', RUNS = +(process.argv[3] || 8), NN = +(process.argv[4] || 16);
const {X, EH} = require('./harness.js')(path.join(__dirname, '..'));
for(const id in X.CARDS) if(!X.CARDS[id].secret) X.META.unl.add(id);
const out = [];
const MINE = ['spearmen', 'longbow', 'horse', 'catapult'];
for(let run = 0; run < RUNS; run++){
  EH.R.autoCity = true; EH.setNation(nat); EH.R.diff = 1; EH.R.crown = 0; EH.newGame(); EH.setRunning(true);
  const G = X.G; G.hordeAt = null;
  const skip = () => { if(EH.modal==='draft' || EH.modal==='muster') EH.choose(EH.choices[0]); else if(EH.modal==='chest'){ EH.R.chestLock = 0; EH.closeChest(); } else if(EH.modal==='find') EH.closeFind(); else if(EH.modal==='event') EH.resolveEvent(0); };
  const step = T => { while(G.t < T && !G.ended){ if(EH.modal && EH.modal !== 'end'){ skip(); continue; } if(EH.modal==='end') break; EH.update(.05); } };
  step(60);
  const cap = X.capitalOf(1), h = X.heroOf(1); if(!cap || !h){ log('skip'); continue; }
  const rv = G.rivals.filter(r => r.alive && X.citiesOf(r.id).length)[run % 5];
  for(const r of G.rivals) if(r.status==='war') r.status = 'peace';
  G.rwars = []; G.barbT = 1e9;
  X.declareWar(1, rv.id);
  let rh = X.heroOf(rv.id); if(!rh){ rh = EH.spawnHero ? EH.spawnHero(rv.id) : null; }
  if(!rh){ log('no rival hero'); continue; }
  for(const u of G.units) if(u.hp > 0 && (u.card || u.owner===0) && !u.hero){ u.hp = 0; u.dead = true; }
  G.cards = MINE.map(id => ({id, lvl:3, evo:null}));
  rv.lv = rv.lv || {}; const rc = (rv.cards || []).filter(id => X.CARDS[id] && X.CARDS[id].role !== 'support').slice(0, 4);
  for(const id of rc) rv.lv[id] = 3;
  // a spot on open ground between the two capitals
  const ec = X.capitalOf(rv.id), cx = (cap.x + ec.x)/2 + .5, cy = (cap.y + ec.y)/2 + .5;
  const sp = (o, id, x, y, f) => { const u = X.spawnUnit(o, {x:x-.5, y:y-.5, id:(o===1 ? cap : ec).id}, id); if(u){ u.fol = f.id; u.x = x + Math.random()*1.4 - .7; u.y = y + Math.random()*2.4 - 1.2; } return u; };
  for(let k=0;k<NN;k++){ sp(1, MINE[k % 4], cx - 4, cy, h); sp(rv.id, rc[k % rc.length], cx + 4, cy, rh); }
  h.x = cx - 5; h.y = cy; h.goal = null; h.tcity = 0; rh.x = cx + 5; rh.y = cy; rh.goal = null; rh.ait = 1e9; rh.mus = null;
  const t0 = G.t; let aiT = 0;
  while(G.t < t0 + 70 && !G.ended){
    if(EH.modal && EH.modal !== 'end'){ skip(); continue; }
    EH.update(.05);
    const a = X.heroOf(1), b = X.heroOf(rv.id);
    if(G.t >= aiT){ aiT = G.t + .5;
      if(a){ a.goal = b ? {x:(a.x*3 + b.x)/4, y:(a.y*3 + b.y)/4} : null; if((a.acd||0) <= 0) X.heroActive(a); }
      if(b){ b.ait = 1e9; b.goal = a ? {x:(b.x*3 + a.x)/4, y:(b.y*3 + a.y)/4} : null; } }
    const m = G.units.filter(u => u.owner===1 && u.hp>0 && u.card && !u.hero).length, t = G.units.filter(u => u.owner===rv.id && u.hp>0 && u.card && !u.hero).length;
    if(!m || !t) break;
  }
  const m = G.units.filter(u => u.owner===1 && u.hp>0 && u.card && !u.hero).length, t = G.units.filter(u => u.owner===rv.id && u.hp>0 && u.card && !u.hero).length;
  const res = {run, rival:rv.name, lines:rc.join(','), mineLeft:m, theirsLeft:t, secs:Math.round(G.t - t0)};
  out.push(res); log(JSON.stringify(res));
}
const n = out.length || 1;
log('SUMMARY', nat, 'n', NN, 'mineLeft', (out.reduce((a, r) => a + r.mineLeft, 0)/n).toFixed(1), 'theirsLeft', (out.reduce((a, r) => a + r.theirsLeft, 0)/n).toFixed(1), 'secs', (out.reduce((a, r) => a + r.secs, 0)/n).toFixed(0));
