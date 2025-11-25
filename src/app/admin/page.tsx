"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  GameState,
  GameHistory,
  AdminSession,
  VerificationResult,
  getActiveGame,
  loadGameHistory,
  saveGameToHistory,
  restoreGameFromHistory,
  drawNumber,
  undoLastNumber,
  getBingoLetter,
  getLetterColor,
  acquireAdminSession,
  updateAdminHeartbeat,
  releaseAdminSession,
  forceAcquireAdminSession,
  getActiveAdminSession,
  verifyAdminPassword,
  verifyPlayerBingo,
  togglePause,
  setAutoCall,
  setWinner,
  clearWinner,
  getActivePlayerCount,
} from "@/lib/supabase/gameStore";

type AdminStatus = "loading" | "login" | "active" | "blocked";

export default function AdminDashboard() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory>({ games: [] });
  const [animatingNumber, setAnimatingNumber] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminStatus>("loading");
  const [existingSession, setExistingSession] = useState<AdminSession | null>(null);
  const [showTakeoverConfirm, setShowTakeoverConfirm] = useState(false);
  const [takeoverPassword, setTakeoverPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPasswordError, setLoginPasswordError] = useState(false);
  const [verifyCardId, setVerifyCardId] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [showAutoCallSettings, setShowAutoCallSettings] = useState(false);
  const [autoCallInterval, setAutoCallInterval] = useState(5);
  const [autoCallTimerRef, setAutoCallTimerRef] = useState<NodeJS.Timeout | null>(null);

  // Check if already authenticated on mount
  useEffect(() => {
    setMounted(true);

    // Check if already authenticated in this session
    const isAuthenticated = sessionStorage.getItem('bingo_admin_authenticated');
    if (isAuthenticated === 'true') {
      initAdminSession();
    } else {
      setAdminStatus("login");
    }
  }, []);

  const initAdminSession = async () => {
    const result = await acquireAdminSession();
    if (result.success) {
      setAdminStatus("active");
      const [game, history, count] = await Promise.all([
        getActiveGame(),
        loadGameHistory(),
        getActivePlayerCount(),
      ]);
      setGameState(game);
      setGameHistory(history);
      setPlayerCount(count);
      if (game.autoCallInterval) {
        setAutoCallInterval(game.autoCallInterval);
      }
    } else {
      setAdminStatus("blocked");
      setExistingSession(result.existingSession || null);
    }
  };

  const handleLogin = useCallback(() => {
    if (!verifyAdminPassword(loginPassword)) {
      setLoginPasswordError(true);
      return;
    }
    sessionStorage.setItem('bingo_admin_authenticated', 'true');
    setLoginPassword("");
    setLoginPasswordError(false);
    initAdminSession();
  }, [loginPassword]);

  // Set up heartbeat and cleanup
  useEffect(() => {
    if (adminStatus !== "active") return;

    // Clean up on unmount
    return () => {
      releaseAdminSession();
    };
  }, [adminStatus]);

  // Update heartbeat status
  useEffect(() => {
    if (adminStatus !== "active") return;

    const heartbeatInterval = setInterval(() => {
      updateAdminHeartbeat();
    }, 3000);

    return () => clearInterval(heartbeatInterval);
  }, [adminStatus]);

  const handleDrawNumber = useCallback(async () => {
    if (!gameState || animatingNumber || adminStatus !== "active") return;

    setAnimatingNumber(true);
    const newState = await drawNumber(gameState);
    setGameState(newState);

    setTimeout(() => {
      setAnimatingNumber(false);
    }, 600);
  }, [gameState, animatingNumber, adminStatus]);

  const handleUndo = useCallback(async () => {
    if (!gameState || adminStatus !== "active") return;
    const newState = await undoLastNumber(gameState);
    setGameState(newState);
  }, [gameState, adminStatus]);

  const handleNewGame = useCallback(async () => {
    if (!gameState || adminStatus !== "active") return;
    const newState = await saveGameToHistory(gameState);
    setGameState(newState);
    const history = await loadGameHistory();
    setGameHistory(history);
  }, [gameState, adminStatus]);

  const handleRestoreGame = useCallback(async (gameId: string) => {
    if (adminStatus !== "active") return;
    const restored = await restoreGameFromHistory(gameId);
    if (restored) {
      setGameState(restored);
    }
  }, [adminStatus]);

  const handleForceTakeover = useCallback(async () => {
    if (!verifyAdminPassword(takeoverPassword)) {
      setPasswordError(true);
      return;
    }

    await forceAcquireAdminSession();
    setAdminStatus("active");
    setShowTakeoverConfirm(false);
    setTakeoverPassword("");
    setPasswordError(false);

    const [game, history] = await Promise.all([
      getActiveGame(),
      loadGameHistory(),
    ]);
    setGameState(game);
    setGameHistory(history);
  }, [takeoverPassword]);

  const handleCloseTakeoverModal = useCallback(() => {
    setShowTakeoverConfirm(false);
    setTakeoverPassword("");
    setPasswordError(false);
  }, []);

  const handleRetry = useCallback(async () => {
    const result = await acquireAdminSession();
    if (result.success) {
      setAdminStatus("active");
      const [game, history] = await Promise.all([
        getActiveGame(),
        loadGameHistory(),
      ]);
      setGameState(game);
      setGameHistory(history);
    } else {
      setExistingSession(result.existingSession || null);
    }
  }, []);

  const handleVerifyCard = useCallback(async () => {
    if (!verifyCardId.trim() || !gameState) return;

    const result = await verifyPlayerBingo(verifyCardId.trim(), gameState.calledNumbers);
    setVerificationResult(result);
    setShowVerificationModal(true);
  }, [verifyCardId, gameState]);

  const handleCloseVerification = useCallback(() => {
    setShowVerificationModal(false);
    setVerificationResult(null);
    setVerifyCardId("");
  }, []);

  // Pause/Resume handler
  const handleTogglePause = useCallback(async () => {
    if (!gameState || adminStatus !== "active") return;
    const newState = await togglePause(gameState);
    setGameState(newState);
  }, [gameState, adminStatus]);

  // Auto-call handlers
  const handleStartAutoCall = useCallback(async () => {
    if (!gameState || adminStatus !== "active") return;
    const newState = await setAutoCall(gameState, true, autoCallInterval);
    setGameState(newState);
    setShowAutoCallSettings(false);
  }, [gameState, adminStatus, autoCallInterval]);

  const handleStopAutoCall = useCallback(async () => {
    if (!gameState || adminStatus !== "active") return;
    const newState = await setAutoCall(gameState, false, autoCallInterval);
    setGameState(newState);
    if (autoCallTimerRef) {
      clearInterval(autoCallTimerRef);
      setAutoCallTimerRef(null);
    }
  }, [gameState, adminStatus, autoCallInterval, autoCallTimerRef]);

  // Auto-call effect - automatically draw numbers when enabled
  useEffect(() => {
    if (!gameState?.autoCallEnabled || gameState.isPaused || adminStatus !== "active") {
      if (autoCallTimerRef) {
        clearInterval(autoCallTimerRef);
        setAutoCallTimerRef(null);
      }
      return;
    }

    const timer = setInterval(async () => {
      if (gameState.calledNumbers.length < 75) {
        const newState = await drawNumber(gameState);
        setGameState(newState);
      } else {
        // All numbers called, stop auto-call
        await handleStopAutoCall();
      }
    }, gameState.autoCallInterval * 1000);

    setAutoCallTimerRef(timer);

    return () => {
      clearInterval(timer);
    };
  }, [gameState?.autoCallEnabled, gameState?.isPaused, gameState?.autoCallInterval, adminStatus]);

  // Winner handlers
  const handleDeclareWinner = useCallback(async () => {
    if (!gameState || !verificationResult?.found || !verificationResult.bingoResult?.hasBingo) return;
    const playerName = verificationResult.playerName || "Anonymous";
    const cardId = verificationResult.cardState?.cardId || "";
    const newState = await setWinner(gameState, cardId, playerName);
    setGameState(newState);
    setShowVerificationModal(false);
    setVerificationResult(null);
    setVerifyCardId("");
  }, [gameState, verificationResult]);

  const handleClearWinner = useCallback(async () => {
    if (!gameState) return;
    const newState = await clearWinner(gameState);
    setGameState(newState);
  }, [gameState]);

  // Update player count periodically
  useEffect(() => {
    if (adminStatus !== "active") return;

    const interval = setInterval(async () => {
      const count = await getActivePlayerCount();
      setPlayerCount(count);
    }, 30000);

    return () => clearInterval(interval);
  }, [adminStatus]);

  if (!mounted || adminStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-white/50">Loading...</div>
      </div>
    );
  }

  // Login screen - require password to access admin
  if (adminStatus === "login") {
    return (
      <div className="min-h-screen min-h-[100dvh] p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="glass rounded-3xl p-8 mb-6">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-white/60 mb-6">
              Enter the admin password to access the dashboard.
            </p>

            <div className="mb-4">
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  setLoginPasswordError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
                placeholder="Enter password"
                className={`w-full px-4 py-3 bg-white/10 border ${
                  loginPasswordError ? "border-red-500" : "border-white/20"
                } rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-indigo-500 transition-all`}
                autoFocus
              />
              {loginPasswordError && (
                <p className="text-red-400 text-sm mt-2">Incorrect password</p>
              )}
            </div>

            <button
              onClick={handleLogin}
              disabled={!loginPassword}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Login
            </button>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-white/50 hover:text-white transition-all text-sm"
          >
            <span>←</span>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Blocked screen - another admin is active
  if (adminStatus === "blocked") {
    return (
      <div className="min-h-screen min-h-[100dvh] p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="glass rounded-3xl p-8 mb-6">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Locked</h1>
            <p className="text-white/60 mb-6">
              Another admin is currently controlling the game.
            </p>

            {existingSession && (
              <div className="bg-white/10 rounded-xl p-4 mb-6 text-left">
                <p className="text-white/60 text-xs mb-1">Active Session</p>
                <p className="text-white text-sm">
                  Started: {new Date(existingSession.startedAt).toLocaleTimeString()}
                </p>
                <p className="text-white/60 text-xs mt-2">
                  Session will expire if inactive for 10 seconds
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-all"
              >
                Retry
              </button>
              <button
                onClick={() => setShowTakeoverConfirm(true)}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl font-semibold text-white shadow-lg transition-all"
              >
                Take Over
              </button>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-white/50 hover:text-white transition-all text-sm"
          >
            <span>←</span>
            Back to Home
          </Link>
        </div>

        {/* Takeover Confirmation Modal */}
        {showTakeoverConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-3xl p-6 max-w-sm w-full text-center">
              <div className="text-5xl mb-4">🔐</div>
              <h2 className="text-xl font-bold text-white mb-2">Admin Password Required</h2>
              <p className="text-white/70 mb-4 text-sm">
                Enter the admin password to take over this session.
              </p>

              {/* Password Input */}
              <div className="mb-4">
                <input
                  type="password"
                  value={takeoverPassword}
                  onChange={(e) => {
                    setTakeoverPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleForceTakeover();
                    }
                  }}
                  placeholder="Enter password"
                  className={`w-full px-4 py-3 bg-white/10 border ${
                    passwordError ? "border-red-500" : "border-white/20"
                  } rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-indigo-500 transition-all`}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-400 text-sm mt-2">Incorrect password</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCloseTakeoverModal}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForceTakeover}
                  disabled={!takeoverPassword}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Take Over
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-white/50">Loading...</div>
      </div>
    );
  }

  const currentLetter = gameState.currentNumber
    ? getBingoLetter(gameState.currentNumber)
    : null;

  return (
    <div className="min-h-screen min-h-[100dvh] p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        {/* Winner Banner */}
        {gameState.winnerName && (
          <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl text-center animate-bounce-in">
            <p className="font-bold text-white text-lg">Winner: {gameState.winnerName}</p>
            <button
              onClick={handleClearWinner}
              className="mt-2 px-4 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm transition-all"
            >
              Clear Winner
            </button>
          </div>
        )}

        {/* Header */}
        <header className="text-center mb-6 animate-slide-up">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
              BINGO 2025
            </h1>
          </Link>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-white/60 text-sm">Admin Controls</p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
              <span className="text-white/70 text-sm">{playerCount} players</span>
            </div>
          </div>
        </header>

        {/* Current Number Display */}
        <section className="mb-6">
          <div className="glass rounded-3xl p-6 text-center">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-3">
              Current Number
            </p>
            <div className="relative inline-block">
              {gameState.currentNumber ? (
                <div
                  key={gameState.currentNumber}
                  className="animate-number-pop"
                >
                  <div
                    className={`w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br ${getLetterColor(
                      currentLetter || ""
                    )} flex flex-col items-center justify-center animate-pulse-glow mx-auto`}
                  >
                    <span className="text-xl md:text-2xl font-bold text-white/80">
                      {currentLetter}
                    </span>
                    <span className="text-4xl md:text-5xl font-bold text-white">
                      {gameState.currentNumber}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/10 flex items-center justify-center mx-auto">
                  <span className="text-3xl text-white/30">--</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Main Control - Draw Button */}
        <section className="mb-4">
          <button
            onClick={handleDrawNumber}
            disabled={animatingNumber || gameState.calledNumbers.length >= 75 || gameState.isPaused || gameState.autoCallEnabled}
            className="w-full py-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl font-bold text-xl text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
          >
            <span className="text-3xl">🎲</span>
            {gameState.autoCallEnabled ? `Auto-calling (${gameState.autoCallInterval}s)` : "Draw Number"}
          </button>
        </section>

        {/* Pause & Auto-call Controls */}
        <section className="mb-4 flex gap-3">
          <button
            onClick={handleTogglePause}
            className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
              gameState.isPaused
                ? "bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/30"
                : "bg-gradient-to-r from-yellow-500 to-amber-600 shadow-lg shadow-yellow-500/30"
            }`}
          >
            <span className="text-xl">{gameState.isPaused ? "▶️" : "⏸️"}</span>
            {gameState.isPaused ? "Resume" : "Pause"}
          </button>

          {!gameState.autoCallEnabled ? (
            <button
              onClick={() => setShowAutoCallSettings(true)}
              disabled={gameState.isPaused}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="text-xl">⏱️</span>
              Auto-call
            </button>
          ) : (
            <button
              onClick={handleStopAutoCall}
              className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl font-semibold text-white shadow-lg shadow-red-500/30 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span className="text-xl">⏹️</span>
              Stop Auto
            </button>
          )}
        </section>

        {/* Secondary Controls */}
        <section className="mb-6 flex gap-3">
          <button
            onClick={handleUndo}
            disabled={gameState.calledNumbers.length === 0 || gameState.autoCallEnabled}
            className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className="text-xl">↩️</span>
            Undo
          </button>

          <button
            onClick={handleNewGame}
            disabled={gameState.autoCallEnabled}
            className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl font-semibold text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="text-xl">🔄</span>
            New Game
          </button>
        </section>

        {/* Stats */}
        <section className="mb-6 grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-indigo-400">
              {gameState.calledNumbers.length}
            </p>
            <p className="text-white/60 text-xs">Numbers Called</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-400">
              {75 - gameState.calledNumbers.length}
            </p>
            <p className="text-white/60 text-xs">Remaining</p>
          </div>
        </section>

        {/* Game History */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-white/60 mb-3 text-center uppercase tracking-wider">
            Game History
          </h2>
          <div className="glass rounded-xl p-3">
            {gameHistory.games.length === 0 ? (
              <p className="text-white/40 text-center py-2 text-sm">
                No previous games
              </p>
            ) : (
              <div className="space-y-2">
                {gameHistory.games.map((game, index) => (
                  <div
                    key={game.gameId}
                    className="flex items-center justify-between bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-all"
                  >
                    <div>
                      <p className="font-semibold text-white text-sm">
                        Game {gameHistory.games.length - index}
                      </p>
                      <p className="text-white/50 text-xs">
                        {game.calledNumbers.length} calls •{" "}
                        {new Date(game.startedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreGame(game.gameId)}
                      className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded-lg transition-all text-xs font-semibold"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Card Verification */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-white/60 mb-3 text-center uppercase tracking-wider">
            Verify Bingo Card
          </h2>
          <div className="glass rounded-xl p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={verifyCardId}
                onChange={(e) => setVerifyCardId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleVerifyCard();
                  }
                }}
                placeholder="Enter Card ID (last 8 chars)"
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-indigo-500 transition-all text-sm"
              />
              <button
                onClick={handleVerifyCard}
                disabled={!verifyCardId.trim()}
                className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl font-semibold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify
              </button>
            </div>
            <p className="text-white/40 text-xs mt-2 text-center">
              Enter the Card ID shown on the player&apos;s bingo modal
            </p>
          </div>
        </section>

        {/* Open Display Link */}
        <section className="mb-4">
          <Link
            href="/display"
            target="_blank"
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl font-semibold text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span className="text-xl">📺</span>
            Open Display Screen
          </Link>
        </section>

        {/* Footer */}
        <footer className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-white/50 hover:text-white transition-all text-sm"
          >
            <span>←</span>
            Back to Home
          </Link>
        </footer>
      </div>

      {/* Card Verification Modal */}
      {showVerificationModal && verificationResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 max-w-sm w-full text-center">
            {verificationResult.found ? (
              <>
                {verificationResult.bingoResult?.hasBingo ? (
                  <>
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-emerald-400 mb-2">
                      VALID BINGO!
                    </h2>
                    <p className="text-white/70 mb-4 text-sm">
                      This card has a winning pattern
                    </p>

                    {verificationResult.playerName && (
                      <div className="bg-white/10 rounded-xl p-3 mb-4">
                        <p className="text-white/60 text-xs mb-1">Player Name</p>
                        <p className="text-lg font-bold text-white">
                          {verificationResult.playerName}
                        </p>
                      </div>
                    )}

                    <div className="bg-emerald-500/20 rounded-xl p-4 mb-4">
                      <p className="text-white/60 text-xs mb-1">Winning Pattern</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {verificationResult.bingoResult.patterns
                          .map((p) => {
                            const names: Record<string, string> = {
                              row: "Row",
                              column: "Column",
                              diagonal: "Diagonal",
                              corners: "Four Corners",
                              full: "Full Card",
                            };
                            return names[p] || p;
                          })
                          .join(", ")}
                      </p>
                    </div>

                    {/* Display the card preview */}
                    <div className="bg-white/5 rounded-xl p-3 mb-4">
                      <p className="text-white/60 text-xs mb-2">Card Preview</p>
                      <div className="grid grid-cols-5 gap-1">
                        {["B", "I", "N", "G", "O"].map((letter) => (
                          <div
                            key={letter}
                            className={`py-1 rounded text-xs font-bold text-white bg-gradient-to-br ${getLetterColor(
                              letter
                            )}`}
                          >
                            {letter}
                          </div>
                        ))}
                        {verificationResult.cardNumbers &&
                          [0, 1, 2, 3, 4].map((row) =>
                            [0, 1, 2, 3, 4].map((col) => {
                              const num = verificationResult.cardNumbers![col][row];
                              const isWinning =
                                verificationResult.bingoResult?.winningCells.some(
                                  (c) => c.col === col && c.row === row
                                );
                              const isFree = col === 2 && row === 2;
                              return (
                                <div
                                  key={`${col}-${row}`}
                                  className={`py-1 rounded text-xs font-semibold ${
                                    isWinning
                                      ? "bg-emerald-500 text-white"
                                      : isFree
                                      ? "bg-amber-500/50 text-white"
                                      : "bg-white/10 text-white/60"
                                  }`}
                                >
                                  {isFree ? "F" : num}
                                </div>
                              );
                            })
                          )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-red-400 mb-2">
                      NO BINGO
                    </h2>
                    <p className="text-white/70 mb-4 text-sm">
                      This card does not have a valid bingo pattern yet
                    </p>

                    {/* Display the card preview */}
                    <div className="bg-white/5 rounded-xl p-3 mb-4">
                      <p className="text-white/60 text-xs mb-2">Card Preview</p>
                      <div className="grid grid-cols-5 gap-1">
                        {["B", "I", "N", "G", "O"].map((letter) => (
                          <div
                            key={letter}
                            className={`py-1 rounded text-xs font-bold text-white bg-gradient-to-br ${getLetterColor(
                              letter
                            )}`}
                          >
                            {letter}
                          </div>
                        ))}
                        {verificationResult.cardNumbers &&
                          [0, 1, 2, 3, 4].map((row) =>
                            [0, 1, 2, 3, 4].map((col) => {
                              const num = verificationResult.cardNumbers![col][row];
                              const isMarked =
                                verificationResult.cardState?.markedCells[col][row];
                              const isFree = col === 2 && row === 2;
                              const wasCalled =
                                gameState?.calledNumbers.includes(num);
                              return (
                                <div
                                  key={`${col}-${row}`}
                                  className={`py-1 rounded text-xs font-semibold ${
                                    isFree
                                      ? "bg-amber-500/50 text-white"
                                      : isMarked && wasCalled
                                      ? "bg-indigo-500 text-white"
                                      : isMarked && !wasCalled
                                      ? "bg-red-500/50 text-white"
                                      : "bg-white/10 text-white/60"
                                  }`}
                                >
                                  {isFree ? "F" : num}
                                </div>
                              );
                            })
                          )}
                      </div>
                      <p className="text-white/40 text-xs mt-2">
                        <span className="inline-block w-2 h-2 bg-indigo-500 rounded mr-1"></span>
                        Valid mark
                        <span className="inline-block w-2 h-2 bg-red-500/50 rounded ml-3 mr-1"></span>
                        Invalid mark
                      </p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold text-yellow-400 mb-2">
                  Card Not Found
                </h2>
                <p className="text-white/70 mb-4 text-sm">
                  No card found with ID ending in &quot;{verifyCardId}&quot;
                </p>
                <p className="text-white/50 text-xs">
                  Make sure the player is showing their card on this device
                </p>
              </>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCloseVerification}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-all"
              >
                Close
              </button>
              {verificationResult.found && verificationResult.bingoResult?.hasBingo && (
                <button
                  onClick={handleDeclareWinner}
                  className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl font-bold text-white shadow-lg transition-all"
                >
                  Declare Winner
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto-call Settings Modal */}
      {showAutoCallSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-3xl p-6 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">⏱️</div>
            <h2 className="text-xl font-bold text-white mb-4">Auto-call Settings</h2>

            <div className="mb-6">
              <label className="block text-white/60 text-sm mb-2">
                Interval (seconds)
              </label>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setAutoCallInterval(Math.max(2, autoCallInterval - 1))}
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl text-xl font-bold text-white"
                >
                  -
                </button>
                <span className="text-4xl font-bold text-indigo-400 w-20">
                  {autoCallInterval}
                </span>
                <button
                  onClick={() => setAutoCallInterval(Math.min(30, autoCallInterval + 1))}
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl text-xl font-bold text-white"
                >
                  +
                </button>
              </div>
              <p className="text-white/40 text-xs mt-2">
                Numbers will be drawn every {autoCallInterval} seconds
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAutoCallSettings(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleStartAutoCall}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-white shadow-lg transition-all"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
