"use strict";
/* ---------- Phones: layout class, one message at a time, a thumb joystick, vibration, battery mode ----------
   Everything here switches on only for touch screens whose short side is phone-sized. PCs and tablets
   keep the normal layout. The CSS for it lives at the end of style.css under html.phone. */
const isPhone = () => { try { return matchMedia('(pointer:coarse)').matches && Math.min(innerWidth, innerHeight) <= 560; } catch(e){ return false; } };
function phoneSync(){
  const p = isPhone(), d = document.documentElement; if(!d || !d.classList) return;
  d.classList.toggle('phone', p); d.classList.toggle('land', p && innerWidth > innerHeight);
  R.phone = p;
  const j = document.getElementById('joy'); if(j) j.hidden = !p || !R.joyOn;
}
/* ---- messages: phones show one line at a time; every message also goes to the log in the pause menu ---- */
function msgLog(msg, kind, at){
  const L = R.tlog || (R.tlog = []);
  if(L.length && L[L.length-1].m === msg){ L[L.length-1].n++; return; }
  L.push({m:msg, k:kind||'', t:G ? G.t : 0, at:at||null, n:1}); if(L.length > 40) L.shift();
}
function phoneToast(msg, kind, at){
  const Q = R.tq || (R.tq = []);
  if((R.tcur && R.tcur.m === msg) || Q.some(q => q.m === msg)) return;
  const item = {m:msg, k:kind||'', at, born:performance.now()};
  if(kind==='bad') Q.unshift(item); else Q.push(item);
  // keep the line short: older routine news drops to the log only
  while(Q.length > 2){ const i = Q.findIndex(q => q.k !== 'bad'); Q.splice(i < 0 ? Q.length-1 : i, 1); }
  if(!R.tcur) phoneToastNext();
}
function phoneToastNext(){
  const box = $('#toasts'); const Q = R.tq || []; R.tcur = null;
  if(!box || !box.appendChild){ return; }
  while(Q.length && performance.now() - Q[0].born > 7000 && Q[0].k !== 'bad') Q.shift();
  const it = Q.shift(); if(!it){ return; }
  R.tcur = it; box.innerHTML = '';
  const el = document.createElement('div'); el.className = 'toast '+it.k+(it.at ? ' link' : ''); el.textContent = it.m;
  if(it.at) el.addEventListener('click', () => { const at = it.at; if(at.watch && G){ R.follow = {x:at.x, y:at.y, t:.3}; R.camTo = {x:at.x, y:at.y}; R.camZ = 28; syncWatch(); } else focusOn(at.x, at.y); el.remove(); });
  box.appendChild(el);
  const dur = it.k==='bad' ? 3000 : it.at && it.at.watch ? 3600 : 2300;
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); phoneToastNext(); }, 220); }, dur);
}
function logHTML(){
  const L = (R.tlog || []).slice().reverse();
  if(!L.length) return '<p class="lnote">Nothing yet.</p>';
  return L.map(l => '<div class="lg '+l.k+'"><em>'+fmt(l.t)+'</em><span>'+esc(l.m)+(l.n > 1 ? ' <b>×'+l.n+'</b>' : '')+'</span></div>').join('');
}
/* ---- vibration (Android; iPhones ignore it) ---- */
function buzz(p){ if(!R.phone || R.vibOff || !navigator.vibrate) return; try { navigator.vibrate(p); } catch(e){} }
/* ---- thumb joystick: steers the general like WASD ---- */
function joyBind(){
  const j = document.getElementById('joy'), k = document.getElementById('joyK'); if(!j || !k || !j.addEventListener) return;
  let id = null, cx = 0, cy = 0, rad = 1;
  const set = (x, y) => {
    let dx = x - cx, dy = y - cy; const L = Math.hypot(dx, dy), m = rad*.62;
    if(L > m){ dx *= m/L; dy *= m/L; }
    k.style.transform = 'translate('+dx+'px,'+dy+'px)';
    const nx = dx/m, ny = dy/m, mag = Math.hypot(nx, ny);
    R.joy = mag < .22 ? null : {x:nx, y:ny};
  };
  j.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); id = e.pointerId; j.setPointerCapture && j.setPointerCapture(id); const r = j.getBoundingClientRect(); cx = r.left + r.width/2; cy = r.top + r.height/2; rad = r.width/2; j.classList.add('on'); set(e.clientX, e.clientY); });
  j.addEventListener('pointermove', e => { if(e.pointerId !== id) return; e.preventDefault(); set(e.clientX, e.clientY); });
  const end = e => { if(e.pointerId !== id) return; id = null; R.joy = null; k.style.transform = ''; j.classList.remove('on'); };
  j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);
}
/* while a finger is down on a button, panels that redraw themselves wait, so the tap lands on the
   same button it started on (a redraw mid-tap was eating taps: the "tap twice" problem) */
const holdUI = () => !!R.touching && performance.now() - (R.touchT||0) < 900;
function tapGuard(){
  /* Fast taps: on touch screens a button fires on finger-up instead of waiting for the browser's own
     click. iPhones sometimes swallow that click while the game is redrawing (so a button "needs two
     taps"); this makes every tap count once, and the browser's late click for the same tap is dropped. */
  let td = null;
  const down = e => {
    const t = e.target, btn = t && t.closest ? t.closest('button') : null;
    if(btn || (t && t.closest && t.closest('.gl-r, [data-tab], .resb, .vicchip'))){ R.touching = true; R.touchT = performance.now(); }
    td = (e.pointerType === 'touch' && btn && !btn.disabled) ? {id:e.pointerId, btn, x:e.clientX, y:e.clientY, key:btnKey(btn)} : null;
  };
  const up = e => {
    setTimeout(() => { R.touching = false; }, 60);
    if(!td || e.type !== 'pointerup' || e.pointerId !== td.id){ td = null; return; }
    const d = td; td = null;
    if(Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14) return;
    let btn = d.btn.isConnected ? d.btn : null;
    if(!btn){ const at = document.elementFromPoint(e.clientX, e.clientY), b2 = at && at.closest ? at.closest('button') : null; if(b2 && btnKey(b2) === d.key) btn = b2; }
    if(!btn || btn.disabled) return;
    R.fastTap = {t:performance.now(), key:d.key};
    btn.click();
  };
  // the browser's own click for a tap we already handled is dropped
  document.addEventListener('click', e => {
    const f = R.fastTap; if(!f || !e.isTrusted || performance.now() - f.t > 500) return;
    // whatever it lands on (the layout may have shifted under the finger), it belongs to the tap we already handled
    e.stopImmediatePropagation(); e.preventDefault(); R.fastTap = null;
  }, true);
  document.addEventListener('pointerdown', down, true); document.addEventListener('pointerup', up, true); document.addEventListener('pointercancel', up, true);
}
const btnKey = b => b.id || (b.dataset && (b.dataset.tab || b.dataset.o || b.dataset.k || b.dataset.d || b.dataset.ht || b.dataset.pin || b.dataset.r || b.dataset.a || b.dataset.close)) || (b.className+'|'+(b.textContent||'').slice(0, 24));
atBoot(tapGuard);
function phoneInit(){
  try { R.joyOn = localStorage.getItem('eh-joy') !== '0'; R.vibOff = localStorage.getItem('eh-vib') === '0'; } catch(e){ R.joyOn = true; }
  phoneSync();
  addEventListener('resize', phoneSync); addEventListener('orientationchange', () => setTimeout(phoneSync, 150));
  // phones start with the bottom panel folded to one row, unless the player chose otherwise
  try { const app = document.getElementById('app'); if(R.phone && app && localStorage.getItem('eh-cbot') == null) app.classList.add('cbot'); } catch(e){}
  const mb = document.getElementById('hcMore'), fb = document.getElementById('foldBot');
  if(mb && fb && mb.addEventListener) mb.addEventListener('click', () => { fb.click(); syncMore(); });
  syncMore(); joyBind();
  const pl = document.getElementById('pLedger'), bl = document.getElementById('btnLedger');
  if(pl && bl && pl.addEventListener) pl.addEventListener('click', () => { const rs = document.getElementById('btnResume') || document.querySelector('#ovPause .primary'); if(rs) rs.click(); setTimeout(() => bl.click(), 60); });
  const jt = document.getElementById('optJoy'); if(jt && jt.addEventListener){ jt.checked = !!R.joyOn; jt.addEventListener('change', e => { R.joyOn = e.target.checked; try { localStorage.setItem('eh-joy', R.joyOn ? '1' : '0'); } catch(er){} phoneSync(); }); }
  const vt = document.getElementById('optVib'); if(vt && vt.addEventListener){ vt.checked = !R.vibOff; vt.addEventListener('change', e => { R.vibOff = !e.target.checked; try { localStorage.setItem('eh-vib', R.vibOff ? '0' : '1'); } catch(er){} buzz(30); }); }
}
function syncMore(){ const app = document.getElementById('app'), mb = document.getElementById('hcMore'); if(!app || !mb || !mb.querySelector) return; const open = !app.classList.contains('cbot'); mb.classList.toggle('on', open); const b = mb.querySelector('b'); if(b) b.textContent = open ? 'Less' : 'More'; }
atBoot(phoneInit);
