import nodemailer from "nodemailer";
import mg from "nodemailer-mailgun-transport";
import mailgunTransport from "nodemailer-mailgun-transport";
import Mail from "nodemailer/lib/mailer";
import * as process from "process";
import { createEmailToken } from "@/service/manageVerifyToken";
import { emailHtml } from "@/components/EmailHtmlExample";

const mailGunSendMail = (email: Mail.Options) => {
  const auth: mailgunTransport.Options = {
    auth: {
      api_key: process.env.NEXT_PUBLIC_MAILGUN_API_KEY!!,
      domain: process.env.NEXT_PUBLIC_MAILGUN_DOMAIN_URL,
    },
  };
  const nodemailerMailgun = nodemailer.createTransport(mg(auth));
  try {
    nodemailerMailgun.sendMail(email, (err, info) => {
      if (err) {
        console.log(`Error: ${err}`);
      } else {
        console.log(`Response: ${info}`);
      }
    });
    return true;
  } catch (e) {
    return false;
  }
};

export const sendSecretMail = (
  address: string,
  userId: string,
  userName: string,
  organizationId: string,
  organizationName: string
) => {
  const token = createEmailToken(userId, organizationId, organizationName);
  const email = {
    from: "studyingFarmer@developer.com",
    to: address,
    subject: "공부하는 농부 - 소속 인증 이메일",
    html: emailHtml(token, userName),
  };
  return mailGunSendMail(email);
};
