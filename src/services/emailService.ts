import nodemailer, { Transporter } from 'nodemailer';

/**
 * Email Service for sending transactional emails
 */

let transporter: Transporter;

/**
 * Initialize email transporter
 */
export const initializeEmailService = () => {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    console.warn('⚠️  Email credentials not configured. Email notifications disabled.');
    return;
  }

  // Configure for Gmail
  if (emailService === 'gmail') {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
  }
  // Configure for Mailtrap (development)
  else if (emailService === 'mailtrap') {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.EMAIL_PORT || '465'),
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
  }
  // Default: Gmail
  else {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
  }

  console.log('✅ Email service initialized');
};

/**
 * Send email
 */
const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  try {
    if (!transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const result = await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME || 'PayFlow'} <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });

    console.log(`📧 Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

/**
 * Welcome email template
 */
export const sendWelcomeEmail = async (
  email: string,
  firstName: string
): Promise<boolean> => {
  const html = `
    <h2>Welcome to PayFlow! 🎉</h2>
    <p>Hi ${firstName},</p>
    <p>Thank you for signing up for PayFlow. Your account has been created successfully!</p>
    <p><strong>What you can do:</strong></p>
    <ul>
      <li>💰 Create and manage your digital wallet</li>
      <li>💸 Send money to other users instantly</li>
      <li>💳 Add money via credit/debit card</li>
      <li>📊 View your transaction history</li>
    </ul>
    <p>Happy transacting!</p>
    <p>Best regards,<br/>PayFlow Team</p>
  `;

  return sendEmail(email, 'Welcome to PayFlow!', html);
};

/**
 * Wallet deposit confirmation
 */
export const sendDepositConfirmationEmail = async (
  email: string,
  firstName: string,
  amount: number,
  newBalance: number
): Promise<boolean> => {
  const html = `
    <h2>Deposit Confirmed ✅</h2>
    <p>Hi ${firstName},</p>
    <p>Your deposit has been successfully completed!</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>New Balance:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${newBalance.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
      </tr>
    </table>
    <p>Your money is now available in your wallet.</p>
    <p>Best regards,<br/>PayFlow Team</p>
  `;

  return sendEmail(email, 'Deposit Confirmed', html);
};

/**
 * Wallet withdrawal confirmation
 */
export const sendWithdrawalConfirmationEmail = async (
  email: string,
  firstName: string,
  amount: number,
  newBalance: number
): Promise<boolean> => {
  const html = `
    <h2>Withdrawal Confirmed ✅</h2>
    <p>Hi ${firstName},</p>
    <p>Your withdrawal has been successfully processed!</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Remaining Balance:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${newBalance.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
      </tr>
    </table>
    <p>The money has been withdrawn from your wallet.</p>
    <p>Best regards,<br/>PayFlow Team</p>
  `;

  return sendEmail(email, 'Withdrawal Confirmed', html);
};

/**
 * Money transfer sent confirmation
 */
export const sendTransferSentEmail = async (
  email: string,
  firstName: string,
  recipientEmail: string,
  amount: number,
  newBalance: number
): Promise<boolean> => {
  const html = `
    <h2>Transfer Sent ✅</h2>
    <p>Hi ${firstName},</p>
    <p>Your money transfer has been sent successfully!</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Sent To:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${recipientEmail}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Your New Balance:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${newBalance.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
      </tr>
    </table>
    <p>The recipient will receive a notification shortly.</p>
    <p>Best regards,<br/>PayFlow Team</p>
  `;

  return sendEmail(email, 'Transfer Sent', html);
};

/**
 * Money transfer received confirmation
 */
export const sendTransferReceivedEmail = async (
  email: string,
  firstName: string,
  senderEmail: string,
  amount: number,
  newBalance: number
): Promise<boolean> => {
  const html = `
    <h2>Money Received ✅</h2>
    <p>Hi ${firstName},</p>
    <p>You have received a money transfer!</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>From:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${senderEmail}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong style="color: green;">+$${amount.toFixed(2)}</strong></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Your New Balance:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${newBalance.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
      </tr>
    </table>
    <p>The money is now available in your wallet!</p>
    <p>Best regards,<br/>PayFlow Team</p>
  `;

  return sendEmail(email, 'Money Received', html);
};

/**
 * Payment confirmation
 */
export const sendPaymentConfirmationEmail = async (
  email: string,
  firstName: string,
  amount: number,
  cardBrand: string,
  last4: string,
  newBalance: number,
  receiptUrl?: string
): Promise<boolean> => {
  const html = `
    <h2>Payment Confirmed ✅</h2>
    <p>Hi ${firstName},</p>
    <p>Your payment has been successfully processed!</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Card:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${cardBrand.toUpperCase()} ****${last4}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Wallet Balance:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${newBalance.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
      </tr>
    </table>
    ${receiptUrl ? `<p><a href="${receiptUrl}" style="color: #007bff;">📄 View Receipt</a></p>` : ''}
    <p>Thank you for using PayFlow!</p>
    <p>Best regards,<br/>PayFlow Team</p>
  `;

  return sendEmail(email, 'Payment Confirmed', html);
};

/**
 * Payment failed notification
 */
export const sendPaymentFailedEmail = async (
  email: string,
  firstName: string,
  amount: number,
  errorMessage: string
): Promise<boolean> => {
  const html = `
    <h2>Payment Failed ❌</h2>
    <p>Hi ${firstName},</p>
    <p>Unfortunately, your payment could not be processed.</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">$${amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${errorMessage}</td>
      </tr>
    </table>
    <p><strong>What you can do:</strong></p>
    <ul>
      <li>Check your card details</li>
      <li>Ensure you have sufficient funds</li>
      <li>Try again with a different payment method</li>
    </ul>
    <p>If the problem persists, please contact our support team.</p>
    <p>Best regards,<br/>PayFlow Team</p>
  `;

  return sendEmail(email, 'Payment Failed', html);
};

/**
 * Login alert email (for security)
 */
export const sendLoginAlertEmail = async (
  email: string,
  firstName: string,
  timestamp: string,
  ipAddress?: string
): Promise<boolean> => {
  const html = `
    <h2>New Login Alert 🔐</h2>
    <p>Hi ${firstName},</p>
    <p>A new login to your PayFlow account was detected.</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${timestamp}</td>
      </tr>
      ${ipAddress ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>IP Address:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${ipAddress}</td>
      </tr>
      ` : ''}
    </table>
    <p><strong>If this wasn't you:</strong> Please change your password immediately and contact our support team.</p>
    <p>Best regards,<br/>PayFlow Team</p>
  `;

  return sendEmail(email, 'New Login Alert', html);
};

/**
 * Email Verification
 */
export const sendVerificationEmail = async (
  email: string,
  firstName: string,
  verificationLink: string
): Promise<boolean> => {
  const html = `
    <h2>Verify your email 📧</h2>
    <p>Hi ${firstName},</p>
    <p>Please verify your email address by clicking the link below:</p>
    <p><a href="${verificationLink}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Verify Email</a></p>
    <p>Or copy and paste this link in your browser:</p>
    <p>${verificationLink}</p>
    <p>This link will expire in 24 hours.</p>
    <p>Best regards,<br/>PayFlow Team</p>
  `;
  return sendEmail(email, 'Verify your PayFlow email', html);
};

/**
 * Password Reset
 */
export const sendPasswordResetEmail = async (
  email: string,
  firstName: string,
  resetLink: string
): Promise<boolean> => {
  const html = `
    <h2>Password Reset Request 🔐</h2>
    <p>Hi ${firstName},</p>
    <p>We received a request to reset your password. Click the link below to set a new one:</p>
    <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#dc3545;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a></p>
    <p>Or copy and paste this link in your browser:</p>
    <p>${resetLink}</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>This link will expire in 1 hour.</p>
    <p>Best regards,<br/>PayFlow Team</p>
  `;
  return sendEmail(email, 'Reset your PayFlow password', html);
};

/**
 * Test email function (for development)
 */
export const sendTestEmail = async (email: string): Promise<boolean> => {
  const html = `
    <h2>Test Email 🧪</h2>
    <p>If you received this, email notifications are working correctly!</p>
    <p>Timestamp: ${new Date().toLocaleString()}</p>
  `;

  return sendEmail(email, 'PayFlow Test Email', html);
};