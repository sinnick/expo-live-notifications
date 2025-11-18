package expo.modules.persistentnotifications

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

object NotificationHelper {
  private var customIconName: String? = null

  /**
   * Create a notification channel (Android 8.0+)
   */
  fun createChannel(
    context: Context,
    channelId: String,
    channelName: String,
    description: String?,
    importance: String?,
    vibrate: Boolean,
    sound: String?,
    showBadge: Boolean
  ) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val importanceLevel = when (importance) {
        "high" -> NotificationManager.IMPORTANCE_HIGH
        "low" -> NotificationManager.IMPORTANCE_LOW
        "min" -> NotificationManager.IMPORTANCE_MIN
        "max" -> NotificationManager.IMPORTANCE_MAX
        else -> NotificationManager.IMPORTANCE_DEFAULT
      }

      val channel = NotificationChannel(channelId, channelName, importanceLevel).apply {
        if (description != null) {
          this.description = description
        }
        enableVibration(vibrate)
        setShowBadge(showBadge)
        // TODO: Handle custom sound if provided
      }

      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE)
        as NotificationManager
      notificationManager.createNotificationChannel(channel)
    }
  }

  /**
   * Build a notification from options
   */
  fun buildNotification(context: Context, options: Map<String, Any?>): Notification {
    val content = options["content"] as? Map<String, Any?> ?: emptyMap()
    val androidOptions = options["android"] as? Map<String, Any?> ?: emptyMap()
    val actions = options["actions"] as? List<Map<String, Any?>>

    val title = content["title"] as? String ?: ""
    val body = content["body"] as? String ?: ""
    val channelId = androidOptions["channelId"] as? String ?: "default"
    val color = androidOptions["color"] as? String
    val ongoing = androidOptions["ongoing"] as? Boolean ?: true
    val priority = androidOptions["priority"] as? String
    val showProgress = androidOptions["showProgress"] as? Boolean ?: false
    val progressMax = (androidOptions["progressMax"] as? Number)?.toInt() ?: 100
    val progressCurrent = (androidOptions["progressCurrent"] as? Number)?.toInt() ?: 0
    val progressIndeterminate = androidOptions["progressIndeterminate"] as? Boolean ?: false

    // Get icon resource
    val iconResId = getIconResourceId(context, androidOptions["smallIcon"] as? String)

    val builder = NotificationCompat.Builder(context, channelId)
      .setContentTitle(title)
      .setContentText(body)
      .setSmallIcon(iconResId)
      .setOngoing(ongoing)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

    // Set priority
    val notificationPriority = when (priority) {
      "high" -> NotificationCompat.PRIORITY_HIGH
      "low" -> NotificationCompat.PRIORITY_LOW
      "min" -> NotificationCompat.PRIORITY_MIN
      "max" -> NotificationCompat.PRIORITY_MAX
      else -> NotificationCompat.PRIORITY_DEFAULT
    }
    builder.setPriority(notificationPriority)

    // Set color
    if (color != null) {
      try {
        builder.setColor(Color.parseColor(color))
      } catch (e: Exception) {
        // Invalid color format, ignore
      }
    }

    // Set progress if enabled
    if (showProgress) {
      builder.setProgress(progressMax, progressCurrent, progressIndeterminate)
    }

    // Add content intent to open app when notification is tapped
    val contentIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
    if (contentIntent != null) {
      val pendingIntent = PendingIntent.getActivity(
        context,
        0,
        contentIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      builder.setContentIntent(pendingIntent)
    }

    // Add action buttons
    if (!actions.isNullOrEmpty()) {
      actions.take(3).forEach { action ->
        val actionId = action["id"] as? String ?: return@forEach
        val actionTitle = action["title"] as? String ?: return@forEach
        val foreground = action["foreground"] as? Boolean ?: false

        val actionIntent = Intent(context, NotificationActionReceiver::class.java).apply {
          putExtra("ACTION_ID", actionId)
          putExtra("NOTIFICATION_ID", options["id"] as? String)
          val contentData = content["data"] as? Map<String, Any?>
          if (contentData != null) {
            putExtra("DATA", HashMap(contentData))
          }
        }

        val actionPendingIntent = PendingIntent.getBroadcast(
          context,
          actionId.hashCode(),
          actionIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        builder.addAction(
          0, // icon (0 for no icon)
          actionTitle,
          actionPendingIntent
        )
      }
    }

    return builder.build()
  }

  /**
   * Update an existing notification
   */
  fun updateNotification(context: Context, notificationId: Int, notification: Notification) {
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE)
      as NotificationManager
    notificationManager.notify(notificationId, notification)
  }

  /**
   * Get permission status
   */
  fun getPermissionStatus(context: Context): Map<String, Any> {
    val notificationsGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      ContextCompat.checkSelfPermission(
        context,
        android.Manifest.permission.POST_NOTIFICATIONS
      ) == android.content.pm.PackageManager.PERMISSION_GRANTED
    } else {
      true // Pre-Android 13 doesn't require runtime permission
    }

    val locationGranted = ContextCompat.checkSelfPermission(
      context,
      android.Manifest.permission.ACCESS_FINE_LOCATION
    ) == android.content.pm.PackageManager.PERMISSION_GRANTED

    val status = when {
      notificationsGranted && locationGranted -> "granted"
      !notificationsGranted || !locationGranted -> {
        // Check if we should show "denied" or "undetermined"
        // For simplicity, we'll return "denied" if not granted
        // A more robust implementation would track if permission was requested before
        "denied"
      }
      else -> "undetermined"
    }

    return mapOf(
      "status" to status,
      "notifications" to notificationsGranted,
      "location" to locationGranted
    )
  }

  /**
   * Set custom notification icon
   */
  fun setCustomIcon(iconName: String) {
    customIconName = iconName
  }

  /**
   * Get icon resource ID
   */
  private fun getIconResourceId(context: Context, iconName: String?): Int {
    val icon = iconName ?: customIconName

    if (icon != null) {
      val resId = context.resources.getIdentifier(
        icon,
        "drawable",
        context.packageName
      )
      if (resId != 0) {
        return resId
      }
    }

    // Fallback to default notification icon
    // Try to get ic_notification from drawable
    val defaultIconId = context.resources.getIdentifier(
      "ic_notification",
      "drawable",
      context.packageName
    )

    if (defaultIconId != 0) {
      return defaultIconId
    }

    // Ultimate fallback to app icon
    return context.applicationInfo.icon
  }
}
