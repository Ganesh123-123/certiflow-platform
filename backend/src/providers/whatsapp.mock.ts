import { env } from '../config/env';

interface WhatsAppMessage {
  to: string;
  candidateName: string;
  certificateNumber: string;
  verificationUrl: string;
}

interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
}

export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppResult> {
  // Simulate network delay (1-3 seconds)
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

  // 10% chance of timeout
  if (Math.random() < 0.1) {
    throw new Error('WhatsApp gateway timeout');
  }

  const isSuccess = Math.random() < env.WHATSAPP_SUCCESS_RATE;

  if (isSuccess) {
    return {
      success: true,
      messageId: `WA-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      deliveredAt: new Date(),
    };
  }

  return {
    success: false,
    error: 'WhatsApp delivery failed: recipient unreachable',
  };
}
