import { describe, it, expect, beforeEach, vi } from 'vitest';

const { createTransport, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));
vi.mock('nodemailer', () => ({ default: { createTransport } }));

import { EmailService } from './email.service';

const ENV_ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env = { ...ENV_ORIGINAL };
  delete process.env.SMTP_HOST;
  createTransport.mockReturnValue({ sendMail });
  sendMail.mockReset();
  createTransport.mockClear();
});

describe('EmailService.send — sin SMTP_HOST configurado', () => {
  it('no crea transporter ni intenta enviar, solo loguea (modo mock)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await EmailService.send({ to: 'x@x.com', subject: 'Asunto de prueba', html: '<p>hola</p>' });

    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Asunto de prueba'));

    logSpy.mockRestore();
  });

  it('bienvenida() arma el asunto con el nombre de la cafetería', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await EmailService.bienvenida('admin@cafeteamos.com', 'Cafeteamos');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('admin@cafeteamos.com'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Cafeteamos'));

    logSpy.mockRestore();
  });
});

describe('EmailService.send — con SMTP_HOST configurado', () => {
  it('crea el transporter con host/puerto/auth del entorno y envía con el remitente configurado', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.EMAIL_FROM = 'noreply@cafeteamos.com';

    await EmailService.send({ to: 'destino@x.com', subject: 'Hola', html: '<p>hola</p>' });

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'pass' },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'noreply@cafeteamos.com',
      to: 'destino@x.com',
      subject: 'Hola',
      html: '<p>hola</p>',
    });
  });
});
