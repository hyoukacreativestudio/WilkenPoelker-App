import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to a screen from outside React components (e.g., push notification handlers).
 * Waits for navigator to be ready before navigating.
 */
export function navigateFromNotification(deepLink) {
  if (!deepLink || !navigationRef.isReady()) return;

  try {
    // deepLink can be a string like "/repairs/uuid" or an object { type, id }
    if (typeof deepLink === 'string') {
      // Parse string deep links: "/repairs/uuid", "/appointments/uuid", etc.
      const parts = deepLink.split('/').filter(Boolean);

      if (parts[0] === 'repairs' && parts[1]) {
        navigationRef.navigate('Repairs', { screen: 'RepairDetail', params: { repairId: parts[1] } });
      } else if (parts[0] === 'appointments' && parts[1]) {
        navigationRef.navigate('More', { screen: 'AppointmentDetail', params: { appointmentId: parts[1] } });
      } else if (parts[0] === 'service' && parts[1] === 'chat' && parts[2]) {
        navigationRef.navigate('Service', { screen: 'Chat', params: { ticketId: parts[2] } });
      } else if (parts[0] === 'service' && parts[1] === 'ticket' && parts[2]) {
        navigationRef.navigate('Service', { screen: 'TicketDetail', params: { ticketId: parts[2] } });
      } else if (parts[0] === 'feed' && parts[1] === 'post' && parts[2]) {
        navigationRef.navigate('Feed', { screen: 'PostDetail', params: { postId: parts[2] } });
      } else if (parts[0] === 'notifications') {
        navigationRef.navigate('More', { screen: 'Notifications' });
      }
    } else if (typeof deepLink === 'object') {
      // Object deep links: { type: 'repair', id: 'uuid' }
      const { type, id } = deepLink;

      switch (type) {
        case 'repair':
        case 'repair_status':
        case 'repair_ready':
        case 'new_repair':
          if (id) navigationRef.navigate('Repairs', { screen: 'RepairDetail', params: { repairId: id } });
          else navigationRef.navigate('Repairs', { screen: 'RepairsList' });
          break;
        case 'appointment':
        case 'appointment_reminder':
        case 'appointment_proposal':
          if (id) navigationRef.navigate('More', { screen: 'AppointmentDetail', params: { appointmentId: id } });
          else navigationRef.navigate('More', { screen: 'Appointments' });
          break;
        case 'chat':
        case 'chat_message':
          if (id) navigationRef.navigate('Service', { screen: 'Chat', params: { ticketId: id } });
          break;
        case 'ticket':
        case 'new_ticket':
          if (id) navigationRef.navigate('Service', { screen: 'TicketDetail', params: { ticketId: id } });
          else navigationRef.navigate('Service', { screen: 'ServiceHome' });
          break;
        case 'post':
        case 'feed':
          if (id) navigationRef.navigate('Feed', { screen: 'PostDetail', params: { postId: id } });
          else navigationRef.navigate('Feed', { screen: 'FeedHome' });
          break;
        default:
          // Fallback: go to notifications
          navigationRef.navigate('More', { screen: 'Notifications' });
      }
    }
  } catch (err) {
    console.warn('Deep link navigation failed:', err.message);
  }
}
