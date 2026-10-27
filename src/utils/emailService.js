import nodemailer from 'nodemailer';

/**
 * Configure Gmail SMTP Transporter
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'safwanarshad782@gmail.com',
    pass: process.env.EMAIL_PASS || 'umuaiwppalmcehly',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * 1. Send Interview Invitation Email to Selected / Shortlisted Candidate
 */
export const sendInterviewInvitationEmail = async ({
  to,
  candidateName = 'Candidate',
  jobTitle = 'Position',
  company = 'Hiring Company',
  date,
  time,
  mode = 'Online',
  meetingLink = '',
  notes = '',
}) => {
  if (!to) {
    console.warn('⚠️ No recipient email provided for interview invitation');
    return false;
  }

  const subject = `🎉 Interview Invitation: ${jobTitle} at ${company} - Smart Career AI`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Interview Invitation - Smart Career</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #1e40af, #2563eb); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; background: rgba(255,255,255,0.2); font-size: 12px; font-weight: 700; margin-top: 10px; letter-spacing: 0.5px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .lead { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: #64748b; }
    .value { font-weight: 700; color: #0f172a; text-align: right; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); }
    .notes-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 16px; font-size: 13px; color: #1e40af; }
    .tips { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin-top: 24px; font-size: 13px; color: #166534; }
    .tips h4 { margin: 0 0 6px 0; font-size: 14px; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Smart Career AI</h1>
      <p>Automated Multi-Discipline Talent Matching Platform</p>
      <span class="badge">OFFICIAL INTERVIEW INVITATION 🎯</span>
    </div>

    <div class="content">
      <div class="greeting">Assalam-o-Alaikum, ${candidateName}! 👋</div>
      
      <p class="lead">
        Congratulations! Following a comprehensive review of your profile and high-compatibility AI ranking, 
        <strong>${company}</strong> is pleased to invite you for an official interview for the position of 
        <strong>${jobTitle}</strong>.
      </p>

      <div class="card">
        <div class="row">
          <span class="label">🏢 Company / Recruiter:</span>
          <span class="value">${company}</span>
        </div>
        <div class="row">
          <span class="label">💼 Applied Position:</span>
          <span class="value">${jobTitle}</span>
        </div>
        <div class="row">
          <span class="label">📅 Interview Date:</span>
          <span class="value">${date}</span>
        </div>
        <div class="row">
          <span class="label">⏰ Time:</span>
          <span class="value">${time}</span>
        </div>
        <div class="row">
          <span class="label">🌐 Mode:</span>
          <span class="value">${mode}</span>
        </div>
        ${
          meetingLink
            ? `
        <div class="row">
          <span class="label">🔗 Meeting Link / Room:</span>
          <span class="value"><a href="${meetingLink}" target="_blank" style="color: #2563eb;">${meetingLink}</a></span>
        </div>`
            : ''
        }
      </div>

      ${
        notes
          ? `
      <div class="notes-box">
        <strong>📋 Recruiter's Agenda / Instructions:</strong><br>
        ${notes}
      </div>`
          : ''
      }

      <div class="btn-container">
        <a href="http://localhost:5173/applications" class="btn">View Application Dossier 🚀</a>
      </div>

      <div class="tips">
        <h4>💡 Recommended Preparation Tips:</h4>
        • Review the core responsibilities and technical stack for <strong>${jobTitle}</strong>.<br>
        • Ensure a quiet environment and test your audio/camera prior to the scheduled time.<br>
        • Keep an updated copy of your resume and project portfolio ready for screen sharing.
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">This email was sent by <strong>Smart Career Role-Match AI System</strong> on behalf of <strong>${company}</strong>.</p>
      <p style="margin: 0;">© 2026 Smart Career Platform • Automated Candidate Notification Engine</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Smart Career AI Notifications" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    console.log(
      `📧 [Email Dispatched] Interview invite sent to ${to} (MessageID: ${info.messageId})`
    );
    return true;
  } catch (error) {
    console.error(
      `❌ [Email Error] Could not send interview email to ${to}:`,
      error.message
    );
    return false;
  }
};

/**
 * 2. Send Shortlisted Notification Email
 */
export const sendCandidateShortlistedEmail = async ({
  to,
  candidateName = 'Candidate',
  jobTitle = 'Position',
  company = 'Hiring Company',
}) => {
  if (!to) return false;

  const subject = `⭐ Congratulations! You are Shortlisted for ${jobTitle} at ${company}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b; }
    .box { max-width: 550px; margin: 0 auto; background: #fff; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .btn { display: inline-block; background: #059669; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="box">
    <h2 style="color: #059669; margin-top: 0;">⭐ Profile Shortlisted!</h2>
    <p>Dear <strong>${candidateName}</strong>,</p>
    <p>Great news! Your application for <strong>${jobTitle}</strong> has been <strong>shortlisted</strong> by <strong>${company}</strong>.</p>
    <p>The recruitment team will soon review your portfolio and send you the scheduled interview slots.</p>
    <a href="http://localhost:5173/applications" class="btn">View Application Status</a>
    <p style="margin-top: 25px; font-size: 12px; color: #94a3b8;">Smart Career Recruitment Engine</p>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"Smart Career AI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    return true;
  } catch (err) {
    console.warn(`Shortlist email failed for ${to}:`, err.message);
    return false;
  }
};

/**
 * 3. Send One-Time Password (OTP) Verification Email
 */
export const sendOtpVerificationEmail = async ({ to, name = 'User', otp }) => {
  if (!to || !otp) return false;

  const subject = `🔑 Your Smart Career Account Verification Code: ${otp}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b; }
    .box { max-width: 500px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; }
    .otp { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; background: #eff6ff; padding: 14px; border-radius: 8px; margin: 20px 0; display: inline-block; }
  </style>
</head>
<body>
  <div class="box">
    <h2 style="color: #1e293b; margin: 0 0 10px 0;">Account Verification</h2>
    <p>Hello <strong>${name}</strong>, use the one-time code below to verify your Smart Career session:</p>
    <div class="otp">${otp}</div>
    <p style="font-size: 13px; color: #64748b;">This OTP code expires in 10 minutes. If you did not request this, please ignore this email.</p>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"Smart Career Security" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    return true;
  } catch (err) {
    console.warn(`OTP email failed for ${to}:`, err.message);
    return false;
  }
};

export default {
  transporter,
  sendInterviewInvitationEmail,
  sendCandidateShortlistedEmail,
  sendOtpVerificationEmail,
};
