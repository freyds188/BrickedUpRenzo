/**
 * BRICK BREAKER - Retro Arcade
 * Game logic, collision detection, and controls
 */

(function () {
  'use strict';

  // ========== CONFIG ==========
  const CONFIG = {
    canvas: { width: 400, height: 500 },
    paddle: {
      width: 90,
      height: 14,
      speed: 8,
      minWidth: 60,
    },
    ball: {
      radius: 8,
      baseSpeed: 5,
      maxSpeed: 12,
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
      text: '#00f5ff',
      overlayBg: 'rgba(10, 10, 18, 0.9)',
    },
    pointsPerBrick: 10,
    maxLives: 3,
  };

  // ========== LEVEL DEFINITIONS ==========
  // Each level: rows array. 1 = brick, 0 = empty. Difficulty params applied per level.
  const LEVELS = [
    {
      layout: [
        [1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1],
      ],
      ballSpeed: 1,
      paddleWidth: 1,
    },
    {
      layout: [
        [0, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 0],
      ],
      ballSpeed: 1.2,
      paddleWidth: 0.85,
    },
    {
      layout: [
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
      ],
      ballSpeed: 1.5,
      paddleWidth: 0.7,
    },
  ];

  // ========== DOM ELEMENTS ==========
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const livesEl = document.getElementById('lives');
  const overlay = document.getElementById('gameOverlay');
  const overlayMessage = document.getElementById('overlayMessage');
  const overlayButton = document.getElementById('overlayButton');
  const restartBtn = document.getElementById('restartBtn');

  // ========== GAME STATE ==========
  let state = {
    score: 0,
    level: 1,
    lives: CONFIG.maxLives,
    bricks: [],
    paddle: { x: 0, y: 0, w: 0, h: CONFIG.paddle.height },
    ball: { x: 0, y: 0, dx: 0, dy: 0, radius: CONFIG.ball.radius },
    running: false,
    gameOver: false,
    paused: false,
    ballDropping: false,
    keys: { left: false, right: false },
    mouseX: canvas.width / 2,
    lastTime: 0,
  };

  // ========== BRICK GENERATION ==========
  function generateBricksForLevel(levelIndex) {
    const def = LEVELS[levelIndex];
    if (!def) return [];
    const bricks = [];
    const { width: bw, height: bh, padding, offsetTop, offsetLeft } = CONFIG.brick;
    const colors = [CONFIG.colors.brick1, CONFIG.colors.brick2, CONFIG.colors.brick3];
    const colorIndex = levelIndex % 3;

    for (let row = 0; row < def.layout.length; row++) {
      for (let col = 0; col < def.layout[row].length; col++) {
        if (def.layout[row][col] === 1) {
          bricks.push({
            x: offsetLeft + col * (bw + padding),
            y: offsetTop + row * (bh + padding),
            w: bw,
            h: bh,
            color: colors[colorIndex],
            visible: true,
          });
        }
      }
    }
    return bricks;
  }

  // ========== RESET / INIT ==========
  function getPaddleWidth() {
    const def = LEVELS[state.level - 1] || LEVELS[0];
    const base = CONFIG.paddle.width;
    const scale = def.paddleWidth || 1;
    return Math.max(CONFIG.paddle.minWidth, Math.floor(base * scale));
  }

  function resetBall(serve) {
    state.ball.x = canvas.width / 2;
    state.ball.y = canvas.height - CONFIG.paddle.height - 40;
    state.ball.radius = CONFIG.ball.radius;

    const def = LEVELS[state.level - 1] || LEVELS[0];
    const speed = CONFIG.ball.baseSpeed * (def.ballSpeed || 1);
    const angle = (Math.random() * 0.6 + 0.7) * Math.PI; // upward angles
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

  function initLevel() {
    state.bricks = generateBricksForLevel(state.level - 1);
    state.paddle.w = getPaddleWidth();
    state.paddle.h = CONFIG.paddle.height;
    state.paddle.y = canvas.height - CONFIG.paddle.height - 10;
    state.paddle.x = (canvas.width - state.paddle.w) / 2;
    resetBall(false);
  }

  function fullRestart() {
    state.score = 0;
    state.level = 1;
    state.lives = CONFIG.maxLives;
    state.gameOver = false;
    state.running = true;
    state.paused = false;
    initLevel();
    resetBall(true);
    updateUI();
    hideOverlay();
  }

  function initGame() {
    state.score = 0;
    state.level = 1;
    state.lives = CONFIG.maxLives;
    state.gameOver = false;
    state.running = false;
    state.paused = false;
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
  }

  // ========== COLLISION DETECTION ==========
  function rectRect(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy <= r * r;
  }

  function checkBrickCollision() {
    const b = state.ball;
    for (const brick of state.bricks) {
      if (!brick.visible) continue;
      if (!circleRect(b.x, b.y, b.radius, brick.x, brick.y, brick.w, brick.h)) continue;

      brick.visible = false;
      state.score += CONFIG.pointsPerBrick;

      // Bounce: determine which side was hit
      const ballCenterX = b.x;
      const ballCenterY = b.y;
      const brickCenterX = brick.x + brick.w / 2;
      const brickCenterY = brick.y + brick.h / 2;
      const overlapX = b.radius + brick.w / 2 - Math.abs(ballCenterX - brickCenterX);
      const overlapY = b.radius + brick.h / 2 - Math.abs(ballCenterY - brickCenterY);

      if (overlapX < overlapY) {
        b.dx = -b.dx;
      } else {
        b.dy = -b.dy;
      }
      return;
    }
  }

  function checkPaddleCollision() {
    const b = state.ball;
    const p = state.paddle;
    if (b.dy <= 0) return false;
    if (!circleRect(b.x, b.y, b.radius, p.x, p.y, p.w, p.h)) return false;

    const hitPos = (b.x - (p.x + p.w / 2)) / (p.w / 2);
    const angle = hitPos * 0.8;
    const speed = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
    const maxSpeed = CONFIG.ball.maxSpeed;
    const newSpeed = Math.min(speed * 1.02, maxSpeed);
    b.dx = Math.sin(angle) * newSpeed;
    b.dy = -Math.cos(angle) * newSpeed;
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
      state.lives--;
      updateUI();
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
    const speed = CONFIG.paddle.speed * (dt / 16);

    if (state.keys.left || state.keys.right) {
      if (state.keys.left) state.paddle.x -= speed;
      if (state.keys.right) state.paddle.x += speed;
    } else {
      // Mouse follow when keyboard not used
      const targetX = state.mouseX - state.paddle.w / 2;
      const diff = targetX - state.paddle.x;
      state.paddle.x += Math.sign(diff) * Math.min(Math.abs(diff), speed * 2);
    }

    state.paddle.x = Math.max(0, Math.min(canvas.width - state.paddle.w, state.paddle.x));
  }

  function updateBall(dt) {
    // Ball drop animation before game start
    if (state.ballDropping) {
      const scale = dt / 16;
      state.ball.y += state.ball.dy * scale;
      state.ball.dy = Math.min(state.ball.dy + 0.15 * scale, 12);
      const paddleTop = state.paddle.y - state.ball.radius;
      if (state.ball.y >= paddleTop) {
        state.ball.y = paddleTop;
        state.ball.dy = 0;
        state.ball.x = state.paddle.x + state.paddle.w / 2;
        state.ballDropping = false;
      }
      return;
    }

    // Ball resting on paddle before start
    if (!state.running && state.ball.dy === 0) {
      state.ball.x = state.paddle.x + state.paddle.w / 2;
      state.ball.y = state.paddle.y - state.ball.radius;
      return;
    }

    if (state.paused || !state.running || state.ball.dx === 0) return;

    const scale = dt / 16;
    state.ball.x += state.ball.dx * scale;
    state.ball.y += state.ball.dy * scale;

    checkBrickCollision();
    checkPaddleCollision();
    checkWallCollision();
  }

  function checkLevelComplete() {
    const remaining = state.bricks.filter((b) => b.visible).length;
    if (remaining > 0) return;

    if (state.level >= LEVELS.length) {
      state.running = false;
      showOverlay('YOU WIN!', 'PLAY AGAIN');
      return;
    }
    state.level++;
    initLevel();
    resetBall(false);
    state.paused = true;
    updateUI();
    setTimeout(() => {
      state.paused = false;
      resetBall(true);
    }, 600);
  }

  // ========== RENDER ==========
  function draw() {
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const brick of state.bricks) {
      if (!brick.visible) continue;
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
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
  }

  // ========== GAME LOOP ==========
  function gameLoop(timestamp) {
    const dt = Math.min(timestamp - state.lastTime, 50);
    state.lastTime = timestamp;

    if (!state.gameOver) {
      updatePaddle(dt);
      updateBall(dt);
      if (state.running) checkLevelComplete();
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
  }

  function onKeyUp(e) {
    if (e.key === 'ArrowLeft') state.keys.left = false;
    if (e.key === 'ArrowRight') state.keys.right = false;
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    state.mouseX = (e.clientX - rect.left) * scaleX;
  }

  overlayButton.addEventListener('click', () => {
    hideOverlay();
    if (state.gameOver) {
      fullRestart();
    }
    state.running = true;
    state.gameOver = false;
    resetBall(true);
  });

  restartBtn.addEventListener('click', () => {
    fullRestart();
  });

  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.focus();

  // Prevent arrow keys from scrolling the page
  window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  });

  // ========== START ==========
  initGame();
  requestAnimationFrame(gameLoop);
})();
