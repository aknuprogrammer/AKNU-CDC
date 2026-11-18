import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProceedingsService } from './proceedings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Proceedings')
@Controller('proceedings')
export class ProceedingsController {
  constructor(private readonly proceedingsService: ProceedingsService) {}

  @Get()
  @ApiOperation({ summary: 'List proceedings register with filters' })
  findAll(
    @Query('collegeId') collegeId?: string,
    @Query('courseGroupId') courseGroupId?: string,
    @Query('status') status?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.proceedingsService.findAll({ collegeId, courseGroupId, status, academicYear });
  }

  @Get('verify/:qrCode')
  @ApiOperation({ summary: 'Public QR verification endpoint for issued proceedings' })
  verifyQr(@Param('qrCode') qrCode: string) {
    return this.proceedingsService.verifyQr(qrCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single proceeding order with details and course intake matrix' })
  findOne(@Param('id') id: string) {
    return this.proceedingsService.findOne(id);
  }

  @Post('draft')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Draft a new proceeding from editable template' })
  createDraft(@Body() dto: any, @CurrentUser() user: any) {
    return this.proceedingsService.createDraft({ ...dto, draftedById: user?.id });
  }

  @Put(':id/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Superintendent verification and recommendation' })
  check(@Param('id') id: string, @CurrentUser() user: any) {
    return this.proceedingsService.checkBySuperintendent(id, user?.id);
  }

  @Put(':id/sign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dean CDC / Registrar digital signing (DSC/e-Sign) & issue' })
  approveAndSign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.proceedingsService.approveAndSign(id, user?.id, 'DSC');
  }

  @Post('bulk-approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk approve and digitally sign multiple proceedings' })
  bulkApprove(@Body('ids') ids: string[], @CurrentUser() user: any) {
    return this.proceedingsService.bulkApprove(ids, user?.id);
  }

  @Post('bulk-upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk upload and issue proceedings with course intakes from Excel' })
  bulkUpload(@Body() body: { rows: any[] } | any[], @CurrentUser() user: any) {
    const rows = Array.isArray(body) ? body : body?.rows || [];
    return this.proceedingsService.bulkUploadProceedings(rows, user?.id);
  }

  @Put(':id/acknowledge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'College Principal acknowledges issued proceeding' })
  acknowledge(@Param('id') id: string, @CurrentUser() user: any) {
    return this.proceedingsService.acknowledge(id, user?.id);
  }
}
