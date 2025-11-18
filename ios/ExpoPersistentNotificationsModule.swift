import ExpoModulesCore
import UserNotifications

public class ExpoPersistentNotificationsModule: Module {
  private var activeNotifications: [String: Bool] = [:]
  private var notificationCategories: Set<UNNotificationCategory> = []

  public func definition() -> ModuleDefinition {
    Name("ExpoPersistentNotifications")

    // Events
    Events(
      "onNotificationAction",
      "onNotificationUpdate",
      "onServiceStatusChange"
    )

    // Module lifecycle
    OnCreate {
      // Set up notification delegate
      UNUserNotificationCenter.current().delegate = NotificationDelegate.shared
      NotificationDelegate.shared.module = self
    }

    // Create notification channel (no-op on iOS, for compatibility)
    AsyncFunction("createChannel") { (options: [String: Any], promise: Promise) in
      // iOS doesn't use channels, resolve immediately
      promise.resolve(nil)
    }

    // Start persistent notification
    AsyncFunction("startPersistentNotification") {
      (options: [String: Any], promise: Promise) in

      guard let content = options["content"] as? [String: Any],
            let id = options["id"] as? String,
            let title = content["title"] as? String,
            let body = content["body"] as? String else {
        promise.reject("ERR_INVALID_OPTIONS", "Invalid notification options")
        return
      }

      let notificationContent = UNMutableNotificationContent()
      notificationContent.title = title
      notificationContent.body = body

      // Apply iOS-specific options
      if let iosOptions = options["ios"] as? [String: Any] {
        if let badge = iosOptions["badge"] as? NSNumber {
          notificationContent.badge = badge
        }
        if let subtitle = iosOptions["subtitle"] as? String {
          notificationContent.subtitle = subtitle
        }
        if let sound = iosOptions["sound"] as? String, sound == "default" {
          notificationContent.sound = .default
        } else if iosOptions["sound"] != nil {
          notificationContent.sound = .default
        }
        if let threadId = iosOptions["threadIdentifier"] as? String {
          notificationContent.threadIdentifier = threadId
        }
      }

      // Add custom data
      if let data = content["data"] as? [String: Any] {
        notificationContent.userInfo = data
      }

      // Handle actions
      if let actions = options["actions"] as? [[String: Any]] {
        let categoryId = self.setupNotificationActions(actions: actions, notificationId: id)
        notificationContent.categoryIdentifier = categoryId
      }

      // Create trigger - use nil for immediate, or timeInterval for delayed
      let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
      let request = UNNotificationRequest(
        identifier: id,
        content: notificationContent,
        trigger: trigger
      )

      UNUserNotificationCenter.current().add(request) { [weak self] error in
        if let error = error {
          promise.reject("ERR_ADD_NOTIFICATION", error.localizedDescription)
        } else {
          self?.activeNotifications[id] = true
          self?.sendEvent("onServiceStatusChange", [
            "isRunning": true,
            "notificationId": id
          ])
          promise.resolve(nil)
        }
      }
    }

    // Update notification content
    AsyncFunction("updateNotificationContent") {
      (id: String, content: [String: Any], promise: Promise) in

      guard let title = content["title"] as? String,
            let body = content["body"] as? String else {
        promise.reject("ERR_INVALID_CONTENT", "Invalid notification content")
        return
      }

      // Get the existing notification to preserve its category
      UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
        let existingRequest = requests.first { $0.identifier == id }

        let notificationContent = UNMutableNotificationContent()
        notificationContent.title = title
        notificationContent.body = body

        // Preserve category for actions
        if let categoryId = existingRequest?.content.categoryIdentifier {
          notificationContent.categoryIdentifier = categoryId
        }

        // Preserve badge
        if let badge = existingRequest?.content.badge {
          notificationContent.badge = badge
        }

        // Add custom data
        if let data = content["data"] as? [String: Any] {
          notificationContent.userInfo = data
        }

        // Update by creating new request with same identifier
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        let request = UNNotificationRequest(
          identifier: id,
          content: notificationContent,
          trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { [weak self] error in
          if let error = error {
            promise.reject("ERR_UPDATE_NOTIFICATION", error.localizedDescription)
          } else {
            self?.sendEvent("onNotificationUpdate", ["id": id])
            promise.resolve(nil)
          }
        }
      }
    }

    // Update notification actions
    AsyncFunction("updateNotificationActions") {
      (id: String, actions: [[String: Any]], promise: Promise) in

      UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
        guard let existingRequest = requests.first(where: { $0.identifier == id }) else {
          promise.reject("ERR_NOTIFICATION_NOT_FOUND", "Notification not found")
          return
        }

        let newCategoryId = self.setupNotificationActions(actions: actions, notificationId: id)

        let notificationContent = existingRequest.content.mutableCopy() as! UNMutableNotificationContent
        notificationContent.categoryIdentifier = newCategoryId

        let request = UNNotificationRequest(
          identifier: id,
          content: notificationContent,
          trigger: existingRequest.trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
          if let error = error {
            promise.reject("ERR_UPDATE_ACTIONS", error.localizedDescription)
          } else {
            promise.resolve(nil)
          }
        }
      }
    }

    // Stop persistent notification
    AsyncFunction("stopPersistentNotification") {
      (id: String, promise: Promise) in

      UNUserNotificationCenter.current().removePendingNotificationRequests(
        withIdentifiers: [id]
      )
      UNUserNotificationCenter.current().removeDeliveredNotifications(
        withIdentifiers: [id]
      )

      self.activeNotifications[id] = false
      self.sendEvent("onServiceStatusChange", [
        "isRunning": false,
        "notificationId": id
      ])

      promise.resolve(nil)
    }

    // Check if notification is active
    AsyncFunction("isNotificationActive") { (id: String, promise: Promise) in
      UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
        let isActive = requests.contains { $0.identifier == id }
        promise.resolve(isActive)
      }
    }

    // Request permissions
    AsyncFunction("requestPermissions") { (promise: Promise) in
      UNUserNotificationCenter.current().requestAuthorization(
        options: [.alert, .badge, .sound]
      ) { granted, error in
        if let error = error {
          promise.reject("ERR_REQUEST_PERMISSIONS", error.localizedDescription)
          return
        }

        let response: [String: Any] = [
          "status": granted ? "granted" : "denied",
          "notifications": granted,
          "location": false // Location permissions are separate on iOS
        ]
        promise.resolve(response)
      }
    }

    // Get permission status
    AsyncFunction("getPermissionStatus") { (promise: Promise) in
      UNUserNotificationCenter.current().getNotificationSettings { settings in
        let status: String
        let granted: Bool

        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
          status = "granted"
          granted = true
        case .denied:
          status = "denied"
          granted = false
        case .notDetermined:
          status = "undetermined"
          granted = false
        @unknown default:
          status = "undetermined"
          granted = false
        }

        let response: [String: Any] = [
          "status": status,
          "notifications": granted,
          "location": false
        ]
        promise.resolve(response)
      }
    }

    // Set notification icon (no-op on iOS)
    AsyncFunction("setNotificationIcon") { (iconName: String, promise: Promise) in
      // iOS doesn't support custom notification icons
      promise.resolve(nil)
    }
  }

  // MARK: - Helper Methods

  private func setupNotificationActions(actions: [[String: Any]], notificationId: String) -> String {
    var notificationActions: [UNNotificationAction] = []

    for action in actions.prefix(3) { // iOS supports up to 4 actions, we'll use 3
      guard let actionId = action["id"] as? String,
            let actionTitle = action["title"] as? String else {
        continue
      }

      let foreground = action["foreground"] as? Bool ?? false
      let options: UNNotificationActionOptions = foreground ? [.foreground] : []

      let notificationAction = UNNotificationAction(
        identifier: actionId,
        title: actionTitle,
        options: options
      )
      notificationActions.append(notificationAction)
    }

    // Create a unique category ID for this notification
    let categoryId = "category_\(notificationId)"

    let category = UNNotificationCategory(
      identifier: categoryId,
      actions: notificationActions,
      intentIdentifiers: [],
      options: []
    )

    // Register the category
    var categories = notificationCategories
    categories.insert(category)
    notificationCategories = categories

    UNUserNotificationCenter.current().setNotificationCategories(categories)

    return categoryId
  }

  // Called from NotificationDelegate when action is triggered
  func handleNotificationAction(actionId: String, notificationId: String, data: [String: Any]?) {
    var eventData: [String: Any] = [
      "actionId": actionId,
      "notificationId": notificationId
    ]

    if let data = data {
      eventData["data"] = data
    }

    sendEvent("onNotificationAction", eventData)

    // Handle stop-tracking action
    if actionId == "stop-tracking" {
      UNUserNotificationCenter.current().removePendingNotificationRequests(
        withIdentifiers: [notificationId]
      )
      UNUserNotificationCenter.current().removeDeliveredNotifications(
        withIdentifiers: [notificationId]
      )

      activeNotifications[notificationId] = false
      sendEvent("onServiceStatusChange", [
        "isRunning": false,
        "notificationId": notificationId
      ])
    }
  }
}

// MARK: - Notification Delegate

class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
  static let shared = NotificationDelegate()
  weak var module: ExpoPersistentNotificationsModule?

  // Handle notification when app is in foreground
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    // Show notification even when app is in foreground
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound, .badge])
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }

  // Handle notification action
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let actionId = response.actionIdentifier
    let notificationId = response.notification.request.identifier
    let data = response.notification.request.content.userInfo as? [String: Any]

    // Handle default action (tap on notification)
    if actionId == UNNotificationDefaultActionIdentifier {
      // Just open the app, no special handling
    } else {
      // Handle custom action
      module?.handleNotificationAction(
        actionId: actionId,
        notificationId: notificationId,
        data: data
      )
    }

    completionHandler()
  }
}
