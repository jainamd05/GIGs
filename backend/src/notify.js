import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { config, smtpConfigured, twilioConfigured } from './config.js';
import { logActivity } from './activity.js';

let mailer = null;
if (smtpConfigured()) {
  mailer = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
}

let twilioClient = null;
if (twilioConfigured()) {
  twilioClient = twilio(config.twilio.sid, config.twilio.token);
}

/**
 * Send an email. Falls back to a simulated (logged) send when SMTP is not
 * configured, so the whole flow works offline.
 */
export async function sendEmail({ to, subject, text, jobId = null }) {
  if (!to) return;
  if (!mailer) {
    logActivity({ kind: 'notify', channel: 'email', jobId, actor: to, message: `${subject} — ${text}`, simulated: true });
    return;
  }
  try {
    await mailer.sendMail({ from: config.smtp.from, to, subject, text });
    logActivity({ kind: 'notify', channel: 'email', jobId, actor: to, message: subject });
  } catch (err) {
    logActivity({ kind: 'notify', channel: 'email', jobId, actor: to, message: `FAILED (${err.message}) — ${subject}`, simulated: true });
  }
}

async function sendTwilio({ channel, to, body, jobId }) {
  const enabled = channel === 'sms' ? config.twilio.enableSms : config.twilio.enableWhatsapp;
  if (!enabled) return;
  if (!to) return;

  const from = channel === 'sms' ? config.twilio.smsFrom : config.twilio.whatsappFrom;
  const toAddr = channel === 'whatsapp' ? `whatsapp:${to.replace(/^whatsapp:/, '')}` : to;

  if (!twilioClient || !from) {
    logActivity({ kind: 'notify', channel, jobId, actor: to, message: body, simulated: true });
    return;
  }
  try {
    await twilioClient.messages.create({ from, to: toAddr, body });
    logActivity({ kind: 'notify', channel, jobId, actor: to, message: body });
  } catch (err) {
    logActivity({ kind: 'notify', channel, jobId, actor: to, message: `FAILED (${err.message}) — ${body}`, simulated: true });
  }
}

export const sendSms = ({ to, body, jobId = null }) => sendTwilio({ channel: 'sms', to, body, jobId });
export const sendWhatsApp = ({ to, body, jobId = null }) => sendTwilio({ channel: 'whatsapp', to, body, jobId });

/** Fan a single message out to email + SMS + WhatsApp for one recipient. */
export async function notifyAll({ email, phone, subject, body, jobId = null }) {
  await Promise.all([
    sendEmail({ to: email, subject, text: body, jobId }),
    sendSms({ to: phone, body: `${subject}: ${body}`, jobId }),
    sendWhatsApp({ to: phone, body: `*${subject}*\n${body}`, jobId }),
  ]);
}

export function integrationStatus() {
  return {
    email: smtpConfigured() ? 'live' : 'simulated',
    sms: twilioConfigured() && config.twilio.smsFrom ? 'live' : 'simulated',
    whatsapp: twilioConfigured() && config.twilio.whatsappFrom ? 'live' : 'simulated',
  };
}
