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

  // ---- Auth (OTP login/signup + signed session tokens) --------------------
  authSecret: process.env.AUTH_SECRET || 'sahayak-dev-secret-change-me',
  tokenTtlDays: Number(process.env.TOKEN_TTL_DAYS || 7),
  otpTtlMin: Number(process.env.OTP_TTL_MIN || 10),
  adminInviteCode: process.env.ADMIN_INVITE_CODE || 'SAHAYAK-ADMIN',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@sahayak.local',
  adminPhone: process.env.ADMIN_PHONE || '+910000000000',
  adminName: process.env.ADMIN_NAME || 'Sahayak Admin',

  // ---- Gig expiry -------------------------------------------------------
  // An OPEN gig with no customer response (no hire) is auto-cancelled after
  // this many hours. Lower it (e.g. 0.01) to demo the sweep quickly.
  gigExpiryHours: Number(process.env.GIG_EXPIRY_HOURS ?? 48),
  sweepMs: Number(process.env.EXPIRY_SWEEP_MS || 600000),

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
