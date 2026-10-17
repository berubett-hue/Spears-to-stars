// shared harness: loads the game with internals exposed
const fs=require('fs');
module.exports = function(file){
  const path=require('path'); file=file||'/home/claude/sts';
  let js;
  if(fs.statSync(file).isDirectory() || /index\.html$/.test(file)){ const dir=fs.statSync(file).isDirectory()?file:path.dirname(file); const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
    js=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>fs.readFileSync(path.join(dir,m[1]),'utf8')).join('\n'); }
  else js=fs.readFileSync(file,'utf8').split('<script>')[1].split('</script>')[0];
  js=js.replace('window.EH = {','window.X={get G(){return G}, get S(){return S}, absorb, CARDS,UEVO,AR,arBuild,arStep,arSwapIn,arSwapOut,uStat,powerOf,unitUpkeep,soldierCost,squadSize,levelOptions,lvlCap,META,isUnlocked,NATIONS_P,PEOPLE,heroOf,ARMY_MAX,formCost,cardLevel,rival,citiesOf,unitCount,armyUpkeep,BARB,spawnBarb,joinBand,declareWar,capitalOf,atWar,bandUnits,mRank,mCap,cardCap,armyListFor,ACH,achDone,giveHint,cardSlots,NATIONS_P,natOK,endProgHTML,levelOptions,callBanners,heroActive,setOrder,folCap,spawnUnit,pickCard}; window.EH = {');
  function fake(){const f=function(){return fake()};return new Proxy(f,{get(t,k){if(k===Symbol.toPrimitive)return()=>0;if(k==='clientWidth'||k==='clientHeight')return 400;if(k==='children')return[];if(k==='forEach')return()=>{};if(k==='appendChild')return undefined;return fake()},set(){return true},apply(){return fake()}})}
  global.window=global;global.document={querySelector:()=>fake(),querySelectorAll:()=>[],createElement:()=>fake(),getElementById:()=>fake(),addEventListener(){},hidden:false};
  global.requestAnimationFrame=()=>{};global.localStorage={getItem:()=>null,setItem(){}};global.devicePixelRatio=1;global.addEventListener=()=>{};global.performance={now:()=>Date.now()};
  global.setTimeout=(f)=>{try{f()}catch(e){}};
  js=js.replace('function endGame(won, fallenCap, by, kind, who){', "function endGame(won, fallenCap, by, kind, who){ try{ const cp=fallenCap||capitalOf(PLAYER); const near=(o,r)=>cp?G.units.filter(u=>u.hp>0&&(o===1?u.owner===1:u.owner!==1)&&Math.hypot(u.x-cp.x-.5,u.y-cp.y-.5)<r).length:0; global.__end={won,kind:kind||null,by:by||(who&&who.name)||null,t:Math.round(G.t),myNear:near(1,8),foeNear:near(2,8),barbNear:cp?G.units.filter(u=>u.hp>0&&u.owner===0&&Math.hypot(u.x-cp.x-.5,u.y-cp.y-.5)<8).length:0,myTotal:G.units.filter(u=>u.owner===1&&u.hp>0).length,heroAlive:!!heroOf(1),wars:G.rivals.filter(r=>r.status==='war').length,coal:!!G.coal}; }catch(e){ global.__end={err:String(e)}; }");
  (0,eval)(js);
  return {X:global.X, EH:global.EH};
};
