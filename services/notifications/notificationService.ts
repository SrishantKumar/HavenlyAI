import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CARING_MESSAGES = [
  "Haven is thinking of you. Are you feeling okay right now?",
  "Just checking in. Remember to take a deep breath today.",
  "You've been doing great. Take a moment for yourself if you need it.",
  "Havenly is here if you need a safe space to vent.",
  "A gentle reminder that your feelings are valid. How are you?"
];

export const notificationService = {
  /**
   * Initializes notification handlers and requests permissions.
   * Should be called on app startup.
   */
  async init() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED',
      });
    }

    await this.scheduleCaringCheckIns();
  },

  /**
   * Schedules a random caring message to trigger after a certain interval.
   * To prevent spam, we cancel all previously scheduled ones first.
   */
  async scheduleCaringCheckIns() {
    // Clear all previously scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule next check-in for 1 day from now
    // In a real app, this might be randomized or based on user activity
    const message = CARING_MESSAGES[Math.floor(Math.random() * CARING_MESSAGES.length)];
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "HavenlyAI 💜",
        body: message,
        data: { screen: 'Sanctuary' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60 * 60 * 24, // 24 hours
        repeats: false, // Wait until they open the app again to schedule the next one
      },
    });
  }
};
