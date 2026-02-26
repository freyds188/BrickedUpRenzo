
/**
 * BRICK BREAKER - Retro Arcade
 * Enhanced gameplay, UI feedback, collisions, and progression.
 */

(function () {
  'use strict';

  // ========== CONFIG ==========
  const CONFIG = {
    canvas: { width: 400, height: 500 },
    paddle: {
      width: 90,
      height: 14,
      accel: 0.9,
      friction: 0.12,
      follow: 0.15,
      followFriction: 0.2,
      maxSpeed: 13,
      minWidth: 60,
      maxWidth: 140,
    },
    ball: {
      radius: 8,
      baseSpeed: 5,
      maxSpeed: 13,
    },
    brick: {
      width: 48,
      height: 22,
      padding: 4,
      offsetTop: 60,
      offsetLeft: 24,
    },
    colors: {
      bg: '#0a0a12',
      paddle: '#00f5ff',
      ball: '#ffffff',
      brick1: '#00f5ff',
      brick2: '#ff00aa',
      brick3: '#ffdd00',
      brickSolid: '#555777',
      powerup: '#39ff14',
      hazard: '#ff3b3b',
      text: '#00f5ff',
      overlayBg: 'rgba(10, 10, 18, 0.9)',
    },
    scoring: {
      brick: 10,
      tough: 20,
      solid: 0,
      hazard: 50,
      powerup: 25,
      levelBonus: 150,
    },
    combo: {
      windowMs: 1800,
      maxMultiplier: 3,
    },
    powerups: {
      dropRate: 0.26,
      fallSpeed: 2.3,
      durationMs: 9000,
    },
    hazards: {
      baseInterval: 8000,
      minInterval: 3200,
      speed: 2.2,
      radius: 9,
    },
    maxLives: 3,
  };

  const DIFFICULTY = {
    easy: { speed: 0.9, hazard: 0.7, powerup: 1.2, label: 'EASY' },
    medium: { speed: 1.0, hazard: 1.0, powerup: 1.0, label: 'MEDIUM' },
    hard: { speed: 1.15, hazard: 1.25, powerup: 0.85, label: 'HARD' },
  };

  const STORAGE_KEY = 'brickBreakerProgress';

  // ========== LEVEL DEFINITIONS ==========
  // 0 = empty, 1 = normal, 2 = tough (2 hits), 3 = solid (unbreakable)
  const LEVELS = [
    {
      layout: [
        [1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1],
      ],
      ballSpeed: 1,
      paddleWidth: 1,
      hazardRate: 0.8,
      objective: 'CLEAR ALL BRICKS',
    },
    {
      layout: [
        [0, 1, 2, 2, 1, 0],
        [1, 1, 2, 2, 1, 1],
        [1, 1, 2, 2, 1, 1],
        [0, 1, 1, 1, 1, 0],
      ],
      ballSpeed: 1.15,
      paddleWidth: 0.9,
      hazardRate: 1,
      objective: 'CLEAR BRICKS + DODGE MINES',
    },
    {
      layout: [
        [3, 1, 1, 1, 1, 3, 3],
        [1, 2, 2, 2, 2, 2, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 2, 2, 2, 2, 2, 1],
        [3, 1, 1, 1, 1, 3, 3],
      ],
      ballSpeed: 1.35,
      paddleWidth: 0.8,
      hazardRate: 1.2,
      objective: 'BREAK THROUGH THE CORE',
    },
  ];

  // ========== DOM ELEMENTS ==========
  const homeScreen = document.getElementById('homeScreen');
  const gameScreen = document.getElementById('gameScreen');
  const levelGrid = document.getElementById('levelGrid');
  const progressSummary = document.getElementById('progressSummary');
  const startBtn = document.getElementById('startBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const exitBtn = document.getElementById('exitBtn');
  const difficultyButtons = Array.from(document.querySelectorAll('.difficulty-btn'));
  const homeSoundBtn = document.getElementById('homeSoundBtn');
  const toastEl = document.getElementById('toast');

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const livesEl = document.getElementById('lives');
  const multiplierEl = document.getElementById('multiplier');
  const streakEl = document.getElementById('streak');
  const objectiveEl = document.getElementById('objectiveText');
  const bricksRemainingEl = document.getElementById('bricksRemaining');
  const progressFillEl = document.getElementById('progressFill');
  const overlay = document.getElementById('gameOverlay');
  const overlayMessage = document.getElementById('overlayMessage');
  const overlayButton = document.getElementById('overlayButton');
  const restartBtn = document.getElementById('restartBtn');
  const soundBtn = document.getElementById('soundBtn');

  // ========== GAME STATE ==========
  let state = {
    score: 0,
    level: 1,
    lives: CONFIG.maxLives,
    bricks: [],
    brickCounts: { total: 0, remaining: 0 },
    paddle: { x: 0, y: 0, w: 0, h: CONFIG.paddle.height, vx: 0 },
    ball: { x: 0, y: 0, dx: 0, dy: 0, radius: CONFIG.ball.radius },
    powerups: [],
    hazards: [],
    particles: [],
    running: false,
    gameOver: false,
    paused: false,
    ballDropping: false,
    keys: { left: false, right: false },
    mouseX: canvas.width / 2,
    lastTime: 0,
    accumulator: 0,
    combo: { streak: 0, multiplier: 1, lastHit: 0 },
    effects: {
      expandUntil: 0,
      shrinkUntil: 0,
      slowUntil: 0,
      fastUntil: 0,
    },
    flash: 0,
    shakeTime: 0,
    hazardTimer: 0,
    soundEnabled: false,
    audioCtx: null,
    difficulty: 'medium',
    selectedLevel: 1,
  };

  let progress = loadProgress();

  // ========== UTIL ==========
  function nowMs() {
    return performance.now();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 1400);
  }

  // ========== STORAGE ==========
  function defaultProgress() {
    const levels = {};
    LEVELS.forEach((_, i) => {
      levels[i + 1] = {
        unlocked: i === 0,
        bestScore: 0,
        stars: 0,
        completed: false,
      };
    });
    return { difficulty: 'medium', sound: false, levels };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProgress();
      const data = JSON.parse(raw);
      const base = defaultProgress();
      const merged = { ...base, ...data };
      merged.levels = { ...base.levels, ...(data.levels || {}) };
      return merged;
    } catch (err) {
      return defaultProgress();
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  // ========== AUDIO ==========
  function initAudio() {
    if (state.audioCtx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    state.audioCtx = new AudioCtx();
  }

  function playSound(type) {
    if (!state.soundEnabled || !state.audioCtx) return;
    const ctxAudio = state.audioCtx;
    const osc = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();
    let freq = 440;
    let dur = 0.08;

    if (type === 'paddle') freq = 520;
    if (type === 'brick') freq = 720;
    if (type === 'tough') freq = 620;
    if (type === 'solid') freq = 360;
    if (type === 'hazard') freq = 180;
    if (type === 'powerup') freq = 880;
    if (type === 'level') freq = 980;

    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.04;

    osc.connect(gain);
    gain.connect(ctxAudio.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctxAudio.currentTime + dur);
    osc.stop(ctxAudio.currentTime + dur);
  }

  function syncSoundButtons() {
    soundBtn.textContent = state.soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
    soundBtn.setAttribute('aria-pressed', state.soundEnabled ? 'true' : 'false');
    homeSoundBtn.textContent = state.soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
    homeSoundBtn.setAttribute('aria-pressed', state.soundEnabled ? 'true' : 'false');
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    if (state.soundEnabled) initAudio();
    progress.sound = state.soundEnabled;
    saveProgress();
    syncSoundButtons();
  }

  // ========== HOME UI ==========
  function updateDifficultyButtons() {
    difficultyButtons.forEach((btn) => {
      const active = btn.dataset.difficulty === state.difficulty;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function buildLevelCard(level, data) {
    const card = document.createElement('button');
    card.className = `level-card${data.unlocked ? '' : ' locked'}${level === state.selectedLevel ? ' selected' : ''}`;
    card.disabled = !data.unlocked;
    card.dataset.level = level.toString();

    const title = document.createElement('div');
    title.className = 'level-title';
    title.textContent = `LEVEL ${level}`;

    const status = document.createElement('div');
    status.className = 'level-status';
    status.textContent = data.completed ? `BEST ${data.bestScore}` : data.unlocked ? 'UNLOCKED' : 'LOCKED';

    const lock = document.createElement('span');
    lock.className = 'level-lock';
    lock.textContent = data.unlocked ? '' : '🔒';

    const stars = document.createElement('div');
    stars.className = 'stars';
    for (let i = 0; i < 3; i++) {
      const star = document.createElement('span');
      star.textContent = '*';
      if (i < data.stars) star.classList.add('active');
      stars.appendChild(star);
    }

    card.appendChild(title);
    card.appendChild(status);
    card.appendChild(lock);
    card.appendChild(stars);
    return card;
  }

  function renderHome() {
    levelGrid.innerHTML = '';
    let completedCount = 0;
    if (!progress.levels[state.selectedLevel] || !progress.levels[state.selectedLevel].unlocked) {
      const firstUnlocked = Object.keys(progress.levels).find((key) => progress.levels[key].unlocked);
      state.selectedLevel = Number(firstUnlocked) || 1;
    }

    Object.keys(progress.levels).forEach((key) => {
      const level = Number(key);
      const data = progress.levels[level];
      if (data.completed) completedCount += 1;
      const card = buildLevelCard(level, data);
      card.addEventListener('click', () => {
        if (!data.unlocked) return;
        state.selectedLevel = level;
        renderHome();
        showGame();
        initGame();
      });
      levelGrid.appendChild(card);
    });

    progressSummary.textContent = `${completedCount} / ${LEVELS.length} COMPLETE`;
  }

  function showHome() {
    gameScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    renderHome();
    updateDifficultyButtons();
    syncSoundButtons();
  }

  function showGame() {
    homeScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    canvas.focus();
  }
  // ========== BRICK GENERATION ==========
  function generateBricksForLevel(levelIndex) {
    const def = LEVELS[levelIndex];
    if (!def) return [];
    const bricks = [];
    const { width: bw, height: bh, padding, offsetTop, offsetLeft } = CONFIG.brick;

    for (let row = 0; row < def.layout.length; row++) {
      for (let col = 0; col < def.layout[row].length; col++) {
        const type = def.layout[row][col];
        if (type === 0) continue;
        const color =
          type === 1
            ? CONFIG.colors.brick1
            : type === 2
            ? CONFIG.colors.brick2
            : CONFIG.colors.brickSolid;
        bricks.push({
          x: offsetLeft + col * (bw + padding),
          y: offsetTop + row * (bh + padding),
          w: bw,
          h: bh,
          type,
          hp: type === 2 ? 2 : type === 3 ? 999 : 1,
          color,
          visible: true,
          hitFlash: 0,
        });
      }
    }
    return bricks;
  }

  // ========== RESET / INIT ==========
  function getDifficultyScale() {
    const def = LEVELS[state.level - 1] || LEVELS[0];
    const base = 1 + (state.level - 1) * 0.12;
    const streakBoost = Math.min(state.combo.streak * 0.01, 0.15);
    const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.medium;
    return base * (def.ballSpeed || 1) * diff.speed + streakBoost;
  }

  function isEffectActive(name) {
    const t = nowMs();
    if (name === 'expand') return state.effects.expandUntil > t;
    if (name === 'shrink') return state.effects.shrinkUntil > t;
    if (name === 'slow') return state.effects.slowUntil > t;
    if (name === 'fast') return state.effects.fastUntil > t;
    return false;
  }

  function getPaddleWidth() {
    const def = LEVELS[state.level - 1] || LEVELS[0];
    let scale = def.paddleWidth || 1;
    if (isEffectActive('expand')) scale *= 1.25;
    if (isEffectActive('shrink')) scale *= 0.8;
    return clamp(Math.floor(CONFIG.paddle.width * scale), CONFIG.paddle.minWidth, CONFIG.paddle.maxWidth);
  }

  function getBallSpeedScale() {
    let scale = getDifficultyScale();
    if (isEffectActive('slow')) scale *= 0.8;
    if (isEffectActive('fast')) scale *= 1.2;
    return scale;
  }

  function setBallSpeed(target) {
    const b = state.ball;
    if (b.dx === 0 && b.dy === 0) return;
    const angle = Math.atan2(b.dy, b.dx);
    const speed = clamp(target, 2, CONFIG.ball.maxSpeed);
    b.dx = Math.cos(angle) * speed;
    b.dy = Math.sin(angle) * speed;
  }

  function resetBall(serve) {
    state.ball.x = canvas.width / 2;
    state.ball.y = canvas.height - CONFIG.paddle.height - 40;
    state.ball.radius = CONFIG.ball.radius;

    const speed = CONFIG.ball.baseSpeed * getBallSpeedScale();
    const angle = (Math.random() * 0.6 + 0.7) * Math.PI;
    state.ball.dx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
    state.ball.dy = -Math.sin(angle) * speed;

    if (!serve) {
      state.ball.dx = 0;
      state.ball.dy = 0;
    }
  }

  function startBallDrop() {
    state.ball.x = canvas.width / 2;
    state.ball.y = 80;
    state.ball.dx = 0;
    state.ball.dy = 4;
    state.ballDropping = true;
  }

  function updateBrickCounts() {
    const remaining = state.bricks.filter((b) => b.visible && b.type !== 3).length;
    state.brickCounts.remaining = remaining;
  }

  function initLevel() {
    state.bricks = generateBricksForLevel(state.level - 1);
    state.paddle.w = getPaddleWidth();
    state.paddle.h = CONFIG.paddle.height;
    state.paddle.y = canvas.height - CONFIG.paddle.height - 10;
    state.paddle.x = (canvas.width - state.paddle.w) / 2;
    state.paddle.vx = 0;
    state.powerups = [];
    state.hazards = [];
    state.particles = [];
    state.hazardTimer = 0;
    const total = state.bricks.filter((b) => b.type !== 3).length;
    state.brickCounts = { total, remaining: total };
    resetBall(false);
  }

  function fullRestart() {
    state.score = 0;
    state.level = state.selectedLevel;
    state.lives = CONFIG.maxLives;
    state.gameOver = false;
    state.running = true;
    state.paused = false;
    state.combo = { streak: 0, multiplier: 1, lastHit: 0 };
    state.effects = { expandUntil: 0, shrinkUntil: 0, slowUntil: 0, fastUntil: 0 };
    initLevel();
    resetBall(true);
    updateUI();
    hideOverlay();
  }

  function initGame() {
    state.score = 0;
    state.level = state.selectedLevel;
    state.lives = CONFIG.maxLives;
    state.gameOver = false;
    state.running = false;
    state.paused = false;
    state.combo = { streak: 0, multiplier: 1, lastHit: 0 };
    state.effects = { expandUntil: 0, shrinkUntil: 0, slowUntil: 0, fastUntil: 0 };
    initLevel();
    startBallDrop();
    updateUI();
    showOverlay('BRICK BREAKER', 'START GAME');
  }

  // ========== OVERLAY ==========
  function showOverlay(title, buttonText) {
    overlayMessage.textContent = title;
    overlayButton.textContent = buttonText;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function updateUI() {
    scoreEl.textContent = state.score;
    levelEl.textContent = state.level;
    livesEl.textContent = state.lives;
    multiplierEl.textContent = `${state.combo.multiplier.toFixed(1)}x`;
    streakEl.textContent = state.combo.streak;

    updateBrickCounts();
    bricksRemainingEl.textContent = `${state.brickCounts.remaining} / ${state.brickCounts.total}`;
    const progress = state.brickCounts.total > 0
      ? (1 - state.brickCounts.remaining / state.brickCounts.total) * 100
      : 0;
    progressFillEl.style.width = `${progress.toFixed(1)}%`;

    const def = LEVELS[state.level - 1] || LEVELS[0];
    objectiveEl.textContent = def.objective || 'CLEAR ALL BRICKS';
  }

  // ========== COLLISION DETECTION ==========
  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy <= r * r;
  }

  function circleCircle(ax, ay, ar, bx, by, br) {
    const dx = ax - bx;
    const dy = ay - by;
    const r = ar + br;
    return dx * dx + dy * dy <= r * r;
  }

  function resolveBrickBounce(prevX, prevY, brick) {
    const b = state.ball;
    const wasLeft = prevX + b.radius <= brick.x;
    const wasRight = prevX - b.radius >= brick.x + brick.w;
    const wasAbove = prevY + b.radius <= brick.y;
    const wasBelow = prevY - b.radius >= brick.y + brick.h;

    if (wasLeft || wasRight) b.dx = -b.dx;
    if (wasAbove || wasBelow) b.dy = -b.dy;
    if (!wasLeft && !wasRight && !wasAbove && !wasBelow) b.dy = -b.dy;
  }

  // ========== EFFECTS / SCORE ==========
  function resetCombo() {
    state.combo = { streak: 0, multiplier: 1, lastHit: 0 };
  }

  function registerHit(points) {
    const t = nowMs();
    if (t - state.combo.lastHit <= CONFIG.combo.windowMs) {
      state.combo.streak += 1;
    } else {
      state.combo.streak = 1;
    }
    state.combo.lastHit = t;
    state.combo.multiplier = Math.min(CONFIG.combo.maxMultiplier, 1 + state.combo.streak * 0.1);
    state.score += Math.floor(points * state.combo.multiplier);
    updateUI();
  }

  function addParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x,
        y,
        vx: randRange(-2.5, 2.5),
        vy: randRange(-2.5, 2.5),
        life: randRange(0.3, 0.7),
        color,
        size: randRange(1, 3),
      });
    }
  }

  function applyPowerup(type) {
    const t = nowMs();
    if (type === 'expand') state.effects.expandUntil = t + CONFIG.powerups.durationMs;
    if (type === 'shrink') state.effects.shrinkUntil = t + CONFIG.powerups.durationMs;
    if (type === 'slow') state.effects.slowUntil = t + CONFIG.powerups.durationMs;
    if (type === 'fast') state.effects.fastUntil = t + CONFIG.powerups.durationMs;
    if (type === 'life') state.lives = Math.min(state.lives + 1, CONFIG.maxLives + 2);
    if (type === 'multi') {
      state.combo.streak += 3;
      state.combo.multiplier = Math.min(CONFIG.combo.maxMultiplier, 1 + state.combo.streak * 0.1);
    }
    registerHit(CONFIG.scoring.powerup);
    showToast(`${type.toUpperCase()} UP`);
    updateUI();
  }

  function spawnPowerup(x, y) {
    const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.medium;
    if (Math.random() > CONFIG.powerups.dropRate * diff.powerup) return;
    const types = ['expand', 'shrink', 'slow', 'fast', 'life', 'multi'];
    const type = types[Math.floor(Math.random() * types.length)];
    state.powerups.push({ x, y, r: 8, type, vy: CONFIG.powerups.fallSpeed });
  }

  function spawnHazard() {
    const r = CONFIG.hazards.radius;
    const x = randRange(r + 6, canvas.width - r - 6);
    const y = -r - 10;
    state.hazards.push({
      x,
      y,
      r,
      vy: CONFIG.hazards.speed + state.level * 0.15,
      vx: randRange(-0.6, 0.6),
    });
  }
  function checkBrickCollision(prevX, prevY) {
    const b = state.ball;
    for (const brick of state.bricks) {
      if (!brick.visible) continue;
      if (!circleRect(b.x, b.y, b.radius, brick.x, brick.y, brick.w, brick.h)) continue;

      brick.hitFlash = 0.2;
      resolveBrickBounce(prevX, prevY, brick);

      if (brick.type === 3) {
        playSound('solid');
        addParticles(b.x, b.y, CONFIG.colors.brickSolid, 6);
        return true;
      }

      brick.hp -= 1;
      const isDestroyed = brick.hp <= 0;
      if (isDestroyed) {
        brick.visible = false;
        spawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2);
        const points = brick.type === 2 ? CONFIG.scoring.tough : CONFIG.scoring.brick;
        registerHit(points);
        playSound(brick.type === 2 ? 'tough' : 'brick');
        addParticles(b.x, b.y, brick.color, 10);
      } else {
        registerHit(CONFIG.scoring.brick);
        playSound('tough');
        addParticles(b.x, b.y, brick.color, 6);
      }
      return true;
    }
    return false;
  }

  function checkPaddleCollision() {
    const b = state.ball;
    const p = state.paddle;
    if (b.dy <= 0) return false;
    if (!circleRect(b.x, b.y, b.radius, p.x, p.y, p.w, p.h)) return false;

    const hitPos = (b.x - (p.x + p.w / 2)) / (p.w / 2);
    const angle = hitPos * 0.9;
    const speed = Math.min(Math.sqrt(b.dx * b.dx + b.dy * b.dy) * 1.02, CONFIG.ball.maxSpeed);
    b.dx = Math.sin(angle) * speed + p.vx * 0.06;
    b.dy = -Math.cos(angle) * speed;

    state.flash = 0.6;
    playSound('paddle');
    addParticles(b.x, b.y, CONFIG.colors.paddle, 6);
    return true;
  }

  function checkWallCollision() {
    const b = state.ball;
    if (b.x - b.radius <= 0) {
      b.x = b.radius;
      b.dx = -b.dx;
    }
    if (b.x + b.radius >= canvas.width) {
      b.x = canvas.width - b.radius;
      b.dx = -b.dx;
    }
    if (b.y - b.radius <= 0) {
      b.y = b.radius;
      b.dy = -b.dy;
    }
    if (b.y - b.radius > canvas.height) {
      state.lives -= 1;
      resetCombo();
      updateUI();
      showToast('LIFE LOST');
      if (state.lives <= 0) {
        state.gameOver = true;
        state.running = false;
        showOverlay('GAME OVER', 'PLAY AGAIN');
      } else {
        resetBall(false);
        state.paused = true;
        setTimeout(() => {
          state.paused = false;
          resetBall(true);
        }, 800);
      }
    }
  }

  // ========== UPDATE ==========
  function updatePaddle(dt) {
    const p = state.paddle;
    const scale = dt / 16;
    const maxSpeed = CONFIG.paddle.maxSpeed;

    if (state.keys.left || state.keys.right) {
      const dir = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
      p.vx += dir * CONFIG.paddle.accel * scale;
      p.vx *= 1 - CONFIG.paddle.friction * scale;
    } else {
      const targetX = state.mouseX - p.w / 2;
      const diff = targetX - p.x;
      p.vx += diff * CONFIG.paddle.follow * scale;
      p.vx *= 1 - CONFIG.paddle.followFriction * scale;
    }

    p.vx = clamp(p.vx, -maxSpeed, maxSpeed);
    p.x += p.vx * scale;
    p.x = clamp(p.x, 0, canvas.width - p.w);
  }

  function updateBall(dt) {
    const b = state.ball;

    if (state.ballDropping) {
      const scale = dt / 16;
      b.y += b.dy * scale;
      b.dy = Math.min(b.dy + 0.15 * scale, 12);
      const paddleTop = state.paddle.y - b.radius;
      if (b.y >= paddleTop) {
        b.y = paddleTop;
        b.dy = 0;
        b.x = state.paddle.x + state.paddle.w / 2;
        state.ballDropping = false;
      }
      return;
    }

    if (!state.running && b.dy === 0) {
      b.x = state.paddle.x + state.paddle.w / 2;
      b.y = state.paddle.y - b.radius;
      return;
    }

    if (state.paused || !state.running || b.dx === 0) return;

    setBallSpeed(CONFIG.ball.baseSpeed * getBallSpeedScale());

    const scale = dt / 16;
    const prevX = b.x;
    const prevY = b.y;
    b.x += b.dx * scale;
    b.y += b.dy * scale;

    checkBrickCollision(prevX, prevY);
    checkPaddleCollision();
    checkWallCollision();
  }

  function updatePowerups(dt) {
    const scale = dt / 16;
    for (let i = state.powerups.length - 1; i >= 0; i--) {
      const p = state.powerups[i];
      p.y += p.vy * scale;
      if (circleRect(p.x, p.y, p.r, state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h)) {
        playSound('powerup');
        addParticles(p.x, p.y, CONFIG.colors.powerup, 12);
        applyPowerup(p.type);
        state.powerups.splice(i, 1);
        continue;
      }
      if (p.y - p.r > canvas.height) state.powerups.splice(i, 1);
    }
  }

  function updateHazards(dt) {
    const def = LEVELS[state.level - 1] || LEVELS[0];
    const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.medium;
    const interval = clamp(
      CONFIG.hazards.baseInterval / ((def.hazardRate || 1) * diff.hazard),
      CONFIG.hazards.minInterval,
      CONFIG.hazards.baseInterval
    );
    state.hazardTimer += dt;
    if (state.running && !state.paused && state.hazardTimer >= interval) {
      state.hazardTimer = 0;
      spawnHazard();
    }

    const scale = dt / 16;
    for (let i = state.hazards.length - 1; i >= 0; i--) {
      const h = state.hazards[i];
      h.x += h.vx * scale;
      h.y += h.vy * scale;
      if (h.x - h.r < 0 || h.x + h.r > canvas.width) h.vx *= -1;

      if (circleRect(h.x, h.y, h.r, state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h)) {
        state.hazards.splice(i, 1);
        state.lives -= 1;
        resetCombo();
        state.flash = 1;
        state.shakeTime = 0.25;
        playSound('hazard');
        showToast('DAMAGE');
        updateUI();
        if (state.lives <= 0) {
          state.gameOver = true;
          state.running = false;
          showOverlay('GAME OVER', 'PLAY AGAIN');
        }
        continue;
      }

      if (circleCircle(h.x, h.y, h.r, state.ball.x, state.ball.y, state.ball.radius)) {
        state.hazards.splice(i, 1);
        registerHit(CONFIG.scoring.hazard);
        playSound('hazard');
        addParticles(h.x, h.y, CONFIG.colors.hazard, 14);
        state.flash = 0.6;
        showToast('MINE CLEARED');
        continue;
      }

      if (h.y - h.r > canvas.height) state.hazards.splice(i, 1);
    }
  }

  function updateParticles(dt) {
    const scale = dt / 16;
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * scale;
      p.y += p.vy * scale;
      p.life -= 0.02 * scale;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function updateEffects() {
    const targetWidth = getPaddleWidth();
    if (state.paddle.w !== targetWidth) {
      state.paddle.w += (targetWidth - state.paddle.w) * 0.1;
    }
  }

  function computeStars(score, lives, level) {
    const base = 200 + level * 120;
    let stars = 0;
    if (score >= base * 1.0) stars += 1;
    if (score >= base * 1.6 || lives >= 2) stars += 1;
    if (score >= base * 2.2 || lives === CONFIG.maxLives) stars += 1;
    return stars;
  }

  function applyLevelCompletion() {
    const levelData = progress.levels[state.level];
    const stars = computeStars(state.score, state.lives, state.level);
    levelData.bestScore = Math.max(levelData.bestScore, state.score);
    levelData.stars = Math.max(levelData.stars, stars);
    levelData.completed = true;
    if (state.level < LEVELS.length) {
      progress.levels[state.level + 1].unlocked = true;
    }
    saveProgress();
    renderHome();
  }

  function checkLevelComplete() {
    updateBrickCounts();
    if (state.brickCounts.remaining > 0) return;

    applyLevelCompletion();
    showToast('LEVEL COMPLETE');

    if (state.level >= LEVELS.length) {
      state.running = false;
      showOverlay('YOU WIN!', 'PLAY AGAIN');
      return;
    }
    state.score += CONFIG.scoring.levelBonus + state.combo.streak * 5;
    state.level += 1;
    resetCombo();
    initLevel();
    resetBall(false);
    state.paused = true;
    updateUI();
    playSound('level');
    setTimeout(() => {
      state.paused = false;
      resetBall(true);
    }, 600);
  }

  // ========== RENDER ==========
  function draw() {
    ctx.save();

    if (state.shakeTime > 0) {
      const intensity = 4;
      const dx = randRange(-intensity, intensity);
      const dy = randRange(-intensity, intensity);
      ctx.translate(dx, dy);
      state.shakeTime = Math.max(0, state.shakeTime - 0.02);
    }

    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const brick of state.bricks) {
      if (!brick.visible) continue;
      const flash = brick.hitFlash > 0 ? 0.6 : 0;
      brick.hitFlash = Math.max(0, brick.hitFlash - 0.02);
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flash})`;
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);
    }

    ctx.fillStyle = CONFIG.colors.paddle;
    ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeRect(state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);

    ctx.fillStyle = CONFIG.colors.ball;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.stroke();

    for (const p of state.powerups) {
      ctx.fillStyle = CONFIG.colors.powerup;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.stroke();
    }

    for (const h of state.hazards) {
      ctx.fillStyle = CONFIG.colors.hazard;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.stroke();
    }

    for (const p of state.particles) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.25})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      state.flash = Math.max(0, state.flash - 0.04);
    }

    ctx.restore();
  }

  // ========== GAME LOOP ==========
  function updateFrame(dt) {
    if (!state.gameOver) {
      updatePaddle(dt);
      updateBall(dt);
      updatePowerups(dt);
      updateHazards(dt);
      updateParticles(dt);
      updateEffects();
      if (state.running) checkLevelComplete();
    }
  }

  function gameLoop(timestamp) {
    const dt = Math.min(timestamp - state.lastTime, 50);
    state.lastTime = timestamp;
    state.accumulator += dt;

    const step = 8;
    while (state.accumulator >= step) {
      updateFrame(step);
      state.accumulator -= step;
    }

    draw();
    requestAnimationFrame(gameLoop);
  }
  // ========== INPUT ==========
  function onKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      state.keys.left = true;
      e.preventDefault();
    }
    if (e.key === 'ArrowRight') {
      state.keys.right = true;
      e.preventDefault();
    }
    if (e.code === 'Space' && !state.running && !state.gameOver) {
      state.running = true;
      resetBall(true);
    }
  }

  function onKeyUp(e) {
    if (e.key === 'ArrowLeft') state.keys.left = false;
    if (e.key === 'ArrowRight') state.keys.right = false;
  }

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    state.mouseX = (e.clientX - rect.left) * scaleX;
  }

  function onPointerDown(e) {
    canvas.focus();
    onPointerMove(e);
    if (!state.running && !state.gameOver) {
      state.running = true;
      resetBall(true);
    }
  }

  overlayButton.addEventListener('click', () => {
    hideOverlay();
    if (state.gameOver) {
      fullRestart();
    }
    state.running = true;
    state.gameOver = false;
    resetBall(true);
    initAudio();
  });

  restartBtn.addEventListener('click', () => {
    fullRestart();
  });

  soundBtn.addEventListener('click', toggleSound);
  homeSoundBtn.addEventListener('click', toggleSound);

  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.focus();

  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  });

  window.addEventListener('blur', () => {
    state.paused = true;
  });
  window.addEventListener('focus', () => {
    state.paused = false;
  });

  // ========== HOME EVENTS ==========
  difficultyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.difficulty = btn.dataset.difficulty || 'medium';
      progress.difficulty = state.difficulty;
      saveProgress();
      updateDifficultyButtons();
      showToast(`${DIFFICULTY[state.difficulty].label} MODE`);
    });
  });

  startBtn.addEventListener('click', () => {
    showGame();
    initGame();
  });

  // Prevent the Start button from ignoring the selected level highlight.
  levelGrid.addEventListener('click', () => {
    startBtn.textContent = 'START GAME';
  });

  settingsBtn.addEventListener('click', () => {
    document.querySelector('.panel-settings').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  exitBtn.addEventListener('click', () => {
    showToast('SEE YOU SOON');
    showHome();
  });

  // ========== START ==========
  state.difficulty = progress.difficulty || 'medium';
  state.soundEnabled = progress.sound || false;
  syncSoundButtons();
  showHome();
  requestAnimationFrame(gameLoop);
})();
