# Code Migration Guide: Web to React Native

## Overview

This guide shows how to port existing game logic from the web app (`js/` folder) to React Native. We'll convert vanilla JavaScript to TypeScript with React Native components.

## Migration Strategy

### What to Reuse
✅ **Core Game Logic** - Card validation, scoring, deck management
✅ **Firebase Realtime Database structure** - Keep game state structure
✅ **Game rules** - Wild cards, sets, runs, round progression
✅ **Business logic** - Turn management, "go out" validation

### What to Rebuild
🔨 **UI Components** - HTML/CSS → React Native components
🔨 **Event Handlers** - Mouse/touch events → React Native gestures
🔨 **State Management** - DOM manipulation → React state/hooks
🔨 **Navigation** - Window.location → React Navigation

---

## Part 1: Type Definitions

First, create TypeScript interfaces for all game entities.

### File: `src/types/game.ts`

```typescript
// Card types
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'stars' | 'joker';
export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Joker';

export interface Card {
  rank: Rank;
  suit: Suit;
  id: string;
}

// Game state types
export type GameStatus = 'waiting' | 'playing' | 'completed' | 'abandoned';
export type TurnPhase = 'WAITING_FOR_DRAW' | 'WAITING_FOR_DISCARD' | 'ROUND_COMPLETE';

export interface PlayerHand {
  [playerId: string]: Card[];
}

export interface PlayerScores {
  [playerId: string]: number;
}

export interface GameState {
  currentRound: number;
  currentPlayer: string;
  turnPhase: TurnPhase;
  deck: Card[];
  discardPile: Card[];
  playerHands: PlayerHand;
  playerScores: PlayerScores;
  roundScores: PlayerScores;
  firstPlayerOut?: string;
  playersRemaining: string[];
  firstPlayerThisRound: string;
  lastUpdated: number;
  updatedBy: string;
}

export interface Player {
  userId: string;
  displayName: string;
  photoURL?: string;
  isHost: boolean;
  joinedAt: number;
  isReady: boolean;
  totalScore: number;
  currentRoundScore: number;
  isActive: boolean;
  lastActivity: number;
}

export interface GameMetadata {
  gameId: string;
  joinCode: string;
  status: GameStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  hostId: string;
  players: { [userId: string]: Player };
  settings: {
    highlightWilds: boolean;
    maxPlayers: number;
  };
  currentRound: number;
  currentTurn: string;
  winner?: string;
}
```

---

## Part 2: Deck Management

Port deck creation and shuffling logic.

### Original Code (`js/lobby.js` lines 521-564)

```javascript
function createFiveCrownsDeck() {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs', 'stars'];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];

    for (let copy = 0; copy < 2; copy++) {
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({
                    rank: rank,
                    suit: suit,
                    id: `${rank}-${suit}-${copy}`
                });
            }
        }
    }

    for (let i = 0; i < 6; i++) {
        deck.push({
            rank: 'Joker',
            suit: 'joker',
            id: `joker-${i}`
        });
    }

    return deck;
}

function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
```

### Migrated Code: `src/services/game/deckManager.ts`

```typescript
import { Card, Suit, Rank } from '../../types/game';

/**
 * Creates a Five Crowns deck (116 cards total)
 * - 5 suits × 11 ranks × 2 copies = 110 cards
 * - 6 Jokers (always wild)
 */
export const createFiveCrownsDeck = (): Card[] => {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs', 'stars'];
  const ranks: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  // Add regular cards (2 copies each)
  for (let copy = 0; copy < 2; copy++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          rank,
          suit,
          id: `${rank}-${suit}-${copy}`
        });
      }
    }
  }

  // Add 6 Jokers
  for (let i = 0; i < 6; i++) {
    deck.push({
      rank: 'Joker',
      suit: 'joker',
      id: `joker-${i}`
    });
  }

  return deck;
};

/**
 * Shuffles a deck using Fisher-Yates algorithm
 */
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

/**
 * Deals cards from deck to players
 */
export const dealCards = (
  deck: Card[],
  playerIds: string[],
  cardsPerPlayer: number
): { hands: { [playerId: string]: Card[] }, remainingDeck: Card[] } => {
  const shuffled = shuffleDeck(deck);
  const hands: { [playerId: string]: Card[] } = {};

  playerIds.forEach(playerId => {
    hands[playerId] = [];
    for (let i = 0; i < cardsPerPlayer; i++) {
      const card = shuffled.pop();
      if (card) {
        hands[playerId].push(card);
      }
    }
  });

  return {
    hands,
    remainingDeck: shuffled
  };
};
```

---

## Part 3: Card Validation Logic

Port the card validation and meld detection.

### Original Code (from `js/game.js`)

```javascript
function isValidSet(cards) {
    if (cards.length < 3) return false;
    const rank = cards[0].rank;
    return cards.every(card => card.rank === rank || isWildCard(card));
}

function isValidRun(cards) {
    if (cards.length < 3) return false;
    const suit = cards.find(c => !isWildCard(c))?.suit;
    if (!suit) return cards.length >= 3;

    const nonWildCards = cards.filter(c => !isWildCard(c));
    if (!nonWildCards.every(c => c.suit === suit)) return false;

    // Check consecutive ranks...
}

function isWildCard(card) {
    const currentRound = gameState.currentRound;
    const wildRank = getWildRankForRound(currentRound);
    return card.rank === 'Joker' || card.rank === wildRank;
}
```

### Migrated Code: `src/services/game/cardLogic.ts`

```typescript
import { Card, Rank } from '../../types/game';

/**
 * Get the wild rank for a given round
 * Round 1: 3s, Round 2: 4s, ..., Round 11: Kings
 */
export const getWildRankForRound = (round: number): Rank => {
  const wildRanks: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return wildRanks[round - 1] || '3';
};

/**
 * Check if a card is wild for the current round
 */
export const isWildCard = (card: Card, currentRound: number): boolean => {
  if (card.rank === 'Joker') return true;
  const wildRank = getWildRankForRound(currentRound);
  return card.rank === wildRank;
};

/**
 * Check if cards form a valid set (same rank, different suits)
 */
export const isValidSet = (cards: Card[], currentRound: number): boolean => {
  if (cards.length < 3) return false;

  // Find first non-wild card to get the target rank
  const nonWildCard = cards.find(c => !isWildCard(c, currentRound));
  if (!nonWildCard) {
    // All wild cards - valid set
    return true;
  }

  const targetRank = nonWildCard.rank;

  // All cards must be same rank or wild
  return cards.every(card =>
    card.rank === targetRank || isWildCard(card, currentRound)
  );
};

/**
 * Check if cards form a valid run (consecutive ranks, same suit)
 */
export const isValidRun = (cards: Card[], currentRound: number): boolean => {
  if (cards.length < 3) return false;

  // Find first non-wild card to get the suit
  const nonWildCard = cards.find(c => !isWildCard(c, currentRound));
  if (!nonWildCard) {
    // All wild cards - assume valid run
    return true;
  }

  const targetSuit = nonWildCard.suit;

  // All non-wild cards must be same suit
  const nonWildCards = cards.filter(c => !isWildCard(c, currentRound));
  if (!nonWildCards.every(c => c.suit === targetSuit)) {
    return false;
  }

  // Check if ranks are consecutive
  const rankOrder: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const ranks = nonWildCards.map(c => rankOrder.indexOf(c.rank)).sort((a, b) => a - b);

  // With wild cards, check if we can fill gaps
  const wildCount = cards.length - nonWildCards.length;
  const minRank = ranks[0];
  const maxRank = ranks[ranks.length - 1];
  const expectedLength = maxRank - minRank + 1;

  // Check if we have enough cards to fill the run
  return expectedLength <= cards.length;
};

/**
 * Get card point value for scoring
 */
export const getCardValue = (card: Card): number => {
  if (card.rank === 'Joker') return 50;
  if (card.rank === 'J') return 11;
  if (card.rank === 'Q') return 12;
  if (card.rank === 'K') return 13;
  return parseInt(card.rank);
};

/**
 * Calculate score for ungrouped cards
 */
export const calculateScore = (cards: Card[]): number => {
  return cards.reduce((sum, card) => sum + getCardValue(card), 0);
};
```

---

## Part 4: Firebase Integration

### Original Code (`js/lobby.js` - Firebase listeners)

```javascript
gameRef.on('value', (snapshot) => {
    if (!snapshot.exists()) {
        console.error('Game not found');
        return;
    }
    currentGameData = snapshot.val();
    updateUI();
});
```

### Migrated Code: `src/hooks/useGameState.ts`

```typescript
import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { realtimeDb } from '../services/firebase/config';
import { GameState } from '../types/game';

export const useGameState = (gameCode: string) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const gameRef = ref(realtimeDb, `games/${gameCode}`);

    const unsubscribe = onValue(
      gameRef,
      (snapshot) => {
        setLoading(false);

        if (!snapshot.exists()) {
          setError('Game not found');
          return;
        }

        const data = snapshot.val();
        setGameState(data.gameState);
        setError(null);
      },
      (error) => {
        setLoading(false);
        setError(error.message);
      }
    );

    return () => {
      off(gameRef);
    };
  }, [gameCode]);

  return { gameState, loading, error };
};
```

### Usage in Component:

```typescript
import { useGameState } from '../hooks/useGameState';

const GameBoardScreen = ({ route }) => {
  const { gameCode } = route.params;
  const { gameState, loading, error } = useGameState(gameCode);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!gameState) return null;

  return (
    <View>
      <Text>Round: {gameState.currentRound}</Text>
      <Text>Current Player: {gameState.currentPlayer}</Text>
      {/* Render game board */}
    </View>
  );
};
```

---

## Part 5: Card Component Migration

### Original Code (HTML/CSS)

```html
<div class="card" data-card-id="5-hearts-0">
    <div class="card-rank">5</div>
    <div class="card-suit">♥</div>
</div>
```

```css
.card {
    width: 60px;
    height: 90px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
```

### Migrated Code: `src/components/cards/Card.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card as CardType } from '../../types/game';

interface CardProps {
  card: CardType;
  isWild?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const SUIT_SYMBOLS = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  stars: '⭐',
  joker: '🃏'
};

const SUIT_COLORS = {
  spades: '#000000',
  hearts: '#DC2626',
  diamonds: '#DC2626',
  clubs: '#000000',
  stars: '#FFD700',
  joker: '#7B3FF2'
};

export const Card: React.FC<CardProps> = ({
  card,
  isWild = false,
  isSelected = false,
  onPress,
  size = 'medium'
}) => {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];

  const cardStyle = [
    styles.card,
    styles[size],
    isSelected && styles.selected,
    isWild && styles.wild
  ];

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <Text style={[styles.rank, { color: suitColor }]}>
          {card.rank}
        </Text>
        <Text style={[styles.suit, { color: suitColor }]}>
          {suitSymbol}
        </Text>
      </View>
      {isWild && (
        <View style={styles.wildBadge}>
          <Text style={styles.wildText}>WILD</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  small: {
    width: 40,
    height: 60,
  },
  medium: {
    width: 60,
    height: 90,
  },
  large: {
    width: 80,
    height: 120,
  },
  cardContent: {
    alignItems: 'center',
  },
  rank: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  suit: {
    fontSize: 28,
    marginTop: 4,
  },
  selected: {
    borderWidth: 3,
    borderColor: '#7B3FF2',
    transform: [{ translateY: -10 }],
  },
  wild: {
    backgroundColor: '#FEF3C7',
  },
  wildBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  wildText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  }
});
```

---

## Part 6: Drag and Drop Migration

### Original Code (Mouse events)

```javascript
card.addEventListener('mousedown', handleCardMouseDown);
card.addEventListener('touchstart', handleCardTouchStart);

function handleCardMouseDown(e) {
    selectedCard = e.target;
    // Drag logic...
}
```

### Migrated Code: Using `react-native-gesture-handler`

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';

export const DraggableCard: React.FC<CardProps> = ({ card, onDrop }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      // Check if dropped on discard pile
      const isOverDiscardPile = checkDropZone(translateX.value, translateY.value);

      if (isOverDiscardPile) {
        onDrop(card);
      }

      // Reset position
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value }
    ]
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <Card card={card} />
      </Animated.View>
    </GestureDetector>
  );
};
```

---

## Part 7: Turn Management

### Original Code (`js/game.js`)

```javascript
async function handleDrawFromDeck() {
    if (turnPhase !== 'WAITING_FOR_DRAW') return;

    const card = deck.pop();
    playerHands[currentPlayerId].push(card);

    await gameRef.update({
        'gameState/deck': deck,
        'gameState/playerHands': playerHands,
        'gameState/turnPhase': 'WAITING_FOR_DISCARD'
    });
}
```

### Migrated Code: `src/services/game/turnManager.ts`

```typescript
import { ref, update } from 'firebase/database';
import { realtimeDb } from '../firebase/config';
import { GameState, Card } from '../../types/game';

export const drawFromDeck = async (
  gameCode: string,
  currentPlayerId: string,
  gameState: GameState
): Promise<void> => {
  if (gameState.turnPhase !== 'WAITING_FOR_DRAW') {
    throw new Error('Cannot draw card right now');
  }

  const deck = [...gameState.deck];
  const card = deck.pop();

  if (!card) {
    throw new Error('Deck is empty');
  }

  const playerHands = { ...gameState.playerHands };
  playerHands[currentPlayerId] = [...playerHands[currentPlayerId], card];

  const gameRef = ref(realtimeDb, `games/${gameCode}/gameState`);

  await update(gameRef, {
    deck,
    playerHands,
    turnPhase: 'WAITING_FOR_DISCARD',
    lastUpdated: Date.now(),
    updatedBy: currentPlayerId
  });
};

export const drawFromDiscard = async (
  gameCode: string,
  currentPlayerId: string,
  gameState: GameState
): Promise<void> => {
  if (gameState.turnPhase !== 'WAITING_FOR_DRAW') {
    throw new Error('Cannot draw card right now');
  }

  const discardPile = [...gameState.discardPile];
  const card = discardPile.pop();

  if (!card) {
    throw new Error('Discard pile is empty');
  }

  const playerHands = { ...gameState.playerHands };
  playerHands[currentPlayerId] = [...playerHands[currentPlayerId], card];

  const gameRef = ref(realtimeDb, `games/${gameCode}/gameState`);

  await update(gameRef, {
    discardPile,
    playerHands,
    turnPhase: 'WAITING_FOR_DISCARD',
    lastUpdated: Date.now(),
    updatedBy: currentPlayerId
  });
};

export const discardCard = async (
  gameCode: string,
  currentPlayerId: string,
  cardToDiscard: Card,
  gameState: GameState,
  playerIds: string[]
): Promise<void> => {
  if (gameState.turnPhase !== 'WAITING_FOR_DISCARD') {
    throw new Error('Cannot discard card right now');
  }

  // Remove card from hand
  const playerHands = { ...gameState.playerHands };
  const hand = playerHands[currentPlayerId].filter(c => c.id !== cardToDiscard.id);
  playerHands[currentPlayerId] = hand;

  // Add to discard pile
  const discardPile = [...gameState.discardPile, cardToDiscard];

  // Next player
  const currentIndex = playerIds.indexOf(currentPlayerId);
  const nextIndex = (currentIndex + 1) % playerIds.length;
  const nextPlayer = playerIds[nextIndex];

  const gameRef = ref(realtimeDb, `games/${gameCode}/gameState`);

  await update(gameRef, {
    playerHands,
    discardPile,
    currentPlayer: nextPlayer,
    turnPhase: 'WAITING_FOR_DRAW',
    lastUpdated: Date.now(),
    updatedBy: currentPlayerId
  });
};
```

---

## Summary: Migration Checklist

### ✅ Completed
- [x] Type definitions created
- [x] Deck management ported
- [x] Card validation logic ported
- [x] Firebase hooks created
- [x] Card component built
- [x] Turn management functions ported

### 🔄 Next Steps
1. Port scoring logic
2. Implement "Go Out" validation
3. Create game board layout
4. Add animations
5. Implement push notifications
6. Test multiplayer sync

### 📝 Key Differences

| Web App | React Native |
|---------|--------------|
| `document.querySelector()` | `useState()` hooks |
| `element.addEventListener()` | `onPress` props |
| CSS classes | StyleSheet objects |
| Mouse events | Touch/Gesture handlers |
| `window.location` | React Navigation |
| Direct DOM manipulation | State-driven rendering |

---

## Testing Strategy

1. **Unit Tests** - Test game logic functions in isolation
2. **Integration Tests** - Test Firebase sync
3. **UI Tests** - Test component rendering
4. **E2E Tests** - Test full game flow on devices

Example unit test:

```typescript
import { isValidSet } from '../cardLogic';

describe('Card Validation', () => {
  it('should validate a set of three matching cards', () => {
    const cards = [
      { rank: '7', suit: 'hearts', id: '1' },
      { rank: '7', suit: 'spades', id: '2' },
      { rank: '7', suit: 'clubs', id: '3' }
    ];
    expect(isValidSet(cards, 1)).toBe(true);
  });
});
```

---

**Next:** See [push-notifications-guide.md](push-notifications-guide.md) for notification implementation.
