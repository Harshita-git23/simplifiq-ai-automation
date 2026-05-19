const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  return transporter;
}

/**
 * Send outreach email with PDF report attached
 */
async function sendOutreachEmail(leadData, emailContent, pdfPath) {
  logger.info(`Sending outreach email to: ${leadData.email}`);

  const { subject, body } = parseEmailContent(emailContent, leadData);
  const transport = getTransporter();

  const fileName = `SimplifIQ_Intelligence_Report_${leadData.companyName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  const isHtml = pdfPath.endsWith('.html');

  const attachmentName = isHtml
    ? `SimplifIQ_Report_${leadData.companyName.replace(/[^a-z0-9]/gi, '_')}.html`
    : fileName;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'SimplifIQ Intelligence'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: leadData.email,
    subject,
    html: buildEmailHTML(leadData, body),
    text: body,
    attachments: [
      {
        filename: attachmentName,
        path: pdfPath,
        contentType: isHtml ? 'text/html' : 'application/pdf',
      },
    ],
  };

  try {
    const info = await transport.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId} → ${leadData.email}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error(`Email send failed: ${err.message}`);
    throw err;
  }
}

function parseEmailContent(rawContent, leadData) {
  const lines = rawContent.split('\n');
  let subject = `Your Personalized Business Intelligence Report — ${leadData.companyName}`;
  let bodyStart = 0;

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (lines[i].toUpperCase().startsWith('SUBJECT:')) {
      subject = lines[i].replace(/^SUBJECT:\s*/i, '').trim();
      bodyStart = i + 1;
      // Skip blank line after subject
      if (lines[bodyStart] && lines[bodyStart].trim() === '') bodyStart++;
      break;
    }
  }

  const body = lines.slice(bodyStart).join('\n').trim();
  return { subject, body };
}

function buildEmailHTML(leadData, bodyText) {
  const paragraphs = bodyText.split('\n\n').filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #0a0f1e 0%, #1a2a5e 100%); padding: 32px 40px; }
  .header-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .logo-mark { width: 36px; height: 36px; background: linear-gradient(135deg, #1a56db, #c9a227); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; color: white; font-family: Georgia, serif; }
  .logo-text { font-family: Georgia, serif; font-size: 18px; color: white; }
  .logo-text span { color: #c9a227; }
  .header h2 { color: white; font-size: 18px; margin: 0; font-weight: 400; }
  .header h2 strong { color: #c9a227; }
  .body { padding: 36px 40px; }
  .body p { color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
  .highlight-box { background: #f0f4ff; border-left: 4px solid #1a56db; padding: 16px 20px; border-radius: 0 10px 10px 0; margin: 20px 0; }
  .highlight-box p { margin: 0; color: #1e3a8a; font-size: 14px; }
  .cta { text-align: center; margin: 28px 0; }
  .cta a { background: #1a56db; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block; }
  .footer { background: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb; }
  .footer p { font-size: 12px; color: #9ca3af; margin: 0 0 4px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="header-logo">
      <div class="logo-mark">S</div>
      <div class="logo-text">Simplif<span>IQ</span></div>
    </div>
    <h2>Your personalized report for <strong>${escHtml(leadData.companyName)}</strong> is ready</h2>
  </div>
  <div class="body">
    ${paragraphs.map(p => `<p>${escHtml(p).replace(/\n/g, '<br>')}</p>`).join('')}
    <div class="highlight-box">
      <p>📎 Your full Business Intelligence &amp; AI Opportunity Audit Report is attached to this email.</p>
    </div>
    <div class="cta">
      <a href="mailto:hello@simplifiq.io?subject=Strategy Call - ${encodeURIComponent(leadData.companyName)}">Schedule Your Strategy Call →</a>
    </div>
  </div>
  <div class="footer">
    <p>SimplifIQ Intelligence Platform · hello@simplifiq.io</p>
    <p>This report was generated automatically using AI-powered business intelligence. All insights are based on publicly available data.</p>
    <p>© ${new Date().getFullYear()} SimplifIQ. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Verify SMTP connection
 */
async function verifyConnection() {
  try {
    const transport = getTransporter();
    await transport.verify();
    logger.info('SMTP connection verified');
    return true;
  } catch (err) {
    logger.warn(`SMTP verification failed: ${err.message}`);
    return false;
  }
}

module.exports = { sendOutreachEmail, verifyConnection };
