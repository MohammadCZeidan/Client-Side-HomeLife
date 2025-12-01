import { apiCall } from './apiCall';

export interface NotificationOptions {
  channels?: ('email' | 'telegram' | 'slack')[];
  message?: string;
  subject?: string;
  senderEmail?: string;
}

export const n8nAPI = {
  // Send notification to user via n8n (email/telegram/slack)
  // This will trigger a notification workflow that sends to the user's configured channels
  sendNotification: async (
    householdId: string,
    options: NotificationOptions = {}
  ): Promise<{ success: boolean; message: string }> => {
    const channels = options.channels || ['email'];
    const message = options.message || 'This is a test notification from HomeLife.';
    const subject = options.subject || 'HomeLife Notification';
    const senderEmail = options.senderEmail || '';

    return apiCall<{ success: boolean; message: string }>('/n8n/send-notification', {
      method: 'POST',
      body: JSON.stringify({
        household_id: householdId,
        channels,
        message,
        subject,
        sender_email: senderEmail,
      }),
    });
  },

  // Trigger daily expiry alerts workflow (WF1)
  triggerExpiryAlerts: async (householdId: string): Promise<{ success: boolean; message: string }> => {
    return apiCall<{ success: boolean; message: string }>(`/n8n/households/${householdId}/trigger-expiry-alerts`, {
      method: 'POST',
    });
  },

  // Trigger weekly meal plan draft workflow (WF2)
  triggerMealPlanDraft: async (householdId: string): Promise<{ success: boolean; message: string }> => {
    return apiCall<{ success: boolean; message: string }>(`/n8n/households/${householdId}/trigger-meal-plan-draft`, {
      method: 'POST',
    });
  },
};

