import { View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GAME_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#060d1a;overflow:hidden;font-family:-apple-system,sans-serif}
canvas{display:block;touch-action:none}
/* ── HUD ── */
#ui{
  position:fixed;top:0;left:0;right:0;
  display:flex;align-items:center;
  padding:14px 16px 0;
  pointer-events:none;z-index:10;gap:10px;
}
#ui-left{width:50px;flex-shrink:0}
#ui-center{
  flex:1;display:flex;flex-direction:column;align-items:center;
}
#scoreRow{display:flex;align-items:center;gap:10px}
#score{color:#fff;font-size:34px;font-weight:900;text-shadow:0 2px 12px rgba(0,0,0,.9);line-height:1}
#pauseBtn{
  pointer-events:all;cursor:pointer;
  background:rgba(0,0,0,0.45);
  border:1.5px solid rgba(255,255,255,0.25);
  border-radius:10px;padding:4px 10px;
  color:#fff;font-size:13px;font-weight:700;
  display:none;align-items:center;gap:4px;
  user-select:none;-webkit-user-select:none;
}
#pauseBtn.visible{display:flex}
#power{color:#fbbf24;font-size:12px;font-weight:700;min-height:15px;margin-top:2px}
#ui-right{flex-shrink:0}
#best{color:#f97316;font-size:13px;font-weight:700;text-align:right}
/* ── Overlays ── */
#overlay,#pauseOverlay{
  position:fixed;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  background:rgba(0,0,0,.82);z-index:20;gap:10px;
}
#overlay.hidden,#pauseOverlay.hidden{display:none}
#overlay h1{color:#fff;font-size:36px;font-weight:900}
#overlay .hint{color:#f97316;font-size:18px;font-weight:700;margin-top:8px}
#overlay .info{color:#9ca3af;font-size:13px;text-align:center;max-width:280px;line-height:1.7}
#overlay .scoreBox{background:#1a1a1a;border-radius:12px;padding:12px 36px;text-align:center;border:1px solid #2a2a2a}
#overlay .scoreBox span{color:#9ca3af;font-size:13px;display:block}
#overlay .scoreBox b{color:#fff;font-size:30px}
#pauseOverlay h2{color:#fff;font-size:32px;font-weight:900}
#pauseOverlay p{color:#9ca3af;font-size:14px}
.pBtn{width:220px;padding:14px;border-radius:14px;border:none;cursor:pointer;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px}
.pBtn.resume{background:#f97316;color:#fff}
.pBtn.restart{background:#1a1a1a;color:#9ca3af;border:1px solid #2a2a2a;margin-top:4px}
/* ── Frozen canvas shown while paused ── */
#frozenOverlay{
  position:fixed;inset:0;z-index:15;display:none;
}
#frozenOverlay.visible{display:block}
</style>
</head>
<body>
<div id="ui">
  <div id="ui-left"></div>
  <div id="ui-center">
    <div id="scoreRow">
      <div id="score">0</div>
      <div id="pauseBtn" onclick="togglePause()">
        <span id="pauseIcon">⏸</span><span id="pauseLabel">Pause</span>
      </div>
    </div>
    <div id="power"></div>
  </div>
  <div id="ui-right"><div id="best">BEST: 0</div></div>
</div>

<!-- Frozen screenshot shown while paused -->
<canvas id="frozen" style="position:fixed;inset:0;z-index:15;display:none"></canvas>

<div id="pauseOverlay" class="hidden">
  <span style="font-size:52px">⏸</span>
  <h2>Paused</h2>
  <p>Score: <b id="pauseScore" style="color:#fff">0</b></p>
  <button class="pBtn resume" onclick="togglePause()">▶&nbsp; Resume</button>
  <button class="pBtn restart" onclick="restartFromPause()">↺&nbsp; Restart</button>
</div>

<div id="overlay">
  <canvas id="logo" width="100" height="100" style="margin-bottom:4px"></canvas>
  <h1>SoshoBird</h1>
  <div class="info">Tap to fly &middot; Avoid planes &amp; storms<br>Grab ✨ coins for power-up!</div>
  <div class="hint">Tap to start</div>
</div>

<canvas id="c"></canvas>

<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
<script>
const {Engine,Runner,Bodies,Body,World,Events}=Matter;
const W=window.innerWidth, H=window.innerHeight;
const canvas=document.getElementById('c');
canvas.width=W; canvas.height=H;
const ctx=canvas.getContext('2d');
const frozenCanvas=document.getElementById('frozen');
frozenCanvas.width=W; frozenCanvas.height=H;
const fctx=frozenCanvas.getContext('2d');

// ── Constants ──────────────────────────────────────────────
const GRASS_H=42;
const WORLD_GROUND=2000;
const BIRD_X=W*.22, BIRD_R=20, OBS_W=54;
const COIN_R=14;
const POWER_DURATION=180, BLINK_START=60;
const SPAWN_INTERVAL=120, PLANE_INTERVAL=260, COIN_INTERVAL=180;

// Difficulty ramps with score
const BASE_GRAVITY   = 0.8;   // slow fall at start
const BASE_OBS_SPEED = 1.8;   // slow obstacles at start
const BASE_PLANE_SPD = 3.0;
const MAX_GRAVITY    = 2.2;
const MAX_OBS_SPEED  = 5.5;
const MAX_PLANE_SPD  = 7.0;

// Cloud blanket ceiling (world Y — high in the sky = small number)
const CLOUD_CEILING_Y = WORLD_GROUND - 3000; // 3000 units above ground

// Planets start appearing above this height
const PLANET_ALTITUDE = WORLD_GROUND - 1200; // world Y below which planets appear

// Planet colour palette
const PLANET_COLORS = ['#a855f7','#06b6d4','#f43f5e','#84cc16','#f97316','#3b82f6'];

// Bird tint when it hits a planet (10 seconds = 600 frames)
const PLANET_TINT_DURATION = 600;

// ── Camera ─────────────────────────────────────────────────
// camY is the world Y that maps to screen centre.
// Everything is drawn at (worldY - camY + H/2).
let camY=WORLD_GROUND/2; // starts at mid-world

function toScreen(worldY){ return worldY - camY + H/2; }
function toWorld(screenY){ return screenY + camY - H/2; }

// ── Stars (world-space, tile vertically) ───────────────────
const STAR_TILE=800;
const starsBase=Array.from({length:80},()=>({
  wx:Math.random()*W,
  wy:Math.random()*STAR_TILE,
  r:Math.random()*1.6+.2,
  a:Math.random()*Math.PI*2
}));

// ── Persistent state ───────────────────────────────────────
let best=0;

// ── Per-round state ────────────────────────────────────────
let engine,runner,birdBody;
let obstacles=[],planes=[],coins=[],planets=[],particles=[],smokeParticles=[];
let state='idle',score=0,frame=0,powerFrames=0,blinkOn=true,paused=false;
let crashX=0,crashSY=0,crashFrame=0;
let planetTintFrames=0, planetTintColor='#a855f7';

// Difficulty factor 0→1 over first 60 score points
function diff(){ return Math.min(score/60, 1); }
function obsSpeed(){ return BASE_OBS_SPEED + (MAX_OBS_SPEED-BASE_OBS_SPEED)*diff(); }
function planeSpeed(){ return BASE_PLANE_SPD + (MAX_PLANE_SPD-BASE_PLANE_SPD)*diff(); }
function gravity(){ return BASE_GRAVITY + (MAX_GRAVITY-BASE_GRAVITY)*diff(); }

// ── Audio ──────────────────────────────────────────────────
let audioCtx=null;
function getAudio(){ if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)(); return audioCtx; }
function playSound(type){
  try{
    const ac=getAudio(); const g=ac.createGain(); g.connect(ac.destination);
    if(type==='flap'){
      const o=ac.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(520,ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(220,ac.currentTime+0.12);
      g.gain.setValueAtTime(0.18,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.12);
      o.connect(g); o.start(); o.stop(ac.currentTime+0.12);
    } else if(type==='coin'){
      [0,0.08,0.16].forEach((t,i)=>{
        const o=ac.createOscillator(); o.type='triangle';
        o.frequency.setValueAtTime(600+i*220,ac.currentTime+t);
        const gn=ac.createGain(); gn.gain.setValueAtTime(0.22,ac.currentTime+t);
        gn.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+t+0.18);
        o.connect(gn); gn.connect(ac.destination);
        o.start(ac.currentTime+t); o.stop(ac.currentTime+t+0.18);
      });
    } else if(type==='break'){
      const buf=ac.createBuffer(1,ac.sampleRate*.12,ac.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
      const src=ac.createBufferSource(); src.buffer=buf;
      const f=ac.createBiquadFilter(); f.type='bandpass'; f.frequency.value=800;
      src.connect(f); f.connect(g); g.gain.setValueAtTime(0.35,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+.12);
      src.start(); src.stop(ac.currentTime+.12);
    } else if(type==='die'){
      const o=ac.createOscillator(); o.type='sawtooth';
      o.frequency.setValueAtTime(420,ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(80,ac.currentTime+.55);
      g.gain.setValueAtTime(0.22,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+.55);
      o.connect(g); o.start(); o.stop(ac.currentTime+.55);
    } else if(type==='crash'){
      const buf=ac.createBuffer(1,ac.sampleRate*.4,ac.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
      const src=ac.createBufferSource(); src.buffer=buf;
      const f=ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=220;
      src.connect(f); f.connect(g); g.gain.setValueAtTime(0.6,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+.4);
      src.start(); src.stop(ac.currentTime+.4);
    } else if(type==='score'){
      const o=ac.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(880,ac.currentTime);
      g.gain.setValueAtTime(0.1,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+.07);
      o.connect(g); o.start(); o.stop(ac.currentTime+.07);
    } else if(type==='powerup'){
      const o=ac.createOscillator(); o.type='triangle';
      o.frequency.setValueAtTime(300,ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(1200,ac.currentTime+.3);
      g.gain.setValueAtTime(0.2,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+.3);
      o.connect(g); o.start(); o.stop(ac.currentTime+.3);
    }
  }catch(e){}
}

// ── Engine reset ───────────────────────────────────────────
function resetEngine(){
  if(runner) Runner.stop(runner);
  engine=Engine.create({gravity:{y:0}});
  runner=Runner.create();
  // Bird starts at middle of world
  birdBody=Bodies.circle(BIRD_X,WORLD_GROUND/2,BIRD_R,{
    label:'bird',restitution:0,frictionAir:.04,
    collisionFilter:{category:0x0001,mask:0x0002}
  });
  // Ground at bottom of world
  const gnd=Bodies.rectangle(W/2,WORLD_GROUND+25,W*3,50,{isStatic:true,label:'ground',collisionFilter:{category:0x0002}});
  // No hard ceiling — infinite sky
  World.add(engine.world,[birdBody,gnd]);
  Events.on(engine,'collisionStart',(e)=>{
    if(state!=='playing') return;
    e.pairs.forEach(p=>{
      if(p.bodyA.label==='bird'||p.bodyB.label==='bird'){
        const other=p.bodyA.label==='bird'?p.bodyB:p.bodyA;
        if(other.label==='ground'){ crashBird(); }
        else if(other.label==='obstacle'||other.label==='plane'){
          if(powerFrames>0){
            burstParticles(other.position.x,other.position.y,'#f97316',18);
            World.remove(engine.world,other);
            obstacles=obstacles.filter(o=>o.body!==other);
            planes=planes.filter(pl=>pl.body!==other);
            updateScore(score+2); playSound('break');
          } else { die(); }
        }
      }
    });
  });
  Runner.run(runner,engine);
}

// ── Particles ──────────────────────────────────────────────
function burstParticles(wx,wy,color,count=18){
  for(let i=0;i<count;i++){
    const a=(Math.PI*2/count)*i,spd=3+Math.random()*4;
    // store in world-space Y
    particles.push({wx,wy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,color});
  }
}

function spawnSmoke(wx,wy){
  for(let i=0;i<30;i++){
    const angle=-Math.PI/2+(-0.6+Math.random()*1.2);
    const spd=0.5+Math.random()*2.5;
    smokeParticles.push({
      wx:wx+(Math.random()-0.5)*20, wy,
      vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd-Math.random(),
      life:1, r:8+Math.random()*14, gray:Math.floor(150+Math.random()*80)
    });
  }
}

// ── Spawners (world-space Y) ────────────────────────────────
function spawnObstacle(){
  // Spawn ahead of the bird vertically across full range
  const worldY=birdBody.position.y + (Math.random()-.5)*H*.8;
  const h=40+Math.random()*40;
  const b=Bodies.rectangle(W+OBS_W/2,worldY,OBS_W,h,{isStatic:true,label:'obstacle',collisionFilter:{category:0x0002}});
  World.add(engine.world,b);
  obstacles.push({body:b,type:Math.random()<.5?'cloud':'storm'});
}

function spawnPlane(){
  const worldY=birdBody.position.y+(Math.random()-.5)*H*.7;
  const b=Bodies.rectangle(W+80,worldY,90,28,{isStatic:true,label:'plane',collisionFilter:{category:0x0002}});
  World.add(engine.world,b);
  planes.push({body:b,f:0});
}

function spawnCoin(){
  const worldY=birdBody.position.y+(Math.random()-.5)*H*.6;
  coins.push({wx:W+COIN_R,wy:worldY,anim:0});
}

function spawnPlanet(){
  // Only spawn when bird is high enough
  if(birdBody.position.y > PLANET_ALTITUDE) return;
  const worldY=birdBody.position.y+(Math.random()-.5)*H*.7;
  const r=30+Math.random()*50;
  const color=PLANET_COLORS[Math.floor(Math.random()*PLANET_COLORS.length)];
  planets.push({wx:W+r+20, wy:worldY, r, color, ring:Math.random()>.5, anim:Math.random()*Math.PI*2});
}

// ── Game flow ───────────────────────────────────────────────
function flap(){
  if(state==='dead'||paused) return;
  if(state==='idle') startGame();
  playSound('flap');
  Body.setVelocity(birdBody,{x:0,y:-9.5});
}

function startGame(){
  resetEngine();
  obstacles=[];planes=[];coins=[];planets=[];particles=[];smokeParticles=[];
  state='playing';score=0;frame=0;powerFrames=0;blinkOn=true;crashFrame=0;paused=false;
  planetTintFrames=0;
  camY=WORLD_GROUND/2;
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('pauseOverlay').classList.add('hidden');
  frozenCanvas.style.display='none';
  document.getElementById('pauseBtn').classList.add('visible');
  document.getElementById('pauseIcon').textContent='⏸';
  document.getElementById('pauseLabel').textContent='Pause';
  engine.gravity.y=BASE_GRAVITY;
  Body.setPosition(birdBody,{x:BIRD_X,y:WORLD_GROUND/2});
  Body.setVelocity(birdBody,{x:0,y:0});
  updateScore(0);updatePowerUI();
}

function crashBird(){
  if(state==='dead') return;
  state='dead';powerFrames=0;blinkOn=true;paused=false;
  document.getElementById('pauseBtn').classList.remove('visible');
  frozenCanvas.style.display='none';
  engine.gravity.y=0;
  Body.setVelocity(birdBody,{x:0,y:0});
  crashX=birdBody.position.x;
  crashSY=toScreen(WORLD_GROUND)-BIRD_R; // screen Y of ground
  crashFrame=frame;
  burstParticles(birdBody.position.x,WORLD_GROUND,'#ef4444',20);
  burstParticles(birdBody.position.x,WORLD_GROUND,'#92400e',14);
  spawnSmoke(birdBody.position.x,WORLD_GROUND);
  playSound('crash');
  if(score>best) best=score;
  document.getElementById('best').textContent='BEST: '+best;
  setTimeout(showGameOver,1800);
}

function die(){
  if(state==='dead') return;
  state='dead';powerFrames=0;blinkOn=true;paused=false;
  document.getElementById('pauseBtn').classList.remove('visible');
  frozenCanvas.style.display='none';
  engine.gravity.y=0;
  Body.setVelocity(birdBody,{x:0,y:0});
  burstParticles(birdBody.position.x,birdBody.position.y,'#ef4444',24);
  playSound('die');
  if(score>best) best=score;
  document.getElementById('best').textContent='BEST: '+best;
  setTimeout(showGameOver,800);
}

function showGameOver(){
  const ov=document.getElementById('overlay');
  ov.innerHTML=
    '<canvas id="logo2" width="90" height="90" style="margin-bottom:4px"></canvas>'+
    '<h1 style="color:#ef4444">Game Over!</h1>'+
    '<div class="scoreBox"><span>Your score</span><b>'+score+'</b></div>'+
    (score>0&&score===best?'<div style="color:#fbbf24;font-weight:700;font-size:16px">🏆 New Best!</div>':'')+
    '<div class="hint">Tap to play again</div>';
  ov.classList.remove('hidden');
  state='idle';
  const lc=document.getElementById('logo2');
  if(lc){
    const lx=lc.getContext('2d');
    const cx=45,cy=47;
    lx.shadowColor='#ef4444';lx.shadowBlur=14;
    lx.beginPath();lx.arc(cx,cy,20,0,Math.PI*2);lx.fillStyle='#ef4444';lx.fill();
    lx.shadowBlur=0;lx.strokeStyle='#fff';lx.lineWidth=3;lx.lineCap='round';
    lx.beginPath();lx.moveTo(cx-8,cy-8);lx.lineTo(cx+8,cy+8);lx.stroke();
    lx.beginPath();lx.moveTo(cx+8,cy-8);lx.lineTo(cx-8,cy+8);lx.stroke();
  }
}

function togglePause(){
  if(state!=='playing') return;
  paused=!paused;
  const icon=document.getElementById('pauseIcon');
  const label=document.getElementById('pauseLabel');
  const po=document.getElementById('pauseOverlay');
  const pb=document.getElementById('pauseBtn');
  if(paused){
    Runner.stop(runner);
    // Freeze frame: copy game canvas to frozen canvas
    fctx.drawImage(canvas,0,0);
    frozenCanvas.style.display='block';
    po.classList.remove('hidden');
    document.getElementById('pauseScore').textContent=score;
    icon.textContent='▶'; label.textContent='Resume';
    pb.style.borderColor='rgba(249,115,22,0.7)';
  } else {
    Runner.run(runner,engine);
    frozenCanvas.style.display='none';
    po.classList.add('hidden');
    icon.textContent='⏸'; label.textContent='Pause';
    pb.style.borderColor='rgba(255,255,255,0.25)';
  }
}

function restartFromPause(){
  paused=false;
  frozenCanvas.style.display='none';
  document.getElementById('pauseBtn').classList.remove('visible');
  startGame();
}

function updateScore(n){score=n;document.getElementById('score').textContent=n;}
function updatePowerUI(){
  document.getElementById('power').textContent=powerFrames>0?'✨ POWER: '+Math.ceil(powerFrames/60)+'s':'';
}
function collectCoin(coin){
  powerFrames=POWER_DURATION;
  engine.gravity.y=0.3; // float while powered
  burstParticles(coin.wx,coin.wy,'#fbbf24',22);
  updateScore(score+3);updatePowerUI();
  playSound('coin'); playSound('powerup');
}

// ── Drawing ────────────────────────────────────────────────
function drawBg(){
  // Scrolling sky
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#060d1a'); g.addColorStop(1,'#0d2137');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // Tiling stars across vertical world
  const tileOffset = camY % STAR_TILE;
  for(let row=-1;row<=1;row++){
    starsBase.forEach(s=>{
      s.a+=.004;
      const sy=s.wy - tileOffset + row*STAR_TILE;
      if(sy<-10||sy>H+10) return;
      ctx.beginPath(); ctx.arc(s.wx,sy,s.r,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,'+(0.25+0.4*Math.sin(s.a))+')'; ctx.fill();
    });
  }
  // Moon stays fixed at top right
  ctx.beginPath(); ctx.arc(W-52,58,22,0,Math.PI*2);
  ctx.fillStyle='#fef08a'; ctx.shadowColor='#fef08a'; ctx.shadowBlur=18; ctx.fill(); ctx.shadowBlur=0;
}

function drawGround(){
  const groundSY=toScreen(WORLD_GROUND);
  if(groundSY>H) return; // ground scrolled off bottom — don't draw
  if(groundSY<0) return; // ground scrolled above screen
  ctx.fillStyle='#1c0d00'; ctx.fillRect(0,groundSY,W,H-groundSY);
  ctx.fillStyle='#15803d'; ctx.fillRect(0,groundSY,W,14);
  ctx.fillStyle='#16a34a'; ctx.fillRect(0,groundSY,W,7);
  ctx.fillStyle='#22c55e';
  for(let gx=4;gx<W;gx+=9){
    const jitter=(gx*7)%5;
    ctx.beginPath();
    ctx.moveTo(gx,groundSY+2); ctx.lineTo(gx+3,groundSY-6-jitter); ctx.lineTo(gx+6,groundSY+2);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(0,groundSY+14,W,6);
}

function drawCloudCeiling(){
  const ceilSY=toScreen(CLOUD_CEILING_Y);
  if(ceilSY>H+120) return;
  for(let row=0;row<3;row++){
    const yOff=ceilSY-row*22;
    const alpha=0.55+row*0.15;
    ctx.fillStyle='rgba(180,200,230,'+alpha+')';
    const seed=row*137;
    for(let cx2=-(frame%80)-seed;cx2<W+80;cx2+=55){
      const r=28+((cx2*13+row*17)%20);
      ctx.beginPath();ctx.arc(cx2,yOff,r,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx2+22,yOff-10,r*.7,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(cx2-18,yOff-8,r*.65,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.fillStyle='rgba(220,240,255,0.18)';
  ctx.fillRect(0,ceilSY-8,W,20);
}

function drawPlanets(){
  planets.forEach(p=>{
    const sy=toScreen(p.wy);
    if(sy<-p.r*2||sy>H+p.r*2) return;
    p.anim+=0.005;
    ctx.save();ctx.translate(p.wx,sy);
    ctx.shadowColor=p.color;ctx.shadowBlur=p.r*.6;
    const grad=ctx.createRadialGradient(-p.r*.3,-p.r*.3,p.r*.1,0,0,p.r);
    grad.addColorStop(0,'#fff');grad.addColorStop(0.3,p.color);grad.addColorStop(1,'#000a');
    ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();
    ctx.shadowBlur=0;
    if(p.ring){
      ctx.save();ctx.scale(1,0.3);
      ctx.beginPath();ctx.arc(0,0,p.r*1.6,0,Math.PI*2);
      ctx.strokeStyle=p.color+'aa';ctx.lineWidth=p.r*.18;ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha=0.22;
    for(let i=0;i<4;i++){
      const a=p.anim+i*1.57;
      ctx.beginPath();ctx.arc(Math.cos(a)*p.r*.5,Math.sin(a)*p.r*.4,p.r*.18,0,Math.PI*2);
      ctx.fillStyle='#000';ctx.fill();
    }
    ctx.globalAlpha=1;ctx.restore();
  });
}

function drawBird(){
  const bsx=birdBody.position.x, bsy=toScreen(birdBody.position.y);
  if(bsy<-40||bsy>H+40) return;
  const angle=Math.max(-.5,Math.min(1.2,birdBody.velocity.y*.08));
  if(powerFrames>0&&powerFrames<=BLINK_START){ if(frame%8===0) blinkOn=!blinkOn; }
  else { blinkOn=true; }
  if(!blinkOn) return;
  ctx.save(); ctx.translate(bsx,bsy); ctx.rotate(angle);
  // Glow: power=gold, planet tint=planet color, normal=none
  const tinted = planetTintFrames>0;
  const birdColor = powerFrames>0 ? '#fbbf24' : tinted ? planetTintColor : '#f97316';
  const wingColor = powerFrames>0 ? '#f59e0b' : tinted ? planetTintColor+'cc' : '#ea6c00';
  if(powerFrames>0){ ctx.shadowColor='#fbbf24'; ctx.shadowBlur=22; }
  else if(tinted){ ctx.shadowColor=planetTintColor; ctx.shadowBlur=16; }
  ctx.beginPath(); ctx.arc(0,0,BIRD_R,0,Math.PI*2);
  ctx.fillStyle=birdColor; ctx.fill();
  const wo=state==='playing'?Math.sin(frame*.5)*6:0;
  ctx.beginPath(); ctx.ellipse(-7,wo,11,6,-.3,0,Math.PI*2);
  ctx.fillStyle=wingColor; ctx.fill();
  ctx.shadowBlur=0;
  ctx.beginPath(); ctx.arc(9,-5,5,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(10,-5,2.5,0,Math.PI*2); ctx.fillStyle='#1a1a1a'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(17,-2); ctx.lineTo(26,0); ctx.lineTo(17,4);
  ctx.closePath(); ctx.fillStyle='#fbbf24'; ctx.fill();
  ctx.restore();
}

function drawObstacles(){
  obstacles.forEach(o=>{
    const wx=o.body.position.x, wy=o.body.position.y;
    const sy=toScreen(wy);
    if(sy<-100||sy>H+100) return;
    const hw=o.body.bounds.max.x-wx, hh=o.body.bounds.max.y-wy;
    ctx.save(); ctx.translate(wx,sy);
    if(o.type==='storm'){
      ctx.fillStyle='#374151';
      [[0,0,hw*.9],[hw*.4,-hh*.4,hw*.7],[-.4*hw,-hh*.3,hw*.6]].forEach(([cx,cy,r])=>{
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      });
      ctx.strokeStyle='#fbbf24'; ctx.lineWidth=2.5; ctx.shadowColor='#fbbf24'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.moveTo(4,-hh*.3); ctx.lineTo(-4,0); ctx.lineTo(2,0); ctx.lineTo(-6,hh*.4); ctx.stroke(); ctx.shadowBlur=0;
    } else {
      ctx.fillStyle='#94a3b8';
      [[0,0,hw*.85],[hw*.38,-hh*.35,hw*.65],[-.35*hw,-hh*.25,hw*.55],[hw*.1,hh*.15,hw*.6]].forEach(([cx,cy,r])=>{
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      });
    }
    ctx.restore();
  });
}

function drawPlanes(){
  planes.forEach(pl=>{
    const wx=pl.body.position.x, wy=pl.body.position.y;
    const sy=toScreen(wy);
    if(sy<-60||sy>H+60) return;
    ctx.save(); ctx.translate(wx,sy);
    ctx.fillStyle='#e2e8f0'; ctx.beginPath(); ctx.ellipse(0,0,42,12,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#cbd5e1'; ctx.beginPath(); ctx.moveTo(42,0); ctx.lineTo(58,-5); ctx.lineTo(58,5); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#7dd3fc'; ctx.beginPath(); ctx.ellipse(22,-6,12,7,-.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#94a3b8';
    ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(-25,-35); ctx.lineTo(-35,-8); ctx.lineTo(10,-12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,12); ctx.lineTo(-25,35); ctx.lineTo(-35,8); ctx.lineTo(10,12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-38,-12); ctx.lineTo(-55,-28); ctx.lineTo(-42,-12); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#f97316'; ctx.shadowColor='#f97316'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(-18,14,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.restore();
  });
}

function drawCoins(){
  coins.forEach(c=>{
    const sy=toScreen(c.wy);
    if(sy<-30||sy>H+30) return;
    c.anim+=.06;
    const s=1+Math.sin(c.anim)*.15;
    ctx.save(); ctx.translate(c.wx,sy); ctx.scale(s,s);
    ctx.shadowColor='#fbbf24'; ctx.shadowBlur=16;
    ctx.beginPath(); ctx.arc(0,0,COIN_R,0,Math.PI*2); ctx.fillStyle='#fbbf24'; ctx.fill();
    ctx.shadowBlur=0;
    ctx.beginPath(); ctx.arc(0,0,COIN_R*.65,0,Math.PI*2); ctx.fillStyle='#f59e0b'; ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold '+Math.round(COIN_R*.9)+'px serif';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('✨',0,1);
    ctx.restore();
  });
}

function drawParticles(){
  particles=particles.filter(p=>{
    p.wx+=p.vx; p.wy+=p.vy; p.vx*=.93; p.vy*=.93; p.life-=.035;
    if(p.life<=0) return false;
    const sy=toScreen(p.wy);
    ctx.beginPath(); ctx.arc(p.wx,sy,3*p.life,0,Math.PI*2);
    ctx.fillStyle=p.color+Math.round(p.life*255).toString(16).padStart(2,'0');
    ctx.fill(); return true;
  });
}

function drawSmoke(){
  smokeParticles=smokeParticles.filter(s=>{
    s.wx+=s.vx; s.wy+=s.vy; s.vy-=0.04; s.vx*=0.99; s.r+=0.3; s.life-=0.012;
    if(s.life<=0) return false;
    const sy=toScreen(s.wy);
    ctx.beginPath(); ctx.arc(s.wx,sy,s.r,0,Math.PI*2);
    ctx.fillStyle='rgba('+s.gray+','+s.gray+','+s.gray+','+(s.life*.45)+')'; ctx.fill();
    return true;
  });
  if(state==='dead'&&crashFrame>0&&frame-crashFrame<90){
    if(frame%6===0) spawnSmoke(crashX,WORLD_GROUND);
  }
}

function drawCrash(){
  if(state!=='dead'||crashFrame===0) return;
  const sy=toScreen(WORLD_GROUND)-BIRD_R;
  if(sy>H||sy<0) return;
  const age=frame-crashFrame;
  ctx.save(); ctx.translate(crashX,sy);
  ctx.strokeStyle='#ef4444'; ctx.lineWidth=4; ctx.lineCap='round';
  const sz=BIRD_R+4;
  ctx.beginPath(); ctx.moveTo(-sz,-sz); ctx.lineTo(sz,sz); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sz,-sz); ctx.lineTo(-sz,sz); ctx.stroke();
  for(let i=0;i<5;i++){
    const fa=(age*.08+i*1.26)%(Math.PI*2);
    const fr=BIRD_R+8+i*4;
    ctx.beginPath(); ctx.ellipse(Math.cos(fa)*fr,Math.sin(fa)*fr*.4,5,2,fa,0,Math.PI*2);
    ctx.fillStyle='#f97316'; ctx.fill();
  }
  ctx.restore();
}

// ── Main loop ──────────────────────────────────────────────
function loop(){
  requestAnimationFrame(loop);
  // When paused: render loop stops completely (frozen canvas shows the last frame)
  if(paused) return;
  frame++;

  // Smooth camera — follow bird vertically, keep bird at ~40% from top
  if(state==='playing'){
    const targetCamY = birdBody.position.y - H*.1; // bird stays ~40% from top
    camY += (targetCamY - camY) * 0.12; // smooth lerp
  }

  drawBg();

  if(state==='playing'){
    const spd=obsSpeed();
    const pspd=planeSpeed();

    // Ramp gravity with difficulty
    if(powerFrames===0) engine.gravity.y=gravity();

    obstacles.forEach(o=>Body.setPosition(o.body,{x:o.body.position.x-spd,y:o.body.position.y}));
    obstacles=obstacles.filter(o=>{if(o.body.position.x<-80){World.remove(engine.world,o.body);return false;}return true;});
    planes.forEach(pl=>{Body.setPosition(pl.body,{x:pl.body.position.x-pspd,y:pl.body.position.y});pl.f++;});
    planes=planes.filter(pl=>{if(pl.body.position.x<-120){World.remove(engine.world,pl.body);return false;}return true;});

    // Move planets
    planets.forEach(p=>{p.wx-=spd*.5;});
    planets=planets.filter(p=>{
      if(p.wx<-p.r-20) return false;
      // Check bird collision with planet
      const dx=birdBody.position.x-p.wx, dy=birdBody.position.y-p.wy;
      if(Math.sqrt(dx*dx+dy*dy)<BIRD_R+p.r+4){
        planetTintFrames=PLANET_TINT_DURATION;
        planetTintColor=p.color;
        burstParticles(p.wx,p.wy,p.color,20);
        playSound('powerup');
        return false; // consume planet
      }
      return true;
    });

    // Cloud ceiling — bounce bird back down
    if(birdBody.position.y < CLOUD_CEILING_Y){
      Body.setPosition(birdBody,{x:birdBody.position.x, y:CLOUD_CEILING_Y+BIRD_R+2});
      Body.setVelocity(birdBody,{x:0, y:Math.abs(birdBody.velocity.y)*0.5+2});
    }

    coins.forEach(c=>{c.wx-=spd*.9;});
    coins=coins.filter(c=>{
      if(c.wx<-20) return false;
      const dx=birdBody.position.x-c.wx, dy=birdBody.position.y-c.wy;
      if(Math.sqrt(dx*dx+dy*dy)<BIRD_R+COIN_R+4){ collectCoin(c); return false; }
      return true;
    });

    if(powerFrames>0){
      powerFrames--;updatePowerUI();
      if(powerFrames===0){ blinkOn=true;updatePowerUI(); engine.gravity.y=gravity(); }
    }
    if(planetTintFrames>0) planetTintFrames--;

    if(frame%SPAWN_INTERVAL===0) spawnObstacle();
    if(frame%PLANE_INTERVAL===0) spawnPlane();
    if(frame%COIN_INTERVAL===30) spawnCoin();
    // Spawn planets only at altitude
    if(frame%180===60 && birdBody.position.y<PLANET_ALTITUDE) spawnPlanet();

    if(frame%120===0){ updateScore(score+1); playSound('score'); }
  }

  drawGround();
  drawCloudCeiling();
  drawPlanets();
  drawObstacles(); drawPlanes(); drawCoins();
  drawSmoke(); drawParticles();
  drawBird(); drawCrash();
}

// ── Input ──────────────────────────────────────────────────
canvas.addEventListener('click',flap);
canvas.addEventListener('touchstart',(e)=>{e.preventDefault();flap();},{passive:false});
document.getElementById('overlay').addEventListener('click',flap);
document.getElementById('overlay').addEventListener('touchstart',(e)=>{e.preventDefault();flap();},{passive:false});

// ── Boot ───────────────────────────────────────────────────
resetEngine();
loop();

// Draw start-screen logo
(function drawLogo(){
  const lc=document.getElementById('logo');
  const lx=lc.getContext('2d');
  const cx=50,cy=52;
  lx.shadowColor='#f97316'; lx.shadowBlur=18;
  lx.beginPath(); lx.arc(cx,cy,22,0,Math.PI*2); lx.fillStyle='#f97316'; lx.fill();
  lx.beginPath(); lx.ellipse(cx-8,cy+4,13,7,-0.3,0,Math.PI*2); lx.fillStyle='#ea6c00'; lx.fill();
  lx.shadowBlur=0;
  lx.beginPath(); lx.arc(cx+10,cy-6,6,0,Math.PI*2); lx.fillStyle='#fff'; lx.fill();
  lx.beginPath(); lx.arc(cx+11,cy-6,3,0,Math.PI*2); lx.fillStyle='#1a1a1a'; lx.fill();
  lx.beginPath(); lx.moveTo(cx+20,cy-2); lx.lineTo(cx+30,cy); lx.lineTo(cx+20,cy+5);
  lx.closePath(); lx.fillStyle='#fbbf24'; lx.fill();
})();
</script>
</body>
</html>`;

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#060d1a' }}>
      <View style={{ position: 'absolute', top: insets.top + 8, left: 12, zIndex: 100 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 }}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>
      {Platform.OS === 'web' ? (
        <iframe srcDoc={GAME_HTML}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' } as any}
          title="SoshoBird Game" />
      ) : (
        <WebView source={{ html: GAME_HTML }} style={{ flex: 1 }}
          javaScriptEnabled scrollEnabled={false} bounces={false}
          overScrollMode="never" originWhitelist={['*']} />
      )}
    </View>
  );
}
