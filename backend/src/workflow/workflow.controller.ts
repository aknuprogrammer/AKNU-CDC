import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Workflow')
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get('queries')
  @ApiOperation({ summary: 'List workflow queries and clarifications' })
  findQueries(
    @Query('collegeId') collegeId?: string,
    @Query('courseGroupId') courseGroupId?: string,
    @Query('status') status?: string,
  ) {
    return this.workflowService.findQueries({ collegeId, courseGroupId, status });
  }

  @Post('queries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Raise a query or clarification request' })
  createQuery(@Body() dto: any, @CurrentUser() user: any) {
    return this.workflowService.createQuery({
      ...dto,
      fromUserId: user?.id || 'usr-admin',
    });
  }

  @Put('queries/:id/respond')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Respond to query and mark as resolved' })
  respond(@Param('id') id: string, @Body('responseText') responseText: string, @CurrentUser() user: any) {
    return this.workflowService.respondToQuery(id, responseText, user?.id || 'usr-admin');
  }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get audit logs trail' })
  getAuditLogs(@Query('limit') limit?: number) {
    return this.workflowService.getAuditLogs(limit ? Number(limit) : 50);
  }
}
