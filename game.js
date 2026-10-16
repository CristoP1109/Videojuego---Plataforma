// =====================================================================
//  PLATAFORMAS 2D  ·  v2
//  Ahora incluye: economia persistente (localStorage), tienda,
//  dash, ataque cuerpo a cuerpo, animacion, y nuevos enemigos
//  (volador, saltador, torreta) con telegrafiado y destello al golpe.
//  Sin librerias externas ni imagenes: todo se dibuja con codigo.
// =====================================================================

// ----- 1. LIENZO Y CONFIGURACION -----
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;  // 960
const H = canvas.height; // 540

// Fisica y movimiento
const GRAVITY = 2300;
const MOVE_SPEED = 320;
const ACCEL_GROUND = 3200;
const ACCEL_AIR = 1800;
const FRICTION = 2600;
const JUMP_SPEED = 760;
const JUMP_CUT = 1900;
const MAX_FALL = 1250;
const COYOTE = 0.10;
const BUFFER = 0.12;

// Dash y ataque
const DASH_SPEED = 760;
const DASH_TIME = 0.16;
const DASH_CD = 0.55;
const ATTACK_TIME = 0.18;
const ATTACK_CD = 0.30;
const ATTACK_RANGE = 48;
const MAGNET_RADIUS = 115;

// Camara y "game feel"
const CAM_DEADZONE = 70;      // banda donde la camara no se mueve
const CAM_SMOOTH = 10;        // rigidez del suavizado
const CAM_LOOKAHEAD = 0.12;   // anticipacion segun velocidad del jugador
const SHAKE_MAX = 15;         // desplazamiento maximo del temblor (px)
const SHAKE_DECAY = 1.9;      // velocidad a la que baja el temblor

// Paleta por ROLES de color (tono arcade con acentos calidos).
// Cambia aqui y afecta a todo el juego.
const PAL = {
  skyTop: "#1a0f30",   // frio arriba
  skyMid: "#3a1a4a",
  skyLow: "#7a2f57",
  glow: "#ff8a3d",     // calor del horizonte
  moon: "#ffe7c4",
  far: "#3d2a5c",      // ciudad lejana (clara, humeda por perspectiva atmosferica)
  mid: "#2a1a45",
  near: "#1a0f30",     // ciudad cercana (oscura)
  fg: "#0a0614",       // primer plano (casi negro)
  outline: "#0a0614",  // contorno grueso tipo arcade
  winWarm: "rgba(255,176,84,0.85)",
  winPink: "rgba(255,90,140,0.85)",
  ground: "#2b1d4d",
  groundTop: "#7d5bd6",
  accent: "#ff3b6b",
  danger: "#ff5b3d",
  reward: "#f7c948",
};

let LEVEL_W = 2000; // se redefine al cargar cada nivel

// ----- 2. ENTRADA (TECLADO) -----
const keys = {};

// Atajos de teclas
const left = () => keys["ArrowLeft"] || keys["KeyA"];
const right = () => keys["ArrowRight"] || keys["KeyD"];
const jump = () => keys["Space"] || keys["KeyW"] || keys["ArrowUp"];
const dashKey = () => keys["ShiftLeft"] || keys["ShiftRight"] || keys["KeyL"];
const attackKey = () => keys["KeyJ"] || keys["KeyX"];

window.addEventListener("keydown", (e) => {
  const prevent = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Tab"];
  if (prevent.includes(e.code)) e.preventDefault();

  // --- Menu de niveles: el menu captura el teclado ---
  if (state === "menu") {
    if (e.code === "ArrowUp" || e.code === "KeyW") {
      menuIndex = (menuIndex + LEVELS.length - 1) % LEVELS.length;
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
      menuIndex = (menuIndex + 1) % LEVELS.length;
    } else if (e.code === "Enter" || e.code === "Space") {
      loadLevel(menuIndex);
    }
    keys[e.code] = true;
    return;
  }

  // --- Tienda abierta: el menu captura el teclado ---
  if (state === "shop") {
    if (e.code === "ArrowUp" || e.code === "KeyW") {
      shopIndex = (shopIndex + SHOP_ITEMS.length - 1) % SHOP_ITEMS.length;
      shopMsg = "";
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
      shopIndex = (shopIndex + 1) % SHOP_ITEMS.length;
      shopMsg = "";
    } else if (e.code === "Enter" || e.code === "Space") {
      buyItem(shopIndex);
    } else if (e.code === "KeyK" || e.code === "Escape") {
      state = "playing";
    }
    keys[e.code] = true;
    return;
  }

  keys[e.code] = true;

  // Abrir la tienda
  if (e.code === "KeyK") {
    if (state === "playing") {
      state = "shop";
      shopMsg = "";
    }
    return;
  }

  // Reintentar el nivel actual
  if (e.code === "Enter" && (state === "dead" || state === "win")) {
    loadLevel(currentLevel);
    return;
  }

  // Volver al menu de niveles
  if ((e.code === "KeyM" || e.code === "Escape") && (state === "dead" || state === "win")) {
    state = "menu";
    menuIndex = currentLevel;
    return;
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// ----- 3. NIVELES (FACIL / MEDIO / DIFICIL) -----
// Cada nivel define su ancho, plataformas, enemigos, monedas y meta.
const LEVELS = [
  {
    name: "FACIL",
    tag: "Para empezar",
    desc: "Escenario corto, 3 enemigos debiles",
    color: "#5be08a",
    w: 2000,
    goalX: 1880,
    bossGates: false,
    platforms: [
      { x: 0, y: 480, w: 680, h: 60 },
      { x: 760, y: 480, w: 1240, h: 60 },
      { x: 300, y: 380, w: 140, h: 20 },
      { x: 520, y: 300, w: 120, h: 20 },
      { x: 940, y: 370, w: 150, h: 20 },
      { x: 1230, y: 300, w: 140, h: 20 },
      { x: 1520, y: 380, w: 150, h: 20 },
    ],
    enemies: [
      { type: "walker", x: 480, y: 446, w: 34, h: 34, minX: 120, maxX: 600, speed: 80, hp: 1 },
      { type: "walker", x: 1400, y: 446, w: 34, h: 34, minX: 1200, maxX: 1700, speed: 100, hp: 1 },
      { type: "flyer", x: 1050, y: 300, w: 30, h: 26, minX: 900, maxX: 1300, speed: 110, baseY: 300, amp: 60, freq: 1.5, hp: 1 },
    ],
    coins: [
      { x: 200, y: 440 }, { x: 360, y: 344 }, { x: 575, y: 264 },
      { x: 1000, y: 334 }, { x: 1300, y: 264 }, { x: 1590, y: 344 },
    ],
  },
  {
    name: "MEDIO",
    tag: "Con minijefe",
    desc: "Enemigos mas fuertes y un minijefe",
    color: "#f7c948",
    w: 3000,
    goalX: 2920,
    bossGates: false,
    platforms: [
      { x: 0, y: 480, w: 820, h: 60 },
      { x: 960, y: 480, w: 900, h: 60 },
      { x: 1980, y: 480, w: 1020, h: 60 },
      { x: 300, y: 380, w: 150, h: 20 },
      { x: 560, y: 300, w: 130, h: 20 },
      { x: 820, y: 230, w: 120, h: 20 },
      { x: 1120, y: 360, w: 150, h: 20 },
      { x: 1400, y: 280, w: 150, h: 20 },
      { x: 1650, y: 360, w: 150, h: 20 },
      { x: 2100, y: 380, w: 160, h: 20 },
      { x: 2380, y: 300, w: 150, h: 20 },
      { x: 2650, y: 230, w: 140, h: 20 },
    ],
    enemies: [
      { type: "walker", x: 520, y: 446, w: 34, h: 34, minX: 120, maxX: 760, speed: 110, hp: 1 },
      { type: "walker", x: 1200, y: 446, w: 34, h: 34, minX: 1000, maxX: 1450, speed: 130, hp: 2 },
      { type: "hopper", x: 1600, y: 448, w: 32, h: 32, minX: 1480, maxX: 1800, speed: 120, groundY: 480, hopTimer: 1.2, hp: 1 },
      { type: "flyer", x: 2000, y: 280, w: 30, h: 26, minX: 1850, maxX: 2150, speed: 140, baseY: 280, amp: 70, freq: 1.8, hp: 1 },
      { type: "turret", x: 2450, y: 432, w: 36, h: 48, minX: 2450, maxX: 2450, speed: 0, shootTimer: 2.2, hp: 2 },
      { type: "miniboss", x: 2760, y: 424, w: 56, h: 56, minX: 2520, maxX: 2900, speed: 70, shootTimer: 2.0, hp: 6 },
    ],
    coins: [
      { x: 200, y: 440 }, { x: 380, y: 344 }, { x: 620, y: 264 }, { x: 880, y: 194 },
      { x: 1200, y: 324 }, { x: 1470, y: 244 }, { x: 1730, y: 324 }, { x: 2180, y: 344 },
      { x: 2455, y: 264 }, { x: 2720, y: 194 },
    ],
  },
  {
    name: "DIFICIL",
    tag: "Jefe final",
    desc: "Todos los enemigos mejorados y un jefe",
    color: "#ff3b6b",
    w: 4200,
    goalX: 4080,
    bossGates: true,
    platforms: [
      { x: 0, y: 480, w: 760, h: 60 },
      { x: 920, y: 480, w: 700, h: 60 },
      { x: 1760, y: 480, w: 640, h: 60 },
      { x: 2540, y: 480, w: 1660, h: 60 },
      { x: 260, y: 380, w: 140, h: 20 },
      { x: 480, y: 300, w: 130, h: 20 },
      { x: 700, y: 220, w: 120, h: 20 },
      { x: 1000, y: 360, w: 150, h: 20 },
      { x: 1260, y: 280, w: 140, h: 20 },
      { x: 1500, y: 360, w: 150, h: 20 },
      { x: 1850, y: 380, w: 160, h: 20 },
      { x: 2100, y: 300, w: 150, h: 20 },
      { x: 2340, y: 220, w: 140, h: 20 },
      { x: 2680, y: 360, w: 160, h: 20 },
      { x: 2950, y: 280, w: 150, h: 20 },
      { x: 3220, y: 360, w: 160, h: 20 },
    ],
    enemies: [
      { type: "walker", x: 500, y: 446, w: 34, h: 34, minX: 120, maxX: 700, speed: 120, hp: 2 },
      { type: "walker", x: 1150, y: 446, w: 34, h: 34, minX: 960, maxX: 1500, speed: 150, hp: 2 },
      { type: "hopper", x: 1900, y: 448, w: 32, h: 32, minX: 1800, maxX: 2150, speed: 140, groundY: 480, hopTimer: 1.1, hp: 2 },
      { type: "flyer", x: 1500, y: 280, w: 30, h: 26, minX: 1350, maxX: 1700, speed: 160, baseY: 280, amp: 80, freq: 2.0, hp: 2 },
      { type: "flyer", x: 2700, y: 250, w: 30, h: 26, minX: 2550, maxX: 2950, speed: 160, baseY: 250, amp: 80, freq: 2.2, hp: 1 },
      { type: "turret", x: 2300, y: 432, w: 36, h: 48, minX: 2300, maxX: 2300, speed: 0, shootTimer: 2.0, hp: 2 },
      { type: "turret", x: 3200, y: 432, w: 36, h: 48, minX: 3200, maxX: 3200, speed: 0, shootTimer: 1.8, hp: 2 },
      { type: "miniboss", x: 2150, y: 424, w: 56, h: 56, minX: 1950, maxX: 2400, speed: 90, shootTimer: 1.8, hp: 8 },
      { type: "boss", x: 3700, y: 400, w: 72, h: 80, minX: 3400, maxX: 4050, speed: 90, shootTimer: 1.6, hp: 16 },
    ],
    coins: [
      { x: 200, y: 440 }, { x: 320, y: 344 }, { x: 540, y: 264 }, { x: 760, y: 184 },
      { x: 1060, y: 324 }, { x: 1320, y: 244 }, { x: 1560, y: 324 }, { x: 1920, y: 344 },
      { x: 2160, y: 264 }, { x: 2400, y: 184 }, { x: 2740, y: 324 }, { x: 3010, y: 244 },
      { x: 3280, y: 324 }, { x: 3600, y: 440 },
    ],
  },
];

// Datos del nivel activo (los rellena loadLevel)
let platforms = [];
let enemyBlueprint = [];
let coinBlueprint = [];
let goal = { x: 0, y: 0, w: 30, h: 90 };
let currentLevel = 0;
let bossGates = false;
let menuIndex = 0;

function loadLevel(i) {
  const L = LEVELS[i];
  currentLevel = i;
  LEVEL_W = L.w;
  platforms = L.platforms.map((p) => ({ ...p }));
  enemyBlueprint = L.enemies.map((e) => ({ ...e }));
  coinBlueprint = L.coins.map((c) => ({ ...c }));
  goal = { x: L.goalX, y: 480 - 90, w: 30, h: 90 };
  bossGates = !!L.bossGates;
  reset();
}

// ----- 4. ENTIDADES -----
const player = {
  x: 60, y: 0, w: 34, h: 48,
  vx: 0, vy: 0,
  onGround: false, coyote: 0, jumpBuffer: 0,
  jumpPrev: false,     // estado del salto en el frame anterior (para detectar pulsacion)
  jumps: 0,            // saltos usados en el aire
  facing: 1,
  hp: 3, maxHp: 3,
  invuln: 0,
  // Dash
  dashTime: 0, dashCd: 0, dashDir: 1,
  // Ataque
  attackTime: 0, attackCd: 0, attackHits: null,
  // Defensa
  shield: 0,           // 1 si tiene escudo activo
  // Visual
  runPhase: 0, landSquash: 0, scarf: [],
  spawnX: 60, spawnY: 0,
};

let enemies = [];
let projectiles = [];
let particles = [];
let floaters = [];

let coins = [];
let runCoins = 0;      // monedas de esta partida (para la pantalla final)

// ----- 5. ECONOMIA Y MEJORAS -----
const SAVE_KEY = "plataformas2d_save_v2";

// Mejoras de la tienda. "max" = veces que se puede comprar.
const SHOP_ITEMS = [
  { id: "hp", name: "Vitalidad", desc: "+1 corazon de vida", price: 30, max: 3 },
  { id: "speed", name: "Botas rapidas", desc: "Velocidad +10%", price: 25, max: 3 },
  { id: "jump", name: "Muslos de acero", desc: "Salto +8%", price: 25, max: 3 },
  { id: "magnet", name: "Iman de monedas", desc: "Atrae monedas cercanas", price: 40, max: 1 },
  { id: "shield", name: "Chaleco", desc: "Absorbe 1 golpe por vida", price: 50, max: 1 },
  { id: "double", name: "Doble salto", desc: "Segundo salto en el aire", price: 80, max: 1 },
];

let wallet = 0;        // banco persistente de monedas
let upgrades = {};     // id -> nivel comprado
let shopIndex = 0;
let shopMsg = "";

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    wallet = s.wallet || 0;
    upgrades = s.upgrades || {};
  } catch (e) {
    wallet = 0;
    upgrades = {};
  }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ wallet, upgrades }));
  } catch (e) {
    /* modo privado o file:// bloqueado: seguimos en memoria */
  }
}

const lvl = (id) => upgrades[id] || 0;
const priceOf = (it, l) => Math.round(it.price * (1 + 0.5 * l));

function buyItem(i) {
  const it = SHOP_ITEMS[i];
  const l = lvl(it.id);
  if (l >= it.max) {
    shopMsg = "Ya esta al maximo";
    return;
  }
  const p = priceOf(it, l);
  if (wallet < p) {
    shopMsg = "No tienes suficientes monedas";
    return;
  }
  wallet -= p;
  upgrades[it.id] = l + 1;
  shopMsg = "Comprado: " + it.name;
  save();
}

// ----- 6. UTILIDADES -----
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function addShake(amount) {
  shake = Math.min(1, shake + amount);
}

function addHitstop(t) {
  hitstop = Math.max(hitstop, t);
}

// ----- 7. ESTADO Y REINICIO -----
let camera = { x: 0 };
let shake = 0;                 // 0..1 "trauma" acumulado
let shakeX = 0, shakeY = 0;    // offset actual aplicado al mundo
let hitstop = 0;               // congelacion breve en impactos (segundos)
let gameTime = 0;             // tiempo acumulado (para animaciones lentas)
let score = 0;
let state = "menu"; // menu | playing | dead | win | shop

function reset() {
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.facing = 1;
  player.jumps = 0;
  player.coyote = 0;
  player.jumpBuffer = 0;
  player.jumpPrev = false;
  player.dashTime = 0;
  player.dashCd = 0;
  player.attackTime = 0;
  player.attackCd = 0;
  player.invuln = 0;
  player.runPhase = 0;
  player.landSquash = 0;
  player.scarf = Array.from({ length: 6 }, () => ({ x: player.x, y: player.y }));

  // Vidas y escudo segun mejoras
  player.maxHp = 3 + lvl("hp");
  player.hp = player.maxHp;
  player.shield = lvl("shield") > 0 ? 1 : 0;

  camera.x = 0;
  shake = 0;
  shakeX = 0;
  shakeY = 0;
  hitstop = 0;
  gameTime = 0;
  score = 0;
  runCoins = 0;

  enemies = enemyBlueprint.map((e) => ({
    ...e,
    dir: e.type === "flyer" || e.type === "hopper" ? 1 : (Math.random() < 0.5 ? -1 : 1),
    t: Math.random() * 6,
    vy: 0,
    onGround: true,
    flash: 0,
    alive: true,
    maxHp: e.hp,
  }));
  projectiles = [];
  particles = [];
  floaters = [];
  coins = coinBlueprint.map((c) => ({ ...c, t: Math.random() * 6, collected: false }));
  state = "playing";
}

// ----- 8. ACTUALIZACION DE LA LOGICA -----
function speedMul() { return 1 + 0.10 * lvl("speed"); }
function jumpMul() { return 1 + 0.08 * lvl("jump"); }
function maxJumps() { return lvl("double") > 0 ? 2 : 1; }

function updatePlayer(dt) {
  const p = player;
  const ms = MOVE_SPEED * speedMul();
  const js = JUMP_SPEED * jumpMul();

  // --- Ataque: se activa una vez por pulsacion ---
  p.attackCd = Math.max(0, p.attackCd - dt);
  p.attackTime = Math.max(0, p.attackTime - dt);
  if (attackKey() && p.attackCd <= 0 && p.attackTime <= 0) {
    p.attackTime = ATTACK_TIME;
    p.attackCd = ATTACK_CD;
    p.attackHits = new Set();
    doAttackHit();
  }

  // --- Dash ---
  p.dashCd = Math.max(0, p.dashCd - dt);
  if (dashKey() && p.dashCd <= 0 && p.dashTime <= 0) {
    p.dashTime = DASH_TIME;
    p.dashCd = DASH_CD;
    p.dashDir = p.facing;
    p.vy = 0;
  }

  if (p.dashTime > 0) {
    // Durante el dash: velocidad fija, sin gravedad, invulnerable
    p.dashTime -= dt;
    p.vx = p.dashDir * DASH_SPEED;
    p.vy = 0;
    p.invuln = Math.max(p.invuln, 0.02);
    spawnTrail();
  } else {
    // --- Movimiento horizontal ---
    let target = 0;
    if (left()) target -= ms;
    if (right()) target += ms;
    if (target !== 0) p.facing = Math.sign(target);

    const accel = p.onGround ? ACCEL_GROUND : ACCEL_AIR;
    if (target !== 0) {
      p.vx += Math.sign(target) * accel * dt;
      p.vx = clamp(p.vx, -ms, ms);
    } else {
      p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx), FRICTION * dt);
    }

    // --- Salto (con doble salto opcional) ---
    // El buffer solo se recarga al PULSAR (flanco), no mientras se mantiene
    const jumpDown = jump();
    if (jumpDown && !p.jumpPrev) p.jumpBuffer = BUFFER;
    else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    p.jumpPrev = jumpDown;
    p.coyote = p.onGround ? COYOTE : Math.max(0, p.coyote - dt);

    if (p.onGround) p.jumps = 0;

    if (p.jumpBuffer > 0 && (p.coyote > 0 || p.jumps < maxJumps())) {
      p.vy = -js;
      p.jumps = p.coyote > 0 ? 1 : p.jumps + 1;
      p.jumpBuffer = 0;
      p.coyote = 0;
      p.onGround = false;
      p.dashTime = 0;
      p.landSquash = -1;
      spawnDust(p.x + p.w / 2, p.y + p.h, 4);
    }

    // --- Gravedad ---
    p.vy += GRAVITY * dt;
    if (!jump() && p.vy < 0) p.vy += JUMP_CUT * dt;
    p.vy = Math.min(p.vy, MAX_FALL);
  }

  // --- Colisiones por ejes ---
  const wasAir = !p.onGround;
  const fallSpeed = p.vy;

  p.x += p.vx * dt;
  for (const pl of platforms) {
    if (overlap(p, pl)) {
      if (p.vx > 0) p.x = pl.x - p.w;
      else if (p.vx < 0) p.x = pl.x + p.w;
      p.vx = 0;
    }
  }
  p.x = clamp(p.x, 0, LEVEL_W - p.w);

  p.onGround = false;
  p.y += p.vy * dt;
  for (const pl of platforms) {
    if (overlap(p, pl)) {
      if (p.vy > 0) { p.y = pl.y - p.h; p.onGround = true; }
      else if (p.vy < 0) { p.y = pl.y + pl.h; }
      p.vy = 0;
    }
  }

  // Aterrizaje: efecto squash + polvo + temblor
  if (wasAir && p.onGround && fallSpeed > 420) {
    p.landSquash = 1;
    spawnDust(p.x + p.w / 2, p.y + p.h, 8);
    addShake(0.12);
  }
  if (p.landSquash > 0) p.landSquash = Math.max(0, p.landSquash - dt * 5);
  else if (p.landSquash < 0) p.landSquash = Math.min(0, p.landSquash + dt * 6);

  // Animacion de correr
  if (p.onGround && Math.abs(p.vx) > 30) p.runPhase += dt * 14;

  // Paño/estela con inercia
  updateScarf();

  // Polvo al correr
  if (p.onGround && Math.abs(p.vx) > 120 && Math.random() < 0.25) {
    spawnDust(p.x + p.w / 2, p.y + p.h, 1);
  }

  if (p.invuln > 0) p.invuln -= dt;

  // Iman de monedas
  if (lvl("magnet") > 0) pullCoins();

  // Pozo
  if (p.y > H + 200) pitFall();
}

function updateScarf() {
  const p = player;
  if (!p.scarf.length) return;
  const neckX = p.x + (p.facing > 0 ? 6 : p.w - 6);
  const neckY = p.y + 20;
  let px = neckX, py = neckY;
  const wind = -p.vx * 0.012 - 0.4;
  for (const s of p.scarf) {
    s.x += (px - s.x) * 0.35 + wind;
    s.y += (py - s.y) * 0.35;
    px = s.x; py = s.y;
  }
}

function doAttackHit() {
  const p = player;
  const box = {
    x: p.facing > 0 ? p.x + p.w : p.x - ATTACK_RANGE,
    y: p.y + 8,
    w: ATTACK_RANGE,
    h: p.h - 12,
  };
  for (const e of enemies) {
    if (!e.alive || p.attackHits.has(e)) continue;
    if (overlap(box, e)) {
      p.attackHits.add(e);
      hurtEnemy(e, 1);
    }
  }
  for (const pr of projectiles) {
    if (!pr.alive || p.attackHits.has(pr)) continue;
    if (overlap(box, pr)) {
      p.attackHits.add(pr);
      pr.alive = false;
      spawnSpark(pr.x, pr.y);
    }
  }
}

function hurtEnemy(e, dmg) {
  e.hp -= dmg;
  e.flash = 0.16;
  const away = Math.sign(e.x + e.w / 2 - (player.x + player.w / 2)) || 1;
  e.stun = 0.14;
  e.kx = away * 220;
  if (e.hp <= 0) {
    e.alive = false;
    score++;
    dropCoins(e);
    spawnBurst(e.x + e.w / 2, e.y + e.h / 2, "#7d5bd6", 12);
    addShake(0.35);
    addHitstop(0.07);
  } else {
    addShake(0.16);
    addHitstop(0.04);
  }
}

function dropCoins(e) {
  const n = e.type === "turret" ? 3 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    coins.push({
      x: e.x + e.w / 2 + (Math.random() * 44 - 22),
      y: e.y + e.h / 2 + (Math.random() * 34 - 17),
      t: Math.random() * 6,
      collected: false,
    });
  }
}

function updateEnemies(dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;

    // Retroceso breve al ser golpeado
    if (e.stun > 0) {
      e.stun -= dt;
      e.x += e.kx * dt;
      e.kx *= 0.85;
      e.x = clamp(e.x, e.minX, e.maxX - e.w);
      continue;
    }

    if (e.type === "walker") {
      e.x += e.dir * e.speed * dt;
      if (e.x <= e.minX) { e.x = e.minX; e.dir = 1; }
      else if (e.x + e.w >= e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }

    } else if (e.type === "flyer") {
      e.x += e.dir * e.speed * dt;
      if (e.x <= e.minX) { e.x = e.minX; e.dir = 1; }
      else if (e.x + e.w >= e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
      e.y = e.baseY + Math.sin(e.t * e.freq) * e.amp;

    } else if (e.type === "hopper") {
      // Salta de forma periodica y avanza en el aire
      e.hopTimer -= dt;
      if (e.onGround && e.hopTimer <= 0) {
        e.vy = -620;
        e.onGround = false;
        e.hopTimer = 1.2 + Math.random() * 0.5;
        // Mira al jugador para encararlo
        e.dir = player.x > e.x ? 1 : -1;
      }
      e.vy += GRAVITY * dt;
      e.y += e.vy * dt;
      e.x += e.dir * e.speed * dt;
      if (e.x <= e.minX) { e.x = e.minX; e.dir = 1; }
      else if (e.x + e.w >= e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
      const floor = e.groundY - e.h;
      if (e.y >= floor) { e.y = floor; e.vy = 0; e.onGround = true; }

    } else if (e.type === "turret") {
      // Telegrafiado: parpadea antes de disparar
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        fireProjectile(e);
        e.shootTimer = 2.2 + Math.random() * 0.6;
      }
      e.dir = player.x > e.x ? 1 : -1;

    } else if (e.type === "miniboss" || e.type === "boss") {
      // Patrulla y dispara al jugador; el jefe final dispara en abanico
      e.x += e.dir * e.speed * dt;
      if (e.x <= e.minX) { e.x = e.minX; e.dir = 1; }
      else if (e.x + e.w >= e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        if (e.type === "boss") {
          fireSpread(e, 3);
          e.shootTimer = 1.9 + Math.random() * 0.6;
        } else {
          fireProjectile(e);
          e.shootTimer = 2.2 + Math.random() * 0.6;
        }
        addShake(0.14);
      }
    }
  }

  // Colision jugador <-> enemigos
  if (player.invuln <= 0) {
    for (const e of enemies) {
      if (!e.alive || !overlap(player, e)) continue;
      const falling = player.vy > 0;
      const above = player.y + player.h - e.y < player.h * 0.6;
      if (falling && above) {
        hurtEnemy(e, 1);
        player.vy = -480;
        player.jumps = 0;
      } else {
        damagePlayer(1, e.x + e.w / 2);
      }
    }
  }
}

function fireProjectile(e) {
  const cx = e.x + e.w / 2, cy = e.y + 12;
  const dx = (player.x + player.w / 2) - cx;
  const dy = (player.y + player.h / 2) - cy;
  const d = Math.hypot(dx, dy) || 1;
  const sp = 280;
  projectiles.push({
    x: cx, y: cy, w: 12, h: 10,
    vx: (dx / d) * sp, vy: (dy / d) * sp,
    life: 4, alive: true,
  });
  spawnSpark(cx, cy);
}

function fireSpread(e, n) {
  const cx = e.x + e.w / 2, cy = e.y + 20;
  const base = Math.atan2((player.y + player.h / 2) - cy, (player.x + player.w / 2) - cx);
  const sp = 300;
  for (let i = 0; i < n; i++) {
    const a = base + (i - (n - 1) / 2) * 0.24;
    projectiles.push({
      x: cx, y: cy, w: 16, h: 14,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 5, alive: true, big: true,
    });
  }
  spawnSpark(cx, cy);
}

function updateProjectiles(dt) {
  for (const pr of projectiles) {
    if (!pr.alive) continue;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.life <= 0 || pr.x < camera.x - 100 || pr.x > camera.x + W + 100) pr.alive = false;
    if (pr.alive && player.invuln <= 0 && overlap(player, pr)) {
      pr.alive = false;
      damagePlayer(1, pr.x);
    }
  }
  projectiles = projectiles.filter((pr) => pr.alive);
}

function damagePlayer(amount, sourceX) {
  const p = player;
  // El escudo absorbe el golpe si lo hay
  if (p.shield > 0) {
    p.shield = 0;
    p.invuln = 1.2;
    floaters.push({ x: p.x + p.w / 2, y: p.y - 6, life: 0.8, text: "ESCUDO" });
    addShake(0.3);
    return;
  }
  p.hp -= amount;
  p.invuln = 1.2;
  const away = Math.sign(p.x + p.w / 2 - sourceX) || 1;
  p.vx = away * 320;
  p.vy = -340;
  p.dashTime = 0;
  spawnBurst(p.x + p.w / 2, p.y + p.h / 2, "#ff3b6b", 8);
  addShake(0.45);
  addHitstop(0.06);
  if (p.hp <= 0) { p.hp = 0; state = "dead"; addShake(0.6); }
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
  player.jumps = 0;
  player.shield = lvl("shield") > 0 ? 1 : 0; // recarga el escudo al reaparecer
  player.invuln = 1.2;
  camera.x = 0;
}

function updateCoins(dt) {
  for (const c of coins) {
    if (c.collected) continue;
    c.t += dt;
    const box = { x: c.x - 13, y: c.y - 13, w: 26, h: 26 };
    if (overlap(player, box)) {
      c.collected = true;
      wallet++;
      runCoins++;
      save();
      floaters.push({ x: c.x, y: c.y - 12, life: 0.8, text: "+1" });
    }
  }
}

function pullCoins() {
  for (const c of coins) {
    if (c.collected) continue;
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    const dx = cx - c.x, dy = cy - c.y;
    const d = Math.hypot(dx, dy);
    if (d < MAGNET_RADIUS && d > 1) {
      c.x += (dx / d) * 3;
      c.y += (dy / d) * 3;
    }
  }
}

function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt;
    f.y -= 45 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }
}

// ----- 9. PARTICULAS -----
function spawnDust(x, y, n) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x: x + (Math.random() * 20 - 10), y: y - 2,
      vx: (Math.random() * 90 - 45), vy: -Math.random() * 60,
      life: 0.45, max: 0.45, size: 2 + Math.random() * 3,
      color: "#6a5a9a", kind: "dust",
    });
  }
}

function spawnTrail() {
  particles.push({
    x: player.x, y: player.y, w: player.w, h: player.h,
    facing: player.facing, life: 0.28, max: 0.28, kind: "trail",
  });
}

function spawnBurst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 160;
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
      life: 0.5, max: 0.5, size: 2 + Math.random() * 3,
      color, kind: "dust",
    });
  }
}

function spawnSpark(x, y) {
  spawnBurst(x, y, "#ffe082", 6);
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.life -= dt;
    if (pt.life <= 0) { particles.splice(i, 1); continue; }
    if (pt.kind === "dust") {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 220 * dt;
    }
  }
}

function updateCamera(dt) {
  const p = player;
  // Punto de interes: centro del jugador con anticipacion segun su velocidad
  const look = clamp(p.vx * CAM_LOOKAHEAD, -60, 60);
  const centerX = p.x + p.w / 2 + look;

  // Zona muerta: la camara solo se mueve si el jugador sale de la banda central
  const half = W / 2;
  const screenX = p.x + p.w / 2 - camera.x;
  let desired = camera.x;
  if (screenX > half + CAM_DEADZONE) desired = centerX - (half + CAM_DEADZONE);
  else if (screenX < half - CAM_DEADZONE) desired = centerX - (half - CAM_DEADZONE);

  // Suavizado independiente del framerate
  const k = 1 - Math.exp(-CAM_SMOOTH * dt);
  camera.x += (clamp(desired, 0, LEVEL_W - W) - camera.x) * k;

  // Temblor por trauma
  shake = Math.max(0, shake - dt * SHAKE_DECAY);
  const mag = SHAKE_MAX * shake * shake;
  shakeX = (Math.random() * 2 - 1) * mag;
  shakeY = (Math.random() * 2 - 1) * mag;
}

// ----- 10. DIBUJO -----
function drawBackground() {
  const lv = currentLevel || 0;

  // Cielo diferente por bioma segun nivel
  let skyTop = PAL.skyTop, skyMid = PAL.skyMid, skyLow = PAL.skyLow, glow = PAL.glow;
  let glowAlpha = 0.5;
  let far = PAL.far, mid = PAL.mid, near = PAL.near;
  if (lv === 0) {
    skyTop = "#1a0f30"; skyMid = "#3a1a4a"; skyLow = "#7a2f57"; glow = "#ff8a3d"; glowAlpha = 0.45;
    far = "#3d2a5c"; mid = "#2a1a45"; near = "#1a0f30";
  } else if (lv === 1) {
    // Nivel 1: DESIERTO (calido/arenoso, contraste)
    skyTop = "#f0c94a"; skyMid = "#f29a3e"; skyLow = "#f06a2a"; glow = "#ffb84d"; glowAlpha = 0.5;
    far = "#f2d98a"; mid = "#e6b86e"; near = "#d89a56";
  } else if (lv === 2) {
    // Nivel 2: INDUSTRIAL/NOCTURNO METAL SLUG (mas frio, mas duro)
    skyTop = "#0f172a"; skyMid = "#1f2f3f"; skyLow = "#2f4f4f"; glow = "#ff5b3d"; glowAlpha = 0.6;
    far = "#1a2438"; mid = "#16202f"; near = "#111824";
  }

  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(0.55, skyMid);
  skyGrad.addColorStop(0.82, skyLow);
  skyGrad.addColorStop(1, glow);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Resplandor calido del horizonte
  const glowGrad = ctx.createRadialGradient(W * 0.62, H + 60, 10, W * 0.62, H + 60, H * 1.15);
  glowGrad.addColorStop(0, "rgba(255,160,74," + glowAlpha + ")");
  glowGrad.addColorStop(1, "rgba(255,160,74,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  drawMoon();

  // Ciudad en 3 capas (perspectiva atmosferica: lejos=claro, cerca=oscuro)
  drawSkyline(0.12, 320, far, 150, 30, 0.25, skyLow);
  drawSkyline(0.30, 380, mid, 130, 46, 0.5, skyLow);
  drawSkyline(0.55, 430, near, 150, 72, 0.9, skyLow);
}

function drawMoon() {
  const mx = W * 0.74, my = 118;
  const g = ctx.createRadialGradient(mx, my, 8, mx, my, 95);
  g.addColorStop(0, "rgba(255,231,196,0.30)");
  g.addColorStop(1, "rgba(255,231,196,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(mx, my, 95, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAL.moon;
  ctx.beginPath();
  ctx.arc(mx, my, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(205,165,130,0.55)";
  ctx.beginPath(); ctx.arc(mx - 9, my - 7, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + 9, my + 9, 9, 0, Math.PI * 2); ctx.fill();
}

function drawSkyline(parallax, baseY, color, height, step, winAlpha, skyLow) {
  const offset = -camera.x * parallax + shakeX * parallax;
  const start = Math.floor(-offset / step) * step - step;
  for (let x = start; x < LEVEL_W + step; x += step) {
    const bx = x + offset;
    if (bx < -200 || bx > W + 200) continue;
    const r = (Math.sin(x * 12.9898) * 43758.5453) % 1;
    const h = height + (r + 1) * 70;
    ctx.fillStyle = color;
    ctx.fillRect(bx, baseY - h, step - 6, h + 220);

    // Ventanas encendidas: estaticas (sin pulso) para evitar estroboscopio
    ctx.globalAlpha = winAlpha * 0.7;
    for (let wy = baseY - h + 14; wy < baseY - 6; wy += 16) {
      for (let wx = bx + 6; wx < bx + step - 12; wx += 16) {
        const seed = (Math.sin(wx * 1.7 + wy * 1.3) * 43758.5453) % 1;
        if (seed > 0.65) {
          ctx.fillStyle = seed > 0.82 ? PAL.winPink : PAL.winWarm;
          ctx.fillRect(wx, wy, 6, 8);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawForeground() {
  // Plano de primer plano (cables + farolillos) con parallax rapido.
  // Halo para mejorar visibilidad sin añadir ruido
  const par = 1.5, step = 320;
  const camX = camera.x * par;
  const first = Math.floor(camX / step) - 1;
  const last = Math.floor((camX + W) / step) + 1;
  for (let i = first; i <= last; i++) {
    const bx = i * step - camX + shakeX;
    const sag = 34;
    // Halo detras del cable
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(bx, -4);
    ctx.quadraticCurveTo(bx + step / 2, sag, bx + step, -4);
    ctx.stroke();
    // Cable principal
    ctx.strokeStyle = PAL.fg;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx, -4);
    ctx.quadraticCurveTo(bx + step / 2, sag, bx + step, -4);
    ctx.stroke();

    const lx = bx + step / 2, ly = sag + 8;
    // Halo del farolillo
    ctx.fillStyle = "rgba(255,91,61,0.55)";
    ctx.beginPath(); ctx.arc(lx, ly, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.danger;
    ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPlatforms() {
  for (const p of platforms) {
    // Contorno grueso (estilo arcade) + cuerpo + borde iluminado
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
    ctx.fillStyle = PAL.ground;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PAL.groundTop;
    ctx.fillRect(p.x, p.y, p.w, 4);
  }
}

function drawGoal() {
  ctx.fillStyle = PAL.outline;
  ctx.fillRect(goal.x + goal.w / 2 - 5, goal.y, 10, goal.h);
  ctx.fillStyle = "#3a2a5a";
  ctx.fillRect(goal.x + goal.w / 2 - 3, goal.y, 6, goal.h);
  ctx.fillStyle = PAL.accent;
  ctx.beginPath();
  ctx.moveTo(goal.x + goal.w / 2, goal.y + 6);
  ctx.lineTo(goal.x + goal.w / 2 + 38, goal.y + 20);
  ctx.lineTo(goal.x + goal.w / 2, goal.y + 34);
  ctx.closePath();
  ctx.fill();
}

function drawCoins() {
  for (const c of coins) {
    if (c.collected) continue;
    const bob = Math.sin(c.t * 3 + c.x * 0.02) * 4;
    const spin = Math.abs(Math.cos(c.t * 2.5 + c.x * 0.01));
    const rx = 11 * (0.25 + 0.75 * spin);
    const cy = c.y + bob;

    ctx.fillStyle = "rgba(247,201,72,0.16)";
    ctx.beginPath();
    ctx.arc(c.x, cy, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f7c948";
    ctx.beginPath();
    ctx.ellipse(c.x, cy, rx, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffe27a";
    ctx.beginPath();
    ctx.ellipse(c.x, cy, rx * 0.55, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#c9971f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(c.x, cy, rx, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemy(e) {
  if (!e.alive) return;
  const hit = e.flash > 0; // destello blanco al recibir dano

  if (e.type === "walker" || e.type === "hopper") {
    ctx.fillStyle = hit ? "#ffffff" : "#120a20";
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = hit ? "#ffffff" : "#7d5bd6";
    ctx.fillRect(e.x, e.y, e.w, 3);
    ctx.fillStyle = "#ff3b6b";
    const eyeX = e.dir > 0 ? e.x + e.w - 12 : e.x + 6;
    ctx.fillRect(eyeX, e.y + 12, 6, 5);
    if (e.type === "hopper") {
      // patas
      ctx.fillRect(e.x + 4, e.y + e.h, 8, 4);
      ctx.fillRect(e.x + e.w - 12, e.y + e.h, 8, 4);
    }

  } else if (e.type === "flyer") {
    ctx.fillStyle = hit ? "#ffffff" : "#150c26";
    // cuerpo
    ctx.beginPath();
    ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // alas (baten)
    const flap = Math.sin(e.t * 16) * 8;
    ctx.fillStyle = hit ? "#ffffff" : "#2a1a45";
    ctx.beginPath();
    ctx.moveTo(e.x + e.w / 2, e.y + e.h / 2);
    ctx.lineTo(e.x - 8, e.y + e.h / 2 - 6 + flap);
    ctx.lineTo(e.x + 2, e.y + e.h / 2 + 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(e.x + e.w / 2, e.y + e.h / 2);
    ctx.lineTo(e.x + e.w + 8, e.y + e.h / 2 - 6 - flap);
    ctx.lineTo(e.x + e.w - 2, e.y + e.h / 2 + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff3b6b";
    ctx.fillRect(e.x + e.w / 2 - 5, e.y + e.h / 2 - 3, 4, 4);
    ctx.fillRect(e.x + e.w / 2 + 1, e.y + e.h / 2 - 3, 4, 4);

  } else if (e.type === "turret") {
    ctx.fillStyle = hit ? "#ffffff" : "#1a1030";
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = hit ? "#ffffff" : "#4a3080";
    ctx.fillRect(e.x + 2, e.y + 2, e.w - 4, 6);
    // cañon
    ctx.fillStyle = hit ? "#ffffff" : "#241640";
    const gx = e.dir > 0 ? e.x + e.w : e.x - 16;
    ctx.fillRect(gx, e.y + 10, 16, 8);
    // telegrafiado: parpadea rojo antes de disparar
    const warn = e.shootTimer < 0.5;
    ctx.fillStyle = warn ? "#ff3b6b" : "#6a4bb0";
    ctx.beginPath();
    ctx.arc(e.x + e.w / 2, e.y + 24, 6, 0, Math.PI * 2);
    ctx.fill();
    if (warn) {
      ctx.strokeStyle = "rgba(255,59,107,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2, e.y + 24, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    // barra de vida de la torreta
    if (e.maxHp > 1) {
      ctx.fillStyle = "#3a2a5a";
      ctx.fillRect(e.x, e.y - 8, e.w, 4);
      ctx.fillStyle = "#ff3b6b";
      ctx.fillRect(e.x, e.y - 8, e.w * (e.hp / e.maxHp), 4);
    }

  } else if (e.type === "miniboss" || e.type === "boss") {
    const big = e.type === "boss";
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    // cuerpo
    ctx.fillStyle = hit ? "#ffffff" : (big ? "#3a0d22" : "#241040");
    ctx.fillRect(e.x, e.y, e.w, e.h);
    // hombros
    ctx.fillStyle = hit ? "#ffffff" : (big ? "#5a1030" : "#3a1a60");
    ctx.fillRect(e.x - 6, e.y + 6, e.w + 12, 14);
    // visor
    ctx.fillStyle = "#ff3b6b";
    const ex = e.dir > 0 ? e.x + e.w - 22 : e.x + 8;
    ctx.fillRect(ex, e.y + 16, 14, 6);
    // nucleo que late
    const pulse = 4 + Math.abs(Math.sin(e.t * 3)) * 6;
    ctx.fillStyle = "rgba(255,59,107,0.35)";
    ctx.beginPath();
    ctx.arc(cx, cy + 6, pulse + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff6b8f";
    ctx.beginPath();
    ctx.arc(cx, cy + 6, pulse, 0, Math.PI * 2);
    ctx.fill();
    // canon
    ctx.fillStyle = hit ? "#ffffff" : (big ? "#7a1538" : "#4a2a80");
    const gx = e.dir > 0 ? e.x + e.w : e.x - 20;
    ctx.fillRect(gx, e.y + e.h - 26, 20, 12);
    // barra de vida local
    if (e.maxHp > 1) {
      ctx.fillStyle = "#3a2a5a";
      ctx.fillRect(e.x, e.y - 10, e.w, 5);
      ctx.fillStyle = big ? "#ff3b6b" : "#ffb13b";
      ctx.fillRect(e.x, e.y - 10, e.w * (e.hp / e.maxHp), 5);
    }
  }
}

function drawProjectiles() {
  for (const pr of projectiles) {
    if (!pr.alive) continue;
    const r = pr.big ? 9 : 6;
    ctx.fillStyle = pr.big ? "#ff5b3d" : "#ff8a3d";
    ctx.beginPath();
    ctx.arc(pr.x + pr.w / 2, pr.y + pr.h / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pr.big ? "rgba(255,59,107,0.4)" : "rgba(255,138,61,0.35)";
    ctx.beginPath();
    ctx.arc(pr.x + pr.w / 2, pr.y + pr.h / 2, r + 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const pt of particles) {
    if (pt.kind === "trail") {
      const a = (pt.life / pt.max) * 0.35;
      ctx.fillStyle = "rgba(150,110,240," + a + ")";
      ctx.fillRect(pt.x + pt.w * 0.2, pt.y + 12, pt.w * 0.6, pt.h - 12);
      ctx.beginPath();
      ctx.arc(pt.x + pt.w / 2, pt.y + 10, 11, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    }
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  const p = player;

  // Parpadeo al ser invulnerable
  if (p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0 && p.dashTime <= 0) return;

  // Sombra
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(p.x + p.w / 2, p.y + p.h + 3, p.w * 0.6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Squash & stretch: escala el cuerpo completo anclado a los pies.
  // sq>0 aplasta (ancho y bajo); sq<0 estira (estrecho y alto).
  const sq = clamp(p.landSquash, -1, 1);
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h);
  ctx.scale(1 + sq * 0.18, 1 - sq * 0.32);
  ctx.translate(-(p.x + p.w / 2), -(p.y + p.h));

  const bodyH = p.h - 12;
  const bodyY = p.y + 12;

  // Paño/estela por detras (antes del cuerpo)
  if (p.scarf.length > 1) {
    ctx.strokeStyle = "#ff3b6b";
    ctx.lineCap = "round";
    for (let i = 1; i < p.scarf.length; i++) {
      ctx.lineWidth = Math.max(1, 7 - i);
      ctx.beginPath();
      ctx.moveTo(p.scarf[i - 1].x + p.w / 2, p.scarf[i - 1].y);
      ctx.lineTo(p.scarf[i].x + p.w / 2, p.scarf[i].y);
      ctx.stroke();
    }
  }

  // Piernas (ciclo de caminata)
  const legSwing = p.onGround && Math.abs(p.vx) > 30 ? Math.sin(p.runPhase) * 6 : 0;
  ctx.fillStyle = "#0d0818";
  ctx.fillRect(p.x + 6 + legSwing, p.y + p.h - 14, 8, 14);
  ctx.fillRect(p.x + p.w - 14 - legSwing, p.y + p.h - 14, 8, 14);

  // Cuerpo
  ctx.fillStyle = "#0d0818";
  ctx.fillRect(p.x, bodyY, p.w, bodyH);

  // Cabeza
  ctx.beginPath();
  ctx.arc(p.x + p.w / 2, p.y + 10, 11, 0, Math.PI * 2);
  ctx.fill();

  // Luz de contorno (rim light)
  ctx.strokeStyle = "rgba(160,120,255,0.5)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(p.x + 0.5, bodyY + 0.5, p.w - 1, bodyH - 1);

  // Bufanda roja segun direccion
  ctx.fillStyle = "#ff3b6b";
  ctx.fillRect(p.x + (p.facing > 0 ? p.w - 6 : 0), p.y + 16, 6, 14);
  ctx.fillRect(p.x + (p.facing > 0 ? p.w - 12 : 0), p.y + 16, 12, 5);

  // Escudo activo
  if (p.shield > 0) {
    ctx.strokeStyle = "rgba(120,200,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 26, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Arco del ataque
  if (p.attackTime > 0) {
    const prog = 1 - p.attackTime / ATTACK_TIME;
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.scale(p.facing, 1);
    ctx.strokeStyle = "rgba(255,224,130,0.92)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, ATTACK_RANGE * 0.9, -0.9 + prog * 1.5, 0.3 + prog * 1.5);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawFloaters() {
  ctx.textAlign = "center";
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.life / 0.8);
    ctx.fillStyle = "#ffe082";
    ctx.font = "bold 17px Segoe UI, Arial";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function drawHUD() {
  // Corazones (con borde azul si hay escudo)
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
  if (player.shield > 0) {
    ctx.strokeStyle = "#78c8ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(20 + player.maxHp * 30 + 6, 28, 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Monedas del banco
  ctx.fillStyle = "#f7c948";
  ctx.beginPath();
  ctx.arc(140, 26, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c9971f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(140, 26, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffe082";
  ctx.font = "bold 18px Segoe UI, Arial";
  ctx.textAlign = "left";
  ctx.fillText("x " + wallet, 156, 32);

  // Enemigos eliminados
  ctx.fillStyle = "#cfc6e8";
  ctx.font = "bold 18px Segoe UI, Arial";
  ctx.textAlign = "right";
  ctx.fillText("Eliminados: " + score + " / " + enemies.length, W - 20, 34);

  // Ayuda rapida
  ctx.fillStyle = "rgba(207,198,232,0.65)";
  ctx.font = "12px Segoe UI, Arial";
  ctx.fillText("K: tienda   ·   Shift: dash   ·   J: atacar", W - 20, 54);

  // Nombre del nivel (centrado arriba)
  ctx.fillStyle = LEVELS[currentLevel].color;
  ctx.font = "bold 14px Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.fillText("NIVEL: " + LEVELS[currentLevel].name, W / 2, 26);

  // Barra de vida del jefe/minijefe activo
  const boss = enemies.find((e) => e.alive && (e.type === "boss" || e.type === "miniboss"));
  if (boss) {
    const bw = 420, bx = (W - bw) / 2, by = H - 40;
    ctx.fillStyle = "#3a2a5a";
    ctx.fillRect(bx, by, bw, 14);
    ctx.fillStyle = boss.type === "boss" ? "#ff3b6b" : "#ffb13b";
    ctx.fillRect(bx, by, bw * (boss.hp / boss.maxHp), 14);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.fillText(boss.type === "boss" ? "JEFE FINAL" : "MINIJEFE", W / 2, by - 6);
  }

  ctx.textAlign = "left";
}

function drawOverlay(title, subtitle, color) {
  ctx.fillStyle = "rgba(5,3,12,0.78)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.font = "bold 54px Segoe UI, Arial";
  ctx.fillText(title, W / 2, H / 2 - 20);
  ctx.fillStyle = "#cfc6e8";
  ctx.font = "19px Segoe UI, Arial";
  ctx.fillText(subtitle, W / 2, H / 2 + 20);
  ctx.fillStyle = "rgba(207,198,232,0.8)";
  ctx.font = "15px Segoe UI, Arial";
  ctx.fillText("Banco: " + wallet + " monedas", W / 2, H / 2 + 56);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Segoe UI, Arial";
  ctx.fillText("ENTER: reintentar   ·   M: menu de niveles", W / 2, H / 2 + 84);
  ctx.textAlign = "left";
}

function drawShop() {
  ctx.fillStyle = "rgba(5,3,12,0.86)";
  ctx.fillRect(0, 0, W, H);

  const px = W / 2 - 260, py = 50, pw = 520, ph = 420;
  ctx.fillStyle = "#160c28";
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = "#7d5bd6";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffe082";
  ctx.font = "bold 28px Segoe UI, Arial";
  ctx.fillText("EL INFORMANTE", px + 24, py + 42);

  ctx.fillStyle = "#f7c948";
  ctx.font = "bold 18px Segoe UI, Arial";
  ctx.fillText("Credito: " + wallet, px + 24, py + 70);

  let y = py + 100;
  SHOP_ITEMS.forEach((it, i) => {
    const l = lvl(it.id);
    const maxed = l >= it.max;
    const price = maxed ? "-" : priceOf(it, l);
    const canBuy = !maxed && wallet >= price;
    const sel = i === shopIndex;

    ctx.fillStyle = sel ? "#2a1a4a" : "#1c1034";
    ctx.fillRect(px + 16, y, pw - 32, 44);
    if (sel) {
      ctx.strokeStyle = "#ff3b6b";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 16, y, pw - 32, 44);
    }

    ctx.fillStyle = maxed ? "#8a82a8" : "#ffffff";
    ctx.font = "bold 16px Segoe UI, Arial";
    ctx.fillText(it.name, px + 30, y + 20);

    ctx.fillStyle = "#a89ec8";
    ctx.font = "12px Segoe UI, Arial";
    ctx.fillText(it.desc, px + 30, y + 36);

    // Nivel (puntos)
    for (let k = 0; k < it.max; k++) {
      ctx.fillStyle = k < l ? "#f7c948" : "#3a2a5a";
      ctx.beginPath();
      ctx.arc(px + pw - 120 - (it.max - 1 - k) * 14, y + 16, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = "right";
    ctx.fillStyle = maxed ? "#5be08a" : (canBuy ? "#f7c948" : "#ff5b7f");
    ctx.font = "bold 16px Segoe UI, Arial";
    ctx.fillText(maxed ? "MAX" : String(price), px + pw - 30, y + 27);
    ctx.textAlign = "left";

    y += 50;
  });

  // Mensajes
  ctx.textAlign = "center";
  ctx.fillStyle = "#5be08a";
  ctx.font = "bold 15px Segoe UI, Arial";
  if (shopMsg) ctx.fillText(shopMsg, W / 2, py + ph - 40);
  ctx.fillStyle = "#a89ec8";
  ctx.font = "13px Segoe UI, Arial";
  ctx.fillText("Arriba/Abajo: elegir   ·   ENTER: comprar   ·   K/ESC: salir", W / 2, py + ph - 18);
  ctx.textAlign = "left";
}

function drawMenu() {
  ctx.fillStyle = "rgba(5,3,12,0.82)";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px Segoe UI, Arial";
  ctx.fillText("PLATAFORMAS 2D", W / 2, 100);
  ctx.fillStyle = "#a89ec8";
  ctx.font = "17px Segoe UI, Arial";
  ctx.fillText("Elige la dificultad", W / 2, 132);

  const bw = 520, bh = 84, bx = (W - bw) / 2;
  let y = 180;
  LEVELS.forEach((L, i) => {
    const sel = i === menuIndex;
    ctx.fillStyle = sel ? "#2a1a4a" : "#180e2c";
    ctx.fillRect(bx, y, bw, bh);
    ctx.strokeStyle = sel ? L.color : "#3a2a5a";
    ctx.lineWidth = sel ? 3 : 1.5;
    ctx.strokeRect(bx, y, bw, bh);

    ctx.textAlign = "left";
    ctx.fillStyle = L.color;
    ctx.font = "bold 24px Segoe UI, Arial";
    ctx.fillText(L.name, bx + 24, y + 34);

    ctx.fillStyle = "#cfc6e8";
    ctx.font = "14px Segoe UI, Arial";
    ctx.fillText(L.desc, bx + 24, y + 58);

    ctx.fillStyle = "#8a82a8";
    ctx.font = "12px Segoe UI, Arial";
    ctx.fillText(L.tag + "  ·  " + L.enemies.length + " enemigos", bx + 24, y + 74);
    ctx.textAlign = "center";

    y += bh + 14;
  });

  ctx.fillStyle = "#f7c948";
  ctx.font = "bold 15px Segoe UI, Arial";
  ctx.fillText("Banco: " + wallet + " monedas", W / 2, y + 12);

  ctx.fillStyle = "rgba(207,198,232,0.85)";
  ctx.font = "14px Segoe UI, Arial";
  ctx.fillText("Arriba/Abajo: elegir   ·   ENTER: jugar", W / 2, H - 26);
  ctx.textAlign = "left";
}

function render() {
  drawBackground();

  ctx.save();
  ctx.translate(-camera.x + shakeX, shakeY);

  drawPlatforms();
  drawGoal();
  drawCoins();
  for (const e of enemies) drawEnemy(e);
  drawProjectiles();
  drawParticles();
  drawPlayer();
  drawFloaters();

  ctx.restore();

  drawForeground();
  drawHUD();

  if (state === "menu") {
    drawMenu();
  } else if (state === "dead") {
    drawOverlay("HAS CAIDO", "Monedas de esta partida: " + runCoins, "#ff3b6b");
  } else if (state === "win") {
    drawOverlay("VICTORIA!", "Monedas de esta partida: " + runCoins, "#5be08a");
  } else if (state === "shop") {
    drawShop();
  }
}

// ----- 11. BUCLE PRINCIPAL -----
let lastTime = performance.now();

function loop(now) {
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, 1 / 30);

  if (state === "playing") {
    if (hitstop > 0) {
      hitstop -= dt;
    } else {
      gameTime += dt;
      updatePlayer(dt);
      updateEnemies(dt);
      updateProjectiles(dt);
      updateCoins(dt);
      updateFloaters(dt);
      updateParticles(dt);

      if (overlap(player, goal)) {
        const bossAlive = enemies.some((e) => e.alive && e.type === "boss");
        if (bossGates && bossAlive) {
          if (Math.random() < 0.03) {
            floaters.push({ x: goal.x, y: goal.y + 30, life: 1, text: "Derrota al jefe!" });
          }
        } else {
          state = "win";
        }
      }
    }
    updateCamera(dt);
  }

  render();
  requestAnimationFrame(loop);
}

// ----- 12. ARRANQUE -----
loadSave();
player.spawnY = 480 - player.h;
player.scarf = Array.from({ length: 6 }, () => ({ x: player.x, y: player.y }));
loadLevel(0);
state = "menu";
menuIndex = 0;

requestAnimationFrame(loop);
