import nodemailer, { type Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export class EmailService {
  static async send(opts: EmailOptions): Promise<void> {
    if (!process.env.SMTP_HOST) {
      console.log(`[Email mock] Para: ${opts.to} | Asunto: ${opts.subject}`);
      return;
    }
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM ?? 'noreply@cafeteria-saas.com',
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  }

  static async bienvenida(email: string, nombreCafeteria: string) {
    await this.send({
      to: email,
      subject: `¡Bienvenido a Cafetería SaaS, ${nombreCafeteria}!`,
      html: `<h1>¡Tu cafetería está lista!</h1><p>Empezá a gestionar tus pedidos desde el dashboard.</p>`,
    });
  }
}
