"use strict";
/* ---------- Pixel art ---------- */
const mkCanvas = (w,h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const PAL = {g:'#8e8e96', G:'#5c5c64', k:'#120c08', s:'#e2b68c', m:'#c4ccd4', M:'#6c7680', w:'#94602e', W:'#5a3a1c', h:'#7e4c28', H:'#4c2c16', y:'#ffd36a', b:'#c8382a', B:'#6e1a14', f:'#7a5a3c', o:'#ece0c4', e:'#ffe14a'};
const US = {
  guard:[
    ["........m.","...kkk..m.","...sss..w.","...sss..w.",".WWCCCC.w.","WWmWCCCsw.",".WWCCCC.w.","...CcC..w.","...c.c..w.","..kk.kk..."],
    ["........m.","...mmm..m.","...mMm..m.","...sss..w.",".CCmmmm.w.","CLCMmmmsw.","CCCmmmm.w.",".C.MmM..w.","...M.M..w.","..kk.kk..."],
    ["..........","...MMM....","..MMMMM...","...sss....","..cCCCc...",".cCCCCckkk","..cCCCc...","...cCc....","...c.c....","..kk.kk..."]
  ],
  rider:[
    ["...kk.....","...ss.....","..CCC.....","..CCCs.hh.",".hhChhhhhH","hhhhhhhh..","Hhhhhhh...",".H.h.H.h..",".H.h.H.h..",".........."],
    ["...mm....m","...mM...m.","..CCC..m..","..CmCsm.hh",".CCCCCChhH","CCcCCCCh..","HhhhhhH...",".H.h.H.h..",".H.h.H.h..",".........."],
    ["..........","....MM....","...MMMMkkk",".CCCCCCC..","CCLLCCCCC.","CCCCCCCCCm","cccccccccc",".kk....kk.",".kMk..kMk.","..k....k.."]
  ],
  archer:[
    ["..........","...kkk.w..","...sss..w.","...sss..w.","..CCCCs.w.",".sCCCC..w.","..CCCC.w..","...CcC....","...c.c....","..kk.kk..."],
    ["..kkkkk...","...kkk....","...sss....","..CCCC....",".CCCCCwwwM",".sCLCC....","..CCCC....","...CcC....","...c.c....","..kk.kk..."],
    ["..........","...ccc....","..ccccc...","...sss....","..CCCCkkkk",".CCCCCs.k.","..CCCC....","...CcC....","...c.c....","..kk.kk..."]
  ],
  siege:[
    ["........w.",".......ww.","......w...",".....w....","....w.....",".WWWwWWWW.",".W.CCC..W.","WWWWWWWWWW",".kk....kk.",".kk....kk."],
    ["..........","..........","......MMMk","....MMMMMk","..MMMMMM..",".MMMMCC...",".CCwwww...","..wkkkw...","..kWWWk...","...kkk...."],
    ["..........","....CCC...","...CCCCMMM","..cCCCCc..",".CCCCCCCC.","CLLCCCCCCC","cccccccccc","kMkMkMkMkk",".kkkkkkkk.",".........."]
  ]
};
const BS = {
  raider:["...BB.....","...bs.....","..bbb.....","..bbbs.ff.",".ffbffffff","ffffffff..","fffffff...",".f.f.f.f..",".f.f.f.f..",".........."],
  warband:["......mm..","...BB.mmm.","...ss..w..","..bbbbsw..",".bbbbbb.w.",".sbbbb..w.","..fbbf....","..ff.ff...","..f...f...",".kk...kk.."],
  brute:["....oo..oo..","....BBBBB...","...BesseB...","...bssssb...",".bbbbbbbbbb.","bbbbBbbBbbbb","sbbbbbbbbbbs","s.bbbbbbbb.s","w..ffffff..w","w..ff..ff..w","...ff..ff...","..kkk..kkk.."],
  ram:["............","..BBBBBBBB..",".B.B.B.B.B..","oWWWWWWWWWWW","ooWWWWWWWWWW",".bb.bb.bb...",".kk.kk.kk...","............"],
  warlord:[".o............o.",".oo..........oo.","..oBBBBBBBBBBo..","...BBsssssBB....","...BseessseeB...","...BsssBBsssB...","..bbbbbbbbbbbb..",".bbbBbbbbbbBbbb.","sbbbbbbmmbbbbbbs","sbbbbbbmmbbbbbbs","s.bbbbbbbbbbbb.s","m..ffffffffff..m","m..ffff..ffff..m","m..ff......ff..m","...ff......ff...","..kkk......kkk.."]
};
const XS = {
  airship:["....CCCCCCCC....","..CCLLLLLLLLCC..",".CLLLLLLLLLLLLC.","CCLLLLLLLLLLLLCk",".CCCCCCCCCCCCCk.","...k..k..k..k...","....WWWWWWW.....","....WmmWmmW.....",".....WWWWW......"],
  chariot:["....kk........","...kssk.......","...CCCC..ff...","..WCLLCW.fff..","..WWWWWW.fffff","...k..k.ffffff","..kMk.kffff.ff","..kMk..f.f..f.","...k...f.f..f."],
  elephant:["....CCCC......","...CLLLLC.....","...CCCCCC.....",".gggggggggg...","gggggggggggg..","ggggggggggggg.","gggggggggggGgg","gggggggggggGgo","Ggggggggggg.go",".gg.gg.gg.g..g",".gg.gg.gg.g...",".GG.GG.GG.G..."],
  priest:["....kk....","...ksk....","...sss..o.","..LLLLL.o.",".LLLCLLLo.","..LLCLL.o.","..LLLLL.o.","..LLLLL...",".LLLLLLL..",".kk...kk.."],
  banner:[".CCCCC....",".CLLLC....",".CCCCC....",".w........",".w.kkk....",".w.sss....",".wcCCCc...",".wsCCCC...",".w.CCCC...",".w.CcC....","...c.c....","..kk.kk..."],
  wagon:["......MMk.....","..WWWWWWWWWW..","..WCCCCCCCCW..",".WWWWWWWWWWWW.",".W.k..k..k.WMk","WWWWWWWWWWWWWW","wwwwwwwwwwwwww",".kk..kk..kk...","kMMk.kMk.kMMk.",".kk..kk..kk..."]
};
const BSCALE = {raider:1, warband:1, brute:1.05, ram:1.05, warlord:1.35};
/* ---------- Form art: soldiers are built from parts (head, armor, weapon, shield) so every form looks its age ---------- */
Object.assign(PAL, {O:'#5f6b3a', P:'#414a28', A:'#3c424e', a:'#6a7384', V:'#6ef0ff', R:'#e03a2a', N:'#2a3550', z:'#9fd8f0', n:'#24272e', r:'#8a4a2a', p:'#f0e0b0', F:'#ff8a2a'});
const XS2 = {
  armoredcar:["....MMM.......","...MMMMMkkkk..","..CCCCCCCCC...",".CzzCCCCCCCC..","CCCCCCCCCCCCC.","ccccccccccccc.",".kkk.....kkk..",".kMk.....kMk.."],
  gunship:["..kkkkkkkkkkkkk.","........kk......",".......CCCCCC...","kCCCCCCCCCCzzC..","...cCCCCCCCCCzC.",".......cccccc...","......k.MMk.k...",".....kkkkkkkk..."],
  hoverbike:[".....kk......","....AAA......","...AAAz......","..AAACAAAAA..",".CCCCCCCCCCVV","..cccccccc...",".VVV....VVV.."],
  ifv:["......MMkkkkk..",".....MMMM......","..CCCCCCCCCCC..",".CCCCCCCCCCCCC.","CLLCCCCCCCCCCCC","ccccccccccccccc","kMkMkMkMkMkMkMk",".kkkkkkkkkkkkk."],
  hovercraft:["...MM.MM.......","..MMMMMMM......","..CCCCCCCCCC...",".CCCzzCCCCCCCC.","CCCCCCCCCCCCCCC","kkkkkkkkkkkkkkk",".kkkkkkkkkkkkk.","..ooo..ooo..oo."],
  mechcav:["........AAA...",".......AzzA...","..AAAAAAAAA...",".ACCCCCCCCAMMM",".ACCLLCCCCA...","..AAAAAAAAA...","..a.a...a.a...",".a..a...a..a..",".a..a...a..a..","kk.kk..kk.kk.."],
  warwagon:["..MMMMMMMk....","..WWWWWWWWWW..","..WCCCCCCCCW..",".WWWWWWWWWWWW.",".W.k..k..k.WMk","WWWWWWWWWWWWWW","wwwwwwwwwwwwww",".kk..kk..kk...","kMMk.kMk.kMMk.",".kk..kk..kk..."],
  landship:["...CCCCCCCCC....",".CCCCCCCCCCCCC..","CCcCCCMMMkkCCCC.","CCCCCCCCCCCCCCCC","cCCCCCCCCCCCCCCc","kMkkMkkMkkMkkMkk",".kkkkkkkkkkkkkk.","..kMk.kMk.kMk..."],
  tank:[".....MMM......","....MMMMMkkkk.","..CCCCCCCC....",".CCCLLCCCCCC..","CCCCCCCCCCCCC.","kMkMkMkMkMkMk.",".kkkkkkkkkkk.."],
  mbt:["......MMM.......",".....MMMMMkkkkkk","..CCCCCCCCCC....",".CCCLLCCCCCCCC..","CCCCCCCCCCCCCCC.","kMkMkMkMkMkMkMk.",".kkkkkkkkkkkkk.."],
  walker:["...AAAAA....","..AzzzzzA...","..AAAAAAAMMk",".CCCCCCCC...","CCLLCCCCCMMk",".CCCCCCCC...","..AA..AA....","..a....a....",".aa....aa...",".a......a...",".a......a...","kkk....kkk.."],
  ballista:["..m.......m.","...m.....m..","WWWWWWWWWWMk","....m...m...","...WWWWWWW..","...W..C..W..","..kk.....kk."],
  trebuchet:["w...........",".w..........","..w.........","...w....kk..","....w...kk..",".....w.W....","......WW....",".....W.W.ggg","....W...WggG","...WWWWWWWWW","..W.CCC....W",".kk.......kk"],
  bombard:["...MMMMMMMMk","..MMMMMMMMMk","..MMMMMMMMMk",".WWWWWWWW...",".W.CCC..W...","kk.....kk..."],
  artillery:["...........kk.",".........MMk..",".......MMM....",".....MMMM.....","...OOOOOO.....","..OOOCOOOO....",".kkk...kkk....","kMMk..kMMk....",".kk....kk....."],
  rocketarty:["......bbbbbb...",".....MMMMMMb...","....MMMMMMM....","...MMMMMM..CCz.",".OOOOOOOOOOCCCC",".OOOOOOOOOOOOOO",".kkk.....kkk...","kMMk....kMMk...",".kk......kk...."],
  railgun:["......aaaaaaaVVV",".....AAAAAAAAa..","....AAAVAAA.....","...ACCCCCCA.....","..ACCLLCCCCA....","..AAAAAAAAAA....",".kMk....kMk.....","..k......k......"],
  kite:[".....p.....","....pCp....","...pCCCp...","..pCCLCCp..",".pCCLLLCCp.","..pCCLCCp..","...pCCCp...","....pCp....",".....w.....","......w.F..",".......wFe."],
  fireballoon:["...pppp...","..pCCCCp..",".pCCLLCCp.",".pCCLLCCp.",".pCCCCCCp.","..pCCCCp..","...pppp...","...w..w...","....ww....","....FF....","...FeeF...","....FF...."],
  lantern:["..pppp..",".peeeep.","peeyyeep","peyyyyep","peyyyyep","peeyyeep",".pCCCCp.","..CLLC..","...FF...","...ee..."],
  montgolfier:["....CCCC....","..CCyCCyCC..",".CLCCLCCLCC.","CCyCCyCCyCCC","CLCCLCCLCCLC","CCyCCyCCyCCC",".CLCCLCCLCC.","..CCyCCyCC..","...CCCCCC...","....k..k....","....k..k....","...WWWWWW...","...WssssW...","....WWWW...."],
  biplane:["..CCCCCCCCCC...","....k....k.....","C...k.ss.k.....","CC.cCCCCCCCCCCk","CCCCCCCCCCCCCMk","....k....k...kk","..cccccccccc...","......k.k......"],
  bomber:["......CCC.......","......CCCC......","C.....CCCCC.....","CC.cCCCCCCCCCCzz","CCCCCCCCCCCCCCCC","...cccCCCCCcccc.","......CCCC......","......CCC.......","......k.k......."],
  stealth:[".......nn.......",".....nnnnnn.....","...nnnnCCnnnn...",".nnnnnCLLCnnnnn.","nnnnnnnnnnnnnnnn",".nn..nnnnnn..nn.","......VVVV......"],
  drone:["kkk...kkk",".k.....k.",".kCCCCCk.","..CVLVC..","...cMc...","....k...."],
  microdrones:["..k.....k...",".kCk...kCk..","..V.....V...",".....k......","....kCk...k.",".....V...kCk",".k........V.","kCk...k.....",".V...kCk...."],
  meddrone:["kkk...kkk",".k.....k.",".kooRook.","..oRRRo..","...oRo...","....V...."],
  nanites:["...V...V...",".V..V.V..V.","..VLVVVLV..","V.VVLVLVV.V",".VLVVCVVLV.","V.VVLVLVV.V","..VLVVVLV..",".V..V.V..V.","...V...V..."],
  commandai:["....kkk....","...kAAAk...",".AAAAAAAAA.",".AVVVVVVVA.",".AVCCLCCVA.",".AVVVVVVVA.",".AAAAAAAAA.","...a...a...","..VVV.VVV.."]
};
function armorElephant(){
  return XS.elephant.map((row, y) => row.split('').map((ch, x) => {
    if(ch!=='g' && ch!=='G') return ch;
    if(y===3 || y===4) return (x % 3===0) ? 'M' : 'm';
    if(y===5) return 'C';
    if(y===6 && x < 10) return x % 2 ? 'c' : 'C';
    return ch;
  }).join(''));
}
function xsRows(k){
  if(k==='catapult') return US.siege[0]; if(k==='cannon') return US.siege[1];
  if(k==='armorelephant') return armorElephant();
  return XS[k] || XS2[k] || US.guard[0];
}
const ARMOR = {
  tunic:{t:'C', s:'s', l:'s', b:'W'}, hide:{t:'f', s:'s', l:'s', b:'W', tr:'C'}, cloth:{t:'C', s:'C', l:'c', b:'W'},
  mail:{t:'m', s:'M', l:'M', b:'W', tab:'C'}, plate:{t:'m', s:'m', l:'m', b:'M', tab:'C', hi:'o'}, robe:{t:'C', s:'C', l:'C', b:'y', robe:1},
  coat:{t:'C', s:'C', l:'o', b:'o', cross:1}, uniform:{t:'c', s:'c', l:'N', b:'k', btn:'y'}, fatigue:{t:'O', s:'C', l:'P', b:'k', vest:'O', band:'C', sh:'C'},
  tactical:{t:'n', s:'C', l:'n', b:'P', vest:'C', band:'C'}, armor:{t:'A', s:'C', l:'A', b:'a', glow:'V', band:'C', sh:'C'},
  medic:{t:'o', s:'o', l:'c', b:'k', red:1}, apron:{t:'C', s:'C', l:'k', b:'k', apron:'o'}
};
const HEADS = {
  hair:[[3,1,'k'],[4,1,'k'],[5,1,'k']],
  fur:[[2,1,'f'],[3,1,'f'],[4,1,'f'],[5,1,'f'],[6,1,'f'],[3,0,'f'],[4,0,'f'],[5,0,'f']],
  band:[[3,1,'k'],[4,1,'k'],[5,1,'k'],[2,1,'C'],[2,2,'C']],
  headdress:[[3,1,'b'],[4,1,'b'],[5,1,'b'],[2,0,'y'],[4,0,'o'],[6,0,'y']],
  cap:[[3,1,'h'],[4,1,'h'],[5,1,'h'],[4,0,'h']],
  crest:[[3,1,'m'],[4,1,'m'],[5,1,'m'],[2,0,'C'],[3,0,'C'],[4,0,'C'],[3,2,'m']],
  hoplite:[[3,1,'y'],[4,1,'y'],[5,1,'y'],[2,0,'C'],[3,0,'C'],[4,0,'C'],[3,2,'y'],[3,3,'y']],
  conical:[[3,1,'M'],[4,1,'M'],[5,1,'M'],[4,0,'m'],[5,2,'M']],
  kettle:[[2,1,'M'],[3,1,'M'],[4,1,'M'],[5,1,'M'],[6,1,'M'],[3,0,'m'],[4,0,'m'],[5,0,'m']],
  great:[[3,1,'m'],[4,1,'m'],[5,1,'m'],[3,2,'m'],[4,2,'k'],[5,2,'k'],[3,3,'m'],[4,3,'m'],[5,3,'m'],[4,0,'C']],
  morion:[[2,1,'m'],[3,1,'m'],[4,1,'m'],[5,1,'m'],[6,1,'m'],[4,0,'m']],
  hood:[[2,1,'f'],[3,1,'f'],[4,1,'f'],[5,1,'f'],[6,1,'f'],[2,2,'f'],[2,3,'f'],[3,0,'f'],[4,0,'f'],[5,0,'f']],
  wide:[[1,1,'k'],[2,1,'k'],[3,1,'k'],[4,1,'k'],[5,1,'k'],[6,1,'k'],[7,1,'k'],[3,0,'k'],[4,0,'k'],[5,0,'k'],[6,0,'y']],
  tricorn:[[2,1,'k'],[3,1,'k'],[4,1,'k'],[5,1,'k'],[6,1,'k'],[2,0,'k'],[4,0,'k'],[6,0,'k'],[4,1,'y']],
  shako:[[3,0,'k'],[4,0,'y'],[5,0,'k'],[3,1,'k'],[4,1,'k'],[5,1,'k'],[6,1,'k']],
  mitre:[[4,0,'y'],[3,0,'C'],[3,1,'C'],[4,1,'C'],[5,1,'C'],[5,0,'C']],
  kepi:[[3,0,'c'],[4,0,'c'],[3,1,'c'],[4,1,'c'],[5,1,'c'],[6,1,'k']],
  bicorne:[[1,1,'k'],[2,1,'k'],[3,1,'k'],[4,1,'k'],[5,1,'k'],[6,1,'k'],[3,0,'k'],[4,0,'k'],[5,0,'C']],
  tophat:[[3,0,'k'],[4,0,'k'],[5,0,'k'],[2,1,'k'],[3,1,'k'],[4,1,'k'],[5,1,'k'],[6,1,'k']],
  crosscap:[[3,1,'o'],[4,1,'R'],[5,1,'o'],[4,0,'o']],
  brodie:[[2,1,'O'],[3,1,'O'],[4,1,'O'],[5,1,'O'],[6,1,'O'],[3,0,'O'],[4,0,'O'],[5,0,'O']],
  helmet:[[2,1,'P'],[3,1,'P'],[4,1,'P'],[5,1,'P'],[6,1,'P'],[3,0,'P'],[4,0,'P'],[5,0,'P']],
  helmcross:[[2,1,'P'],[3,1,'P'],[4,1,'R'],[5,1,'P'],[6,1,'P'],[3,0,'P'],[4,0,'o'],[5,0,'P']],
  beret:[[2,1,'C'],[3,1,'C'],[4,1,'C'],[5,1,'C'],[3,0,'C']],
  tac:[[2,1,'n'],[3,1,'n'],[4,1,'n'],[5,1,'n'],[6,1,'n'],[3,0,'n'],[4,0,'n'],[5,0,'n'],[4,2,'z'],[5,2,'z']],
  riot:[[2,1,'A'],[3,1,'A'],[4,1,'A'],[5,1,'A'],[6,1,'A'],[3,0,'A'],[4,0,'A'],[5,0,'A'],[4,2,'z'],[5,2,'z'],[6,2,'z']],
  visor:[[2,1,'A'],[3,1,'A'],[4,1,'A'],[5,1,'A'],[6,1,'A'],[3,0,'A'],[4,0,'A'],[5,0,'A'],[3,2,'V'],[4,2,'V'],[5,2,'V'],[6,2,'A'],[3,3,'a'],[4,3,'a'],[5,3,'a']]
};
const WPN = {
  club:[[7,2,'W'],[7,3,'W'],[7,4,'w'],[7,5,'w']],
  spear:[[7,0,'m'],[7,1,'w'],[7,2,'w'],[7,3,'w'],[7,4,'w'],[7,5,'w'],[7,6,'w'],[7,7,'w'],[7,8,'w']],
  pike:[[7,0,'m'],[7,1,'m'],[7,2,'w'],[7,3,'w'],[7,4,'w'],[7,5,'w'],[7,6,'w'],[7,7,'w'],[7,8,'w'],[7,9,'w']],
  sword:[[7,1,'m'],[7,2,'m'],[7,3,'m'],[7,4,'y']],
  saber:[[8,1,'m'],[8,2,'m'],[7,3,'m'],[7,4,'y']],
  halberd:[[7,0,'m'],[7,1,'w'],[7,2,'w'],[7,3,'w'],[7,4,'w'],[7,5,'w'],[7,6,'w'],[7,7,'w'],[7,8,'w'],[8,1,'m'],[8,2,'m'],[6,1,'m']],
  bayonet:[[7,0,'m'],[7,1,'m'],[7,2,'W'],[7,3,'W'],[7,4,'W'],[7,5,'W'],[7,6,'W'],[7,7,'W']],
  bow:[[7,1,'w'],[8,2,'w'],[8,3,'w'],[8,4,'w'],[8,5,'w'],[8,6,'w'],[7,7,'w'],[7,2,'o'],[7,3,'o'],[7,4,'o'],[7,6,'o']],
  longbow:[[7,0,'w'],[8,1,'w'],[8,2,'w'],[8,3,'w'],[8,4,'w'],[8,5,'w'],[8,6,'w'],[8,7,'w'],[7,8,'w'],[7,1,'o'],[7,2,'o'],[7,3,'o'],[7,4,'o'],[7,6,'o'],[7,7,'o']],
  sling:[[7,3,'h'],[8,4,'h'],[8,5,'k']],
  javelin:[[6,4,'w'],[7,3,'w'],[8,2,'w'],[9,1,'m']],
  crossbow:[[7,5,'W'],[8,5,'W'],[9,5,'w'],[8,4,'M'],[8,6,'M']],
  scorpion:[[6,6,'W'],[7,6,'W'],[8,6,'W'],[9,6,'m'],[8,5,'M'],[8,7,'M'],[7,7,'W'],[7,8,'W'],[6,9,'k'],[8,9,'k']],
  arquebus:[[7,5,'W'],[8,5,'M'],[9,5,'M'],[6,6,'W'],[8,4,'e']],
  musket:[[7,5,'W'],[8,5,'M'],[9,5,'M'],[6,6,'W']],
  swivel:[[7,4,'M'],[8,4,'M'],[9,4,'k'],[7,5,'W'],[7,6,'W'],[7,7,'W'],[7,8,'W']],
  rifle:[[7,5,'W'],[8,5,'k'],[9,5,'k'],[6,6,'W']],
  sniper:[[6,5,'W'],[7,5,'n'],[8,5,'n'],[9,5,'n'],[7,4,'k'],[8,4,'k']],
  atrifle:[[6,5,'W'],[7,5,'M'],[8,5,'M'],[9,5,'M'],[8,6,'k'],[9,6,'k']],
  smg:[[7,5,'k'],[8,5,'k'],[7,6,'k']],
  carbine:[[7,5,'n'],[8,5,'n'],[9,5,'k'],[7,6,'n']],
  mg:[[6,6,'k'],[7,6,'M'],[8,6,'M'],[9,6,'M'],[7,7,'k'],[9,7,'k']],
  pistol:[[7,5,'M']],
  laser:[[7,5,'a'],[8,5,'A'],[9,5,'V']],
  rail:[[6,5,'a'],[7,5,'A'],[8,5,'A'],[9,5,'V'],[9,4,'V']],
  bazooka:[[1,4,'P'],[2,4,'P'],[3,4,'P'],[4,4,'P'],[5,4,'P'],[6,4,'P'],[7,4,'P'],[8,4,'P'],[9,4,'k']],
  missile:[[1,4,'a'],[2,4,'a'],[3,4,'a'],[4,4,'a'],[5,4,'a'],[6,4,'a'],[7,4,'a'],[8,4,'a'],[9,4,'b']],
  plasmalance:[[7,5,'a'],[8,5,'V'],[9,5,'V'],[9,4,'L'],[9,6,'L']],
  firepot:[[6,4,'s'],[7,3,'h'],[7,2,'F'],[7,1,'e']],
  siphon:[[7,5,'y'],[8,5,'y'],[9,5,'F'],[9,4,'e']],
  firelance:[[7,0,'e'],[7,1,'F'],[7,2,'h'],[7,3,'w'],[7,4,'w'],[7,5,'w'],[7,6,'w'],[7,7,'w'],[7,8,'w']],
  grenade:[[6,4,'s'],[7,3,'k'],[7,2,'e']],
  mortar:[[7,7,'M'],[8,6,'M'],[9,5,'M'],[7,8,'k'],[8,8,'k']],
  flamer:[[7,5,'M'],[8,5,'M'],[9,5,'F'],[9,4,'e'],[1,4,'b'],[1,5,'b'],[1,6,'b']],
  plasmagren:[[6,4,'s'],[7,3,'V'],[7,2,'L']],
  staff:[[7,0,'y'],[7,1,'w'],[7,2,'w'],[7,3,'w'],[7,4,'w'],[7,5,'w'],[7,6,'w'],[7,7,'w'],[7,8,'w']],
  knife:[[7,4,'m'],[7,7,'k'],[8,7,'k'],[7,8,'W'],[8,8,'W']],
  bag:[[7,6,'o'],[8,6,'o'],[7,7,'o'],[8,7,'R']],
  drum:[[6,6,'o'],[7,6,'o'],[6,7,'C'],[7,7,'C'],[6,8,'o'],[7,8,'o'],[8,5,'w']],
  flag:[[7,0,'w'],[7,1,'w'],[7,2,'w'],[7,3,'w'],[7,4,'w'],[7,5,'w'],[7,6,'w'],[7,7,'w'],[7,8,'w'],[8,0,'C'],[9,0,'C'],[8,1,'L'],[9,1,'C'],[8,2,'C'],[9,2,'C']],
  radio:[[1,4,'P'],[1,5,'P'],[1,6,'P'],[1,1,'k'],[1,2,'k'],[1,3,'k'],[6,3,'k']],
  binocs:[[6,2,'k'],[6,3,'k']],
  lance:[[5,3,'w'],[6,3,'w'],[7,3,'w'],[8,3,'w'],[9,3,'m'],[8,2,'C']]
};
const SHIELDS = {
  round:[[6,4,'W'],[7,4,'W'],[5,5,'W'],[6,5,'C'],[7,5,'y'],[8,5,'W'],[5,6,'W'],[6,6,'C'],[7,6,'C'],[8,6,'W'],[6,7,'W'],[7,7,'W']],
  bigshield:[[6,3,'W'],[7,3,'W'],[5,4,'W'],[6,4,'C'],[7,4,'C'],[8,4,'W'],[5,5,'W'],[6,5,'C'],[7,5,'y'],[8,5,'W'],[5,6,'W'],[6,6,'C'],[7,6,'C'],[8,6,'W'],[5,7,'W'],[6,7,'C'],[7,7,'C'],[8,7,'W'],[6,8,'W'],[7,8,'W']],
  tower:[[5,3,'c'],[6,3,'c'],[7,3,'c'],[5,4,'c'],[6,4,'C'],[7,4,'c'],[5,5,'c'],[6,5,'y'],[7,5,'c'],[5,6,'c'],[6,6,'C'],[7,6,'c'],[5,7,'c'],[6,7,'C'],[7,7,'c'],[5,8,'c'],[6,8,'c'],[7,8,'c']],
  pavise:[[6,2,'W'],[7,2,'W'],[8,2,'W'],[6,3,'W'],[7,3,'C'],[8,3,'W'],[6,4,'W'],[7,4,'C'],[8,4,'W'],[6,5,'W'],[7,5,'L'],[8,5,'W'],[6,6,'W'],[7,6,'C'],[8,6,'W'],[6,7,'W'],[7,7,'C'],[8,7,'W'],[6,8,'W'],[7,8,'W'],[8,8,'W']],
  mantlet:[[6,3,'W'],[7,3,'W'],[8,3,'W'],[6,4,'W'],[7,4,'M'],[8,4,'W'],[6,5,'C'],[7,5,'C'],[8,5,'C'],[6,6,'W'],[7,6,'M'],[8,6,'W'],[6,7,'W'],[7,7,'W'],[8,7,'W'],[6,8,'W'],[7,8,'W'],[8,8,'W']],
  sandbag:[[6,8,'f'],[7,8,'f'],[8,8,'f'],[9,8,'f'],[6,9,'h'],[7,9,'f'],[8,9,'h'],[9,9,'f']],
  riotshield:[[6,3,'k'],[7,3,'k'],[6,4,'z'],[7,4,'z'],[6,5,'z'],[7,5,'z'],[6,6,'z'],[7,6,'z'],[6,7,'z'],[7,7,'z'],[6,8,'k'],[7,8,'k']],
  eshield:[[7,2,'V'],[8,2,'V'],[7,3,'L'],[8,3,'V'],[7,4,'V'],[8,4,'L'],[7,5,'L'],[8,5,'V'],[7,6,'V'],[8,6,'L'],[7,7,'L'],[8,7,'V'],[7,8,'V'],[8,8,'V']]
};
function gridPut(g, pts, dx, dy, maxY){ for(const [x,y,ch] of pts){ const X = x+(dx||0), Y = y+(dy||0); if(Y < 0 || Y >= g.length || X < 0 || X >= g[0].length || (maxY!=null && Y > maxY)) continue; g[Y][X] = ch; } }
function infRows(spec){
  const [hd, ar, wp, ex] = spec.split('/'), A = ARMOR[ar] || ARMOR.tunic;
  const g = Array.from({length:10}, () => Array(10).fill('.'));
  const P = (x,y,c) => { g[y][x] = c; };
  for(let x=3;x<=5;x++){ P(x,2,'s'); P(x,3,'s'); }
  for(let y=4;y<=6;y++) for(let x=2;x<=5;x++) P(x,y,A.t);
  P(1,5,A.s); P(6,5,'s');
  P(3,7,A.t); P(4,7,A.b); P(5,7,A.t);
  P(3,8,A.l); P(5,8,A.l);
  P(2,9,'k'); P(3,9,'k'); P(5,9,'k'); P(6,9,'k');
  if(A.robe){ for(let y=7;y<=8;y++) for(let x=2;x<=5;x++) P(x,y,A.t); P(4,7,A.b); }
  if(A.tr) for(let x=2;x<=5;x++) P(x,6,A.tr);
  if(A.tab) for(let y=4;y<=6;y++){ P(3,y,A.tab); P(4,y,A.tab); }
  if(A.hi){ P(2,4,A.hi); P(5,4,A.hi); }
  if(A.cross){ P(2,4,'o'); P(3,5,'o'); P(4,6,'o'); }
  if(A.btn){ P(4,4,A.btn); P(4,6,A.btn); }
  if(A.band) P(1,5,A.band);
  if(A.vest){ P(3,4,A.vest); P(4,4,A.vest); P(3,5,A.vest); P(4,5,A.vest); }
  if(A.sh){ P(2,4,A.sh); P(5,4,A.sh); }
  if(A.glow) P(4,5,A.glow);
  if(A.red){ P(4,4,'R'); P(3,5,'R'); P(4,5,'R'); P(5,5,'R'); P(4,6,'R'); }
  if(A.apron) for(let y=5;y<=7;y++){ P(3,y,A.apron); P(4,y,A.apron); }
  gridPut(g, HEADS[hd] || HEADS.hair);
  gridPut(g, WPN[wp] || []);
  if(ex && SHIELDS[ex]) gridPut(g, SHIELDS[ex]);
  return g.map(r => r.join(''));
}
function riderRows(spec){
  const [mt, hd, ar, wp] = spec.split('/'), A = ARMOR[ar] || ARMOR.tunic;
  const horse = {
    horse:["..........","..........","..........","..........",".......hh.",".hh.hhhhhH","hhhhhhhh..","Hhhhhhh...",".H.h.H.h..",".H.h.H.h.."],
    barded:["..........","..........","..........","..........",".......mm.",".mm.mmmmmM","CCCCCCCm..","cCcCcCc...",".H.h.H.h..",".H.h.H.h.."],
    warhorse:["..........","..........","..........","..........",".......HH.",".HH.HHHHHk","HCCCHHHH..","kHHHHHH...",".k.H.k.H..",".k.H.k.H.."]
  }[mt] || [];
  const g = horse.map(r => r.split(''));
  const P = (x,y,c) => { g[y][x] = c; };
  for(let x=3;x<=5;x++) P(x,2,'s');
  for(let y=3;y<=4;y++) for(let x=2;x<=4;x++) P(x,y,A.t);
  if(A.tab){ P(3,3,A.tab); P(3,4,A.tab); }
  if(A.cross){ P(2,3,'o'); P(3,4,'o'); }
  if(A.btn) P(3,3,A.btn);
  P(5,4,'s'); P(3,5,A.l==='s' ? 's' : A.t);
  gridPut(g, HEADS[hd] || HEADS.hair, 0, 0, 2);
  if(wp==='lance') gridPut(g, WPN.lance);
  else gridPut(g, WPN[wp] || [], -1, -1, 9);
  return g.map(r => r.join(''));
}
function formRows(id, lvl){
  const s = formOf(id, lvl).s, k = s.slice(0,1), v = s.slice(2);
  if(k==='i') return infRows(v);
  if(k==='r') return riderRows(v);
  return xsRows(v);
}


function teamPal(hex){
  const [r,g,b] = hexRgb(hex);
  return {C:hex, c:rgbHex(r*.6,g*.6,b*.6), L:rgbHex(r+(255-r)*.5, g+(255-g)*.5, b+(255-b)*.5)};
}
function spriteFrom(rows, pal){
  const h = rows.length, w = rows[0].length, c = mkCanvas(w,h), g = c.getContext && c.getContext('2d');
  if(!g || !g.fillRect) return c;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const ch = rows[y][x]; if(ch==='.') continue;
    g.fillStyle = (pal && pal[ch]) || PAL[ch] || '#ff00ff'; g.fillRect(x,y,1,1);
  }
  return c;
}
function whiten(src){
  const c = mkCanvas(src.width, src.height), g = c.getContext && c.getContext('2d');
  if(!g || !g.drawImage) return c;
  g.drawImage(src,0,0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0,0,c.width,c.height);
  return c;
}
function getSpr(key, make){
  let s = R.spr[key];
  if(!s){ const n = make(); s = R.spr[key] = {n, w:whiten(n)}; }
  return s;
}
function unitSprite(u){
  if(u.owner===0) return getSpr('b_'+u.kind, () => spriteFrom(BS[u.kind], null));
  const id = CARDS[u.card] ? u.card : 'militia';
  const lv = u.lvl || (u.hero ? (u.hlv||1) : G && G.units ? cardLevel(u.owner, id) : 1), ev = u.lvl ? (u.ev || null) : (G && G.units ? cardEvo(u.owner, id) : null), rk = rankOf(lv);
  return formSprite(id, lv, u.owner, ev, rk);
}
function formSprite(id, lv, owner, ev, rk){
  const base = () => spriteFrom(formRows(id, lv), R.pal[owner]);
  if(rk || ev) return getSpr('u_'+id+'_'+lv+'_'+owner+'_'+rk+'_'+(ev ? ev.id : ''), () => rankSprite(base(), rk, ev, R.pal[owner]));
  return getSpr('u_'+id+'_'+lv+'_'+owner, base);
}
/* Rank looks: Veteran (Lv 4) gets a team plume, Elite (Lv 6) a steel outline, Legendary (Lv 8) a gold outline. Evolutions get their own color and a crown */
const RANK_N = ['', '', '', 'Legendary'];
function rankSprite(src, rk, ev, pal){
  try {
    const w = src.width, h = src.height, W = w+2, H = h+4;
    const c = mkCanvas(W, H), g = c.getContext && c.getContext('2d');
    if(!g || !g.getImageData || !src.getContext) return src;
    const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && sd[(y*w+x)*4+3] > 40;
    let top = h, cx = w>>1;
    for(let y=0; y<h && top===h; y++) for(let x=0; x<w; x++) if(on(x,y)){ top = y; cx = x; break; }
    { let xs = []; for(let x=0;x<w;x++) if(on(x,top)) xs.push(x); if(xs.length) cx = xs[xs.length>>1]; }
    const ox = 1, oy = 3;
    const line = ev ? ev.col : rk >= 3 ? '#fff4c8' : rk >= 2 ? '#9fb0c4' : null;
    if(line){
      g.fillStyle = line;
      for(let y=-1; y<=h; y++) for(let x=-1; x<=w; x++){
        if(on(x,y)) continue;
        if(on(x-1,y) || on(x+1,y) || on(x,y-1) || on(x,y+1)) g.fillRect(x+ox, y+oy, 1, 1);
      }
    }
    g.drawImage(src, ox, oy);
    if(ev){
      g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .28; g.fillStyle = ev.col; g.fillRect(0, oy, W, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#ffd36a'; const y = top+oy-1; g.fillRect(cx-1+ox, y, 3, 1); g.fillRect(cx-1+ox, y-1, 1, 1); g.fillRect(cx+1+ox, y-1, 1, 1); g.fillRect(cx+ox, y-2, 1, 1);
    } else if(rk >= 1 && rk < 3){
      const pc = rk >= 3 ? '#ffd36a' : pal ? pal.C : '#e9b949', y = top+oy-1;
      g.fillStyle = pc; g.fillRect(cx+ox, y, 1, 1); g.fillRect(cx+ox, y-1, 1, 1); g.fillRect(cx+ox+1, y-2, 1, 1);
      if(rk >= 2){ g.fillStyle = pal ? pal.L : '#fff'; g.fillRect(cx+ox+1, y-1, 1, 1); }
    }
    c.pad = {x:ox, y:H-h-oy};
    return c;
  } catch(e){ return src; }
}
function unitLook(u){
  const sp = unitSprite(u), img = u.fl>0 ? sp.w : sp.n;
  let scl = u.owner===0 ? BSCALE[u.kind] : CARDS[u.card] ? formSize(u.card, u.hero ? (u.hlv||1) : cardLevel(u.owner, u.card))*(u.hero ? 1.7 : 1) : 1;
  let rk = 0, ev = null;
  if(u.owner>0 && u.card && !u.hero){ rk = rankOf(cardLevel(u.owner, u.card)); ev = cardEvo(u.owner, u.card); scl *= (ev ? 1.22 : 1) * (rk >= 3 ? 1.1 : 1); }
  const pad = sp.n.pad || {x:0, y:0};
  return {img, scl, w:img.width/16*scl, h:img.height/16*scl, dy:pad.y/16*scl, rk, ev};
}
function drawChestIcon(x, cx, cy, sz){
  const b = Math.sin((R.now||0)*4)*.06*sz;
  cy += b;
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(cx-.3*sz, cy-.18*sz, .6*sz, .42*sz);
  x.fillStyle = '#8a5428'; x.fillRect(cx-.26*sz, cy-.08*sz, .52*sz, .28*sz);
  x.fillStyle = '#a86a34'; x.fillRect(cx-.26*sz, cy-.16*sz, .52*sz, .1*sz);
  x.fillStyle = '#ffd36a'; x.fillRect(cx-.26*sz, cy-.06*sz, .52*sz, .04*sz); x.fillRect(cx-.04*sz, cy-.08*sz, .08*sz, .12*sz);
}
function drawUnitGlow(x, u, L){
  if(!L.rk && !L.ev) return;
  const pulse = .5 + .5*Math.sin((R.now||0)*3 + u.id);
  if(L.ev){ x.globalAlpha = .22 + .14*pulse; x.fillStyle = L.ev.col; x.beginPath(); x.ellipse(u.x, u.y+.22, .42*L.scl+.1, .16*L.scl+.04, 0, 0, 6.283); x.fill(); x.globalAlpha = 1; }
  else if(L.rk >= 3){ x.globalAlpha = .16 + .12*pulse; x.fillStyle = '#ffd36a'; x.beginPath(); x.ellipse(u.x, u.y+.22, .36*L.scl+.08, .13*L.scl+.03, 0, 0, 6.283); x.fill(); x.globalAlpha = 1; }
}

function paintCity(stage, pal){
  const c = mkCanvas(16,16), g = c.getContext && c.getContext('2d');
  if(!g || !g.fillRect) return c;
  const P = (x,y,w,h,col) => { g.fillStyle = col; g.fillRect(x,y,w,h); };
  const house = (x, by, w) => {
    const top = by-3;
    P(x,top,w,3,'#8a6a44'); P(x,top+2,w,1,'#6a4e30');
    P(x+Math.floor(w/2),by-2,1,2,'#24160c');
    if(w>=5){ P(x+1,top+1,1,1,'#ffd36a'); P(x+w-2,top+1,1,1,'#ffd36a'); }
    for(let i=0;;i++){
      const x0 = x-1+i, x1 = x+w+1-i, row = top-1-i;
      if(x1-x0 <= 0) break;
      const half = Math.ceil((x1-x0)/2);
      P(x0,row,half,1,pal.C); P(x0+half,row,x1-x0-half,1,pal.c);
    }
  };
  const tower = (x, y, h) => {
    P(x,y,3,h,'#7a766c'); P(x+2,y,1,h,'#5c5850'); P(x+1,y+2,1,1,'#ffd36a');
    P(x,y-1,3,1,pal.C); P(x+1,y-2,1,1,pal.C);
  };
  if(stage===0){
    house(5,14,6);
    P(2,14,12,1,'#3a2c1a');
  } else if(stage===1){
    house(6,11,5); house(1,15,5); house(10,15,5);
  } else if(stage===2){
    house(2,10,5); house(8,9,6);
    P(0,11,16,4,'#6c6860'); P(0,14,16,1,'#4c4844');
    for(let x=0;x<16;x+=2) P(x,10,1,1,'#6c6860');
    P(7,12,2,3,'#24160c');
    tower(0,8,7); tower(13,8,7);
  } else if(stage===3){
    P(5,4,6,10,'#7e7a70'); P(9,4,2,10,'#5e5a52');
    for(let x=5;x<11;x+=2) P(x,3,1,1,'#7e7a70');
    P(6,6,1,1,'#ffd36a'); P(9,6,1,1,'#ffd36a'); P(7,9,2,1,'#ffd36a');
    tower(1,6,9); tower(12,6,9);
    P(0,12,16,3,'#6c6860'); P(0,14,16,1,'#4c4844'); P(7,12,2,3,'#24160c');
    P(5,2,6,1,pal.C);
  } else {
    const bld = (x,y,w,col) => {
      P(x,y,w,16-y,col); P(x,y,w,1,pal.C);
      for(let yy=y+2; yy<15; yy+=2) for(let xx=x+1; xx<x+w-1; xx+=2) if(((xx*7+yy*3)%5)!==0) P(xx,yy,1,1,'#ffd36a');
    };
    bld(10,6,5,'#383c44'); bld(1,7,4,'#3c4048'); bld(5,2,5,'#4a4e58');
  }
  return c;
}
function cityStage(c){
  const e = ownerEra(c.owner);
  if(c.pop <= 2 && !c.capital) return 0;
  if(c.pop <= 4) return 1;
  if(e >= 4 && c.pop >= 6) return 4;
  if(c.pop <= 6) return 2;
  return 3;
}

function setupVisuals(){
  { const pc = pcol(), [a,b,c] = hexRgb(pc); R.pal = {1: teamPal(pc)}; R.rgb = {1: [a,b,c]};
    R.glow = {1: makeSprite(64, [[0,'rgba('+a+','+b+','+c+',.9)'],[.35,'rgba('+a+','+b+','+c+',.35)'],[1,'rgba('+a+','+b+','+c+',0)']])}; }
  G.rivals.forEach(r => {
    R.pal[r.id] = teamPal(r.col);
    const [a,b,c] = hexRgb(r.col); R.rgb[r.id] = [a,b,c];
    R.glow[r.id] = makeSprite(64, [[0,'rgba('+a+','+b+','+c+',.85)'],[.35,'rgba('+a+','+b+','+c+',.3)'],[1,'rgba('+a+','+b+','+c+',0)']]);
  });
  R.spr = {};
  buildTerrain();
  R.dirty = true; R.lastLayers = -1;
  buildStrip();
}

/* ---------- Rendering ---------- */
const cv = $('#map'), ctx = cv && cv.getContext ? cv.getContext('2d') : null;
const mini = $('#mini'), mctx = mini && mini.getContext ? mini.getContext('2d') : null;
const terrainCv = mkCanvas(N*TT, N*TT), terrCv = mkCanvas(N*TP, N*TP), darkCv = mkCanvas(N*8, N*8), miniBase = mkCanvas(N, N), miniOwn = mkCanvas(N, N);
let VW = 360, VH = 360, dpr = 1;
function makeSprite(n, stops){
  const c = mkCanvas(n,n);
  const x = c.getContext && c.getContext('2d'); if(!x || !x.createRadialGradient) return c;
  const g = x.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  x.fillStyle = g; x.fillRect(0,0,n,n); return c;
}
const holeSprite = makeSprite(64, [[0,'rgba(0,0,0,1)'],[.55,'rgba(0,0,0,.8)'],[1,'rgba(0,0,0,0)']]);
const redSprite = makeSprite(32, [[0,'rgba(255,60,40,.5)'],[1,'rgba(255,60,40,0)']]);

function zLimits(){ return {min: Math.max(3, Math.min(VW, VH)/N*.95), max: 60}; }
function clampCam(){
  const L = zLimits(); CAM.z = clamp(CAM.z, L.min, L.max);
  const hw = VW/2/CAM.z, hh = VH/2/CAM.z;
  // let the view run a little past the map edge (and past the HUD panels) so edge cities are never hidden
  const hp = R.hudPad || {t:0, b:0}, mx = 3, padT = mx + hp.t/CAM.z, padB = mx + hp.b/CAM.z;
  CAM.x = (hw - mx)*2 >= N ? N/2 : clamp(CAM.x, hw - mx, N - hw + mx);
  CAM.y = (hh*2 - padT - padB) >= N ? N/2 : clamp(CAM.y, hh - padT, N - hh + padB);
}
function focusOn(x,y){ R.camTo = {x, y}; R.follow = null; R.camZ = null; R.camFree = true; syncWatch(); }
function findBattle(near){
  const cells = new Map();
  for(const u of G.units){
    if(u.hp<=0 || u.owner!==PLAYER || !u.tgt) continue;
    if(near && (u.x-near.x)**2+(u.y-near.y)**2 > 100) continue;
    const k = ((u.x/5)|0)+','+((u.y/5)|0), c = cells.get(k) || {n:0, x:0, y:0}; c.n++; c.x += u.x; c.y += u.y; cells.set(k, c);
  }
  let best = null; for(const c of cells.values()) if(!best || c.n > best.n) best = c;
  return best ? {x:best.x/best.n, y:best.y/best.n} : null;
}
function syncWatch(){ const b = document.getElementById('btnWatch'); if(b && b.classList) b.classList.toggle('on', !!R.follow); }
function watchBattle(){
  if(!G || !running || G.ended) return;
  if(R.follow){ R.follow = null; R.camZ = null; syncWatch(); return; }
  const b = findBattle();
  if(!b){ toast('Your troops aren’t fighting right now','warn'); return; }
  R.follow = {x:b.x, y:b.y, t:.5}; R.camTo = {x:b.x, y:b.y}; R.camZ = 28; syncWatch();
  toast('Following your troops into battle. Drag or press B to stop');
}
function zoomAt(f, sx, sy){
  const wx = CAM.x + (sx - VW/2)/CAM.z, wy = CAM.y + (sy - VH/2)/CAM.z;
  const L = zLimits(); CAM.z = clamp(CAM.z*f, L.min, L.max);
  CAM.x = wx - (sx - VW/2)/CAM.z; CAM.y = wy - (sy - VH/2)/CAM.z;
  clampCam();
}
const toWorld = (sx,sy) => [CAM.x + (sx - VW/2)/CAM.z, CAM.y + (sy - VH/2)/CAM.z];
const toScreen = (wx,wy) => [(wx - CAM.x)*CAM.z + VW/2, (wy - CAM.y)*CAM.z + VH/2];

function resize(){
  const st = $('#stage'); if(!st || !cv) return;
  const w = st.clientWidth, h = st.clientHeight;
  if(!isFinite(w) || !isFinite(h) || w < 50 || h < 50) return;
  VW = w; VH = h; dpr = Math.min(2.5, window.devicePixelRatio || 1);
  { const tb = $('#topbar'), dk = $('#deck'), ov = !!(st && typeof getComputedStyle==='function' && getComputedStyle(st).position==='fixed');
    const th = tb && tb.getBoundingClientRect ? tb.getBoundingClientRect().height : 0, dh = dk && dk.getBoundingClientRect ? dk.getBoundingClientRect().height : 0;
    try { document.documentElement.style.setProperty('--topH', Math.round(th-20)+'px'); document.documentElement.style.setProperty('--deckH', Math.round(dh-14)+'px'); } catch(e){}
    R.camOffY = ov ? (dh - th)/2 : 0; R.hudPad = ov ? {t:th, b:dh} : {t:0, b:0}; }
  cv.width = Math.round(VW*dpr); cv.height = Math.round(VH*dpr);
  if(mini){ const ms = mini.clientWidth || 104; mini.width = Math.round(ms*dpr); mini.height = Math.round(ms*dpr); }
  clampCam();
}

function buildTerrain(){
  const g = terrainCv.getContext && terrainCv.getContext('2d'); if(!g || !g.fillRect) return;
  if(MAPS.ok && g.createImageData){ try { mapBuild(g); buildMini(); return; } catch(e){ MAPS.ok = false; } }
  if(g.setTransform) g.setTransform(TT/TP, 0, 0, TT/TP, 0, 0);
  const r = mulberry32(G.seed ^ 0x9e3779);
  for(let ty=0;ty<N;ty++) for(let tx=0;tx<N;tx++){
    const t = G.ter[idx(tx,ty)], X = tx*TP, Y = ty*TP;
    const P = (x,y,w,h,col) => { g.fillStyle = col; g.fillRect(X+x,Y+y,w,h); };
    const ri = n => Math.floor(r()*n);
    if(t===WATER){
      P(0,0,16,16,'#123049');
      for(let k=0;k<5;k++) P(ri(13),ri(15),3,1,'#16395a');
    } else if(t===GRASS || t===FOREST){
      P(0,0,16,16, t===FOREST ? '#22402a' : '#2b4a2c');
      for(let k=0;k<9;k++) P(ri(16),ri(15),1,2,'#3a6436');
      for(let k=0;k<5;k++) P(ri(16),ri(16),1,1,'#203a20');
      if(t===FOREST){
        const pine = (x,y) => {
          [1,3,3,5,5,7].forEach((w,i) => { const x0 = x+3-(w-1)/2; P(x0,y+i,w,1,'#16301e'); P(x0,y+i,1,1,'#2f5a34'); });
          P(x+3,y+6,1,2,'#3a2a18');
        };
        const n = 2 + ri(2);
        const spots = [[1,1],[8,0],[4,6],[9,7],[0,7]];
        shuffleR(spots, r);
        for(let k=0;k<n;k++) pine(spots[k][0]+ri(2), spots[k][1]+ri(2));
      }
    } else if(t===PLAINS){
      P(0,0,16,16,'#454b2a');
      for(let k=0;k<12;k++) P(ri(16),ri(16),1,1,'#6e7036');
      for(let k=0;k<5;k++) P(ri(15),ri(15),1,2,'#8a8640');
    } else if(t===HILLS){
      P(0,0,16,16,'#3c4630');
      for(let k=0;k<6;k++) P(ri(16),ri(16),1,1,'#4c5a38');
      const by = 13 + ri(2), bx = ri(3);
      [[5,6],[3,10],[2,12],[1,14]].forEach(([o,w],i) => {
        const y = by-3+i; P(bx+o-1,y,w-1,1,'#56603a'); P(bx+o-1,y,Math.ceil(w/3),1,'#6e7a48'); P(bx+o+w-3,y,2,1,'#3a4226');
      });
    } else if(t===MOUNT){
      P(0,0,16,16,'#2e3036');
      const px = 7 + ri(2);
      for(let i=0;i<12;i++){
        const w = i*2+1, x0 = px - i, y = 3 + i;
        P(x0,y,Math.ceil(w/2),1, i<3 ? '#d8dce4' : '#6c6a72');
        P(x0+Math.ceil(w/2),y,Math.floor(w/2),1, i<3 ? '#a8acb6' : '#46444c');
      }
      if(r()<.6){ const qx = ri(2)?2:12; for(let i=0;i<6;i++){ P(qx-i,9+i,i+1,1,'#5c5a62'); P(qx+1,9+i,i,1,'#3e3c44'); } }
    } else {
      P(0,0,16,16,'#655536');
      for(let k=0;k<3;k++){ const x=ri(10), y=2+ri(12); P(x,y,6,1,'#7a6844'); P(x+1,y+1,5,1,'#544629'); }
      for(let k=0;k<6;k++) P(ri(16),ri(16),1,1,'#72603e');
    }
  }
  g.fillStyle = 'rgba(120,170,200,.35)';
  for(let ty=0;ty<N;ty++) for(let tx=0;tx<N;tx++){
    if(G.ter[idx(tx,ty)]!==WATER) continue;
    const X = tx*TP, Y = ty*TP;
    if(ty>0 && G.ter[idx(tx,ty-1)]!==WATER) g.fillRect(X,Y,16,1);
    if(ty<N-1 && G.ter[idx(tx,ty+1)]!==WATER) g.fillRect(X,Y+15,16,1);
    if(tx>0 && G.ter[idx(tx-1,ty)]!==WATER) g.fillRect(X,Y,1,16);
    if(tx<N-1 && G.ter[idx(tx+1,ty)]!==WATER) g.fillRect(X+15,Y,1,16);
  }
  if(g.setTransform) g.setTransform(1, 0, 0, 1, 0, 0);
  buildMini();
}
function buildMini(){
  const mg = miniBase.getContext && miniBase.getContext('2d');
  if(mg && mg.fillRect) for(let i=0;i<N*N;i++){ mg.fillStyle = MINI_COL[G.ter[i]]; mg.fillRect(i%N, (i/N)|0, 1, 1); }
}
function shuffleR(a, r){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

function buildLayers(){
  const t = terrCv.getContext && terrCv.getContext('2d'); if(!t || !t.clearRect) return;
  t.clearRect(0,0,terrCv.width,terrCv.height);
  for(let i=0;i<N*N;i++){
    const o = G.own[i]; if(!o) continue;
    const rgb = R.rgb[o]; if(!rgb) continue;
    const tx = i%N, ty = (i/N)|0, X = tx*TP, Y = ty*TP;
    t.fillStyle = 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+',.13)'; t.fillRect(X,Y,TP,TP);
    t.fillStyle = 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+',.9)';
    if(ty===0 || G.own[i-N]!==o) t.fillRect(X,Y,TP,2);
    if(ty===N-1 || G.own[i+N]!==o) t.fillRect(X,Y+TP-2,TP,2);
    if(tx===0 || G.own[i-1]!==o) t.fillRect(X,Y,2,TP);
    if(tx===N-1 || G.own[i+1]!==o) t.fillRect(X+TP-2,Y,2,TP);
  }
  const d = darkCv.getContext('2d'); const S8 = 8;
  d.globalCompositeOperation = 'source-over';
  d.clearRect(0,0,darkCv.width,darkCv.height);
  d.fillStyle = 'rgba(2,5,8,.58)'; d.fillRect(0,0,darkCv.width,darkCv.height);
  d.globalCompositeOperation = 'destination-out';
  d.fillStyle = '#000';
  for(let i=0;i<N*N;i++){
    if(!G.own[i]) continue; const tx=i%N, ty=(i/N)|0;
    const edge = tx===0 || ty===0 || tx===N-1 || ty===N-1 || !G.own[i-1] || !G.own[i+1] || !G.own[i-N] || !G.own[i+N];
    if(edge){ d.globalAlpha = .55; d.drawImage(holeSprite, (tx+.5-1.8)*S8, (ty+.5-1.8)*S8, 3.6*S8, 3.6*S8); }
    else { d.globalAlpha = .92; d.fillRect(tx*S8, ty*S8, S8, S8); }
  }
  d.globalAlpha = 1;
  for(const c of G.cities){ const rr = 2.4 + c.pop*.22; d.drawImage(holeSprite, (c.x+.5-rr)*S8, (c.y+.5-rr)*S8, rr*2*S8, rr*2*S8); }
  d.globalCompositeOperation = 'source-over';
  R.dirty = false; R.lastLayers = R.now;
}

function draw(){
  const x = ctx; if(!x || !G || !x.setTransform) return;
  if(R.dirty && R.now - R.lastLayers > .3) buildLayers();
  if(MAPS.ok && (!(R.now - (R.mapT||0) < .5 && R.now >= (R.mapT||0)) || (MAPS.q && MAPS.q.length))){ R.mapT = R.now; try { mapSync(); } catch(e){} }
  if(MAPS.ok && running && !paused){ try { mapTrample(); } catch(e){} }
  const z = CAM.z, now = R.now;
  x.setTransform(dpr,0,0,dpr,0,0);
  x.fillStyle = '#04080a'; x.fillRect(0,0,VW,VH);
  let sx = 0, sy = 0; { const sm = shakeMul(); if(R.shake > 0 && sm > 0){ const a = Math.min(R.shake, 5)*.55*sm, t = now*31; sx = (Math.sin(t*1.7) + Math.sin(t*2.9)*.5)*a*.66; sy = (Math.cos(t*1.3) + Math.sin(t*3.7)*.5)*a*.66; } }
  const ox = VW/2 - CAM.x*z + sx, oy = VH/2 - CAM.y*z + sy;
  x.setTransform(dpr*z,0,0,dpr*z,dpr*ox,dpr*oy);
  x.imageSmoothingEnabled = z*dpr < TT*.9;
  x.drawImage(terrainCv, 0, 0, N, N);
  x.imageSmoothingEnabled = false;
  const vx0 = Math.max(0, Math.floor(-ox/z)-1), vy0 = Math.max(0, Math.floor(-oy/z)-1);
  const vx1 = Math.min(N-1, Math.ceil((VW-ox)/z)+1), vy1 = Math.min(N-1, Math.ceil((VH-oy)/z)+1);
  const vis = (px,py,m) => px > vx0-m && px < vx1+1+m && py > vy0-m && py < vy1+1+m;

  if(z >= 9){
    x.fillStyle = 'rgba(150,200,230,.4)';
    for(let ty=vy0; ty<=vy1; ty++) for(let tx=vx0; tx<=vx1; tx++){
      if(G.ter[idx(tx,ty)]!==WATER) continue;
      const ph = ((tx*37+ty*91)%100)/100, t = (now*.45+ph)%1;
      if(t < .4){ const gx = tx + (((tx*7+ty*3)%10)+2)/16, gy = ty + (((tx*5+ty*11)%11)+3)/16; x.fillRect(gx, gy, (2+t*6)/16, 1/16); }
    }
  }
  x.drawImage(terrCv, 0, 0, N, N);
  x.imageSmoothingEnabled = true;
  if(!G.demo) x.drawImage(darkCv, 0, 0, N, N);
  x.imageSmoothingEnabled = false;

  for(const [i,t0] of R.flash){
    const a = 1 - (G.t - t0)/.8;
    if(a <= 0){ R.flash.delete(i); continue; }
    x.fillStyle = 'rgba(255,224,150,'+(a*.45)+')'; x.fillRect(i%N, (i/N)|0, 1, 1);
  }

  if(G.settle){
    if(!R.sites || now - R.sitesT > .5) computeSites();
    const pulse = .75 + .25*Math.sin(now*4);
    for(const st of R.sites){
      if(!vis(st.x,st.y,1)) continue;
      x.fillStyle = 'rgba(150,235,140,'+((.14 + .42*st.q)*pulse)+')'; x.fillRect(st.x+.06, st.y+.06, .88, .88);
      if(st.best){ x.fillStyle = '#ffe14a'; x.beginPath(); x.moveTo(st.x+.5,st.y+.2); x.lineTo(st.x+.78,st.y+.5); x.lineTo(st.x+.5,st.y+.8); x.lineTo(st.x+.22,st.y+.5); x.closePath(); x.fill(); }
      if(R.hover && R.hover.x===st.x && R.hover.y===st.y){ x.strokeStyle = '#eaffe0'; x.lineWidth = .08; x.strokeRect(st.x+.04, st.y+.04, .92, .92); }
    }
  }
  x.globalCompositeOperation = 'lighter';
  for(const c of G.cities){
    if(!vis(c.x,c.y,3) || !fogSeen(c.x,c.y)) continue;
    const gl = R.glow[c.owner]; if(!gl) continue;
    const rr = (1.5 + c.pop*.12)*(1 + Math.sin(now*3.1 + c.id*1.7)*.05);
    x.globalAlpha = c.owner===PLAYER ? (G.buff.golden>0 ? .7 : .42) : .3;
    x.drawImage(gl, c.x+.5-rr, c.y+.5-rr, rr*2, rr*2);
  }
  x.globalAlpha = .55;
  for(const b of G.units){ if(b.owner!==0 || !vis(b.x,b.y,1) || !fogSee(b.x,b.y)) continue; const rr = b.r*2.6; x.drawImage(redSprite, b.x-rr, b.y-rr, rr*2, rr*2); }
  if(G.warn){
    const p = edgePoint(G.warn.side, G.warn.pos, 0), rr = 5 + Math.sin(now*8)*.7;
    x.globalAlpha = .7 + Math.sin(now*8)*.3;
    x.drawImage(redSprite, p[0]-rr, p[1]-rr, rr*2, rr*2);
  }
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';

  if(G.warn){
    const p = edgePoint(G.warn.side, G.warn.pos, 1.2), ang = [Math.PI/2, Math.PI, -Math.PI/2, 0][G.warn.side];
    x.save(); x.translate(p[0], p[1]); x.rotate(ang);
    x.strokeStyle = '#ff6b5e'; x.lineWidth = .16; x.lineJoin = 'round'; x.lineCap = 'round';
    for(let k=0;k<2;k++){ const o = ((now*2)%1)*.6 + k*.6; x.globalAlpha = .9 - k*.35; x.beginPath(); x.moveTo(o-.3,-.55); x.lineTo(o+.2,0); x.lineTo(o-.3,.55); x.stroke(); }
    x.restore(); x.globalAlpha = 1;
    if(MAPS.ok){ const q = edgePoint(G.warn.side, G.warn.pos, 2.6); mapStamp(x, 'totem', q[0], q[1]+.5, 1.3 + Math.sin(now*4)*.04, 1); }
  }

  // Buildings
  for(let ty=vy0; ty<=vy1; ty++) for(let tx=vx0; tx<=vx1; tx++){
    const i = idx(tx,ty), b = G.bmap[i]; if(!b) continue;
    const o = G.own[i]; if(!o || !R.pal[o]) continue;
    const k = BK[b], ar = archOf(k), tier = Math.min(2, Math.floor(ownerEra(o)/2));
    const spr = getSpr('B'+ar+(ar==='house' ? tier : '')+'_'+o, () => paintBuilding(ar, R.pal[o], tier));
    let sc = 1; const nb = R.bnew.get(i);
    if(nb !== undefined){ const a = (G.t - nb)/.5; if(a >= 1 || a < 0) R.bnew.delete(i); else sc = Math.max(.05, a); }
    if(!bSprDraw(x, o, ar, tier, tx + .5, ty + 1, sc)) x.drawImage(spr.n, tx + (1-sc)/2, ty + (1-sc), sc, sc);
    if(ar==='factory' || ar==='power') for(let j=0;j<3;j++){ const ph=(now*.35 + j/3)%1; x.fillStyle='rgba(120,116,110,'+(.45*(1-ph))+')'; x.beginPath(); x.arc(tx+.75+ph*.35, ty+.05-ph*.9, .07+ph*.16, 0, 6.283); x.fill(); }
  }
  for(const c of G.cities){
    if(!vis(c.x,c.y,3) || !(c.capital || c.pop >= 8)) continue;
    if(!BSPR.ok && (c.owner===PLAYER ? (relicLv('masonry') > 0 || G.eraIdx >= 2) : rEra() >= 1)) drawWalls(x, c);
  }
  // Cities
  drawPois(x, vis);
  if(R.rubble){ R.rubble = R.rubble.filter(r => G.t - r.t < 60); for(const r of R.rubble) if(vis(r.x, r.y, 2)) kitDraw(x, 'cd_rubble', r.x, r.y, 1.1, Math.min(1, (60 - (G.t - r.t))/10)); }
  const cs = G.cities.filter(c => vis(c.x,c.y,2) && fogSeen(c.x,c.y)).sort((a,b) => a.y-b.y);
  for(const c of cs){
    const mine = c.owner===PLAYER, stg = cityStage(c);
    const spr = getSpr('c'+stg+'_'+c.owner, () => paintCity(stg, R.pal[c.owner] || R.pal[1]));
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(c.x-.05, c.y+.82, 1.1, .12);
    if(!citySprDraw(x, c, stg)) x.drawImage(c.fl>0 ? spr.w : spr.n, c.x-.125, c.y-.3, 1.25, 1.25);
    try { cityFx(x, c, now); if(mine) shipPadDraw(x, c, now); } catch(e){}
    if(atWar(PLAYER, c.owner) && !mine){
      x.strokeStyle = 'rgba(255,90,70,'+(.5+Math.sin(now*5)*.3)+')'; x.lineWidth = .07;
      x.beginPath(); x.arc(c.x+.5, c.y+.4, .85, 0, 6.283); x.stroke();
    }
    if(c.capital){
      const fx = c.x+1.02, fy = c.y-.45, wv = Math.sin(now*4+c.id)*.06;
      x.fillStyle = '#2a1d0a'; x.fillRect(fx-.03, fy, .06, .6);
      x.fillStyle = (R.pal[c.owner]||R.pal[1]).C;
      x.beginPath(); x.moveTo(fx+.03, fy); x.lineTo(fx+.42, fy+.12+wv); x.lineTo(fx+.03, fy+.26); x.closePath(); x.fill();
    }
    const mx = cityMax(c), f = clamp(c.hp/mx,0,1);
    if(f < .4){
      for(let k=0;k<3;k++){
        const fh = (.18 + .1*Math.sin(now*12 + k*2 + c.id))*(1.2-f);
        const bx = c.x + .2 + k*.3, by = c.y + .35 - (k%2)*.25;
        x.fillStyle = '#ff6a1a'; x.fillRect(bx, by-fh, .14, fh);
        x.fillStyle = '#ffd36a'; x.fillRect(bx+.04, by-fh*.6, .06, fh*.6);
      }
    }
    if(f < .99){
      x.fillStyle = 'rgba(0,0,0,.8)'; x.fillRect(c.x-.1, c.y-.52, 1.2, .14);
      x.fillStyle = f>.5 ? '#9fd36a' : f>.25 ? '#f0b24a' : '#e0473b'; x.fillRect(c.x-.08, c.y-.5, 1.16*f, .1);
    }
  }

  drawDecals(x, vis);
  // Units
  const us = G.units.filter(u => u.hp>0 && vis(u.x,u.y,1) && (u.owner===PLAYER || fogSee(u.x,u.y))).sort((a,b) => a.y-b.y);
  const detail = z >= 9;
  if(detail) for(const cp of R.corpses){
    if(!vis(cp.x,cp.y,1)) continue;
    x.save(); x.globalAlpha = Math.max(0, 1 - cp.t/1.6)*.85; x.translate(cp.x, cp.y+.25); x.rotate(cp.fx*1.35);
    x.drawImage(cp.img, -cp.w/2, -cp.h, cp.w, cp.h); x.restore();
  }
  x.globalAlpha = 1;
  for(const u of us){
    if(!detail){
      x.fillStyle = u.owner===0 ? '#ec5446' : u.owner===PLAYER ? '#fff1cf' : ocol(u.owner);
      const s = u.owner===0 ? (BARB[u.kind].boss ? .9 : .38) : u.hero ? .9 : .38*(CARDS[u.card]||{size:1}).size;
      x.fillRect(u.x-s/2, u.y-s/2, s, s);
      if((u.owner===0 && BARB[u.kind].boss) || (u.hero && u.owner!==PLAYER && atWar(PLAYER, u.owner))) drawChestIcon(x, u.x, u.y-1.1, 2.2);
      if(u.hero && u.owner===PLAYER){ x.strokeStyle = '#ffd36a'; x.lineWidth = .15; x.strokeRect(u.x-.7, u.y-.7, 1.4, 1.4); }
      continue;
    }
    const HK = hsprKey(u), L = unitLook(u), img = L.img, scl = L.scl, w = L.w, h0 = L.h, dy = L.dy; let h = h0 - dy - (L.rk||L.ev ? 3/16*scl : 0);
    const UC = u.owner>0 && CARDS[u.card];
    if(UC && UC.auraR){ const ar = u.card==='banner' ? bannerR(u.owner) : uStat(u).auraR; x.strokeStyle = u.owner===PLAYER ? 'rgba(255,217,138,'+(L.rk >= 3 ? .4 : .22)+')' : 'rgba(255,255,255,.12)'; x.lineWidth = .05 + .02*L.rk; x.beginPath(); x.arc(u.x, u.y+.1, ar, 0, 6.283); x.stroke(); }
    drawUnitGlow(x, u, L);
    if(u.brace > 0){ x.strokeStyle = 'rgba(216,228,240,.7)'; x.lineWidth = .06; x.beginPath(); x.arc(u.x, u.y, .45*scl, 0, 6.283); x.stroke(); }
    if(u.frenzy > 0){ x.fillStyle = 'rgba(255,90,60,.35)'; x.fillRect(u.x-w*.4, u.y+.2, w*.8, .1); }
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(u.x-w*.35, u.y+.24, w*.7, .07);
    if(u.owner>0 && u.owner===PLAYER && G.buff.rally>0){ x.fillStyle = 'rgba(255,217,138,.35)'; x.fillRect(u.x-w*.4, u.y+.2, w*.8, .1); }
    const lo = u.lg > 0 ? (u.lg/.12)*.22 : 0, ux = u.x + (u.lx||0)*lo, uy = u.y + (u.ly||0)*lo;
    let uh = 0;
    if(HK){ const hh = drawHeroSpr(x, u, HK, ux, uy+.3); if(hh) h = hh; }
    else if(u.owner===0 && (uh = barbDraw(x, u, ux, uy+.3))) h = uh;
    else if(!u.hero && (uh = uSprDraw(x, u, L, ux, uy+.3))) h = uh;
    else if(u.fx < 0){ x.save(); x.translate(ux, 0); x.scale(-1, 1); x.drawImage(img, -w/2, uy+.3-h0+dy, w, h0); x.restore(); }
    else x.drawImage(img, ux-w/2, uy+.3-h0+dy, w, h0);
    if(u.owner>0 && u.owner!==PLAYER){ x.fillStyle = ocol(u.owner); x.fillRect(u.x-.06, u.y+.3-h-.12, .12, .08); }
    if(u.elite && !u.hero){ const em = tintKit('mk_elite', u.owner===PLAYER ? pcol() : ocol(u.owner)); if(em){ const eh = .42, ew = eh*em.width/em.height; x.imageSmoothingEnabled = true; x.drawImage(em, u.x-ew/2, u.y+.3-h-eh-.06, ew, eh); x.imageSmoothingEnabled = false; } }
    if(u.hero){
      if(u.owner===PLAYER){ const pl = .5 + .5*Math.sin((R.now||0)*4); x.strokeStyle = 'rgba(255,211,106,'+(.55+.35*pl)+')'; x.lineWidth = .06; x.beginPath(); x.ellipse(u.x, u.y+.22, .62, .26, 0, 0, 6.283); x.stroke(); }
      if(u.inv > 0){ x.strokeStyle = 'rgba(216,228,240,.8)'; x.lineWidth = .08; x.beginPath(); x.arc(u.x, u.y-.2, .7, 0, 6.283); x.stroke(); }
      if(u.berserk > 0 || u.raid > 0){ x.fillStyle = u.berserk > 0 ? 'rgba(255,90,74,.3)' : 'rgba(255,233,160,.3)'; x.beginPath(); x.ellipse(u.x, u.y+.22, .7, .3, 0, 0, 6.283); x.fill(); }
      if(z >= 11){ x.font = '600 .3px system-ui, sans-serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(0,0,0,.6)'; x.fillText(u.name, u.x+.02, u.y+.3-h-.62); x.fillStyle = u.owner===PLAYER ? '#ffe3a3' : '#fff'; x.fillText(u.name, u.x, u.y+.3-h-.64); }
      x.fillStyle = '#ffd36a'; x.fillRect(u.x-.18, u.y+.3-h-.42, .36, .1); x.fillRect(u.x-.18, u.y+.3-h-.52, .08, .1); x.fillRect(u.x-.04, u.y+.3-h-.56, .08, .14); x.fillRect(u.x+.1, u.y+.3-h-.52, .08, .1);
      x.strokeStyle = u.owner===PLAYER ? 'rgba(255,211,106,.18)' : 'rgba(255,255,255,.12)'; x.lineWidth = .05; x.beginPath(); x.arc(u.x, u.y+.1, gatherR(u.owner), 0, 6.283); x.stroke();
      x.fillStyle = 'rgba(0,0,0,.8)'; x.fillRect(u.x-.8, u.y+.3-h-.25, 1.6, .16);
      x.fillStyle = u.owner===PLAYER ? '#ffd36a' : ocol(u.owner); x.fillRect(u.x-.78, u.y+.3-h-.23, 1.56*clamp(u.hp/uStat(u).hp,0,1), .12);
      if(u.owner!==PLAYER && atWar(PLAYER, u.owner)) drawChestIcon(x, u.x, u.y+.3-h-1.15, 1);
    } else if(u.owner===0 && BARB[u.kind].boss){
      x.fillStyle = 'rgba(0,0,0,.8)'; x.fillRect(u.x-.8, u.y+.3-h-.25, 1.6, .16);
      x.fillStyle = '#ff3b30'; x.fillRect(u.x-.78, u.y+.3-h-.23, 1.56*clamp(u.hp/u.max,0,1), .12);
      drawChestIcon(x, u.x, u.y+.3-h-.6, 1);
    } else if(z >= 13){
      const mx = u.owner>0 ? uStat(u).hp : u.max, f = u.hp/mx;
      if(f < .98){ x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(u.x-.25, u.y+.34, .5, .06); x.fillStyle = f>.5?'#9fd36a':'#e0473b'; x.fillRect(u.x-.25, u.y+.34, .5*f, .06); }
    }
  }

  // Shots and sparks
  x.lineCap = 'round';
  for(const p of R.projs){ if(!vis(p.x1,p.y1,4)) continue; drawProj(x, p); x.globalAlpha = 1; }
  drawFx(x, vis);
  x.globalAlpha = 1;
  if(R.ageFx) ageFxDraw(x, now);
  if(R.fires) for(const f of R.fires){
    if(!vis(f.x, f.y, 2)) continue;
    const a = Math.min(1, f.life/f.max*2), fl = .85 + Math.sin(now*17 + f.x*3)*.15;
    x.globalAlpha = .28*a*fl; x.fillStyle = '#ff7a2a'; x.beginPath(); x.arc(f.x, f.y, f.r, 0, 6.283); x.fill();
    x.globalAlpha = .35*a*fl; x.fillStyle = '#ffd36a'; x.beginPath(); x.arc(f.x, f.y, f.r*.5, 0, 6.283); x.fill();
  }
  if(R.heroMark && R.heroMark.t > 0){ R.heroMark.t -= 1/60; const m = R.heroMark, a = clamp(m.t/.8, 0, 1); if(MAPS.ok){ const e = clamp((.8 - m.t)/.12, 0, 1); mapStamp(x, 'banner', m.x, m.y+.08, .85*(.4 + .6*e), Math.min(1, a*2)); } x.globalAlpha = a; x.strokeStyle = '#ffd36a'; x.lineWidth = .07; x.beginPath(); x.arc(m.x, m.y, .2 + (1-a)*.5, 0, 6.283); x.stroke(); x.globalAlpha = 1; }
  for(const H of (R.hosts||[])){ const r = rival(H.o), c = G.cities.find(k => k.id===H.c); if(!r || !c) continue; const tx = H.go ? c.x+.5 : H.sx, ty = H.go ? c.y+.5 : H.sy;
    x.globalAlpha = .85; x.setLineDash && x.setLineDash([.3,.2]); x.strokeStyle = r.col; x.lineWidth = .09; x.beginPath(); x.moveTo(H.x, H.y); x.lineTo(tx, ty); x.stroke(); x.setLineDash && x.setLineDash([]);
    const ang = Math.atan2(ty-H.y, tx-H.x); x.fillStyle = r.col; x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx - Math.cos(ang-.45)*.6, ty - Math.sin(ang-.45)*.6); x.lineTo(tx - Math.cos(ang+.45)*.6, ty - Math.sin(ang+.45)*.6); x.closePath(); x.fill();
    x.globalAlpha = 1; const hb = kOk('mk_host') ? hostBanner(H.o) : null;
    if(hb){ const bh = 1.5, bw = bh*hb.width/hb.height; x.imageSmoothingEnabled = true; x.drawImage(hb, H.x - bw/2, H.y - .3 - bh, bw, bh); x.fillStyle = 'rgba(8,10,12,.85)'; x.beginPath(); x.arc(H.x + bw*.55, H.y - .3 - bh*.85, .32, 0, 6.283); x.fill(); x.strokeStyle = r.col; x.lineWidth = .06; x.stroke(); x.fillStyle = '#fff1cf'; x.font = '400 .34px StarsPix, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(H.n), H.x + bw*.55, H.y - .3 - bh*.85 + .02); }
    else { x.fillStyle = 'rgba(8,10,12,.85)'; x.beginPath(); x.arc(H.x, H.y-1.2, .55, 0, 6.283); x.fill(); x.strokeStyle = r.col; x.lineWidth = .08; x.stroke();
    x.fillStyle = '#fff1cf'; x.font = '400 .5px StarsPix, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(H.n), H.x, H.y-1.17); } }
  for(const c of G.cities){ if(c.dead || c.owner < 2 || !vis(c.x+.5, c.y+.5, 2)) continue; const r = rival(c.owner); if(!r || !r.vassal) continue; const vb = tintKit('mk_vassal', ocol(c.owner)); if(!vb) continue; const s0 = .8, w0 = s0*vb.width/vb.height; x.globalAlpha = .95; x.imageSmoothingEnabled = true; x.drawImage(vb, c.x+.5 + .75, c.y - .35 - s0, w0, s0); x.globalAlpha = 1; }
  for(const c of G.cities){ if(c.dead || !vis(c.x+.5, c.y+.5, 2)) continue; const unr = c.owner===PLAYER && c.unrest > G.t, lev = c.owner > 1 && G.t - (c.levyQ||-99) < 3; if(!unr && !lev) continue; const k = unr ? 'mk_unrest' : 'mk_levy'; if(!kOk(k)) continue; const im = KIMG[k], s0 = .75 + .06*Math.sin(R.now*6); x.globalAlpha = .95; x.imageSmoothingEnabled = true; x.drawImage(im, c.x+.5 - s0*1.1, c.y - .95 - s0, s0, s0*im.height/im.width); x.globalAlpha = 1; }
  { const hp1 = heroOf(PLAYER), ac = hp1 && hp1.tcity ? G.cities.find(k => k.id===hp1.tcity && !k.dead) : null; if(ac){ const pl = .5 + .5*Math.sin(R.now*6); x.globalAlpha = .6 + .4*pl; x.strokeStyle = '#ff8a5a'; x.lineWidth = .08; x.beginPath(); x.arc(ac.x+.5, ac.y+.5, 1.1 + .1*pl, 0, 6.283); x.stroke(); for(let k=0;k<4;k++){ const a = k*Math.PI/2; x.beginPath(); x.moveTo(ac.x+.5+Math.cos(a)*.8, ac.y+.5+Math.sin(a)*.8); x.lineTo(ac.x+.5+Math.cos(a)*1.4, ac.y+.5+Math.sin(a)*1.4); x.stroke(); } x.globalAlpha = 1; } }
  { const hp0 = heroOf(PLAYER); if(hp0 && hp0.goal){ x.setLineDash && x.setLineDash([.15,.15]); x.strokeStyle = 'rgba(255,211,106,.55)'; x.lineWidth = .05; x.beginPath(); x.moveTo(hp0.x, hp0.y); x.lineTo(hp0.goal.x, hp0.goal.y); x.stroke(); x.setLineDash && x.setLineDash([]); } }
  if(R.rings) for(const r of R.rings){
    if(!vis(r.x, r.y, 3)) continue;
    const t = 1 - r.life/r.max;
    x.globalAlpha = (1-t)*.85; x.strokeStyle = r.col; x.lineWidth = .09;
    x.beginPath(); x.arc(r.x, r.y, r.r0 + (r.r1-r.r0)*t, 0, 6.283); x.stroke();
  }
  x.globalAlpha = 1;
  for(const p of R.parts){ if(!vis(p.x,p.y,1)) continue; x.globalAlpha = clamp(p.life/p.max*1.4,0,1); x.fillStyle = p.col; x.fillRect(p.x-p.sz/2, p.y-p.sz/2, p.sz, p.sz); }
  x.globalAlpha = 1;
  if(R.fogCv && G.seen && !G.arena && !G.demo){ x.imageSmoothingEnabled = true; x.drawImage(R.fogCv, 0, 0, N, N); x.imageSmoothingEnabled = false; }

  // Frontier banner
  if(G.flag){
    const fx=G.flag.x, fy=G.flag.y, ph=(now%1.4)/1.4;
    x.strokeStyle = 'rgba(255,217,138,'+(1-ph)*.7+')'; x.lineWidth = .08;
    x.beginPath(); x.arc(fx,fy,.4+ph*1.6,0,6.283); x.stroke();
    x.fillStyle = '#2a1d0a'; x.fillRect(fx-.06, fy-1.5, .12, 1.5);
    x.fillStyle = '#ffe4a6'; x.fillRect(fx-.03, fy-1.5, .06, 1.5);
    const wv = Math.sin(now*4)*.12;
    x.fillStyle = pcol(); x.strokeStyle = '#2a1d0a'; x.lineWidth = .06;
    x.beginPath(); x.moveTo(fx,fy-1.5); x.lineTo(fx+.95,fy-1.22+wv); x.lineTo(fx,fy-.92); x.closePath(); x.fill(); x.stroke();
  }

  // Screen-space text
  x.setTransform(dpr,0,0,dpr,0,0);
  x.textAlign = 'center'; x.textBaseline = 'top'; x.lineJoin = 'round';
  drawPoiLabels(x, sx, sy);
  if(z >= 7) for(const c of cs){
    const [bx,by] = toScreen(c.x+1.05, c.y-.15), r = z >= 20 ? 9 : 7, col = c.owner===PLAYER ? R.pal[1].L : ocol(c.owner);
    x.fillStyle = 'rgba(8,12,14,.9)'; x.beginPath(); x.arc(bx+sx, by+sy, r+1.5, 0, 6.283); x.fill();
    x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.arc(bx+sx, by+sy, r, 0, 6.283); x.stroke();
    x.fillStyle = c.unrest > G.t ? '#ff8a5a' : '#fff6e0'; x.font = z >= 20 ? '400 14px StarsPix, sans-serif' : '700 9px "Barlow Semi Condensed", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(c.pop), bx+sx, by+sy+.5);
  }
  x.textAlign = 'center'; x.textBaseline = 'top';
  for(const c of cs){
    if(!(z >= 15 || c.capital || G.t - c.born < 5)) continue;
    const [px,py] = toScreen(c.x+.5, c.y+.98);
    x.font = z >= 10 ? '400 '+(c.capital && z >= 24 ? 21 : 14)+'px StarsPix, sans-serif' : '600 11px "Barlow Semi Condensed", sans-serif';
    x.lineWidth = 3; x.strokeStyle = 'rgba(5,8,10,.92)'; x.strokeText(c.name, px+sx, py+sy);
    x.fillStyle = c.owner===PLAYER ? R.pal[1].L : ocol(c.owner); x.fillText(c.name, px+sx, py+sy);
  }
  x.textBaseline = 'middle';
  for(const f of R.floats){
    if(!fogSeen(f.x, f.y)) continue;
    const [px,py] = toScreen(f.x, f.y);
    x.globalAlpha = clamp(f.life/f.max*1.5,0,1);
    x.font = '400 '+(f.big ? 28 : 14)+'px StarsPix, sans-serif';
    x.lineWidth = f.big ? 4.5 : 3.5; x.strokeStyle = 'rgba(5,8,10,.95)'; x.strokeText(f.text, px, py);
    x.fillStyle = f.col; x.fillText(f.text, px, py);
  }
  x.globalAlpha = 1;
  if(G.settle && R.hover && R.sites){
    const st = R.sites.find(q => q.x===R.hover.x && q.y===R.hover.y);
    if(st){
      const lines = ['Food '+st.inf.f.toFixed(0)+' · Production '+st.inf.p.toFixed(0)+' · Science '+st.inf.s.toFixed(0)];
      if(st.inf.hill) lines.push('Hills: +40% city health, longer tower range');
      if(st.inf.coast) lines.push('Coastal');
      if(st.inf.foreign) lines.push('Presses on a rival border');
      x.font = '600 12px "Barlow Semi Condensed", sans-serif'; x.textAlign = 'left'; x.textBaseline = 'top';
      const w = Math.max(...lines.map(l => x.measureText(l).width)) + 16, h = lines.length*16 + 10;
      let [px,py] = toScreen(st.x+1.15, st.y); px = Math.min(px, VW-w-6); py = clamp(py, 6, VH-h-6);
      x.fillStyle = 'rgba(10,18,14,.94)'; x.fillRect(px, py, w, h);
      x.strokeStyle = '#8fd08f'; x.lineWidth = 1; x.strokeRect(px+.5, py+.5, w-1, h-1);
      lines.forEach((l,i) => { x.fillStyle = i===0 ? '#eaffe0' : '#b8d8b0'; x.fillText(l, px+8, py+6+i*16); });
    }
  }
  if(G.ended){ x.fillStyle = 'rgba(40,6,4,.35)'; x.fillRect(0,0,VW,VH); }
  if(R.whiteT > 0 && !modal){ R.whiteT -= 1/60; x.setTransform(dpr,0,0,dpr,0,0); x.fillStyle = 'rgba(255,240,205,'+Math.max(0, R.whiteT)*.75+')'; x.fillRect(0,0,VW,VH); }
}

let miniAcc = 0;
function drawMini(){
  const m = mctx; if(!m || !G || !m.setTransform) return;
  const W = mini.width, s = W/N;
  m.setTransform(1,0,0,1,0,0);
  m.imageSmoothingEnabled = false;
  m.drawImage(miniBase, 0, 0, W, W);
  m.fillStyle = 'rgba(2,5,8,.18)'; m.fillRect(0,0,W,W);
  const og = miniOwn.getContext && miniOwn.getContext('2d');
  if(og && og.createImageData){
    const im = og.createImageData(N, N), dd = im.data;
    for(let i=0;i<N*N;i++){ const o = G.own[i]; if(!o) continue; const rgb = R.rgb[o]; if(!rgb) continue; const edge = (i%N===0 || G.own[i-1]!==o || G.own[i+1]!==o || G.own[i-N]!==o || G.own[i+N]!==o); dd[i*4]=rgb[0]; dd[i*4+1]=rgb[1]; dd[i*4+2]=rgb[2]; dd[i*4+3]=edge ? 255 : 120; }
    og.putImageData(im, 0, 0);
    m.drawImage(miniOwn, 0, 0, W, W);
  }
  if(R.fogCv && G.seen){ m.imageSmoothingEnabled = true; m.drawImage(R.fogCv, 0, 0, W, W); m.imageSmoothingEnabled = false; }
  drawPoiMini(m, s);
  for(const [key,f] of R.fights){
    const a = R.now - f.t; if(a > 1.2){ R.fights.delete(key); continue; } if(!fogSeen(f.x, f.y)) continue;
    m.fillStyle = 'rgba(255,190,90,'+(1-a/1.2)+')'; m.beginPath(); m.arc(f.x*s, f.y*s, (2+a*3)*dpr, 0, 6.283); m.fill();
  }
  for(const c of G.cities){ if(!fogSeen(c.x, c.y)) continue; const cr = (c.capital ? 4.2 : 2.8)*dpr*(W > 160*dpr ? 1.25 : 1); m.fillStyle = '#05080a'; m.fillRect((c.x+.5)*s - cr/2 - dpr, (c.y+.5)*s - cr/2 - dpr, cr + 2*dpr, cr + 2*dpr); m.fillStyle = c.owner===PLAYER ? '#fff1cf' : ocol(c.owner); m.fillRect((c.x+.5)*s - cr/2, (c.y+.5)*s - cr/2, cr, cr); }
  m.fillStyle = '#ff5040';
  for(const u of G.units){ if(u.owner!==0 || !(BARB[u.kind].boss || fogSee(u.x, u.y))) continue; const r = BARB[u.kind].boss ? 3*dpr : 1.2*dpr; m.fillRect(u.x*s-r/2, u.y*s-r/2, r, r); }
  { const pl = .5 + .5*Math.sin(R.now*5);
    for(const u of G.units){
      if(u.hp<=0 || !((u.owner===0 && BARB[u.kind].boss) || (u.hero && u.owner!==PLAYER && atWar(PLAYER, u.owner) && fogSee(u.x, u.y)))) continue;
      m.strokeStyle = 'rgba(255,211,106,'+(.5+.5*pl)+')'; m.lineWidth = 1.5*dpr; m.beginPath(); m.arc(u.x*s, u.y*s, (4+2*pl)*dpr, 0, 6.283); m.stroke();
      m.fillStyle = '#ffd36a'; m.fillRect(u.x*s-2*dpr, u.y*s-1.5*dpr, 4*dpr, 3*dpr);
    } }
  for(const u of G.units){ if(!u.hero || u.hp<=0 || (u.owner!==PLAYER && !fogSee(u.x, u.y))) continue; m.fillStyle = u.owner===PLAYER ? '#ffffff' : ocol(u.owner); m.beginPath(); m.arc(u.x*s, u.y*s, (u.owner===PLAYER ? 3.2 : 2.4)*dpr, 0, 6.283); m.fill(); if(u.owner===PLAYER){ m.strokeStyle = '#ffd36a'; m.lineWidth = 1.5*dpr; m.stroke(); } }
  for(const H of (R.hosts||[])){ const r = rival(H.o), c = G.cities.find(k => k.id===H.c); if(!r || !c) continue; m.strokeStyle = r.col; m.lineWidth = 2*dpr; m.beginPath(); m.moveTo(H.x*s, H.y*s); m.lineTo((c.x+.5)*s, (c.y+.5)*s); m.stroke(); m.fillStyle = r.col; m.beginPath(); m.arc(H.x*s, H.y*s, 4*dpr, 0, 6.283); m.fill(); }
  if(G.warn){ const p = edgePoint(G.warn.side, G.warn.pos, 0); m.fillStyle = 'rgba(255,60,40,'+(.5+Math.sin(R.now*8)*.4)+')'; m.beginPath(); m.arc(p[0]*s, p[1]*s, 4*dpr, 0, 6.283); m.fill(); }
  const hw = VW/2/CAM.z, hh = VH/2/CAM.z;
  m.strokeStyle = 'rgba(255,240,210,.95)'; m.lineWidth = 1.8*dpr;
  m.strokeRect((CAM.x-hw)*s, (CAM.y-hh)*s, hw*2*s, hh*2*s);
}
