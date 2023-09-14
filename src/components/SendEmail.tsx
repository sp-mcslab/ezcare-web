import nodemailer from "nodemailer";
import mg from "nodemailer-mailgun-transport";
import mailgunTransport from "nodemailer-mailgun-transport";
import Mail from "nodemailer/lib/mailer";
import * as process from "process";

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
