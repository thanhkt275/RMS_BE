import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailsService {
  constructor(private readonly mailerService: MailerService) {}

  async sendAccountActivationInvite(to: string, activationUrl: string) {
    await this.mailerService.sendMail({
      to,
      subject: 'Welcome to our app!',
      template: 'account-activation-invitation',
      context: {
        email: to,
        activationUrl,
      },
    });
  }

  async sendTeamAssignmentInvitationEmail(
    to: string,
    teamName: string,
    tournamentName: string,
  ) {
    await this.mailerService.sendMail({
      to,
      subject: 'Team Assignment Invitation',
      template: 'team-assignment-invitation',
      context: {
        email: to,
        teamName,
        tournamentName,
      },
    });
  }
}
