// Supabase-based game store with real-time sync
import { supabase, isSupabaseConfigured } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Database row types (matches supabase-schema.sql)
interface DbGame {
  id: string;
  called_numbers: number[];
  current_number: number | null;
  started_at: string;
  is_active: boolean;
  is_paused?: boolean;
  auto_call_enabled?: boolean;
  auto_call_interval?: number;
  winner_card_id?: string | null;
  winner_name?: string | null;
  created_at: string;
  updated_at: string;
}

interface DbPlayerCard {
  id: string;
  card_numbers: number[][];
  marked_cells: boolean[][];
  game_id: string | null;
  player_name?: string | null;
  theme_id?: string | null;
  last_active?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Types
// ============================================

export interface GameState {
  calledNumbers: number[];
  currentNumber: number | null;
  gameId: string;
  startedAt: string;
  isPaused: boolean;
  autoCallEnabled: boolean;
  autoCallInterval: number;
  winnerCardId: string | null;
  winnerName: string | null;
}

export interface GameHistory {
  games: GameState[];
}

export interface PlayerCardState {
  card: number[][];
  markedCells: boolean[][];
  cardId: string;
  playerName: string | null;
  themeId: string;
}

export type BingoPattern = 'row' | 'column' | 'diagonal' | 'corners' | 'full';

export interface BingoResult {
  hasBingo: boolean;
  patterns: BingoPattern[];
  winningCells: { col: number; row: number }[];
}

export interface VerificationResult {
  found: boolean;
  cardState?: PlayerCardState;
  bingoResult?: BingoResult;
  cardNumbers?: number[][];
  playerName?: string | null;
}

export interface AdminSession {
  sessionId: string;
  startedAt: string;
  lastHeartbeat: number;
}

// ============================================
// Helper Functions (same as before)
// ============================================

export function getBingoLetter(num: number): string {
  if (num >= 1 && num <= 15) return 'B';
  if (num >= 16 && num <= 30) return 'I';
  if (num >= 31 && num <= 45) return 'N';
  if (num >= 46 && num <= 60) return 'G';
  if (num >= 61 && num <= 75) return 'O';
  return '';
}

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

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateBingoCard(): number[][] {
  const card: number[][] = [];
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
      if (col === 2 && row === 2) {
        column.push(0);
      } else {
        const randomIndex = Math.floor(Math.random() * available.length);
        column.push(available.splice(randomIndex, 1)[0]);
      }
    }
    card.push(column);
  }

  return card;
}

// ============================================
// Game State Functions
// ============================================

// Get or create active game
export async function getActiveGame(): Promise<GameState> {
  if (!isSupabaseConfigured()) {
    // Fallback to localStorage
    return loadGameStateLocal();
  }

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // Create new game
    return createNewGame();
  }

  return dbGameToState(data);
}

export async function createNewGame(): Promise<GameState> {
  const gameId = generateId('game');
  const startedAt = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const state: GameState = {
      gameId,
      startedAt,
      calledNumbers: [],
      currentNumber: null,
      isPaused: false,
      autoCallEnabled: false,
      autoCallInterval: 5,
      winnerCardId: null,
      winnerName: null,
    };
    saveGameStateLocal(state);
    return state;
  }

  // Deactivate any existing active games
  await supabase
    .from('games')
    .update({ is_active: false })
    .eq('is_active', true);

  const { data, error } = await supabase
    .from('games')
    .insert({
      id: gameId,
      called_numbers: [],
      current_number: null,
      started_at: startedAt,
      is_active: true,
      is_paused: false,
      auto_call_enabled: false,
      auto_call_interval: 5,
      winner_card_id: null,
      winner_name: null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating game:', error);
    return {
      gameId,
      startedAt,
      calledNumbers: [],
      currentNumber: null,
      isPaused: false,
      autoCallEnabled: false,
      autoCallInterval: 5,
      winnerCardId: null,
      winnerName: null,
    };
  }

  return dbGameToState(data);
}

export async function drawNumber(state: GameState): Promise<GameState> {
  const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
  const available = allNumbers.filter(n => !state.calledNumbers.includes(n));

  if (available.length === 0) {
    return state;
  }

  const randomIndex = Math.floor(Math.random() * available.length);
  const drawnNumber = available[randomIndex];

  const newState: GameState = {
    ...state,
    currentNumber: drawnNumber,
    calledNumbers: [...state.calledNumbers, drawnNumber],
  };

  if (!isSupabaseConfigured()) {
    saveGameStateLocal(newState);
    return newState;
  }

  await supabase
    .from('games')
    .update({
      called_numbers: newState.calledNumbers,
      current_number: drawnNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.gameId);

  return newState;
}

export async function undoLastNumber(state: GameState): Promise<GameState> {
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

  if (!isSupabaseConfigured()) {
    saveGameStateLocal(newState);
    return newState;
  }

  await supabase
    .from('games')
    .update({
      called_numbers: newCalledNumbers,
      current_number: newCurrentNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.gameId);

  return newState;
}

export async function saveGameToHistory(currentGame: GameState): Promise<GameState> {
  if (!isSupabaseConfigured()) {
    return saveGameToHistoryLocal(currentGame);
  }

  // Mark current game as inactive
  if (currentGame.calledNumbers.length > 0) {
    await supabase
      .from('games')
      .update({ is_active: false })
      .eq('id', currentGame.gameId);
  }

  // Create new active game
  return createNewGame();
}

export async function loadGameHistory(): Promise<GameHistory> {
  if (!isSupabaseConfigured()) {
    return loadGameHistoryLocal();
  }

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('is_active', false)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error || !data) {
    return { games: [] };
  }

  return {
    games: data.map(dbGameToState),
  };
}

export async function restoreGameFromHistory(gameId: string): Promise<GameState | null> {
  if (!isSupabaseConfigured()) {
    return restoreGameFromHistoryLocal(gameId);
  }

  // Deactivate current active game
  await supabase
    .from('games')
    .update({ is_active: false })
    .eq('is_active', true);

  // Activate the selected game
  const { data, error } = await supabase
    .from('games')
    .update({ is_active: true })
    .eq('id', gameId)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return dbGameToState(data);
}

// ============================================
// Pause/Resume & Auto-Call Functions
// ============================================

export async function togglePause(state: GameState): Promise<GameState> {
  const newState: GameState = {
    ...state,
    isPaused: !state.isPaused,
  };

  if (!isSupabaseConfigured()) {
    saveGameStateLocal(newState);
    return newState;
  }

  await supabase
    .from('games')
    .update({
      is_paused: newState.isPaused,
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.gameId);

  return newState;
}

export async function setAutoCall(state: GameState, enabled: boolean, interval: number = 5): Promise<GameState> {
  const newState: GameState = {
    ...state,
    autoCallEnabled: enabled,
    autoCallInterval: interval,
  };

  if (!isSupabaseConfigured()) {
    saveGameStateLocal(newState);
    return newState;
  }

  await supabase
    .from('games')
    .update({
      auto_call_enabled: enabled,
      auto_call_interval: interval,
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.gameId);

  return newState;
}

export async function setWinner(state: GameState, cardId: string, playerName: string | null): Promise<GameState> {
  const newState: GameState = {
    ...state,
    winnerCardId: cardId,
    winnerName: playerName,
  };

  if (!isSupabaseConfigured()) {
    saveGameStateLocal(newState);
    return newState;
  }

  await supabase
    .from('games')
    .update({
      winner_card_id: cardId,
      winner_name: playerName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.gameId);

  return newState;
}

export async function clearWinner(state: GameState): Promise<GameState> {
  const newState: GameState = {
    ...state,
    winnerCardId: null,
    winnerName: null,
  };

  if (!isSupabaseConfigured()) {
    saveGameStateLocal(newState);
    return newState;
  }

  await supabase
    .from('games')
    .update({
      winner_card_id: null,
      winner_name: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.gameId);

  return newState;
}

// ============================================
// Player Count Functions
// ============================================

export async function getActivePlayerCount(): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  // Count players active in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('player_cards')
    .select('*', { count: 'exact', head: true })
    .gt('last_active', fiveMinutesAgo);

  if (error) {
    console.error('Error getting player count:', error);
    return 0;
  }

  return count || 0;
}

export async function updatePlayerActivity(cardId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await supabase
    .from('player_cards')
    .update({ last_active: new Date().toISOString() })
    .eq('id', cardId);
}

// ============================================
// Player Card Functions
// ============================================

export async function createPlayerCard(playerName?: string, themeId: string = 'default'): Promise<PlayerCardState> {
  const card = generateBingoCard();
  const markedCells = Array(5).fill(null).map((_, col) =>
    Array(5).fill(null).map((_, row) => col === 2 && row === 2)
  );
  const cardId = generateId('card');

  const state: PlayerCardState = {
    card,
    markedCells,
    cardId,
    playerName: playerName || null,
    themeId,
  };

  if (!isSupabaseConfigured()) {
    savePlayerCardLocal(state);
    return state;
  }

  await supabase.from('player_cards').insert({
    id: cardId,
    card_numbers: card,
    marked_cells: markedCells,
    player_name: playerName || null,
    theme_id: themeId,
    last_active: new Date().toISOString(),
  });

  // Also save to localStorage for quick access
  savePlayerCardLocal(state);

  return state;
}

export async function getPlayerCard(cardId?: string): Promise<PlayerCardState | null> {
  // First try localStorage
  const localCard = loadPlayerCardLocal();

  if (!cardId && localCard) {
    return localCard;
  }

  if (!isSupabaseConfigured()) {
    return localCard;
  }

  if (cardId) {
    // Search by partial ID (last 8 chars) or full ID
    const { data } = await supabase
      .from('player_cards')
      .select('*')
      .or(`id.eq.${cardId},id.ilike.%${cardId}`)
      .limit(1)
      .single();

    if (data) {
      return dbCardToState(data);
    }
  }

  return localCard;
}

export function updatePlayerCardMarks(
  cardState: PlayerCardState,
  col: number,
  row: number
): PlayerCardState {
  if (col === 2 && row === 2) return cardState;

  const newMarkedCells = cardState.markedCells.map((column, c) =>
    column.map((marked, r) => (c === col && r === row ? !marked : marked))
  );

  const newState: PlayerCardState = {
    ...cardState,
    markedCells: newMarkedCells,
  };

  // Save to localStorage immediately (synchronous)
  savePlayerCardLocal(newState);

  // Fire-and-forget Supabase update for instant UI response
  if (isSupabaseConfigured()) {
    supabase
      .from('player_cards')
      .update({
        marked_cells: newMarkedCells,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardState.cardId)
      .then(({ error }) => {
        if (error) console.error('Error syncing marks:', error);
      });
  }

  return newState;
}

export async function updatePlayerInfo(
  cardState: PlayerCardState,
  playerName: string | null,
  themeId: string
): Promise<PlayerCardState> {
  const newState: PlayerCardState = {
    ...cardState,
    playerName,
    themeId,
  };

  savePlayerCardLocal(newState);

  if (isSupabaseConfigured()) {
    await supabase
      .from('player_cards')
      .update({
        player_name: playerName,
        theme_id: themeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardState.cardId);
  }

  return newState;
}

export async function verifyPlayerBingo(
  partialCardId: string,
  calledNumbers: number[]
): Promise<VerificationResult> {
  let cardState: PlayerCardState | null = null;

  // First check local storage
  const localCard = loadPlayerCardLocal();
  if (localCard && (localCard.cardId.endsWith(partialCardId) || localCard.cardId === partialCardId)) {
    cardState = localCard;
  }

  // If not found locally and Supabase is configured, search database
  if (!cardState && isSupabaseConfigured()) {
    const { data } = await supabase
      .from('player_cards')
      .select('*')
      .or(`id.eq.${partialCardId},id.ilike.%${partialCardId}`)
      .limit(1)
      .single();

    if (data) {
      cardState = dbCardToState(data);
    }
  }

  if (!cardState) {
    return { found: false };
  }

  const bingoResult = checkBingo(cardState, calledNumbers);

  return {
    found: true,
    cardState,
    bingoResult,
    cardNumbers: cardState.card,
    playerName: cardState.playerName,
  };
}

// ============================================
// Bingo Detection
// ============================================

export function checkBingo(cardState: PlayerCardState, calledNumbers: number[]): BingoResult {
  const { card, markedCells } = cardState;
  const patterns: BingoPattern[] = [];
  const winningCells: { col: number; row: number }[] = [];

  const isValidMark = (col: number, row: number): boolean => {
    if (col === 2 && row === 2) return true;
    const num = card[col][row];
    return markedCells[col][row] && calledNumbers.includes(num);
  };

  // Check rows
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

  // Check columns
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

  // Check diagonals
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

  // Check corners
  const corners = [
    { col: 0, row: 0 },
    { col: 4, row: 0 },
    { col: 0, row: 4 },
    { col: 4, row: 4 },
  ];
  if (corners.every(c => isValidMark(c.col, c.row))) {
    patterns.push('corners');
    winningCells.push(...corners);
  }

  // Check full card
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
    winningCells.length = 0;
    winningCells.push(...allCells);
  }

  const uniqueCells = winningCells.filter((cell, index, self) =>
    index === self.findIndex(c => c.col === cell.col && c.row === cell.row)
  );

  return {
    hasBingo: patterns.length > 0,
    patterns: [...new Set(patterns)],
    winningCells: uniqueCells,
  };
}

// ============================================
// Real-time Subscriptions
// ============================================

export function subscribeToGame(
  gameId: string,
  onUpdate: (state: GameState) => void
): RealtimeChannel | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const channel = supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        const game = payload.new as DbGame;
        onUpdate(dbGameToState(game));
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToActiveGame(
  onUpdate: (state: GameState) => void
): RealtimeChannel | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const channel = supabase
    .channel('active-game')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: 'is_active=eq.true',
      },
      (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          const game = payload.new as DbGame;
          onUpdate(dbGameToState(game));
        }
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel | null): void {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

// ============================================
// Admin Session Functions
// ============================================

const ADMIN_PASSWORD = 'bingo2025';
const SESSION_TIMEOUT = 10000;

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export async function acquireAdminSession(): Promise<{ success: boolean; session?: AdminSession; existingSession?: AdminSession }> {
  if (typeof window === 'undefined') return { success: false };

  const currentSessionId = sessionStorage.getItem('bingo_admin_session_id');

  if (!isSupabaseConfigured()) {
    // Use localStorage fallback
    return acquireAdminSessionLocal();
  }

  // Check for existing active session
  const { data: existingData } = await supabase
    .from('admin_sessions')
    .select('*')
    .gt('last_heartbeat', new Date(Date.now() - SESSION_TIMEOUT).toISOString())
    .limit(1)
    .single();

  if (existingData && existingData.session_id !== currentSessionId) {
    return {
      success: false,
      existingSession: {
        sessionId: existingData.session_id,
        startedAt: existingData.started_at,
        lastHeartbeat: new Date(existingData.last_heartbeat).getTime(),
      },
    };
  }

  // Create or update session
  const sessionId = currentSessionId || generateId('admin');
  const now = new Date().toISOString();

  await supabase.from('admin_sessions').upsert({
    id: 'current',
    session_id: sessionId,
    started_at: existingData?.started_at || now,
    last_heartbeat: now,
  });

  sessionStorage.setItem('bingo_admin_session_id', sessionId);

  return {
    success: true,
    session: {
      sessionId,
      startedAt: existingData?.started_at || now,
      lastHeartbeat: Date.now(),
    },
  };
}

export async function updateAdminHeartbeat(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const currentSessionId = sessionStorage.getItem('bingo_admin_session_id');
  if (!currentSessionId) return false;

  if (!isSupabaseConfigured()) {
    return updateAdminHeartbeatLocal();
  }

  const { error } = await supabase
    .from('admin_sessions')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('session_id', currentSessionId);

  return !error;
}

export async function releaseAdminSession(): Promise<void> {
  if (typeof window === 'undefined') return;

  const currentSessionId = sessionStorage.getItem('bingo_admin_session_id');

  if (isSupabaseConfigured() && currentSessionId) {
    await supabase
      .from('admin_sessions')
      .delete()
      .eq('session_id', currentSessionId);
  }

  releaseAdminSessionLocal();
}

export async function forceAcquireAdminSession(): Promise<AdminSession> {
  const sessionId = generateId('admin');
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    // Delete all existing sessions
    await supabase.from('admin_sessions').delete().neq('id', 'never-match');

    // Create new session
    await supabase.from('admin_sessions').insert({
      id: 'current',
      session_id: sessionId,
      started_at: now,
      last_heartbeat: now,
    });
  }

  sessionStorage.setItem('bingo_admin_session_id', sessionId);
  forceAcquireAdminSessionLocal();

  return {
    sessionId,
    startedAt: now,
    lastHeartbeat: Date.now(),
  };
}

export async function getActiveAdminSession(): Promise<AdminSession | null> {
  if (!isSupabaseConfigured()) {
    return getActiveAdminSessionLocal();
  }

  const { data } = await supabase
    .from('admin_sessions')
    .select('*')
    .gt('last_heartbeat', new Date(Date.now() - SESSION_TIMEOUT).toISOString())
    .limit(1)
    .single();

  if (!data) return null;

  return {
    sessionId: data.session_id,
    startedAt: data.started_at,
    lastHeartbeat: new Date(data.last_heartbeat).getTime(),
  };
}

// ============================================
// Database to State Converters
// ============================================

function dbGameToState(game: DbGame): GameState {
  return {
    gameId: game.id,
    calledNumbers: game.called_numbers || [],
    currentNumber: game.current_number,
    startedAt: game.started_at,
    isPaused: game.is_paused ?? false,
    autoCallEnabled: game.auto_call_enabled ?? false,
    autoCallInterval: game.auto_call_interval ?? 5,
    winnerCardId: game.winner_card_id ?? null,
    winnerName: game.winner_name ?? null,
  };
}

function dbCardToState(card: DbPlayerCard): PlayerCardState {
  return {
    cardId: card.id,
    card: card.card_numbers,
    markedCells: card.marked_cells,
    playerName: card.player_name ?? null,
    themeId: card.theme_id ?? 'default',
  };
}

// ============================================
// LocalStorage Fallback Functions
// ============================================

const STORAGE_KEY = 'bingo_game_state';
const HISTORY_KEY = 'bingo_game_history';
const PLAYER_CARD_KEY = 'bingo_player_card';
const ADMIN_SESSION_KEY = 'bingo_admin_session';
const MAX_HISTORY = 3;

function loadGameStateLocal(): GameState {
  if (typeof window === 'undefined') {
    return {
      gameId: generateId('game'),
      startedAt: new Date().toISOString(),
      calledNumbers: [],
      currentNumber: null,
      isPaused: false,
      autoCallEnabled: false,
      autoCallInterval: 5,
      winnerCardId: null,
      winnerName: null,
    };
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        isPaused: parsed.isPaused ?? false,
        autoCallEnabled: parsed.autoCallEnabled ?? false,
        autoCallInterval: parsed.autoCallInterval ?? 5,
        winnerCardId: parsed.winnerCardId ?? null,
        winnerName: parsed.winnerName ?? null,
      };
    } catch {
      // Fall through to create new
    }
  }

  const newState: GameState = {
    gameId: generateId('game'),
    startedAt: new Date().toISOString(),
    calledNumbers: [],
    currentNumber: null,
    isPaused: false,
    autoCallEnabled: false,
    autoCallInterval: 5,
    winnerCardId: null,
    winnerName: null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  return newState;
}

function saveGameStateLocal(state: GameState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGameHistoryLocal(): GameHistory {
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

function saveGameToHistoryLocal(currentGame: GameState): GameState {
  if (typeof window === 'undefined') {
    return {
      gameId: generateId('game'),
      startedAt: new Date().toISOString(),
      calledNumbers: [],
      currentNumber: null,
      isPaused: false,
      autoCallEnabled: false,
      autoCallInterval: 5,
      winnerCardId: null,
      winnerName: null,
    };
  }

  const history = loadGameHistoryLocal();

  if (currentGame.calledNumbers.length > 0) {
    history.games.unshift(currentGame);
    history.games = history.games.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  const newGame: GameState = {
    gameId: generateId('game'),
    startedAt: new Date().toISOString(),
    calledNumbers: [],
    currentNumber: null,
    isPaused: false,
    autoCallEnabled: false,
    autoCallInterval: 5,
    winnerCardId: null,
    winnerName: null,
  };
  saveGameStateLocal(newGame);
  return newGame;
}

function restoreGameFromHistoryLocal(gameId: string): GameState | null {
  const history = loadGameHistoryLocal();
  const game = history.games.find(g => g.gameId === gameId);
  if (game) {
    saveGameStateLocal(game);
    return game;
  }
  return null;
}

function loadPlayerCardLocal(): PlayerCardState | null {
  if (typeof window === 'undefined') return null;

  const saved = localStorage.getItem(PLAYER_CARD_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        playerName: parsed.playerName ?? null,
        themeId: parsed.themeId ?? 'default',
      };
    } catch {
      return null;
    }
  }
  return null;
}

function savePlayerCardLocal(state: PlayerCardState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLAYER_CARD_KEY, JSON.stringify(state));
}

function acquireAdminSessionLocal(): { success: boolean; session?: AdminSession; existingSession?: AdminSession } {
  if (typeof window === 'undefined') return { success: false };

  const saved = localStorage.getItem(ADMIN_SESSION_KEY);
  const currentSessionId = sessionStorage.getItem('bingo_admin_session_id');

  if (saved) {
    try {
      const session: AdminSession = JSON.parse(saved);
      if (Date.now() - session.lastHeartbeat < SESSION_TIMEOUT) {
        if (session.sessionId !== currentSessionId) {
          return { success: false, existingSession: session };
        }
      }
    } catch {
      // Continue to create new session
    }
  }

  const sessionId = currentSessionId || generateId('admin');
  const session: AdminSession = {
    sessionId,
    startedAt: new Date().toISOString(),
    lastHeartbeat: Date.now(),
  };

  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  sessionStorage.setItem('bingo_admin_session_id', sessionId);

  return { success: true, session };
}

function updateAdminHeartbeatLocal(): boolean {
  if (typeof window === 'undefined') return false;

  const currentSessionId = sessionStorage.getItem('bingo_admin_session_id');
  if (!currentSessionId) return false;

  const saved = localStorage.getItem(ADMIN_SESSION_KEY);
  if (saved) {
    try {
      const session: AdminSession = JSON.parse(saved);
      if (session.sessionId === currentSessionId) {
        session.lastHeartbeat = Date.now();
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

function releaseAdminSessionLocal(): void {
  if (typeof window === 'undefined') return;

  const currentSessionId = sessionStorage.getItem('bingo_admin_session_id');
  const saved = localStorage.getItem(ADMIN_SESSION_KEY);

  if (saved && currentSessionId) {
    try {
      const session: AdminSession = JSON.parse(saved);
      if (session.sessionId === currentSessionId) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
    } catch {
      // Ignore
    }
  }
  sessionStorage.removeItem('bingo_admin_session_id');
}

function forceAcquireAdminSessionLocal(): AdminSession {
  const sessionId = generateId('admin');
  const session: AdminSession = {
    sessionId,
    startedAt: new Date().toISOString(),
    lastHeartbeat: Date.now(),
  };

  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  sessionStorage.setItem('bingo_admin_session_id', sessionId);

  return session;
}

function getActiveAdminSessionLocal(): AdminSession | null {
  if (typeof window === 'undefined') return null;

  const saved = localStorage.getItem(ADMIN_SESSION_KEY);
  if (!saved) return null;

  try {
    const session: AdminSession = JSON.parse(saved);
    if (Date.now() - session.lastHeartbeat > SESSION_TIMEOUT) {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}
