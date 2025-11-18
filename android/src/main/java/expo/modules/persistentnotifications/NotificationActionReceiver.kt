package expo.modules.persistentnotifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class NotificationActionReceiver : BroadcastReceiver() {

  companion object {
    private const val TAG = "NotificationActionReceiver"
  }

  override fun onReceive(context: Context, intent: Intent) {
    val actionId = intent.getStringExtra("ACTION_ID")
    val notificationId = intent.getStringExtra("NOTIFICATION_ID")
    @Suppress("UNCHECKED_CAST")
    val data = intent.getSerializableExtra("DATA") as? HashMap<String, Any?>

    Log.d(TAG, "Action received: $actionId for notification: $notificationId")

    if (actionId != null && notificationId != null) {
      // Send event to JavaScript
      // This will be handled by the ExpoPersistentNotificationsModule
      sendEventToJS(context, actionId, notificationId, data)

      // If the action is "stop-tracking", stop the service
      if (actionId == "stop-tracking") {
        val stopIntent = Intent(context, LocationTrackingService::class.java).apply {
          putExtra("ACTION", "STOP")
          putExtra("NOTIFICATION_ID", notificationId)
        }
        context.stopService(stopIntent)
      }
    }
  }

  private fun sendEventToJS(
    context: Context,
    actionId: String,
    notificationId: String,
    data: Map<String, Any?>?
  ) {
    // Create an intent to broadcast the action event
    // The module will pick this up and send it to JavaScript
    val broadcastIntent = Intent("expo.modules.persistentnotifications.ACTION").apply {
      putExtra("actionId", actionId)
      putExtra("notificationId", notificationId)
      if (data != null) {
        putExtra("data", HashMap(data))
      }
    }
    context.sendBroadcast(broadcastIntent)
  }
}
