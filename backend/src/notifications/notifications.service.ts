import { Injectable, Logger } from '@nestjs/common';
import { mockDb } from '../common/mock-db';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  findAll(collegeId?: string) {
    if (collegeId) {
      return mockDb.notifications.filter((n) => n.collegeId === collegeId);
    }
    return mockDb.notifications;
  }

  sendSms(recipient: string, message: string, dltTemplateId?: string, collegeId?: string) {
    this.logger.log(`[DLT SMS Provider] Sending SMS to ${recipient} (DLT ID: ${dltTemplateId || 'AKNU_GEN_01'}): ${message}`);

    const notif = {
      id: `notif-${Date.now()}`,
      collegeId,
      type: 'SMS',
      recipient,
      subject: 'SMS Notification',
      content: message,
      dltTemplateId: dltTemplateId || '1207161829102910',
      status: 'SENT',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    mockDb.notifications.unshift(notif);
    return notif;
  }

  sendEmail(recipient: string, subject: string, body: string, collegeId?: string) {
    this.logger.log(`[Nodemailer Email Service] Sending email to ${recipient} with subject: "${subject}"`);

    const notif = {
      id: `notif-${Date.now()}`,
      collegeId,
      type: 'EMAIL',
      recipient,
      subject,
      content: body,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    mockDb.notifications.unshift(notif);
    return notif;
  }

  sendBulkReminders(collegeIds: string[], customMessage?: string) {
    const results = [];
    for (const colId of collegeIds) {
      const college = mockDb.colleges.find((c) => c.id === colId);
      if (college) {
        const text =
          customMessage ||
          `Reminder from AKNU CDC: Please clear pending affiliation demands at the earliest. Principal, ${college.name}. AKNURJ`;
        const res = this.sendSms(college.principalMobile, text, undefined, college.id);
        results.push(res);
      }
    }
    return {
      success: true,
      dispatchedCount: results.length,
    };
  }
}
