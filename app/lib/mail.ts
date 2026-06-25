'use server';

import nodemailer from 'nodemailer';
import { getEmailTemplate } from '@/app/lib/database';
import {
    EMAIL_TEMPLATES,
    EmailTemplateKey,
    TemplateContext,
    renderString,
} from '@/app/lib/emailTemplates';

function getMailSubjectPrefix() {
    return process.env.CEREAL_ENV === 'test' ? 'TEST - ' : '';
}

export async function sendMail(to: string, subject: string, content: string, cc: string, replyTo?: string) {
    const transporter = nodemailer.createTransport({
        host: process.env.MAIL_SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.MAIL_AUTH_USER,
            pass: process.env.MAIL_AUTH_PASS
        }
    });

    return transporter.sendMail({
        from: process.env.MAIL_FROM_EMAIL,
        to: to,
        subject: `${getMailSubjectPrefix()}${subject}`,
        text: content,
        cc: cc,
        replyTo: replyTo
    });
}

/* Send one of the admin-customizable emails. The template (subject, body,
recipients) is loaded from the DB and falls back to the defaults defined in
the registry if the row is missing. All {{token}} placeholders are resolved
from the provided context. */
export async function sendTemplatedMail(key: EmailTemplateKey, context: TemplateContext) {
    const defaults = EMAIL_TEMPLATES[key].defaults;
    const template = await getEmailTemplate(key);

    const subject = renderString(template?.subject ?? defaults.subject, context);
    const body = renderString(template?.body ?? defaults.body, context);
    const to = renderString(template?.recipients_to ?? defaults.to, context);
    const cc = renderString(template?.recipients_cc ?? defaults.cc, context);
    const replyTo = renderString(template?.reply_to ?? defaults.replyTo, context);

    return sendMail(to, subject, body, cc, replyTo || undefined);
}