# Push Notifications Implementation Guide

## Overview

This guide covers implementing push notifications for Five Crowns mobile app using Firebase Cloud Messaging (FCM) via Expo's notification service.

## Notification Types

### 1. Turn Notifications
**When:** Another player completes their turn
**Message:** "Your turn! It's your turn in CardMaster99's game (Round 5)"
**Action:** Opens game board

### 2. Friend Requests
**When:** Someone sends a friend request
**Message:** "New friend request from PlayerName"
**Action:** Opens friends screen

### 3. Game Invitations
**When:** Friend invites you to a game
**Message:** "PlayerName invited you to a game"
**Action:** Opens join game screen

### 4. Game Completed
**When:** Game ends and you're not the last player
**Message:** "Game finished! You placed 2nd with 156 points"
**Action:** Opens game results

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              React Native App                        │
│  ┌──────────────────────────────────────────────┐  │
│  │  Expo Notifications                           │  │
│  │  - Register device token                      │  │
│  │  - Handle incoming notifications              │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────────┐
│              Firebase Cloud Messaging                │
│  - Routes notifications to devices                   │
│  - Handles delivery                                  │
└─────────────────────────────────────────────────────┘
                       ↕
┌─────────────────────────────────────────────────────┐
│              Cloud Functions                         │
│  - onTurnChange trigger                              │
│  - onFriendRequest trigger                           │
│  - onGameInvite trigger                              │
│  - onGameComplete trigger                            │
└─────────────────────────────────────────────────────┘
```

---

## Part 1: Expo Notifications Setup

### 1.1 Install Dependencies

```bash
npx expo install expo-notifications expo-device expo-constants
```

### 1.2 Configure App.json

Update `app.json`:

```json
{
  "expo": {
    "name": "Five Crowns",
    "slug": "five-crowns",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#7B3FF2",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#7B3FF2",
      "androidMode": "default",
      "androidCollapsedTitle": "Five Crowns"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.fivecrowns",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "package": "com.yourcompany.fivecrowns",
      "googleServicesFile": "./google-services.json",
      "permissions": [
        "NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED"
      ]
    }
  }
}
```

### 1.3 Add Google Services Files

**iOS:** Place `GoogleService-Info.plist` in project root
**Android:** Place `google-services.json` in project root

---

## Part 2: React Native Implementation

### 2.1 Notification Service

Create `src/services/firebase/notifications.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { auth, firestore } from './config';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register device for push notifications
 * Returns Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null;

  // Check if physical device
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return null;
  }

  // Get Expo push token
  token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })
  ).data;

  // Android-specific channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7B3FF2',
    });

    // Create turn notification channel
    await Notifications.setNotificationChannelAsync('turns', {
      name: 'Your Turn',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'notification-sound.wav',
    });

    // Create friend request channel
    await Notifications.setNotificationChannelAsync('social', {
      name: 'Friend Requests',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return token;
}

/**
 * Save FCM token to user's Firestore document
 */
export async function saveFCMToken(token: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(firestore, 'users', user.uid);

  await updateDoc(userRef, {
    fcmTokens: arrayUnion(token)
  });

  console.log('FCM token saved to Firestore');
}

/**
 * Remove FCM token from user's Firestore document
 * Call this on logout or when user disables notifications
 */
export async function removeFCMToken(token: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(firestore, 'users', user.uid);

  // Get current tokens
  const userDoc = await getDoc(userRef);
  const currentTokens = userDoc.data()?.fcmTokens || [];

  // Remove specific token
  const updatedTokens = currentTokens.filter((t: string) => t !== token);

  await updateDoc(userRef, {
    fcmTokens: updatedTokens
  });
}

/**
 * Handle notification tap (when user clicks notification)
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  navigation: any
): void {
  const data = response.notification.request.content.data;

  switch (data.type) {
    case 'turn':
      navigation.navigate('GameBoard', {
        gameId: data.gameId,
        gameCode: data.gameCode
      });
      break;

    case 'friend_request':
      navigation.navigate('Friends', {
        highlightRequests: true
      });
      break;

    case 'game_invitation':
      navigation.navigate('JoinGame', {
        gameId: data.gameId
      });
      break;

    case 'game_completed':
      navigation.navigate('GameResults', {
        gameId: data.gameId
      });
      break;

    default:
      navigation.navigate('Home');
  }
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: any
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'notification-sound.wav',
    },
    trigger: { seconds: 1 },
  });
}
```

---

### 2.2 Notification Context

Create `src/context/NotificationContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import {
  registerForPushNotifications,
  saveFCMToken,
  handleNotificationResponse,
} from '../services/firebase/notifications';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  notification: null,
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const navigation = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    // Register for push notifications when user logs in
    if (user) {
      registerForPushNotifications().then(async (token) => {
        if (token) {
          setExpoPushToken(token);
          await saveFCMToken(token);
        }
      });
    }

    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        setNotification(notification);
      }
    );

    // Listener for when user taps notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        handleNotificationResponse(response, navigation);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ expoPushToken, notification }}>
      {children}
    </NotificationContext.Provider>
  );
};
```

---

### 2.3 Use in App.tsx

```typescript
import { NotificationProvider } from './src/context/NotificationContext';
import { NavigationContainer } from '@react-navigation/native';

export default function App() {
  return (
    <NavigationContainer>
      <AuthProvider>
        <NotificationProvider>
          <AppNavigator />
        </NotificationProvider>
      </AuthProvider>
    </NavigationContainer>
  );
}
```

---

## Part 3: Cloud Functions

### 3.1 Initialize Cloud Functions

```bash
cd Planning
mkdir firebase-functions
cd firebase-functions
npm init -y
npm install firebase-admin firebase-functions
npm install -D typescript @types/node
npx tsc --init
```

### 3.2 Turn Notification Function

Create `functions/src/turnNotifications.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Triggered when currentPlayer changes in Realtime Database
 * Sends push notification to the new current player
 */
export const onTurnChange = functions.database
  .ref('/games/{gameCode}/gameState/currentPlayer')
  .onUpdate(async (change, context) => {
    const newCurrentPlayer = change.after.val();
    const previousPlayer = change.before.val();
    const gameCode = context.params.gameCode;

    // Don't send notification if player hasn't actually changed
    if (newCurrentPlayer === previousPlayer) {
      return null;
    }

    console.log(`Turn changed in game ${gameCode} to player ${newCurrentPlayer}`);

    try {
      // Get game metadata from Firestore
      const gamesQuery = await admin.firestore()
        .collection('games')
        .where('joinCode', '==', gameCode)
        .limit(1)
        .get();

      if (gamesQuery.empty) {
        console.error(`No game found with join code ${gameCode}`);
        return null;
      }

      const gameDoc = gamesQuery.docs[0];
      const gameData = gameDoc.data();

      // Get current round from Realtime Database
      const gameStateSnapshot = await admin.database()
        .ref(`games/${gameCode}/gameState`)
        .once('value');

      const gameState = gameStateSnapshot.val();
      const currentRound = gameState?.currentRound || 1;

      // Get user's FCM tokens
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(newCurrentPlayer)
        .get();

      const userData = userDoc.data();

      if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
        console.log(`No FCM tokens found for user ${newCurrentPlayer}`);
        return null;
      }

      // Check if user has notifications enabled
      if (userData.settings?.pushNotifications === false) {
        console.log(`User ${newCurrentPlayer} has notifications disabled`);
        return null;
      }

      // Get host name for notification
      const hostData = gameData.players[gameData.hostId];
      const hostName = hostData?.displayName || 'Someone';

      // Build notification payload
      const payload = {
        notification: {
          title: "Your turn! 👑",
          body: `It's your turn in ${hostName}'s game (Round ${currentRound})`,
        },
        data: {
          type: 'turn',
          gameId: gameDoc.id,
          gameCode: gameCode,
          currentRound: currentRound.toString(),
        },
        android: {
          channelId: 'turns',
          priority: 'high' as const,
          notification: {
            sound: 'notification-sound.wav',
            color: '#7B3FF2',
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'notification-sound.wav',
              badge: 1,
            }
          }
        },
        tokens: userData.fcmTokens,
      };

      // Send notification
      const response = await admin.messaging().sendMulticast(payload);

      console.log(`Sent ${response.successCount} notifications, ${response.failureCount} failed`);

      // Remove invalid tokens
      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            tokensToRemove.push(userData.fcmTokens[idx]);
          }
        });

        if (tokensToRemove.length > 0) {
          await admin.firestore()
            .collection('users')
            .doc(newCurrentPlayer)
            .update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
            });
        }
      }

      // Create in-app notification
      await admin.firestore().collection('notifications').add({
        userId: newCurrentPlayer,
        type: 'turn',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        data: {
          gameId: gameDoc.id,
          gameName: `Game with ${Object.values(gameData.players)
            .filter((p: any) => p.userId !== newCurrentPlayer)
            .map((p: any) => p.displayName)
            .slice(0, 2)
            .join(', ')}`,
          currentRound: currentRound,
          opponentWhoMoved: gameData.players[previousPlayer]?.displayName || 'Player',
        }
      });

      // Update user's activeGames to mark it as their turn
      await admin.firestore()
        .collection('users')
        .doc(newCurrentPlayer)
        .collection('activeGames')
        .doc(gameDoc.id)
        .update({
          isMyTurn: true,
          lastActivity: admin.firestore.FieldValue.serverTimestamp(),
          unreadTurns: admin.firestore.FieldValue.increment(1),
        });

      return null;
    } catch (error) {
      console.error('Error sending turn notification:', error);
      return null;
    }
  });
```

### 3.3 Friend Request Function

Create `functions/src/friendNotifications.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Triggered when a new friendship document is created
 * Sends notification to the friend request recipient
 */
export const onFriendRequest = functions.firestore
  .document('friendships/{friendshipId}')
  .onCreate(async (snapshot, context) => {
    const friendship = snapshot.data();

    // Only send notification for pending requests
    if (friendship.status !== 'pending') {
      return null;
    }

    const senderId = friendship.requestedBy;
    const recipientId = friendship.users.find((id: string) => id !== senderId);

    console.log(`Friend request from ${senderId} to ${recipientId}`);

    try {
      // Get sender info
      const senderDoc = await admin.firestore()
        .collection('users')
        .doc(senderId)
        .get();

      const senderData = senderDoc.data();
      const senderName = senderData?.displayName || 'Someone';

      // Get recipient's FCM tokens
      const recipientDoc = await admin.firestore()
        .collection('users')
        .doc(recipientId)
        .get();

      const recipientData = recipientDoc.data();

      if (!recipientData || !recipientData.fcmTokens || recipientData.fcmTokens.length === 0) {
        console.log(`No FCM tokens found for user ${recipientId}`);
        return null;
      }

      if (recipientData.settings?.pushNotifications === false) {
        console.log(`User ${recipientId} has notifications disabled`);
        return null;
      }

      // Send notification
      const payload = {
        notification: {
          title: "New friend request 👋",
          body: `${senderName} wants to be your friend`,
        },
        data: {
          type: 'friend_request',
          fromUserId: senderId,
          friendshipId: snapshot.id,
        },
        android: {
          channelId: 'social',
        },
        tokens: recipientData.fcmTokens,
      };

      const response = await admin.messaging().sendMulticast(payload);
      console.log(`Sent ${response.successCount} friend request notifications`);

      // Create in-app notification
      await admin.firestore().collection('notifications').add({
        userId: recipientId,
        type: 'friend_request',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        data: {
          fromUserId: senderId,
          fromDisplayName: senderName,
          fromPhotoURL: senderData?.photoURL || null,
        }
      });

      return null;
    } catch (error) {
      console.error('Error sending friend request notification:', error);
      return null;
    }
  });
```

### 3.4 Deploy Cloud Functions

Create `functions/src/index.ts`:

```typescript
import * as admin from 'firebase-admin';

admin.initializeApp();

export { onTurnChange } from './turnNotifications';
export { onFriendRequest } from './friendNotifications';
```

Deploy:

```bash
cd functions
npm run build
firebase deploy --only functions
```

---

## Part 4: Testing Notifications

### 4.1 Test with Expo's Push Notification Tool

```typescript
// In your app, log the Expo push token
const { expoPushToken } = useNotifications();
console.log('Expo Push Token:', expoPushToken);
```

Visit: https://expo.dev/notifications

Paste your token and send test notification.

### 4.2 Test Locally with Function Emulator

```bash
firebase emulators:start
```

Trigger turn change in emulator and check logs.

---

## Part 5: Notification Badge Management

### 5.1 Update Badge Count

```typescript
import * as Notifications from 'expo-notifications';

export async function updateBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// In your app, update badge when games need attention
const { activeGames } = useActiveGames();
const gamesWithMyTurn = activeGames.filter(g => g.isMyTurn);
await updateBadgeCount(gamesWithMyTurn.length);
```

---

## Notification Best Practices

### ✅ Do's
- Keep messages short and actionable
- Include relevant context (game name, round)
- Respect user's notification preferences
- Clean up invalid FCM tokens
- Use appropriate notification channels (Android)
- Test on both iOS and Android

### ❌ Don'ts
- Don't spam users with too many notifications
- Don't send notifications for user's own actions
- Don't include sensitive information
- Don't assume notifications always arrive
- Don't forget to handle notification permissions

---

## Troubleshooting

### Notifications not received:
1. Check FCM token is saved in Firestore
2. Verify Cloud Function is deployed
3. Check Firebase Cloud Messaging logs
4. Ensure device has internet connection
5. Check notification permissions

### iOS specific issues:
- Notifications only work on physical devices
- Ensure Apple Push Notification certificate is configured
- Check iOS app capabilities include "Push Notifications"

### Android specific issues:
- Ensure `google-services.json` is in project root
- Check notification channels are created
- Verify app has notification permissions

---

## Cost Considerations

**Firebase Cloud Messaging:** FREE unlimited
**Cloud Functions:**
- Spark plan: 125K invocations/month free
- Blaze plan: $0.40 per million invocations

**For 100 active users with 5 games/day:**
- ~500 turn changes/day
- ~15K invocations/month
- Cost: FREE (within limits)

---

## Next Steps

1. Implement notification preferences in settings
2. Add notification history screen
3. Implement "mute game" feature
4. Add notification sounds
5. Test on physical devices
6. Monitor notification delivery rates

