const { withAndroidManifest, withInfoPlist, AndroidConfig } = require('@expo/config-plugins');

/**
 * Config plugin for expo-persistent-notifications
 * Automatically configures native permissions and settings
 */
const withPersistentNotifications = (config, props = {}) => {
  // Configure Android
  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults
    );

    // Ensure permissions array exists
    if (!config.modResults.manifest['uses-permission']) {
      config.modResults.manifest['uses-permission'] = [];
    }

    const permissions = config.modResults.manifest['uses-permission'];

    // Add required permissions if not already present
    const requiredPermissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.WAKE_LOCK',
    ];

    requiredPermissions.forEach((permission) => {
      if (!permissions.find((p) => p.$['android:name'] === permission)) {
        permissions.push({
          $: { 'android:name': permission },
        });
      }
    });

    return config;
  });

  // Configure iOS
  config = withInfoPlist(config, (config) => {
    // Add location permission descriptions
    config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription =
      props.locationAlwaysAndWhenInUsePermission ||
      'This app needs access to your location to track bus arrivals and provide real-time updates.';

    config.modResults.NSLocationWhenInUseUsageDescription =
      props.locationWhenInUsePermission ||
      'This app needs access to your location to track bus arrivals.';

    // Enable background modes for location
    if (!config.modResults.UIBackgroundModes) {
      config.modResults.UIBackgroundModes = [];
    }

    const backgroundModes = config.modResults.UIBackgroundModes;
    if (!backgroundModes.includes('location')) {
      backgroundModes.push('location');
    }
    if (!backgroundModes.includes('remote-notification')) {
      backgroundModes.push('remote-notification');
    }

    return config;
  });

  return config;
};

module.exports = withPersistentNotifications;
