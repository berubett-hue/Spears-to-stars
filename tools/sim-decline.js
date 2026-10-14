const {X,EH}=require('./harness.js')(process.argv[2] || require('path').join(__dirname, '..')); const fs=require('fs'), log=(...a)=>fs.writeSync(1,a.join(' ')+'\n');
for(const id in X.CARDS) if(!X.CARDS[id].secret) X.META.unl.add(id);
EH.setNation(process.argv[3]||'legion'); EH.R.diff=1; EH.R.crown=0; EH.newGame(); EH.setRunning(true); const G=X.G;
const skip=()=>{ if(EH.modal==='draft')EH.choose(EH.choices[0]); else if(EH.modal==='chest'){EH.R.chestLock=0;EH.closeChest();} else if(EH.modal==='find')EH.closeFind(); else if(EH.modal==='event')EH.resolveEvent(0); };
const until=t=>{ while(G.t<t && !G.ended){ if(EH.modal && EH.modal!=='end'){ skip(); continue; } if(EH.modal==='end') break; EH.update(.05); } };
until(+process.argv[4]||600); log('t',Math.round(G.t),'ended',G.ended,'cities',X.citiesOf(1).length,'era',G.eraIdx);
if(G.ended) process.exit();
// hand the world to the player
for(const c of G.cities.slice()) if(c.owner>1){ c.killer=1; c.dead=true; }
for(let i=0;i<20;i++) EH.update(.05);
G.rivals.forEach(r=>{ if(r.alive) EH.eliminate(r.id); });
for(let i=0;i<10;i++){ if(EH.modal && EH.modal!=='end') skip(); EH.update(.05); }
log('won',G.won,'cities',X.citiesOf(1).length,'modal',EH.modal); EH.startDecline(true);
let last=-1; const t0=G.t;
while(!G.ended && G.t < t0+1500){ if(EH.modal && EH.modal!=='end'){ skip(); continue; } if(EH.modal==='end') break; EH.update(.05);
  const m=Math.floor((G.t-t0)/30); if(m!==last){ last=m; const D=G.decline; log(' +'+(m*30)+'s act',D&&D.act,'cities',X.citiesOf(1).length,'cap hp',Math.round((X.capitalOf(1)||{}).hp||0),'units',G.units.filter(u=>u.owner===1&&!u.hero&&u.hp>0).length,'barbs',G.units.filter(u=>u.owner===0&&u.hp>0).length,'last',D&&D.last); } }
const D=G.decline; log('END held',D&&Math.round(D.held),'kills',D&&D.kills,'glory',G.glory&&G.glory.total);
