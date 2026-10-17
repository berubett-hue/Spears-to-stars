// the "rush" player: build up, then march the general and the whole army from rival to rival
// usage: node tools/sim-rush.js [nation] [maxT] [crown] [buildT] [seedRuns]
const path = require('path'), fs = require('fs'), log = (...a) => fs.writeSync(1, a.join(' ')+'\n');
const nat = process.argv[2] || 'steppe', T = +process.argv[3] || 1500, crown = +(process.argv[4] || 0), BUILD = +(process.argv[5] || 210), RUNS = +(process.argv[6] || 1);
const quiet = !!process.env.Q, EQ = +(process.env.EQ||0);
const results = [];
for(let run = 0; run < RUNS; run++){
  const {X, EH} = require('./harness.js')(path.join(__dirname, '..'));
  for(const id in X.CARDS) if(!X.CARDS[id].secret) X.META.unl.add(id);
  EH.R.autoCity = true; EH.setNation(nat); EH.R.diff = 1; EH.R.crown = crown; EH.newGame(); EH.setRunning(true);
  const G = X.G;
  const skip = () => { if(EH.modal==='draft' || EH.modal==='muster') EH.choose(EH.choices[0]); else if(EH.modal==='chest'){ EH.R.chestLock = 0; EH.closeChest(); } else if(EH.modal==='find') EH.closeFind(); else if(EH.modal==='event') EH.resolveEvent(0); };
  const ev = []; let lastM = -1, aiT = 0, tgtR = null, firstWar = null, heroDeaths = 0, hadHero = false, peakArmy = 0;
  const caps0 = {}; for(const r of G.rivals) caps0[r.id] = X.citiesOf(r.id).length;
  const army = () => G.units.filter(u => u.owner===1 && u.hp>0 && u.card && !u.hero).length;
  const foeArmy = o => G.units.filter(u => u.owner===o && u.hp>0 && u.card && !u.hero).length;
  let cityN = X.citiesOf(1).length, lost = 0;
  while(G.t < T && !G.ended){
    if(EH.modal && EH.modal !== 'end'){ skip(); continue; } if(EH.modal==='end') break;
    EH.update(.05);
    const h = X.heroOf(1);
    if(hadHero && !h) heroDeaths++; hadHero = !!h;
    const a = army(); peakArmy = Math.max(peakArmy, a);
    const cn = X.citiesOf(1).length; if(cn !== cityN){ ev.push((cn > cityN ? '+' : '-')+'city@'+Math.round(G.t)); if(cn < cityN) lost++; cityN = cn; }
    if(G.t < aiT) continue; aiT = G.t + .5;
    if(!h) continue;
    const alive = G.rivals.filter(r => r.alive && !r.hold && X.citiesOf(r.id).length);
    if(!alive.length) break;
    if(G.t < BUILD || (a < 12 && !firstWar)){ // build phase: sit at the capital and gather the host
      const cap = X.capitalOf(1), dg = EH.R.danger && EH.R.danger.get(1), dc = dg && G.cities.find(c => c.id===dg);
      const at = dc || cap; if(at && Math.hypot(at.x+.5-h.x, at.y+.5-h.y) > 3){ h.goal = {x:at.x+.5, y:at.y+.5}; h.tcity = 0; } continue; }
    // choose the nearest living rival
    if(!tgtR || !tgtR.alive || !X.citiesOf(tgtR.id).length){
      tgtR = alive.sort((p, q) => { const dc = r => { const c = X.citiesOf(r.id)[0]; return c ? Math.hypot(c.x-h.x, c.y-h.y) : 1e9; }; return dc(p) - dc(q); })[0];
      ev.push('target '+tgtR.name+'@'+Math.round(G.t));
    }
    if(tgtR.status !== 'war'){ X.declareWar(1, tgtR.id);
      if(!firstWar && EQ){ const want = Math.round(foeArmy(tgtR.id)*EQ), cap = X.capitalOf(1); let k = 0; while(army() < want && k++ < 60){ const u = X.spawnUnit(1, cap, X.pickCard(1)); if(!u) break; } ev.push('topup '+army()+'@'+Math.round(G.t)); }
      if(!firstWar) firstWar = G.t; ev.push('war '+tgtR.name+'@'+Math.round(G.t)); }
    if(!process.env.NOBAN && !(G.t < (G.banCd||0)) && X.callBanners) X.callBanners();
    const band = G.units.filter(v => v.fol===h.id && v.hp>0).length;
    const tc = X.citiesOf(tgtR.id).sort((p, q) => Math.hypot(p.x-h.x, p.y-h.y) - Math.hypot(q.x-h.x, q.y-h.y))[0];
    if(!tc) continue;
    // a thin band regroups at home first
    if(band < 5 && a >= 8){ const cap = X.capitalOf(1); if(cap && Math.hypot(cap.x-h.x, cap.y-h.y) > 3){ h.goal = {x:cap.x+.5, y:cap.y+.5}; h.tcity = 0; continue; } }
    const d = Math.hypot(tc.x+.5-h.x, tc.y+.5-h.y);
    if(d > 2.2){ h.goal = {x:tc.x+.5, y:tc.y+.5}; h.tcity = 0; } else { h.goal = null; h.tcity = tc.id; }
    if((h.acd||0) <= 0){ const n = G.units.filter(v => v.hp>0 && X.atWar(1, v.owner) && (v.x-h.x)**2+(v.y-h.y)**2 < 9).length; if(n >= 3) X.heroActive(h); }
    const m = Math.floor(G.t/60); if(m !== lastM && !quiet){ lastM = m; log(String(m).padStart(2), 'cities', cn, 'army', a, 'band', band, 'tgt', tgtR.name, 'foeArmy', foeArmy(tgtR.id), 'foeCities', X.citiesOf(tgtR.id).length, 'alive', alive.length, 'alarm', G.alarm||0, 'coal', !!G.coal); }
  }
  const gone = G.rivals.filter(r => !r.alive).length;
  const res = {run, t:Math.round(G.t), ended:!!G.ended, won:!!G.won, kind:global.__end && global.__end.kind, gone, of:G.rivals.length, cities:X.citiesOf(1).length, lost, heroDeaths, peakArmy, firstWar:firstWar && Math.round(firstWar), dmgTaken:Object.values(G.dtk||{}).reduce((a, b) => a+b, 0)|0};
  results.push(res);
  log('RESULT', JSON.stringify(res), JSON.stringify(global.__end||{})); log('EV', ev.filter(e=>!/city/.test(e)).join(' '));
  if(!quiet) log('EVENTS', ev.join(' '));
}
if(RUNS > 1){ const avg = k => (results.reduce((a, r) => a + (+r[k]||0), 0)/results.length).toFixed(1); log('AVG won', avg('won'), 't', avg('t'), 'gone', avg('gone'), 'lost', avg('lost'), 'heroDeaths', avg('heroDeaths')); }
