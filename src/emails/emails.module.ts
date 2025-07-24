import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { existsSync } from 'fs';
import { EmailsService } from './emails.service';

// Determine the correct template path
const getTemplatePath = () => {
  // Try different possible paths
  const paths = [
    join(__dirname, 'templates'), // For compiled code: dist/emails/templates
    join(process.cwd(), 'dist', 'emails', 'templates'), // For project root
    join(__dirname, '..', 'emails', 'templates'), // Fallback
  ];
  
  for (const path of paths) {
    if (existsSync(path)) {
      return path;
    }
  }
  
  // Default fallback
  return join(__dirname, 'templates');
};

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      },
      defaults: {
        from: 'Support Team',
      },
      template: {
        dir: getTemplatePath(),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
  ],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule { }
