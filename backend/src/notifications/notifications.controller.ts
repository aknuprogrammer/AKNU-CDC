import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List SMS & Email notification logs' })
  findAll(@Query('collegeId') collegeId?: string) {
    return this.notificationsService.findAll(collegeId);
  }

  @Post('send-sms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send DLT SMS alert' })
  sendSms(@Body() body: { recipient: string; message: string; collegeId?: string }) {
    return this.notificationsService.sendSms(body.recipient, body.message, undefined, body.collegeId);
  }

  @Post('send-bulk-reminders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send scheduled or manual bulk fee reminders to defaulter colleges' })
  sendBulkReminders(@Body() body: { collegeIds: string[]; message?: string }) {
    return this.notificationsService.sendBulkReminders(body.collegeIds, body.message);
  }
}
