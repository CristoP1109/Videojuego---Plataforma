// =====================================================================
//  PROTOTIPO DE PLATAFORMAS 2D  (HTML5 Canvas + JavaScript puro)
//  Un solo archivo, sin librerías externas ni imágenes: todo se dibuja
//  con código. Ábrelo haciendo doble clic en index.html.
// =====================================================================

// ----- 1. LIENZO Y CONFIGURACIÓN -----
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width; // ancho visible (960)
const H = canvas.height; // alto visible (540)

// Física y movimiento. Juega con estos números para cambiar el "game feel".
const GRAVITY = 2300; // caída por segundo (px/s²)
const MOVE_SPEED = 320; // velocidad horizontal máxima
const ACCEL_GROUND = 3200; // aceleración en el suelo
const ACCEL_AIR = 1800; // aceleración en el aire
const FRICTION = 2600; // frenado al soltar
const JUMP_SPEED = 760; // impulso de salto
const JUMP_CUT = 1900; // gravedad extra al soltar el salto (salto variable)
const MAX_FALL = 1250; // velocidad máxima de caída
const COYOTE = 0.10; // margen para saltar tras dejar el borde (s)
const BUFFER = 0.12; // margen para encolar el salto antes de tocar suelo (s)

const LEVEL_W = 3400; // ancho total del nivel (más grande que la pantalla)

// ----- 2. ENTRADA (TECLADO) -----
const keys = {};

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  // Evita que las flechas/espacio hagan scroll en la página
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
    e.preventDefault();
  }
  // Enter reinicia cuando el juego no está en marcha
  if (e.code === "Enter" && state !== "playing") {
    reset();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

const left = () => keys["ArrowLeft"] || keys["KeyA"];
const right = () => keys["ArrowRight"] || keys["KeyD"];
const jump = () => keys["Space"] || keys["KeyW"] || keys["ArrowUp"];

// ----- 3. NIVEL (PLATAFORMAS) -----
// Cada plataforma es un rectángulo: { x, y, w, h }
const platforms = [
  // Suelo (con dos pozos mortales entre los segmentos)
  { x: 0, y: 480, w: 900, h: 60 },
  { x: 1080, y: 480, w: 720, h: 60 },
  { x: 1980, y: 480, w: 1420, h: 60 },

  // Plataformas flotantes
  { x: 350, y: 380, w: 150, h: 20 },
  { x: 570, y: 300, w: 130, h: 20 },
  { x: 770, y: 220, w: 130, h: 20 },
  { x: 1150, y: 370, w: 170, h: 20 },
  { x: 1420, y: 290, w: 150, h: 20 },
  { x: 1660, y: 370, w: 150, h: 20 },
  { x: 2100, y: 380, w: 170, h: 20 },
  { x: 2360, y: 300, w: 160, h: 20 },
  { x: 2600, y: 230, w: 140, h: 20 },
  { x: 2880, y: 350, w: 160, h: 20 },
];

// ----- 4. ENTIDADES -----
// Jugador: silueta oscura con acento rojo (guiño a tu dirección de arte)
const player = {
  x: 60,
  y: 0,
  w: 34,
  h: 48,
  vx: 0,
  vy: 0,
  onGround: false,
  coyote: 0,
  jumpBuffer: 0,
  facing: 1,
  hp: 3,
  maxHp: 3,
  invuln: 0, // invulnerabilidad tras recibir daño
  spawnX: 60,
  spawnY: 0,
};

// Enemigos que patrullan entre un rango [minX, maxX]
const enemyBlueprint = [
  { x: 560, y: 480 - 34, w: 34, h: 34, minX: 480, maxX: 820, speed: 90 },
  { x: 370, y: 380 - 34, w: 34, h: 34, minX: 350, maxX: 470, speed: 70 },
  { x: 1200, y: 480 - 34, w: 34, h: 34, minX: 1120, maxX: 1450, speed: 110 },
  { x: 2130, y: 380 - 34, w: 34, h: 34, minX: 2100, maxX: 2230, speed: 80 },
  { x: 2500, y: 480 - 34, w: 34, h: 34, minX: 2380, maxX: 2760, speed: 130 },
];

let enemies = [];

// Meta (bandera) al final del nivel
const goal = { x: 3260, y: 480 - 90, w: 30, h: 90 };

// Cámara y estado de partida
const camera = { x: 0 };
let score = 0;
let state = "start"; // "start" | "playing" | "dead" | "win"

// ----- 5. UTILIDADES -----
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Detección de colisión entre dos rectángulos (AABB)
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function reset() {
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.hp = player.maxHp;
  player.invuln = 0;
  player.onGround = false;
  player.facing = 1;
  camera.x = 0;
  score = 0;
  // Clonamos los enemigos desde la plantilla para poder reiniciar
  enemies = enemyBlueprint.map((e) => ({ ...e, dir: 1, alive: true }));
  state = "playing";
}

// Coloca al jugador sobre el primer segmento del suelo
player.spawnY = 480 - player.h;
player.y = player.spawnY;

// ----- 6. ACTUALIZACIÓN DE LA LÓGICA -----
function updatePlayer(dt) {
  // --- Movimiento horizontal con aceleración y fricción ---
  let target = 0;
  if (left()) target -= MOVE_SPEED;
  if (right()) target += MOVE_SPEED;
  if (target !== 0) player.facing = Math.sign(target);

  const accel = player.onGround ? ACCEL_GROUND : ACCEL_AIR;
  if (target !== 0) {
    player.vx += Math.sign(target) * accel * dt;
    player.vx = clamp(player.vx, -MOVE_SPEED, MOVE_SPEED);
  } else {
    player.vx -= Math.sign(player.vx) * Math.min(Math.abs(player.vx), FRICTION * dt);
  }

  // --- Salto con coyote time y buffer (se siente mucho mejor) ---
  if (jump()) player.jumpBuffer = BUFFER;
  else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

  player.coyote = player.onGround ? COYOTE : Math.max(0, player.coyote - dt);

  if (player.jumpBuffer > 0 && player.coyote > 0) {
    player.vy = -JUMP_SPEED;
    player.jumpBuffer = 0;
    player.coyote = 0;
    player.onGround = false;
  }

  // --- Gravedad ---
  player.vy += GRAVITY * dt;
  // Salto variable: si sueltas el botón mientras subes, caes antes
  if (!jump() && player.vy < 0) player.vy += JUMP_CUT * dt;
  player.vy = Math.min(player.vy, MAX_FALL);

  // --- Resolución de colisiones (por ejes, para que sea estable) ---
  // Eje X
  player.x += player.vx * dt;
  for (const p of platforms) {
    if (overlap(player, p)) {
      if (player.vx > 0) player.x = p.x - player.w;
      else if (player.vx < 0) player.x = p.x + p.w;
      player.vx = 0;
    }
  }
  player.x = clamp(player.x, 0, LEVEL_W - player.w);

  // Eje Y
  player.onGround = false;
  player.y += player.vy * dt;
  for (const p of platforms) {
    if (overlap(player, p)) {
      if (player.vy > 0) {
        player.y = p.y - player.h;
        player.onGround = true;
      } else if (player.vy < 0) {
        player.y = p.y + p.h;
      }
      player.vy = 0;
    }
  }

  // Temporizador de invulnerabilidad
  if (player.invuln > 0) player.invuln -= dt;

  // Caer a un pozo: pierdes una vida y reapareces en el inicio
  if (player.y > H + 200) pitFall();
}

function updateEnemies(dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    e.x += e.dir * e.speed * dt;
    if (e.x <= e.minX) {
      e.x = e.minX;
      e.dir = 1;
    } else if (e.x + e.w >= e.maxX) {
      e.x = e.maxX - e.w;
      e.dir = -1;
    }
  }

  // Colisión jugador <-> enemigos
  if (player.invuln > 0) return;
  for (const e of enemies) {
    if (!e.alive || !overlap(player, e)) continue;

    const falling = player.vy > 0;
    const above = player.y + player.h - e.y < player.h * 0.6;

    if (falling && above) {
      // Pisar al enemigo: lo eliminamos y rebotamos
      e.alive = false;
      player.vy = -480;
      score++;
    } else {
      // Recibir daño y salir despedido
      hurt(1);
      const away = Math.sign(player.x + player.w / 2 - (e.x + e.w / 2)) || 1;
      player.vx = away * 320;
      player.vy = -340;
    }
  }
}

function hurt(amount) {
  player.hp -= amount;
  player.invuln = 1.2;
  if (player.hp <= 0) {
    player.hp = 0;
    state = "dead";
  }
}

function pitFall() {
  player.hp -= 1;
  if (player.hp <= 0) {
    player.hp = 0;
    state = "dead";
    return;
  }
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.invuln = 1.2;
  camera.x = 0;
}

function updateCamera() {
  const targetX = player.x + player.w / 2 - W / 2;
  camera.x = clamp(targetX, 0, LEVEL_W - W);
}

// ----- 7. DIBUJO -----
function drawBackground() {
  // Cielo con degradado
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#241448");
  sky.addColorStop(0.6, "#160a2b");
  sky.addColorStop(1, "#0a0614");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Capa de ciudad lejana (parallax)
  drawSkyline(0.25, 300, "#1a0f30", 140, 24);
  drawSkyline(0.5, 370, "#241540", 120, 60);
}

function drawSkyline(parallax, baseY, color, height, step) {
  const offset = -camera.x * parallax;
  ctx.fillStyle = color;
  const start = Math.floor(-offset / step) * step - step;
  for (let x = start; x < LEVEL_W; x += step) {
    const bx = x + offset;
    if (bx < -140 || bx > W + 140) continue;
    // Altura pseudoaleatoria pero estable por posición
    const h = height + ((Math.sin(x * 12.9898) * 43758.5453) % 1 + 1) * 60;
    const bw = step - 6;
    ctx.fillRect(bx, baseY - h, bw, h + 200);
    // Ventanas de neón
    ctx.fillStyle = "rgba(255,90,140,0.20)";
    for (let wy = baseY - h + 12; wy < baseY - 8; wy += 18) {
      ctx.fillRect(bx + 6, wy, 6, 8);
      ctx.fillRect(bx + 18, wy, 6, 8);
    }
    ctx.fillStyle = color;
  }
}

function drawPlatforms() {
  for (const p of platforms) {
    // Cuerpo
    ctx.fillStyle = "#2b1d4d";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    // Borde superior iluminado
    ctx.fillStyle = "#7d5bd6";
    ctx.fillRect(p.x, p.y, p.w, 4);
  }
}

function drawGoal() {
  ctx.fillStyle = "#3a2a5a";
  ctx.fillRect(goal.x + goal.w / 2 - 3, goal.y, 6, goal.h);
  ctx.fillStyle = "#ff3b6b";
  ctx.beginPath();
  ctx.moveTo(goal.x + goal.w / 2, goal.y + 6);
  ctx.lineTo(goal.x + goal.w / 2 + 34, goal.y + 20);
  ctx.lineTo(goal.x + goal.w / 2, goal.y + 34);
  ctx.closePath();
  ctx.fill();
}

function drawEnemy(e) {
  if (!e.alive) return;
  ctx.fillStyle = "#120a20";
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = "#7d5bd6";
  ctx.fillRect(e.x, e.y, e.w, 3);
  // Ojos rojos
  ctx.fillStyle = "#ff3b6b";
  const eyeX = e.dir > 0 ? e.x + e.w - 12 : e.x + 6;
  ctx.fillRect(eyeX, e.y + 12, 6, 5);
}

function drawPlayer() {
  // Parpadeo cuando es invulnerable
  if (player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0) return;

  const { x, y, w, h } = player;

  // Sombra simple
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 3, w * 0.6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cuerpo: silueta oscura
  ctx.fillStyle = "#0d0818";
  ctx.fillRect(x, y + 12, w, h - 12);

  // Cabeza
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 10, 11, 0, Math.PI * 2);
  ctx.fill();

  // Acento rojo (bufanda) según la dirección
  ctx.fillStyle = "#ff3b6b";
  ctx.fillRect(x + (player.facing > 0 ? w - 6 : 0), y + 16, 6, 14);
  ctx.fillRect(x + (player.facing > 0 ? w - 12 : 0), y + 16, 12, 5);
}

function drawHUD() {
  // Corazones (salud)
  for (let i = 0; i < player.maxHp; i++) {
    ctx.fillStyle = i < player.hp ? "#ff3b6b" : "#3a2a5a";
    const hx = 20 + i * 30;
    ctx.beginPath();
    ctx.arc(hx + 5, 26, 6, 0, Math.PI * 2);
    ctx.arc(hx + 17, 26, 6, 0, Math.PI * 2);
    ctx.moveTo(hx, 28);
    ctx.lineTo(hx + 11, 42);
    ctx.lineTo(hx + 22, 28);
    ctx.closePath();
    ctx.fill();
  }

  // Puntuación (enemigos eliminados)
  ctx.fillStyle = "#cfc6e8";
  ctx.font = "bold 18px Segoe UI, Arial";
  ctx.textAlign = "right";
  ctx.fillText("Eliminados: " + score + " / " + enemyBlueprint.length, W - 20, 34);
  ctx.textAlign = "left";
}

function drawOverlay(title, subtitle, color) {
  ctx.fillStyle = "rgba(5,3,12,0.75)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.font = "bold 54px Segoe UI, Arial";
  ctx.fillText(title, W / 2, H / 2 - 10);
  ctx.fillStyle = "#cfc6e8";
  ctx.font = "20px Segoe UI, Arial";
  ctx.fillText(subtitle, W / 2, H / 2 + 40);
  ctx.textAlign = "left";
}

function render() {
  drawBackground();

  ctx.save();
  ctx.translate(-camera.x, 0); // Todo lo del mundo se desplaza con la cámara

  drawPlatforms();
  drawGoal();
  for (const e of enemies) drawEnemy(e);
  drawPlayer();

  ctx.restore();

  drawHUD();

  if (state === "start") {
    drawOverlay("PLATAFORMAS 2D", "Pulsa ENTER para empezar", "#ff3b6b");
  } else if (state === "dead") {
    drawOverlay("HAS CAÍDO", "Pulsa ENTER para reintentar", "#ff3b6b");
  } else if (state === "win") {
    drawOverlay("¡VICTORIA!", "Pulsa ENTER para jugar de nuevo", "#5be08a");
  }
}

// ----- 8. BUCLE PRINCIPAL -----
let lastTime = performance.now();

function loop(now) {
  // Delta time en segundos, limitado para evitar saltos si la pestaña se pausa
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, 1 / 30);

  if (state === "playing") {
    updatePlayer(dt);
    updateEnemies(dt);
    updateCamera();

    // ¿Llegó a la meta?
    if (overlap(player, goal)) {
      state = "win";
    }
  }

  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
