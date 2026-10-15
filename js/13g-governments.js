"use strict";
/* ---------- Governments: at the start and at each new age, choose how your people are ruled ----------
   Two choices per age. The new government replaces the old one, so each age of a run has its own shape.
   Effects are ordinary stat bonuses (see computeStats), each with a real cost. */
const GOVS = {
  chiefdom:   {age:0, n:'Chiefdom',          d:'+12% troop damage', c:'−10% science', e:{solDmg:.12, sci:-.1}},
  elders:     {age:0, n:'Council of Elders', d:'+15% food and influence', c:'−8% troop damage', e:{food:.15, infl:.15, solDmg:-.08}},
  monarchy:   {age:1, n:'Monarchy',          d:'+30% city health, −10% army upkeep', c:'−10% influence', e:{cityhp:.3, upkeep:-.1, infl:-.1}},
  republic:   {age:1, n:'Republic',          d:'+15% science, +40% trade income', c:'+10% army upkeep', e:{sci:.15, tradeBoost:.4, upkeep:.1}},
  feudalism:  {age:2, n:'Feudalism',         d:'+15% troop health, +25% city guard health', c:'−10% science', e:{solHp:.15, guardHp:.25, sci:-.1}},
  theocracy:  {age:2, n:'Theocracy',         d:'+30% influence, cities repair 50% faster', c:'−8% food', e:{infl:.3, regen:.5, food:-.08}},
  merchant:   {age:3, n:'Merchant Republic', d:'+25% influence, +50% trade income', c:'−8% troop health', e:{infl:.25, tradeBoost:.5, solHp:-.08}},
  absolute:   {age:3, n:'Absolute Monarchy', d:'+1 city limit, +10% troop damage', c:'+12% army upkeep', e:{cities:1, solDmg:.1, upkeep:.12}},
  empire:     {age:4, n:'Empire',            d:'+12% troop damage and health', c:'+15% army upkeep', e:{solDmg:.12, solHp:.12, upkeep:.15}},
  democracy:  {age:4, n:'Democracy',         d:'+12% food, production and science', c:'−8% troop damage', e:{all:.12, solDmg:-.08}},
  technocracy:{age:5, n:'Technocracy',       d:'+30% science, +30% tower damage', c:'−10% food', e:{sci:.3, towerDmg:.3, food:-.1}},
  federation: {age:5, n:'Federation',        d:'+40% influence, +25% city health', c:'−6% troop damage', e:{infl:.4, cityhp:.25, solDmg:-.06}}
};
const govArt = id => 'art/governments/gov_'+id+'.webp';
const govOf = () => (G && G.gov && GOVS[G.gov]) || null;
function govEffects(){ const g = govOf(); return g ? g.e : null; }
/* queued by the update loop: once near the start, then at each new age */
function govTick(){
  if(!G || G.demo || G.arena || G.ended || modal) return;
  if(G.govQ == null && !G.govAsked && G.t >= 35){ G.govAsked = 1; G.govQ = G.eraIdx||0; }
}
function openGov(age){
  const ids = Object.keys(GOVS).filter(k => GOVS[k].age===age); if(ids.length < 2) return;
  const cur = govOf();
  showEvent({gate:4, kicker:ERAS[age]+' Age · Government', title:'How will your people be ruled?',
    text:cur ? 'A new age asks for new rule. You lead as a '+cur.n+'; the choice you make now replaces it.' : 'Your people look to you for the shape of their rule. You can choose again at every new age.',
    opts:ids.map(id => ({l:GOVS[id].n, pic:govArt(id), s:GOVS[id].d+' · '+GOVS[id].c, f:() => setGov(id)}))});
}
function setGov(id){
  const g = GOVS[id]; if(!g) return;
  G.gov = id; (G.govHist || (G.govHist = [])).push(id);
  refreshStats();
  banner(g.n, 'Your people are now ruled as', govArt(id));
  toast(g.n+': '+g.d+'. Cost: '+g.c, 'good');
}
