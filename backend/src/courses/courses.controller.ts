import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List all approved university courses or filter by course group' })
  findAll(@Query('courseGroup') courseGroup?: string) {
    return this.coursesService.findAll(courseGroup);
  }

  @Post('bulk-upload')
  @ApiOperation({ summary: 'Bulk upload courses from Excel/JSON' })
  bulkUpload(@Body() body: { rows: any[] }) {
    return this.coursesService.bulkUpload(body.rows || []);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course details by ID' })
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new approved course' })
  create(@Body() dto: any) {
    return this.coursesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update course details' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.coursesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete course' })
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}

