interface SendEmailOptions {
    to: string;
    subject: string;
    templateName: string;
    templateData?: Record<string, any>;
    attachments?: {
        filename: string;
        content: Buffer | string;
        contentType: string;
    }[];
}
export declare const sendEmail: ({ to, subject, templateName, templateData, attachments, }: SendEmailOptions) => Promise<void>;
export {};
//# sourceMappingURL=sendEmail.d.ts.map