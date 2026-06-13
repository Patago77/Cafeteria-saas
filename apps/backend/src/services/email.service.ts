interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  static async send(opts: EmailOptions): Promise<void> {
    if (!process.env.SMTP_HOST) {
      console.log(`[Email mock] Para: ${opts.to} | Asunto: ${opts.subject}`);
      return;
    }
    // Integrar nodemailer cuando SMTP_HOST esté configurado
    throw new Error('Email service not implemented yet');
  }

  static async bienvenida(email: string, nombreCafeteria: string) {
    await this.send({
      to: email,
      subject: `¡Bienvenido a Cafetería SaaS, ${nombreCafeteria}!`,
      html: `<h1>¡Tu cafetería está lista!</h1><p>Empezá a gestionar tus pedidos desde el dashboard.</p>`,
    });
  }
}
