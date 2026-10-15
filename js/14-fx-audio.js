"use strict";
/* ---------- FX ---------- */
function burst(x,y,n,col){
  for(let i=0;i<n;i++){ const a=Math.random()*6.283, s=rnd(.6,2.4); R.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-.4,life:rnd(.35,.8),max:.8,col,sz:rnd(.06,.12)}); }
  if(R.parts.length > 800) R.parts.splice(0, R.parts.length-800);
}
function float(text,x,y,col,life){ R.floats.push({text,x,y,col,life:life||1.2,max:life||1.2}); }
function fxStep(dt){
  for(const p of R.parts){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=.92; p.vy*=.92; p.life-=dt; }
  R.parts = R.parts.filter(p => p.life > 0);
  for(const p of R.projs) p.life -= dt;
  fxTick(dt);
  R.projs = R.projs.filter(p => p.life > 0);
  for(const f of R.floats){ f.y -= dt*.5; f.life -= dt; }
  R.floats = R.floats.filter(f => f.life > 0);
  if(R.rings){ for(const r of R.rings) r.life -= dt; R.rings = R.rings.filter(r => r.life > 0); }
  for(const cp of R.corpses) cp.t += dt;
  R.corpses = R.corpses.filter(cp => cp.t < 1.6);
  R.shake = Math.max(0, Math.min(R.shake, 6) - dt*18);
}
function toast(msg,kind,at){
  if(G && G.demo) return;
  const box = $('#toasts'); if(!box || !box.appendChild) return;
  const el = document.createElement('div'); el.className = 'toast '+(kind||'')+(at?' link':''); el.textContent = msg;
  if(at) el.addEventListener('click', () => { if(at.watch && G){ R.follow = {x:at.x, y:at.y, t:.3}; R.camTo = {x:at.x, y:at.y}; R.camZ = 28; syncWatch(); } else focusOn(at.x, at.y); el.remove(); });
  box.appendChild(el);
  while(box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), at ? (at.watch ? 7000 : 4200) : 2800);
}
function banner(title, kicker, img){
  if(G && G.demo) return;
  const b = $('#banner'); if(!b) return;
  b.innerHTML = '<div>'+(img ? '<img class="bn-img" src="'+img+'" alt="">' : '')+'<small>'+esc(kicker)+'</small><strong>'+esc(title)+'</strong></div>';
}

/* ---------- Sound ---------- */
const SFX = {
  ctx:null, master:null, on:true, last:{},
  init(){
    if(this.ctx){ if(this.ctx.state==='suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.on ? .55 : 0; this.master.connect(this.ctx.destination);
      MUS.start();
    } catch(e){ this.ctx = null; }
  },
  setOn(v){ this.on = v; if(this.master) this.master.gain.setTargetAtTime(v ? .55 : 0, this.ctx.currentTime, .05); },
  can(k,gap){ const n=performance.now(); if(this.last[k] && n-this.last[k] < gap) return false; this.last[k]=n; return true; },
  tone(f,d,type,v,f2,delay){
    if(!this.ctx || !this.on || (G && G.demo)) return;
    const t = this.ctx.currentTime + (delay||0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type||'sine'; o.frequency.setValueAtTime(f,t);
    if(f2) o.frequency.exponentialRampToValueAtTime(f2, t+d);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v||.1, t+.012); g.gain.exponentialRampToValueAtTime(.0001, t+d);
    o.connect(g); g.connect(this.bus ? (this.bus() || this.master) : this.master); o.start(t); o.stop(t+d+.05);
  },
  noise(d,v,freq){
    if(!this.ctx || !this.on || (G && G.demo)) return;
    const t = this.ctx.currentTime, len = Math.floor(this.ctx.sampleRate*d);
    const buf = this.ctx.createBuffer(1,len,this.ctx.sampleRate), ch = buf.getChannelData(0);
    for(let i=0;i<len;i++) ch[i] = (Math.random()*2-1)*(1-i/len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=1.2;
    const g = this.ctx.createGain(); g.gain.value = v;
    src.connect(f); f.connect(g); g.connect(this.bus ? (this.bus() || this.master) : this.master); src.start(t);
  },
  drone(){
    try {
      const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter();
      lp.type='lowpass'; lp.frequency.value=380; g.gain.value=.045;
      [55, 82.4, 110.6].forEach((f,i) => { const o=c.createOscillator(); o.type=i===2?'triangle':'sine'; o.frequency.value=f; o.detune.value=rnd(-6,6); o.connect(lp); o.start(); });
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value=.07; lg.gain.value=.02; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      lp.connect(g); g.connect(this.master);
    } catch(e){}
  },
  shot(){ if(this.can('shot',70)) this.noise(.05,.05,2600); },
  kill(){ if(this.can('kill',55)) this.tone(rnd(280,360),.12,'triangle',.05,110); },
  thud(){ if(this.can('thud',180)) this.tone(95,.28,'sine',.22,45); },
  found(){ [523,659,784].forEach((f,i) => this.tone(f,.6,'triangle',.07,null,i*.09)); },
  open(){ this.tone(880,.35,'sine',.05,1320); },
  pick(){ this.tone(660,.2,'triangle',.08); this.tone(990,.4,'triangle',.06,null,.08); },
  era(){ [196,294,392,523].forEach((f,i) => this.tone(f,1.4,'sawtooth',.035,null,i*.16)); },
  decree(){ this.tone(220,.5,'square',.04,440); },
  fall(){ this.tone(160,1.1,'sawtooth',.07,40); },
  tele(){ if(this.can('tele',600)){ this.tone(220,.9,'sawtooth',.035,660); this.tone(233,.9,'sawtooth',.025,700); } },
  warn(){ if(this.can('warn',800)){ this.tone(110,.7,'sawtooth',.04,82); this.tone(116,.7,'sawtooth',.03,86); } },
  tick(){ this.tone(1200,.05,'square',.02); }
};

/* ---------- Combat sound bank: procedural, on-screen only, merged into volleys, with a budget ---------- */
Object.assign(SFX, {
  vol:.8, Q:{}, lastK:{},
  GAP:{whoosh:55, clang:70, thud:70, twang:45, clack:60, sling:60, musket:90, crack:45, mg:130, cannon:150, boom:120, rocket:130, zap:50, rail:150, wub:110, fire:130, chime:450, horn:3500, hooves:350, stomp:160, thunk:90, warcry:900, gong:700, hail:400, storm:600, pierce:300, blast:400, thunder:700, quake:700, meteor:700, choir:900, fanfare:1200},
  bus(){
    if(!this.ctx) return null;
    if(!this.fx){ this.fx = this.ctx.createGain(); this.fx.gain.value = this.vol; this.fx.connect(this.master); }
    if(!this.nb){ const n = this.ctx.sampleRate*2, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), ch = b.getChannelData(0); for(let i=0;i<n;i++) ch[i] = Math.random()*2-1; this.nb = b; }
    return this.fx;
  },
  setVol(v){ this.vol = v; if(this.fx) this.fx.gain.setTargetAtTime(v, this.ctx.currentTime, .05); try { localStorage.setItem('eh-sfxvol', String(v)); } catch(e){} },
  q(k, x, y, w){
    if(!this.on || !this.ctx) return;
    const v = this.spatial(x, y); if(v <= 0) return;
    const e = this.Q[k] || (this.Q[k] = {n:0, v:0});
    e.n++; e.v = Math.max(e.v, v*(w||1));
  },
  spatial(x, y){
    if(G && G.arena) return .7;
    if(typeof VW==='undefined' || !VW || !onScr(x, y, .5)) return 0;
    const zf = clamp((CAM.z - 5)/28, .3, 1), d = Math.hypot(x-CAM.x, y-CAM.y)/(VW/2/CAM.z);
    return zf*(1 - .5*Math.min(1, d));
  },
  flush(){
    if(!this.ctx || !this.on) { this.Q = {}; return; }
    const now = performance.now(); let played = 0;
    const keys = Object.keys(this.Q).sort((a,b) => this.Q[b].v - this.Q[a].v);
    for(const k of keys){
      const e = this.Q[k];
      if(played >= 6) break;
      if(this.lastK[k] && now - this.lastK[k] < (this.GAP[k]||60)) continue;
      this.lastK[k] = now; played++;
      this.play(k, Math.min(1.5, e.v*(1 + Math.log2(e.n)*.22)), e.n);
      delete this.Q[k];
    }
    for(const k in this.Q) if(this.Q[k].n > 40) delete this.Q[k];
  },
  nz(t, d, type, f0, q, v, f1){
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.nb;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); if(f1) f.frequency.exponentialRampToValueAtTime(f1, t+d); f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t+.006); g.gain.exponentialRampToValueAtTime(.0001, t+d);
    src.connect(f); f.connect(g); g.connect(this.fx); src.start(t, Math.random()*1.5); src.stop(t+d+.05);
  },
  os(t, d, type, f0, f1, v, lp){
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if(f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t+d);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t+.005); g.gain.exponentialRampToValueAtTime(.0001, t+d);
    if(lp){ const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(this.fx); o.start(t); o.stop(t+d+.05);
  },
  play(k, v, n){
    if(!this.bus()) return;
    const t = this.ctx.currentTime + Math.random()*.015, p = rnd(.92, 1.08), V = v*.55;
    switch(k){
      case 'whoosh': this.nz(t, .14, 'bandpass', 700*p, 1.2, V*1.1, 2600); break;
      case 'thud': this.os(t, .14, 'sine', 150*p, 55, V*.8); this.nz(t, .06, 'lowpass', 500, .7, V*.35); break;
      case 'clang': this.os(t, .2, 'triangle', 1650*p, 1600, V*.22); this.os(t, .15, 'square', 2480*p, 2420, V*.05, 5000); this.nz(t, .04, 'highpass', 4200, .7, V*.2); break;
      case 'twang': this.os(t, .2, 'triangle', 240*p, 170, V*.45, 1800); this.os(t+.03, .16, 'sine', 2200*p, 1300, V*.06); break;
      case 'thunk': this.nz(t, .07, 'lowpass', 650, 1, V*.4); break;
      case 'clack': this.nz(t, .05, 'bandpass', 1400*p, 2, V*.55); this.os(t, .09, 'square', 190, 90, V*.12, 1200); break;
      case 'sling': this.nz(t, .14, 'bandpass', 1800*p, 3, V*.25, 900); break;
      case 'musket':
        if(n >= 4){ for(let i=0;i<Math.min(6, n);i++){ const tt = t + i*.045 + Math.random()*.03; this.nz(tt, .5, 'lowpass', 1500, .7, V*.5, 260); } this.os(t, .5, 'sine', 85, 38, V*.8); }
        else { this.nz(t, .34, 'lowpass', 1500*p, .7, V*.8, 280); this.os(t, .2, 'sine', 95, 40, V*.55); }
        break;
      case 'crack': this.nz(t, .05, 'highpass', 2600*p, .7, V*.6); this.os(t, .07, 'sine', 170, 70, V*.22); if(n >= 4) for(let i=1;i<4;i++) this.nz(t+i*.05, .05, 'highpass', 2400, .7, V*.4); break;
      case 'mg': for(let i=0;i<5;i++){ this.nz(t+i*.065, .045, 'highpass', 2300*p, .7, V*.5); this.os(t+i*.065, .05, 'sine', 140, 70, V*.18); } break;
      case 'cannon': this.os(t, .75, 'sine', 64*p, 32, V*.75); this.nz(t, .95, 'lowpass', 520, .7, V*.6, 110); break;
      case 'boom': this.nz(t, .85, 'lowpass', 1900*p, .7, V*.85, 140); this.os(t, .45, 'sine', 82, 34, V*.75); break;
      case 'rocket': this.nz(t, .45, 'bandpass', 600*p, 1, V*1.2, 2200); break;
      case 'zap': this.os(t, .14, 'sawtooth', 1500*p, 260, V*.18, 3200); this.os(t, .1, 'sine', 900, 1800, V*.08); break;
      case 'rail': this.os(t, .18, 'sine', 300, 2400*p, V*.12); this.nz(t+.18, .07, 'highpass', 3000, .7, V*.7); this.os(t+.18, .25, 'sine', 120, 50, V*.4); break;
      case 'wub': this.os(t, .32, 'sine', 230*p, 80, V*.4); this.os(t, .3, 'square', 115*p, 55, V*.05, 900); break;
      case 'fire': this.nz(t, .38, 'bandpass', 900*p, .8, V*.4, 500); for(let i=0;i<3;i++) this.nz(t+Math.random()*.3, .02, 'highpass', 3500, .7, V*.25); break;
      case 'chime': this.os(t, .5, 'sine', 1320*p, 1320, V*.09); this.os(t+.06, .5, 'sine', 1980*p, 1980, V*.06); break;
      case 'horn': this.os(t, .5, 'sawtooth', 220, 222, V*.07, 900); this.os(t+.25, .4, 'sawtooth', 330, 330, V*.05, 900); break;
      case 'hooves': for(let i=0;i<4;i++) this.os(t+i*.07, .09, 'sine', 120+Math.random()*30, 60, V*.4); break;
      case 'stomp': this.os(t, .45, 'sine', 72*p, 30, V*.8); this.nz(t, .3, 'lowpass', 400, .7, V*.45); break;
      case 'warcry': this.nz(t, .6, 'bandpass', 420*p, 2, V*.7, 300); this.os(t, .55, 'sawtooth', 150*p, 110, V*.14, 900); this.os(t+.05, .5, 'sawtooth', 190*p, 140, V*.1, 900); break;
      case 'gong': this.os(t, 1.2, 'sine', 110*p, 104, V*.5); this.os(t, .9, 'triangle', 330*p, 320, V*.12, 2400); this.nz(t, .05, 'bandpass', 900, 2, V*.3); break;
      case 'hail': for(let i=0;i<9;i++) this.nz(t+i*.05+Math.random()*.03, .05, 'bandpass', 1500+Math.random()*700, 2, V*.35); break;
      case 'storm': this.nz(t, .5, 'bandpass', 900*p, .9, V*.9, 2600); for(let i=0;i<10;i++) this.nz(t+.35+i*.04+Math.random()*.03, .04, 'lowpass', 700, .7, V*.3); break;
      case 'pierce': this.os(t, .22, 'sawtooth', 2600*p, 900, V*.12, 6000); this.nz(t, .12, 'highpass', 3200, .7, V*.5); break;
      case 'blast': this.nz(t, 1.3, 'lowpass', 2400*p, .7, V*1.1, 90); this.os(t, .8, 'sine', 70, 28, V*.95); break;
      case 'thunder': for(let i=0;i<8;i++) this.os(t+i*.06, .1, 'sine', 110+Math.random()*30, 50, V*.5); this.os(t+.2, .6, 'sawtooth', 262, 262, V*.06, 1400); this.os(t+.35, .6, 'sawtooth', 392, 392, V*.05, 1400); break;
      case 'quake': this.os(t, 1.1, 'sine', 48*p, 26, V*1); this.nz(t, 1, 'lowpass', 260, .7, V*.8, 60); break;
      case 'meteor': this.os(t, .6, 'sine', 1600*p, 300, V*.12); this.nz(t, .6, 'bandpass', 1800, 1, V*.3, 500); this.os(t+.6, .9, 'sine', 60, 26, V*1); this.nz(t+.6, 1, 'lowpass', 1600, .7, V*.9, 100); break;
      case 'choir': for(const fq of [523, 659, 784, 1047]) this.os(t, 1.1, 'sine', fq*p, fq*p, V*.07); break;
      case 'fanfare': [392, 523, 659, 784].forEach((fq, i) => this.os(t+i*.11, .35, 'sawtooth', fq, fq, V*.06, 1800)); break;
    }
  }
});
const SHOT_SND = {arrow:'twang', javelin:'whoosh', bolt:'clack', rock:'sling', musket:'musket', bullet:'crack', shell:'cannon', bomb:'whoosh', rocket:'rocket', fire:'fire', laser:'zap', rail:'rail', plasma:'wub', ball:'cannon'};

/* ---------- Music: an original, generative score that grows with your era ---------- */
const MODES = {dorian:[0,2,3,5,7,9,10], aeolian:[0,2,3,5,7,8,10], mixo:[0,2,4,5,7,9,10], major:[0,2,4,5,7,9,11], harm:[0,2,3,5,7,8,11]};
const MERAS = [
  {t:'Dawn of Tribes', n:'Ancient', root:50, mode:'dorian', bpm:78, steps:8, prog:[0,6,0,3,0,6,4,0], mel:'flute', acc:'lute', pat:[0,-1,2,1,3,-1,2,1], pad:'drone', bass:'none', drum:'frame', dpat:[[0,.9],[3,.5],[6,.6]]},
  {t:'Olive and Bronze', n:'Classical', root:45, mode:'aeolian', bpm:82, steps:8, prog:[0,5,2,6,0,5,3,0], mel:'flute', acc:'harp', pat:[0,2,4,2,3,2,4,2], pad:'strings', bass:'harp', drum:'frame', dpat:[[0,.7],[4,.4]]},
  {t:'Banners of the Keep', n:'Medieval', root:43, mode:'mixo', bpm:92, steps:8, prog:[0,6,3,0,0,6,4,0], mel:'recorder', acc:'lute', pat:[0,2,1,2,0,2,1,2], pad:'organ', bass:'lute', drum:'tabor', dpat:[[0,.8],[2,.35],[3,.5],[4,.7],[6,.45]]},
  {t:'Age of Sail', n:'Renaissance', root:43, mode:'major', bpm:104, steps:6, prog:[0,4,5,3,0,4,3,0], mel:'recorder', acc:'harpsi', pat:[0,1,2,3,2,1], pad:'strings', bass:'harpsi', drum:'none', dpat:[]},
  {t:'Steam and Steel', n:'Industrial', root:48, mode:'major', bpm:100, steps:8, prog:[0,5,3,4,0,5,1,0], mel:'horn', acc:'piano', pat:[0,2,1,2,3,2,1,2], pad:'strings', bass:'piano', drum:'snare', dpat:[[0,.6],[2,.3],[4,.5],[6,.3],[7,.25]]},
  {t:'The Long Peace', n:'Modern', root:39, mode:'major', bpm:92, steps:8, prog:[0,5,3,4,0,2,3,0], mel:'brass', acc:'pizz', pat:[0,-1,0,-1,2,-1,1,-1], pad:'strings', bass:'pizz', drum:'timp', dpat:[[0,.9],[4,.6]]}
];
/* More pieces per era. The score rotates every few minutes, like a Civilization soundtrack */
const MEXTRA = [
  [ {t:'River Valley', root:52, mode:'aeolian', bpm:66, steps:6, prog:[0,3,0,4,5,3,4,0], mel:'oboe', acc:'harp', pat:[0,1,2,3,2,1], pad:'drone', bass:'none', drum:'bodhran', dpat:[[0,.7],[3,.4]]},
    {t:'Stone and Fire', root:45, mode:'dorian', bpm:96, steps:8, prog:[0,0,6,6,3,3,4,0], mel:'pipes', acc:'lute', pat:[0,-1,2,-1,1,2,3,-1], pad:'drone', bass:'none', drum:'taiko', dpat:[[0,.9],[3,.5],[5,.6],[6,.4]]} ],
  [ {t:'Marble Halls', root:50, mode:'dorian', bpm:72, steps:6, prog:[0,3,6,4,0,3,4,0], mel:'oboe', acc:'harp', pat:[0,2,4,2,4,2], pad:'choir', bass:'harp', drum:'none', dpat:[], harm:1},
    {t:'Legions on the Road', root:43, mode:'aeolian', bpm:100, steps:8, prog:[0,6,5,4,0,6,4,0], mel:'horn', acc:'lute', pat:[0,2,1,2,0,2,1,2], pad:'strings', bass:'cello', drum:'march', dpat:[[0,.8],[2,.4],[4,.7],[6,.4],[7,.3]]} ],
  [ {t:'Cloister Chant', root:50, mode:'dorian', bpm:64, steps:8, prog:[0,6,0,3,0,6,4,0], mel:'choir', mel2:'recorder', acc:'bells', pat:[0,-1,-1,-1,2,-1,-1,-1], pad:'organ', bass:'none', drum:'none', dpat:[]},
    {t:'The Tourney', root:45, mode:'mixo', bpm:112, steps:6, prog:[0,0,6,6,0,0,4,0], mel:'pipes', acc:'lute', pat:[0,1,2,0,1,2], pad:'drone', bass:'lute', drum:'bodhran', dpat:[[0,.8],[2,.3],[3,.6],[5,.3]]} ],
  [ {t:'Courtly Pavane', root:48, mode:'aeolian', bpm:80, steps:8, prog:[0,5,6,2,0,5,4,0], mel:'oboe', acc:'guitar', pat:[0,2,1,2,3,2,1,2], pad:'strings', bass:'cello', drum:'tabor', dpat:[[0,.6],[4,.4]], harm:1},
    {t:'New World Horizons', root:46, mode:'major', bpm:96, steps:8, prog:[0,3,4,0,5,3,4,0], mel:'flute', mel2:'horn', acc:'harpsi', pat:[0,1,2,3,4,3,2,1], pad:'choir', bass:'harpsi', drum:'tamb', dpat:[[0,.5],[4,.4]], harm:1} ],
  [ {t:'Ironworks', root:43, mode:'aeolian', bpm:108, steps:8, prog:[0,0,5,5,3,3,4,4], mel:'brass', acc:'piano', pat:[0,2,0,2,1,2,0,2], pad:'strings', bass:'cello', drum:'march', dpat:[[0,.7],[2,.35],[3,.25],[4,.6],[6,.35],[7,.3]]},
    {t:'Parlour Waltz', root:48, mode:'major', bpm:120, steps:6, prog:[0,3,4,0,5,1,4,0], mel:'flute', mel2:'oboe', acc:'piano', pat:[-1,-1,1,-1,2,-1], pad:'strings', bass:'cello', drum:'none', dpat:[], harm:1} ],
  [ {t:'Atomic Dawn', root:41, mode:'aeolian', bpm:84, steps:8, prog:[0,5,3,6,0,5,4,0], mel:'brass', acc:'bells', pat:[0,-1,2,-1,4,-1,2,-1], pad:'choir', bass:'cello', drum:'timp', dpat:[[0,.9],[4,.5]], harm:1},
    {t:'Orbit', root:45, mode:'mixo', bpm:100, steps:8, prog:[0,6,3,0,0,6,4,0], mel:'bells', mel2:'flute', acc:'pizz', pat:[0,1,2,1,0,1,2,1], pad:'strings', bass:'pizz', drum:'snare', dpat:[[0,.5],[2,.25],[4,.5],[6,.25]]} ]
];
const MTITLE = {t:'Spears to Stars', root:48, mode:'major', bpm:72, steps:8, prog:[0,3,4,0,5,3,4,0], mel:'horn', mel2:'brass', acc:'harp', pat:[0,1,2,3,4,3,2,1], pad:'choir', bass:'cello', drum:'timp', dpat:[[0,.7]], harm:1};
const MUS = {
  vol:.8, on:true, pi:0, key:'', heat:0, duck:0, ready:false, bus:null, out:null, timer:null, next:0, bar:0, step:0, sec:0, cyc:0, cfg:null, eraIdx:-1, war:false, theme:null, part:null, prev:3,
  start(){
    const c = SFX.ctx; if(!c || this.ready) return;
    try { const v = localStorage.getItem('eh-music'); if(v==='0') this.on = false; } catch(e){}
    this.out = c.createGain(); this.out.gain.value = .0001; this.out.connect(SFX.master);
    const len = Math.floor(c.sampleRate*2.8), ir = c.createBuffer(2, len, c.sampleRate);
    for(let ch=0; ch<2; ch++){ const d = ir.getChannelData(ch); for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 2.8); }
    const rev = c.createConvolver(); rev.buffer = ir;
    const wet = c.createGain(); wet.gain.value = .34; rev.connect(wet); wet.connect(this.out);
    const dry = c.createGain(); dry.gain.value = .85; dry.connect(this.out);
    this.bus = c.createGain(); this.bus.connect(dry); this.bus.connect(rev);
    this.jout = c.createGain(); this.jout.gain.value = 1.1; this.jout.connect(SFX.master);
    const jrev = c.createConvolver(); jrev.buffer = ir; const jwet = c.createGain(); jwet.gain.value = .3; jrev.connect(jwet); jwet.connect(this.jout);
    const jdry = c.createGain(); jdry.gain.value = .9; jdry.connect(this.jout);
    this.jbus = c.createGain(); this.jbus.connect(jdry); this.jbus.connect(jrev);
    this.ready = true; this.next = c.currentTime + .3;
    this.out.gain.setTargetAtTime(this.on ? 1.25*this.vol : 0, c.currentTime, 2);
    this.timer = setInterval(() => this.tick(), 50);
  },
  setOn(v){
    this.on = v; try { localStorage.setItem('eh-music', v ? '1' : '0'); } catch(e){}
    if(this.out) this.out.gain.setTargetAtTime(v ? 1.25*this.vol : 0, SFX.ctx.currentTime, .4);
  },
  setVol(v){ this.vol = v; try { localStorage.setItem('eh-musvol', String(v)); } catch(e){} if(this.out && this.on) this.out.gain.setTargetAtTime(1.25*v, SFX.ctx.currentTime, .2); },
  rng(seed){ let a = seed|0; return () => { a = a+0x6D2B79F5|0; let t = Math.imul(a^a>>>15, 1|a); t = t+Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; },
  /* scale degree -> midi, degrees can run past an octave */
  pitch(cfg, deg, oct){ const sc = MODES[cfg.mode], o = Math.floor(deg/7), i = ((deg%7)+7)%7; return cfg.root + 12*(oct + o) + sc[i]; },
  chordTones(root){ return [root, root+2, root+4]; },
  /* a two-bar melodic phrase against two chords; ends long when cadence is set */
  phrase(r, cfg, chords, startDeg, cadence, endDeg){
    const RH8 = [[2,2,2,2],[3,1,2,2],[2,1,1,4],[4,2,2],[2,2,4],[1,1,2,2,2],[3,1,4],[2,2,2,1,1],[6,2]], RH6 = [[2,2,2],[3,1,2],[4,2],[2,1,1,2],[1,1,2,2]];
    const END8 = [[2,2,4],[4,4],[3,1,4],[8]], END6 = [[2,4],[6],[3,3]];
    const out = []; let deg = startDeg;
    for(let b=0; b<2; b++){
      const last = b===1 && cadence, pool = cfg.steps===6 ? (last ? END6 : RH6) : (last ? END8 : RH8), rh = pool[Math.floor(r()*pool.length)];
      const ct = this.chordTones(chords[b]); let s = 0;
      rh.forEach((d, k) => {
        if(k===0){ let best = 99, pick = deg; for(const t of ct) for(const o of [-7,0,7]){ const c = t+o; if(c < 0 || c > 10) continue; const dd = Math.abs(c-deg) + r()*.8; if(dd < best){ best = dd; pick = c; } } deg = pick; }
        else if(last && k===rh.length-1) deg = endDeg;
        else { const x = r(); deg += x < .38 ? 1 : x < .76 ? -1 : x < .88 ? (r()<.5 ? 2 : -2) : 0; deg = Math.max(0, Math.min(10, deg)); }
        const rest = k>0 && !last && d===1 && r() < .2;
        out.push({b, s, d, deg: rest ? null : deg});
        s += d;
      });
    }
    return out;
  },
  build(cfg, seed){
    const r = this.rng(seed), P = cfg.prog;
    const p1 = this.phrase(r, cfg, [P[0],P[1]], 4, false), p2 = this.phrase(r, cfg, [P[2],P[3]], p1[p1.length-1].deg ?? 4, true, P[3]===0 ? 4 : P[3]%7);
    const p4 = this.phrase(r, cfg, [P[6],P[7]], 4, true, 7);
    return [p1, p2, p1, p4];
  },
  pieces(e){ return [MERAS[Math.min(5, e)]].concat(MEXTRA[Math.min(5, e)]); },
  pickCfg(){
    if(!G || !running){ return {cfg:MTITLE, e:-1, war:false, ctx:'title'}; }
    const e = G.eraIdx, list = this.pieces(e), base = list[this.pi % list.length];
    const crisis = !G.ended && (G.coal || !!(G.proj && G.proj.parts));
    const war = !G.ended && warringAny(PLAYER);
    if(crisis){
      const cfg = Object.assign({}, base, {t:'The World Against You', mode:'harm', bpm:base.bpm+4, steps:8, prog:[0,0,5,5,3,3,4,4], pat:[0,2,1,2,0,2,1,2], mel:e >= 3 ? 'brass' : 'horn', mel2:'choir', pad:'choir', bass:'cello', drum:'taiko', dpat:[[0,1],[2,.45],[3,.6],[4,.9],[6,.6],[7,.5]], harm:1});
      return {cfg, e, war:true, ctx:'crisis'};
    }
    if(!war) return {cfg:base, e, war, ctx:'peace'};
    const cfg = Object.assign({}, base, {t:base.t+' (war)', mode:'harm', bpm:base.bpm+8, prog:[0,0,5,5,3,3,4,4], drum:e>=3 ? 'timp' : 'war', dpat:[[0,1],[3,.55],[4,.8],[6,.6],[7,.4]], pad:'strings'});
    if(cfg.steps===6) cfg.dpat = [[0,1],[2,.5],[3,.8],[5,.5]];
    return {cfg, e, war, ctx:'war'};
  },
  nowPlaying(){ return this.cfg ? this.cfg.t : ''; },
  skip(){ this.pi++; this.key = ''; this.sec = 0; this.bar = 0; this.step = 0; },
  newSection(){
    if(this.sec % 4 === 0){
      if(G && running && G.eraIdx !== this.eraIdx) this.pi = 0;
      else if(this.theme && this.cyc >= 1 && G && running){ this.pi++; this.cyc = -1; }
      const {cfg, e, war, ctx} = this.pickCfg();
      const key = e+':'+(ctx==='title' ? 0 : this.pi % this.pieces(Math.max(0,e)).length)+':'+ctx;
      if(key !== this.key || !this.theme){
        this.key = e+':'+(ctx==='title' ? 0 : this.pi % this.pieces(Math.max(0,e)).length)+':'+ctx;
        this.eraIdx = e; this.war = war; this.cfg = Object.assign({}, cfg); this.theme = this.build(this.cfg, (G ? G.seed : 7) + e*131 + this.pi*53 + (war ? 977 : 0)); this.cyc = 0;
        const b = typeof document !== 'undefined' && document.getElementById && document.getElementById('btnMusic'); if(b && b.setAttribute) b.setAttribute('title', 'Music (M) · now playing: '+this.cfg.t+' · Shift+M for the next piece');
      }
      else this.cyc++;
    }
    const k = this.sec % 4;
    this.mode = ['A','A2','B','rest'][k];
    if(this.mode==='B'){ const r = this.rng((G ? G.seed : 7) + this.eraIdx*131 + this.cyc*17 + 5), P = this.cfg.prog;
      const q1 = this.phrase(r, this.cfg, [P[0],P[1]], 6, false), q2 = this.phrase(r, this.cfg, [P[2],P[3]], 5, true, 2), q4 = this.phrase(r, this.cfg, [P[6],P[7]], 5, true, 7);
      this.part = [q1, q2, q1, q4]; }
    else this.part = this.theme;
    this.sec++;
  },
  tick(){
    const c = SFX.ctx; if(!c || !this.ready) return;
    if(c.currentTime > this.next + 1) this.next = c.currentTime + .1;
    { let n = 0; if(R.fights && G && running) for(const f of R.fights.values()) if((R.now||0) - f.t < 1.2) n++; this.heat += ((n >= 5 ? Math.min(1, n/14) : 0) - this.heat)*.03; }
    while(this.next < c.currentTime + .35){
      if(this.bar===0 && this.step===0) this.newSection();
      if(this.on && SFX.on) this.play(this.next);
      const cfg = this.cfg, sd = 60/cfg.bpm/2;
      this.next += sd;
      if(++this.step >= cfg.steps){ this.step = 0; if(++this.bar >= 8) this.bar = 0; }
    }
  },
  play(t){
    const cfg = this.cfg, sd = 60/cfg.bpm/2, b = this.bar, st = this.step, chord = cfg.prog[b], ct = this.chordTones(chord), mode = this.mode;
    const rest = mode==='rest';
    // pad and drone
    if(st===0){
      const barLen = sd*cfg.steps;
      if(cfg.pad==='drone'){ if(b%2===0){ this.voice('drone', t, this.pitch(cfg,0,0), barLen*2.05, .05); this.voice('drone', t, this.pitch(cfg,4,0), barLen*2.05, .03); } }
      else if(!(rest && b%2)) ct.forEach((d,i) => this.voice(cfg.pad, t, this.pitch(cfg, d, 1), barLen*1.02, (rest ? .018 : .026)*(i ? .8 : 1)));
      if(cfg.bass!=='none') this.voice(cfg.bass, t, this.pitch(cfg, chord, 0) - (cfg.root > 46 ? 12 : 0), barLen*.9, .07);
    }
    // accompaniment
    const pi = cfg.pat[st];
    if(pi >= 0 && !(rest && st%2)){
      const tones = [ct[0], ct[1], ct[2], ct[0]+7, ct[1]+7];
      this.voice(cfg.acc, t, this.pitch(cfg, tones[pi % tones.length], cfg.acc==='pizz' ? 0 : 1) + (cfg.root < 44 ? 12 : 0), sd*2.2, rest ? .03 : .042);
    }
    if(cfg.bass==='none' && st===0) this.voice(cfg.acc, t, this.pitch(cfg, chord, 1), sd*4, .045);
    // drums
    if(!rest || (b%2===0 && st===0)) for(const [s, v] of cfg.dpat) if(s===st) this.drum(cfg.drum, t, v*(rest ? .5 : 1)*(b===7 && st>=4 ? 1.2 : 1));
    // melody
    // battle layer: war drums and a driving string ostinato when a big fight is on
    if(this.heat > .15){
      const hv = Math.min(1, this.heat);
      if(st % 2 === 0) this.voice('cello', t, this.pitch(cfg, chord, 0) - (cfg.root > 46 ? 12 : 0), sd*1.6, .05*hv);
      if(st===0 || st===3 || (st===cfg.steps-2 && b%2)) this.drum('taiko', t, .9*hv);
    }
    if(rest || t < this.duck) return;
    const ph = this.part[b>>1];
    for(const n of ph){ if(n.b !== (b&1) || n.s !== st || n.deg===null) continue;
      const oct = (mode==='A2' ? 3 : 2) + (cfg.root < 44 ? 1 : 0) + (cfg.mel==='choir' || cfg.mel==='cello' ? -1 : 0);
      const m = this.pitch(cfg, n.deg, oct);
      const inst = (mode==='A2' && cfg.mel2) ? cfg.mel2 : cfg.mel;
      this.voice(inst, t, m + (inst==='choir' && oct > 2 ? -12 : 0), sd*n.d*.95, inst==='bells' ? .07 : .085);
      if(cfg.harm && mode !== 'A') this.voice(cfg.mel2 && mode==='B' ? cfg.mel2 : inst==='bells' ? 'flute' : inst, t, this.pitch(cfg, n.deg-2, oct), sd*n.d*.95, .04);
      if(mode==='A2' && this.eraIdx >= 3) this.voice('strings', t, m-12, sd*n.d, .03);
      if(mode==='B' && this.eraIdx >= 4) this.voice('strings', t, m, sd*n.d, .028);
    }
  },
  /* short fanfares for big moments; the score ducks its melody under them */
  sting(kind, o){
    if(SFX.ctx && SFX.ctx.state==='suspended'){ try { SFX.ctx.resume(); } catch(e){} }
    const c = SFX.ctx; if(!c || !this.ready || !SFX.on || !this.jbus || (G && G.demo)) return;
    const keep = this.bus; this.bus = this.jbus; try { this.sting0(kind, o); } finally { this.bus = keep; }
  },
  sting0(kind, o){
    const c = SFX.ctx;
    const t0 = c.currentTime + .05, N = (inst, at, m, d, v) => this.voice(inst, t0+at, m, d, v);
    const D = (k, at, v) => this.drum(k, t0+at, v);
    let len = 2;
    if(kind==='era'){ [[0,60],[.18,64],[.36,67]].forEach(([a,m]) => N('brass', a, m, .2, .09)); N('brass', .56, 72, 1.4, .1); N('choir', .56, 60, 1.8, .05); N('choir', .56, 64, 1.8, .04); N('choir', .56, 67, 1.8, .04); D('timp', 0, .7); D('timp', .56, 1); len = 2.4; }
    else if(kind==='war'){ N('horn', 0, 45, .5, .1); N('horn', .5, 51, .5, .1); N('horn', 1, 50, 1.4, .11); N('cello', 0, 33, 2.2, .08); D('taiko', 0, 1); D('taiko', .5, .8); D('taiko', 1, 1.1); len = 2.4; }
    else if(kind==='coal'){ [0,.4,.8,1.2].forEach((a,i) => D('taiko', a, .8 + i*.12)); N('choir', .8, 57, 2.6, .06); N('choir', .8, 60, 2.6, .05); N('choir', .8, 64, 2.6, .05); N('brass', .8, 45, 2.4, .1); len = 3.4; }
    else if(kind==='evo'){ [72,76,79,84,88].forEach((m,i) => N('bells', i*.09, m, .6, .08)); N('choir', .3, 60, 1.8, .05); N('choir', .3, 64, 1.8, .045); N('choir', .3, 67, 1.8, .045); N('choir', .3, 72, 1.8, .04); len = 2.2; }
    else if(kind==='win'){ [[0,60,.2],[.2,60,.2],[.4,60,.2],[.6,64,.6],[1.2,62,.2],[1.4,64,.2],[1.6,67,.4],[2,72,2]].forEach(([a,m,d]) => N('brass', a, m, d, .1)); [60,64,67].forEach(m => N('strings', 2, m, 2.2, .04)); D('timp', 0, .6); D('timp', .6, .8); D('timp', 2, 1.2); len = 4.4; }
    else if(kind==='chest'){ const T = (o && o.T) || 1.2, tier = o && o.g==='gold' ? 3 : o && o.g==='silver' ? 2 : 1, n = Math.max(8, Math.round(T/.085));
      for(let i=0;i<n;i++) D(tier >= 2 ? 'snare' : 'tabor', i*T/n, .15 + .8*Math.pow(i/n, 1.4));
      const sc = [60,62,64,65,67,69,71,72,74,76,77,79,81,83,84], steps = Math.min(sc.length, 5 + tier*3);
      for(let i=0;i<steps;i++) N(tier===3 ? 'bells' : 'harp', i*T/steps, sc[i], .35, .05 + .03*i/steps);
      if(tier >= 2){ N('strings', 0, 48, T+.2, .03); N('strings', 0, 55, T+.2, .025); }
      if(tier === 3){ N('cello', 0, 36, T+.3, .05); }
      D('timp', T, 1);
      if(tier===1){ [72,76,79].forEach((m,i) => N('bells', T + i*.05, m, 1.5, .08)); N('harp', T, 60, 1.6, .08); N('harp', T, 64, 1.6, .06); len = T + 2; }
      else if(tier===2){ [72,76,79,84].forEach((m,i) => N('bells', T + i*.06, m, 1.7, .08)); [60,64,67].forEach(m => N('choir', T, m, 2.2, .05)); D('tamb', T, .9); len = T + 2.4; }
      else { [[0,67,.14],[.14,72,.14],[.28,76,.14],[.42,79,1.8]].forEach(([a,m,d]) => N('brass', T+a, m, d, .1)); [60,64,67,72].forEach(m => N('choir', T+.42, m, 2.4, .05)); [84,88,91,96].forEach((m,i) => N('bells', T+.42+i*.07, m, 1.4, .06)); D('timp', T+.42, 1.2); D('tamb', T+.42, 1); len = T + 2.8; } }
    else if(kind==='legend'){ [0,.06,.12,.18,.24,.3,.36,.42].forEach((a,i) => D('snare', a, .3 + i*.09)); D('timp', .5, 1.3); D('tamb', .5, 1);
      [[.5,60,.18],[.68,64,.18],[.86,67,.18],[1.04,72,1.6]].forEach(([a,m,d]) => { N('brass', a, m, d, .11); N('horn', a, m-12, d, .06); });
      [60,64,67,72,76].forEach(m => N('choir', 1.04, m, 2.2, .05)); [84,88,91,96,100].forEach((m,i) => N('bells', 1.04 + i*.06, m, 1.6, .06)); N('cello', .5, 36, 2.4, .07); D('timp', 1.04, 1.1); len = 3.4; }
    else if(kind==='epic'){ D('timp', 0, .9); [[0,67,.14],[.14,72,.14],[.28,76,.9]].forEach(([a,m,d]) => N('brass', a, m, d, .09)); [60,64,67].forEach(m => N('choir', .28, m, 1.4, .045)); [79,84,88].forEach((m,i) => N('bells', .28 + i*.07, m, 1.2, .06)); D('tamb', .28, .7); len = 2; }
    else if(kind==='break'){ N('horn', 0, 50, .28, .11); N('horn', .28, 55, 1, .12); N('brass', .28, 43, 1, .07); D('taiko', 0, 1.1); D('taiko', .28, 1.2); D('timp', .28, .8); len = 1.5; }
    else if(kind==='host'){ D('war', 0, .9); D('war', .45, .9); D('taiko', .9, 1.1); N('cello', 0, 31, 1.6, .07); N('horn', .9, 43, .9, .06); len = 1.9; }
    else if(kind==='decline'){ [0, 1.3, 2.6].forEach(a => N('bells', a, 48, 2.4, .1)); N('cello', 0, 36, 4, .07); N('choir', 1.3, 51, 2.8, .05); N('choir', 1.3, 55, 2.8, .045); N('choir', 1.3, 60, 2.8, .04); D('timp', 0, .7); len = 4.2; }
    else if(kind==='act'){ [[0,55],[.35,53],[.7,51]].forEach(([a,m]) => N('brass', a, m, .45, .08)); N('cello', 0, 39, 1.6, .06); D('timp', .7, .9); len = 1.8; }
    else if(kind==='epitaph'){ [[0,64,.6],[.6,63,.6],[1.2,60,.6],[1.8,58,.9],[2.7,60,1.6]].forEach(([a,m,d]) => N('oboe', a, m, d, .05)); [48,51,55].forEach(m => N('strings', 0, m, 4.4, .035)); N('choir', 2.7, 55, 2, .04); D('timp', 2.7, .5); len = 4.8; }
    else if(kind==='crown'){ [[0,67,.12],[.12,67,.12],[.24,72,.5],[.74,71,.12],[.86,72,.12],[.98,76,1.3]].forEach(([a,m,d]) => N('brass', a, m, d, .1)); [60,64,67,72].forEach(m => N('choir', .98, m, 1.6, .045)); D('timp', 0, .7); D('timp', .98, 1.1); D('tamb', .98, .8); len = 2.6; }
    else if(kind==='grade'){ const k = Math.max(0, Math.min(3, (o && o.i) || 0)); [72,76,79,84].slice(0, k+1).forEach((m,i) => N('bells', i*.22, m, 1.2, .08)); if(k===3) [60,64,67,72].forEach(m => N('choir', .66, m, 1.6, .04)); len = 1.2 + k*.25; }
    else if(kind==='quest'){ [76,79,84,88].forEach((m,i) => N('bells', i*.08, m, .9, .07)); N('harp', 0, 64, 1, .07); N('harp', .08, 67, 1, .06); len = 1.4; }
    else if(kind==='focus'){ N('strings', 0, 48, 1.6, .05); N('strings', .1, 55, 1.5, .045); N('horn', .3, 60, 1.2, .07); D('timp', .3, .7); len = 1.7; }
    else if(kind==='support'){ [67,72,76].forEach((m,i) => N('harp', i*.07, m, .9, .08)); N('bells', .21, 84, 1, .05); len = 1.2; }
    else if(kind==='lose'){ [[0,64],[.7,62],[1.4,60],[2.1,59]].forEach(([a,m]) => N('strings', a, m, .8, .06)); N('cello', 0, 40, 3.2, .07); N('choir', 2.1, 52, 2, .04); D('timp', 2.1, .6); len = 4.4; }
    this.duck = t0 + len;
    if(this.out && this.on){ const g = this.out.gain; g.cancelScheduledValues(c.currentTime); g.setTargetAtTime(.45*this.vol, c.currentTime, .05); g.setTargetAtTime(1.25*this.vol, t0 + len, .8); }
  },
  osc(type, f, t, end, dest, det){ const o = SFX.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if(det) o.detune.setValueAtTime(det, t); o.connect(dest); o.start(t); o.stop(end); return o; },
  env(t, a, d, v, rel){ const g = SFX.ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t+a); g.gain.setValueAtTime(v, t+Math.max(a, d)); g.gain.exponentialRampToValueAtTime(.0001, t+Math.max(a, d)+rel); g.connect(this.bus); return g; },
  voice(kind, t, midi, dur, v){
    const c = SFX.ctx, f = 440*Math.pow(2, (midi-69)/12);
    if(kind==='bells'){
      [[1,1,2.6],[2.76,.35,1.2],[5.4,.18,.6],[8.9,.06,.3]].forEach(([h, a, d]) => { const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v*a, t+.003); g.gain.exponentialRampToValueAtTime(.0001, t+d); g.connect(this.bus); this.osc('sine', f*h, t, t+d+.05, g); });
      return;
    }
    if(kind==='oboe' || kind==='pipes'){
      const g = this.env(t, kind==='oboe' ? .05 : .02, dur*.9, v*(kind==='oboe' ? 3.4 : 3.2), kind==='oboe' ? .15 : .08);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = kind==='oboe' ? 1400 : 2000; bp.Q.value = kind==='oboe' ? 1.4 : 2.2; bp.connect(g);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f*6; lp.connect(bp);
      const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = kind==='oboe' ? 5.6 : 6.5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f*(kind==='oboe' ? .007 : .003), t+.25); vib.connect(vg); vib.start(t); vib.stop(t+dur+.3);
      const o = this.osc(kind==='oboe' ? 'sawtooth' : 'square', f, t, t+dur+.3, lp); vg.connect(o.frequency);
      if(kind==='pipes'){ const g2 = c.createGain(); g2.gain.value = .3; g2.connect(lp); const o2 = this.osc('sawtooth', f, t, t+dur+.3, g2, 8); vg.connect(o2.frequency); }
      return;
    }
    if(kind==='choir'){
      const g = this.env(t, Math.min(.35, dur*.4), dur*.85, v*1.4, .7);
      [[700, 6, 1],[1150, 8, .55],[2600, 10, .2]].forEach(([fq, q, a]) => { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q; const ga = c.createGain(); ga.gain.value = a*2.4; bp.connect(ga); ga.connect(g);
        [-9, 0, 8].forEach(d => this.osc('sawtooth', f, t, t+dur+.9, bp, d)); });
      return;
    }
    if(kind==='cello'){
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(2400, f*5);
      const g = this.env(t, Math.min(.12, dur*.3), dur*.85, v, .3); lp.connect(g);
      const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f*.005, t+.3); vib.connect(vg); vib.start(t); vib.stop(t+dur+.4);
      const o = this.osc('sawtooth', f, t, t+dur+.4, lp); vg.connect(o.frequency); this.osc('sawtooth', f, t, t+dur+.4, lp, 5);
      return;
    }
    if(kind==='lute' || kind==='harp' || kind==='harpsi' || kind==='pizz' || kind==='piano' || kind==='guitar'){
      const P = {lute:[1.6,'triangle','sawtooth',.25,6], harp:[2.2,'sine','triangle',.5,4], harpsi:[.9,'sawtooth','square',.35,9], pizz:[.45,'triangle','sawtooth',.3,5], piano:[2.4,'triangle','sine',.6,5], guitar:[1.3,'triangle','sawtooth',.4,4]}[kind];
      const dec = Math.min(P[0], Math.max(.25, dur*1.8)), g = c.createGain(), lp = c.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(f*P[4], t); lp.frequency.exponentialRampToValueAtTime(Math.max(200, f*1.5), t+dec);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t+.004); g.gain.exponentialRampToValueAtTime(.0001, t+dec);
      lp.connect(g); g.connect(this.bus);
      this.osc(P[1], f, t, t+dec+.05, lp);
      const g2 = c.createGain(); g2.gain.value = P[3]; g2.connect(lp); this.osc(P[2], f*(kind==='piano' ? 2 : 1), t, t+dec+.05, g2, kind==='piano' ? 0 : 4);
      return;
    }
    if(kind==='flute' || kind==='recorder'){
      const g = this.env(t, kind==='flute' ? .07 : .04, dur*.85, v, .18);
      const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f*.006, t+.35); vib.connect(vg);
      const o = this.osc('sine', f, t, t+dur+.3, g); vg.connect(o.frequency); vib.start(t); vib.stop(t+dur+.3);
      const g2 = c.createGain(); g2.gain.value = kind==='recorder' ? .35 : .18; g2.connect(g); const o2 = this.osc('triangle', f*2, t, t+dur+.3, g2); vg.connect(o2.frequency);
      return;
    }
    if(kind==='horn' || kind==='brass'){
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.5;
      lp.frequency.setValueAtTime(f*1.2, t); lp.frequency.linearRampToValueAtTime(f*(kind==='brass' ? 5 : 3.2), t+.09); lp.frequency.exponentialRampToValueAtTime(f*2.2, t+dur);
      const g = this.env(t, .07, dur*.9, v*.9, .22); lp.connect(g);
      this.osc('sawtooth', f, t, t+dur+.35, lp, -5); if(kind==='brass') this.osc('sawtooth', f, t, t+dur+.35, lp, 6);
      return;
    }
    if(kind==='strings' || kind==='organ' || kind==='drone'){
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind==='strings' ? 1500 : kind==='organ' ? 1800 : 500;
      const a = kind==='strings' ? Math.min(.45, dur*.4) : kind==='organ' ? .05 : 1.2;
      const g = this.env(t, a, dur*.85, v, kind==='drone' ? 1.5 : .6); lp.connect(g);
      if(kind==='organ'){ [1,2,3].forEach((h,i) => { const gg = c.createGain(); gg.gain.value = [1,.5,.25][i]; gg.connect(lp); this.osc('sine', f*h, t, t+dur+.8, gg); }); }
      else if(kind==='drone'){ this.osc('sine', f, t, t+dur+1.6, lp); this.osc('triangle', f*2, t, t+dur+1.6, lp, 3); }
      else [-7, 0, 7].forEach(d => this.osc('sawtooth', f, t, t+dur+.7, lp, d));
      return;
    }
  },
  drum(kind, t, v){
    if(kind==='none') return;
    const c = SFX.ctx;
    const thump = (f0, f1, d, vol) => { const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t+d); g.connect(this.bus); const o = c.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t+d); o.connect(g); o.start(t); o.stop(t+d+.05); };
    const hiss = (freq, type, d, vol) => { const len = Math.floor(c.sampleRate*d), buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0); for(let i=0;i<len;i++) ch[i] = (Math.random()*2-1)*Math.pow(1-i/len, 2); const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = c.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(this.bus); s.start(t); };
    if(kind==='frame'){ thump(130, 62, .35, .16*v); hiss(900, 'bandpass', .06, .05*v); }
    else if(kind==='tabor'){ thump(190, 120, .18, .1*v); hiss(1800, 'bandpass', .07, .06*v); }
    else if(kind==='snare'){ hiss(2200, 'highpass', .13, .07*v); thump(200, 150, .08, .04*v); }
    else if(kind==='timp'){ thump(88, 70, 1.1, .2*v); hiss(300, 'lowpass', .2, .05*v); }
    else if(kind==='war'){ thump(95, 50, .5, .22*v); hiss(600, 'bandpass', .08, .06*v); }
    else if(kind==='bodhran'){ thump(115, 58, .28, .15*v); hiss(1200, 'bandpass', .05, .04*v); }
    else if(kind==='taiko'){ thump(72, 38, .7, .22*v); hiss(400, 'lowpass', .12, .07*v); }
    else if(kind==='tamb'){ hiss(7000, 'highpass', .09, .05*v); }
    else if(kind==='march'){ hiss(2400, 'highpass', .1, .065*v); thump(210, 160, .07, .04*v); if(v > .6){ hiss(2600, 'highpass', .05, .03*v); } }
  }
};
