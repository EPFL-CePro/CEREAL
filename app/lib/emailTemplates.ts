export type Placeholder = {
    token: string;
    desc: string;
};

export type TemplateDefinition = {
    section: string;
    name: string;
    placeholders: Placeholder[];
    defaults: {
        subject: string;
        body: string;
        to: string;
        cc: string;
        replyTo: string;
    };
};

export const EMAIL_TEMPLATES = {
    exam_services_confirmation: {
        section: "CEREAL",
        name: "Exam services subscription confirmation",
        placeholders: [
            { token: "course", desc: "Course code" },
            { token: "teachers", desc: "Teachers list" },
            { token: "contactEmail", desc: "Contact email" },
            { token: "examTypes", desc: "Selected exam types" },
            { token: "service", desc: "Service description" },
            { token: "serviceLevel", desc: "Service level" },
            { token: "examDates", desc: "Exam dates per type (multi-line)" },
            { token: "remark", desc: "Remarks" },
            { token: "registrant.email", desc: "Registrant email (recipient)" },
        ],
        defaults: {
            subject: "CePro - exam services subscription confirmation",
            body: `
Hello,
Your subscription to our exam services has been successfully registered:

- Course: {{course}}
- Teacher(s): {{teachers}}
- Contact: {{contactEmail}}
- Type(s) of exam: {{examTypes}}
- Service: {{service}}
- Level of service: {{serviceLevel}}
- Date of exam:
{{examDates}}
- Remarks: {{remark}}

If you have asked to discuss with us which service to use, we will get back to you shortly.
Your comments will also be taken into account and we will do what is necessary to take them into account and keep you informed if necessary.

You can already browse our moodle pages, which contain all the information you need to prepare and organise your exam.
https://moodle.epfl.ch/course/view.php?id=16420

Best

CePro
`,
            to: "{{registrant.email}}",
            cc: "cepro-exams@epfl.ch",
            replyTo: "",
        },
    },

    crep_printing_confirmation: {
        section: "CREP",
        name: "Exam printing service subscription confirmation",
        placeholders: [
            { token: "attentionPrefix", desc: "Subject prefix when attention required (computed)" },
            { token: "attentionBlock", desc: "Warning/error block, empty if none (computed)" },
            { token: "course", desc: "Course label" },
            { token: "examDate", desc: "Exam date" },
            { token: "desiredDate", desc: "Desired delivery date" },
            { token: "contact", desc: "Contact (firstname lastname (email))" },
            { token: "authorizedPersonsLine", desc: "Authorized persons line, empty if none (computed)" },
            { token: "files", desc: "Uploaded files names" },
            { token: "remarkLine", desc: "Additional remarks line, empty if none (computed)" },
            { token: "registrant.email", desc: "Registrant email (recipient)" },
        ],
        defaults: {
            subject: "{{attentionPrefix}}CePro - Exam printing service subscription confirmation",
            body: `
Hello,
Your subscription to our exam printing service has been registered:
{{attentionBlock}}

- Course: {{course}}
- Exam date: {{examDate}}
- Desired delivery date: {{desiredDate}}
- Contact: {{contact}}
{{authorizedPersonsLine}}
- Files: {{files}}
{{remarkLine}}`,
            to: "{{registrant.email}}",
            cc: "cepro-exams@epfl.ch",
            replyTo: "",
        },
    },

    exam_ready_to_print: {
        section: "CREP",
        name: "Exam ready to print",
        placeholders: [
            { token: "examCode", desc: "Exam code (used in subject)" },
            { token: "description", desc: "Exam description" },
            { token: "examURL", desc: "Direct link to the exam in the app (computed)" },
        ],
        defaults: {
            subject: "Exam {{examCode}} is ready to be printed",
            body: `
Hello,

The exam {{description}} status has been set to "toPrint" in CREP.

You can see the exam in the app directly by clicking on this link : {{examURL}}

Best,
CePro team
`,
            to: "examen.repro@epfl.ch",
            cc: "",
            replyTo: "",
        },
    },

    exam_ready_to_pickup: {
        section: "CREP",
        name: "Exam ready to pick up",
        placeholders: [
            { token: "examCode", desc: "Exam code (used in subject)" },
            { token: "description", desc: "Exam description" },
            { token: "boxes", desc: "Number of boxes" },
            { token: "contact.email", desc: "Contact email (recipient)" },
            { token: "authorizedPersons", desc: "Authorized persons emails (CC recipient)" },
        ],
        defaults: {
            subject: "Exam {{examCode}} is ready to be picked up",
            body: `
Hello,

The exam {{description}} has been finished printing and is ready to be picked up at the Repro.
Number of boxes : {{boxes}}

Click on this link to find where the Repro is located : https://plan.epfl.ch/?room=%253DBP%200243
Click on this link to see the Repro's opening hours : https://www.epfl.ch/campus/services/repro/fr/contacts/#ancre2

Best,
CePro team
`,
            to: "{{contact.email}}",
            cc: "{{authorizedPersons}}",
            replyTo: "examen.repro@epfl.ch",
        },
    },
};

// Keys are derived from the registry, so adding or removing a template is a
// single edit to EMAIL_TEMPLATES above (no separate union to keep in sync).
export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATES;

export type TemplateContext = Record<string, string | number | null | undefined>;

// Replace every {{token}} occurrence with its value from the context.
// Unknown tokens (or null/undefined values) resolve to an empty string.
export function renderString(template: string, context: TemplateContext): string {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (_match, token: string) => {
        const value = context[token];
        return value === null || value === undefined ? "" : String(value);
    });
}
