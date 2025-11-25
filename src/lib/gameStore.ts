// Game state management using localStorage for persistence

export interface GameState {
  calledNumbers: number[];
  currentNumber: number | null;
  gameId: string;
  startedAt: string;
}

export interface GameHistory {
  games: GameState[];
}

const STORAGE_KEY = 'bingo_game_state';
const HISTORY_KEY = 'bingo_game_history';
const MAX_HISTORY = 3;

// Get letter for a bingo number
export function getBingoLetter(num: number): string {
  if (num >= 1 && num <= 15) return 'B';
  if (num >= 16 && num <= 30) return 'I';
  if (num >= 31 && num <= 45) return 'N';
  if (num >= 46 && num <= 60) return 'G';
  if (num >= 61 && num <= 75) return 'O';
  return '';
}

// Get color class for a bingo letter
export function getLetterColor(letter: string): string {
  const colors: Record<string, string> = {
    B: 'from-red-500 to-red-600',
    I: 'from-orange-500 to-orange-600',
    N: 'from-green-500 to-green-600',
    G: 'from-blue-500 to-blue-600',
    O: 'from-purple-500 to-purple-600',
  };
  return colors[letter] || 'from-gray-500 to-gray-600';
}

// Generate unique game ID
function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create new game state
export function createNewGame(): GameState {
  return {
    calledNumbers: [],
    currentNumber: null,
    gameId: generateGameId(),
    startedAt: new Date().toISOString(),
  };
}

// Load game state from localStorage
export function loadGameState(): GameState {
  if (typeof window === 'undefined') return createNewGame();

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return createNewGame();
    }
  }
  return createNewGame();
}

// Save game state to localStorage
export function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Load game history
export function loadGameHistory(): GameHistory {
  if (typeof window === 'undefined') return { games: [] };

  const saved = localStorage.getItem(HISTORY_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return { games: [] };
    }
  }
  return { games: [] };
}

// Save current game to history and start new game
export function saveGameToHistory(currentGame: GameState): GameState {
  if (typeof window === 'undefined') return createNewGame();

  const history = loadGameHistory();

  // Only save if there were numbers called
  if (currentGame.calledNumbers.length > 0) {
    history.games.unshift(currentGame);
    // Keep only last 3 games
    history.games = history.games.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  const newGame = createNewGame();
  saveGameState(newGame);
  return newGame;
}

// Restore a game from history
export function restoreGameFromHistory(gameId: string): GameState | null {
  const history = loadGameHistory();
  const game = history.games.find(g => g.gameId === gameId);
  if (game) {
    saveGameState(game);
    return game;
  }
  return null;
}

// Draw a random number that hasn't been called
export function drawNumber(state: GameState): GameState {
  const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  const available = allNumbers.filter(n => !state.calledNumbers.includes(n));

  if (available.length === 0) {
    return state; // All numbers called
  }

  const randomIndex = Math.floor(Math.random() * available.length);
  const drawnNumber = available[randomIndex];

  const newState: GameState = {
    ...state,
    currentNumber: drawnNumber,
    calledNumbers: [...state.calledNumbers, drawnNumber],
  };

  saveGameState(newState);
  return newState;
}

// Undo last drawn number
export function undoLastNumber(state: GameState): GameState {
  if (state.calledNumbers.length === 0) {
    return state;
  }

  const newCalledNumbers = state.calledNumbers.slice(0, -1);
  const newCurrentNumber = newCalledNumbers.length > 0
    ? newCalledNumbers[newCalledNumbers.length - 1]
    : null;

  const newState: GameState = {
    ...state,
    calledNumbers: newCalledNumbers,
    currentNumber: newCurrentNumber,
  };

  saveGameState(newState);
  return newState;
}

// Generate a random bingo card
export function generateBingoCard(): number[][] {
  const card: number[][] = [];

  // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
  const ranges = [
    { min: 1, max: 15 },
    { min: 16, max: 30 },
    { min: 31, max: 45 },
    { min: 46, max: 60 },
    { min: 61, max: 75 },
  ];

  for (let col = 0; col < 5; col++) {
    const { min, max } = ranges[col];
    const available = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    const column: number[] = [];

    for (let row = 0; row < 5; row++) {
      // Center is FREE space
      if (col === 2 && row === 2) {
        column.push(0); // 0 represents FREE
      } else {
        const randomIndex = Math.floor(Math.random() * available.length);
        column.push(available.splice(randomIndex, 1)[0]);
      }
    }
    card.push(column);
  }

  return card;
}

// Player card state
export interface PlayerCardState {
  card: number[][];
  markedCells: boolean[][];
  cardId: string;
}

const PLAYER_CARD_KEY = 'bingo_player_card';

export function loadPlayerCard(): PlayerCardState {
  if (typeof window === 'undefined') {
    return createNewPlayerCard();
  }

  const saved = localStorage.getItem(PLAYER_CARD_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return createNewPlayerCard();
    }
  }
  return createNewPlayerCard();
}

export function createNewPlayerCard(): PlayerCardState {
  const card = generateBingoCard();
  const markedCells = Array(5).fill(null).map((_, col) =>
    Array(5).fill(null).map((_, row) => col === 2 && row === 2) // FREE space is pre-marked
  );

  return {
    card,
    markedCells,
    cardId: `card_${Date.now()}`,
  };
}

export function savePlayerCard(state: PlayerCardState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLAYER_CARD_KEY, JSON.stringify(state));
}

export function toggleCellMark(state: PlayerCardState, col: number, row: number): PlayerCardState {
  // Can't unmark FREE space
  if (col === 2 && row === 2) return state;

  const newMarkedCells = state.markedCells.map((column, c) =>
    column.map((marked, r) => (c === col && r === row ? !marked : marked))
  );

  const newState = {
    ...state,
    markedCells: newMarkedCells,
  };

  savePlayerCard(newState);
  return newState;
}

// Bingo detection types
export type BingoPattern = 'row' | 'column' | 'diagonal' | 'corners' | 'full';

export interface BingoResult {
  hasBingo: boolean;
  patterns: BingoPattern[];
  winningCells: { col: number; row: number }[];
}

// Check if player has a bingo based on called numbers
export function checkBingo(cardState: PlayerCardState, calledNumbers: number[]): BingoResult {
  const { card, markedCells } = cardState;
  const patterns: BingoPattern[] = [];
  const winningCells: { col: number; row: number }[] = [];

  // Helper: Check if a cell is validly marked (number was called OR it's FREE space)
  const isValidMark = (col: number, row: number): boolean => {
    if (col === 2 && row === 2) return true; // FREE space
    const num = card[col][row];
    return markedCells[col][row] && calledNumbers.includes(num);
  };

  // Check rows (5 rows)
  for (let row = 0; row < 5; row++) {
    let rowComplete = true;
    const rowCells: { col: number; row: number }[] = [];
    for (let col = 0; col < 5; col++) {
      if (isValidMark(col, row)) {
        rowCells.push({ col, row });
      } else {
        rowComplete = false;
        break;
      }
    }
    if (rowComplete) {
      patterns.push('row');
      winningCells.push(...rowCells);
    }
  }

  // Check columns (5 columns)
  for (let col = 0; col < 5; col++) {
    let colComplete = true;
    const colCells: { col: number; row: number }[] = [];
    for (let row = 0; row < 5; row++) {
      if (isValidMark(col, row)) {
        colCells.push({ col, row });
      } else {
        colComplete = false;
        break;
      }
    }
    if (colComplete) {
      patterns.push('column');
      winningCells.push(...colCells);
    }
  }

  // Check diagonal (top-left to bottom-right)
  let diag1Complete = true;
  const diag1Cells: { col: number; row: number }[] = [];
  for (let i = 0; i < 5; i++) {
    if (isValidMark(i, i)) {
      diag1Cells.push({ col: i, row: i });
    } else {
      diag1Complete = false;
      break;
    }
  }
  if (diag1Complete) {
    patterns.push('diagonal');
    winningCells.push(...diag1Cells);
  }

  // Check diagonal (top-right to bottom-left)
  let diag2Complete = true;
  const diag2Cells: { col: number; row: number }[] = [];
  for (let i = 0; i < 5; i++) {
    if (isValidMark(4 - i, i)) {
      diag2Cells.push({ col: 4 - i, row: i });
    } else {
      diag2Complete = false;
      break;
    }
  }
  if (diag2Complete) {
    patterns.push('diagonal');
    winningCells.push(...diag2Cells);
  }

  // Check four corners
  const corners = [
    { col: 0, row: 0 },
    { col: 4, row: 0 },
    { col: 0, row: 4 },
    { col: 4, row: 4 },
  ];
  const allCornersMarked = corners.every(c => isValidMark(c.col, c.row));
  if (allCornersMarked) {
    patterns.push('corners');
    winningCells.push(...corners);
  }

  // Check full card (blackout)
  let fullCard = true;
  const allCells: { col: number; row: number }[] = [];
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 5; row++) {
      if (isValidMark(col, row)) {
        allCells.push({ col, row });
      } else {
        fullCard = false;
      }
    }
  }
  if (fullCard) {
    patterns.push('full');
    winningCells.length = 0; // Clear and add all
    winningCells.push(...allCells);
  }

  // Remove duplicate cells
  const uniqueCells = winningCells.filter((cell, index, self) =>
    index === self.findIndex(c => c.col === cell.col && c.row === cell.row)
  );

  return {
    hasBingo: patterns.length > 0,
    patterns: [...new Set(patterns)],
    winningCells: uniqueCells,
  };
}

// Admin session management
const ADMIN_SESSION_KEY = 'bingo_admin_session';
const ADMIN_HEARTBEAT_KEY = 'bingo_admin_heartbeat';
const SESSION_TIMEOUT = 10000; // 10 seconds without heartbeat = session expired

// Admin password for takeover - change this to your desired password
const ADMIN_TAKEOVER_PASSWORD = 'bingo2025';

export interface AdminSession {
  sessionId: string;
  startedAt: string;
  lastHeartbeat: number;
}

// Verify admin takeover password
export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_TAKEOVER_PASSWORD;
}

// Generate unique session ID
function generateSessionId(): string {
  return `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Check if there's an active admin session
export function getActiveAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;

  const saved = localStorage.getItem(ADMIN_SESSION_KEY);
  if (!saved) return null;

  try {
    const session: AdminSession = JSON.parse(saved);
    const now = Date.now();

    // Check if session is still active (heartbeat within timeout)
    if (now - session.lastHeartbeat > SESSION_TIMEOUT) {
      // Session expired, clear it
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

// Try to acquire admin session
export function acquireAdminSession(): { success: boolean; session?: AdminSession; existingSession?: AdminSession } {
  if (typeof window === 'undefined') return { success: false };

  const existingSession = getActiveAdminSession();
  const currentSessionId = sessionStorage.getItem(ADMIN_HEARTBEAT_KEY);

  // If there's an existing active session that's not ours
  if (existingSession && existingSession.sessionId !== currentSessionId) {
    return { success: false, existingSession };
  }

  // Create or refresh our session
  const session: AdminSession = {
    sessionId: currentSessionId || generateSessionId(),
    startedAt: existingSession?.startedAt || new Date().toISOString(),
    lastHeartbeat: Date.now(),
  };

  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  sessionStorage.setItem(ADMIN_HEARTBEAT_KEY, session.sessionId);

  return { success: true, session };
}

// Update heartbeat for current admin session
export function updateAdminHeartbeat(): boolean {
  if (typeof window === 'undefined') return false;

  const currentSessionId = sessionStorage.getItem(ADMIN_HEARTBEAT_KEY);
  if (!currentSessionId) return false;

  const existingSession = getActiveAdminSession();

  // Only update if we own the session
  if (existingSession && existingSession.sessionId === currentSessionId) {
    existingSession.lastHeartbeat = Date.now();
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(existingSession));
    return true;
  }

  return false;
}

// Release admin session
export function releaseAdminSession(): void {
  if (typeof window === 'undefined') return;

  const currentSessionId = sessionStorage.getItem(ADMIN_HEARTBEAT_KEY);
  const existingSession = getActiveAdminSession();

  // Only release if we own the session
  if (existingSession && existingSession.sessionId === currentSessionId) {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }
  sessionStorage.removeItem(ADMIN_HEARTBEAT_KEY);
}

// Find player card by partial ID (last 8 characters)
export function findPlayerCardById(partialId: string): PlayerCardState | null {
  if (typeof window === 'undefined') return null;

  const playerCard = loadPlayerCard();
  // Check if the card ID ends with the provided partial ID
  if (playerCard.cardId.endsWith(partialId) || playerCard.cardId === partialId) {
    return playerCard;
  }
  return null;
}

// Verify a player's bingo claim by card ID
export interface VerificationResult {
  found: boolean;
  cardState?: PlayerCardState;
  bingoResult?: BingoResult;
  cardNumbers?: number[][];
}

export function verifyPlayerBingo(partialCardId: string, calledNumbers: number[]): VerificationResult {
  const cardState = findPlayerCardById(partialCardId);

  if (!cardState) {
    return { found: false };
  }

  const bingoResult = checkBingo(cardState, calledNumbers);

  return {
    found: true,
    cardState,
    bingoResult,
    cardNumbers: cardState.card,
  };
}

// Force take over admin session (with confirmation)
export function forceAcquireAdminSession(): AdminSession {
  if (typeof window === 'undefined') {
    return { sessionId: '', startedAt: '', lastHeartbeat: 0 };
  }

  const session: AdminSession = {
    sessionId: generateSessionId(),
    startedAt: new Date().toISOString(),
    lastHeartbeat: Date.now(),
  };

  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  sessionStorage.setItem(ADMIN_HEARTBEAT_KEY, session.sessionId);

  return session;
}
