import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { CaslModule } from './casl/casl.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CollegesModule } from './colleges/colleges.module';
import { CoursesModule } from './courses/courses.module';
import { ProceedingsModule } from './proceedings/proceedings.module';
import { StudentsModule } from './students/students.module';
import { FacultyModule } from './faculty/faculty.module';
import { FeesModule } from './fees/fees.module';
import { LateFeeModule } from './late-fee/late-fee.module';
import { PaymentsModule } from './payments/payments.module';
import { WorkflowModule } from './workflow/workflow.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    CaslModule,
    AuthModule,
    UsersModule,
    CollegesModule,
    CoursesModule,
    ProceedingsModule,
    StudentsModule,
    FacultyModule,
    FeesModule,
    LateFeeModule,
    PaymentsModule,
    WorkflowModule,
    ReportsModule,
    NotificationsModule,
    JobsModule,
  ],
})
export class AppModule {}
