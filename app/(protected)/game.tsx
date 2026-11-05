import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GAME_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0a; overflow: hidden; font-family: -apple-system, sans-serif; }
  canvas { display: block; touch-action: none; }
  #ui {
    position: fixed; top: 0; left: 0; right: 0;
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 16px; pointer-events: none; z-index: 10;
  }
  #score { color: #fff; font-size: 28px; font-weight: 900; text-shadow: 0 2px 8px rgba(0,0,0,0.8); }
  #best  { color: #f97316; font-size: 14px; font-weight: 700; }
  #overlay {
    position: fixed; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: rgba(0,0,0,0.75); z-index: 20;
    gap: 12px;
  }
  #overlay h1 { color: #fff; font-size: 36px; font-weight: 900; }
  #overlay p  { color: #9ca3af; font-size: 16px; }
  #overlay .emoji { font-size: 64px; }
  #overlay .sub   { color: #f97316; font-size: 18px; font-weight: 700; }
  #overlay.hidden { display: none; }
  #tapHint {
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    color: #ffffff88; font-size: 14px; pointer-events: none;
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
</style>
</head>
<body>
<div id="ui">
  <div id="score">0</div>
  <div id="best">BEST: 0</div>
</div>
<div id="tapHint">Tap to flap!</div>
<div id="overlay">
  <div class="emoji">🐦</div>
  <h1>SoshoBird</h1>
  <p>Avoid the obstacles</p>
  <div class="sub">Tap anywhere to start</div>
</div>
<canvas id="c"></canvas>

<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
<script>
const { Engine, Render, Runner, Bodies, Body, World, Events, Query } = Matter;

const W = window.innerWidth;
const H = window.innerHeight;
const canvas = document.getElementById('c');
canvas.width  = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

// ── Game state ─────────────────────────────────────────────
let engine, runner;
let bird, ground, ceiling;
let pipes = [];
let state = 'idle'; // idle | playing | dead
let score = 0;
let best  = 0;
let frame = 0;
let animId;

// ── Colours ─────────────────────────────────────────────────
const SKY_TOP    = '#0f172a';
const SKY_BOT    = '#1e3a5f';
const PIPE_COLOR = '#f97316';
const BIRD_COLOR = '#f97316';
const GAP        = H * 0.28;
const PIPE_W     = 52;
const PIPE_SPEED = 3.2;
const BIRD_X     = W * 0.25;
const BIRD_R     = 18;

// ── Background stars ────────────────────────────────────────
const stars = Array.from({length: 60}, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: Math.random() * 1.5 + 0.3,
  a: Math.random()
}));

function initEngine() {
  engine = Engine.create({ gravity: { y: 0 } });
  runner = Runner.create();

  bird = Bodies.circle(BIRD_X, H / 2, BIRD_R, {
    label: 'bird',
    restitution: 0,
    frictionAir: 0.04,
    collisionFilter: { category: 0x0001, mask: 0x0002 }
  });

  ground  = Bodies.rectangle(W/2, H + 25, W * 3, 50, { isStatic: true, label:'wall', collisionFilter:{category:0x0002} });
  ceiling = Bodies.rectangle(W/2, -25,    W * 3, 50, { isStatic: true, label:'wall', collisionFilter:{category:0x0002} });

  World.add(engine.world, [bird, ground, ceiling]);

  Events.on(engine, 'collisionStart', (e) => {
    if (state !== 'playing') return;
    e.pairs.forEach(p => {
      if (p.bodyA.label==='bird' || p.bodyB.label==='bird') die();
    });
  });

  Runner.run(runner, engine);
  Body.setVelocity(bird, { x: 0, y: 0 });
  Body.setPosition(bird, { x: BIRD_X, y: H / 2 });
}

function spawnPipe() {
  const minTop = H * 0.12;
  const maxTop = H - GAP - H * 0.12;
  const topH   = minTop + Math.random() * (maxTop - minTop);

  const top = Bodies.rectangle(W + PIPE_W/2, topH/2, PIPE_W, topH, {
    isStatic: true, label: 'pipe',
    collisionFilter: { category: 0x0002 }
  });
  const bot = Bodies.rectangle(W + PIPE_W/2, topH + GAP + (H - topH - GAP)/2, PIPE_W, H - topH - GAP, {
    isStatic: true, label: 'pipe',
    collisionFilter: { category: 0x0002 }
  });
  top._gapY  = topH;
  top._paired = bot;
  top._scored = false;

  World.add(engine.world, [top, bot]);
  pipes.push({ top, bot });
}

function removePipe(p) {
  World.remove(engine.world, p.top);
  World.remove(engine.world, p.bot);
}

function flap() {
  if (state === 'dead') return;
  if (state === 'idle') startGame();
  Body.setVelocity(bird, { x: 0, y: -9 });
}

function startGame() {
  state  = 'playing';
  score  = 0;
  frame  = 0;
  pipes.forEach(p => removePipe(p));
  pipes  = [];
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('tapHint').style.display = 'none';
  engine.gravity.y = 1.6;
  Body.setPosition(bird, { x: BIRD_X, y: H / 2 });
  Body.setVelocity(bird, { x: 0, y: 0 });
  updateScore(0);
}

function die() {
  if (state === 'dead') return;
  state = 'dead';
  engine.gravity.y = 0;
  Body.setVelocity(bird, { x: 0, y: 0 });
  if (score > best) best = score;
  document.getElementById('best').textContent = 'BEST: ' + best;
  setTimeout(showGameOver, 600);
}

function showGameOver() {
  const ov = document.getElementById('overlay');
  ov.innerHTML =
    '<div class="emoji">💥</div>' +
    '<h1 style="color:#ef4444">Game Over</h1>' +
    '<p style="color:#9ca3af">Score: <b style="color:#fff">' + score + '</b></p>' +
    '<div class="sub">Tap to try again</div>';
  ov.classList.remove('hidden');
  state = 'idle';
  engine.gravity.y = 0;
  Body.setPosition(bird, { x: BIRD_X, y: H / 2 });
  Body.setVelocity(bird, { x: 0, y: 0 });
}

function updateScore(n) {
  score = n;
  document.getElementById('score').textContent = n;
}

// ── Draw ────────────────────────────────────────────────────
function drawBg() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, SKY_TOP);
  g.addColorStop(1, SKY_BOT);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  stars.forEach(s => {
    s.a += 0.005;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fillStyle = \`rgba(255,255,255,\${0.3 + 0.4 * Math.sin(s.a)})\`;
    ctx.fill();
  });
}

function drawBird() {
  const bx = bird.position.x;
  const by = bird.position.y;
  const vel = bird.velocity.y;
  const angle = Math.max(-0.5, Math.min(1.2, vel * 0.08));

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(angle);

  // Body
  ctx.beginPath();
  ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
  ctx.fillStyle = BIRD_COLOR;
  ctx.fill();

  // Wing flap
  const wingOffset = state === 'playing' ? Math.sin(frame * 0.4) * 5 : 0;
  ctx.beginPath();
  ctx.ellipse(-6, wingOffset, 10, 6, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#ea6c00';
  ctx.fill();

  // Eye
  ctx.beginPath();
  ctx.arc(8, -5, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9, -5, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();

  // Beak
  ctx.beginPath();
  ctx.moveTo(16, -2);
  ctx.lineTo(24, 0);
  ctx.lineTo(16, 4);
  ctx.closePath();
  ctx.fillStyle = '#fbbf24';
  ctx.fill();

  ctx.restore();
}

function drawPipes() {
  pipes.forEach(p => {
    const tx = p.top.position.x;
    const th = p.top.bounds.max.y;
    const bx = p.bot.position.x;
    const by = p.bot.bounds.min.y;

    // Top pipe
    ctx.fillStyle = PIPE_COLOR;
    ctx.beginPath();
    ctx.roundRect(tx - PIPE_W/2, 0, PIPE_W, th, [0,0,8,8]);
    ctx.fill();
    // Cap
    ctx.fillStyle = '#c05a00';
    ctx.beginPath();
    ctx.roundRect(tx - PIPE_W/2 - 4, th - 18, PIPE_W + 8, 18, 4);
    ctx.fill();

    // Bottom pipe
    ctx.fillStyle = PIPE_COLOR;
    ctx.beginPath();
    ctx.roundRect(bx - PIPE_W/2, by, PIPE_W, H - by, [8,8,0,0]);
    ctx.fill();
    // Cap
    ctx.fillStyle = '#c05a00';
    ctx.beginPath();
    ctx.roundRect(bx - PIPE_W/2 - 4, by, PIPE_W + 8, 18, 4);
    ctx.fill();

    // Glow effect
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur  = 12;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.shadowBlur  = 0;
  });
}

// ── Game loop ───────────────────────────────────────────────
function loop() {
  animId = requestAnimationFrame(loop);
  frame++;
  drawBg();

  if (state === 'playing') {
    // Move pipes
    pipes.forEach(p => {
      Body.setPosition(p.top, { x: p.top.position.x - PIPE_SPEED, y: p.top.position.y });
      Body.setPosition(p.bot, { x: p.bot.position.x - PIPE_SPEED, y: p.bot.position.y });
      // Score
      if (!p.top._scored && p.top.position.x < BIRD_X) {
        p.top._scored = true;
        updateScore(score + 1);
      }
    });
    // Remove off-screen pipes
    pipes = pipes.filter(p => {
      if (p.top.position.x < -PIPE_W) { removePipe(p); return false; }
      return true;
    });
    // Spawn new pipes
    if (frame % 90 === 0) spawnPipe();

    // Bird out of bounds check
    if (bird.position.y > H + 30 || bird.position.y < -30) die();
  }

  drawPipes();
  drawBird();
}

// ── Input ────────────────────────────────────────────────────
canvas.addEventListener('click',      flap);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); }, { passive: false });
document.getElementById('overlay').addEventListener('click',      flap);
document.getElementById('overlay').addEventListener('touchstart', (e) => { e.preventDefault(); flap(); }, { passive: false });

// ── Boot ─────────────────────────────────────────────────────
initEngine();
loop();
</script>
</body>
</html>
`;

export default function GameScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      {/* Back button */}
      <View style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 12,
        zIndex: 100,
      }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 20,
            padding: 8,
          }}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>

      {Platform.OS === 'web' ? (
        // On web — render an iframe with the game HTML
        <iframe
          srcDoc={GAME_HTML}
          style={{
            flex: 1,
            border: 'none',
            width: '100%',
            height: '100%',
          } as any}
          title="SoshoBird Game"
        />
      ) : (
        // On Android — render in WebView
        <WebView
          source={{ html: GAME_HTML }}
          style={{ flex: 1 }}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          originWhitelist={['*']}
          allowFileAccessFromFileURLs
        />
      )}
    </View>
  );
}
