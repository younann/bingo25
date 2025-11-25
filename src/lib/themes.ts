// Card themes/skins configuration

export interface CardTheme {
  id: string;
  name: string;
  description: string;
  cardBg: string;
  cellBg: string;
  cellMarked: string;
  cellText: string;
  cellTextMarked: string;
  headerBg: string;
  headerText: string;
  freeCellBg: string;
  borderColor: string;
  letterColors: {
    B: string;
    I: string;
    N: string;
    G: string;
    O: string;
  };
}

export const themes: Record<string, CardTheme> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional bingo card style',
    cardBg: 'bg-white',
    cellBg: 'bg-gray-50',
    cellMarked: 'bg-red-500',
    cellText: 'text-gray-800',
    cellTextMarked: 'text-white',
    headerBg: 'bg-gradient-to-r from-blue-600 to-blue-700',
    headerText: 'text-white',
    freeCellBg: 'bg-yellow-400',
    borderColor: 'border-gray-300',
    letterColors: {
      B: 'from-blue-500 to-blue-600',
      I: 'from-blue-500 to-blue-600',
      N: 'from-blue-500 to-blue-600',
      G: 'from-blue-500 to-blue-600',
      O: 'from-blue-500 to-blue-600',
    },
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    description: 'Vibrant neon glow effect',
    cardBg: 'bg-gray-950',
    cellBg: 'bg-gray-900',
    cellMarked: 'bg-fuchsia-500 shadow-lg shadow-fuchsia-500/50',
    cellText: 'text-cyan-400',
    cellTextMarked: 'text-white',
    headerBg: 'bg-gradient-to-r from-fuchsia-600 to-cyan-500',
    headerText: 'text-white',
    freeCellBg: 'bg-gradient-to-br from-fuchsia-500 to-cyan-500 shadow-lg shadow-fuchsia-500/30',
    borderColor: 'border-fuchsia-500/30',
    letterColors: {
      B: 'from-pink-500 to-fuchsia-600',
      I: 'from-fuchsia-500 to-purple-600',
      N: 'from-cyan-400 to-teal-500',
      G: 'from-blue-400 to-indigo-500',
      O: 'from-violet-500 to-purple-600',
    },
  },
  holiday: {
    id: 'holiday',
    name: 'Holiday',
    description: 'Festive Christmas theme',
    cardBg: 'bg-gradient-to-br from-red-900 to-green-900',
    cellBg: 'bg-green-800/50',
    cellMarked: 'bg-red-500 shadow-lg shadow-red-500/30',
    cellText: 'text-green-100',
    cellTextMarked: 'text-white',
    headerBg: 'bg-gradient-to-r from-red-600 to-green-600',
    headerText: 'text-white',
    freeCellBg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
    borderColor: 'border-green-600/30',
    letterColors: {
      B: 'from-red-500 to-red-600',
      I: 'from-green-500 to-green-600',
      N: 'from-red-500 to-red-600',
      G: 'from-green-500 to-green-600',
      O: 'from-red-500 to-red-600',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calm ocean waves',
    cardBg: 'bg-gradient-to-br from-blue-900 to-cyan-900',
    cellBg: 'bg-blue-800/50',
    cellMarked: 'bg-cyan-400 shadow-lg shadow-cyan-400/30',
    cellText: 'text-blue-100',
    cellTextMarked: 'text-blue-900',
    headerBg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    headerText: 'text-white',
    freeCellBg: 'bg-gradient-to-br from-cyan-300 to-blue-400',
    borderColor: 'border-cyan-500/30',
    letterColors: {
      B: 'from-blue-400 to-blue-500',
      I: 'from-cyan-400 to-cyan-500',
      N: 'from-teal-400 to-teal-500',
      G: 'from-blue-500 to-blue-600',
      O: 'from-indigo-400 to-indigo-500',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm sunset gradient',
    cardBg: 'bg-gradient-to-br from-orange-900 to-pink-900',
    cellBg: 'bg-orange-800/50',
    cellMarked: 'bg-yellow-400 shadow-lg shadow-yellow-400/30',
    cellText: 'text-orange-100',
    cellTextMarked: 'text-orange-900',
    headerBg: 'bg-gradient-to-r from-orange-500 to-pink-500',
    headerText: 'text-white',
    freeCellBg: 'bg-gradient-to-br from-yellow-300 to-orange-400',
    borderColor: 'border-orange-500/30',
    letterColors: {
      B: 'from-red-400 to-red-500',
      I: 'from-orange-400 to-orange-500',
      N: 'from-yellow-400 to-yellow-500',
      G: 'from-pink-400 to-pink-500',
      O: 'from-rose-400 to-rose-500',
    },
  },
  galaxy: {
    id: 'galaxy',
    name: 'Galaxy',
    description: 'Deep space vibes',
    cardBg: 'bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950',
    cellBg: 'bg-indigo-900/40',
    cellMarked: 'bg-violet-500 shadow-lg shadow-violet-500/50',
    cellText: 'text-purple-200',
    cellTextMarked: 'text-white',
    headerBg: 'bg-gradient-to-r from-violet-600 to-indigo-600',
    headerText: 'text-white',
    freeCellBg: 'bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg shadow-violet-500/30',
    borderColor: 'border-violet-500/20',
    letterColors: {
      B: 'from-violet-500 to-violet-600',
      I: 'from-purple-500 to-purple-600',
      N: 'from-fuchsia-500 to-fuchsia-600',
      G: 'from-indigo-500 to-indigo-600',
      O: 'from-pink-500 to-pink-600',
    },
  },
};

export const themeList = Object.values(themes);

export function getTheme(themeId: string): CardTheme {
  return themes[themeId] || themes.classic;
}

// Default theme (matches original app style)
export const defaultTheme: CardTheme = {
  id: 'default',
  name: 'Default',
  description: 'Original app style',
  cardBg: 'glass',
  cellBg: 'bg-white/10',
  cellMarked: 'bg-gradient-to-br from-indigo-500 to-purple-600',
  cellText: 'text-white',
  cellTextMarked: 'text-white',
  headerBg: '',
  headerText: 'text-white',
  freeCellBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
  borderColor: 'border-white/10',
  letterColors: {
    B: 'from-red-500 to-red-600',
    I: 'from-orange-500 to-orange-600',
    N: 'from-green-500 to-green-600',
    G: 'from-blue-500 to-blue-600',
    O: 'from-purple-500 to-purple-600',
  },
};

// Add default to themes
themes.default = defaultTheme;
