const nodemailer = require('nodemailer');

// SMTP credentials come from backend/.env (never commit the password).
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: (process.env.SMTP_SECURE || 'true') !== 'false', // SSL on 465
  auth: {
    user: process.env.SMTP_USER || 'support@grahvarta.com',
    pass: process.env.SMTP_PASS,
  },
});
if (!process.env.SMTP_PASS) console.warn('[mailer] SMTP_PASS is not set — emails (OTP, welcome) will fail');

exports.sendAstrologerWelcome = async ({ to, name, email, password, loginUrl }) => {
  await transporter.sendMail({
    from: '"Grahvarta" <support@grahvarta.com>',
    to,
    subject: '🎉 Welcome to Grahvarta — Your Astrologer Account is Ready',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D0D0D;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#E8762A;padding:28px 32px;">
          <h1 style="margin:0;font-size:22px;">Welcome to Grahvarta, ${name}!</h1>
          <p style="margin:8px 0 0;opacity:0.85;font-size:14px;">Your astrologer account has been activated.</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#aaa;font-size:14px;">Your application has been reviewed and approved. Here are your login credentials:</p>
          <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:10px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 10px;color:#aaa;font-size:13px;">Login Email</p>
            <p style="margin:0 0 18px;font-size:16px;font-weight:bold;">${email}</p>
            <p style="margin:0 0 10px;color:#aaa;font-size:13px;">Temporary Password</p>
            <p style="margin:0;font-size:20px;font-weight:bold;color:#E8762A;letter-spacing:2px;">${password}</p>
          </div>
          <p style="margin-top:28px;color:#666;font-size:12px;">If you have any questions, reply to this email.</p>
        </div>
      </div>
    `,
  });
};

exports.sendHiringOtp = async ({ to, otp }) => {
  await transporter.sendMail({
    from: '"Grahvarta" <support@grahvarta.com>',
    to,
    subject: `${otp} is your Grahvarta verification code`,
    text: `Your Grahvarta agent registration verification code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0D0D0D;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#E8762A;padding:22px 28px;">
          <h1 style="margin:0;font-size:20px;">Verify your email</h1>
        </div>
        <div style="padding:28px;">
          <p style="color:#aaa;font-size:14px;margin:0 0 18px;">Use this code to continue your Grahvarta agent registration:</p>
          <p style="margin:0 0 18px;font-size:32px;font-weight:bold;letter-spacing:10px;color:#E8762A;">${otp}</p>
          <p style="color:#666;font-size:12px;margin:0;">The code expires in 10 minutes. If you did not request it, ignore this email.</p>
        </div>
      </div>
    `,
  });
};
