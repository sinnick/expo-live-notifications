# 📱 Live Activities en iOS y Android  
### Investigación + requisitos + ejemplos + materiales para implementarlas en React Native / Expo

---

## 📌 1. Concepto general

| Plataforma | Nombre | Aparición | Funcionamiento |
|------------|--------|------------|----------------|
| **iOS** | **Live Activities** (ActivityKit) | iOS 16.1+ | UI persistente en Lock Screen + Dynamic Island + StandBy. Se actualiza en tiempo real vía app o APNs. |
| **Android** | **Live Updates** (Android 16) | Android 16 API 36 | Nuevo sistema inspirado en Live Activities. Notificaciones "promoted" con estado dinámico. |
| **Android ≤15** | Foreground service + notificaciones persistentes | Siempre | Simulación equivalente usando una notificación ongoing que se actualiza. |

---

## 🍏 2. Live Activities – iOS (ActivityKit)

### 🔹 Requisitos

- iOS **16.1+**
- Tener un **Widget Extension** con soporte Live Activity
- `NSSupportsLiveActivities = YES` en Info.plist del app y del widget
- UI del widget = **SwiftUI + WidgetKit**
- Para actualizaciones por backend: usar **APNs con push type `"liveactivity"`**

### 🔹 Limitaciones oficiales

| Restricción | Valor |
|-------------|-------|
| Duración activa | Máx. 8 h |
| Persistencia lockscreen total | ~12 h |
| Tamaño de payload | ≤ 4 KB |
| Actualizaciones | Desde app o push |
| NO permite | Lógica ejecutándose dentro del widget |

---

### 🔹 Ejemplo nativo real (Swift)

```swift
struct RideAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var status: String
        var etaMinutes: Int
    }
    var rideId: String
}

// Start
let attrs = RideAttributes(rideId: "123")
let state = RideAttributes.ContentState(status: "En camino", etaMinutes: 8)

let activity = try Activity.request(
  attributes: attrs,
  content: .init(state: state, staleDate: nil),
  pushType: .token // Si queremos APNs
)

// Update
await activity.update(.init(state: .init(status:"Llegando", etaMinutes:2), staleDate:nil))

// End
await activity.end(.init(state: state, staleDate:nil), dismissalPolicy: .default)
```

---

## 🤖 3. Live Activities en Android

### 📍 Android 16: Live Updates

- API **Progress-centric notifications**
- Se muestran en Lock Screen
- Solo para actividades **reales y acotadas** (rides, delivery, navegación)

### 📍 Android ≤ 15 (método recomendado)

Usar:

```
Foreground Service +
Notification (ongoing, no dismissible) +
NotificationManager.notify()
```

Compatible con cualquier React Native app.

---

## 🔌 4. React Native / Expo — Qué existe hoy

### 📱 iOS

| Recurso | Tipo |
|---------|------|
| https://github.com/kingstinct/react-native-activity-kit | 📦 Librería lista para usar |
| https://github.com/tarikfp/expo-live-activity-timer | 📦 Ejemplo Expo completo |
| https://docs.expo.dev/modules/overview/ | Expo Modules API |
| https://github.com/expo/expo/tree/main/packages/expo-apple-targets | Expo Apple Targets |
| https://onesignal.com/blog/onesignal-live-activities/ | OneSignal soporte Live Activities |

### 📱 Android

| Recurso | Tipo |
|---------|------|
| https://notifee.app/react-native | Librería de notificaciones persistentes |
| https://medium.com/@aleksa/real-time-live-notifications-foreground-services-react-native | Serie Foreground Services + RN |
| https://developer.android.com/develop/ui/views/notifications/live | Docs oficiales Android Live Updates |

---

## 🏗️ 5. Arquitectura sugerida de tu módulo RN

```ts
type LiveActivityState = {
  title: string
  subtitle?: string
  progress?: number
  status?: string
}

interface LiveActivities {
  start(initialState: LiveActivityState): Promise<string>
  update(id: string, data: LiveActivityState): Promise<void>
  end(id: string): Promise<void>
}
```

### Propuesta internamente:

| OS | Implementación |
|----|----------------|
| iOS | ActivityKit + Widget Extension + Expo Module |
| Android 16+ | Live Updates Notifications |
| Android ≤15 | Foreground Service + ongoing notification |

---

## 📚 6. Links oficiales y documentación técnica

### Apple Docs
- https://developer.apple.com/documentation/activitykit
- https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities
- https://developer.apple.com/videos/play/wwdc2023/10143/

### Android Docs
- https://developer.android.com/develop/ui/views/notifications/live
- https://developer.android.com/develop/ui/views/notifications/notification-list

### Ejemplos nativos oficiales
- Android sample: https://github.com/android/user-interface-samples/tree/main/LiveNotification
- Tutorial RN iOS Live Activity: https://requestum.com/blog/react-native-live-activities

---

## ⚠️ 7. Restricciones importantes de uso

### iOS
❗ Apple **rechaza** apps que usen Live Activities para:

- Mostrar publicidad
- Funciones permanentes sin fin definido
- “Banners” que reemplazan UI interna

### Android
❗ Google **prohíbe** Live Updates para:

- Chat
- Promociones
- Notificaciones sin “actividad viva” real

---

## 🧱 8. Próximo paso sugerido

Puedo entregarte **el esqueleto de módulo completo**, en carpetas:

```
/packages/live-activities
  /ios
     LiveActivitiesModule.swift
     WidgetExtension/
  /android
     LiveActivitiesModule.kt
  /src
     index.ts
```

Compatible con Expo Modules + Turbo Modules.
