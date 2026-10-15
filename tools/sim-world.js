// play a game with governments, resource sites and a forced Red Horde; report what happened
const {X,EH}=require('./harness.js')(require('path').join(__dirname, '..')); const fs=require('fs'), log=(...a)=>fs.writeSync(1,a.join(' ')+'\n');
for(const id in X.CARDS) if(!X.CARDS[id].secret) X.META.unl.add(id);
const nat = process.argv[2]||'legion', T = +process.argv[3]||900, pickGov = +(process.argv[4]||0);
const OFF=(process.env.OFF||'').split(',');
if(OFF.includes('pull')) global.resPull=()=>0;
if(OFF.includes('gov')) global.govEffects=()=>null;
if(OFF.includes('sites')) global.siteEffects=()=>{};
if(OFF.includes('rdmg')){ const st=global.siteTick; global.siteTick=dt=>{ st(dt); X.G.siteN={}; }; }
if(OFF.includes('all')){ global.resPull=()=>0; global.govEffects=()=>null; const st=global.siteTick; global.siteTick=dt=>{ st(dt); X.G.siteN={}; }; global.siteEffects=()=>{}; }
EH.setNation(nat); EH.R.diff=1; EH.R.crown=+(process.argv[5]||0); EH.newGame(); EH.setRunning(true); const G=X.G;
G.hordeAt = +(process.env.HAT||0) || null;
const skip=()=>{ if(EH.modal==='draft')EH.choose(EH.choices[0]); else if(EH.modal==='chest'){EH.R.chestLock=0;EH.closeChest();} else if(EH.modal==='find')EH.closeFind(); else if(EH.modal==='event')EH.resolveEvent(EH.R.event && EH.R.event.opts && EH.R.event.opts.length===2 ? pickGov : 0); else if(EH.modal==='muster') EH.choose(EH.choices[0]); };
let last=-1, raids=0;
while(G.t<T && !G.ended){ if(EH.modal && EH.modal!=='end'){ skip(); continue; } if(EH.modal==='end') break; EH.update(.05);
  const m=Math.floor(G.t/60); if(m!==last){ last=m;
    const own = (G.sites||[]).map(s=>s.k[0]+(s.owner===1?'*':s.owner?s.owner:'-')).join(' ');
    const H=G.horde, hb = H ? (H.broken?'broken':'alive g'+G.units.filter(u=>u.camp===H.cap&&u.hp>0).length+' hr'+G.units.filter(u=>u.hr&&u.hp>0).length) : (G.hordeAt?'pending':'none');
    log(String(m).padStart(2),'gov',G.gov||'-','era',G.eraIdx,'cities',X.citiesOf(1).length,'units',G.units.filter(u=>u.owner===1&&!u.hero&&u.hp>0).length,'sites',own,'horde',hb); } }
log('END t',Math.round(G.t),'ended',G.ended,'won',G.won,'govHist',(G.govHist||[]).join(','),'stats horde',G.stats.horde||0,'sites',G.stats.sites||0);
