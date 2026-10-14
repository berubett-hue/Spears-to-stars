"use strict";
/* loaders queued by atBoot() start once every script has loaded (see the top of the last file) */
const BOOT_Q = [], atBoot = f => BOOT_Q.push(f);
try{ document.fonts && document.fonts.load && document.fonts.load('14px StarsPix'); }catch(e){}

const $ = s => document.querySelector(s);
const N = 120, WIN_T = 900, PLAYER = 1, TP = 16;
const WATER=0, GRASS=1, PLAINS=2, FOREST=3, HILLS=4, MOUNT=5, DESERT=6;
const YIELD = [[1.5,0,.5],[2,.5,0],[1.5,1,.1],[1,2,0],[.5,2.5,0],[0,1.5,.5],[.5,1,.25]];
const MINI_COL = ['#163a58','#2e4e2e','#4a4f2c','#1f3a24','#4d4f34','#5a5a60','#6a5a38'];
const MOVE = [.55,1,1,.8,.8,.6,.9];
const ERAS = ['Ancient','Classical','Medieval','Renaissance','Industrial','Modern'];
const ERACOL = ['#d6b077','#a9c6dc','#c99d74','#c9a7da','#aab3b8','#8fd3c9'];
const DIRS = ['north','east','south','west'];
const NAMES = ['Aldermere','Brask','Corvel','Dunmoor','Esterhold','Fallowmere','Greywick','Harrowgate','Ilmenhal','Jessamy','Kestrel Ford','Lowmarch','Mirefield','Northwatch','Oakrest','Pellan','Quillon','Ravensford','Stonebrook','Thornbury','Umberlee','Valewood','Westfall','Yarrowby','Ashcombe','Brindle','Caerwyn','Dovecote','Emberly','Foxhollow','Glenmarch','Hollin','Kilmora','Larkspur','Merrow','Nettlebed','Orrin','Pembry','Saltmarsh','Tallow','Wrenfield','Haverly','Coldharbor','Ostwick','Selmere','Brackwater','Lindenhal','Morrowgate','Skelby','Tamsford','Varrow','Wychcombe','Elderglen','Fennick','Grisby','Hallowmere','Ironmoor','Juniper Hill','Kingsreach','Lantern Bay','Millbrook','Netherby','Oldcastle','Pinewatch','Redwater','Silverdale','Thistledown','Upton Vale','Whitecliff','Ambergate','Briarwood','Copperhill','Deepwell','Eastmarch','Fernhollow','Goldhaven','Highmoor','Ivywater','Kettlewick','Lowfield'];
const NATION_NAMES = ['Vessaria','Ondrel','Halvennor','Sarkand','Tirrow','Mabrel','Corvanth','Duskmere','Arvalon','Kethria'];
const LEADERS = ['Queen Ysolde','King Arnulf','Regent Mira','High Priest Oren','Warlord Tavrik','Duchess Elsabet','Chancellor Voss','Khan Temir','Lady Seren','Archon Pell'];
const TRAITS = {
  warlike:{label:'Warlike', econ:.95, base:-15, army:.65, grow:1, raid:.75},
  mercantile:{label:'Mercantile', econ:1.15, base:10, army:.4, grow:1.1, raid:.5},
  scholarly:{label:'Scholarly', econ:1.05, base:20, army:.35, grow:1.2, raid:.45}
};
const RCOL = ['#4fc9b5','#6ea8f7','#c58cf0','#9ad35a','#f07aa8','#d8dce8'];
const STATUS = {war:'War', peace:'Peace', trade:'Trade', ally:'Ally', gone:'Fallen', joined:'Yours'};
const STATUS_LONG = {war:'At war', peace:'At peace', trade:'Trading', ally:'Allied', gone:'Fallen', joined:'Joined you'};
const PROJ_NEED = 40000;

const TECHS = [
  {id:'agri',n:'Agriculture',era:0,req:[],d:'Food +30%',e:{food:.3}},
  {id:'pottery',n:'Pottery',era:0,req:[],d:'Settlers cost 20% less',e:{settler:-.2}},
  {id:'mining',n:'Mining',era:0,req:[],d:'Hills and mountains give +1 production',e:{mining:1}},
  {id:'archery',n:'Archery',era:0,req:[],line:['archer',1],d:'Every city gets an archer tower',e:{tower:1}},
  {id:'horse',n:'Horseback Riding',era:0,req:[],line:['rider',1],d:'Riders move 30% faster',e:{riderSpd:.3}},
  {id:'bronze',n:'Bronze Working',era:0,req:['mining'],line:['guard',1],d:'Soldiers deal 15% more damage',e:{solDmg:.15}},
  {id:'masonry',n:'Masonry',era:0,req:['mining'],d:'City walls: cities +60% health',e:{cityhp:.6}},
  {id:'sailing',n:'Sailing',era:0,req:['pottery'],d:'Coastal waters give +1 food and +1 science',e:{coastal:1}},
  {id:'shields',n:'Shield Wall',era:0,req:['bronze'],obs:['guard',3],d:'Guards +60% health',e:{guardHp:.6}},
  {id:'writing',n:'Writing',era:0,req:['agri','pottery'],adv:1,d:'Science +35%',e:{sci:.35}},
  {id:'math',n:'Mathematics',era:1,req:['writing'],line:['siege',1],d:'Towers deal 30% more damage',e:{towerDmg:.3}},
  {id:'currency',n:'Currency',era:1,req:['writing'],d:'All yields +12%. Influence +30%',e:{all:.12,infl:.3}},
  {id:'philo',n:'Philosophy',era:1,req:['writing'],d:'Science +25%. See one extra tech in every draft',e:{sci:.25,choices:1}},
  {id:'laws',n:'Code of Laws',era:1,req:['writing'],d:'Cities can grow 3 citizens larger. Influence +50%',e:{popCap:3,infl:.5}},
  {id:'iron',n:'Iron Working',era:1,req:['bronze'],d:'Soldiers +40% health and +15% damage',e:{solHp:.4,solDmg:.15}},
  {id:'compbow',n:'Composite Bows',era:1,req:['archery'],obs:['archer',3],d:'Archers +40% damage and reach 0.5 tiles farther',e:{archerDmg:.4,archerRng:.5}},
  {id:'construction',n:'Construction',era:1,req:['masonry'],d:'Cities +50% health and repair twice as fast',e:{cityhp:.5,regen:1}},
  {id:'engineering',n:'Engineering',era:1,req:['math','construction'],d:'Borders grow 40% faster. Soldiers +20% speed',e:{border:.4,solSpd:.2}},
  {id:'feudal',n:'Feudalism',era:1,req:['laws'],adv:2,line:['guard',2],d:'Army upkeep 15% cheaper',e:{upkeep:-.15}},
  {id:'chivalry',n:'Chivalry',era:2,req:['horse','feudal'],line:['rider',2],d:'Riders +20% damage',e:{riderDmg:.2}},
  {id:'crossbow',n:'Crossbows',era:2,req:['archery','math'],line:['archer',2],d:'Towers fire 50% faster',e:{towerRate:.5}},
  {id:'siegecraft',n:'Siegecraft',era:2,req:['math','engineering'],line:['siege',2],d:'Siege engines deal 40% more damage to walls',e:{siegeWall:.4}},
  {id:'castles',n:'Castles',era:2,req:['construction','feudal'],d:'Cities +80% health. Towers reach 0.8 tiles farther',e:{cityhp:.8,towerRange:.8}},
  {id:'stirrups',n:'Stirrups',era:2,req:['horse'],obs:['rider',4],d:'Riders +40% damage and +30% speed',e:{riderDmg:.4,riderSpd:.3}},
  {id:'longbows',n:'Longbows',era:2,req:['compbow'],obs:['archer',4],d:'Archers reach 1 tile farther',e:{archerRng:1}},
  {id:'guilds',n:'Guilds',era:2,req:['currency'],d:'Production +40%',e:{prod:.4}},
  {id:'astro',n:'Astronomy',era:2,req:['philo'],d:'Science +40%',e:{sci:.4}},
  {id:'press',n:'Printing Press',era:2,req:['guilds'],adv:3,d:'Science +50%. Influence +30%',e:{sci:.5,infl:.3}},
  {id:'gunpowder',n:'Gunpowder',era:3,req:['crossbow','press'],line:['archer',3],d:'Soldiers deal 30% more damage',e:{solDmg:.3}},
  {id:'pikes',n:'Pike and Shot',era:3,req:['feudal','gunpowder'],line:['guard',3],d:'Guards +30% health',e:{guardHp:.3}},
  {id:'cavtac',n:'Cavalry Tactics',era:3,req:['chivalry','gunpowder'],line:['rider',3],d:'Riders +20% damage',e:{riderDmg:.2}},
  {id:'metallurgy',n:'Metallurgy',era:3,req:['siegecraft','gunpowder'],line:['siege',3],d:'Siege engines deal 30% more damage to walls',e:{siegeWall:.3}},
  {id:'nav',n:'Navigation',era:3,req:['astro','sailing'],d:'+1 city limit. Settle 3 tiles farther. Borders +30%',e:{settleDist:3,border:.3,cities:1}},
  {id:'banking',n:'Banking',era:3,req:['guilds'],d:'All yields +18%. Trade deals pay 50% more',e:{all:.18,tradeBoost:.5}},
  {id:'medicine',n:'Medicine',era:3,req:['press'],d:'Cities grow 4 citizens larger and heal twice as fast',e:{popCap:4,regen:1}},
  {id:'sappers',n:'Siege Engineers',era:3,req:['siegecraft'],obs:['siege',5],d:'Siege engines +60% health and +40% speed',e:{siegeHp:.6,siegeSpd:.4}},
  {id:'industry',n:'Industrialization',era:3,req:['banking'],adv:4,d:'Production +80%',e:{prod:.8}},
  {id:'conscription',n:'Conscription',era:4,req:['pikes','industry'],line:['guard',4],d:'Army upkeep 15% cheaper',e:{upkeep:-.15}},
  {id:'rifling',n:'Rifling',era:4,req:['gunpowder','industry'],line:['archer',4],d:'Archers +30% damage',e:{archerDmg:.3}},
  {id:'carbines',n:'Cavalry Carbines',era:4,req:['cavtac','rifling'],line:['rider',4],d:'Riders +20% speed',e:{riderSpd:.2}},
  {id:'artillery',n:'Artillery',era:4,req:['metallurgy','industry'],line:['siege',4],d:'Towers deal double damage and shots splash',e:{towerDmg:1,splash:1}},
  {id:'rail',n:'Railroad',era:4,req:['industry'],d:'Soldiers +40% speed. Borders +50%',e:{solSpd:.4,border:.5}},
  {id:'marksmen',n:'Marksmanship',era:4,req:['rifling'],d:'Archers +60% damage',e:{archerDmg:.6}},
  {id:'electric',n:'Electricity',era:4,req:['industry'],adv:5,d:'All yields +30%',e:{all:.3}},
  {id:'mg',n:'Machine Guns',era:5,req:['conscription','electric'],line:['guard',5],d:'Towers fire twice as fast',e:{towerRate:1}},
  {id:'combustion',n:'Combustion',era:5,req:['carbines','electric'],line:['rider',5],d:'Riders +30% speed',e:{riderSpd:.3}},
  {id:'snipers',n:'Sniper Doctrine',era:5,req:['marksmen','electric'],line:['archer',5],d:'Archers reach 1 tile farther',e:{archerRng:1}},
  {id:'armor',n:'Armored Warfare',era:5,req:['artillery','combustion'],line:['siege',5],d:'Siege engines deal double wall damage',e:{siegeWall:1}},
  {id:'radar',n:'Radar',era:5,req:['electric'],d:'Towers reach 1.5 tiles farther',e:{towerRange:1.5}},
  {id:'trenches',n:'Trench Warfare',era:5,req:['conscription'],d:'Guards +80% health',e:{guardHp:.8}},
  {id:'rocketry',n:'Rocketry',era:5,req:['electric','metallurgy'],d:'Towers deal 40% more damage. Siege engines deal 40% more damage to walls',e:{towerDmg:.4,siegeWall:.4}},
  {id:'computers',n:'Computers',era:5,req:['radar'],d:'Science +40%',e:{sci:.4}},
  {id:'satellites',n:'Satellites',era:5,req:['rocketry','computers'],d:'All yields +15%. Towers reach 1 tile farther',e:{all:.15,towerRange:1}},
  {id:'space',n:'Space Program',era:5,req:['satellites'],proj:1,d:'Three of your cities build starship parts. Every nation that isn’t your ally declares war. Hold the launch to win',e:{}}
];
const EVOS = [
  {id:'chariots',n:'War Chariots',req:['bronze','horse'],d:'Riders +50% speed and +40% damage',e:{riderSpd:.5,riderDmg:.4}},
  {id:'library',n:'Great Library',req:['writing','philo'],d:'Wonder. Science +100%',e:{sci:1}},
  {id:'greatwall',n:'Great Wall',req:['masonry','construction'],d:'Wonder. Enemies crawl 45% slower inside your borders. Cities +60% health',e:{barbSlow:1,cityhp:.6}},
  {id:'ballista',n:'Ballista Towers',req:['math','crossbow'],d:'Tower shots splash and deal 50% more damage',e:{splash:1,towerDmg:.5}},
  {id:'explore',n:'Age of Exploration',req:['astro','nav'],d:'+2 city limit. Settle 5 tiles farther. Borders +100%. One more tech per draft',e:{settleDist:5,border:1,choices:1,cities:2}},
  {id:'fortress',n:'Fortress Cities',req:['archery','castles'],d:'Every tower fires twin shots',e:{twin:1}},
  {id:'factories',n:'Factories',req:['guilds','industry'],d:'Production +150%',e:{prod:1.5}},
  {id:'blitz',n:'Blitzkrieg',req:['rail','combustion'],d:'Riders and siege +50% damage. Army upkeep 10% cheaper',e:{riderDmg:.5,siegeDmg:.5,upkeep:-.1}},
  {id:'embassy',n:'Grand Embassy',req:['currency','laws'],d:'Wonder. Influence +100%. Every nation’s relations drift 15 higher',e:{infl:1,charm:15}},
  {id:'longbowcorps',n:'Longbow Corps',req:['compbow','longbows'],d:'Archers loose two arrows at once',e:{archerTwin:1}},
  {id:'tercio',n:'Tercio',req:['shields','pikes'],d:'Guards deal double damage and heal while they fight',e:{guardDmg:1,guardRegen:1}}
];
EVOS.forEach(e => e.evo = 1);
const BOONS = [
  {id:'b_food',n:'Harvest Festival',boon:1,d:'Food +10%',e:{food:.1}},
  {id:'b_prod',n:'Workshops',boon:1,d:'Production +10%',e:{prod:.1}},
  {id:'b_sci',n:'Scribes',boon:1,d:'Science +10%',e:{sci:.1}},
  {id:'b_barracks',n:'Barracks',boon:1,d:'Army upkeep 10% cheaper',e:{upkeep:-.1}},
  {id:'b_walls',n:'Bulwarks',boon:1,d:'Cities +15% health',e:{cityhp:.15}},
  {id:'b_envoys',n:'Envoys',boon:1,d:'Influence +25%',e:{infl:.25}}
];
const ERA_COST = [55, 450, 1800, 6400, 18500, 40000], KEY_NEED = 2;
const BYID = {}; [...TECHS,...EVOS,...BOONS].forEach(t => BYID[t.id] = t);
const EVO_PARTS = new Set(EVOS.flatMap(e => e.req));
const DOCT = {
  expand:{settler:.55,army:.45,repair:0,border:1.8},
  build:{settler:.3,army:.45,repair:.25,border:1,food:1.2,sci:1.2},
  defend:{settler:0,army:.75,repair:.25,border:.4}
};
const DECREES = {mobilize:150, golden:180, fortify:120}, DCOST = {mobilize:60, golden:80, fortify:40};
const COST = {gift:40, trade:25, ally:60, peace:50};
const unionRel = () => (G.alarm||0) >= 2 ? 90 : 80;
const unionCost = () => 200 + 100*G.rivals.filter(r => r.status==='joined').length;
const ROLES = ['guard','rider','archer','siege','support','titan'];
/* Behavior classes. Unit cards (below) decide stats, tags and looks */
const ROLE = {guard:{home:4.5,orbit:1}, rider:{home:9,orbit:2.2}, archer:{home:6,orbit:1.5}, siege:{home:2.5,orbit:.7}, support:{home:5,orbit:1.2}, titan:{home:8,orbit:1.8}};
/* Troop lines. Each line is one troop that modernizes as it levels: Lv 1 is its Ancient form, Lv 8 its Future form.
   Form sprites: 'i:head/armor/weapon/extra' infantry, 'r:mount/head/armor/weapon' riders, 'x:key' hand-drawn */
const FORM_ERA = ['Ancient','Classical','Medieval','Renaissance','Industrial','Modern','Information Age','Future'];
const CARDS = {
  militia:{n:'Warband', era:0, role:'guard', tags:['Swarm'], hp:30, dmg:4.5, spd:1.3, rng:.55, cd:.8, size:.78, sq:4, grow:.6, up:0.36, cost:2.0, lifesteal:.08, d:'Cheap fighters that come in crowds and heal a little as they fight',
    forms:[{n:'Warband', s:'i:fur/hide/club'}, {n:'Legionaries', s:'i:crest/cloth/sword/tower'}, {n:'Men-at-Arms', s:'i:kettle/mail/sword/round'}, {n:'Halberdiers', s:'i:morion/plate/halberd'}, {n:'Bayonet Infantry', s:'i:shako/coat/bayonet'}, {n:'Assault Troops', s:'i:helmet/fatigue/smg', sh:'bullet'}, {n:'Shock Marines', s:'i:tac/tactical/carbine', sh:'bullet'}, {n:'Power Armor', s:'i:visor/armor/laser', sh:'laser', sz:.9}]},
  spearmen:{n:'Spear Line', era:0, role:'guard', tags:['Line'], hp:70, dmg:6.5, spd:1, rng:.65, cd:.9, size:1, sq:2, grow:.3, up:2.17, cost:11.85, d:'Hold the line against charges and giants',
    forms:[{n:'Spearmen', s:'i:hair/tunic/spear/round'}, {n:'Phalanx', s:'i:hoplite/cloth/pike/round'}, {n:'Pikemen', s:'i:kettle/mail/pike'}, {n:'Pike & Shot', s:'i:morion/coat/pike'}, {n:'Line Infantry', s:'i:shako/coat/bayonet'}, {n:'Machine Gunners', s:'i:brodie/fatigue/mg', sh:'bullet'}, {n:'Anti-Tank Squad', s:'i:helmet/fatigue/bazooka', sh:'rocket'}, {n:'Shield Mechs', s:'i:visor/armor/rail/eshield', sh:'laser'}]},
  shieldwall:{n:'Shield Wall', era:0, role:'guard', tags:['Line'], hp:135, dmg:3, spd:.85, rng:.6, cd:1, size:1.05, sq:2, grow:.3, up:1.69, cost:8.44, d:'Very tough. Ranged allies beside them take half damage',
    forms:[{n:'Shield Wall', s:'i:hair/tunic/spear/bigshield'}, {n:'Testudo', s:'i:crest/cloth/sword/tower'}, {n:'Pavise Guard', s:'i:kettle/mail/sword/pavise'}, {n:'Mantlet Gunners', s:'i:morion/coat/arquebus/mantlet', sh:'musket'}, {n:'Sappers', s:'i:kepi/uniform/rifle/sandbag', sh:'musket'}, {n:'Trench Guards', s:'i:brodie/fatigue/rifle/sandbag', sh:'bullet'}, {n:'Riot Troops', s:'i:riot/tactical/pistol/riotshield', sh:'bullet'}, {n:'Energy Shield Corps', s:'i:visor/armor/laser/eshield', sh:'laser'}]},
  slingers:{n:'Skirmishers', era:0, role:'archer', tags:['Ranged','Swarm'], hp:12, dmg:3.2, spd:1.25, rng:1.9, cd:1, size:.78, sq:3, grow:.5, up:0.72, cost:4.34, d:'A cloud of cheap ranged troops',
    forms:[{n:'Slingers', s:'i:hair/tunic/sling', sh:'rock'}, {n:'Javelineers', s:'i:band/tunic/javelin', sh:'javelin'}, {n:'Shortbowmen', s:'i:cap/cloth/bow', sh:'arrow'}, {n:'Arquebusiers', s:'i:morion/coat/arquebus', sh:'musket'}, {n:'Conscripts', s:'i:kepi/uniform/rifle', sh:'musket'}, {n:'Rifle Squads', s:'i:brodie/fatigue/rifle', sh:'bullet'}, {n:'Drone Swarm', s:'x:drone', sh:'bullet', fly:1, sz:.85}, {n:'Micro-Drone Cloud', s:'x:microdrones', sh:'laser', fly:1, sz:.95}]},
  longbow:{n:'Archers', era:0, role:'archer', tags:['Ranged'], hp:20, dmg:7.5, spd:1.1, rng:3, cd:1.2, size:1, sq:2, grow:.3, up:1.91, cost:10.52, d:'Long range, heavy shots',
    forms:[{n:'Archers', s:'i:hair/tunic/bow', sh:'arrow'}, {n:'Composite Bowmen', s:'i:cap/cloth/bow', sh:'arrow'}, {n:'Longbowmen', s:'i:hood/cloth/longbow', sh:'arrow'}, {n:'Musketeers', s:'i:wide/coat/musket', sh:'musket'}, {n:'Riflemen', s:'i:shako/uniform/rifle', sh:'musket'}, {n:'Snipers', s:'i:helmet/fatigue/sniper', sh:'bullet'}, {n:'Laser Riflemen', s:'i:tac/tactical/laser', sh:'laser'}, {n:'Railgunners', s:'i:visor/armor/rail', sh:'rail'}]},
  crossbow:{n:'Crossbows', era:0, role:'archer', tags:['Ranged'], hp:24, dmg:9.5, spd:1, rng:2.6, cd:1.5, size:1, sq:2, grow:.3, up:2.25, cost:12.17, pierce:1, d:'Armor-piercing shots that punch through titans',
    forms:[{n:'Crossbowmen', s:'i:hair/cloth/crossbow', sh:'bolt'}, {n:'Scorpion Crews', s:'i:crest/cloth/scorpion', sh:'bolt'}, {n:'Arbalesters', s:'i:kettle/mail/crossbow', sh:'bolt'}, {n:'Swivel Gunners', s:'i:morion/coat/swivel', sh:'musket'}, {n:'Anti-Tank Rifles', s:'i:brodie/uniform/atrifle', sh:'bullet'}, {n:'Bazooka Teams', s:'i:helmet/fatigue/bazooka', sh:'rocket'}, {n:'Missile Teams', s:'i:tac/tactical/missile', sh:'rocket'}, {n:'Plasma Lancers', s:'i:visor/armor/plasmalance', sh:'plasma'}]},
  grenadiers:{n:'Bombers', era:0, role:'archer', tags:['Fire'], hp:30, dmg:8, spd:1.05, rng:2, cd:1.8, wall:1.1, size:1, sq:2, grow:.3, up:2.81, cost:14.97, splash:.9, smul:.7, d:'Thrown fire and explosives that blast whole squads',
    forms:[{n:'Fire-Pot Throwers', s:'i:hair/hide/firepot', sh:'fire'}, {n:'Greek Fire', s:'i:crest/cloth/siphon', sh:'fire'}, {n:'Fire Lancers', s:'i:cap/cloth/firelance', sh:'fire'}, {n:'Grenadiers', s:'i:mitre/coat/grenade', sh:'bomb'}, {n:'Mortar Teams', s:'i:kepi/uniform/mortar', sh:'bomb'}, {n:'Flamethrowers', s:'i:brodie/fatigue/flamer', sh:'fire'}, {n:'Rocket Infantry', s:'i:tac/tactical/missile', sh:'rocket'}, {n:'Plasma Grenadiers', s:'i:visor/armor/plasmagren', sh:'plasma'}]},
  horse:{n:'Light Horse', era:0, role:'rider', tags:['Mounted'], hp:30, dmg:7, spd:2.2, rng:.6, cd:.7, size:1, sq:2, grow:.3, up:2.37, cost:11.84, d:'Fast hunters that run raiders down',
    forms:[{n:'Horse Raiders', s:'r:horse/hair/tunic/spear'}, {n:'Horse Archers', s:'r:horse/cap/cloth/bow', sh:'arrow'}, {n:'Light Horse', s:'r:horse/kettle/mail/saber'}, {n:'Dragoons', s:'r:horse/tricorn/coat/musket', sh:'musket'}, {n:'Cavalry', s:'r:horse/kepi/uniform/saber'}, {n:'Armored Cars', s:'x:armoredcar', sh:'bullet', sz:1.15}, {n:'Gunship Helicopters', s:'x:gunship', sh:'bullet', fly:1, sz:1.3}, {n:'Hover Riders', s:'x:hoverbike', sh:'laser', sz:1.1}]},
  knights:{n:'Heavy Horse', era:0, role:'rider', tags:['Mounted','Holy'], hp:56, dmg:7, spd:2.1, rng:.6, cd:.8, size:1.1, sq:1, grow:.22, up:3.9, cost:21, d:'Armored shock cavalry with a crushing charge',
    forms:[{n:'Chariots', s:'x:chariot', sz:1.15}, {n:'Cataphracts', s:'r:barded/conical/mail/lance'}, {n:'Knights', s:'r:barded/great/plate/lance'}, {n:'Cuirassiers', s:'r:warhorse/morion/plate/saber'}, {n:'Lancers', s:'r:warhorse/shako/uniform/lance'}, {n:'Mechanized Infantry', s:'x:ifv', sh:'bullet', sz:1.3}, {n:'Assault Hovercraft', s:'x:hovercraft', sh:'rocket', sz:1.35}, {n:'Mech Cavalry', s:'x:mechcav', sh:'laser', sz:1.4}]},
  elephant:{n:'Titans', era:0, role:'titan', tags:['Titan'], hp:300, dmg:21, spd:.9, rng:.85, cd:1.3, size:1.9, sq:1, grow:.12, up:18.4, cost:75.31, splash:.9, smul:.35, d:'Huge. Tramples everything around its target',
    forms:[{n:'War Elephants', s:'x:elephant'}, {n:'Armored Elephants', s:'x:armorelephant'}, {n:'Battle Wagons', s:'x:wagon', sh:'bolt', sz:1.8}, {n:'War Wagons', s:'x:warwagon', sh:'musket', sz:1.8}, {n:'Landships', s:'x:landship', sh:'bullet', sz:1.8}, {n:'Tanks', s:'x:tank', sh:'shell', sz:1.7}, {n:'Main Battle Tanks', s:'x:mbt', sh:'shell', sz:1.85}, {n:'Walker Mechs', s:'x:walker', sh:'laser', sz:2}]},
  catapult:{n:'Siege', era:0, role:'siege', tags:['Siege'], hp:40, dmg:9, spd:.7, rng:3.5, cd:2.4, size:1.15, sq:1, grow:.15, up:3.55, cost:17.79, splash:.9, smul:.6, wall:4, d:'Long-range splash that breaks walls and crowds',
    forms:[{n:'Catapults', s:'x:catapult', sh:'rock'}, {n:'Ballistae', s:'x:ballista', sh:'bolt'}, {n:'Trebuchets', s:'x:trebuchet', sh:'rock', sz:1.3}, {n:'Bombards', s:'x:bombard', sh:'shell'}, {n:'Cannons', s:'x:cannon', sh:'shell'}, {n:'Field Artillery', s:'x:artillery', sh:'shell', sz:1.25}, {n:'Rocket Artillery', s:'x:rocketarty', sh:'rocket', sz:1.3}, {n:'Railgun Batteries', s:'x:railgun', sh:'rail', sz:1.35}]},
  airships:{n:'Sky', era:0, role:'siege', tags:['Siege','Fire'], hp:55, dmg:8, spd:1.1, rng:2.4, cd:2.2, size:1.25, sq:1, grow:.12, up:5, cost:22, splash:.8, smul:.6, wall:3.5, fly:1, d:'Flyers that drift over walls, water and mountains and bomb from above',
    forms:[{n:'War Kites', s:'x:kite', sh:'fire'}, {n:'Fire Balloons', s:'x:fireballoon', sh:'fire'}, {n:'Sky Lanterns', s:'x:lantern', sh:'fire', sz:1.05}, {n:'Montgolfiers', s:'x:montgolfier', sh:'bomb', sz:1.4}, {n:'Airships', s:'x:airship', sh:'bomb', sz:1.8}, {n:'Biplanes', s:'x:biplane', sh:'bullet', sz:1.3}, {n:'Bombers', s:'x:bomber', sh:'bomb', sz:1.6}, {n:'Stealth Drones', s:'x:stealth', sh:'laser', sz:1.5}]},
  priests:{n:'Healers', era:0, role:'support', tags:['Support','Holy'], hp:26, dmg:0, heal:8, spd:1, rng:.6, cd:1, size:.95, sq:1, grow:.15, up:1.3, cost:12, auraR:2.4, d:'Heal every friendly unit around them',
    forms:[{n:'Shamans', s:'i:headdress/hide/staff'}, {n:'Priests', s:'x:priest'}, {n:'Monks', s:'i:hood/robe/staff'}, {n:'Field Surgeons', s:'i:tophat/apron/knife'}, {n:'Medics', s:'i:crosscap/medic/bag'}, {n:'Combat Medics', s:'i:helmcross/fatigue/bag'}, {n:'Med Drones', s:'x:meddrone', fly:1, sz:.9}, {n:'Nanite Swarm', s:'x:nanites', fly:1}]},
  banner:{n:'Command', era:0, role:'support', tags:['Support'], hp:34, dmg:0, spd:1.1, rng:.6, cd:1, size:1, sq:1, grow:.15, up:1.3, cost:12, auraR:2.6, aura:1, d:'Allies around them deal 40% more damage',
    forms:[{n:'War Drummers', s:'i:fur/hide/drum'}, {n:'Standard Bearers', s:'x:banner'}, {n:'Banner Knights', s:'i:great/plate/flag'}, {n:'Fife & Drum', s:'i:shako/coat/drum'}, {n:'Officers', s:'i:bicorne/coat/saber'}, {n:'Radio Operators', s:'i:helmet/fatigue/radio'}, {n:'Field Commanders', s:'i:beret/fatigue/binocs'}, {n:'Command AI', s:'x:commandai', fly:1}]}
};
