/**
 * Content that will be displayed in the notification
 */
export interface NotificationContent {
  /** Notification title */
  title: string;
  /** Notification body/message */
  body: string;
  /** Additional custom data */
  data?: Record<string, any>;
}

/**
 * Action button configuration for notifications
 */
export interface NotificationAction {
  /** Unique identifier for the action */
  id: string;
  /** Text displayed on the action button */
  title: string;
  /** Icon name for Android (optional) */
  icon?: string;
  /** Whether this action should trigger app to open in foreground (default: false) */
  foreground?: boolean;
}

/**
 * Android-specific notification options
 */
export interface AndroidNotificationOptions {
  /** Notification channel ID (required for Android 8+) */
  channelId: string;
  /** Small icon resource name (e.g., 'ic_notification') */
  smallIcon?: string;
  /** Large icon resource name or URI */
  largeIcon?: string;
  /** Notification color in hex format (e.g., '#FF5722') */
  color?: string;
  /** Whether notification is ongoing and cannot be dismissed */
  ongoing?: boolean;
  /** Priority level */
  priority?: 'default' | 'high' | 'low' | 'min' | 'max';
  /** Enable vibration */
  vibrate?: boolean;
  /** Sound file name */
  sound?: string;
  /** Show chronometer (useful for timers) */
  showChronometer?: boolean;
  /** When chronometer started (timestamp in milliseconds) */
  chronometerBase?: number;
  /** Show progress bar */
  showProgress?: boolean;
  /** Progress bar max value */
  progressMax?: number;
  /** Current progress value */
  progressCurrent?: number;
  /** Indeterminate progress */
  progressIndeterminate?: boolean;
}

/**
 * iOS-specific notification options
 */
export interface IOSNotificationOptions {
  /** Badge number to show on app icon */
  badge?: number;
  /** Sound file name */
  sound?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Category identifier for custom actions */
  categoryIdentifier?: string;
  /** Thread identifier for grouping notifications */
  threadIdentifier?: string;
}

/**
 * Options for creating/updating a persistent notification
 */
export interface PersistentNotificationOptions {
  /** Unique identifier for this notification */
  id: string;
  /** Notification content */
  content: NotificationContent;
  /**
   * Arrival time in minutes (for bus tracking)
   * The native service will automatically update the notification countdown
   */
  arrivalMinutes?: number;
  /** Action buttons (max 3 recommended) */
  actions?: NotificationAction[];
  /** Android-specific options */
  android?: AndroidNotificationOptions;
  /** iOS-specific options */
  ios?: IOSNotificationOptions;
}

/**
 * Notification channel configuration (Android only)
 */
export interface NotificationChannel {
  /** Unique channel identifier */
  id: string;
  /** User-visible channel name */
  name: string;
  /** Channel description */
  description?: string;
  /** Importance level */
  importance?: 'default' | 'high' | 'low' | 'min' | 'max';
  /** Enable vibration for this channel */
  vibrate?: boolean;
  /** Sound file for this channel */
  sound?: string;
  /** Show badge */
  showBadge?: boolean;
}

/**
 * Event emitted when notification action is pressed
 */
export interface NotificationActionEvent {
  /** Notification ID */
  notificationId: string;
  /** Action ID that was pressed */
  actionId: string;
  /** Custom data from the notification */
  data?: Record<string, any>;
}

/**
 * Event emitted when notification is updated
 */
export interface NotificationUpdateEvent {
  /** Notification ID */
  id: string;
  /** Updated content */
  content?: NotificationContent;
}

/**
 * Event emitted when tracking service status changes
 */
export interface ServiceStatusEvent {
  /** Whether the service is currently running */
  isRunning: boolean;
  /** Associated notification ID */
  notificationId?: string;
}

/**
 * Permission status
 */
export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Result of permission request
 */
export interface PermissionResponse {
  /** Overall permission status */
  status: PermissionStatus;
  /** Whether notifications are granted */
  notifications: boolean;
  /** Whether location permissions are granted (Android only) */
  location?: boolean;
}
