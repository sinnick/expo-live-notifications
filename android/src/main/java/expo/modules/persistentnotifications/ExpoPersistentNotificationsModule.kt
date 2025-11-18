package expo.modules.persistentnotifications

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.interfaces.permissions.Permissions

class ExpoPersistentNotificationsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw MissingReactContextException()

  override fun definition() = ModuleDefinition {
    Name("ExpoPersistentNotifications")

    // Event names that can be emitted to JavaScript
    Events(
      "onNotificationAction",
      "onNotificationUpdate",
      "onServiceStatusChange"
    )

    // Create notification channel (Android 8.0+)
    AsyncFunction("createChannel") { options: Map<String, Any?>, promise: Promise ->
      try {
        val channelId = options["id"] as? String ?: throw InvalidChannelException()
        val channelName = options["name"] as? String ?: throw InvalidChannelException()
        val description = options["description"] as? String
        val importance = options["importance"] as? String
        val vibrate = options["vibrate"] as? Boolean ?: true
        val sound = options["sound"] as? String
        val showBadge = options["showBadge"] as? Boolean ?: true

        NotificationHelper.createChannel(
          context,
          channelId,
          channelName,
          description,
          importance,
          vibrate,
          sound,
          showBadge
        )
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR_CREATE_CHANNEL", e.message, e)
      }
    }

    // Start persistent notification with foreground service
    AsyncFunction("startPersistentNotification") { options: Map<String, Any?>, promise: Promise ->
      try {
        val intent = Intent(context, LocationTrackingService::class.java).apply {
          putExtra("ACTION", "START")
          putExtra("OPTIONS", HashMap(options))
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          ContextCompat.startForegroundService(context, intent)
        } else {
          context.startService(intent)
        }

        val notificationId = options["id"] as? String
        sendEvent("onServiceStatusChange", mapOf(
          "isRunning" to true,
          "notificationId" to notificationId
        ))

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR_START_NOTIFICATION", e.message, e)
      }
    }

    // Update persistent notification content
    AsyncFunction("updateNotificationContent") {
      id: String,
      content: Map<String, Any?>,
      promise: Promise ->
      try {
        val intent = Intent(context, LocationTrackingService::class.java).apply {
          putExtra("ACTION", "UPDATE_CONTENT")
          putExtra("NOTIFICATION_ID", id)
          putExtra("CONTENT", HashMap(content))
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          ContextCompat.startForegroundService(context, intent)
        } else {
          context.startService(intent)
        }

        sendEvent("onNotificationUpdate", mapOf("id" to id))
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR_UPDATE_NOTIFICATION", e.message, e)
      }
    }

    // Update notification actions
    AsyncFunction("updateNotificationActions") {
      id: String,
      actions: List<Map<String, Any?>>,
      promise: Promise ->
      try {
        val intent = Intent(context, LocationTrackingService::class.java).apply {
          putExtra("ACTION", "UPDATE_ACTIONS")
          putExtra("NOTIFICATION_ID", id)
          putExtra("ACTIONS", ArrayList(actions))
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          ContextCompat.startForegroundService(context, intent)
        } else {
          context.startService(intent)
        }

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR_UPDATE_ACTIONS", e.message, e)
      }
    }

    // Stop persistent notification
    AsyncFunction("stopPersistentNotification") { id: String, promise: Promise ->
      try {
        val intent = Intent(context, LocationTrackingService::class.java).apply {
          putExtra("ACTION", "STOP")
          putExtra("NOTIFICATION_ID", id)
        }
        context.stopService(intent)

        sendEvent("onServiceStatusChange", mapOf(
          "isRunning" to false,
          "notificationId" to id
        ))

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR_STOP_NOTIFICATION", e.message, e)
      }
    }

    // Check if notification is active
    AsyncFunction("isNotificationActive") { id: String, promise: Promise ->
      try {
        val isActive = LocationTrackingService.isServiceRunning()
        promise.resolve(isActive)
      } catch (e: Exception) {
        promise.reject("ERR_CHECK_ACTIVE", e.message, e)
      }
    }

    // Request permissions
    AsyncFunction("requestPermissions") { promise: Promise ->
      try {
        // Check if we need to request permissions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          // Android 13+ requires POST_NOTIFICATIONS permission
          val permissions = appContext.permissions ?: run {
            // Fall back to checking current status if permissions module not available
            val status = NotificationHelper.getPermissionStatus(context)
            promise.resolve(status)
            return@AsyncFunction
          }

          permissions.askForPermissions(
            { permissionsResponse ->
              Log.d("ExpoPersistentNotif", "Permissions response: $permissionsResponse")

              val notificationGranted = permissionsResponse.getOrDefault(
                Manifest.permission.POST_NOTIFICATIONS,
                PackageManager.PERMISSION_DENIED
              ) == PackageManager.PERMISSION_GRANTED

              val locationGranted = permissionsResponse.getOrDefault(
                Manifest.permission.ACCESS_FINE_LOCATION,
                PackageManager.PERMISSION_DENIED
              ) == PackageManager.PERMISSION_GRANTED

              Log.d("ExpoPersistentNotif", "Notification granted: $notificationGranted, Location granted: $locationGranted")

              val allGranted = notificationGranted && locationGranted
              val response = mapOf(
                "status" to if (allGranted) "granted" else "denied",
                "notifications" to notificationGranted,
                "location" to locationGranted
              )
              promise.resolve(response)
            },
            *arrayOf(
              Manifest.permission.POST_NOTIFICATIONS,
              Manifest.permission.ACCESS_FINE_LOCATION,
              Manifest.permission.ACCESS_COARSE_LOCATION
            )
          )
        } else {
          // Pre-Android 13, just check location permission
          val permissions = appContext.permissions ?: run {
            val status = NotificationHelper.getPermissionStatus(context)
            promise.resolve(status)
            return@AsyncFunction
          }

          permissions.askForPermissions(
            { permissionsResponse ->
              Log.d("ExpoPersistentNotif", "Permissions response (pre-13): $permissionsResponse")

              val locationGranted = permissionsResponse.getOrDefault(
                Manifest.permission.ACCESS_FINE_LOCATION,
                PackageManager.PERMISSION_DENIED
              ) == PackageManager.PERMISSION_GRANTED

              Log.d("ExpoPersistentNotif", "Location granted (pre-13): $locationGranted")

              val response = mapOf(
                "status" to if (locationGranted) "granted" else "denied",
                "notifications" to true, // Always granted on pre-13
                "location" to locationGranted
              )
              promise.resolve(response)
            },
            *arrayOf(
              Manifest.permission.ACCESS_FINE_LOCATION,
              Manifest.permission.ACCESS_COARSE_LOCATION
            )
          )
        }
      } catch (e: Exception) {
        promise.reject("ERR_REQUEST_PERMISSIONS", e.message, e)
      }
    }

    // Get permission status
    AsyncFunction("getPermissionStatus") { promise: Promise ->
      try {
        val status = NotificationHelper.getPermissionStatus(context)
        promise.resolve(status)
      } catch (e: Exception) {
        promise.reject("ERR_GET_PERMISSIONS", e.message, e)
      }
    }

    // Set notification icon
    AsyncFunction("setNotificationIcon") { iconName: String, promise: Promise ->
      try {
        NotificationHelper.setCustomIcon(iconName)
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR_SET_ICON", e.message, e)
      }
    }
  }
}

class MissingReactContextException : CodedException("React context is not available")
class InvalidChannelException : CodedException("Invalid channel configuration")
