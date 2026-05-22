const UI = {
  decreaseBtn: document.getElementById('decreaseBtn'),
  increaseBtn: document.getElementById('increaseBtn'),
  playerCountDisplay: document.getElementById('playerCountDisplay'),
  confirmCountBtn: document.getElementById('confirmCountBtn'),
  playerInputs: document.getElementById('playerInputs'),
  prizeInputs: document.getElementById('prizeInputs'),
  shuffleBtn: document.getElementById('shuffleBtn'),
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  canvas: document.getElementById('ladderCanvas'),
  ctx: document.getElementById('ladderCanvas').getContext('2d'),
  modalOverlay: document.getElementById('resultModal'),
  resultsList: document.getElementById('resultsList'),
  closeModalBtn: document.getElementById('closeModalBtn'),
};

let playerCount = 4;
let ladderData = { verticalLines: [], horizontalBridges: [] };
let isPlaying = false;
let animationFrameId = null;
let savedPlayers = [];
let savedPrizes = [];

// Vibrant colors for each player's path
const PATH_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
  '#ec4899', '#f43f5e', '#ff3333', '#33ff33', '#3333ff', '#ffff33', '#33ffff', '#ff33ff'
];

function init() {
  bindEvents();
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    if (!isPlaying && ladderData.verticalLines.length > 0) drawLadder();
  });
  // Auto setup on initial load
  setupLadder();
}

function bindEvents() {
  UI.decreaseBtn.addEventListener('click', () => updateCount(-1));
  UI.increaseBtn.addEventListener('click', () => updateCount(1));
  UI.confirmCountBtn.addEventListener('click', setupLadder);
  UI.shuffleBtn.addEventListener('click', shuffleLadder);
  UI.startBtn.addEventListener('click', startLadderGame);
  UI.resetBtn.addEventListener('click', resetAll);
  UI.closeModalBtn.addEventListener('click', () => {
    UI.modalOverlay.classList.remove('show');
    setTimeout(() => { UI.modalOverlay.style.display = 'none'; }, 300);
  });
}

function updateCount(change) {
  let count = parseInt(UI.playerCountDisplay.innerText) + change;
  if (count < 2) count = 2;
  if (count > 20) count = 20;
  UI.playerCountDisplay.innerText = count;
  playerCount = count;
}

// Preserve state of inputs
function saveInputs() {
  const pInputs = UI.playerInputs.querySelectorAll('.player-input');
  const prInputs = UI.prizeInputs.querySelectorAll('.prize-input');
  
  // Only save if there are inputs generated
  if (pInputs.length > 0) {
    savedPlayers = Array.from(pInputs).map(input => input.value);
    savedPrizes = Array.from(prInputs).map(input => input.value);
  }
}

// Ensure saved array has length of playerCount
function padSavedArrays() {
  while (savedPlayers.length < playerCount) savedPlayers.push('');
  while (savedPrizes.length < playerCount) savedPrizes.push('');
  // truncate if count decreased
  if (savedPlayers.length > playerCount) {
    savedPlayers = savedPlayers.slice(0, playerCount);
    savedPrizes = savedPrizes.slice(0, playerCount);
  }
}

function setupLadder() {
  saveInputs(); // Save before recreating
  padSavedArrays();
  
  UI.playerInputs.innerHTML = '';
  UI.prizeInputs.innerHTML = '';
  
  for (let i = 0; i < playerCount; i++) {
    // Player Input
    const pContainer = document.createElement('div');
    pContainer.className = 'input-container';
    const pInput = document.createElement('input');
    pInput.type = 'text';
    pInput.className = 'player-input';
    pInput.placeholder = `참가자 ${i + 1}`;
    pInput.value = savedPlayers[i] || ''; 
    pContainer.appendChild(pInput);
    UI.playerInputs.appendChild(pContainer);
    
    // Prize Input
    const prContainer = document.createElement('div');
    prContainer.className = 'input-container';
    const prInput = document.createElement('input');
    prInput.type = 'text';
    prInput.className = 'prize-input';
    prInput.placeholder = `항목 ${i + 1}`;
    prInput.value = savedPrizes[i] || ''; 
    prContainer.appendChild(prInput);
    UI.prizeInputs.appendChild(prContainer);
  }
  
  // Re-attach listeners to save state dynamically on type
  document.querySelectorAll('.player-input, .prize-input').forEach(input => {
    input.addEventListener('input', saveInputs);
  });
  
  generateLadderData();
  drawLadder();
}

function shuffleLadder() {
  if (isPlaying) return;
  if (UI.playerInputs.children.length === 0) {
    setupLadder();
  } else {
    generateLadderData();
    drawLadder();
  }
}

function resetAll() {
  if (isPlaying) return;
  savedPlayers = [];
  savedPrizes = [];
  UI.playerInputs.innerHTML = '';
  UI.prizeInputs.innerHTML = '';
  setupLadder(); // this will generate empty inputs again
}

function resizeCanvas() {
  const container = UI.canvas.parentElement;
  // Use CSS pixel resolution, handle high DPI displays nicely
  const dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  
  UI.canvas.width = rect.width * dpr;
  UI.canvas.height = rect.height * dpr;
  UI.ctx.scale(dpr, dpr);
  UI.canvas.style.width = `${rect.width}px`;
  UI.canvas.style.height = `${rect.height}px`;
}

function generateLadderData() {
  const cols = playerCount;
  const rows = Math.max(8, cols * 2); 
  ladderData.verticalLines = Array.from({length: cols}, (_, i) => i);
  ladderData.horizontalBridges = [];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols - 1; col++) {
      // Create bridge with chance, preventing adjacent bridges on same row
      if (Math.random() < 0.45) {
        if (!ladderData.horizontalBridges.some(b => b.row === row && (b.col === col - 1 || b.col === col))) {
          ladderData.horizontalBridges.push({ row, col });
        }
      }
    }
  }
}

function getDrawParams() {
  const rect = UI.canvas.parentElement.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const paddingX = width / (playerCount * 2);
  const gapX = (width - paddingX * 2) / (playerCount - 1 || 1);
  const rows = Math.max(8, playerCount * 2);
  const paddingY = 40;
  const gapY = (height - paddingY * 2) / (rows + 1);
  
  return { width, height, paddingX, gapX, gapY, paddingY, rows };
}

function ctxClear() {
  const rect = UI.canvas.parentElement.getBoundingClientRect();
  UI.ctx.clearRect(0, 0, rect.width, rect.height);
}

function drawLadder() {
  if (!ladderData.verticalLines.length) return;
  const { height, paddingX, gapX, gapY, paddingY, rows } = getDrawParams();
  const ctx = UI.ctx;
  
  ctxClear();
  
  // Base style
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw vertical lines
  for (let i = 0; i < playerCount; i++) {
    ctx.beginPath();
    ctx.moveTo(paddingX + i * gapX, paddingY);
    ctx.lineTo(paddingX + i * gapX, height - paddingY);
    ctx.stroke();
  }
  
  // Draw horizontal bridges
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ladderData.horizontalBridges.forEach(bridge => {
    const x = paddingX + bridge.col * gapX;
    const y = paddingY + (bridge.row + 1) * gapY;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + gapX, y);
    ctx.stroke();
  });
}

function tracePath(startCol) {
  const { rows } = getDrawParams();
  let path = [];
  let currentCol = startCol;
  
  path.push({ col: currentCol, row: -1 }); // Top
  
  for (let r = 0; r < rows; r++) {
    const leftBridge = ladderData.horizontalBridges.find(b => b.row === r && b.col === currentCol - 1);
    const rightBridge = ladderData.horizontalBridges.find(b => b.row === r && b.col === currentCol);
    
    path.push({ col: currentCol, row: r }); 
    
    if (leftBridge) {
      currentCol -= 1;
      path.push({ col: currentCol, row: r, isBridge: true });
    } else if (rightBridge) {
      currentCol += 1;
      path.push({ col: currentCol, row: r, isBridge: true });
    }
  }
  
  path.push({ col: currentCol, row: rows }); // Bottom
  return path;
}

function startLadderGame() {
  if (isPlaying || UI.playerInputs.children.length === 0) return;
  isPlaying = true;
  saveInputs();
  
  const allPaths = [];
  for (let i = 0; i < playerCount; i++) {
    allPaths.push(tracePath(i));
  }
  
  animatePaths(allPaths);
}

function animatePaths(paths) {
  const { height, paddingX, gapX, gapY, paddingY } = getDrawParams();
  let progress = 0; 
  let currentSegment = 0;
  const maxSegments = paths[0].length - 1;
  const speed = 0.15; // Animation speed

  function render() {
    drawLadder(); 
    const ctx = UI.ctx;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let i = 0; i < paths.length; i++) {
      ctx.strokeStyle = PATH_COLORS[i % PATH_COLORS.length];
      const path = paths[i];
      ctx.beginPath();
      
      let startX = paddingX + path[0].col * gapX;
      ctx.moveTo(startX, paddingY);
      
      for (let s = 0; s <= currentSegment; s++) {
        if (s >= path.length - 1) break;
        const p1 = path[s];
        const p2 = path[s + 1];
        
        let x1 = paddingX + p1.col * gapX;
        let y1 = p1.row === -1 ? paddingY : paddingY + (p1.row + 1) * gapY;
        let x2 = paddingX + p2.col * gapX;
        let y2 = p2.row === paths[0][paths[0].length-1].row ? height - paddingY : paddingY + (p2.row + 1) * gapY;
        
        if (s < currentSegment) {
          ctx.lineTo(x2, y2);
        } else {
          // interpolate
          let curX = x1 + (x2 - x1) * progress;
          let curY = y1 + (y2 - y1) * progress;
          ctx.lineTo(curX, curY);
        }
      }
      
      // Neon glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = PATH_COLORS[i % PATH_COLORS.length];
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    }
    
    progress += speed;
    if (progress >= 1) {
      progress = 0;
      currentSegment++;
    }
    
    if (currentSegment < maxSegments) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      isPlaying = false;
      showResults(paths);
    }
  }
  
  render();
}

function showResults(paths) {
  UI.resultsList.innerHTML = '';
  
  const players = Array.from(UI.playerInputs.querySelectorAll('.player-input')).map((input, i) => input.value || `참가자 ${i + 1}`);
  const prizes = Array.from(UI.prizeInputs.querySelectorAll('.prize-input')).map((input, i) => input.value || `항목 ${i + 1}`);
  
  paths.forEach((path, i) => {
    const endCol = path[path.length - 1].col;
    const player = players[i];
    const prize = prizes[endCol];
    
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `
      <span class="result-player" style="color: ${PATH_COLORS[i % PATH_COLORS.length]}">${player}</span>
      <span class="result-arrow">✨</span>
      <span class="result-prize">${prize}</span>
    `;
    UI.resultsList.appendChild(div);
  });
  
  UI.modalOverlay.style.display = 'flex';
  setTimeout(() => {
    UI.modalOverlay.classList.add('show');
  }, 10);
}

document.addEventListener('DOMContentLoaded', init);
