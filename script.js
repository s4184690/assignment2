/* ==========================================================================
   EXTRA FEATURE: HOT CUES + PITCH FADER
   Real DJs don't scrub; they trigger cue points. A mix can run for an hour,
   so dragging a tiny seek bar to find one drop is slow and imprecise. Four
   pads store timestamps (saved in localStorage so they survive a refresh).
   Tapping an empty pad saves; tapping a filled pad jumps and plays; "Set
   mode" (or Shift+key) overwrites. The pitch fader (+/-8%) mirrors a
   turntable's tempo control and uses playbackRate.

   FEEDBACK: every action gets a response. Pads flash cyan, cue markers
   appear on the timeline, a toast confirms ("Cue B set at 12:03"), the play
   icon swaps, and the screen glows pink and the bars animate while playing.
   The bars are decorative only: real audio analysis needs CORS headers the
   CDN video doesn't send, so I kept them honest as a visual cue.

   USABILITY: keyboard shortcuts (Space, 1-4, arrows, M) suit DJ-style
   quick reactions; the Set mode button replaces Shift on touch screens.

   CREDITS: Draft structure and code generated with Claude (Anthropic AI),
   which I then reviewed, tested and edited. Original partial player and
   video from the course files. Play/pause icons by Icons8. No other
   libraries are used.
   ========================================================================== */
const $ = id => document.getElementById(id);
const v = $('mix'), playBtn = $('play'), playIcon = $('playIcon'), seek = $('seek');
const cur = $('cur'), dur = $('dur'), vol = $('vol'), pitch = $('pitch');
const pads = [...document.querySelectorAll('.pad')], markers = $('markers');
const toast = $('toast'), setBtn = $('setMode');
const ICON = {
  play: 'https://img.icons8.com/ios-glyphs/30/play--v1.png',
  pause: 'https://img.icons8.com/ios-glyphs/30/pause--v1.png'
};
const LETTERS = ['A', 'B', 'C', 'D'];
let setMode = false, cues = [null, null, null, null];

const fmt = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';

function say(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(say.t);
  say.t = setTimeout(() => toast.classList.remove('show'), 1800);
}

/* --- Transport --- */
function togglePlay() {
  if (v.paused) v.play().catch(() => say('Could not play this file'));
  else v.pause();
}
playBtn.addEventListener('click', togglePlay);
v.addEventListener('click', togglePlay);
v.addEventListener('play', () => syncPlayState(true));
v.addEventListener('pause', () => syncPlayState(false));
function syncPlayState(on) {
  document.body.classList.toggle('playing', on);
  playIcon.src = on ? ICON.pause : ICON.play;
  playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
}

v.addEventListener('timeupdate', () => {
  if (v.duration) seek.value = (v.currentTime / v.duration) * 1000;
  cur.textContent = fmt(v.currentTime);
});
seek.addEventListener('input', () => { v.currentTime = (seek.value / 1000) * v.duration; });
vol.addEventListener('input', () => {
  v.volume = vol.value; v.muted = false;
  $('volOut').textContent = Math.round(vol.value * 100) + '%';
});

/* --- Pitch fader (double-click to reset, like a real deck) --- */
pitch.addEventListener('input', () => {
  v.playbackRate = +pitch.value;
  const pct = (pitch.value - 1) * 100;
  $('pitchOut').textContent = (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
});
pitch.addEventListener('dblclick', () => { pitch.value = 1; pitch.dispatchEvent(new Event('input')); say('Pitch reset'); });

/* --- Hot cues --- */
function saveCues() { try { localStorage.setItem('afterhours-cues', JSON.stringify(cues)); } catch (e) {} }
function renderCues() {
  markers.innerHTML = '';
  pads.forEach((p, i) => {
    const t = cues[i];
    p.classList.toggle('set', t !== null);
    p.querySelector('small').textContent = t === null ? 'empty' : fmt(t);
    if (t !== null && v.duration) {
      const m = document.createElement('span');
      m.style.left = (t / v.duration * 100) + '%';
      markers.appendChild(m);
    }
  });
}
function firePad(i, forceSet) {
  const pad = pads[i];
  if (forceSet || setMode || cues[i] === null) {
    cues[i] = v.currentTime; saveCues(); renderCues();
    say('Cue ' + LETTERS[i] + ' set at ' + fmt(cues[i]));
  } else {
    v.currentTime = cues[i];
    v.play().catch(() => {});
    say('Jumped to cue ' + LETTERS[i]);
  }
  pad.classList.add('hit');
  setTimeout(() => pad.classList.remove('hit'), 180);
}
pads.forEach((p, i) => p.addEventListener('click', e => firePad(i, e.shiftKey)));
setBtn.addEventListener('click', () => {
  setMode = !setMode;
  setBtn.setAttribute('aria-pressed', setMode);
  setBtn.textContent = 'Set mode: ' + (setMode ? 'on' : 'off');
});

/* --- Tracklist: times are placed at 0/25/50/75% until real timestamps are known --- */
function fillTracklist() {
  document.querySelectorAll('#tracks button').forEach(b => {
    b.querySelector('.t').textContent = fmt(+b.dataset.p * v.duration);
    b.onclick = () => { v.currentTime = +b.dataset.p * v.duration; v.play().catch(() => {}); };
  });
}

v.addEventListener('loadedmetadata', () => {
  dur.textContent = fmt(v.duration);
  try { const s = JSON.parse(localStorage.getItem('afterhours-cues')); if (Array.isArray(s) && s.length === 4) cues = s; } catch (e) {}
  renderCues(); fillTracklist();
});

/* --- Keyboard shortcuts (ignored while typing in a control that needs the key) --- */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  const m = /^Digit([1-4])$/.exec(e.code);
  if (m) { firePad(+m[1] - 1, e.shiftKey); return; }
  if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowRight' && e.target === document.body) v.currentTime += 5;
  if (e.code === 'ArrowLeft' && e.target === document.body) v.currentTime -= 5;
  if (e.code === 'KeyM') { v.muted = !v.muted; say(v.muted ? 'Muted' : 'Unmuted'); }
});
