import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'List enrolled students with filters' })
  findAll(
    @Query('collegeId') collegeId?: string,
    @Query('courseId') courseId?: string,
    @Query('yearOfStudy') yearOfStudy?: number,
    @Query('academicYear') academicYear?: string,
    @Query('status') status?: string,
  ) {
    return this.studentsService.findAll({ collegeId, courseId, yearOfStudy, academicYear, status });
  }

  @Get('seat-matrix/:collegeId')
  @ApiOperation({ summary: 'Get seat matrix (intake/filled/vacant by CQ/SA/MQ)' })
  getSeatMatrix(@Param('collegeId') collegeId: string, @Query('academicYear') academicYear?: string) {
    return this.studentsService.getSeatMatrix(collegeId, academicYear);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student details by ID' })
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post('single')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll a single student with APAAR ID and intake limits check' })
  createSingle(@Body() dto: any, @CurrentUser() user: any) {
    const collegeId = dto.collegeId || user?.collegeId;
    return this.studentsService.createSingle(collegeId, dto);
  }

  @Post('bulk-upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk upload students from Excel data with row-wise validation report' })
  bulkUpload(@Body() body: { collegeId?: string; rows: any[]; academicYear?: string }, @CurrentUser() user: any) {
    const collegeId = body.collegeId || user?.collegeId;
    return this.studentsService.bulkUpload(collegeId, body.rows, body.academicYear);
  }

  @Post('auto-promote/:collegeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Auto-promote students each academic year' })
  autoPromote(@Param('collegeId') collegeId: string) {
    return this.studentsService.autoPromote(collegeId);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update student enrollment status (e.g. marked as LEFT or DETAINED)' })
  updateStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.studentsService.updateStatus(id, status);
  }
}
