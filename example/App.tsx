import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  createNotificationChannel,
  startPersistentNotification,
  updateNotificationContent,
  stopPersistentNotification,
  isNotificationActive,
  requestPermissions,
  getPermissionStatus,
  addNotificationActionListener,
  addServiceStatusListener,
  startBusTracking,
  type PermissionStatus,
} from 'expo-persistent-notifications';

export default function App() {
  const [isTracking, setIsTracking] = useState(false);
  const [arrivalMinutes, setArrivalMinutes] = useState(5);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [logs, setLogs] = useState<string[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackingRef = useRef<any>(null);

  useEffect(() => {
    checkPermissions();
    setupListeners();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (trackingRef.current) {
        trackingRef.current.stop();
      }
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
  };

  const checkPermissions = async () => {
    try {
      const status = await getPermissionStatus();
      setPermissionStatus(status.status);
      addLog(`Permissions status: ${status.status}`);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const setupListeners = () => {
    // Listen for action button presses
    const actionSubscription = addNotificationActionListener((event) => {
      addLog(`Action pressed: ${event.actionId}`);

      if (event.actionId === 'view-map') {
        Alert.alert('Ver Mapa', '¡Aquí se abriría el mapa con tu ubicación!');
      } else if (event.actionId === 'stop-tracking') {
        handleStopTracking();
      }
    });

    // Listen for service status changes
    const statusSubscription = addServiceStatusListener((event) => {
      addLog(`Service ${event.isRunning ? 'started' : 'stopped'}`);
      setIsTracking(event.isRunning);
    });

    return () => {
      actionSubscription.remove();
      statusSubscription.remove();
    };
  };

  const handleRequestPermissions = async () => {
    try {
      addLog('Requesting permissions...');
      const result = await requestPermissions();
      setPermissionStatus(result.status);

      if (result.status === 'granted') {
        Alert.alert('Éxito', 'Permisos otorgados');
        addLog('Permissions granted');
      } else {
        Alert.alert('Error', 'Permisos denegados');
        addLog('Permissions denied');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
      addLog(`Error: ${error.message}`);
    }
  };

  const handleStartTracking = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert(
        'Permisos Requeridos',
        'Por favor, otorga los permisos necesarios primero.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      addLog('Creating notification channel...');

      // Create notification channel (Android)
      await createNotificationChannel({
        id: 'bus-tracking',
        name: 'Rastreo de Buses',
        description: 'Notificaciones para el rastreo de buses en tiempo real',
        importance: 'high',
        vibrate: true,
        showBadge: true,
      });

      addLog('Starting bus tracking...');
      setArrivalMinutes(5);

      // Start tracking using the convenience API
      // El servicio nativo se encargará de actualizar la notificación automáticamente
      trackingRef.current = await startBusTracking(5, 'bus-tracking');

      setIsTracking(true);
      addLog('Bus tracking started - auto-updating every 6 seconds');

      // Solo actualizar el contador local para la UI
      // La notificación se actualiza automáticamente desde el servicio Android
      let minutes = 5;
      intervalRef.current = setInterval(() => {
        minutes -= 0.1; // Decrease by 6 seconds
        if (minutes <= 0) {
          minutes = 0;
          handleStopTracking();
        }
        setArrivalMinutes(minutes); // Solo para la UI local
      }, 6000);

    } catch (error: any) {
      Alert.alert('Error', error.message);
      addLog(`Error starting tracking: ${error.message}`);
    }
  };

  // Ya no se necesita handleManualUpdate - el servicio nativo actualiza automáticamente
  // const handleManualUpdate = async () => { ... }

  const handleStopTracking = async () => {
    try {
      addLog('Stopping tracking...');

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (trackingRef.current) {
        await trackingRef.current.stop();
        trackingRef.current = null;
      }

      setIsTracking(false);
      addLog('Tracking stopped');
    } catch (error: any) {
      Alert.alert('Error', error.message);
      addLog(`Error stopping: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>🚌 Bus Tracking Demo</Text>

        {/* Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estado</Text>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Tracking:</Text>
            <View style={[styles.badge, isTracking ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={styles.badgeText}>
                {isTracking ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Permisos:</Text>
            <View style={[
              styles.badge,
              permissionStatus === 'granted' ? styles.badgeActive : styles.badgeInactive
            ]}>
              <Text style={styles.badgeText}>{permissionStatus}</Text>
            </View>
          </View>
          {isTracking && (
            <View style={styles.statusRow}>
              <Text style={styles.label}>Llegada:</Text>
              <Text style={styles.arrivalTime}>
                {Math.ceil(arrivalMinutes)} minutos
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          {permissionStatus !== 'granted' && (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleRequestPermissions}
            >
              <Text style={styles.buttonText}>Solicitar Permisos</Text>
            </TouchableOpacity>
          )}

          {!isTracking ? (
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSuccess,
                permissionStatus !== 'granted' && styles.buttonDisabled
              ]}
              onPress={handleStartTracking}
              disabled={permissionStatus !== 'granted'}
            >
              <Text style={styles.buttonText}>Iniciar Tracking</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={handleStopTracking}
            >
              <Text style={styles.buttonText}>Detener Tracking</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Logs */}
        <View style={styles.logsCard}>
          <Text style={styles.cardTitle}>Logs</Text>
          <ScrollView style={styles.logsScroll} nestedScrollEnabled>
            {logs.length === 0 ? (
              <Text style={styles.logEmpty}>No hay logs aún</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logItem}>
                  {log}
                </Text>
              ))
            )}
          </ScrollView>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📋 Instrucciones</Text>
          <Text style={styles.instructionsText}>
            1. Presiona "Solicitar Permisos" para obtener los permisos necesarios{'\n'}
            2. Presiona "Iniciar Tracking" para comenzar{'\n'}
            3. La notificación mostrará el tiempo hasta la llegada del bus{'\n'}
            4. Usa los botones de la notificación para interactuar{'\n'}
            5. El tiempo se actualizará automáticamente cada 6 segundos
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    color: '#666',
    width: 100,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeActive: {
    backgroundColor: '#4caf50',
  },
  badgeInactive: {
    backgroundColor: '#9e9e9e',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  arrivalTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2196f3',
  },
  buttonSuccess: {
    backgroundColor: '#4caf50',
  },
  buttonDanger: {
    backgroundColor: '#f44336',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
  },
  logsScroll: {
    maxHeight: 150,
  },
  logEmpty: {
    color: '#999',
    fontStyle: 'italic',
  },
  logItem: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 4,
  },
  instructionsCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
});
