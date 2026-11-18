import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Fees')
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'POST /fees/preview - Live calculation of affiliation fees from pure engine without side effects',
  })
  @ApiResponse({ status: 200, description: 'Calculated breakdown, paise totals, and student fee map' })
  preview(@Body() dto: any) {
    return this.feesService.previewFee(dto);
  }

  @Post('generate-demand')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate final demand using identical pure fee engine calculation' })
  generateDemand(@Body() dto: any) {
    return this.feesService.generateDemand(dto);
  }

  @Get('demands')
  @ApiOperation({ summary: 'List demands with filters' })
  findAllDemands(
    @Query('collegeId') collegeId?: string,
    @Query('courseGroupId') courseGroupId?: string,
    @Query('status') status?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.feesService.findAllDemands({ collegeId, courseGroupId, status, academicYear });
  }

  @Get('demands/:id')
  @ApiOperation({ summary: 'Get demand details by ID with component breakdown' })
  findDemandById(@Param('id') id: string) {
    return this.feesService.findDemandById(id);
  }
}
