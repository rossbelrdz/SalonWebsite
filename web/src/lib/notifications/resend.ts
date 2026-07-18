import { Resend } from "resend";

export async function sendResendEmail(opts: {
  apiKey: string;
  fromEmail: string;
  fromName?: string | null;
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const resend = new Resend(opts.apiKey);
  const from = opts.fromName
    ? `${opts.fromName} <${opts.fromEmail}>`
    : opts.fromEmail;

  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html || opts.text.replace(/\n/g, "<br/>"),
  });

  if (error) {
    throw new Error(error.message || "Resend error");
  }
  return data;
}
