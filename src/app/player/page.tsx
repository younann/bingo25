"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PlayerCardState,
  GameState,
  BingoResult,
  getPlayerCard,
  getActiveGame,
  createPlayerCard,
  updatePlayerCardMarks,
  updatePlayerInfo,
  updatePlayerActivity,
  checkBingo,
  getBingoLetter,
  getLetterColor,
  subscribeToActiveGame,
  unsubscribe,
} from "@/lib/supabase/gameStore";
import { themes, themeList, getTheme, CardTheme } from "@/lib/themes";
import { RealtimeChannel } from "@supabase/supabase-js";
import Footer from "../components/Footer";

export default function PlayerCard() {
  const [cardState, setCardState] = useState<PlayerCardState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [bingoResult, setBingoResult] = useState<BingoResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [animatingCell, setAnimatingCell] = useState<string | null>(null);
  const [showBingoModal, setShowBingoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [tempPlayerName, setTempPlayerName] = useState("");
  const [tempTheme, setTempTheme] = useState("default");

  // Load state on mount and poll for game updates
  useEffect(() => {
    setMounted(true);
    let channel: RealtimeChannel | null = null;

    const init = async () => {
      const [card, game] = await Promise.all([
        getPlayerCard(),
        getActiveGame(),
      ]);

      if (card) {
        setCardState(card);
        setPlayerName(card.playerName || "");
        setSelectedTheme(card.themeId || "default");
      } else {
        setShowNewCardModal(true);
      }

      setGameState(game);

      // Subscribe to real-time game updates
      channel = subscribeToActiveGame((newState) => {
        setGameState(newState);
      });
    };

    init();

    // Fallback polling for game state updates
    const interval = setInterval(async () => {
      const game = await getActiveGame();
      setGameState(game);
    }, 1000);

    // Update activity every 30 seconds
    const activityInterval = setInterval(() => {
      if (cardState?.cardId) {
        updatePlayerActivity(cardState.cardId);
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(activityInterval);
      unsubscribe(channel);
    };
  }, []);

  // Update activity on card state change
  useEffect(() => {
    if (cardState?.cardId) {
      updatePlayerActivity(cardState.cardId);
    }
  }, [cardState?.cardId]);

  // Check for bingo whenever card or game state changes
  useEffect(() => {
    if (cardState && gameState) {
      const result = checkBingo(cardState, gameState.calledNumbers);
      setBingoResult(result);
    }
  }, [cardState, gameState]);

  const handleCellClick = useCallback(
    async (col: number, row: number) => {
      if (!cardState) return;

      // FREE space cannot be toggled
      if (col === 2 && row === 2) return;

      const cellKey = `${col}-${row}`;
      setAnimatingCell(cellKey);

      const newState = await updatePlayerCardMarks(cardState, col, row);
      setCardState(newState);

      setTimeout(() => {
        setAnimatingCell(null);
      }, 400);
    },
    [cardState]
  );

  const handleCreateNewCard = useCallback(async () => {
    const newCard = await createPlayerCard(tempPlayerName || undefined, tempTheme);
    setCardState(newCard);
    setPlayerName(tempPlayerName);
    setSelectedTheme(tempTheme);
    setShowBingoModal(false);
    setShowNewCardModal(false);
  }, [tempPlayerName, tempTheme]);

  const handleCheckBingo = useCallback(() => {
    if (bingoResult?.hasBingo) {
      setShowBingoModal(true);
    }
  }, [bingoResult]);

  const handleOpenSettings = useCallback(() => {
    setTempPlayerName(playerName);
    setTempTheme(selectedTheme);
    setShowSettingsModal(true);
  }, [playerName, selectedTheme]);

  const handleSaveSettings = useCallback(async () => {
    if (!cardState) return;
    const newState = await updatePlayerInfo(cardState, tempPlayerName || null, tempTheme);
    setCardState(newState);
    setPlayerName(tempPlayerName);
    setSelectedTheme(tempTheme);
    setShowSettingsModal(false);
  }, [cardState, tempPlayerName, tempTheme]);

  const handleOpenNewCard = useCallback(() => {
    setTempPlayerName(playerName);
    setTempTheme(selectedTheme);
    setShowNewCardModal(true);
  }, [playerName, selectedTheme]);

  const currentTheme = getTheme(selectedTheme);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-white/50">Loading...</div>
      </div>
    );
  }

  // New Card Modal (shown on first visit)
  if (showNewCardModal && !cardState) {
    return (
      <div className="min-h-screen min-h-[100dvh] p-3 sm:p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="glass rounded-3xl p-6 animate-bounce-in">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎴</div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Bingo!</h2>
              <p className="text-white/60">Set up your player card</p>
            </div>

            {/* Player Name Input */}
            <div className="mb-6">
              <label className="block text-white/60 text-sm mb-2">Your Name (optional)</label>
              <input
                type="text"
                value={tempPlayerName}
                onChange={(e) => setTempPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Theme Selection */}
            <div className="mb-6">
              <label className="block text-white/60 text-sm mb-2">Choose Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {themeList.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setTempTheme(theme.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      tempTheme === theme.id
                        ? "ring-2 ring-indigo-500 bg-white/20"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    <div className={`w-8 h-8 mx-auto mb-1 rounded-lg ${theme.cardBg === 'glass' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : theme.cardBg}`} />
                    <p className="text-white text-xs font-medium">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateNewCard}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-bold text-white shadow-lg transition-all"
            >
              Get My Card
            </button>
          </div>

          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-white/50 hover:text-white transition-all text-sm w-full justify-center"
          >
            <span>←</span>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!cardState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-white/50">Loading...</div>
      </div>
    );
  }

  // Transpose the card for display (we store by column, display by row)
  const displayGrid: { num: number; marked: boolean; col: number; row: number }[][] = [];
  for (let row = 0; row < 5; row++) {
    const displayRow: { num: number; marked: boolean; col: number; row: number }[] = [];
    for (let col = 0; col < 5; col++) {
      displayRow.push({
        num: cardState.card[col][row],
        marked: cardState.markedCells[col][row],
        col,
        row,
      });
    }
    displayGrid.push(displayRow);
  }

  // Check if cell is part of winning pattern
  const isWinningCell = (col: number, row: number): boolean => {
    if (!bingoResult?.hasBingo) return false;
    return bingoResult.winningCells.some(c => c.col === col && c.row === row);
  };

  // Get pattern display text
  const getPatternText = (patterns: string[]): string => {
    const patternNames: Record<string, string> = {
      row: 'Row',
      column: 'Column',
      diagonal: 'Diagonal',
      corners: 'Four Corners',
      full: 'Full Card (Blackout)',
    };
    return patterns.map(p => patternNames[p] || p).join(', ');
  };

  // Get letter color for theme
  const getThemeLetterColor = (letter: string): string => {
    return currentTheme.letterColors[letter as keyof typeof currentTheme.letterColors] || getLetterColor(letter);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] p-3 sm:p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-[95vw] sm:max-w-md">
        {/* Header */}
        <header className="text-center mb-4 sm:mb-6 animate-slide-up">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent mb-1">
            BINGO
          </h1>
          {playerName && (
            <p className="text-white/70 text-sm font-medium">{playerName}</p>
          )}
          <p className="text-white/50 text-xs sm:text-sm">Tap numbers to mark them</p>
        </header>

        {/* Bingo Alert Banner */}
        {bingoResult?.hasBingo && (
          <div
            onClick={handleCheckBingo}
            className="mb-4 p-3 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl text-center cursor-pointer animate-pulse shadow-lg shadow-yellow-500/30"
          >
            <p className="font-bold text-white text-lg">BINGO!</p>
            <p className="text-white/90 text-sm">Tap to verify your win</p>
          </div>
        )}

        {/* Bingo Card */}
        <div className={`${currentTheme.cardBg} rounded-2xl sm:rounded-3xl p-2 sm:p-4 md:p-6 mb-4 sm:mb-6 ${currentTheme.borderColor} border`}>
          {/* BINGO Header */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-2 sm:mb-3">
            {["B", "I", "N", "G", "O"].map((letter) => (
              <div
                key={letter}
                className={`py-2 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${getThemeLetterColor(
                  letter
                )} text-center font-bold text-xl sm:text-2xl md:text-3xl ${currentTheme.headerText} shadow-lg`}
              >
                {letter}
              </div>
            ))}
          </div>

          {/* Numbers Grid */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {displayGrid.map((row) =>
              row.map((cell) => {
                const cellKey = `${cell.col}-${cell.row}`;
                const isAnimating = animatingCell === cellKey;
                const isFree = cell.col === 2 && cell.row === 2;
                const letter = getBingoLetter(cell.num || 31);
                const isWinner = isWinningCell(cell.col, cell.row);

                return (
                  <button
                    key={cellKey}
                    onClick={() => handleCellClick(cell.col, cell.row)}
                    disabled={isFree}
                    className={`aspect-square rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-xl md:text-2xl font-bold transition-all duration-200 relative overflow-hidden ${
                      isFree
                        ? `${currentTheme.freeCellBg} ${currentTheme.cellTextMarked} cursor-default text-xs sm:text-sm`
                        : cell.marked
                        ? `${currentTheme.cellMarked} ${currentTheme.cellTextMarked} scale-95`
                        : `${currentTheme.cellBg} ${currentTheme.cellText} hover:opacity-80 active:scale-95`
                    } ${isWinner ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent" : ""}`}
                  >
                    {/* Winning cell glow effect */}
                    {isWinner && (
                      <div className="absolute inset-0 bg-yellow-400/20 animate-pulse" />
                    )}

                    {/* Mark indicator */}
                    {cell.marked && !isFree && (
                      <div
                        className={`absolute inset-0 flex items-center justify-center ${
                          isAnimating ? "animate-mark-stamp" : ""
                        }`}
                      >
                        <div className="w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-white/30 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Number or FREE text */}
                    <span
                      className={`relative z-10 ${
                        cell.marked && !isFree ? "opacity-60" : ""
                      }`}
                    >
                      {isFree ? "FREE" : cell.num}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex-1 py-3 sm:py-4 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base text-white transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
          >
            <span className="text-lg sm:text-xl">←</span>
            Home
          </Link>
          <button
            onClick={handleOpenSettings}
            className="py-3 sm:py-4 px-4 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base text-white transition-all duration-200 flex items-center justify-center"
          >
            <span className="text-lg sm:text-xl">⚙️</span>
          </button>
          <button
            onClick={handleOpenNewCard}
            className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2"
          >
            <span className="text-lg sm:text-xl">🎴</span>
            New Card
          </button>
        </div>

        {/* Card ID */}
        <p className="text-center text-white/30 text-xs mt-3 sm:mt-4">
          Card: {cardState.cardId.slice(-8)}
        </p>

        <Footer />
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 max-w-sm w-full animate-bounce-in">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">⚙️</div>
              <h2 className="text-2xl font-bold text-white">Settings</h2>
            </div>

            {/* Player Name Input */}
            <div className="mb-6">
              <label className="block text-white/60 text-sm mb-2">Your Name</label>
              <input
                type="text"
                value={tempPlayerName}
                onChange={(e) => setTempPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Theme Selection */}
            <div className="mb-6">
              <label className="block text-white/60 text-sm mb-2">Card Theme</label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {themeList.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setTempTheme(theme.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      tempTheme === theme.id
                        ? "ring-2 ring-indigo-500 bg-white/20"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    <div className={`w-8 h-8 mx-auto mb-1 rounded-lg ${theme.cardBg === 'glass' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : theme.cardBg}`} />
                    <p className="text-white text-xs font-medium">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-bold text-white shadow-lg transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Card Modal */}
      {showNewCardModal && cardState && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 max-w-sm w-full animate-bounce-in">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎴</div>
              <h2 className="text-2xl font-bold text-white">New Card</h2>
              <p className="text-white/60 text-sm">This will replace your current card</p>
            </div>

            {/* Player Name Input */}
            <div className="mb-6">
              <label className="block text-white/60 text-sm mb-2">Your Name</label>
              <input
                type="text"
                value={tempPlayerName}
                onChange={(e) => setTempPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Theme Selection */}
            <div className="mb-6">
              <label className="block text-white/60 text-sm mb-2">Card Theme</label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {themeList.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setTempTheme(theme.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      tempTheme === theme.id
                        ? "ring-2 ring-indigo-500 bg-white/20"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    <div className={`w-8 h-8 mx-auto mb-1 rounded-lg ${theme.cardBg === 'glass' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : theme.cardBg}`} />
                    <p className="text-white text-xs font-medium">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowNewCardModal(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewCard}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl font-bold text-white shadow-lg transition-all"
              >
                Get New Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bingo Verification Modal */}
      {showBingoModal && bingoResult?.hasBingo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 max-w-sm w-full text-center animate-bounce-in">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">BINGO!</h2>
            {playerName && (
              <p className="text-xl text-yellow-400 font-semibold mb-2">{playerName}</p>
            )}
            <p className="text-white/80 mb-4">
              Congratulations! You have a winning pattern!
            </p>

            <div className="bg-white/10 rounded-xl p-4 mb-4">
              <p className="text-white/60 text-sm mb-1">Winning Pattern</p>
              <p className="text-xl font-bold text-yellow-400">
                {getPatternText(bingoResult.patterns)}
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-4 mb-6">
              <p className="text-white/60 text-sm mb-1">Card ID</p>
              <p className="text-lg font-mono text-white">
                {cardState.cardId.slice(-8)}
              </p>
              <p className="text-white/50 text-xs mt-2">
                Show this to the admin to verify your win
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBingoModal(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-all"
              >
                Close
              </button>
              <button
                onClick={handleOpenNewCard}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl font-bold text-white shadow-lg transition-all"
              >
                New Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
