"use strict";
/* ---------- Secret troop lines: found, never chosen ---------- */
const SECRET_DEF = {
  wolves:{n:'Wolf Riders', role:'rider', tags:['Mounted','Swarm'], hp:26, dmg:6, spd:2.45, rng:.6, cd:.65, size:.95, sq:3, grow:.4, up:2.0, cost:9.5, lifesteal:.07, tpl:'horse', d:'Fast packs of three that hunt together and heal as they bite',
    names:['Wolf Riders','Hound Lancers','Warg Raiders','Mastiff Dragoons','Hound Cavalry','K9 Motor Squad','Robo-Hound Riders','Cyber-Wolf Pack'], sh:[0,'javelin',0,'musket','musket','bullet','laser','laser']},
  firemonks:{n:'Fire Monks', role:'archer', tags:['Fire','Holy'], hp:32, dmg:6.5, spd:1, rng:2, cd:1.5, size:1, sq:2, grow:.3, up:2.6, cost:14, splash:.7, smul:.6, wall:1, mend:.35, tpl:'grenadiers', d:'Burn their foes and heal every ally standing near them',
    names:['Flame Acolytes','Sun Priests','Fire Monks','Inquisitors','Zealot Sappers','Flamethrower Chaplains','Plasma Clerics','Solar Seraphs'], sh:['fire','fire','fire','fire','bomb','fire','plasma','plasma']},
  golems:{n:'Stone Golems', role:'titan', tags:['Titan','Siege'], hp:270, dmg:18, spd:.75, rng:.8, cd:1.4, size:1.75, sq:1, grow:.12, up:15, cost:62, splash:.7, smul:.35, wall:3.2, tpl:'elephant', d:'Slow stone giants that crush city walls and anything beside them',
    names:['Clay Golem','Bronze Colossus','Stone Golem','Clockwork Giant','Steam Juggernaut','Siege Crawler','Demolition Mech','Titan Golem'], sh:[]},
  skylancers:{n:'Sky Lancers', role:'rider', tags:['Mounted','Holy'], hp:44, dmg:8, spd:2.3, rng:.7, cd:.8, size:1.15, sq:1, grow:.22, up:4.2, cost:22, fly:1, tpl:'knights', d:'Flying lancers that charge over walls, water and mountains',
    names:['Griffin Riders','Pegasus Lancers','Wyvern Knights','Balloon Hussars','Biplane Lancers','Jump-Jet Lancers','Gravity Lancers','Starfire Knights'], sh:[0,0,'fire',0,'bullet',0,'laser','laser']},
  shadows:{n:'Shadow Archers', role:'archer', tags:['Ranged','Swarm'], hp:18, dmg:8.5, spd:1.2, rng:3.2, cd:1.3, size:.9, sq:2, grow:.35, up:2.0, cost:11, ambush:2.5, tpl:'longbow', d:'Unseen hunters. Their first shot on a fresh target hits for 2.5 times the damage',
    names:['Shadow Slingers','Night Archers','Assassin Crossbows','Jäger Snipers','Sharpshooters','Special Forces','Cloaked Snipers','Phase Rangers'], sh:['rock','arrow','bolt','musket','musket','bullet','laser','laser']},
  colossus:{n:'The Colossus', role:'titan', tags:['Titan','Fire'], hp:560, dmg:30, spd:.62, rng:2.2, cd:1.8, size:2.4, sq:1, grow:.08, up:30, cost:120, splash:1.1, smul:.45, wall:2, tpl:'elephant', d:'One enormous walking fortress. Slow, nearly unkillable, and it burns whatever stands in front of it',
    names:['Ancient Giant','Titan of Rhodes','Siege Behemoth','Clockwork Leviathan','Land Ironclad','Super-Heavy Tank','Walking Fortress','Colossus Mech'], sh:['rock','fire','bolt','shell','shell','shell','rocket','laser']}
};
for(const id in SECRET_DEF){ const D = SECRET_DEF[id], T = CARDS[D.tpl]; const C = Object.assign({}, D, {era:0, secret:1}); delete C.names; delete C.tpl;
  C.forms = D.names.map((n, i) => { const f = {n, s:T.forms[i].s}; if(D.sh[i]) f.sh = D.sh[i]; if(D.fly) f.fly = 1; return f; }); delete C.sh; CARDS[id] = C; }
const formOf = (id, lvl) => { const C = CARDS[id] || CARDS.militia; return C.forms[Math.max(1, Math.min(8, lvl||1)) - 1]; };
const formLv = (o, id) => cardLevel(o, id);
const formName = (o, id) => formOf(id, cardLevel(o, id)).n;
const formSize = (id, lvl) => { const f = formOf(id, lvl); return f.sz || CARDS[id].size; };
const formFly = (id, lvl) => !!(CARDS[id].fly || formOf(id, lvl).fly);
const formMul = lvl => Math.pow(1.12, Math.max(0, (lvl||1) - 1));
const formCost = lvl => Math.pow(1.13, Math.max(0, (lvl||1) - 1));

const SYN = {
  Swarm:[[2,'Swarm units cost 40% less to raise and keep']],
  Line:[[2,'Line units +30% health']],
  Ranged:[[2,'Ranged units +25% damage']],
  Mounted:[[2,'Mounted charges hit much harder. +10% speed']],
  Titan:[[2,'Titans +40% health and trample twice as hard']],
  Siege:[[2,'Siege deals 50% more damage to walls']],
  Support:[[2,'Support auras reach 50% farther']],
  Holy:[[2,'Holy units heal 3% health per second']],
  Fire:[[2,'Fire units +25% damage']]
};
const COMBOS = [
  {id:'anvil', a:'spearmen', b:'knights', n:'Hammer and Anvil', d:'Heavy Horse deal double damage to enemies your line units are holding'},
  {id:'shieldbow', a:'shieldwall', tag:'Ranged', n:'Shield and Bow', d:'Ranged units next to a shield wall take half damage'},
  {id:'drums', a:'elephant', b:'banner', n:'War Drums', d:'Titan attacks terrify enemies and slow them'},
  {id:'masses', a:'priests', tag:'Swarm', n:'Blessed Masses', d:'Healers heal swarm units three times as fast'},
  {id:'rundown', a:'slingers', b:'horse', n:'Run Them Down', d:'Light Horse deal double damage to enemies your Skirmishers have pinned'},
  {id:'fury', a:'grenadiers', b:'militia', n:'Fire and Fury', d:'Warband deal +50% damage to enemies left burning by your Bombers'},
  {id:'kground', a:'spearmen', b:'catapult', n:'Killing Ground', d:'Siege shells hit 50% harder on enemies locked in melee with your line units'},
  {id:'ironrain', a:'longbow', b:'banner', n:'Rain of Iron', d:'Archers near a Command banner rain twice as hard around their target'},
  {id:'pinpierce', a:'slingers', b:'crossbow', n:'Pin and Pierce', d:'Crossbows deal +50% to pinned enemies, and their bolts fly through to two more'},
  {id:'stampede', a:'elephant', b:'horse', n:'Stampede', d:'Light Horse deal +60% to enemies a Titan has just flung'},
  {id:'firestorm', a:'grenadiers', b:'airships', n:'Firestorm', d:'Bomber and Sky blasts leave the ground burning'},
  {id:'hedge', a:'shieldwall', b:'spearmen', n:'Tortoise and Hedge', d:'Enemies taunted by your Shield Wall take +40% from your Spear Line'}
];
const comboOn = (o, c) => ownsCard(o, c.a) && (c.b ? ownsCard(o, c.b) : ownerCards(o).some(id => CARDS[id].tags.includes(c.tag)));
const UEVO = [
  /* Unions: two troop lines at level 6 or higher fuse into one when you open a War Chest. The partner's slot is freed */
  {id:'holy', clue:'Faith rides to war', col:'#fff0c8', from:'knights', with:'priests', union:1, n:'Holy Order', d:'Sworn riders who mend as they fight. +60% health and damage, and they heal while fighting', hp:1.6, dmg:1.6, selfheal:.03},
  {id:'tercio', clue:'Pike and shot, side by side', col:'#e0704a', from:'longbow', with:'spearmen', union:1, n:'Tercio', d:'Pike and shot. +60% health and every volley fires twice', hp:1.6, twin:1},
  {id:'pavise', clue:'Bolts loosed from behind great shields', col:'#7ab8f0', from:'crossbow', with:'shieldwall', union:1, n:'Pavise Company', d:'Shooters behind great shields. +80% health, half damage from ranged attacks, +1 range', hp:1.8, arrowRes:.5, rng:1},
  {id:'fortress', clue:'A giant that carries the siege', col:'#a8e0f8', from:'elephant', with:'catapult', union:1, n:'Mobile Fortress', d:'A titan carrying a siege battery. +60% health, +40% damage, +1.5 range, wider blasts', hp:1.6, dmg:1.4, rng:1.5, splashMul:1.5},
  {id:'levee', clue:'When the whole nation takes up arms', col:'#ff5a4a', from:'militia', with:'banner', union:1, n:'Levée en Masse', d:'The whole nation under arms. +3 per squad and +120% health and damage', hp:2.2, dmg:2.2, sq:3},
  {id:'cossacks', clue:'Riders who never stop shooting', col:'#ff9a3a', from:'horse', with:'slingers', union:1, n:'Cossack Host', d:'+2 per squad. Shoot while riding. +120% damage, +80% health', sq:2, rng:1.4, dmg:2.2, hp:1.8},
  /* Evolutions: a troop line at level 6 or higher plus its civic evolves when you open a War Chest */
  {id:'storm', clue:'A swarm schooled in the art of war', col:'#8ad8ff', from:'slingers', relic:'college', n:'Storm Troopers', d:'+3 per squad and +40% damage', sq:3, dmg:1.4},
  {id:'battery', clue:'Siege perfected in the forge', col:'#e8b860', from:'catapult', relic:'forge', n:'Grand Battery', d:'+2 range, twice the blast, +40% damage', rng:2, splashMul:2, dmg:1.4},
  {id:'phalanx', clue:'Spears drilled until they never break', col:'#ff7a5a', from:'spearmen', relic:'drill', n:'Iron Phalanx', d:'+50% health and +40% damage', hp:1.5, dmg:1.4},
  {id:'wardens', clue:'Shields that mend themselves', col:'#e8e8f0', from:'shieldwall', relic:'hall', n:'Steel Wardens', d:'+60% health and they heal while fighting', hp:1.6, selfheal:.03},
  {id:'demo', clue:'Fire, engineered', col:'#ff6a3a', from:'grenadiers', relic:'engineering', n:'Demolition Corps', d:'+60% bigger blasts and +50% damage', splashMul:1.6, dmg:1.5},
  {id:'skyfort', clue:'The sky, studied and armored', col:'#a8f07a', from:'airships', relic:'astronomy', n:'Sky Fortress', d:'+60% health and damage', hp:1.6, dmg:1.6},
  {id:'marshals', clue:'Command bound by law', col:'#ffd04a', from:'banner', relic:'laws', n:'Grand Marshals', d:'Aura reaches 50% farther. +50% health', auraMul:1.5, hp:1.5},
  /* Legendary unions: two lines at Lv 7. Each rival nation guards the secret of one; defeat that nation to learn it */
  {id:'thunder', legend:1, union:1, lv:7, col:'#ffb04a', from:'spearmen', with:'grenadiers', n:'Thunder Legion', clue:'Spears that explode', d:'Shock troops whose every blow detonates. +80% health, double damage, and their strikes blast', hp:1.8, dmg:2, splash:.9},
  {id:'skyriders', legend:1, union:1, lv:7, col:'#9ad8ff', from:'horse', with:'airships', n:'Sky Riders', clue:'Cavalry that leaves the ground', d:'Riders of the air. They fly over everything. +60% health, double damage', hp:1.6, dmg:2, fly:1},
  {id:'colossus', legend:1, union:1, lv:7, col:'#d8d0c0', from:'elephant', with:'shieldwall', n:'Colossi', clue:'A titan that is itself a wall', d:'Walking fortresses. +160% health, +60% damage, half damage from ranged attacks', hp:2.6, dmg:1.6, arrowRes:.5},
  {id:'phantom', legend:1, union:1, lv:7, col:'#c0a8ff', from:'longbow', with:'crossbow', n:'Phantom Corps', clue:'Two kinds of bow become one ghost', d:'Unseen marksmen. Every shot fires twice, +1.5 range, +80% damage', twin:1, rng:1.5, dmg:1.8, hp:1.4},
  {id:'paladins', legend:1, union:1, lv:7, col:'#fff0a0', from:'knights', with:'banner', n:'Storm Paladins', clue:'Riders who carry the banner into the fight', d:'+90% health and damage, and they heal while fighting', hp:1.9, dmg:1.9, selfheal:.02},
  {id:'angels', legend:1, union:1, lv:7, col:'#ffffff', from:'priests', with:'airships', n:'Angels of Mercy', clue:'Healers that descend from above', d:'Flying healers. Heal twice as much over a 40% wider aura. Double health', hp:2, healMul:2, auraMul:1.4, fly:1},
  {id:'miracle', clue:'Healing raised to medicine', col:'#fff6a0', from:'priests', relic:'medicine', n:'Miracle Workers', d:'Heal 60% more. +50% health', healMul:1.6, hp:1.5}
];
const RELICS = {
  writing:{p:'sci', n:'Writing', d:'Science +15%, so you level up faster', e:{sci:.15}, max:5},
  commerce:{p:'sci', n:'Guilds', d:'Production +15%', e:{prod:.15}, max:5},
  philosophy:{p:'sci', n:'Philosophy', d:'Each level-up costs 6% less science', max:5},
  engineering:{p:'sci', n:'Engineering', d:'Towers +20% damage and cities +15% health', e:{towerDmg:.2, cityhp:.15}, max:5},
  medicine:{p:'sci', n:'Medicine', d:'Cities grow 1 citizen larger and repair 30% faster', e:{popCap:1, regen:.3}, max:5},
  astronomy:{p:'sci', n:'Astronomy', d:'Science +10%. Needed for the Space Program', e:{sci:.1}, max:5},
  frontier:{p:'exp', n:'Frontier', d:'Settlers 12% cheaper. +1 city limit at levels 1, 3 and 5', e:{settler:-.12}, max:5},
  laws:{p:'exp', n:'Code of Laws', d:'Influence +25% and borders grow 15% faster', e:{infl:.25, border:.15}, max:5},
  agri:{p:'exp', n:'Agriculture', d:'Food +20%', e:{food:.2}, max:5},
  masonry:{p:'exp', n:'Masonry', d:'Cities +25% health and towers +15% damage', e:{cityhp:.25, towerDmg:.15}, max:5},
  cartography:{p:'exp', n:'Cartography', d:'Settle 1.5 tiles farther and borders grow 20% faster', e:{settleDist:1.5, border:.2}, max:5},
  trade:{p:'exp', n:'Trade Routes', d:'Influence +15% and trade deals pay 25% more', e:{infl:.15, tradeBoost:.25}, max:5},
  forge:{p:'mil', n:'Iron Forge', d:'+10% troop damage', max:5},
  drill:{p:'mil', n:'Drill Yard', d:'+10% troop health', max:5},
  quarter:{p:'mil', n:'Quartermaster', d:'Troop upkeep −7%, so you field more troops', max:5},
  roads:{p:'mil', n:'Swift Roads', d:'+8% troop speed', max:5},
  spyglass:{p:'mil', n:'Spyglass', d:'Ranged and siege troops reach 0.2 tiles farther', max:5},
  college:{p:'mil', n:'War College', d:'Special attacks recharge 8% faster', max:5},
  hall:{p:'mil', n:'Healers’ Hall', d:'Troops regenerate +0.6% health each second', max:5}
};
const PILLARS = {mil:'⚔ Military', sci:'📜 Science', exp:'🏰 Expansion'};
const ERA_LV = [0, 4, 8, 12, 15, 18];
const eraOfLevel = l => { let e = 0; while(e < 5 && l >= ERA_LV[e+1]) e++; return e; };
const levelCost = l => Math.round((25 + 120*Math.pow(l, 1.4))*(1 - .06*(G && G.relics ? relicLv('philosophy') : 0))*(hasArt('lens') ? .9 : 1));
const SHIP_REQ = ['writing','astronomy'];
const shipReady = () => G.eraIdx >= 4 && !G.proj && !G.decline && relicLv('writing') >= 5 && relicLv('astronomy') >= 3;
const LV_BASE = [null, null, {sq:1}, {dmg:.15, f:1}, {hp:.35}, {sq:1}, {f:2}, {dmg:.4, hp:.4}, {dmg:.3, hp:.3, ab:.33, f:3}];
/* Visible level-ups, like Vampire Survivors weapons: every troop has a fighting style, and levels 3, 6 and 8 change how it attacks */
function lvStyle(C){ if(C.role==='support') return 'aura'; if(C.splash) return 'blast'; if(C.rng > 1.2) return 'volley'; if(C.role==='rider') return 'charge'; if(C.tags.includes('Line')) return 'shield'; return 'melee'; }
const FEAT = {
  volley:[null, {shots:1}, {shots:1}, {thru:1}],
  blast:[null, {blast:.3}, {blast:.3, smul:.15}, {burn:1}],
  charge:[null, {trample:1, dmgB:.15}, {chargeB:.4}, {lance:1, gallop:.15}],
  shield:[null, {cleave:1, dmgB:.15}, {riposte:.3, dmgB:.12}, {crit:1}],
  melee:[null, {cleave:1, dmgB:.25}, {cleave:1, dmgB:.15}, {crit:1}],
  aura:[null, {aura:.25}, {aura:.25}, {potent:.5}]
};
const STYLE_N = {volley:'Volley fire', blast:'Blast', charge:'Charge', shield:'Shield line', melee:'Brawler', aura:'Aura'};
function featText(C, f){
  const st = lvStyle(C), F = FEAT[st][f]; if(!F) return '';
  if(F.shots) return '+1 shot per volley (hits another enemy)';
  if(F.thru) return 'Shots pierce through to the enemy behind';
  if(F.burn) return 'Blasts leave the ground burning';
  if(F.blast) return 'Blast radius +30%'+(F.smul ? ' and blasts hit harder' : '');
  if(F.trample) return 'Charges trample everyone around the target';
  if(F.chargeB) return 'Charge damage +40%';
  if(F.lance) return 'Every hit lands as a charge, +15% speed';
  if(F.riposte) return 'Riposte: strike back for 30% of melee damage taken';
  if(F.crit) return 'Crushing blows: every 4th hit deals triple damage';
  if(F.cleave) return f===1 ? 'Cleave: each blow also hits a nearby enemy' : 'Cleave hits one more enemy';
  if(F.aura) return 'Aura reaches 25% farther';
  if(F.potent) return C.heal ? 'Heals 50% more' : 'Aura bonus 50% stronger';
  return '';
}
function featOf(C, lvl){
  const o = {dmgB:0, shots:0, thru:0, blast:0, smul:0, burn:0, trample:0, chargeB:0, lance:0, gallop:0, riposte:0, crit:0, cleave:0, aura:0, potent:0};
  const T = FEAT[lvStyle(C)];
  for(let l=2; l<=lvl; l++){ const f = (LV_BASE[l]||{}).f; if(f && T[f]) for(const k in T[f]) o[k] += T[f][k]; }
  if(lvl >= 3 && C.sq >= 3 && T===FEAT.volley) o.dmgB += .15;
  return o;
}
const rankOf = l => l >= 8 ? 3 : 0;
const FEAT_SHORT = {volley:['+1 shot','+1 shot','piercing shots'], blast:['wider blast','wider, harder blast','burning ground'], charge:['trample','+40% charge','every hit charges'], shield:['cleave','riposte','crushing blows'], melee:['cleave','cleave +1','crushing blows'], aura:['wider aura','wider aura','stronger aura']};
function ladderHTML(id, lvl){
  const C = CARDS[id], st = lvStyle(C), fs = FEAT_SHORT[st], at = [3, 6, 8];
  return '<span class="abl-ladder"><em>'+STYLE_N[st]+'</em>'+at.map((l,i) => '<i class="'+(lvl >= l ? 'on' : '')+'">Lv '+l+' '+fs[i]+'</i>').join('')+'</span>';
}
function lvStep(C, l){
  let st = LV_BASE[l]; if(!st) return {};
  if(C.sq===1 && st.sq) st = l===2 ? {hp:.35} : {dmg:.35};
  if(C.role==='archer' && l===4) st = {rng:.5, hp:.2};
  return st;
}
function lvBonus(C, lvl){ const b = {sq:0, dmg:0, hp:0, cd:0, rng:0, ab:0}; for(let l=2; l<=lvl; l++){ const st = lvStep(C, l); for(const k in st) b[k] += st[k]; } return b; }
function lvText(C, l){
  const st = lvStep(C, l), out = [];
  if(st.sq) out.push('+'+st.sq+' troop per squad'); if(st.dmg) out.push('+'+Math.round(st.dmg*100)+'% damage'); if(st.hp) out.push('+'+Math.round(st.hp*100)+'% health');
  if(st.cd) out.push('attack '+Math.round(st.cd*100)+'% faster'); if(st.rng) out.push('+'+st.rng+' range'); if(st.ab) out.push('special attacks recharge '+Math.round(st.ab*100)+'% faster');
  if(st.f){ const ft = featText(C, st.f); if(ft) out.unshift('★ '+ft); }
  const t = out.join(', '); return t.charAt(0).toUpperCase() + t.slice(1);
}
const BASE_UNLOCKED = ['militia','spearmen','slingers','horse'];
const LIFE = () => META.life, CK = id => (META.life.ck[id]||0);
/* ---------- Unlocks: a people and its troop line arrive together; feats are won inside one game ---------- */
const RUN = f => { try { return (G && !G.demo && !G.arena && G.stats) ? (f() || 0) : 0; } catch(e){ return 0; } };
const BEST = (k, cur) => Math.max(META.life['b_'+k]||0, cur||0);
const TOPC = () => LIFE().topCrown ?? -1;
const ACH = [
  {id:'diff:2', d:'Win on King (Crown 0)', prog:() => [LIFE().wKing||0, 1]},
  /* the four ways to win each bring a people: these teach the game, so they come first */
  {id:'nat:khanate', pair:'knights', tier:2, d:'Win by conquest', prog:() => [LIFE().wConq||0, 1]},
  {id:'nat:merchant', pair:'crossbow', tier:2, d:'Win by diplomacy, with most nations joining you', prog:() => [LIFE().wDip||0, 1]},
  {id:'nat:star', pair:'catapult', tier:2, d:'Win by launching the starship', prog:() => [LIFE().wSci||0, 1]},
  {id:'priests', tier:2, d:'Win by prosperity: hold a Golden Age for 90 seconds', prog:() => [LIFE().wPros||0, 1]},
  /* feats inside a game count from Crown 1 up, so they land after the first few wins */
  {id:'longbow', tier:1, d:'Your Skirmishers defeat 500 enemies in one game at Crown 1 or higher', prog:() => [BEST('sling1', RUN(() => CR(1) ? ((G.dmg||{})[PLAYER+':slingers']||{}).k : 0)), 500]},
  {id:'elephant', tier:1, d:'Slay 4 Warlords in one game at Crown 1 or higher', prog:() => [BEST('wl1', RUN(() => CR(1) ? G.stats.warlords : 0)), 4]},
  {id:'nat:bastion', pair:'shieldwall', tier:2, d:'Win without losing a single city at Crown 2 or higher', prog:() => [LIFE().wNoLoss2||0, 1]},
  {id:'nat:northmen', tier:2, d:'Win at Crown 1 or higher', prog:() => [TOPC() >= 1 ? 1 : 0, 1]},
  {id:'grenadiers', tier:3, d:'Win at Crown 2 or higher', prog:() => [Math.max(0, Math.min(2, TOPC())), 2]},
  {id:'banner', tier:3, d:'Discover 3 unions or evolutions', prog:() => [Math.min(3, META.disc.size), 3]},
  {id:'airships', tier:3, d:'Win at Crown 4 or higher', prog:() => [Math.max(0, Math.min(4, TOPC())), 4]},
  {id:'wolves', secret:1, tier:4, crown:1, d:'Find and conquer the stronghold of the Wolf Clans (from Crown 1)', prog:() => [LIFE().sh_wolves||0, 1]},
  {id:'firemonks', secret:1, tier:4, crown:2, d:'Find and conquer the Ash Monastery (from Crown 2)', prog:() => [LIFE().sh_firemonks||0, 1]},
  {id:'golems', secret:1, tier:4, crown:3, d:'Find and conquer the hold of the Stoneborn (from Crown 3)', prog:() => [LIFE().sh_golems||0, 1]},
  {id:'skylancers', secret:1, tier:4, crown:4, d:'Find and conquer the eyrie of the Order of the Wing (from Crown 4)', prog:() => [LIFE().sh_skylancers||0, 1]},
  {id:'shadows', secret:1, tier:4, crown:5, d:'Find and conquer the Shadow Court (from Crown 5)', prog:() => [LIFE().sh_shadows||0, 1]},
  {id:'colossus', secret:1, tier:4, crown:6, d:'Find and conquer the Last Machine (from Crown 6)', prog:() => [LIFE().sh_colossus||0, 1]}
];
/* ---------- Alpha reset: the unlock system changed, so every save starts over once ---------- */
/* Changing SAVE_VER wipes every player's unlocks, Glory and Crowns once. Only change it when Tim asks for a reset
   (a big content update). Ordinary updates must keep saves. */
const SAVE_VER = 'alpha-3';
let SAVE_RESET = false;
try { if(localStorage.getItem('eh-ver') !== SAVE_VER){ SAVE_RESET = !!(localStorage.getItem('eh-life') || localStorage.getItem('eh-unlocks')); ['eh-life','eh-unlocks','eh-disc','eh-crown','eh-diff','eh-list','eh-pin'].forEach(k => localStorage.removeItem(k)); localStorage.setItem('eh-ver', SAVE_VER); } } catch(e){}
const META = {unl:new Set(BASE_UNLOCKED), disc:new Set(), seen:new Set(), leg:new Set(), arts:new Set(), life:{games:0, wins:0, kills:0, warlords:0, captured:0, founded:0, ruins:0, ck:{}}, mx:{}, hint:{}};
try { const v = JSON.parse(localStorage.getItem('eh-life') || '{}'); if(v.life) Object.assign(META.life, v.life); META.life.ck = META.life.ck || {}; if(v.mx) META.mx = v.mx; if(v.hint) META.hint = v.hint; META.glory = v.glory||0; META.gloryT = v.gt||0; META.lg = v.lg||{}; META.ack = v.ack ? new Set(v.ack) : null; META.colSeen = v.cs||''; META.noDemo = !!v.nd; META.crown = v.cr ?? null; META.pb = v.pb||{}; META.pg = v.pg||{}; META.q = v.q||{}; META.qd = new Set(v.qd||[]); META.stir = v.st||[]; META.df = v.df||{}; META.met = v.met||[]; META.wk = v.wk||{}; META.cmb = v.cm||{}; } catch(e){}
if(!META.lg) META.lg = {}; if(!META.wk) META.wk = {}; if(!META.cmb) META.cmb = {}; if(!META.pb) META.pb = {}; if(!META.pg) META.pg = {}; if(!META.q) META.q = {}; if(!META.qd) META.qd = new Set(); if(!META.stir) META.stir = []; if(META.glory == null) META.glory = 0; if(META.gloryT == null) META.gloryT = 0;
let lifeDirty = false;
function saveLife(){ lifeDirty = false; try { localStorage.setItem('eh-life', JSON.stringify({life:META.life, mx:META.mx, hint:META.hint, glory:META.glory, gt:META.gloryT, lg:META.lg, ack:[...(META.ack||[])], cs:META.colSeen||'', nd:META.noDemo ? 1 : 0, cr:META.crown||0, pb:META.pb, pg:META.pg, q:META.q, qd:[...(META.qd||[])], st:META.stir||[], df:META.df||{}, met:META.met||[], wk:META.wk||{}, cm:META.cmb||{}})); } catch(e){} }
/* ---------- Legacy: Glory buys permanent ranks ---------- */
const LEGACY = [
  {k:'might', n:'Might', ic:'⚔', d:r => '+'+5*r+'% troop damage', max:5, base:200},
  {k:'vigor', n:'Vigor', ic:'❤', d:r => '+'+5*r+'% troop health', max:5, base:200},
  {k:'swift', n:'Swiftness', ic:'➶', d:r => '+'+5*r+'% troop speed', max:3, base:300},
  {k:'hero', n:'Heroism', ic:'♛', d:r => '+'+10*r+'% hero health and damage', max:3, base:350},
  {k:'harvest', n:'Harvest', ic:'❀', d:r => '+'+5*r+'% food', max:5, base:200},
  {k:'industry', n:'Industry', ic:'⚒', d:r => '+'+5*r+'% production', max:5, base:250},
  {k:'wisdom', n:'Wisdom', ic:'✦', d:r => '+'+5*r+'% science', max:5, base:250},
  {k:'renown', n:'Renown', ic:'✉', d:r => '+'+10*r+'% influence', max:3, base:300},
  {k:'walls', n:'Walls', ic:'▣', d:r => '+'+10*r+'% city health', max:3, base:250},
  {k:'treasury', n:'Treasury', ic:'◎', d:r => 'Start with +'+40*r+' influence', max:3, base:150},
  {k:'muster', n:'Muster', ic:'⚑', d:r => '+'+4*r+' army room', max:3, base:400},
  {k:'fortune', n:'Fortune', ic:'⟳', d:r => '+'+r+' reroll'+(r===1 ? '' : 's')+' each game', max:3, base:400},
  {k:'exile', n:'Exile', ic:'✖', d:r => '+'+r+' banish'+(r===1 ? '' : 'es')+' each game', max:2, base:400},
  {k:'spoils', n:'Spoils', ic:'◆', d:r => '+'+r+' War Chest choice', max:1, base:1200}
];
const LG = k => (G && (G.demo || G.arena)) ? 0 : (META.lg[k]||0);
const lgTotal = () => Object.values(META.lg).reduce((a,b) => a+b, 0);
const lgCost = k => { const L = LEGACY.find(x => x.k===k), r = META.lg[k]||0, b = r===0 && L.max > 1 ? 100 : L.base*(r+1); return Math.round(b*(1 + .04*lgTotal())/10)*10; };
const lgCan = () => LEGACY.some(L => (META.lg[L.k]||0) < L.max && META.glory >= lgCost(L.k));
const achDone = a => a.test ? a.test() : (p => p[0] >= p[1])(a.prog());
/* ---------- Mastery: every troop line earns experience across all your games ---------- */
const MX_T = [600, 2400, 6000, 12000, 22000];
const mRank = id => { const x = META.mx[id]||0; let r = 0; while(r < MX_T.length && x >= MX_T[r]) r++; return r; };
const mCap = id => 6 + Math.min(2, mRank(id));
const mBonus = id => { const r = mRank(id); return r >= 5 ? 1.15 : r >= 4 ? 1.1 : r >= 3 ? 1.05 : 1; };
const mStars = id => { const r = mRank(id); return '<i class="st on"></i>'.repeat(r)+'<i class="st"></i>'.repeat(5-r); };
const mPerk = r => r <= 2 ? 'troops can reach Lv '+(6+r)+' ('+FORM_ERA[5+r]+' form)'+(r===2 ? ' and its signature attack' : '') : '+'+(5*(r-2))+'% health and damage in every game';
function mxAdd(id, n){
  if(!CARDS[id] || !n || (G && G.demo)) return; const r0 = mRank(id); META.mx[id] = (META.mx[id]||0) + n; lifeDirty = true;
  if(G && !G.arena){ G.mxg = G.mxg || {}; G.mxg[id] = (G.mxg[id]||0) + n; }
  const r1 = mRank(id);
  if(r1 > r0 && G && running && !G.arena){ bigMoment({tier:r1 >= 3 ? 'legend' : 'epic', kick:'★ Mastery '+r1+' ★', title:CARDS[id].n, sub:mPerk(r1), col:'#ffd36a', img:troopImg(id, Math.min(8, mCap(id)))}); toast(CARDS[id].n+' reached mastery '+r1+': '+mPerk(r1)+(r1===2 && SIG[id] ? '. Lv 8 signature: '+SIG[id].n : ''),'good'); SFX.era && SFX.era(); R.armyKey = ''; }
}
function lifeAdd(k, n){ if(G && G.demo) return; META.life[k] = (META.life[k]||0) + (n||1); lifeDirty = true; }
/* ---------- Evolution hunt: recipe fragments from ruins and wonders ---------- */
function giveHint(at){
  const hid = UEVO.filter(e => !e.legend && !META.disc.has(e.id) && (META.hint[e.id]||0) < 2); if(!hid.length) return false;
  hid.sort((a,b) => (META.hint[b.id]||0) - (META.hint[a.id]||0) || Math.random() - .5);
  const e = hid[0], h = META.hint[e.id] = (META.hint[e.id]||0) + 1; lifeDirty = true; saveLife();
  const txt = h >= 2 ? e.n+' = '+evoRecipe(e) : (e.union ? 'A union' : 'An evolution')+' of the '+CARDS[e.from].n+' line, at Lv '+evLv(e);
  if(typeof lootPop === 'function') lootPop({tier:'epic', kick:h >= 2 ? '✦ Full recipe revealed ✦' : 'Recipe fragment', title:h >= 2 ? e.n : 'A Torn Page of Secrets', gain:txt, line:h >= 2 ? 'Bring both to a War Chest to forge it.' : 'One more fragment and the full recipe is yours. Saved in your Collection.', at});
  else { banner('Recipe fragment', txt); toast('Recipe fragment: '+txt,'good'); } return true;
}
/* ---------- Secret troops: their art is still being drawn ---------- */
const SECRETS = [
  {id:'wolves', era:'Ancient', clue:'They come with the pack, and leave nothing behind.'},
  {id:'firemonks', era:'Classical', clue:'Fire that prays. Prayer that burns.'},
  {id:'golems', era:'Medieval', clue:'Stone remembers every siege.'},
  {id:'skylancers', era:'Renaissance', clue:'Some knights never touch the ground.'},
  {id:'shadows', era:'Industrial', clue:'Unseen, unheard, unspent.'},
  {id:'colossus', era:'Modern', clue:'The last machine walks alone.'}
];
try { const v = JSON.parse(localStorage.getItem('eh-disc') || '{}'); (v.d||[]).forEach(x => META.disc.add(x)); (v.s||[]).forEach(x => META.seen.add(x)); (v.l||[]).forEach(x => META.leg.add(x)); (v.a||[]).forEach(x => META.arts.add(x)); } catch(e){}
function saveDisc(){ try { localStorage.setItem('eh-disc', JSON.stringify({d:[...META.disc], s:[...META.seen], l:[...META.leg], a:[...META.arts]})); } catch(e){} }
const known = ev => !!ev && META.disc.has(ev.id);
const evLv = ev => ev.lv || EVO_LV;
const evoUsable = ev => !ev.legend || META.leg.has(ev.id);
function discover(ev, how){
  if(!ev || META.disc.has(ev.id) || (G && G.demo)) return false;
  META.disc.add(ev.id); META.seen.add(ev.id); saveDisc(); if(G && G.stats && !G.arena) G.stats.disc = (G.stats.disc||0) + 1;
  if(G && running){ banner(ev.n, how || 'New evolution discovered'); toast('Discovered: '+ev.n+' = '+evoRecipe(ev)+'. It is now in your Collection for every game','good'); MUS.sting && MUS.sting('evo'); }
  checkAch(); return true;
}
function seeEvo(ev){ if(ev && !META.seen.has(ev.id)){ META.seen.add(ev.id); saveDisc(); } }
try { const v = JSON.parse(localStorage.getItem('eh-unlocks') || '[]'); if(Array.isArray(v)) v.forEach(id => (CARDS[id] || /^(nat|diff):/.test(id)) && META.unl.add(id)); } catch(e){}
if(META.crown == null) META.crown = META.unl.has('diff:2') ? 1 : 0;
const isUnlocked = id => META.unl.has(id);
const DF = () => (!G || G.diff==null) ? DIFFS[1] : G.diff===0 ? DIFFS[0] : ((G._df && G._dfc===(G.crown||0)) ? G._df : (G._dfc = G.crown||0, G._df = crownDF(G.crown||0)));
const CR = n => !!G && G.diff !== 0 && (G.crown||0) >= n;
const CROWNS = [
  {n:'King', d:'The intended challenge. Rivals counter your army'},
  {n:'Rivals Rise', d:'Every rival starts with a second city'},
  {n:'Wild Lands', d:'Barbarian raids are 30% larger'},
  {n:'Iron Will', d:'Rival morale starts higher and their armies are 15% larger'},
  {n:'Cunning Foes', d:'Rivals counter your army twice as hard and add troop lines faster'},
  {n:'Dread Generals', d:'Rival generals have 40% more health, 30% more damage, and return 20 seconds sooner'},
  {n:'Stone Walls', d:'Rival cities have 35% more health and their towers hit 30% harder'},
  {n:'Quick Ages', d:'Rival troops level a step ahead and field evolutions and legendary unions an age sooner'},
  {n:'Narrow Ranks', d:'Your second support slot never opens'},
  {n:'Long Night', d:'Barbarian raids grow 30% larger again and rivals start their starships 3 minutes sooner'},
  {n:'World Against You', d:'The coalition forms when 3 nations fall instead of 4, and rivals trust you less'}
];
const crownMul = c => +(1 + .15*c).toFixed(2);
/* What a win at each Crown earns for good. Crowns 1, 2 and 4 bring a people or troop line (see ACH);
   the rest are regalia you can see in every game. Crowns 1 to 6 also hide a stronghold on the map. */
const REGALIA = [null,
  {n:'Northmen', d:'A new people: the Jarl and his raiders', unl:'nat:northmen'},
  {n:'Grenadiers', d:'A new troop line', unl:'grenadiers'},
  {n:'Golden Crown', d:'A gold crown rides above your general in every game'},
  {n:'Airships', d:'A new troop line', unl:'airships'},
  {n:'Gilded Capital', d:'Your capital flies a gold banner and shines on the map'},
  {n:'Jeweled Crown', d:'Your general’s crown is set with rubies and sapphires'},
  {n:'Royal Host', d:'Your general’s ring and gathering circle burn gold'},
  {n:'Radiant Crown', d:'Your general wears a crown of white gold and starlight'},
  {n:'Imperial Title', d:'Your general is hailed as Imperial in every game'},
  {n:'Crown of the World', d:'Your crown blazes with light, and the main menu names you Ruler of the World'}
];
const REG = n => !!G && !G.demo && (LIFE().topCrown ?? -1) >= n;
const regCrown = () => REG(8) ? 'cr_3' : REG(6) ? 'cr_2' : REG(3) ? 'cr_1' : null;
/* the four ways to win, per people: a first win of each kind with each people pays Glory */
const WIN_KINDS = [['conquest','Conquest','u_charge'], ['diplomacy','Diplomacy','u_peace'], ['science','Science','cv_astronomy'], ['prosperity','Prosperity','u_g_glory']];
const FIRST_KIND_GLORY = 100;
const kindsWon = id => (META.wk && META.wk[id]) || {};
function crownDF(c){ const d = Object.assign({}, DIFFS[1]); if(c >= 2) d.barb *= 1.3; if(c >= 3) d.rival *= 1.08; if(c >= 4){ d.counter = 3; d.extra = .5; } if(c >= 7) d.rival *= 1.08; if(c >= 9) d.barb *= 1.3; return d; }
const natOK = n => n.lock ? META.unl.has('nat:'+n.id) : n.start.every(isUnlocked);
const achName = a => { if(a.id.startsWith('nat:')){ const n = NATIONS_P.find(x => 'nat:'+x.id===a.id); return n.n+(a.pair ? ' + '+CARDS[a.pair].n : ''); } if(a.id.startsWith('diff:')) return 'The Crown ladder'; const np = typeof linePeople === 'function' ? linePeople(a.id) : null; return np ? np.n+' + '+CARDS[a.id].n : CARDS[a.id].n; };
const achFor = id => ACH.find(a => a.id===id) || ACH.find(a => a.pair===id);
const PAIR_OF = {}; ACH.forEach(a => { if(a.pair) PAIR_OF[a.id] = a.pair; });
const linePeople = id => NATIONS_P.find(n => !n.lock && !n.secret && n.start.includes(id) && n.start.every(s => s===id || BASE_UNLOCKED.includes(s)));
function unlockCard(id){
  if(isUnlocked(id)) return; META.unl.add(id); const pr = PAIR_OF[id]; if(pr) META.unl.add(pr);
  try { localStorage.setItem('eh-unlocks', JSON.stringify([...META.unl])); } catch(e){}
  if(!(G && running)) return;
  const people = (n, line, tier) => { bigMoment({tier, kick:tier==='legend' ? '✦ A hidden people joins the world ✦' : '✦ A new people joins you ✦', title:n.n, sub:line ? 'and with them, '+CARDS[line].n+': '+CARDS[line].d : 'Choose them when you found your next empire', col:(PEOPLE[n.id]||{}).col || '#ffd36a', img:hsprPortrait(n.id, 1) || (line ? troopImg(line, 1) : '')});
    toast(n.n+' can now be chosen when you found a new empire'+(line ? '. '+CARDS[line].n+' can be drafted as a support line' : ''),'good'); MUS.sting && MUS.sting(tier==='legend' ? 'crown' : 'quest'); };
  if(id.startsWith('nat:')){ const n = NATIONS_P.find(x => 'nat:'+x.id===id); people(n, pr, 'epic'); }
  else if(id==='diff:2'){ banner('The Crown ladder', 'Now open'); toast('The Crown ladder is open. Pick Crown 1 when you found your next empire','good'); }
  else if(CARDS[id].secret){ const sp = secretPeople(id); if(sp) people(sp, id, 'legend'); else { banner(CARDS[id].n, '✦ A secret troop line awakens'); MUS.sting && MUS.sting('evo'); } R.shake = Math.min(8, (R.shake||0) + 4); }
  else { const np = linePeople(id); if(np) people(np, id, 'epic'); else { bigMoment({tier:'epic', kick:'New troop line unlocked', title:CARDS[id].n, sub:CARDS[id].d, col:'#9fd0ff', img:troopImg(id, 1)}); toast(CARDS[id].n+' unlocked. It can now be offered as a support line in your games','good'); } }
  if(G && !G.arena){ G.newUnl = G.newUnl || []; G.newUnl.push(id); if(pr) G.newUnl.push(pr); }
  SFX.era();
}
function checkAch(){ if(G && G.demo) return; for(const a of ACH) if(!isUnlocked(a.id)){ try { if(achDone(a)) unlockCard(a.id); } catch(e){} } if(lifeDirty) saveLife(); }
const evoRecipe = ev => ev.union ? CARDS[ev.from].n+' Lv '+evLv(ev)+' + '+CARDS[ev.with].n+' Lv '+evLv(ev) : CARDS[ev.from].n+' Lv '+evLv(ev)+' + '+RELICS[ev.relic].n;
const evoOf = id => UEVO.find(e => e.from===id && !e.legend) || UEVO.find(e => e.with===id && !e.legend);
/* a union or evolution can be forged once you know it, or hold its full recipe (two pages) */
const recipeOk = ev => known(ev) || (META.hint[ev.id]||0) >= 2;
const knownEvos = id => UEVO.filter(e => (e.from===id || e.with===id) && recipeOk(e) && evoUsable(e));
const hasHidden = id => UEVO.some(e => (e.from===id || e.with===id) && !e.legend && !recipeOk(e));

const PART_NEED = 16000, LAUNCH_T = 120;
const ALARM = [
  {n:'Calm', d:''},
  {n:'Wary', d:'Two nations have fallen. The rest trust you less and build up their armies'},
  {n:'Alarmed', d:'Half the world is yours. Rivals stop fighting each other, arm faster, and unions need relations of 90'},
  {n:'Coalition', d:'Every nation that is not your ally is at war with you and refuses peace. Allies drift away. Only surrender ends it'}
];
const MUSTER_EVERY = 60, EVO_LV = 6, ARMY_MAX = 90;
const pArmyMax = () => ARMY_MAX + 4*LG('muster');
/* Special attacks: one per tag. Each is unlocked by a tech (rivals get it an era later) */
const ABIL = {
  Swarm:{tech:'laws', n:'Frenzy', cd:10, d:'Every 10s they attack 70% faster for 4s'},
  Line:{tech:'bronze', n:'Brace', cd:9, d:'Every 9s they lock shields and take 60% less damage for 3s'},
  Ranged:{tech:'archery', n:'Volley', cd:7, d:'Every 7s they loose arrows at up to 4 enemies at once'},
  Titan:{tech:'iron', n:'Stomp', cd:7, d:'Every 7s they slam the ground, hitting everything within 1.5 tiles and slowing it'},
  Siege:{tech:'math', n:'Firepots', cd:9, d:'Every 9s a shot sets the ground ablaze and enemies inside burn'},
  Support:{tech:'philo', n:'Miracle', cd:12, d:'Every 12s priests heal everyone nearby by 30% and banners send nearby allies into a frenzy'},
  Mounted:{tech:'chivalry', n:'Trample', cd:8, d:'Every 8s they charge through the enemy line, hitting everything in the path for double damage'},
  Fire:{tech:'metallurgy', n:'Firebomb', cd:8, d:'Every 8s they hurl a firebomb that blasts everything within 1.2 tiles'},
  Holy:{tech:'feudal', n:'Martyrdom', cd:0, d:'When one falls, allies around it heal 25%'}
};
const TECH_ABIL = {}; for(const g in ABIL) TECH_ABIL[ABIL[g].tech] = g;
const CULT = [0, 100, 300, 650, 1200, 2000, 3200, 5000];
const GEN_NAMES = ['Varr','Ostrel','Kaido','Merrin','Thale','Brannoc','Isolde','Ruvan','Castor','Hesk','Odalric','Senna'];
const DIFFS = [
  {n:'Chieftain', d:'Rivals are slower and simpler, and only adapt a little to your army. Smaller raids', rival:.8, barb:.8, counter:.75, extra:0, gen:.8},
  {n:'King', d:'The intended challenge. Rivals counter your army', rival:1, barb:1, counter:1.5, extra:0, gen:1},
  {n:'Emperor', d:'Rivals grow fast, counter hard and level quicker. Bigger raids', rival:1.2, barb:1.2, counter:3, extra:.5, gen:1.3}
];
/* The counter web: a troop hunts with its main (first) tag and deals x1.75 to its prey. Ranged troops also shoot down flyers; Crossbows pierce Titans */
const WEB = {Line:['Mounted','Titan'], Mounted:['Ranged','Siege','Fire'], Ranged:['Line','Swarm'], Titan:['Swarm','Mounted'], Swarm:['Siege','Fire'], Siege:['Titan','Line'], Fire:['Ranged','Support']};
const CMUL = 1.75;
const COUNTERS = (() => { const o = {}; for(const g in WEB) for(const p of WEB[g]) (o[p] = o[p] || []).push(g); return o; })();
const preyOf = C => { const out = (WEB[C.tags[0]]||[]).slice(); if(C.pierce && !out.includes('Titan')) out.push('Titan'); if(C.tags[0]==='Ranged') out.push('Flyers'); return out; };
const huntersOf = C => { const out = []; for(const g of C.tags) for(const h of (COUNTERS[g]||[])) if(!out.includes(h)) out.push(h); if(C.fly && !out.includes('Ranged')) out.push('Ranged'); if(C.tags.includes('Titan')) out.push('Crossbows'); return out; };
const TAGN = {Line:'Line', Mounted:'Mounted', Ranged:'Ranged', Titan:'Titans', Swarm:'Swarm', Siege:'Siege', Fire:'Fire', Support:'Support', Crossbows:'Crossbows', Flyers:'flyers'};
function vsHTML(id){ const C = CARDS[id], p = preyOf(C), h = huntersOf(C); return '<span class="vs">'+(p.length ? '<span class="vg">Strong vs</span> '+p.map(x => TAGN[x]||x).join(', ') : '<span class="vg">Supports</span> no prey')+' · <span class="vr">Weak to</span> '+(h.length ? h.map(x => TAGN[x]||x).join(', ') : 'nothing')+'</span>'; }
const NATIONS_P = [
  {id:'horde', n:'Horde Clans', start:['militia'], perk:'Swarm units cost 30% less upkeep'},
  {id:'legion', n:'Iron Legion', start:['spearmen'], perk:'Line units +20% health'},
  {id:'steppe', n:'Steppe Riders', start:['horse'], perk:'Mounted units +15% speed and +10% damage'},
  {id:'elephant', n:'Elephant Kings', start:['elephant'], perk:'Titans deal 20% more damage'},
  {id:'longbow', n:'Longbow Isles', start:['longbow'], perk:'Ranged units reach 0.5 tiles farther'},
  {id:'temple', n:'Temple City', start:['priests','slingers'], core:'slingers', perk:'Influence +20%. Healers heal 30% more'},
  {id:'khanate', n:'Golden Khanate', start:['knights'], perk:'Mounted squads get +1 troop', lock:1},
  {id:'merchant', n:'Merchant Republic', start:['crossbow'], perk:'Influence +30%. Trade deals pay 50% more', lock:1},
  {id:'star', n:'Star Collegium', start:['catapult'], relics:[['writing',2]], perk:'Science +15%. Starts with Writing level 2', lock:1},
  {id:'bastion', n:'Bastion Kingdom', start:['shieldwall'], relics:[['masonry',1]], perk:'Cities +40% health. Starts with Masonry', lock:1},
  {id:'northmen', n:'Northmen', start:['militia'], perk:'Troops heal 10% of the damage they deal', lock:1},
  {id:'wolves', n:'The Wolf Clans', start:['wolves'], perk:'Troops move 15% faster and Mounted troops deal 10% more damage', secret:1},
  {id:'firemonks', n:'The Ash Monastery', start:['firemonks'], perk:'Fire and Holy troops deal 15% more damage, and every troop slowly heals in battle', secret:1},
  {id:'golems', n:'The Stoneborn', start:['golems'], perk:'Cities have 50% more health and Titans 20% more', secret:1},
  {id:'skylancers', n:'The Order of the Wing', start:['skylancers'], perk:'Mounted troops deal 20% more damage and your general moves 20% faster', secret:1},
  {id:'shadows', n:'The Shadow Court', start:['shadows'], perk:'Your troops deal 40% more damage to generals and Warlords', secret:1},
  {id:'colossus', n:'The Last Machine', start:['colossus'], perk:'Titans have 25% more health and damage', secret:1}
];
