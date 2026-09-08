(function(){
  "use strict";

  const state = {
    dpi: 800,
    currentSens: 0.4,
    t1: { hits: 0, reactionTimes: [], startTime: 0, spawnTime: 0, running:false },
    t2: { samples: 0, onTarget: 0, startTime: 0, running:false }
  };

  const VALORANT_YAW = 0.07;

  function cm360(dpi, sens){ return (2.54 * 360) / (sens * dpi * VALORANT_YAW); }
  function sensFromCm360(dpi, cm){ return (2.54 * 360) / (dpi * VALORANT_YAW * cm); }

  function setDots(step){
    for(let i=0;i<4;i++){
      const d = document.getElementById('dot'+i);
      d.className = 'step ' + (i<step ? 'done' : (i===step ? 'active' : ''));
    }
  }

  function show(id){
    ['screen-setup','screen-test1','screen-test2','screen-results'].forEach(s=>{
      document.getElementById(s).classList.toggle('hidden', s!==id);
    });
  }

  function attachCrosshair(arena){
    const ch = document.createElement('div');
    ch.className = 'crosshair';
    ch.innerHTML = '<div class="dot"></div>';
    arena.appendChild(ch);
    function move(e){
      const rect = arena.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      ch.style.left = x + 'px';
      ch.style.top = y + 'px';
      arena._cursor = {x, y};
    }
    arena.addEventListener('mousemove', move);
    arena.addEventListener('touchmove', move, {passive:true});
    return ch;
  }

  document.getElementById('startBtn').addEventListener('click', function(){
    const dpi = parseFloat(document.getElementById('dpi').value);
    const sens = parseFloat(document.getElementById('currentSens').value);
    if(!dpi || dpi<=0 || !sens || sens<=0){
      alert('Enter a valid DPI and sensitivity before starting.');
      return;
    }
    state.dpi = dpi;
    state.currentSens = sens;
    setDots(1);
    show('screen-test1');
  });

  const t1Arena = document.getElementById('t1-arena');
  const t1Overlay = document.getElementById('t1-overlay');
  attachCrosshair(t1Arena);
  let t1Target = null;
  const T1_DURATION = 30000;
  const T1_RADIUS = 26;

  function spawnT1Target(){
    const rect = t1Arena.getBoundingClientRect();
    const pad = T1_RADIUS + 8;
    const x = pad + Math.random() * (rect.width - pad*2);
    const y = pad + Math.random() * (rect.height - pad*2);
    if(!t1Target){
      t1Target = document.createElement('div');
      t1Target.className = 'target';
      t1Target.style.width = (T1_RADIUS*2)+'px';
      t1Target.style.height = (T1_RADIUS*2)+'px';
      t1Arena.appendChild(t1Target);
    }
    t1Target.style.left = x+'px';
    t1Target.style.top = y+'px';
    t1Target._cx = x; t1Target._cy = y;
    state.t1.spawnTime = performance.now();
  }

  function t1CheckHover(){
    if(!state.t1.running || !t1Target || !t1Arena._cursor) return;
    const c = t1Arena._cursor;
    const dx = c.x - t1Target._cx, dy = c.y - t1Target._cy;
    if(Math.sqrt(dx*dx+dy*dy) <= T1_RADIUS){
      const rt = performance.now() - state.t1.spawnTime;
      state.t1.hits++;
      state.t1.reactionTimes.push(rt);
      document.getElementById('t1-hits').textContent = state.t1.hits;
      const avg = state.t1.reactionTimes.reduce((a,b)=>a+b,0)/state.t1.reactionTimes.length;
      document.getElementById('t1-avg').textContent = Math.round(avg)+'ms';
      const elapsedMin = (performance.now()-state.t1.startTime)/60000;
      document.getElementById('t1-rate').textContent = elapsedMin>0 ? Math.round(state.t1.hits/elapsedMin) : '—';
      spawnT1Target();
    }
  }
  t1Arena.addEventListener('mousemove', t1CheckHover);
  t1Arena.addEventListener('touchmove', t1CheckHover, {passive:true});

  let t1RafId = null;
  function t1Loop(){
    if(!state.t1.running) return;
    const elapsed = performance.now() - state.t1.startTime;
    const remaining = Math.max(0, T1_DURATION - elapsed);
    const timerEl = document.getElementById('t1-timer');
    const secs = Math.ceil(remaining/1000);
    timerEl.textContent = secs;
    timerEl.classList.toggle('low', secs<=5);
    if(remaining <= 0){ endT1(); return; }
    t1RafId = requestAnimationFrame(t1Loop);
  }

  function endT1(){
    state.t1.running = false;
    if(t1RafId) cancelAnimationFrame(t1RafId);
    if(t1Target){ t1Target.remove(); t1Target = null; }
    setDots(2);
    show('screen-test2');
  }

  document.getElementById('t1-begin').addEventListener('click', function(){
    t1Overlay.classList.add('hidden');
    state.t1.hits = 0;
    state.t1.reactionTimes = [];
    state.t1.running = true;
    state.t1.startTime = performance.now();
    document.getElementById('t1-hits').textContent = '0';
    document.getElementById('t1-avg').textContent = '—';
    document.getElementById('t1-rate').textContent = '—';
    spawnT1Target();
    t1RafId = requestAnimationFrame(t1Loop);
  });

  const t2Arena = document.getElementById('t2-arena');
  const t2Overlay = document.getElementById('t2-overlay');
  attachCrosshair(t2Arena);
  const T2_DURATION = 20000;
  const T2_RADIUS = 22;
  let t2Target = null;
  let t2Waypoints = [];
  let t2SegStart = 0;
  let t2SegDur = 0;
  let t2LastTick = 0;

  function newWaypoint(){
    const rect = t2Arena.getBoundingClientRect();
    const pad = T2_RADIUS + 10;
    return { x: pad + Math.random()*(rect.width - pad*2), y: pad + Math.random()*(rect.height - pad*2) };
  }

  function t2Loop(now){
    if(!state.t2.running) return;
    if(!t2LastTick) t2LastTick = now;
    const dt = now - t2LastTick;
    t2LastTick = now;

    const elapsed = now - state.t2.startTime;
    const remaining = Math.max(0, T2_DURATION - elapsed);
    const timerEl = document.getElementById('t2-timer');
    const secs = Math.ceil(remaining/1000);
    timerEl.textContent = secs;
    timerEl.classList.toggle('low', secs<=5);

    let segElapsed = now - t2SegStart;
    if(segElapsed >= t2SegDur){
      t2Waypoints.shift();
      if(t2Waypoints.length < 2) t2Waypoints.push(newWaypoint());
      t2SegStart = now;
      segElapsed = 0;
      const dx = t2Waypoints[1].x - t2Waypoints[0].x;
      const dy = t2Waypoints[1].y - t2Waypoints[0].y;
      const dist = Math.sqrt(dx*dx+dy*dy);
      t2SegDur = Math.max(500, dist / 0.22);
    }
    const p = t2SegDur>0 ? Math.min(1, segElapsed/t2SegDur) : 1;
    const cx = t2Waypoints[0].x + (t2Waypoints[1].x - t2Waypoints[0].x)*p;
    const cy = t2Waypoints[0].y + (t2Waypoints[1].y - t2Waypoints[0].y)*p;
    t2Target.style.left = cx+'px';
    t2Target.style.top = cy+'px';
    t2Target._cx = cx; t2Target._cy = cy;

    if(t2Arena._cursor){
      const dx = t2Arena._cursor.x - cx, dy = t2Arena._cursor.y - cy;
      const onTarget = Math.sqrt(dx*dx+dy*dy) <= T2_RADIUS;
      state.t2.samples += dt;
      if(onTarget) state.t2.onTarget += dt;
      const pct = state.t2.samples>0 ? Math.round(100*state.t2.onTarget/state.t2.samples) : 0;
      document.getElementById('t2-pct').textContent = pct + '%';
    }

    if(remaining <= 0){ endT2(); return; }
    requestAnimationFrame(t2Loop);
  }

  function endT2(){
    state.t2.running = false;
    if(t2Target){ t2Target.remove(); t2Target = null; }
    setDots(3);
    computeAndShowResults();
  }

  document.getElementById('t2-begin').addEventListener('click', function(){
    t2Overlay.classList.add('hidden');
    t2Target = document.createElement('div');
    t2Target.className = 'target';
    t2Target.style.width = (T2_RADIUS*2)+'px';
    t2Target.style.height = (T2_RADIUS*2)+'px';
    t2Arena.appendChild(t2Target);
    t2Waypoints = [newWaypoint(), newWaypoint()];
    t2SegStart = performance.now();
    const dx = t2Waypoints[1].x - t2Waypoints[0].x, dy = t2Waypoints[1].y - t2Waypoints[0].y;
    t2SegDur = Math.max(500, Math.sqrt(dx*dx+dy*dy)/0.22);
    state.t2.samples = 0;
    state.t2.onTarget = 0;
    state.t2.running = true;
    state.t2.startTime = performance.now();
    t2LastTick = 0;
    requestAnimationFrame(t2Loop);
  });

  function computeAndShowResults(){
    const dpi = state.dpi;
    const currentCm = cm360(dpi, state.currentSens);

    const trackingPct = state.t2.samples>0 ? (100*state.t2.onTarget/state.t2.samples) : 50;
    const BENCH_TRACKING = 75;
    const trackAdjust = (BENCH_TRACKING - trackingPct) * 0.5;

    const avgReaction = state.t1.reactionTimes.length
      ? state.t1.reactionTimes.reduce((a,b)=>a+b,0)/state.t1.reactionTimes.length
      : 700;
    const BENCH_REACTION = 550;
    const reactAdjust = -((avgReaction - BENCH_REACTION) / BENCH_REACTION) * 15;

    let totalAdjustPct = trackAdjust + reactAdjust;
    totalAdjustPct = Math.max(-20, Math.min(20, totalAdjustPct));

    const newCm = currentCm * (1 + totalAdjustPct/100);
    const newSens = sensFromCm360(dpi, newCm);
    const edpi = Math.round(dpi * newSens);

    document.getElementById('res-sens').textContent = newSens.toFixed(3);
    document.getElementById('res-sens-copy').textContent = newSens.toFixed(3);
    document.getElementById('res-cm').textContent = newCm.toFixed(1) + ' cm';
    document.getElementById('res-edpi').textContent = edpi;
    document.getElementById('res-adj').textContent = (totalAdjustPct>=0?'+':'') + totalAdjustPct.toFixed(1) + '%';
    document.getElementById('res-dpi-hint').textContent = dpi;

    let explain = `Based on ${state.t1.hits} Grid Shot hits (avg reaction ${Math.round(avgReaction)}ms) `
      + `and ${Math.round(trackingPct)}% time-on-target in tracking, this starting point is `
      + `${totalAdjustPct>=0 ? 'less sensitive' : 'more sensitive'} than your current setting by about ${Math.abs(totalAdjustPct).toFixed(1)}%. `
      + `Treat this as a tuned starting point, not a final answer — spend a few games at this value, then nudge cm/360 up if you're overshooting flicks or down if your flicks fall short. `
      + `The conversion uses cm/360 = 2.54 × 360 ÷ (sensitivity × DPI × ${VALORANT_YAW}), the standard formula for Valorant's raw input scaling.`;
    document.getElementById('res-explain').textContent = explain;

    setDots(4);
    show('screen-results');
  }

  document.getElementById('copySensBtn').addEventListener('click', function(){
    const text = document.getElementById('res-sens-copy').textContent;
    navigator.clipboard.writeText(text).then(()=>{
      this.textContent = 'Copied';
      setTimeout(()=>{ this.textContent = 'Copy'; }, 1200);
    }).catch(()=>{
      alert('Copy failed — select and copy manually: ' + text);
    });
  });

  document.getElementById('retryBtn').addEventListener('click', function(){
    state.t1 = { hits:0, reactionTimes:[], startTime:0, spawnTime:0, running:false };
    state.t2 = { samples:0, onTarget:0, startTime:0, running:false };
    document.getElementById('t1-overlay').classList.remove('hidden');
    document.getElementById('t2-overlay').classList.remove('hidden');
    document.getElementById('t1-hits').textContent = '0';
    document.getElementById('t1-avg').textContent = '—';
    document.getElementById('t1-rate').textContent = '—';
    document.getElementById('t2-pct').textContent = '0%';
    setDots(0);
    show('screen-setup');
  });

})();