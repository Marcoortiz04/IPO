/* ==========================================================================
   MODEL
   ========================================================================== */
class BoardModel {
  constructor(size = 3, playersParam = 1) {
    this.size = Math.max(2, parseInt(size) || 3);
    this.board = [];
    
    if (Array.isArray(playersParam)) {
      this.players = playersParam.map((name, index) => ({
        id: index,
        name: name,
        score: 0
      }));
    } else {
      const num = Math.max(1, parseInt(playersParam) || 1);
      this.players = Array.from({ length: num }, (_, index) => ({
        id: index,
        name: `Jugador ${index + 1}`,
        score: 0
      }));
    }

    this.currentPlayerIndex = 0;
    this.isMultiplayer = this.players.length > 1;
    this.completedRows = new Set();
    this.movesCount = 0;

    this.initBoard();
  }

  get grid() {
    return this.board.map(row => row.map(cell => cell ? cell.type : null));
  }

  get numPlayers() {
    return this.players.length;
  }

  set numPlayers(count) {
    const num = Math.max(1, parseInt(count) || 1);
    this.players = Array.from({ length: num }, (_, index) => ({
      id: index,
      name: `Jugador ${index + 1}`,
      score: 0
    }));
    this.isMultiplayer = this.players.length > 1;
  }

  get scores() {
    return this.players.map(p => p.score);
  }

  get currentPlayer() {
    return this.currentPlayerIndex;
  }

  /**
   * Genera un tablero NxN con distribución equitativa y asegura 
   * que NINGUNA fila comience completada al inicio de la partida.
   */
  initBoard() {
    this.completedRows.clear();
    this.movesCount = 0;
    this.currentPlayerIndex = 0;
    this.players.forEach(p => p.score = 0);

    const N = this.size;
    const types = [1, 2, 3];

    let k = [1, 1, 1];
    if (N < 3) {
      k = [1, 1, 0];
    }

    let currentSum = k.reduce((a, b) => a + b, 0);
    let remainingRows = N - currentSum;

    while (remainingRows > 0) {
      const randomIndex = Math.floor(Math.random() * (N < 3 ? 2 : 3));
      k[randomIndex]++;
      remainingRows--;
    }

    let bag = [];
    for (let t = 0; t < 3; t++) {
      const count = k[t] * N;
      for (let i = 0; i < count; i++) {
        bag.push(types[t]);
      }
    }

    // Bucle para repetir el barajado hasta asegurar que NINGUNA fila esté homogénea al inicio
    do {
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }

      this.board = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
      let index = 0;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          this.board[r][c] = {
            id: `piece-${r}-${c}-${Math.random().toString(36).substr(2, 5)}`,
            type: bag[index++]
          };
        }
      }
    } while (this.hasAnyCompleteRowAtStart());
  }

  hasAnyCompleteRowAtStart() {
    for (let r = 0; r < this.size; r++) {
      const row = this.board[r];
      const firstType = row[0] ? row[0].type : null;
      if (firstType && row.every(cell => cell && cell.type === firstType)) {
        return true; // Si alguna fila sale completa por casualidad, re-barajar
      }
    }
    return false;
  }

  isRowCompleted(rowIndex) {
    return this.completedRows.has(rowIndex);
  }

  swapPieces(fromRow, fromCol, toRow, toCol) {
    if (fromRow === toRow && fromCol === toCol) return false;

    if (this.isRowCompleted(fromRow) || this.isRowCompleted(toRow)) {
      return false;
    }

    const temp = this.board[fromRow][fromCol];
    this.board[fromRow][fromCol] = this.board[toRow][toCol];
    this.board[toRow][toCol] = temp;

    this.movesCount++;
    const pointsEarned = this.checkCompletedRows(true);

    if (this.isMultiplayer) {
      if (pointsEarned > 0) {
        this.players[this.currentPlayerIndex].score += pointsEarned;
      }
      this.nextTurn();
    }

    return true;
  }

  checkCompletedRows(addPoints = true) {
    let newPoints = 0;
    for (let r = 0; r < this.size; r++) {
      const row = this.board[r];
      const firstType = row[0] ? row[0].type : null;

      if (firstType && row.every(cell => cell && cell.type === firstType)) {
        if (!this.completedRows.has(r)) {
          this.completedRows.add(r);
          if (addPoints) newPoints += 1;
        }
      }
    }
    return newPoints;
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  isGameComplete() {
    return this.completedRows.size === this.size;
  }
}

/* ==========================================================================
   VISTA (View)
   ========================================================================== */
class BoardView {
  constructor() {
    this.boardElem = document.getElementById('board');
    this.scoreSection = document.getElementById('scoreSection');
    this.playersListElem = document.getElementById('playersList');
    this.turnBannerElem = document.getElementById('turnBanner');
    this.turnTextElem = document.getElementById('turnText');
    this.turnDotElem = document.getElementById('turnDot');
    
    this.helpModal = document.getElementById('helpModal');
    this.winModal = document.getElementById('winModal');
    this.winMessage = document.getElementById('winMessage');

    this.playerColors = ['var(--p1-color)', 'var(--p2-color)', 'var(--p3-color)', 'var(--p4-color)'];
  }

  renderPlayers(numPlayers, scores, currentPlayer) {
    if (numPlayers > 1) {
      this.scoreSection.style.display = 'flex';
      this.turnBannerElem.style.display = 'flex';
      this.turnTextElem.textContent = `Turno de Jugador ${currentPlayer + 1}`;
      this.turnDotElem.style.backgroundColor = this.playerColors[currentPlayer] || 'var(--primary-color)';

      this.playersListElem.innerHTML = '';
      for (let i = 0; i < numPlayers; i++) {
        const card = document.createElement('div');
        card.className = `player-card ${i === currentPlayer ? 'active' : ''}`;
        card.setAttribute('data-player', i + 1);
        card.innerHTML = `
          <span class="player-name">Jugador ${i + 1}</span>
          <span class="player-score">${scores[i]} pts</span>
        `;
        this.playersListElem.appendChild(card);
      }
    } else {
      this.scoreSection.style.display = 'none';
      this.turnBannerElem.style.display = 'none';
    }
  }

  renderBoard(grid, size, model) {
    this.boardElem.innerHTML = '';
    this.boardElem.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    this.boardElem.style.gridTemplateRows = `repeat(${size}, 1fr)`;

    if (size > 6) {
      const scaledSize = Math.max(28, Math.floor(350 / size));
      document.documentElement.style.setProperty('--piece-size', `${scaledSize}px`);
    } else {
      const defaultSizes = { small: '40px', medium: '56px', large: '72px' };
      const pieceSizeSelect = document.getElementById('pieceSize').value;
      document.documentElement.style.setProperty('--piece-size', defaultSizes[pieceSizeSelect] || '56px');
    }

    for (let r = 0; r < size; r++) {
      const isRowLocked = model ? model.isRowCompleted(r) : false;

      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = `cell ${isRowLocked ? 'row-completed' : ''}`;
        cell.setAttribute('data-row', r);
        cell.setAttribute('data-col', c);

        const pieceType = grid[r][c];
        const piece = document.createElement('div');
        piece.className = 'piece';
        
        piece.setAttribute('draggable', isRowLocked ? 'false' : 'true');
        piece.setAttribute('data-type', pieceType);
        piece.setAttribute('data-row', r);
        piece.setAttribute('data-col', c);

        if (parseInt(pieceType) === 3) {
          piece.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,10 90,90 10,90" />
          </svg>`;
        }

        cell.appendChild(piece);
        this.boardElem.appendChild(cell);
      }
    }
  }

  setPieceSize(sizeCategory) {
    this.boardElem.setAttribute('data-piece-size', sizeCategory);
  }

  setPieceTheme(themeName) {
    this.boardElem.setAttribute('data-theme', themeName);
  }

  toggleModal(modal, show) {
    if (show) modal.classList.add('active');
    else modal.classList.remove('active');
  }

  showWinModal(scores, numPlayers) {
    if (numPlayers === 1) {
      this.winMessage.textContent = '¡Felicidades! Has logrado completar y bloquear todas las filas del tablero.';
    } else {
      let maxScore = -1;
      let winner = null;
      let draw = false;

      scores.forEach((score, idx) => {
        if (score > maxScore) {
          maxScore = score;
          winner = idx + 1;
          draw = false;
        } else if (score === maxScore) {
          draw = true;
        }
      });

      if (draw) {
        this.winMessage.textContent = `¡Empate! Varios jugadores alcanzaron ${maxScore} puntos.`;
      } else {
        this.winMessage.textContent = `¡El Jugador ${winner} gana la partida con ${maxScore} fila(s) completada(s)!`;
      }
    }
    this.toggleModal(this.winModal, true);
  }
}

/* ==========================================================================
   CONTROLADOR (Controller)
   ========================================================================== */
class BoardController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.draggedSource = null;

    this.init();
  }

  init() {
    this.updateView();
    this.bindEvents();
  }

  updateView() {
    this.view.renderBoard(this.model.grid, this.model.size, this.model);
    this.view.renderPlayers(this.model.numPlayers, this.model.scores, this.model.currentPlayer);
  }

  bindEvents() {
    const boardSizeInput = document.getElementById('boardSizeInput');
    const btnApplySize = document.getElementById('btnApplySize');

    const applyCustomSize = () => {
      let val = parseInt(boardSizeInput.value);
      if (isNaN(val) || val < 2) val = 2;
      if (val > 15) val = 15;
      boardSizeInput.value = val;
      this.model.size = val;
      this.resetGame();
    };

    btnApplySize.addEventListener('click', applyCustomSize);

    boardSizeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        applyCustomSize();
      }
    });

    document.getElementById('gameMode').addEventListener('change', (e) => {
      this.model.numPlayers = parseInt(e.target.value);
      this.resetGame();
    });

    document.getElementById('pieceSize').addEventListener('change', (e) => {
      this.view.setPieceSize(e.target.value);
      this.updateView();
    });

    document.getElementById('pieceTheme').addEventListener('change', (e) => {
      this.view.setPieceTheme(e.target.value);
    });

    // Control de Modo Claro y Oscuro
    document.getElementById('colorModeSelect').addEventListener('change', (e) => {
      document.body.setAttribute('data-theme-mode', e.target.value);
    });

    document.getElementById('btnNewGame').addEventListener('click', () => {
      this.resetGame();
    });

    document.getElementById('btnHelp').addEventListener('click', () => {
      this.view.toggleModal(this.view.helpModal, true);
    });

    document.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.view.toggleModal(this.view.helpModal, false);
        this.view.toggleModal(this.view.winModal, false);
      });
    });

    const board = document.getElementById('board');

    board.addEventListener('dragstart', (e) => {
      const piece = e.target.closest('.piece');
      if (!piece) return;

      const r = parseInt(piece.getAttribute('data-row'));
      const c = parseInt(piece.getAttribute('data-col'));

      if (this.model.isRowCompleted(r)) {
        e.preventDefault();
        return;
      }

      this.draggedSource = { r, c };
      e.dataTransfer.setData('text/plain', JSON.stringify(this.draggedSource));
      e.dataTransfer.effectAllowed = 'move';
      piece.classList.add('dragging');
    });

    board.addEventListener('dragend', (e) => {
      const piece = e.target.closest('.piece');
      if (piece) piece.classList.remove('dragging');
    });

    board.addEventListener('dragover', (e) => {
      e.preventDefault();
      const cell = e.target.closest('.cell');
      if (!cell) return;

      const r = parseInt(cell.getAttribute('data-row'));
      if (this.model.isRowCompleted(r)) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }

      e.dataTransfer.dropEffect = 'move';
      cell.classList.add('drag-over');
    });

    board.addEventListener('dragleave', (e) => {
      const cell = e.target.closest('.cell');
      if (cell) cell.classList.remove('drag-over');
    });

    board.addEventListener('drop', (e) => {
      e.preventDefault();
      const cell = e.target.closest('.cell');
      if (!cell) return;

      cell.classList.remove('drag-over');

      const targetR = parseInt(cell.getAttribute('data-row'));
      const targetC = parseInt(cell.getAttribute('data-col'));

      if (this.model.isRowCompleted(targetR)) {
        this.draggedSource = null;
        return;
      }

      if (this.draggedSource) {
        const { r: srcR, c: srcC } = this.draggedSource;

        if (srcR !== targetR || srcC !== targetC) {
          const swapped = this.model.swapPieces(srcR, srcC, targetR, targetC);
          if (swapped) {
            this.updateView();

            if (this.model.isGameComplete()) {
              setTimeout(() => this.view.showWinModal(this.model.scores, this.model.numPlayers), 150);
            }
          }
        }
      }
      this.draggedSource = null;
    });
  }

  resetGame() {
    this.model.initBoard();
    this.updateView();
  }
}

// Inicializar aplicación al cargar DOM
document.addEventListener('DOMContentLoaded', () => {
  const model = new BoardModel(3, 1);
  const view = new BoardView();
  new BoardController(model, view);
});