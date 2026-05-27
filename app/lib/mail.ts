'use server';

import nodemailer from 'nodemailer';

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