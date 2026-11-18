import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('collection-status')
  @ApiOperation({ summary: 'Get overall university affiliation fee collection status' })
  getCollectionStatus(@Query('academicYear') academicYear?: string) {
    return this.reportsService.getCollectionStatus(academicYear);
  }

  @Get('defaulters')
  @ApiOperation({ summary: 'List defaulter colleges with overdue balances and contacts' })
  getDefaulters(@Query('academicYear') academicYear?: string) {
    return this.reportsService.getDefaulters(academicYear);
  }

  @Get('head-wise')
  @ApiOperation({ summary: 'Get head-wise component collection breakdown' })
  getHeadWise(@Query('academicYear') academicYear?: string) {
    return this.reportsService.getHeadWiseBreakdown(academicYear);
  }

  @Get('aishe-enrolment')
  @ApiOperation({ summary: 'Get AISHE Ministry of Education gender & social category enrolment matrix' })
  getAishe(@Query('academicYear') academicYear?: string) {
    return this.reportsService.getAisheEnrolmentReport(academicYear);
  }
}
