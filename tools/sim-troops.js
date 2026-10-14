const {X,EH}=require('./harness.js')(process.argv[2] || require('path').join(__dirname, '..')); const fs=require('fs'), log=(...a)=>fs.writeSync(1,a.join(' ')+'\n');
for(const id in X.CARDS) if(!X.CARDS[id].secret) X.META.unl.add(id);
EH.setNation(process.argv[3]||'legion'); EH.R.diff=1; EH.R.crown=0; EH.newGame(); EH.setRunning(true); const G=X.G;
const skip=()=>{ if(EH.modal==='draft')EH.choose(EH.choices[0]); else if(EH.modal==='chest'){EH.R.chestLock=0;EH.closeChest();} else if(EH.modal==='find')EH.closeFind(); else if(EH.modal==='event')EH.resolveEvent(0); };
let last=-1, spawned=0; const n0=()=>G.units.filter(u=>u.owner===1&&!u.hero&&u.hp>0).length;
let prevIds=new Set();
while(!G.ended && G.t<1260){ if(EH.modal && EH.modal!=='end'){ skip(); continue; } if(EH.modal==='end') break; EH.update(.05);
  for(const u of G.units) if(u.owner===1 && !u.hero && !prevIds.has(u.id)){ prevIds.add(u.id); spawned++; }
  const m=Math.floor(G.t/30)/2; if(m!==last && m>=13){ last=m; log('t',fmt(G.t),'dec',!!G.decline,'cities',X.citiesOf(1).length,'units',n0(),'spawned/min',spawned,'pool',Math.round(G.army),'budget',(G.rates.a||0).toFixed(1),'upk',(G.rates.u||0).toFixed(1),'cap',G.armyCap,'barbs',G.units.filter(u=>u.owner===0&&u.hp>0).length); spawned=0; } else if(m!==last){ last=m; spawned=0; } }
function fmt(t){ return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'); }
log('END', G.ended, fmt(G.t), G.decline && Math.round(G.decline.held||0));
