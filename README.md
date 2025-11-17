# expo-persistent-notifications

Expo native module for persistent and dynamic notifications with location tracking and real-time updates on Android and iOS.

## Features

- **Persistent notifications** that stay visible while your app tracks location or performs ongoing tasks
- **Dynamic updates** to notification content in real-time (perfect for bus arrival times, progress tracking, etc.)
- **Action buttons** (up to 3) for interactive notifications
- **Custom icons and colors** (Android)
- **Foreground service** on Android for guaranteed execution
- **Location tracking** support with proper permissions handling
- **TypeScript** support with full type definitions

## Installation

```bash
npm install expo-persistent-notifications
```

Or with yarn:

```bash
yarn add expo-persistent-notifications
```

## Configuration

### Add the config plugin to your app.json/app.config.js:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-persistent-notifications",
        {
          "locationAlwaysAndWhenInUsePermission": "This app needs location access to track bus arrivals.",
          "locationWhenInUsePermission": "This app needs location access to track bus arrivals."
        }
      ]
    ]
  }
}
```

### Rebuild your app:

```bash
npx expo prebuild
npx expo run:android
# or
npx expo run:ios
```

## Usage

### Basic Example

```typescript
import {
  createNotificationChannel,
  startPersistentNotification,
  updateNotificationContent,
  stopPersistentNotification,
  requestPermissions,
  addNotificationActionListener,
} from 'expo-persistent-notifications';

// Request permissions first
const { status } = await requestPermissions();
if (status !== 'granted') {
  console.log('Permissions not granted');
  return;
}

// Create notification channel (Android only, required)
await createNotificationChannel({
  id: 'location-tracking',
  name: 'Location Tracking',
  description: 'Notifications for active location tracking',
  importance: 'high',
});

// Start persistent notification
await startPersistentNotification({
  id: 'bus-tracking',
  content: {
    title: 'Rastreando ubicación',
    body: 'Próximo bus en 5 minutos',
  },
  actions: [
    { id: 'view-map', title: 'Ver mapa', foreground: true },
    { id: 'stop-tracking', title: 'Detener' },
  ],
  android: {
    channelId: 'location-tracking',
    color: '#2196F3',
    ongoing: true,
  },
  ios: {
    badge: 1,
  },
});

// Listen for action button presses
const subscription = addNotificationActionListener((event) => {
  if (event.actionId === 'view-map') {
    // Navigate to map screen
    navigation.navigate('Map');
  } else if (event.actionId === 'stop-tracking') {
    stopPersistentNotification(event.notificationId);
  }
});

// Update notification content (e.g., every second)
setInterval(() => {
  const minutes = calculateTimeRemaining();
  updateNotificationContent('bus-tracking', {
    title: 'Rastreando ubicación',
    body: `Próximo bus en ${minutes} minutos`,
  });
}, 1000);

// Stop notification when done
await stopPersistentNotification('bus-tracking');

// Clean up listener
subscription.remove();
```

### Bus Tracking Convenience API

For the specific use case of tracking bus arrivals:

```typescript
import { startBusTracking } from 'expo-persistent-notifications';

// Start tracking with initial arrival time (5 minutes)
const tracking = await startBusTracking(5, 'location-tracking');

// Update arrival time every second
const interval = setInterval(() => {
  const newTime = calculateTimeRemaining();
  tracking.updateArrivalTime(newTime);
}, 1000);

// Stop tracking
await tracking.stop();
clearInterval(interval);
```

## API Reference

### Functions

#### `createNotificationChannel(channel: NotificationChannel): Promise<void>`

Create a notification channel (Android 8+ required, no-op on iOS).

**Parameters:**
- `channel.id` (string): Unique channel identifier
- `channel.name` (string): User-visible channel name
- `channel.description` (string, optional): Channel description
- `channel.importance` (string, optional): 'default' | 'high' | 'low' | 'min' | 'max'
- `channel.vibrate` (boolean, optional): Enable vibration
- `channel.showBadge` (boolean, optional): Show badge

#### `startPersistentNotification(options: PersistentNotificationOptions): Promise<void>`

Start a persistent notification.

**Parameters:**
- `options.id` (string): Unique notification identifier
- `options.content` (NotificationContent): Title, body, and optional data
- `options.actions` (NotificationAction[], optional): Action buttons (max 3)
- `options.android` (AndroidNotificationOptions, optional): Android-specific options
- `options.ios` (IOSNotificationOptions, optional): iOS-specific options

#### `updateNotificationContent(id: string, content: NotificationContent): Promise<void>`

Update the content of an active notification.

#### `stopPersistentNotification(id: string): Promise<void>`

Stop a persistent notification and associated service.

#### `isNotificationActive(id: string): Promise<boolean>`

Check if a notification is currently active.

#### `requestPermissions(): Promise<PermissionResponse>`

Request notifications and location permissions.

#### `getPermissionStatus(): Promise<PermissionResponse>`

Get current permission status without requesting.

### Event Listeners

#### `addNotificationActionListener(callback): Subscription`

Listen for notification action button presses.

#### `addNotificationUpdateListener(callback): Subscription`

Listen for notification content updates.

#### `addServiceStatusListener(callback): Subscription`

Listen for service status changes (started/stopped).

## Platform Differences

### Android
- Uses **Foreground Service** that keeps the app process alive
- Notifications are **truly persistent** and ongoing
- Supports **custom icons and colors**
- Requires **notification channels** (API 26+)
- POST_NOTIFICATIONS permission required on API 33+

### iOS
- Uses **local notifications** that can be updated
- Notifications **can be dismissed** by the user (iOS design)
- No true "foreground service" equivalent
- Limited background execution time
- Background location tracking requires additional configuration

## Permissions

### Android
- `FOREGROUND_SERVICE` - Required for foreground service
- `FOREGROUND_SERVICE_LOCATION` - For location tracking
- `POST_NOTIFICATIONS` - For showing notifications (API 33+)
- `ACCESS_FINE_LOCATION` - For precise location
- `WAKE_LOCK` - Keep device awake

### iOS
- Notification authorization
- Location "Always" or "When In Use" permission

## Examples

See the `/example` directory for a complete working example demonstrating:
- Permission requests
- Starting/stopping notifications
- Real-time updates
- Action button handling
- Bus arrival time tracking

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions, please use the GitHub issue tracker.
# expo-live-notifications
# expo-live-notifications
