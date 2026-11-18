import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get status of background jobs, BullMQ queues, and cron schedules' })
  getStatus() {
    return this.jobsService.getJobStatus();
  }

  @Post('trigger-overdue-scan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually trigger overdue demands scanner and dispatch reminder notifications' })
  triggerOverdueScan() {
    return this.jobsService.triggerOverdueScan();
  }
}
