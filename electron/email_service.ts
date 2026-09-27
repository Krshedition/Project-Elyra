import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

export interface StoredEmailConfig {
  email: string;
  appPassword?: string;
  displayName?: string;
  host?: string;
  port?: number;
  connectedAt?: string;
}

export class EmailService {
  private static instance: EmailService;
  private cachedConfig: StoredEmailConfig | null = null;
  private configFilePath: string = '';

  private constructor() {
    try {
      this.configFilePath = path.join(app.getPath('userData'), 'elyra_email_config.json');
      this.loadStoredConfig();
    } catch (e) {
      console.warn('[EmailService] Could not resolve userData path yet:', e);
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private loadStoredConfig() {
    if (!this.configFilePath) {
      try {
        this.configFilePath = path.join(app.getPath('userData'), 'elyra_email_config.json');
      } catch (e) {
        return;
      }
    }

    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8');
        this.cachedConfig = JSON.parse(raw);
        console.log('[EmailService] Loaded stored email config for:', this.cachedConfig?.email);
      }
    } catch (e) {
      console.error('[EmailService] Failed to read stored email config:', e);
    }
  }

  private saveStoredConfig(config: StoredEmailConfig) {
    if (!this.configFilePath) {
      this.configFilePath = path.join(app.getPath('userData'), 'elyra_email_config.json');
    }
    try {
      fs.writeFileSync(this.configFilePath, JSON.stringify(config, null, 2), 'utf-8');
      this.cachedConfig = config;
    } catch (e) {
      console.error('[EmailService] Failed to write stored email config:', e);
    }
  }

  public getEmailConfig(): { connected: boolean; email?: string; displayName?: string; host?: string } {
    if (!this.cachedConfig) {
      this.loadStoredConfig();
    }

    if (this.cachedConfig?.email && this.cachedConfig?.appPassword) {
      return {
        connected: true,
        email: this.cachedConfig.email,
        displayName: this.cachedConfig.displayName || this.cachedConfig.email.split('@')[0],
        host: this.cachedConfig.host || 'smtp.gmail.com',
      };
    }

    const envUser = process.env.SMTP_USER;
    const envPass = process.env.SMTP_PASS;
    if (envUser && envPass) {
      return {
        connected: true,
        email: envUser,
        displayName: envUser.split('@')[0],
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
      };
    }

    return { connected: false };
  }

  public async connectGoogleAccount(
    email: string,
    appPassword: string,
    displayName: string = 'Krish Bhutiya'
  ): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim();
    const cleanPassword = appPassword.replace(/\s+/g, '');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Please enter a valid Google email address.' };
    }

    if (!cleanPassword || cleanPassword.length < 8) {
      return { success: false, message: 'Please enter a valid 16-character Google App Password.' };
    }

    const host = 'smtp.gmail.com';
    const port = 465;

    const testTransporter = nodemailer.createTransport({
      host,
      port,
      secure: true,
      auth: {
        user: cleanEmail,
        pass: cleanPassword,
      },
    });

    try {
      console.log(`[EmailService] Verifying Google SMTP credentials for ${cleanEmail}...`);
      await testTransporter.verify();

      const newConfig: StoredEmailConfig = {
        email: cleanEmail,
        appPassword: cleanPassword,
        displayName: displayName.trim() || cleanEmail.split('@')[0],
        host,
        port,
        connectedAt: new Date().toISOString(),
      };

      this.saveStoredConfig(newConfig);

      // Keep process.env synchronized
      process.env.SMTP_USER = cleanEmail;
      process.env.SMTP_PASS = cleanPassword;
      process.env.SMTP_HOST = host;
      process.env.SMTP_PORT = String(port);

      return {
        success: true,
        message: `Successfully connected Google Account (${cleanEmail})!`,
      };
    } catch (e: any) {
      console.error('[EmailService] Google authentication failed:', e);
      let errMsg = e.message || 'Authentication failed';
      if (errMsg.includes('Invalid login') || errMsg.includes('535') || errMsg.includes('BadCredentials')) {
        errMsg = 'Invalid credentials. Please make sure 2-Step Verification is turned ON in your Google Account and you are using a 16-character App Password (not your normal Gmail password).';
      }
      return {
        success: false,
        message: errMsg,
      };
    }
  }

  public disconnectGoogleAccount(): { success: boolean } {
    if (!this.configFilePath) {
      this.configFilePath = path.join(app.getPath('userData'), 'elyra_email_config.json');
    }
    try {
      if (fs.existsSync(this.configFilePath)) {
        fs.unlinkSync(this.configFilePath);
      }
      this.cachedConfig = null;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      return { success: true };
    } catch (e) {
      console.error('[EmailService] Failed to disconnect Google account:', e);
      return { success: false };
    }
  }

  private getTransporter() {
    if (!this.cachedConfig) {
      this.loadStoredConfig();
    }

    const user = this.cachedConfig?.email || process.env.SMTP_USER;
    const pass = this.cachedConfig?.appPassword || process.env.SMTP_PASS;
    const host = this.cachedConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = this.cachedConfig?.port || parseInt(process.env.SMTP_PORT || '465', 10);

    if (!user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  public async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; code?: string; message: string; messageId?: string }> {
    const transporter = this.getTransporter();
    if (!transporter) {
      return {
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Google account not connected. Please sign in or authorize your Google Account with Elyra so she can send emails on your behalf.',
      };
    }

    const user = this.cachedConfig?.email || process.env.SMTP_USER;
    const displayName = this.cachedConfig?.displayName || 'Krish Bhutiya';
    const fromAddress = `"${displayName}" <${user}>`;

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: fromAddress,
        to: options.to,
        subject: options.subject,
      };

      if (options.isHtml) {
        mailOptions.html = options.body;
      } else {
        mailOptions.text = options.body;
      }

      const info = await transporter.sendMail(mailOptions);
      console.log('[EmailService] Email sent successfully:', info.messageId);
      return {
        success: true,
        message: `Email successfully sent to ${options.to} (Subject: "${options.subject}")`,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error('[EmailService] Failed to send email:', error);
      return {
        success: false,
        message: `Failed to send email: ${error.message || 'Unknown SMTP error'}`,
      };
    }
  }

  public async verifyConfig(): Promise<{ configured: boolean; details: string; email?: string }> {
    const config = this.getEmailConfig();
    if (!config.connected) {
      return {
        configured: false,
        details: 'Google Account not connected. Connect in Settings or Email workspace.',
      };
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      return { configured: false, details: 'Could not create transport' };
    }

    try {
      await transporter.verify();
      return {
        configured: true,
        email: config.email,
        details: `Google connection active and verified for ${config.email}`,
      };
    } catch (e: any) {
      return { configured: false, details: `Verification failed: ${e.message}` };
    }
  }
}
