package expo.modules.persistentnotifications

import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log

class LocationTrackingService : Service() {

  companion object {
    private const val TAG = "LocationTrackingService"
    const val NOTIFICATION_ID = 1001
    private var isRunning = false
    private var currentNotificationId: String? = null

    fun isServiceRunning(): Boolean = isRunning
    fun getCurrentNotificationId(): String? = currentNotificationId
  }

  private var notificationOptions: Map<String, Any?>? = null
  private var handler: Handler? = null
  private var updateRunnable: Runnable? = null
  private var arrivalTimeMillis: Long = 0
  private val updateIntervalMs: Long = 6000 // 6 segundos

  override fun onCreate() {
    super.onCreate()
    Log.d(TAG, "Service created")
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent == null) {
      Log.w(TAG, "Received null intent, stopping service")
      stopSelf()
      return START_NOT_STICKY
    }

    val action = intent.getStringExtra("ACTION") ?: "START"
    Log.d(TAG, "onStartCommand with action: $action")

    when (action) {
      "START" -> {
        @Suppress("UNCHECKED_CAST")
        val options = intent.getSerializableExtra("OPTIONS") as? HashMap<String, Any?>
        if (options != null) {
          // Obtener el tiempo de llegada en minutos
          val arrivalMinutes = (options["arrivalMinutes"] as? Number)?.toInt() ?: 5
          arrivalTimeMillis = System.currentTimeMillis() + (arrivalMinutes * 60 * 1000L)

          Log.d(TAG, "Starting with arrival time: $arrivalMinutes minutes")

          startForegroundNotification(options)
          startAutoUpdate() // Iniciar actualizaciones automáticas
        } else {
          Log.e(TAG, "No options provided for START action")
          stopSelf()
        }
      }
      "UPDATE_CONTENT" -> {
        // Mantener esta opción por compatibilidad, pero ya no se usará desde JS
        val notifId = intent.getStringExtra("NOTIFICATION_ID")
        @Suppress("UNCHECKED_CAST")
        val content = intent.getSerializableExtra("CONTENT") as? HashMap<String, Any?>
        if (notifId != null && content != null) {
          updateNotificationContent(notifId, content)
        }
      }
      "UPDATE_ACTIONS" -> {
        val notifId = intent.getStringExtra("NOTIFICATION_ID")
        @Suppress("UNCHECKED_CAST")
        val actions = intent.getSerializableExtra("ACTIONS") as? ArrayList<HashMap<String, Any?>>
        if (notifId != null && actions != null) {
          updateNotificationActions(notifId, actions)
        }
      }
      "STOP" -> {
        val notifId = intent.getStringExtra("NOTIFICATION_ID")
        Log.d(TAG, "Stopping service for notification: $notifId")
        stopAutoUpdate()
        stopForegroundService()
      }
    }

    return START_STICKY
  }

  private fun startForegroundNotification(options: Map<String, Any?>) {
    try {
      notificationOptions = options
      currentNotificationId = options["id"] as? String

      val notification = NotificationHelper.buildNotification(
        this,
        options
      )

      startForeground(NOTIFICATION_ID, notification)
      isRunning = true
      Log.d(TAG, "Foreground service started with notification ID: $currentNotificationId")
    } catch (e: Exception) {
      Log.e(TAG, "Error starting foreground notification", e)
      stopSelf()
    }
  }

  private fun startAutoUpdate() {
    Log.d(TAG, "Starting auto-update timer")

    handler = Handler(Looper.getMainLooper())
    updateRunnable = object : Runnable {
      override fun run() {
        val remainingMs = arrivalTimeMillis - System.currentTimeMillis()
        val remainingMinutes = (remainingMs / 60000.0)

        Log.d(TAG, "Auto-update: $remainingMinutes minutes remaining")

        if (remainingMinutes <= 0) {
          // Bus llegó, actualizar notificación final y detener servicio
          updateNotificationWithTime(0)
          handler?.postDelayed({
            stopAutoUpdate()
            stopForegroundService()
          }, 5000) // Mantener notificación por 5 segundos más
          return
        }

        // Actualizar notificación con nuevo tiempo
        updateNotificationWithTime(Math.ceil(remainingMinutes).toInt())

        // Programar siguiente actualización
        handler?.postDelayed(this, updateIntervalMs)
      }
    }

    // Iniciar el ciclo de actualizaciones
    handler?.post(updateRunnable!!)
  }

  private fun stopAutoUpdate() {
    Log.d(TAG, "Stopping auto-update timer")
    updateRunnable?.let { handler?.removeCallbacks(it) }
    handler = null
    updateRunnable = null
  }

  private fun updateNotificationWithTime(minutes: Int) {
    try {
      val updatedOptions = notificationOptions?.toMutableMap() ?: return

      val content = mutableMapOf<String, Any>(
        "title" to "Rastreando ubicación",
        "body" to when {
          minutes > 1 -> "Próximo bus en $minutes minutos"
          minutes == 1 -> "Próximo bus en 1 minuto"
          else -> "¡El bus está llegando!"
        }
      )

      updatedOptions["content"] = content
      notificationOptions = updatedOptions

      val notification = NotificationHelper.buildNotification(this, updatedOptions)
      val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      notificationManager.notify(NOTIFICATION_ID, notification)

      Log.d(TAG, "Auto-updated notification: $minutes min remaining")
    } catch (e: Exception) {
      Log.e(TAG, "Error auto-updating notification", e)
    }
  }

  private fun updateNotificationContent(id: String, content: Map<String, Any?>) {
    if (currentNotificationId != id) {
      Log.w(TAG, "Notification ID mismatch: expected $currentNotificationId, got $id")
      return
    }

    try {
      // Update the notification options with new content
      val updatedOptions = notificationOptions?.toMutableMap() ?: mutableMapOf()
      updatedOptions["content"] = content

      // Store the updated options for future updates
      notificationOptions = updatedOptions

      val notification = NotificationHelper.buildNotification(
        this,
        updatedOptions
      )

      // Update the existing notification using NotificationManager directly
      val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
      notificationManager.notify(NOTIFICATION_ID, notification)

      Log.d(TAG, "Notification content updated (manual)")
    } catch (e: Exception) {
      Log.e(TAG, "Error updating notification content", e)
    }
  }

  private fun updateNotificationActions(id: String, actions: List<Map<String, Any?>>) {
    if (currentNotificationId != id) {
      Log.w(TAG, "Notification ID mismatch: expected $currentNotificationId, got $id")
      return
    }

    try {
      val updatedOptions = notificationOptions?.toMutableMap() ?: mutableMapOf()
      updatedOptions["actions"] = actions

      val notification = NotificationHelper.buildNotification(
        this,
        updatedOptions
      )

      NotificationHelper.updateNotification(this, NOTIFICATION_ID, notification)

      Log.d(TAG, "Notification actions updated")
    } catch (e: Exception) {
      Log.e(TAG, "Error updating notification actions", e)
    }
  }

  private fun stopForegroundService() {
    try {
      stopForeground(true)
      isRunning = false
      currentNotificationId = null
      notificationOptions = null
      stopSelf()
      Log.d(TAG, "Foreground service stopped")
    } catch (e: Exception) {
      Log.e(TAG, "Error stopping foreground service", e)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    stopAutoUpdate()
    super.onDestroy()
    isRunning = false
    currentNotificationId = null
    Log.d(TAG, "Service destroyed")
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    super.onTaskRemoved(rootIntent)
    // Service will be restarted due to START_STICKY
    Log.d(TAG, "Task removed")
  }
}
