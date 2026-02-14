# Quick Wins Design: Sound Effects, Live Feed, Chat Reactions

## Feature 1: Sound Effects & Vibration

Synthesized sounds via Web Audio API. Haptic feedback via `navigator.vibrate()`.

**Sounds:**
- Cell tap: short click (50ms sine wave)
- Number drawn: ascending chime (200ms)
- BINGO detected: fanfare sequence (500ms)
- Winner announced: celebration (longer sequence)

**Controls:**
- Mute toggle button in player header and display header
- Mute state saved to localStorage
- Display screen chime plays on each new number

## Feature 2: Live Activity Feed

New `game_events` table in Supabase for real-time events.

**Schema:**
```sql
CREATE TABLE game_events (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id),
  event_type TEXT NOT NULL, -- 'number_called', 'player_joined', 'reaction', 'bingo_claimed'
  player_name TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Display:** Scrolling ticker on display screen showing recent events.
Auto-cleans on new game.

## Feature 3: Chat & Emoji Reactions

Quick reactions only (no text chat). 6 emojis: party, surprised, laughing, fire, crying, clapping.

**Player side:** Reaction bar at bottom of card screen. Tap to send. Rate-limited 1 per 3 seconds.

**Display side:** Floating bubbles rise from bottom of screen (like Twitch/TikTok). Fade out after 3 seconds.

**Data:** Uses game_events table with event_type='reaction', data={emoji, playerName}.

## Implementation Order
1. Sound effects (standalone, no DB changes)
2. Game events table + activity feed (DB + display)
3. Reactions (player UI + display bubbles, uses events table)
