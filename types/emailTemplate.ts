export type EmailTemplate = {
    id: number;
    template_key: string;
    section: string;
    name: string;
    subject: string;
    body: string;
    recipients_to: string;
    recipients_cc: string;
    reply_to: string;
}
