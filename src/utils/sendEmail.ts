import * as nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_ADDRESS,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
    console.error("SMTP configuration:", transporter.options);
    throw error;
  }
};
