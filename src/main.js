import "./style.css";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const nextCanvas = document.querySelector("#nextCanvas");
const nextCtx = nextCanvas.getContext("2d");

const startScreen = document.querySelector("#startScreen");
const gameScreen = document.querySelector("#gameScreen");

const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const restartBtn = document.querySelector("#restartBtn");
const exitBtn = document.querySelector("#exitBtn");

const leftBtn = document.querySelector("#leftBtn");
const rightBtn = document.querySelector("#rightBtn");
const rotateBtn = document.querySelector("#rotateBtn");
const dropBtn = document.querySelector("#dropBtn");

const scoreText = document.querySelector("#scoreText");
const linesText = document.querySelector("#linesText");
const levelText = document.querySelector("#levelText");
const statusText = document.querySelector("#statusText");

canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;

canvas.draggable = false;
nextCanvas.draggable = false;

document.addEventListener("dragstart", (event) => {
  event.preventDefault();
});

document.addEventListener(
  "gesturestart",
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

document.addEventListener(
  "gesturechange",
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

document.addEventListener(
  "gestureend",
  (event) => {
    event.preventDefault();
  },
  { passive: false },
);

const COLORS = {
  I: "#67e8f9",
  J: "#60a5fa",
  L: "#fb923c",
  O: "#facc15",
  S: "#4ade80",
  T: "#c084fc",
  Z: "#fb7185",
};

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

const PIECE_TYPES = Object.keys(SHAPES);

let board;
let currentPiece;
let nextPiece;
let score;
let lines;
let level;
let dropCounter;
let dropInterval;
let lastTime;
let animationId;
let isRunning;
let isPaused;
let isGameOver;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function randomType() {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

function createPiece(type = randomType()) {
  const matrix = cloneMatrix(SHAPES[type]);

  return {
    type,
    matrix,
    color: COLORS[type],
    x: Math.floor(COLS / 2) - Math.ceil(matrix[0].length / 2),
    y: 0,
  };
}

function resetGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropCounter = 0;
  dropInterval = 850;
  lastTime = 0;
  isRunning = true;
  isPaused = false;
  isGameOver = false;
  currentPiece = createPiece();
  nextPiece = createPiece();
  updateHud();
  updateStatus("游戏中");
  pauseBtn.textContent = "暂停";
}

function startGame() {
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  resetGame();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(update);
}

function restartGame() {
  resetGame();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(update);
}

function exitGame() {
  isRunning = false;
  isPaused = false;
  isGameOver = false;
  cancelAnimationFrame(animationId);
  startScreen.classList.remove("hidden");
  gameScreen.classList.add("hidden");
}

function togglePause() {
  if (!isRunning || isGameOver) return;

  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "继续" : "暂停";
  updateStatus(isPaused ? "已暂停" : "游戏中");

  if (!isPaused) {
    lastTime = 0;
    animationId = requestAnimationFrame(update);
  } else {
    draw();
  }
}

function update(time = 0) {
  if (!isRunning || isPaused || isGameOver) {
    draw();
    return;
  }

  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;

  if (dropCounter > dropInterval) {
    softDrop();
  }

  draw();
  animationId = requestAnimationFrame(update);
}

function updateHud() {
  scoreText.textContent = String(score);
  linesText.textContent = String(lines);
  levelText.textContent = String(level);
}

function updateStatus(text) {
  statusText.textContent = text;
}

function drawCell(targetCtx, x, y, size, color) {
  const px = x * size;
  const py = y * size;

  targetCtx.fillStyle = color;
  targetCtx.fillRect(px, py, size, size);

  targetCtx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  targetCtx.lineWidth = 2;
  targetCtx.strokeRect(px + 1, py + 1, size - 2, size - 2);

  targetCtx.fillStyle = "rgba(255, 255, 255, 0.18)";
  targetCtx.fillRect(px + 3, py + 3, size - 6, 4);
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK, 0);
    ctx.lineTo(x * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK);
    ctx.lineTo(COLS * BLOCK, y * BLOCK);
    ctx.stroke();
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const color = board[y][x];

      if (color) {
        drawCell(ctx, x, y, BLOCK, color);
      }
    }
  }
}

function drawPiece(piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawCell(ctx, piece.x + x, piece.y + y, BLOCK, piece.color);
      }
    });
  });
}

function drawNextPiece() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

  nextCtx.fillStyle = "rgba(0, 0, 0, 0.2)";
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPiece) return;

  const matrix = nextPiece.matrix;
  const size = matrix.length === 4 ? 20 : 24;
  const pieceWidth = matrix[0].length * size;
  const pieceHeight = matrix.length * size;
  const offsetX = Math.floor((nextCanvas.width - pieceWidth) / 2);
  const offsetY = Math.floor((nextCanvas.height - pieceHeight) / 2);

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;

      const px = offsetX + x * size;
      const py = offsetY + y * size;

      nextCtx.fillStyle = nextPiece.color;
      nextCtx.fillRect(px, py, size, size);

      nextCtx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      nextCtx.lineWidth = 2;
      nextCtx.strokeRect(px + 1, py + 1, size - 2, size - 2);

      nextCtx.fillStyle = "rgba(255, 255, 255, 0.18)";
      nextCtx.fillRect(px + 3, py + 3, size - 6, 4);
    });
  });
}

function drawOverlay(text) {
  ctx.fillStyle = "rgba(5, 8, 18, 0.74)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f5f7ff";
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function draw() {
  drawBoard();

  if (currentPiece) {
    drawPiece(currentPiece);
  }

  drawNextPiece();

  if (isPaused) {
    drawOverlay("暂停");
  }

  if (isGameOver) {
    drawOverlay("游戏结束");
  }
}

function collide(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) continue;

      const newX = piece.x + x + offsetX;
      const newY = piece.y + y + offsetY;

      if (newX < 0 || newX >= COLS || newY >= ROWS) {
        return true;
      }

      if (newY >= 0 && board[newY][newX]) {
        return true;
      }
    }
  }

  return false;
}

function mergePiece() {
  currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;

      const boardY = currentPiece.y + y;
      const boardX = currentPiece.x + x;

      if (boardY >= 0) {
        board[boardY][boardX] = currentPiece.color;
      }
    });
  });
}

function clearLines() {
  let cleared = 0;

  outer: for (let y = ROWS - 1; y >= 0; y -= 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!board[y][x]) {
        continue outer;
      }
    }

    const row = board.splice(y, 1)[0].fill(null);
    board.unshift(row);
    cleared += 1;
    y += 1;
  }

  if (cleared > 0) {
    const lineScores = [0, 100, 300, 500, 800];
    score += lineScores[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 850 - (level - 1) * 70);
    updateHud();
  }
}

function spawnNextPiece() {
  currentPiece = nextPiece;
  currentPiece.x = Math.floor(COLS / 2) - Math.ceil(currentPiece.matrix[0].length / 2);
  currentPiece.y = 0;
  nextPiece = createPiece();

  if (collide(currentPiece)) {
    gameOver();
  }
}

function gameOver() {
  isGameOver = true;
  isRunning = false;
  updateStatus("游戏结束");
  draw();
}

function softDrop() {
  if (!isRunning || isPaused || isGameOver) return;

  if (!collide(currentPiece, 0, 1)) {
    currentPiece.y += 1;
  } else {
    mergePiece();
    clearLines();
    spawnNextPiece();
  }

  dropCounter = 0;
}

function hardDrop() {
  if (!isRunning || isPaused || isGameOver) return;

  let distance = 0;

  while (!collide(currentPiece, 0, 1)) {
    currentPiece.y += 1;
    distance += 1;
  }

  score += distance * 2;
  updateHud();

  mergePiece();
  clearLines();
  spawnNextPiece();
  dropCounter = 0;
  draw();
}

function movePiece(direction) {
  if (!isRunning || isPaused || isGameOver) return;

  if (!collide(currentPiece, direction, 0)) {
    currentPiece.x += direction;
    draw();
  }
}

function rotateMatrix(matrix) {
  const size = matrix.length;
  const result = Array.from({ length: size }, () => Array(size).fill(0));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      result[x][size - 1 - y] = matrix[y][x];
    }
  }

  return result;
}

function rotatePiece() {
  if (!isRunning || isPaused || isGameOver) return;
  if (currentPiece.type === "O") return;

  const rotated = rotateMatrix(currentPiece.matrix);
  const originalX = currentPiece.x;
  const kicks = [0, -1, 1, -2, 2];

  for (const kick of kicks) {
    currentPiece.x = originalX + kick;

    if (!collide(currentPiece, 0, 0, rotated)) {
      currentPiece.matrix = rotated;
      draw();
      return;
    }
  }

  currentPiece.x = originalX;
}

function getCanvasCellWidth() {
  const rect = canvas.getBoundingClientRect();
  return rect.width / COLS;
}

/* keyboard */

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    movePiece(-1);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    movePiece(1);
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    softDrop();
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    rotatePiece();
  }

  if (event.code === "Space") {
    event.preventDefault();
    hardDrop();
  }

  if (event.key.toLowerCase() === "p") {
    event.preventDefault();
    togglePause();
  }
});

/* mouse + touch */

let pointerActive = false;
let pointerId = null;
let pointerStartX = 0;
let pointerStartY = 0;
let pointerLastX = 0;
let pointerMoved = false;
let pointerWasTouch = false;
let hardDropDoneBySwipe = false;
let lastMouseLeftClickTime = 0;

canvas.addEventListener(
  "contextmenu",
  (event) => {
    event.preventDefault();
    rotatePiece();
  },
  { passive: false },
);

canvas.addEventListener(
  "pointerdown",
  (event) => {
    event.preventDefault();

    if (!isRunning || isPaused || isGameOver) return;

    /*
      右键旋转只交给 contextmenu。
      这里不再 rotate，否则电脑右键会旋转两次。
    */
    if (event.pointerType === "mouse" && event.button === 2) {
      return;
    }

    canvas.setPointerCapture?.(event.pointerId);

    pointerActive = true;
    pointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerLastX = event.clientX;
    pointerMoved = false;
    pointerWasTouch = event.pointerType === "touch";
    hardDropDoneBySwipe = false;

    if (event.pointerType === "mouse" && event.button === 0) {
      const now = Date.now();

      if (now - lastMouseLeftClickTime < 280) {
        hardDrop();
        lastMouseLeftClickTime = 0;
        pointerActive = false;
        pointerId = null;
        return;
      }

      lastMouseLeftClickTime = now;
    }
  },
  { passive: false },
);

canvas.addEventListener(
  "pointermove",
  (event) => {
    event.preventDefault();

    if (!pointerActive || event.pointerId !== pointerId) return;
    if (!isRunning || isPaused || isGameOver) return;

    const dxFromStart = event.clientX - pointerStartX;
    const dyFromStart = event.clientY - pointerStartY;
    const dxFromLast = event.clientX - pointerLastX;

    const cellWidth = getCanvasCellWidth();
    const horizontalStep = Math.max(16, cellWidth * 0.72);

    if (Math.abs(dxFromLast) >= horizontalStep) {
      const steps = Math.trunc(dxFromLast / horizontalStep);
      const direction = steps > 0 ? 1 : -1;
      const count = Math.min(4, Math.abs(steps));

      for (let i = 0; i < count; i += 1) {
        movePiece(direction);
      }

      pointerLastX += steps * horizontalStep;
      pointerMoved = true;
    }

    /*
      手机：下滑直接落下。
      电脑：按住鼠标向下滑，也直接落下。
    */
    if (
      !hardDropDoneBySwipe &&
      dyFromStart > 72 &&
      Math.abs(dyFromStart) > Math.abs(dxFromStart) * 1.15
    ) {
      hardDropDoneBySwipe = true;
      pointerMoved = true;
      hardDrop();
    }

    if (Math.abs(dxFromStart) > 10 || Math.abs(dyFromStart) > 10) {
      pointerMoved = true;
    }
  },
  { passive: false },
);

canvas.addEventListener(
  "pointerup",
  (event) => {
    event.preventDefault();

    if (!pointerActive || event.pointerId !== pointerId) return;

    const wasTouch = pointerWasTouch;
    const moved = pointerMoved;
    const dropped = hardDropDoneBySwipe;

    pointerActive = false;
    pointerId = null;

    canvas.releasePointerCapture?.(event.pointerId);

    if (!isRunning || isPaused || isGameOver) return;

    /*
      手机轻点：旋转。
      电脑左键单击：不旋转，避免和双击落下冲突。
    */
    if (wasTouch && !moved && !dropped) {
      rotatePiece();
    }
  },
  { passive: false },
);

canvas.addEventListener(
  "pointercancel",
  (event) => {
    event.preventDefault();
    pointerActive = false;
    pointerId = null;
  },
  { passive: false },
);

/* buttons */

function bindHoldButton(button, action, repeatDelay = 120) {
  let timer = null;

  const start = (event) => {
    event.preventDefault();
    action();

    timer = window.setInterval(() => {
      action();
    }, repeatDelay);
  };

  const stop = (event) => {
    event?.preventDefault?.();

    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  button.addEventListener("pointerdown", start, { passive: false });
  button.addEventListener("pointerup", stop, { passive: false });
  button.addEventListener("pointerleave", stop, { passive: false });
  button.addEventListener("pointercancel", stop, { passive: false });
}

bindHoldButton(leftBtn, () => movePiece(-1));
bindHoldButton(rightBtn, () => movePiece(1));
bindHoldButton(dropBtn, hardDrop, 220);

rotateBtn.addEventListener("click", () => {
  rotatePiece();
});

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", restartGame);
exitBtn.addEventListener("click", exitGame);

/* prevent iPhone double tap zoom */

let lastTouchEnd = 0;

document.addEventListener(
  "touchend",
  (event) => {
    const now = Date.now();

    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }

    lastTouchEnd = now;
  },
  { passive: false },
);

/* initial paint */

resetGame();
isRunning = false;
draw();