"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4">
      <div className="text-center">
        {/* Animated Title */}
        <div className="mb-8 md:mb-12 animate-slide-up">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2 md:mb-4">
            BINGO 2025
          </h1>
          <p className="text-white/60 text-base md:text-lg">Select your role to continue</p>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 justify-center items-center max-w-4xl mx-auto">
          {/* Player Button */}
          <Link
            href="/player"
            className="group relative w-full sm:w-56 h-40 sm:h-48 glass rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-3 sm:gap-4 hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
              🎴
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Player</h2>
              <p className="text-white/50 text-xs sm:text-sm">View your bingo card</p>
            </div>
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-cyan-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>

          {/* Display Button */}
          <Link
            href="/display"
            className="group relative w-full sm:w-56 h-40 sm:h-48 glass rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-3 sm:gap-4 hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/20"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
              📺
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Display</h2>
              <p className="text-white/50 text-xs sm:text-sm">Show called numbers</p>
            </div>
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>

          {/* Admin Button */}
          <Link
            href="/admin"
            className="group relative w-full sm:w-56 h-40 sm:h-48 glass rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-3 sm:gap-4 hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/20"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
              🎲
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Admin</h2>
              <p className="text-white/50 text-xs sm:text-sm">Draw numbers & manage</p>
            </div>
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        </div>

        {/* Footer hint */}
        <p className="mt-8 md:mt-12 text-white/30 text-xs sm:text-sm animate-pulse">
          Click a card to begin
        </p>
      </div>
    </div>
  );
}
