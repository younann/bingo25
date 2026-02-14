"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  GameState,
  GameEvent,
  getActiveGame,
  getBingoLetter,
  getLetterColor,
  getActivePlayerCount,
  subscribeToActiveGame,
  subscribeToGameEvents,
  getRecentEvents,
  unsubscribe,
} from "@/lib/supabase/gameStore";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { playDisplayChime, playWinnerCelebration, isMuted, toggleMute } from "@/lib/sounds";
import { QRCodeSVG } from "qrcode.react";
import Footer from "../components/Footer";

export default function DisplayScreen() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [showQR, setShowQR] = useState(true);
  const [previousNumber, setPreviousNumber] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [playerUrl, setPlayerUrl] = useState("");
  const [muted, setMuted] = useState(false);
  const [activityFeed, setActivityFeed] = useState<GameEvent[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const reactionIdRef = useRef(0);

  // Handle incoming game event (add to feed, spawn floating reaction)
  const handleGameEvent = useCallback((event: GameEvent) => {
    setActivityFeed((prev) => [event, ...prev].slice(0, 30));

    if (event.eventType === 'reaction' && event.data?.emoji) {
      const id = reactionIdRef.current++;
      const x = 10 + Math.random() * 80; // random horizontal position (10-90%)
      setFloatingReactions((prev) => [...prev, { id, emoji: event.data.emoji as string, x }]);
      // Remove after animation
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3000);
    }
  }, []);

  // Load state on mount and subscribe to real-time updates
  useEffect(() => {
    setMounted(true);
    setMuted(isMuted());
    let channel: RealtimeChannel | null = null;
    let eventsChannel: RealtimeChannel | null = null;

    // Set player URL
    if (typeof window !== "undefined") {
      setPlayerUrl(`${window.location.origin}/player`);
    }

    const init = async () => {
      const game = await getActiveGame();
      setGameState(game);

      // Get initial player count
      const count = await getActivePlayerCount();
      setPlayerCount(count);

      // Load recent events
      const events = await getRecentEvents(game.gameId, 20);
      setActivityFeed(events);

      // Subscribe to real-time updates
      channel = subscribeToActiveGame((newState) => {
        setGameState((prev) => {
          if (prev?.currentNumber !== newState.currentNumber && newState.currentNumber) {
            setPreviousNumber(prev?.currentNumber || null);
            setIsAnimating(true);
            playDisplayChime();
            setTimeout(() => setIsAnimating(false), 2000);
          }
          // Play celebration when winner is announced
          if (!prev?.winnerName && newState.winnerName) {
            playWinnerCelebration();
          }
          return newState;
        });
      });

      // Subscribe to game events
      eventsChannel = subscribeToGameEvents(game.gameId, handleGameEvent);
    };

    init();

    // Only poll when Supabase real-time is not available
    let interval: NodeJS.Timeout | undefined;
    if (!isSupabaseConfigured()) {
      interval = setInterval(async () => {
        const newState = await getActiveGame();
        setGameState((prev) => {
          if (prev?.currentNumber !== newState.currentNumber && newState.currentNumber) {
            setPreviousNumber(prev?.currentNumber || null);
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 2000);
          }
          return newState;
        });
      }, 500);
    }

    // Update player count every 30 seconds
    const playerCountInterval = setInterval(async () => {
      const count = await getActivePlayerCount();
      setPlayerCount(count);
    }, 30000);

    return () => {
      if (interval) clearInterval(interval);
      clearInterval(playerCountInterval);
      unsubscribe(channel);
      unsubscribe(eventsChannel);
    };
  }, [handleGameEvent]);

  if (!mounted || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-white/50">Loading...</div>
      </div>
    );
  }

  const currentLetter = gameState.currentNumber
    ? getBingoLetter(gameState.currentNumber)
    : null;
  const recentCalls = [...gameState.calledNumbers].reverse().slice(1, 6);

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 flex flex-col relative overflow-hidden">
      {/* Winner Announcement Overlay */}
      {gameState.winnerName && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fadeIn">
          <div className="text-center animate-bounce-in">
            <div className="text-8xl mb-6 animate-bounce">🎉</div>
            <h1 className="text-6xl md:text-8xl font-bold text-yellow-400 mb-4 animate-pulse">
              WINNER!
            </h1>
            <p className="text-4xl md:text-6xl font-bold text-white mb-6">
              {gameState.winnerName}
            </p>
            <div className="inline-flex items-center gap-3 bg-white/10 rounded-2xl px-6 py-3">
              <span className="text-white/60">Card ID:</span>
              <span className="font-mono text-xl text-white">
                {gameState.winnerCardId?.slice(-8)}
              </span>
            </div>
            <div className="mt-8 flex justify-center gap-4">
              <div className="text-6xl animate-bounce delay-100">🏆</div>
              <div className="text-6xl animate-bounce delay-200">⭐</div>
              <div className="text-6xl animate-bounce delay-300">🎊</div>
            </div>
          </div>
        </div>
      )}

      {/* Paused Overlay */}
      {gameState.isPaused && !gameState.winnerName && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40">
          <div className="text-center">
            <div className="text-6xl mb-4">⏸️</div>
            <h2 className="text-4xl font-bold text-white">Game Paused</h2>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="text-center mb-4 md:mb-6 relative z-10">
        <div className="relative">
          <button
            onClick={() => setMuted(toggleMute())}
            className="absolute right-0 top-0 p-2 text-white/50 hover:text-white transition-all"
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          >
            <span className="text-xl">{muted ? "🔇" : "🔊"}</span>
          </button>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            BINGO GAME
          </h1>
        </div>
        {/* Player Count */}
        <div className="mt-2 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-white/70 text-sm">
            {playerCount} {playerCount === 1 ? "player" : "players"} online
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 relative z-10">
        {/* Left Side - Current Number & Recent */}
        <div className="lg:w-1/3 flex flex-col gap-4 md:gap-6">
          {/* Current Number - Large Display with Enhanced Animation */}
          <div className="glass rounded-3xl p-6 md:p-8 text-center flex-shrink-0 relative overflow-hidden">
            {/* Background animation rings */}
            {isAnimating && gameState.currentNumber && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-${currentLetter === 'B' ? 'red' : currentLetter === 'I' ? 'orange' : currentLetter === 'N' ? 'green' : currentLetter === 'G' ? 'blue' : 'purple'}-500/50 animate-ping`} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-72 h-72 md:w-96 md:h-96 rounded-full border-2 border-white/20 animate-ping animation-delay-200`} />
                </div>
              </>
            )}

            <p className="text-white/60 text-sm md:text-lg uppercase tracking-wider mb-4 relative z-10">
              Current Number
            </p>
            <div className="relative inline-block">
              {gameState.currentNumber ? (
                <div
                  key={gameState.currentNumber}
                  className={isAnimating ? "animate-dramatic-pop" : ""}
                >
                  <div
                    className={`w-36 h-36 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-full bg-gradient-to-br ${getLetterColor(
                      currentLetter || ""
                    )} flex flex-col items-center justify-center mx-auto shadow-2xl ${
                      isAnimating ? "animate-pulse-glow-strong" : "animate-pulse-glow"
                    }`}
                  >
                    <span className="text-2xl md:text-4xl font-bold text-white/80">
                      {currentLetter}
                    </span>
                    <span className="text-6xl md:text-8xl lg:text-9xl font-bold text-white">
                      {gameState.currentNumber}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-36 h-36 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-full bg-white/10 flex items-center justify-center mx-auto">
                  <span className="text-5xl md:text-6xl text-white/30">--</span>
                </div>
              )}
            </div>

            {/* Auto-call indicator */}
            {gameState.autoCallEnabled && (
              <div className="mt-4 inline-flex items-center gap-2 bg-indigo-500/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                <span className="text-indigo-300 text-sm">
                  Auto-call: {gameState.autoCallInterval}s
                </span>
              </div>
            )}
          </div>

          {/* Recent Calls */}
          <div className="glass rounded-2xl p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-white/80 mb-3 md:mb-4 text-center">
              Recent Calls
            </h2>
            <div className="flex justify-center gap-2 md:gap-3 flex-wrap">
              {[...Array(5)].map((_, i) => {
                const num = recentCalls[i];
                const letter = num ? getBingoLetter(num) : null;
                return (
                  <div
                    key={i}
                    className={`w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
                      num
                        ? `bg-gradient-to-br ${getLetterColor(letter || "")} shadow-lg`
                        : "bg-white/5"
                    }`}
                  >
                    {num ? (
                      <>
                        <span className="text-xs font-bold text-white/70">
                          {letter}
                        </span>
                        <span className="text-lg md:text-xl lg:text-2xl font-bold text-white">
                          {num}
                        </span>
                      </>
                    ) : (
                      <span className="text-white/20">--</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="glass rounded-xl p-3 md:p-4 text-center">
              <p className="text-2xl md:text-4xl font-bold text-indigo-400">
                {gameState.calledNumbers.length}
              </p>
              <p className="text-white/60 text-xs md:text-sm">Called</p>
            </div>
            <div className="glass rounded-xl p-3 md:p-4 text-center">
              <p className="text-2xl md:text-4xl font-bold text-emerald-400">
                {75 - gameState.calledNumbers.length}
              </p>
              <p className="text-white/60 text-xs md:text-sm">Remaining</p>
            </div>
          </div>

          {/* QR Code Section */}
          {showQR && playerUrl && (
            <div className="glass rounded-2xl p-4 md:p-6 text-center">
              <h2 className="text-lg font-semibold text-white/80 mb-3">
                Scan to Play
              </h2>
              <div className="bg-white rounded-xl p-3 inline-block">
                <QRCodeSVG value={playerUrl} size={120} />
              </div>
              <p className="text-white/50 text-xs mt-2">
                {playerUrl.replace('https://', '').replace('http://', '')}
              </p>
              <button
                onClick={() => setShowQR(false)}
                className="mt-3 text-white/40 hover:text-white/60 text-xs transition-all"
              >
                Hide QR
              </button>
            </div>
          )}
          {!showQR && (
            <button
              onClick={() => setShowQR(true)}
              className="glass rounded-xl py-3 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
            >
              Show QR Code
            </button>
          )}
        </div>

        {/* Right Side - Numbers Board + Activity Feed */}
        <div className="lg:flex-1 flex flex-col gap-4 md:gap-6">
          <div className="glass rounded-2xl p-3 md:p-4 flex-1">
            <h2 className="text-lg md:text-xl font-semibold text-white/80 mb-3 md:mb-4 text-center">
              All Numbers
            </h2>

            {/* BINGO Letters Header */}
            <div className="grid grid-cols-5 gap-1 md:gap-2 mb-2">
              {["B", "I", "N", "G", "O"].map((letter) => (
                <div
                  key={letter}
                  className={`py-2 md:py-3 rounded-lg bg-gradient-to-br ${getLetterColor(
                    letter
                  )} text-center font-bold text-xl md:text-2xl lg:text-3xl text-white`}
                >
                  {letter}
                </div>
              ))}
            </div>

            {/* Numbers Grid - 15 rows x 5 columns */}
            <div className="space-y-1 md:space-y-2">
              {[...Array(15)].map((_, row) => (
                <div key={row} className="grid grid-cols-5 gap-1 md:gap-2">
                  {[0, 1, 2, 3, 4].map((col) => {
                    const num = col * 15 + row + 1;
                    const isCalled = gameState.calledNumbers.includes(num);
                    const letter = getBingoLetter(num);
                    const isCurrentNumber = num === gameState.currentNumber;
                    return (
                      <div
                        key={num}
                        className={`h-8 md:h-10 lg:h-12 rounded-md md:rounded-lg flex items-center justify-center text-sm md:text-base lg:text-lg font-semibold transition-all duration-300 ${
                          isCurrentNumber
                            ? `bg-gradient-to-br ${getLetterColor(
                                letter
                              )} text-white shadow-lg ring-2 ring-white ring-offset-2 ring-offset-transparent animate-pulse scale-110`
                            : isCalled
                            ? `bg-gradient-to-br ${getLetterColor(
                                letter
                              )} text-white shadow-md`
                            : "bg-white/5 text-white/40"
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          {activityFeed.length > 0 && (
            <div className="glass rounded-2xl p-3 md:p-4 max-h-40 overflow-hidden">
              <h2 className="text-sm font-semibold text-white/60 mb-2 uppercase tracking-wider">
                Live Feed
              </h2>
              <div className="space-y-1 overflow-y-auto max-h-28">
                {activityFeed.slice(0, 10).map((event, i) => (
                  <div
                    key={event.id || i}
                    className={`text-sm text-white/70 flex items-center gap-2 ${i === 0 ? 'animate-slide-up' : ''}`}
                  >
                    <span className="text-xs">
                      {event.eventType === 'reaction' ? (event.data?.emoji as string || '') :
                       event.eventType === 'player_joined' ? '👋' :
                       event.eventType === 'number_called' ? '🔢' :
                       event.eventType === 'bingo_claimed' ? '🎉' : ''}
                    </span>
                    <span>
                      {event.eventType === 'reaction'
                        ? `${event.playerName || 'Someone'} reacted ${event.data?.emoji || ''}`
                        : event.eventType === 'player_joined'
                        ? `${event.playerName || 'A player'} joined`
                        : event.eventType === 'number_called'
                        ? `${event.data?.letter || ''}${event.data?.number || ''} was called`
                        : event.eventType === 'bingo_claimed'
                        ? `${event.playerName || 'Someone'} claimed BINGO!`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Reactions Overlay */}
      <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute bottom-0 animate-float-up"
            style={{ left: `${reaction.x}%` }}
          >
            <span className="text-4xl md:text-5xl">{reaction.emoji}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-4 text-center relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white/60 hover:text-white transition-all"
        >
          <span>←</span>
          Back to Home
        </Link>
        <Footer />
      </footer>
    </div>
  );
}
