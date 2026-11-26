import "server-only"
import nodemailer from "nodemailer"

import {
  type MailAccount,
  getMailAccountConfig,
} from "@/app/lib/mail/mail-accounts"

function getMailSubjectPrefix() {
  return process.env.CEREAL_ENV === "test" ? "TEST - " : ""
}

export async function sendMail(
  to: string,
  subject: string,
  content: string,
  cc: string,
  replyTo?: string,
  account: MailAccount = "default",
) {
  const config = getMailAccountConfig(account)

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: 587,
    secure: false,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  return transporter.sendMail({
    from: config.from,
    to,
    subject: `${getMailSubjectPrefix()}${subject}`,
    text: content,
    cc,
    replyTo,
  })
}
