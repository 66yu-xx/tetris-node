import './style.css'

const startScreen = document.querySelector('#start-screen')
const gameShell = document.querySelector('#game-shell')
const startButton = document.querySelector('#start-game')
const canvas = document.querySelector('#game')
const ctx = canvas.getContext('2d')
const nextCanvas = document.querySelector('#next')
const nextCtx = nextCanvas.getContext('2d')

const COLS = 10
const ROWS = 20
const BLOCK = 30

canvas.width = COLS * BLOCK
canvas.height = ROWS * BLOCK

const COLORS = {
  I: '#00d9ff',
  J: '#2f6bff',
  L: '#ff9f1c',
  O: '#ffd500',
  S: '#2ee66b',
  T: '#a855f7',
  Z: '#ff3b5c',
}

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
}

let board = createBoard()
let currentPiece = createPiece()
let nextPiece = createPiece()
let score = 0
let lines = 0
let level = 1
let dropCounter = 0
let dropInterval = 800
let lastTime = 0
let paused = false
let gameOver = false
let gameStarted = false

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function createPiece() {
  const keys = Object.keys(SHAPES)
  const type = keys[Math.floor(Math.random() * keys.length)]
  const matrix = SHAPES[type].map((row) => [...row])

  return {
    type,
    matrix,
    x: Math.floor(COLS / 2) - Math.ceil(matrix[0].length / 2),
    y: 0,
  }
}

function drawBlock(context, x, y, color, blockSize = BLOCK) {
  context.fillStyle = color
  context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize)

  context.strokeStyle = 'rgba(255, 255, 255, 0.22)'
  context.lineWidth = 2
  context.strokeRect(x * blockSize + 1, y * blockSize + 1, blockSize - 2, blockSize - 2)
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#0d1220'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const color = board[y][x]

      if (color) {
        drawBlock(ctx, x, y, color)
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
        ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK)
      }
    }
  }

  if (gameStarted) {
    drawPiece(ctx, currentPiece)
  }
}

function drawPiece(context, piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawBlock(context, piece.x + x, piece.y + y, COLORS[piece.type])
      }
    })
  })
}

function drawNextPiece() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height)
  nextCtx.fillStyle = '#0d1220'
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height)

  if (!gameStarted) return

  const blockSize = 24
  const matrix = nextPiece.matrix
  const offsetX = Math.floor((nextCanvas.width / blockSize - matrix[0].length) / 2)
  const offsetY = Math.floor((nextCanvas.height / blockSize - matrix.length) / 2)

  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        drawBlock(nextCtx, offsetX + x, offsetY + y, COLORS[nextPiece.type], blockSize)
      }
    })
  })
}

function collide(piece, offsetX = 0, offsetY = 0, testMatrix = piece.matrix) {
  for (let y = 0; y < testMatrix.length; y++) {
    for (let x = 0; x < testMatrix[y].length; x++) {
      if (!testMatrix[y][x]) continue

      const newX = piece.x + x + offsetX
      const newY = piece.y + y + offsetY

      if (newX < 0 || newX >= COLS || newY >= ROWS) {
        return true
      }

      if (newY >= 0 && board[newY][newX]) {
        return true
      }
    }
  }

  return false
}

function mergePiece() {
  currentPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        const boardY = currentPiece.y + y
        const boardX = currentPiece.x + x

        if (boardY >= 0) {
          board[boardY][boardX] = COLORS[currentPiece.type]
        }
      }
    })
  })
}

function clearLines() {
  let cleared = 0

  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (!board[y][x]) {
        continue outer
      }
    }

    board.splice(y, 1)
    board.unshift(Array(COLS).fill(null))
    cleared++
    y++
  }

  if (cleared > 0) {
    lines += cleared
    score += [0, 100, 300, 500, 800][cleared] * level
    level = Math.floor(lines / 10) + 1
    dropInterval = Math.max(120, 800 - (level - 1) * 70)
    updateInfo()
  }
}

function rotateMatrix(matrix) {
  const size = matrix.length
  const rotated = Array.from({ length: size }, () => Array(size).fill(0))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      rotated[x][size - 1 - y] = matrix[y][x]
    }
  }

  return rotated
}

function rotatePiece() {
  if (!gameStarted || paused || gameOver) return

  const rotated = rotateMatrix(currentPiece.matrix)

  if (!collide(currentPiece, 0, 0, rotated)) {
    currentPiece.matrix = rotated
    return
  }

  if (!collide(currentPiece, -1, 0, rotated)) {
    currentPiece.x--
    currentPiece.matrix = rotated
    return
  }

  if (!collide(currentPiece, 1, 0, rotated)) {
    currentPiece.x++
    currentPiece.matrix = rotated
  }
}

function movePiece(direction) {
  if (!gameStarted || paused || gameOver) return

  if (!collide(currentPiece, direction, 0)) {
    currentPiece.x += direction
  }
}

function dropPiece() {
  if (!gameStarted || paused || gameOver) return

  if (!collide(currentPiece, 0, 1)) {
    currentPiece.y++
    return
  }

  mergePiece()
  clearLines()
  spawnNextPiece()
}

function hardDrop() {
  if (!gameStarted || paused || gameOver) return

  while (!collide(currentPiece, 0, 1)) {
    currentPiece.y++
    score += 2
  }

  dropPiece()
  updateInfo()
}

function spawnNextPiece() {
  currentPiece = nextPiece
  nextPiece = createPiece()

  if (collide(currentPiece, 0, 0)) {
    gameOver = true
    document.querySelector('#status').textContent = '游戏结束'
  }
}

function updateInfo() {
  document.querySelector('#score').textContent = score
  document.querySelector('#lines').textContent = lines
  document.querySelector('#level').textContent = level
}

function resetGame() {
  board = createBoard()
  currentPiece = createPiece()
  nextPiece = createPiece()
  score = 0
  lines = 0
  level = 1
  dropCounter = 0
  dropInterval = 800
  lastTime = 0
  paused = false
  gameOver = false
  gameStarted = true
  document.querySelector('#status').textContent = '游戏中'
  updateInfo()
}

function startGame() {
  startScreen.classList.add('hidden')
  gameShell.classList.remove('hidden')
  resetGame()
}

function quitGame() {
  gameStarted = false
  paused = false
  gameOver = false
  pointerActive = false
  startScreen.classList.remove('hidden')
  gameShell.classList.add('hidden')
  document.querySelector('#status').textContent = '游戏中'
  updateInfo()
}

function togglePause() {
  if (!gameStarted || gameOver) return

  paused = !paused
  document.querySelector('#status').textContent = paused ? '已暂停' : '游戏中'
}

function update(time = 0) {
  const deltaTime = time - lastTime
  lastTime = time

  if (gameStarted && !paused && !gameOver) {
    dropCounter += deltaTime

    if (dropCounter > dropInterval) {
      dropPiece()
      dropCounter = 0
    }
  }

  drawBoard()
  drawNextPiece()

  requestAnimationFrame(update)
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'p' || event.key === 'P') {
    togglePause()
    return
  }

  if (event.key === 'r' || event.key === 'R') {
    if (gameStarted) resetGame()
    return
  }

  if (!gameStarted || paused || gameOver) return

  if (event.key === 'ArrowLeft') movePiece(-1)
  if (event.key === 'ArrowRight') movePiece(1)
  if (event.key === 'ArrowDown') dropPiece()
  if (event.key === 'ArrowUp') rotatePiece()
  if (event.code === 'Space') {
    event.preventDefault()
    hardDrop()
  }
})

let pointerActive = false
let pointerStartX = 0
let pointerStartY = 0
let pointerLastX = 0
let pointerMoved = false
let pointerType = 'mouse'
let lastTouchEndTime = 0
let lastPointerWasTouch = false

const horizontalMoveThreshold = 24
const verticalDropThreshold = 70
const tapThreshold = 10

function preventBrowserGesture(event) {
  event.preventDefault()
}

document.addEventListener('contextmenu', preventBrowserGesture)
document.addEventListener('dblclick', preventBrowserGesture, { passive: false, capture: true })
document.addEventListener('gesturestart', preventBrowserGesture, { passive: false })
document.addEventListener('gesturechange', preventBrowserGesture, { passive: false })
document.addEventListener('gestureend', preventBrowserGesture, { passive: false })

document.addEventListener(
  'touchend',
  (event) => {
    const now = Date.now()

    if (now - lastTouchEndTime <= 500) {
      event.preventDefault()
      event.stopPropagation()
    }

    lastTouchEndTime = now
  },
  { passive: false, capture: true },
)

canvas.addEventListener(
  'touchstart',
  (event) => {
    event.preventDefault()
  },
  { passive: false },
)

canvas.addEventListener(
  'touchmove',
  (event) => {
    event.preventDefault()
  },
  { passive: false },
)

canvas.addEventListener(
  'touchend',
  (event) => {
    event.preventDefault()
  },
  { passive: false },
)

canvas.addEventListener('pointerdown', (event) => {
  if (!gameStarted || paused || gameOver) return

  canvas.setPointerCapture(event.pointerId)

  pointerActive = true
  pointerStartX = event.clientX
  pointerStartY = event.clientY
  pointerLastX = event.clientX
  pointerMoved = false
  pointerType = event.pointerType
  lastPointerWasTouch = event.pointerType !== 'mouse'

  if (event.pointerType === 'mouse' && event.button === 2) {
    event.preventDefault()
    rotatePiece()
    pointerActive = false
    return
  }
})

canvas.addEventListener('pointermove', (event) => {
  if (!pointerActive || !gameStarted || paused || gameOver) return

  const diffFromStartX = event.clientX - pointerStartX
  const diffFromStartY = event.clientY - pointerStartY
  const diffFromLastX = event.clientX - pointerLastX

  if (Math.abs(diffFromStartX) > tapThreshold || Math.abs(diffFromStartY) > tapThreshold) {
    pointerMoved = true
  }

  if (diffFromStartY >= verticalDropThreshold && Math.abs(diffFromStartY) > Math.abs(diffFromStartX) * 1.4) {
    hardDrop()
    pointerActive = false
    return
  }

  if (Math.abs(diffFromLastX) >= horizontalMoveThreshold) {
    const direction = diffFromLastX > 0 ? 1 : -1
    movePiece(direction)
    pointerLastX = event.clientX
    pointerMoved = true
  }
})

canvas.addEventListener('pointerup', () => {
  if (!pointerActive || !gameStarted || paused || gameOver) return

  pointerActive = false

  if (pointerType !== 'mouse' && !pointerMoved) {
    rotatePiece()
  }
})

canvas.addEventListener('dblclick', (event) => {
  event.preventDefault()

  if (!gameStarted || paused || gameOver) return
  if (lastPointerWasTouch) return
  if (pointerType !== 'mouse') return

  hardDrop()
})

canvas.addEventListener('pointercancel', () => {
  pointerActive = false
})

startButton.addEventListener('click', startGame)
document.querySelector('#left').addEventListener('click', () => movePiece(-1))
document.querySelector('#right').addEventListener('click', () => movePiece(1))
document.querySelector('#rotate').addEventListener('click', () => rotatePiece())
document.querySelector('#drop').addEventListener('click', () => hardDrop())
document.querySelector('#pause').addEventListener('click', togglePause)
document.querySelector('#restart').addEventListener('click', resetGame)
document.querySelector('#quit').addEventListener('click', quitGame)

updateInfo()
update()