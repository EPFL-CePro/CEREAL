import "server-only"

import { getEmailTemplate } from "@/app/lib/database"
import {
  EMAIL_TEMPLATES,
  type EmailTemplateKey,
  type TemplateContext,
  type TemplateDefinition,
  renderString,
} from "@/app/lib/mail/email-templates"
import { type MailAttachment, sendMail } from "@/app/lib/mail/send-mail"

/* Send one of the admin-customizable emails. The template (subject, body,
recipients) is loaded from the DB and falls back to the defaults defined in
the registry if the row is missing. All {{token}} placeholders are resolved
from the provided context. The SMTP account comes from EMAIL_TEMPLATES only:
it is set in the code, the admin cannot change it from the templates settings. */
export async function sendTemplatedMail(
  key: EmailTemplateKey,
  context: TemplateContext,
  attachments: MailAttachment[] = [],
) {
  const definition: TemplateDefinition = EMAIL_TEMPLATES[key]
  const defaults = definition.defaults
  const template = await getEmailTemplate(key)

  const subject = renderString(template?.subject ?? defaults.subject, context)
  const body = renderString(template?.body ?? defaults.body, context)
  const to = renderString(template?.recipients_to ?? defaults.to, context)
  const cc = renderString(template?.recipients_cc ?? defaults.cc, context)
  const replyTo = renderString(template?.reply_to ?? defaults.replyTo, context)

  await sendMail({
    to,
    subject,
    content: body,
    cc,
    replyTo: replyTo || undefined,
    account: definition.account ?? "default",
    attachments,
  })

  // What was actually sent, so that the caller can keep a trace of it
  return { to, cc, subject, body }
}
