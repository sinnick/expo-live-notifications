import { EventEmitter, Subscription } from 'expo-modules-core';
import ExpoPersistentNotificationsModule from './ExpoPersistentNotificationsModule';

// Export all types
export * from './types';

// Import types
import type {
  PersistentNotificationOptions,
  NotificationChannel,
  NotificationContent,
  NotificationAction,
  NotificationActionEvent,
  NotificationUpdateEvent,
  ServiceStatusEvent,
  PermissionResponse,
} from './types';

// Event emitter for notification events
const emitter = new EventEmitter(ExpoPersistentNotificationsModule);

/**
 * Create a notification channel (Android 8+ required, no-op on iOS)
 * Must be called before showing notifications on Android
 *
 * @param channel Channel configuration
 *
 * @example
 * ```ts
 * await createNotificationChannel({
 *   id: 'location-tracking',
 *   name: 'Location Tracking',
 *   description: 'Notifications for active location tracking',
 *   importance: 'high',
 * });
 * ```
 */
export async function createNotificationChannel(
  channel: NotificationChannel
): Promise<void> {
  return ExpoPersistentNotificationsModule.createChannel(channel);
}

/**
 * Start a persistent notification with optional location tracking
 *
 * On Android: Starts a foreground service that keeps the app alive
 * On iOS: Schedules a local notification (can be dismissed by user)
 *
 * @param options Notification configuration
 *
 * @example
 * ```ts
 * await startPersistentNotification({
 *   id: 'bus-tracking',
 *   content: {
 *     title: 'Tracking Location',
 *     body: 'Next bus in 5 minutes',
 *   },
 *   actions: [
 *     { id: 'view-map', title: 'View Map' },
 *     { id: 'stop-tracking', title: 'Stop' },
 *   ],
 *   android: {
 *     channelId: 'location-tracking',
 *     color: '#2196F3',
 *     ongoing: true,
 *   },
 * });
 * ```
 */
export async function startPersistentNotification(
  options: PersistentNotificationOptions
): Promise<void> {
  return ExpoPersistentNotificationsModule.startPersistentNotification(options);
}

/**
 * Update the content of an active persistent notification
 * Useful for updating time remaining, progress, or status
 *
 * @param id Notification identifier
 * @param content Updated notification content
 *
 * @example
 * ```ts
 * await updateNotificationContent('bus-tracking', {
 *   title: 'Tracking Location',
 *   body: 'Next bus in 3 minutes',
 * });
 * ```
 */
export async function updateNotificationContent(
  id: string,
  content: NotificationContent
): Promise<void> {
  return ExpoPersistentNotificationsModule.updateNotificationContent(id, content);
}

/**
 * Update the action buttons of an active notification
 *
 * @param id Notification identifier
 * @param actions New array of actions
 */
export async function updateNotificationActions(
  id: string,
  actions: NotificationAction[]
): Promise<void> {
  return ExpoPersistentNotificationsModule.updateNotificationActions(id, actions);
}

/**
 * Stop the persistent notification and associated service
 *
 * @param id Notification identifier
 *
 * @example
 * ```ts
 * await stopPersistentNotification('bus-tracking');
 * ```
 */
export async function stopPersistentNotification(id: string): Promise<void> {
  return ExpoPersistentNotificationsModule.stopPersistentNotification(id);
}

/**
 * Check if a notification is currently active
 *
 * @param id Notification identifier
 * @returns True if the notification is active
 */
export async function isNotificationActive(id: string): Promise<boolean> {
  return ExpoPersistentNotificationsModule.isNotificationActive(id);
}

/**
 * Request permissions for notifications and location
 *
 * @returns Permission status for notifications and location
 *
 * @example
 * ```ts
 * const { status, notifications, location } = await requestPermissions();
 * if (status === 'granted') {
 *   console.log('All permissions granted');
 * }
 * ```
 */
export async function requestPermissions(): Promise<PermissionResponse> {
  return ExpoPersistentNotificationsModule.requestPermissions();
}

/**
 * Get current permission status without requesting
 *
 * @returns Current permission status
 */
export async function getPermissionStatus(): Promise<PermissionResponse> {
  return ExpoPersistentNotificationsModule.getPermissionStatus();
}

/**
 * Set custom notification icon (Android only)
 * Icon file should be placed in android/app/src/main/res/drawable/
 *
 * @param iconName Icon resource name (without extension)
 *
 * @example
 * ```ts
 * await setNotificationIcon('ic_bus_notification');
 * ```
 */
export async function setNotificationIcon(iconName: string): Promise<void> {
  return ExpoPersistentNotificationsModule.setNotificationIcon(iconName);
}

/**
 * Listen for notification action button presses
 *
 * @param listener Callback function
 * @returns Subscription object with remove() method
 *
 * @example
 * ```ts
 * const subscription = addNotificationActionListener((event) => {
 *   if (event.actionId === 'view-map') {
 *     // Navigate to map screen
 *   } else if (event.actionId === 'stop-tracking') {
 *     stopPersistentNotification(event.notificationId);
 *   }
 * });
 *
 * // Later, remove the listener
 * subscription.remove();
 * ```
 */
export function addNotificationActionListener(
  listener: (event: NotificationActionEvent) => void
): Subscription {
  return emitter.addListener('onNotificationAction', listener);
}

/**
 * Listen for notification content updates
 *
 * @param listener Callback function
 * @returns Subscription object with remove() method
 */
export function addNotificationUpdateListener(
  listener: (event: NotificationUpdateEvent) => void
): Subscription {
  return emitter.addListener('onNotificationUpdate', listener);
}

/**
 * Listen for service status changes
 * Emitted when tracking starts or stops
 *
 * @param listener Callback function
 * @returns Subscription object with remove() method
 *
 * @example
 * ```ts
 * const subscription = addServiceStatusListener((event) => {
 *   console.log('Service running:', event.isRunning);
 * });
 * ```
 */
export function addServiceStatusListener(
  listener: (event: ServiceStatusEvent) => void
): Subscription {
  return emitter.addListener('onServiceStatusChange', listener);
}

/**
 * Convenience function for location tracking with bus arrival updates
 * This is a higher-level API specifically for the bus tracking use case
 *
 * @param arrivalMinutes Minutes until bus arrival
 * @param channelId Notification channel ID
 * @returns Object with update and stop functions
 *
 * @example
 * ```ts
 * const tracking = await startBusTracking(5, 'bus-tracking');
 *
 * // Update every second
 * const interval = setInterval(() => {
 *   const newTime = calculateTimeRemaining();
 *   tracking.updateArrivalTime(newTime);
 * }, 1000);
 *
 * // Stop tracking
 * await tracking.stop();
 * clearInterval(interval);
 * ```
 */
export async function startBusTracking(
  arrivalMinutes: number,
  channelId: string = 'location-tracking'
) {
  const notificationId = 'bus-tracking-' + Date.now();

  await startPersistentNotification({
    id: notificationId,
    arrivalMinutes: arrivalMinutes, // ← El servicio nativo usará esto para auto-actualizar
    content: {
      title: 'Rastreando ubicación',
      body: `Próximo bus en ${arrivalMinutes} minutos`,
    },
    actions: [
      { id: 'view-map', title: 'Ver mapa', foreground: true },
      { id: 'stop-tracking', title: 'Detener' },
    ],
    android: {
      channelId,
      color: '#2196F3',
      ongoing: true,
      priority: 'high',
    },
    ios: {
      sound: 'default',
    },
  });

  return {
    id: notificationId,
    /**
     * Stop tracking and remove notification
     */
    stop: async () => {
      await stopPersistentNotification(notificationId);
    },
  };
}
