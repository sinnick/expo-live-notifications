# Getting Started with expo-persistent-notifications

## 📦 Project Structure

```
expo-persistent-notifications/
├── android/                    # Android native implementation (Kotlin)
│   ├── src/main/
│   │   ├── java/expo/modules/persistentnotifications/
│   │   │   ├── ExpoPersistentNotificationsModule.kt
│   │   │   ├── LocationTrackingService.kt
│   │   │   ├── NotificationHelper.kt
│   │   │   └── NotificationActionReceiver.kt
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── ios/                        # iOS native implementation (Swift)
│   ├── ExpoPersistentNotificationsModule.swift
│   └── ExpoPersistentNotifications.podspec
├── src/                        # TypeScript API
│   ├── index.ts               # Main API exports
│   ├── types.ts               # TypeScript type definitions
│   └── ExpoPersistentNotificationsModule.ts
├── plugin/                     # Expo config plugin
│   └── src/index.ts
├── example/                    # Example app
│   ├── App.tsx
│   ├── app.json
│   └── package.json
├── package.json
├── expo-module.config.json
└── README.md
```

## 🚀 Development Setup

### Prerequisites

- Node.js 16+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- A physical Android or iOS device (recommended for testing location and notifications)

### 1. Install Dependencies

```bash
cd /home/fernando/code/expo-persistent-notifications
npm install
```

### 2. Build the TypeScript Code

```bash
npm run build
```

This will compile the TypeScript files in `src/` to JavaScript in `build/`.

### 3. Test with the Example App

```bash
cd example
npm install
```

#### For Android:

```bash
# Generate native projects
npx expo prebuild --platform android

# Run on Android device/emulator
npx expo run:android
```

#### For iOS (macOS only):

```bash
# Generate native projects
npx expo prebuild --platform ios

# Install CocoaPods dependencies
cd ios && pod install && cd ..

# Run on iOS device/simulator
npx expo run:ios
```

## 🧪 Testing the Module

### Test Checklist

1. **Permissions**
   - [ ] Request notification permissions
   - [ ] Request location permissions
   - [ ] Verify permission status updates

2. **Notification Creation**
   - [ ] Create notification channel (Android)
   - [ ] Start persistent notification
   - [ ] Verify notification appears
   - [ ] Verify custom icon and color (Android)

3. **Dynamic Updates**
   - [ ] Update notification content
   - [ ] Verify updates appear in real-time
   - [ ] Test rapid updates (every second)

4. **Action Buttons**
   - [ ] Tap "Ver mapa" button
   - [ ] Tap "Detener" button
   - [ ] Verify JavaScript events are received

5. **Service Behavior**
   - [ ] Background app - verify notification persists
   - [ ] Kill app - verify service continues (Android)
   - [ ] Restart app - verify state is correct

6. **Stop Notification**
   - [ ] Stop notification programmatically
   - [ ] Verify notification is removed
   - [ ] Verify service stops (Android)

## 🔧 Common Issues and Solutions

### Issue: Module not found

**Solution:** Make sure you've run `npm run build` in the root directory and `npm install` in the example directory.

### Issue: Android build fails

**Solution:**
- Ensure Android SDK is installed
- Check that `expo-modules-core` is properly linked
- Run `cd example/android && ./gradlew clean` and try again

### Issue: iOS build fails

**Solution:**
- Run `cd example/ios && pod install`
- Clean build folder in Xcode
- Ensure deployment target is iOS 13.4+

### Issue: Notification doesn't show on Android 13+

**Solution:** You need to grant the POST_NOTIFICATIONS permission. The app will request this when you tap "Solicitar Permisos".

### Issue: Notification dismissed on iOS

**Solution:** This is expected behavior on iOS. iOS doesn't support truly persistent notifications that cannot be dismissed by the user.

## 📱 Using in Your Own App

### 1. Install the module (local development)

```bash
# In your Expo app
npm install file:../expo-persistent-notifications
```

### 2. Add the plugin to app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-persistent-notifications",
        {
          "locationAlwaysAndWhenInUsePermission": "Your custom message here",
          "locationWhenInUsePermission": "Your custom message here"
        }
      ]
    ]
  }
}
```

### 3. Prebuild and run

```bash
npx expo prebuild
npx expo run:android
# or
npx expo run:ios
```

## 📝 Next Steps

### Features to Add

1. **Custom notification sounds**
2. **Progress bar updates** (already supported in types, needs implementation)
3. **Multiple simultaneous notifications**
4. **Better location tracking integration**
5. **Notification grouping** (Android)
6. **Rich media notifications** (images)

### Testing Improvements

1. Add unit tests for TypeScript code
2. Add instrumentation tests for Android
3. Add UI tests for iOS
4. Set up CI/CD pipeline

### Documentation Improvements

1. Add API reference documentation
2. Add more code examples
3. Create video tutorials
3. Add troubleshooting guide

## 🤝 Contributing

If you'd like to contribute:

1. Create a feature branch
2. Make your changes
3. Test thoroughly on both platforms
4. Submit a pull request with a clear description

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check the README.md
- Look at the example app code
- Open an issue on GitHub

## 🎉 You're Ready!

You now have a fully functional Expo module for persistent notifications with location tracking. The module supports:

✅ Persistent notifications on Android and iOS
✅ Real-time dynamic updates
✅ Interactive action buttons
✅ Custom styling (icons, colors)
✅ Location tracking integration
✅ TypeScript support with full types
✅ Automatic configuration via Expo plugin

Happy coding! 🚀
