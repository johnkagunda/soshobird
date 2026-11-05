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
#ui{position:fixed;top:0;left:0;right:0;display:flex;align-items:flex-start;padding:16px 16px 0;pointer-events:none;z-index:10}
#ui-left{width:56px;flex-shrink:0}
#ui-center{flex:1;display:flex;flex-direction:column;align-items:center}
#score{color:#fff;font-size:34px;font-weight:900;text-shadow:0 2px 12px rgba(0,0,0,.9);line-height:1}
#power{color:#fbbf24;font-size:13px;font-weight:700;min-height:16px;margin-top:3px}
#ui-right{text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
#best{color:#f97316;font-size:13px;font-weight:700}
#pauseBtn{
  pointer-events:all;cursor:pointer;
  background:rgba(255,255,255,0.1);
  border:1.5px solid rgba(255,255,255,0.2);
  border-radius:10px;padding:5px 10px;
  color:#fff;font-size:13px;font-weight:700;
  display:none;align-items:center;gap:5px;
  user-select:none;-webkit-user-select:none;
}
#pauseBtn.visible{display:flex}
#overlay{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.82);z-index:20;gap:10px}
#overlay.hidden{display:none}
#pauseOverlay{
  position:fixed;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  background:rgba(0,0,0,.78);z-index:20;gap:14px;
}
#pauseOverlay.hidden{display:none}
#pauseOverlay h2{color:#fff;font-size:32px;font-weight:900}
#pauseOverlay p{color:#9ca3af;font-size:14px}
.pBtn{
  width:220px;padding:14px;border-radius:14px;border:none;cursor:pointer;
  font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;
}
.pBtn.resume{background:#f97316;color:#fff}
.pBtn.restart{background:#1a1a1a;color:#9ca3af;border:1px solid #2a2a2a}
#overlay h1{color:#fff;font-size:36px;font-weight:900}
#overlay .hint{color:#f97316;font-size:18px;font-weight:700;margin-top:8px}
#overlay .info{color:#9ca3af;font-size:13px;text-align:center;max-width:280px;line-height:1.7}
#overlay .scoreBox{background:#1a1a1a;border-radius:12px;padding:12px 36px;text-align:center;border:1px solid #2a2a2a}
#overlay .scoreBox span{color:#9ca3af;font-size:13px;display:block}
#overlay .scoreBox b{color:#fff;font-size:30px}
</style>
</head>
<body>
<div id="ui">
  <div id="ui-left"></div>
  <div id="ui-center">
    <div id="score">0</div>
    <div id="power"></div>
  </div>
  <div id="ui-right">
    <div id="best">BEST: 0</div>
    <div id="pauseBtn" onclick="togglePause()">
      <span id="pauseIcon">⏸</span><span id="pauseLabel">Pause</span>
    </div>
  </div>
</div>
<div id="pauseOverlay" class="hidden">
  <span style="font-size:58px">⏸</span>
  <h2>Paused</h2>
  <p>Score: <b id="pauseScore" style="color:#fff">0</b></p>
  <button class="pBtn resume" onclick="togglePause()">▶ Resume</button>
  <button class="pBtn restart" onclick="restartFromPause()">↺ Restart</button>
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
const W=window.innerWidth,H=window.innerHeight;
const canvas=document.getElementById('c');
canvas.width=W;canvas.height=H;
const ctx=canvas.getContext('2d');

// ── Layout ────────────────────────────────────────────────────
const GRASS_H  = 42;          // grass strip height at bottom
const FLOOR_Y  = H - GRASS_H; // y where grass starts
const BIRD_X   = W*.22, BIRD_R=20, OBS_W=54;
const OBS_SPEED_BASE=3.0, PLANE_SPEED=5.5, COIN_R=14;
const POWER_DURATION=180, BLINK_START=60;
const SPAWN_INTERVAL=100, PLANE_INTERVAL=220, COIN_INTERVAL=150;

let best=0;
const stars=Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*FLOOR_Y,r:Math.random()*1.6+.2,a:Math.random()*Math.PI*2}));

let engine,runner,birdBody;
let obstacles=[],planes=[],coins=[],particles=[],smokeParticles=[];
let state='idle',score=0,frame=0,powerFrames=0,blinkOn=true,paused=false;
let crashX=0,crashY=0,crashFrame=0; // crash animation state

// ── Web Audio API sound engine (no files needed) ──────────────
let audioCtx=null;

function getAudio(){
  if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type){
  try{
    const ac=getAudio();
    const g=ac.createGain();
    g.connect(ac.destination);

    if(type==='flap'){
      // Quick soft whoosh
      const o=ac.createOscillator();
      o.type='sine';
      o.frequency.setValueAtTime(520,ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(220,ac.currentTime+0.12);
      g.gain.setValueAtTime(0.18,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.12);
      o.connect(g); o.start(); o.stop(ac.currentTime+0.12);

    } else if(type==='coin'){
      // Cheerful rising ding ding
      [0, 0.08, 0.16].forEach((t,i)=>{
        const o=ac.createOscillator();
        o.type='triangle';
        o.frequency.setValueAtTime(600+i*220,ac.currentTime+t);
        const gn=ac.createGain();
        gn.gain.setValueAtTime(0.22,ac.currentTime+t);
        gn.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+t+0.18);
        o.connect(gn); gn.connect(ac.destination);
        o.start(ac.currentTime+t); o.stop(ac.currentTime+t+0.18);
      });

    } else if(type==='break'){
      // Crunch — short noise burst
      const buf=ac.createBuffer(1,ac.sampleRate*0.12,ac.sampleRate);
      const data=buf.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);
      const src=ac.createBufferSource(); src.buffer=buf;
      const flt=ac.createBiquadFilter(); flt.type='bandpass'; flt.frequency.value=800;
      src.connect(flt); flt.connect(g);
      g.gain.setValueAtTime(0.35,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.12);
      src.start(); src.stop(ac.currentTime+0.12);

    } else if(type==='die'){
      // Descending sad trombone-ish
      const o=ac.createOscillator();
      o.type='sawtooth';
      o.frequency.setValueAtTime(420,ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(80,ac.currentTime+0.55);
      g.gain.setValueAtTime(0.22,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.55);
      o.connect(g); o.start(); o.stop(ac.currentTime+0.55);

    } else if(type==='crash'){
      // Thud + rumble
      const buf=ac.createBuffer(1,ac.sampleRate*0.4,ac.sampleRate);
      const data=buf.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3);
      const src=ac.createBufferSource(); src.buffer=buf;
      const flt=ac.createBiquadFilter(); flt.type='lowpass'; flt.frequency.value=220;
      src.connect(flt); flt.connect(g);
      g.gain.setValueAtTime(0.6,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.4);
      src.start(); src.stop(ac.currentTime+0.4);

    } else if(type==='score'){
      // Tiny blip
      const o=ac.createOscillator();
      o.type='sine';
      o.frequency.setValueAtTime(880,ac.currentTime);
      g.gain.setValueAtTime(0.1,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.07);
      o.connect(g); o.start(); o.stop(ac.currentTime+0.07);

    } else if(type==='powerup'){
      // Rising sweep — power activated
      const o=ac.createOscillator();
      o.type='triangle';
      o.frequency.setValueAtTime(300,ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(1200,ac.currentTime+0.3);
      g.gain.setValueAtTime(0.2,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.3);
      o.connect(g); o.start(); o.stop(ac.currentTime+0.3);
    }
  } catch(e){}
}

// ── Engine reset ──────────────────────────────────────────────
function resetEngine(){
  if(runner) Runner.stop(runner);
  engine=Engine.create({gravity:{y:0}});
  runner=Runner.create();
  birdBody=Bodies.circle(BIRD_X,H/2,BIRD_R,{
    label:'bird',restitution:0,frictionAir:.04,
    collisionFilter:{category:0x0001,mask:0x0002}
  });
  // Ground sits at FLOOR_Y
  const gnd=Bodies.rectangle(W/2,FLOOR_Y+25,W*3,50,{isStatic:true,label:'ground',collisionFilter:{category:0x0002}});
  const ceil=Bodies.rectangle(W/2,-25,W*3,50,{isStatic:true,label:'wall',collisionFilter:{category:0x0002}});
  World.add(engine.world,[birdBody,gnd,ceil]);
  Events.on(engine,'collisionStart',(e)=>{
    if(state!=='playing') return;
    e.pairs.forEach(p=>{
      if(p.bodyA.label==='bird'||p.bodyB.label==='bird'){
        const other=p.bodyA.label==='bird'?p.bodyB:p.bodyA;
        if(other.label==='ground'){
          // Bird hit the ground — crash!
          crashBird();
        } else if(other.label==='wall'){
          die(false);
        } else if(other.label==='obstacle'||other.label==='plane'){
          if(powerFrames>0){
            burstParticles(other.position.x,other.position.y,'#f97316',18);
            World.remove(engine.world,other);
            obstacles=obstacles.filter(o=>o.body!==other);
            planes=planes.filter(pl=>pl.body!==other);
            updateScore(score+2);
            playSound('break');
          } else { die(false); }
        }
      }
    });
  });
  Runner.run(runner,engine);
}

// ── Particles ─────────────────────────────────────────────────
function burstParticles(x,y,color,count=18){
  for(let i=0;i<count;i++){
    const a=(Math.PI*2/count)*i,spd=3+Math.random()*4;
    particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,color,r:3});
  }
}

function spawnSmoke(x,y){
  for(let i=0;i<30;i++){
    const angle=-Math.PI/2+(-0.6+Math.random()*1.2);
    const spd=0.5+Math.random()*2.5;
    smokeParticles.push({
      x:x+(Math.random()-0.5)*20,
      y:y,
      vx:Math.cos(angle)*spd,
      vy:Math.sin(angle)*spd-(Math.random()*1),
      life:1,
      r:8+Math.random()*14,
      gray:Math.floor(150+Math.random()*80)
    });
  }
}

// ── Spawners ──────────────────────────────────────────────────
function spawnObstacle(){
  const y=FLOOR_Y*.15+Math.random()*(FLOOR_Y*.65),h=40+Math.random()*40;
  const b=Bodies.rectangle(W+OBS_W/2,y,OBS_W,h,{isStatic:true,label:'obstacle',collisionFilter:{category:0x0002}});
  World.add(engine.world,b);
  obstacles.push({body:b,type:Math.random()<.5?'cloud':'storm'});
}

function spawnPlane(){
  const y=FLOOR_Y*.1+Math.random()*(FLOOR_Y*.75);
  const b=Bodies.rectangle(W+80,y,90,28,{isStatic:true,label:'plane',collisionFilter:{category:0x0002}});
  World.add(engine.world,b);
  planes.push({body:b,f:0});
}

function spawnCoin(){
  coins.push({x:W+COIN_R,y:FLOOR_Y*.15+Math.random()*(FLOOR_Y*.65),anim:0});
}

// ── Game flow ─────────────────────────────────────────────────
function flap(){
  if(state==='dead'||paused) return;
  if(state==='idle') startGame();
  playSound('flap');
  Body.setVelocity(birdBody,{x:0,y:-9.5});
}

function startGame(){
  resetEngine();
  obstacles=[];planes=[];coins=[];particles=[];smokeParticles=[];
  state='playing';score=0;frame=0;powerFrames=0;blinkOn=true;crashFrame=0;paused=false;
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('pauseOverlay').classList.add('hidden');
  document.getElementById('pauseBtn').classList.add('visible');
  document.getElementById('pauseIcon').textContent='⏸';
  document.getElementById('pauseLabel').textContent='Pause';
  engine.gravity.y=1.7;
  Body.setPosition(birdBody,{x:BIRD_X,y:H/2});
  Body.setVelocity(birdBody,{x:0,y:0});
  updateScore(0);updatePowerUI();
}

function crashBird(){
  // Bird hits the ground — show crash + smoke, then game over
  if(state==='dead') return;
  state='dead';powerFrames=0;blinkOn=true;paused=false;
  document.getElementById('pauseBtn').classList.remove('visible');
  document.getElementById('pauseOverlay').classList.add('hidden');
  engine.gravity.y=0;
  Body.setVelocity(birdBody,{x:0,y:0});
  crashX=birdBody.position.x;
  crashY=FLOOR_Y - BIRD_R;
  crashFrame=frame;
  // Lots of orange + dust particles
  burstParticles(crashX,crashY,'#ef4444',20);
  burstParticles(crashX,crashY,'#92400e',14);
  // Rising smoke column
  spawnSmoke(crashX,crashY);
  playSound('crash');
  if(score>best) best=score;
  document.getElementById('best').textContent='BEST: '+best;
  setTimeout(showGameOver,1800);
}

function die(fromCrash){
  if(state==='dead') return;
  state='dead';powerFrames=0;blinkOn=true;paused=false;
  document.getElementById('pauseBtn').classList.remove('visible');
  document.getElementById('pauseOverlay').classList.add('hidden');
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
  // Draw cracked bird logo
  const lc=document.getElementById('logo2');
  if(lc){
    const lx=lc.getContext('2d');
    const cx=45,cy=47;
    lx.shadowColor='#ef4444';lx.shadowBlur=14;
    lx.beginPath();lx.arc(cx,cy,20,0,Math.PI*2);lx.fillStyle='#ef4444';lx.fill();
    lx.shadowBlur=0;
    lx.strokeStyle='#fff';lx.lineWidth=3;lx.lineCap='round';
    lx.beginPath();lx.moveTo(cx-8,cy-8);lx.lineTo(cx+8,cy+8);lx.stroke();
    lx.beginPath();lx.moveTo(cx+8,cy-8);lx.lineTo(cx-8,cy+8);lx.stroke();
  }
}

function togglePause(){
  if(state!=='playing') return;
  paused=!paused;
  const btn=document.getElementById('pauseBtn');
  const icon=document.getElementById('pauseIcon');
  const label=document.getElementById('pauseLabel');
  const po=document.getElementById('pauseOverlay');
  if(paused){
    // Freeze physics
    Runner.stop(runner);
    po.classList.remove('hidden');
    document.getElementById('pauseScore').textContent=score;
    icon.textContent='▶'; label.textContent='Resume';
    btn.style.borderColor='rgba(249,115,22,0.6)';
  } else {
    // Resume physics
    Runner.run(runner,engine);
    po.classList.add('hidden');
    icon.textContent='⏸'; label.textContent='Pause';
    btn.style.borderColor='rgba(255,255,255,0.2)';
  }
}

function restartFromPause(){
  paused=false;
  document.getElementById('pauseBtn').classList.remove('visible');
  startGame();
}

function updateScore(n){score=n;document.getElementById('score').textContent=n;}
function updatePowerUI(){
  document.getElementById('power').textContent=powerFrames>0?'✨ POWER: '+Math.ceil(powerFrames/60)+'s':'';
}
function collectCoin(coin){
  powerFrames=POWER_DURATION;
  // While powered-up: reduce gravity so bird floats — gravity restored when power ends
  engine.gravity.y=0.5;
  burstParticles(coin.x,coin.y,'#fbbf24',22);
  updateScore(score+3);updatePowerUI();
  playSound('coin');
  playSound('powerup');
}

// ── Drawing ────────────────────────────────────────────────────
function drawBg(){
  // Sky
  const g=ctx.createLinearGradient(0,0,0,FLOOR_Y);
  g.addColorStop(0,'#060d1a');g.addColorStop(1,'#0d2137');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,FLOOR_Y);
  // Stars (only in sky area)
  stars.forEach(s=>{
    s.a+=.004;
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,'+(0.25+0.4*Math.sin(s.a))+')';ctx.fill();
  });
  // Moon
  ctx.beginPath();ctx.arc(W-52,58,22,0,Math.PI*2);
  ctx.fillStyle='#fef08a';ctx.shadowColor='#fef08a';ctx.shadowBlur=18;ctx.fill();ctx.shadowBlur=0;
}

function drawGrass(){
  // Dark soil base
  ctx.fillStyle='#1c0d00';
  ctx.fillRect(0,FLOOR_Y,W,GRASS_H);

  // Grass top strip
  ctx.fillStyle='#15803d';
  ctx.fillRect(0,FLOOR_Y,W,14);

  // Lighter grass highlight
  ctx.fillStyle='#16a34a';
  ctx.fillRect(0,FLOOR_Y,W,7);

  // Grass blades — simple triangles scattered along the top
  ctx.fillStyle='#22c55e';
  for(let gx=4;gx<W;gx+=9){
    const jitter=(gx*7)%5;
    ctx.beginPath();
    ctx.moveTo(gx,FLOOR_Y+2);
    ctx.lineTo(gx+3,FLOOR_Y-6-jitter);
    ctx.lineTo(gx+6,FLOOR_Y+2);
    ctx.closePath();
    ctx.fill();
  }

  // Ground line shadow
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.fillRect(0,FLOOR_Y+14,W,6);
}

function drawCrash(){
  if(state!=='dead'||crashFrame===0) return;
  const age=frame-crashFrame;
  // Draw crashed bird flat on grass
  ctx.save();ctx.translate(crashX,crashY);
  // Splat X shape
  ctx.strokeStyle='#ef4444';ctx.lineWidth=4;ctx.lineCap='round';
  const sz=BIRD_R+4;
  ctx.beginPath();ctx.moveTo(-sz,-sz);ctx.lineTo(sz,sz);ctx.stroke();
  ctx.beginPath();ctx.moveTo(sz,-sz);ctx.lineTo(-sz,sz);ctx.stroke();
  // Spinning feathers
  for(let i=0;i<5;i++){
    const fa=(age*.08+i*1.26)%(Math.PI*2);
    const fr=BIRD_R+8+i*4;
    const fx=Math.cos(fa)*fr, fy=Math.sin(fa)*fr*0.4;
    ctx.beginPath();ctx.ellipse(fx,fy,5,2,fa,0,Math.PI*2);
    ctx.fillStyle='#f97316';ctx.fill();
  }
  ctx.restore();
}

function drawSmoke(){
  smokeParticles=smokeParticles.filter(s=>{
    s.x+=s.vx;
    s.y+=s.vy;
    s.vy-=0.04;  // smoke rises
    s.vx*=0.99;
    s.r+=0.3;    // smoke puffs grow
    s.life-=0.012;
    if(s.life<=0) return false;
    const alpha=s.life*0.45;
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fillStyle='rgba('+s.gray+','+s.gray+','+s.gray+','+alpha+')';
    ctx.fill();
    return true;
  });
  // Keep spawning smoke while dead and there was a crash
  if(state==='dead'&&crashFrame>0&&frame-crashFrame<90){
    if(frame%6===0) spawnSmoke(crashX,crashY);
  }
}

function drawBird(){
  const bx=birdBody.position.x,by=birdBody.position.y;
  // Don't draw bird on grass after crash — show crash symbol instead
  if(state==='dead'&&crashFrame>0) return;
  const angle=Math.max(-.5,Math.min(1.2,birdBody.velocity.y*.08));
  if(powerFrames>0&&powerFrames<=BLINK_START){if(frame%8===0) blinkOn=!blinkOn;}
  else {blinkOn=true;}
  if(!blinkOn) return;
  ctx.save();ctx.translate(bx,by);ctx.rotate(angle);
  if(powerFrames>0){ctx.shadowColor='#fbbf24';ctx.shadowBlur=22;}
  ctx.beginPath();ctx.arc(0,0,BIRD_R,0,Math.PI*2);
  ctx.fillStyle=powerFrames>0?'#fbbf24':'#f97316';ctx.fill();
  const wo=state==='playing'?Math.sin(frame*.5)*6:0;
  ctx.beginPath();ctx.ellipse(-7,wo,11,6,-.3,0,Math.PI*2);
  ctx.fillStyle=powerFrames>0?'#f59e0b':'#ea6c00';ctx.fill();
  ctx.shadowBlur=0;
  ctx.beginPath();ctx.arc(9,-5,5,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
  ctx.beginPath();ctx.arc(10,-5,2.5,0,Math.PI*2);ctx.fillStyle='#1a1a1a';ctx.fill();
  ctx.beginPath();ctx.moveTo(17,-2);ctx.lineTo(26,0);ctx.lineTo(17,4);ctx.closePath();ctx.fillStyle='#fbbf24';ctx.fill();
  ctx.restore();
}

function drawObstacles(){
  obstacles.forEach(o=>{
    const {x,y}=o.body.position;
    const hw=o.body.bounds.max.x-x,hh=o.body.bounds.max.y-y;
    ctx.save();ctx.translate(x,y);
    if(o.type==='storm'){
      ctx.fillStyle='#374151';
      [[0,0,hw*.9],[hw*.4,-hh*.4,hw*.7],[-.4*hw,-hh*.3,hw*.6]].forEach(([cx,cy,r])=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();});
      ctx.strokeStyle='#fbbf24';ctx.lineWidth=2.5;ctx.shadowColor='#fbbf24';ctx.shadowBlur=8;
      ctx.beginPath();ctx.moveTo(4,-hh*.3);ctx.lineTo(-4,0);ctx.lineTo(2,0);ctx.lineTo(-6,hh*.4);ctx.stroke();ctx.shadowBlur=0;
    } else {
      ctx.fillStyle='#94a3b8';
      [[0,0,hw*.85],[hw*.38,-hh*.35,hw*.65],[-.35*hw,-hh*.25,hw*.55],[hw*.1,hh*.15,hw*.6]].forEach(([cx,cy,r])=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();});
    }
    ctx.restore();
  });
}

function drawPlanes(){
  planes.forEach(pl=>{
    const {x,y}=pl.body.position;
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#e2e8f0';ctx.beginPath();ctx.ellipse(0,0,42,12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#cbd5e1';ctx.beginPath();ctx.moveTo(42,0);ctx.lineTo(58,-5);ctx.lineTo(58,5);ctx.closePath();ctx.fill();
    ctx.fillStyle='#7dd3fc';ctx.beginPath();ctx.ellipse(22,-6,12,7,-.3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#94a3b8';
    ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(-25,-35);ctx.lineTo(-35,-8);ctx.lineTo(10,-12);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(-25,35);ctx.lineTo(-35,8);ctx.lineTo(10,12);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(-38,-12);ctx.lineTo(-55,-28);ctx.lineTo(-42,-12);ctx.closePath();ctx.fill();
    ctx.fillStyle='#f97316';ctx.shadowColor='#f97316';ctx.shadowBlur=10;
    ctx.beginPath();ctx.arc(-18,14,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.restore();
  });
}

function drawCoins(){
  coins.forEach(c=>{
    c.anim+=.06;
    const s=1+Math.sin(c.anim)*.15;
    ctx.save();ctx.translate(c.x,c.y);ctx.scale(s,s);
    ctx.shadowColor='#fbbf24';ctx.shadowBlur=16;
    ctx.beginPath();ctx.arc(0,0,COIN_R,0,Math.PI*2);ctx.fillStyle='#fbbf24';ctx.fill();
    ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(0,0,COIN_R*.65,0,Math.PI*2);ctx.fillStyle='#f59e0b';ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold '+Math.round(COIN_R*.9)+'px serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✨',0,1);
    ctx.restore();
  });
}

function drawParticles(){
  particles=particles.filter(p=>{
    p.x+=p.vx;p.y+=p.vy;p.vx*=.93;p.vy*=.93;p.life-=.035;
    if(p.life<=0) return false;
    ctx.beginPath();ctx.arc(p.x,p.y,3*p.life,0,Math.PI*2);
    ctx.fillStyle=p.color+Math.round(p.life*255).toString(16).padStart(2,'0');
    ctx.fill();return true;
  });
}

// ── Main loop ─────────────────────────────────────────────────
function loop(){
  requestAnimationFrame(loop);
  if(paused) return; // freeze everything while paused
  frame++;
  drawBg();

  if(state==='playing'){
    const spd=OBS_SPEED_BASE+Math.floor(score/10)*.3;
    obstacles.forEach(o=>Body.setPosition(o.body,{x:o.body.position.x-spd,y:o.body.position.y}));
    obstacles=obstacles.filter(o=>{if(o.body.position.x<-80){World.remove(engine.world,o.body);return false;}return true;});
    planes.forEach(pl=>{Body.setPosition(pl.body,{x:pl.body.position.x-PLANE_SPEED,y:pl.body.position.y});pl.f++;});
    planes=planes.filter(pl=>{if(pl.body.position.x<-120){World.remove(engine.world,pl.body);return false;}return true;});
    coins.forEach(c=>{c.x-=spd*.9;});
    coins=coins.filter(c=>{
      if(c.x<-20) return false;
      const dx=birdBody.position.x-c.x,dy=birdBody.position.y-c.y;
      if(Math.sqrt(dx*dx+dy*dy)<BIRD_R+COIN_R+4){collectCoin(c);return false;}
      return true;
    });
    if(powerFrames>0){
      powerFrames--;updatePowerUI();
      if(powerFrames===0){
        blinkOn=true;updatePowerUI();
        engine.gravity.y=1.7; // restore full gravity when power ends
      }
    }
    if(frame%SPAWN_INTERVAL===0) spawnObstacle();
    if(frame%PLANE_INTERVAL===0) spawnPlane();
    if(frame%COIN_INTERVAL===30) spawnCoin();
    if(frame%120===0){ updateScore(score+1); playSound('score'); }
    // Only die from ceiling going up — ground is handled by collision
    if(birdBody.position.y<-30) die(false);
  }

  drawGrass();
  drawObstacles();drawPlanes();drawCoins();
  drawSmoke();
  drawParticles();
  drawBird();
  drawCrash();
}

canvas.addEventListener('click',flap);
canvas.addEventListener('touchstart',(e)=>{e.preventDefault();flap();},{passive:false});
document.getElementById('overlay').addEventListener('click',flap);
document.getElementById('overlay').addEventListener('touchstart',(e)=>{e.preventDefault();flap();},{passive:false});

resetEngine();
loop();

// ── Draw the logo bird on the overlay canvas ──────────────────
(function drawLogo(){
  const lc = document.getElementById('logo');
  const lx = lc.getContext('2d');
  const cx = 50, cy = 52;
  // Glow
  lx.shadowColor='#f97316'; lx.shadowBlur=18;
  // Body
  lx.beginPath(); lx.arc(cx,cy,22,0,Math.PI*2);
  lx.fillStyle='#f97316'; lx.fill();
  // Wing
  lx.beginPath(); lx.ellipse(cx-8,cy+4,13,7,-0.3,0,Math.PI*2);
  lx.fillStyle='#ea6c00'; lx.fill();
  lx.shadowBlur=0;
  // Eye white
  lx.beginPath(); lx.arc(cx+10,cy-6,6,0,Math.PI*2); lx.fillStyle='#fff'; lx.fill();
  // Pupil
  lx.beginPath(); lx.arc(cx+11,cy-6,3,0,Math.PI*2); lx.fillStyle='#1a1a1a'; lx.fill();
  // Beak
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
