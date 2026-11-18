import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { mockDb } from '../common/mock-db';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  // Scheduled job: runs daily at midnight to scan overdue affiliation demands and dispatch DLT SMS
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleDailyOverdueScan() {
    this.logger.log('Starting automated daily overdue affiliation fee scan...');
    const now = new Date().getTime();

    let overdueNotified = 0;
    for (const d of mockDb.demands) {
      if (d.status !== 'PAID') {
        const dueTime = new Date(d.dueDate).getTime();
        const graceExpiry = dueTime + d.graceDays * 24 * 60 * 60 * 1000;

        if (now > graceExpiry) {
          d.status = 'OVERDUE';
          const college = mockDb.colleges.find((c) => c.id === d.collegeId);
          if (college) {
            mockDb.notifications.push({
              id: `notif-cron-${Date.now()}-${d.id}`,
              collegeId: college.id,
              type: 'SMS',
              recipient: college.principalMobile,
              subject: 'Overdue Affiliation Fee Notice',
              content: `URGENT: Affiliation demand ${d.demandNumber} for ${college.name} is OVERDUE. Late fee charges applied. AKNU CDC.`,
              status: 'SENT',
              sentAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
            overdueNotified++;
          }
        }
      }
    }
    this.logger.log(`Overdue scan complete. Dispatched ${overdueNotified} reminder notifications.`);
  }

  // Trigger job manually
  triggerOverdueScan() {
    this.handleDailyOverdueScan();
    return {
      success: true,
      message: 'Daily overdue fee scanner triggered successfully.',
    };
  }

  getJobStatus() {
    return {
      redisConnected: false, // fallback runner active
      bullMqStatus: 'ACTIVE_FALLBACK',
      registeredCrons: [
        { name: 'dailyOverdueScan', cron: '0 0 * * *', description: 'Daily overdue fee scanner & reminder SMS' },
        { name: 'dailyReconciliation', cron: '0 23 * * *', description: 'Daily bank gateway settlement reconciliation' },
      ],
    };
  }
}
