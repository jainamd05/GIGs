import 'dotenv/config';

const bool = (v, def = false) => {
  if (v === undefined || v === '') return def;
  return String(v).toLowerCase() === 'true' || v === '1';
};

export const config = {
  port: Number(process.env.PORT || 4000),
  cooldownHours: Number(process.env.COOLDOWN_HOURS ?? 12),
  dbFile: process.env.DB_FILE || 'sahayak.db',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Sahayak <no-reply@sahayak.local>',
  },

  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID || '',
    token: process.env.TWILIO_AUTH_TOKEN || '',
    smsFrom: process.env.TWILIO_SMS_FROM || '',
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || '',
    enableSms: bool(process.env.ENABLE_SMS, true),
    enableWhatsapp: bool(process.env.ENABLE_WHATSAPP, true),
  },
};

export const smtpConfigured = () =>
  Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);

export const twilioConfigured = () =>
  Boolean(config.twilio.sid && config.twilio.token);
