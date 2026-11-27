import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ProceedingsService } from './proceedings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Proceedings')
@Controller('proceedings')
export class ProceedingsController {
  constructor(private readonly proceedingsService: ProceedingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List proceedings register with strict college isolation' })
  findAll(
    @CurrentUser() user: any,
    @Query('collegeId') collegeId?: string,
    @Query('courseGroupId') courseGroupId?: string,
    @Query('status') status?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    // STRICT MULTI-TENANT ISOLATION:
    // When logged in as College Principal or College Staff, forcefully restrict to their own collegeId only!
    if (user?.role === 'COLLEGE_PRINCIPAL' || user?.role === 'COLLEGE_STAFF') {
      collegeId = user.collegeId;
    }

    return this.proceedingsService.findAll({ collegeId, courseGroupId, status, academicYear });
  }

  @Get('verify/:qrCode')
  @ApiOperation({ summary: 'Public QR verification endpoint for issued proceedings' })
  verifyQr(@Param('qrCode') qrCode: string) {
    return this.proceedingsService.verifyQr(qrCode);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single proceeding order with strict access check' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const proceeding = this.proceedingsService.findOne(id);

    // STRICT MULTI-TENANT ISOLATION:
    if (
      (user?.role === 'COLLEGE_PRINCIPAL' || user?.role === 'COLLEGE_STAFF') &&
      proceeding.collegeId !== user.collegeId
    ) {
      throw new ForbiddenException('Access denied: You are only authorized to view proceedings issued to your college.');
    }

    return proceeding;
  }

  @Post('upload-pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload Proceeding PDF and auto-extract college courses & intakes' })
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('collegeId') collegeId: string,
    @Body('academicYear') academicYear?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Proceeding PDF file is required');
    }
    if (!collegeId) {
      throw new BadRequestException('College ID or Code is required');
    }

    return this.proceedingsService.uploadAndParsePdf(collegeId, file.buffer, file.originalname, academicYear);
  }

  @Post('confirm-upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm parsed proceeding data, issue order and auto-sync to college' })
  confirmUpload(@Body() dto: any, @CurrentUser() user: any) {
    return this.proceedingsService.confirmProceedingPdfUpload(dto, user?.id);
  }

  @Get(':id/download-pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download official uploaded Proceeding PDF with security check' })
  async downloadPdf(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    const proceeding = this.proceedingsService.findOne(id);

    // STRICT MULTI-TENANT ISOLATION:
    if (
      (user?.role === 'COLLEGE_PRINCIPAL' || user?.role === 'COLLEGE_STAFF') &&
      proceeding.collegeId !== user.collegeId
    ) {
      throw new ForbiddenException('Access denied: You are only authorized to download proceedings issued to your college.');
    }

    return this.proceedingsService.downloadProceedingPdf(id, res);
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
