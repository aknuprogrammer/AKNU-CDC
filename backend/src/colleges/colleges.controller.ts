import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CollegesService } from './colleges.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Colleges')
@Controller('colleges')
export class CollegesController {
  constructor(private readonly collegesService: CollegesService) {}

  @Get()
  @ApiOperation({ summary: 'List all ~400 affiliated colleges with filters' })
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('location') location?: string,
    @Query('district') district?: string,
  ) {
    return this.collegesService.findAll({ search, type, location, district });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get summary statistics of affiliated colleges' })
  getStats() {
    return this.collegesService.getStats();
  }

  @Post('bulk-upload')
  @ApiOperation({ summary: 'Bulk upload colleges from Excel/JSON' })
  bulkUpload(@Body() body: { rows: any[] } | any[]) {
    const rows = Array.isArray(body) ? body : body?.rows || [];
    return this.collegesService.bulkUpload(rows);
  }

  @Post('bulk-seat-matrix')
  @ApiOperation({ summary: 'Bulk upload college course seat matrix and intakes from Excel' })
  bulkSeatMatrix(@Body() body: { rows: any[] } | any[]) {
    const rows = Array.isArray(body) ? body : body?.rows || [];
    return this.collegesService.bulkSeatMatrix(rows);
  }

  @Post('clear-all')
  @ApiOperation({ summary: 'Clear all colleges and related data for a fresh start' })
  clearAll(@Body() body?: { includeCourses?: boolean }) {
    return this.collegesService.clearAll(body?.includeCourses);
  }

  @Get(':idOrCode')
  @ApiOperation({ summary: 'Get single college details with courses, demands, and proceedings' })
  findOne(@Param('idOrCode') idOrCode: string) {
    return this.collegesService.findOne(idOrCode);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new affiliated college' })
  create(@Body() dto: any) {
    return this.collegesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update college details' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.collegesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete affiliated college' })
  remove(@Param('id') id: string) {
    return this.collegesService.remove(id);
  }
}

