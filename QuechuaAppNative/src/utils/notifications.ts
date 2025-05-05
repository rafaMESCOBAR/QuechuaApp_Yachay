// src/utils/notifications.ts
import * as Notifications from 'expo-notifications';

// Configurar el manejador de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const checkStreakNotification = async (streakDays: number) => {
  const milestones = [3, 7, 15, 30, 50, 100];
  
  if (milestones.includes(streakDays)) {
    // Mostrar notificación de logro
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "¡Racha Alcanzada! 🔥",
        body: `Has mantenido tu racha por ${streakDays} días. ¡Sigue así!`,
        data: { type: 'streak_achievement', days: streakDays },
      },
      trigger: null,
    });
  }
};

export const requestNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return false;
  }
  
  return true;
};