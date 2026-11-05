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
#ui{position:fixed;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px;pointer-events:none;z-index:10}
#score{color:#fff;font-size:32px;font-weight:900;text-shadow:0 2px 12px rgba(0,0,0,.9)}
#right{text-align:right}
#best{color:#f97316;font-size:13px;font-weight:700}
#power{color:#fbbf24;font-size:13px;font-weight:700;margin-top:2px;min-height:16px}
#overlay{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.8);z-index:20;gap:10px}
#overlay.hidden{display:none}
#overlay .bird{font-size:70px}
#overlay h1{color:#fff;font-size:38px;font-weight:900}
#overlay .hint{color:#f97316;font-size:18px;font-weight:700;margin-top:8px}
#overlay .info{color:#9ca3af;font-size:13px;text-align:center;max-width:280px;line-height:1.6}
#overlay .scoreBox{background:#1a1a1a;border-radius:12px;padding:12px 32px;text-align:center;border:1px solid #2a2a2a}
#overlay .scoreBox span{color:#9ca3af;font-size:13px;display:block}
#overlay .scoreBox b{color:#fff;font-size:28px}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
</style>
</head>
<body>
<div id="ui">
  <div id="score">0</div>
  <div id="right">
    <div id="best">BEST: 0</div>
    <div id="power"></div>
  </div>
</div>
<div id="overlay">
  <div class="bird">🐦</div>
  <h1>SoshoBird</h1>
  <div class="info">Tap to fly · Avoid planes & storms<br>Grab ✨ coins for power-up!</div>
  <div class="hint">Tap to start</div>
</div>
<canvas id="c"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
<script>
const {Engine,Runner,Bodies,Body,World,Events} = Matter;
const W = window.innerWidth, H = window.innerHeight;
const canvas = document.getElementById('c');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');

// ── Constants ────────────────────────────────────────────────
const BIRD_X   = W * 0.22;
const BIRD_R   = 20;
const OBS_W    = 54;         // obstacle (cloud/storm) width
const OBS_SPEED_BASE = 3.0;
const PLANE_SPEED    = 5.5;  // planes come faster from right
const COIN_R   = 12;
const POWER_DURATION = 180;  // frames (~3s at 60fps)
const BLINK_START    = 60;   // start blinking at 1s left
const SPAWN_INTERVAL = 100;  // frames between obstacle spawns
const PLANE_INTERVAL = 220;  // frames between plane spawns
const COIN_INTERVAL  = 150;  // frames between coin spawns

// ── State ────────────────────────────────────────────────────
let engine, runner, bird, ceiling, ground;
let obstacles = [], planes = [], coins = [], particles = [];
let state = 'idle';
let score = 0, best = 0, frame = 0;
let powerFrames = 0;   // >0 means invincible / breaker mode
let blinkOn = true;

// ── Stars ────────────────────────────────────────────────────
const stars = Array.from({length:70},()=>({
  x:Math.random()*W, y:Math.random()*H,
  r:Math.random()*1.6+.2, a:Math.random()*Math.PI*2
}));

// ── Engine init ──────────────────────────────────────────────
function initEngine(){
  if(runner) Runner.stop(runner);
  if(engine) World.clear(engine.world);

  engine = Engine.create({gravity:{y:0}});
  runner = Runner.create();

  bird = Bodies.circle(BIRD_X, H/2, BIRD_R,{
    label:'bird', restitution:0, frictionAir:.04,
    collisionFilter:{category:0x0001, mask:0x0002}
  });
  ground  = Bodies.rectangle(W/2,H+25,W*3,50,{isStatic:true,label:'wall',collisionFilter:{category:0x0002}});
  ceiling = Bodies.rectangle(W/2,-25, W*3,50,{isStatic:true,label:'wall',collisionFilter:{category:0x0002}});
  World.add(engine.world,[bird,ground,ceiling]);

  Events.on(engine,'collisionStart',(e)=>{
    if(state!=='playing') return;
    e.pairs.forEach(p=>{
      const labels = [p.bodyA.label, p.bodyB.label];
      if(labels.includes('bird')){
        const other = p.bodyA.label==='bird' ? p.bodyB : p.bodyA;
        if(other.label==='wall') die();
        else if(other.label==='obstacle'||other.label==='plane'){
          if(powerFrames > 0){
            // BREAK IT — remove the obstacle / plane
            burstParticles(other.position.x, other.position.y, '#f97316');
            World.remove(engine.world, other);
            obstacles = obstacles.filter(o=>o.body!==other);
            planes    = planes.filter(pl=>pl.body!==other);
            updateScore(score+2); // bonus 2pts for breaking
          } else {
            die();
          }
        }
      }
    });
  });

  Runner.run(runner, engine);
}

// ── Particles ────────────────────────────────────────────────
function burstParticles(x,y,color,count=18){
  for(let i=0;i<count;i++){
    const a = (Math.PI*2/count)*i;
    const spd = 3+Math.random()*4;
    particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:1,color});
  }
}

// ── Spawn helpers ────────────────────────────────────────────
function spawnObstacle(){
  // Storm cloud — random height lane
  const y = H*.15 + Math.random()*(H*.70);
  const h = 40 + Math.random()*40;
  const body = Bodies.rectangle(W+OBS_W/2, y, OBS_W, h,{
    isStatic:true, label:'obstacle',
    collisionFilter:{category:0x0002}
  });
  World.add(engine.world, body);
  obstacles.push({body, type: Math.random()<.5 ? 'cloud' : 'storm'});
}

function spawnPlane(){
  // Plane comes from the right, at random height
  const y = H*.1 + Math.random()*(H*.80);
  const body = Bodies.rectangle(W+80, y, 90, 28,{
    isStatic:true, label:'plane',
    collisionFilter:{category:0x0002}
  });
  World.add(engine.world, body);
  planes.push({body, frame:0});
}

function spawnCoin(){
  const y = H*.15 + Math.random()*(H*.70);
  // coins have no physics body — just track position
  coins.push({x: W+COIN_R, y, collected:false, anim:0});
}

function removeBody(arr, body){
  World.remove(engine.world, body);
}

// ── Game control ─────────────────────────────────────────────
function flap(){
  if(state==='dead') return;
  if(state==='idle') startGame();
  Body.setVelocity(bird,{x:0,y:-9.5});
}

function startGame(){
  state='playing'; score=0; frame=0; powerFrames=0;
  obstacles=[]; planes=[]; coins=[]; particles=[];
  document.getElementById('overlay').classList.add('hidden');
  engine.gravity.y = 1.7;
  Body.setPosition(bird,{x:BIRD_X,y:H/2});
  Body.setVelocity(bird,{x:0,y:0});
  updateScore(0);
  updatePowerUI();
}

function die(){
  if(state==='dead') return;
  state='dead'; powerFrames=0;
  engine.gravity.y=0;
  Body.setVelocity(bird,{x:0,y:0});
  burstParticles(bird.position.x, bird.position.y,'#ef4444',24);
  if(score>best) best=score;
  document.getElementById('best').textContent='BEST: '+best;
  setTimeout(showGameOver,800);
}

function showGameOver(){
  const ov=document.getElementById('overlay');
  ov.innerHTML=
    '<div class="bird">💥</div>'+
    '<h1 style="color:#ef4444">Game Over!</h1>'+
    '<div class="scoreBox"><span>Your score</span><b>'+score+'</b></div>'+
    (score===best&&score>0?'<div style="color:#fbbf24;font-weight:700">🏆 New Best!</div>':'')+
    '<div class="hint">Tap to play again</div>';
  ov.classList.remove('hidden');
  state='idle';
  engine.gravity.y=0;
  Body.setPosition(bird,{x:BIRD_X,y:H/2});
  Body.setVelocity(bird,{x:0,y:0});
}

function updateScore(n){ score=n; document.getElementById('score').textContent=n; }

function updatePowerUI(){
  const el=document.getElementById('power');
  if(powerFrames>0){
    const secs = Math.ceil(powerFrames/60);
    el.textContent='✨ POWER: '+secs+'s';
  } else {
    el.textContent='';
  }
}

function collectCoin(coin){
  coin.collected=true;
  powerFrames = POWER_DURATION;
  // Disable collisions with obstacles/planes while powered
  burstParticles(coin.x, coin.y,'#fbbf24',22);
  updateScore(score+3);
}

// ── Drawing helpers ──────────────────────────────────────────
function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#060d1a');
  g.addColorStop(1,'#0d2137');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // Stars
  stars.forEach(s=>{
    s.a+=.004;
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fillStyle=\`rgba(255,255,255,\${.25+.4*Math.sin(s.a)})\`; ctx.fill();
  });
  // Moon
  ctx.beginPath(); ctx.arc(W-50,55,22,0,Math.PI*2);
  ctx.fillStyle='#fef08a'; ctx.shadowColor='#fef08a'; ctx.shadowBlur=18; ctx.fill(); ctx.shadowBlur=0;
}

function drawBird(){
  const bx=bird.position.x, by=bird.position.y;
  const vel=bird.velocity.y;
  const angle=Math.max(-.5,Math.min(1.2,vel*.08));

  // Blink when power is about to expire
  if(powerFrames>0 && powerFrames<=BLINK_START){
    if(frame%8===0) blinkOn=!blinkOn;
    if(!blinkOn) return; // skip drawing = blink effect
  } else { blinkOn=true; }

  ctx.save(); ctx.translate(bx,by); ctx.rotate(angle);

  // Power-up glow
  if(powerFrames>0){
    ctx.shadowColor='#fbbf24'; ctx.shadowBlur=22;
  }

  // Body
  ctx.beginPath(); ctx.arc(0,0,BIRD_R,0,Math.PI*2);
  ctx.fillStyle = powerFrames>0 ? '#fbbf24' : '#f97316';
  ctx.fill();

  // Wing
  const wo=state==='playing'?Math.sin(frame*.5)*6:0;
  ctx.beginPath(); ctx.ellipse(-7,wo,11,6,-.3,0,Math.PI*2);
  ctx.fillStyle= powerFrames>0 ? '#f59e0b' : '#ea6c00';
  ctx.fill();

  ctx.shadowBlur=0;

  // Eye white
  ctx.beginPath(); ctx.arc(9,-5,5,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(10,-5,2.5,0,Math.PI*2); ctx.fillStyle='#1a1a1a'; ctx.fill();
  // Beak
  ctx.beginPath(); ctx.moveTo(17,-2); ctx.lineTo(26,0); ctx.lineTo(17,4);
  ctx.closePath(); ctx.fillStyle='#fbbf24'; ctx.fill();

  ctx.restore();
}

function drawObstacles(){
  obstacles.forEach(o=>{
    const {x,y}=o.body.position;
    const hw=o.body.bounds.max.x - x;
    const hh=o.body.bounds.max.y - y;
    if(o.type==='storm'){
      // Dark storm cloud with lightning tint
      ctx.save();
      ctx.translate(x,y);
      // Cloud puffs
      ctx.fillStyle='#374151';
      [[0,0,hw*.9],[hw*.4,-hh*.4,hw*.7],[-.4*hw,-hh*.3,hw*.6]].forEach(([cx,cy,r])=>{
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      });
      // Lightning bolt
      ctx.strokeStyle='#fbbf24'; ctx.lineWidth=2.5; ctx.shadowColor='#fbbf24'; ctx.shadowBlur=8;
      ctx.beginPath();
      ctx.moveTo(4,-hh*.3); ctx.lineTo(-4,0); ctx.lineTo(2,0); ctx.lineTo(-6,hh*.4);
      ctx.stroke(); ctx.shadowBlur=0;
      ctx.restore();
    } else {
      // Fluffy cloud
      ctx.save(); ctx.translate(x,y); ctx.fillStyle='#94a3b8';
      [[0,0,hw*.85],[hw*.38,-hh*.35,hw*.65],[-.35*hw,-hh*.25,hw*.55],[hw*.1,hh*.15,hw*.6]].forEach(([cx,cy,r])=>{
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      });
      ctx.restore();
    }
  });
}

function drawPlanes(){
  planes.forEach(pl=>{
    const {x,y}=pl.body.position;
    ctx.save(); ctx.translate(x,y);
    // Fuselage
    ctx.fillStyle='#e2e8f0';
    ctx.beginPath(); ctx.ellipse(0,0,42,12,0,0,Math.PI*2); ctx.fill();
    // Nose
    ctx.fillStyle='#cbd5e1';
    ctx.beginPath(); ctx.moveTo(42,0); ctx.lineTo(58,-5); ctx.lineTo(58,5); ctx.closePath(); ctx.fill();
    // Cockpit
    ctx.fillStyle='#7dd3fc';
    ctx.beginPath(); ctx.ellipse(22,-6,12,7,-.3,0,Math.PI*2); ctx.fill();
    // Wing
    ctx.fillStyle='#94a3b8';
    ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(-25,-35); ctx.lineTo(-35,-8); ctx.lineTo(10,-12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,12); ctx.lineTo(-25,35); ctx.lineTo(-35,8); ctx.lineTo(10,12); ctx.closePath(); ctx.fill();
    // Tail fin
    ctx.fillStyle='#94a3b8';
    ctx.beginPath(); ctx.moveTo(-38,-12); ctx.lineTo(-55,-28); ctx.lineTo(-42,-12); ctx.closePath(); ctx.fill();
    // Engine glow
    ctx.fillStyle='#f97316'; ctx.shadowColor='#f97316'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(-18,14,6,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
  });
}

function drawCoins(){
  coins.forEach(c=>{
    if(c.collected) return;
    c.anim+=.06;
    const scale=1+Math.sin(c.anim)*.15;
    ctx.save(); ctx.translate(c.x,c.y); ctx.scale(scale,scale);
    // Outer glow
    ctx.shadowColor='#fbbf24'; ctx.shadowBlur=16;
    ctx.beginPath(); ctx.arc(0,0,COIN_R,0,Math.PI*2);
    ctx.fillStyle='#fbbf24'; ctx.fill();
    ctx.shadowBlur=0;
    // Inner ring
    ctx.beginPath(); ctx.arc(0,0,COIN_R*.65,0,Math.PI*2);
    ctx.fillStyle='#f59e0b'; ctx.fill();
    // Star symbol
    ctx.fillStyle='#fff'; ctx.font='bold '+Math.round(COIN_R*.9)+'px serif';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('✨',0,1);
    ctx.restore();
  });
}

function drawParticles(){
  particles = particles.filter(p=>{
    p.x+=p.vx; p.y+=p.vy; p.vx*=.93; p.vy*=.93; p.life-=.035;
    if(p.life<=0) return false;
    ctx.beginPath(); ctx.arc(p.x,p.y,3*p.life,0,Math.PI*2);
    ctx.fillStyle=p.color+Math.round(p.life*255).toString(16).padStart(2,'0');
    ctx.fill(); return true;
  });
}

// ── Game loop ────────────────────────────────────────────────
function loop(){
  requestAnimationFrame(loop);
  frame++;
  drawBg();

  if(state==='playing'){
    const spd = OBS_SPEED_BASE + Math.floor(score/10)*.3; // speed up over time

    // Move obstacles
    obstacles.forEach(o=>{
      Body.setPosition(o.body,{x:o.body.position.x - spd, y:o.body.position.y});
    });
    obstacles = obstacles.filter(o=>{
      if(o.body.position.x < -80){ World.remove(engine.world,o.body); return false; } return true;
    });

    // Move planes (faster, from right)
    planes.forEach(pl=>{
      Body.setPosition(pl.body,{x:pl.body.position.x - PLANE_SPEED, y:pl.body.position.y});
      pl.frame++;
    });
    planes = planes.filter(pl=>{
      if(pl.body.position.x < -120){ World.remove(engine.world,pl.body); return false; } return true;
    });

    // Move coins
    coins.forEach(c=>{ c.x -= spd*.9; });
    coins = coins.filter(c=>{
      if(c.x < -20) return false;
      // Check collection
      if(!c.collected){
        const dx=bird.position.x-c.x, dy=bird.position.y-c.y;
        if(Math.sqrt(dx*dx+dy*dy) < BIRD_R+COIN_R+4){
          collectCoin(c); return false;
        }
      }
      return !c.collected;
    });

    // Power countdown
    if(powerFrames>0){
      powerFrames--;
      updatePowerUI();
      if(powerFrames===0){
        updatePowerUI();
        blinkOn=true; // ensure bird visible again
      }
    }

    // Spawn
    if(frame%SPAWN_INTERVAL===0)  spawnObstacle();
    if(frame%PLANE_INTERVAL===0)  spawnPlane();
    if(frame%COIN_INTERVAL===30)  spawnCoin(); // offset from obstacles

    // Score from surviving
    if(frame%120===0) updateScore(score+1);

    // Bounds
    if(bird.position.y > H+30 || bird.position.y < -30) die();
  }

  drawObstacles();
  drawPlanes();
  drawCoins();
  drawParticles();
  drawBird();
}

// ── Input ────────────────────────────────────────────────────
canvas.addEventListener('click', flap);
canvas.addEventListener('touchstart',(e)=>{e.preventDefault();flap();},{passive:false});
document.getElementById('overlay').addEventListener('click', flap);
document.getElementById('overlay').addEventListener('touchstart',(e)=>{e.preventDefault();flap();},{passive:false});

// ── Boot ─────────────────────────────────────────────────────
initEngine();
loop();
</script>
</body>
</html>`;

export default function GameScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#060d1a' }}>
      <View style={{
        position: 'absolute', top: insets.top + 8, left: 12, zIndex: 100,
      }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 }}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>

      {Platform.OS === 'web' ? (
        <iframe
          srcDoc={GAME_HTML}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' } as any}
          title="SoshoBird Game"
        />
      ) : (
        <WebView
          source={{ html: GAME_HTML }}
          style={{ flex: 1 }}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          originWhitelist={['*']}
        />
      )}
    </View>
  );
}
