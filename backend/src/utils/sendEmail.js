// src/utils/sendEmail.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// MAIL_DRY_RUN=1 (e2e / local demos): log instead of sending, so no mail account is needed.
const sendEmail = async (to, subject, html) => {
  if (process.env.MAIL_DRY_RUN === '1') {
    const text = String(html).replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
    console.log(`[mail:dry-run] to=${to} subject=${subject} text=${text}`);
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or use your preferred email service
    auth: {
      user: process.env.EMAIL_USER, // use your gmail sender
      pass: process.env.EMAIL_PASS, //use password app key
    },
  });

  await transporter.sendMail({
    from: `${process.env.EMAIL_USER}`,
    to:to,
    subject:subject,
    html:html,
  });
};

export default sendEmail;
