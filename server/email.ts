import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'DriveLedger <noreply@driveledger.app>';

const isSmtpConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter: nodemailer.Transporter | null = null;

if (isSmtpConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  console.log('[EMAIL] SMTP configured, emails will be sent');
} else {
  console.log('[EMAIL] SMTP not configured, emails will be logged to console');
}

function wrapHtml(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: 700; color: #1a1a2e; }
    .logo span { color: #4361ee; }
    .content { color: #333; line-height: 1.6; font-size: 16px; }
    .button { display: inline-block; background: #4361ee; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; color: #888; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">Drive<span>Ledger</span></div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} DriveLedger. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (transporter) {
    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Sent "${subject}" to ${to}`);
  } else {
    console.log(`[EMAIL] (console) To: ${to}`);
    console.log(`[EMAIL] (console) Subject: ${subject}`);
    console.log(`[EMAIL] (console) Body preview: ${subject}`);
  }
}

export async function sendRegistrationEmail(to: string, username: string): Promise<void> {
  const subject = 'Welcome to DriveLedger!';
  const html = wrapHtml(subject, `
    <h2>Welcome, ${username}!</h2>
    <p>Your DriveLedger account has been created successfully.</p>
    <p>You can now start tracking your vehicle finances, costs, repairs, and more — all in one place.</p>
    <p>If you have any questions, feel free to reach out.</p>
    <p style="margin-top: 30px;">Happy driving!</p>
    <p><strong>The DriveLedger Team</strong></p>
  `);
  await sendMail(to, subject, html);
}

export async function sendPasswordResetEmail(to: string, resetToken: string, resetUrl: string): Promise<void> {
  const subject = 'Reset Your DriveLedger Password';
  const fullResetUrl = `${resetUrl}?token=${resetToken}`;
  const html = wrapHtml(subject, `
    <h2>Password Reset Request</h2>
    <p>We received a request to reset your DriveLedger password.</p>
    <p>Click the button below to set a new password. This link expires in 1 hour.</p>
    <p style="text-align: center;">
      <a href="${fullResetUrl}" class="button">Reset Password</a>
    </p>
    <p style="font-size: 14px; color: #666;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
    <p style="font-size: 12px; color: #999; word-break: break-all;">Direct link: ${fullResetUrl}</p>
  `);
  await sendMail(to, subject, html);
}

export async function sendApiTokenCreatedEmail(to: string, tokenName: string): Promise<void> {
  const subject = 'New API Token Created — DriveLedger';
  const html = wrapHtml(subject, `
    <h2>New API Token Created</h2>
    <p>A new API token has been created on your DriveLedger account:</p>
    <p style="background: #f4f4f7; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 15px;">
      <strong>${tokenName}</strong>
    </p>
    <p>If you did not create this token, please log in to your account immediately and revoke it.</p>
    <p><strong>The DriveLedger Team</strong></p>
  `);
  await sendMail(to, subject, html);
}
