import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LateFeeService } from './late-fee.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Late Fee')
@Controller('late-fee')
export class LateFeeController {
  constructor(private readonly lateFeeService: LateFeeService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate late fee for a demand as of a specified date' })
  calculate(@Body() body: { demandId: string; asOfDate?: string; config?: any }) {
    return this.lateFeeService.calculateDemandLateFee(body.demandId, body.asOfDate, body.config);
  }

  @Post('waiver-request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'College submits a late-fee waiver request' })
  requestWaiver(@Body() dto: any, @CurrentUser() user: any) {
    return this.lateFeeService.requestWaiver({
      ...dto,
      requestedBy: user?.name || user?.email || 'College Principal',
    });
  }

  @Get('waivers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all late-fee waiver applications' })
  listWaivers() {
    return this.lateFeeService.listWaivers();
  }

  @Put('waivers/:id/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review and approve/reject late-fee waiver application' })
  reviewWaiver(
    @Param('id') id: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; approvedPaise?: number },
    @CurrentUser() user: any,
  ) {
    return this.lateFeeService.reviewWaiver(
      id,
      body.decision,
      user?.name || 'Dean CDC',
      body.approvedPaise,
    );
  }
}
