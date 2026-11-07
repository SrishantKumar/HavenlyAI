import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Client-Side Local Task Scheduler for Behavioral Activation.
 *
 * CRITICAL PRIVACY ARCHITECTURE:
 * Behavioral tasks contain sensitive psychological interventions (e.g. social exposure, somatic steps).
 * Scheduling is performed EXCLUSIVELY via local device timers (expo-notifications local triggers)
 * to prevent leaking unencrypted therapeutic tasks to third-party push servers (APNs / FCM) in plaintext.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('behavioral_activation', {
        name: 'Behavioral Activation Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
      });
    }

    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Failed to check notification permissions:', e);
    return false;
  }
}

/**
 * Schedules a local notification for an AI-suggested behavioral task 24 hours later.
 * @param task The offline, physical, or social action suggested by the AI
 * @param rationale The clinical rationale for breaking rumination loops
 */
export async function scheduleActivationTask(
  task: string,
  rationale?: string
): Promise<string | null> {
  if (!task || !task.trim()) return null;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permission not granted for local task reminder.');
    }

    // Schedule local push notification exactly 24 hours (86,400 seconds) in the future
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Havenly \u2022 Mindful Action for You',
        body: task.trim(),
        data: {
          type: 'behavioral_activation',
          task: task.trim(),
          rationale: rationale || '',
          scheduledAt: new Date().toISOString(),
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 24 * 60 * 60, // 24 hours
        repeats: false,
      },
    });

    console.log(`[TaskScheduler] Local behavioral task scheduled for 24h later (ID: ${notificationId}): "${task}"`);
    return notificationId;
  } catch (error) {
    console.error('Failed to schedule local behavioral activation notification:', error);
    return null;
  }
}

