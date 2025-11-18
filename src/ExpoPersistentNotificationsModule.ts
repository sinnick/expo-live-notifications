import { requireNativeModule } from 'expo-modules-core';

// requireNativeModule throws if the native module cannot be found
export default requireNativeModule('ExpoPersistentNotifications');
