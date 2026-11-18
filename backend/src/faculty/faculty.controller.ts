import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FacultyService } from './faculty.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Faculty')
@Controller('faculty')
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @Get()
  @ApiOperation({ summary: 'List faculty members' })
  findAll(@Query('collegeId') collegeId?: string) {
    return this.facultyService.findAll(collegeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get faculty member by ID' })
  findOne(@Param('id') id: string) {
    return this.facultyService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new faculty member' })
  create(@Body() dto: any, @CurrentUser() user: any) {
    const collegeId = dto.collegeId || user?.collegeId;
    return this.facultyService.create(collegeId, dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk upload faculty list from Excel' })
  bulkUpload(@Body() body: { collegeId?: string; rows: any[] }, @CurrentUser() user: any) {
    const collegeId = body.collegeId || user?.collegeId;
    return this.facultyService.bulkUpload(collegeId, body.rows);
  }

  @Put(':id/ratify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update University faculty ratification status' })
  toggleRatify(@Param('id') id: string, @Body() body: { isRatified: boolean; ratifyYear?: string }) {
    return this.facultyService.toggleRatification(id, body.isRatified, body.ratifyYear);
  }
}
