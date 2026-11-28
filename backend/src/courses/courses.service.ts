import { Injectable, NotFoundException } from '@nestjs/common';
import { mockDb, MockCourse } from '../common/mock-db';

@Injectable()
export class CoursesService {
  findAll(courseGroup?: string) {
    if (courseGroup && courseGroup !== 'ALL') {
      return mockDb.courses.filter((c) => c.courseGroup === courseGroup);
    }
    return mockDb.courses;
  }

  findOne(id: string) {
    const course = mockDb.courses.find((c) => c.id === id || c.code === id);
    if (!course) {
      throw new NotFoundException(`Course ${id} not found`);
    }
    return course;
  }

  create(data: Partial<MockCourse>) {
    const stream = (data.stream || data.courseGroup || 'UG').toUpperCase();
    const degreeType = data.degreeType || (data.code ? data.code.split('-')[0] : 'Degree');
    const branch = data.branch || (data.code && data.code.includes('-') ? data.code.split('-')[1] : data.name || 'General');

    const newCourse: MockCourse = {
      id: data.id || `crs-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: data.code || `CRS-${Date.now()}`,
      name: data.name || `${degreeType} in ${branch}`,
      stream,
      courseGroup: stream,
      degreeType,
      branch,
      durationYears: Number(data.durationYears) || 3,
      degreeLevel: data.degreeLevel || (stream === 'PG' ? 'PG' : 'UG'),
      isComputer: !!data.isComputer,
      defaultIntake: Number(data.defaultIntake) || 60,
      active: true,
    };
    mockDb.courses.push(newCourse);
    mockDb.save();
    return newCourse;
  }

  bulkUpload(rows: Partial<MockCourse>[]) {
    const created: MockCourse[] = [];
    const errors: { row: number; error: string }[] = [];

    rows.forEach((row, idx) => {
      try {
        if (!row.code || !row.name) {
          errors.push({ row: idx + 1, error: 'Course Code and Course Name are required' });
          return;
        }
        const course = this.create(row);
        created.push(course);
      } catch (err: any) {
        errors.push({ row: idx + 1, error: err.message || 'Failed to create course' });
      }
    });

    mockDb.save();
    return {
      success: true,
      totalReceived: rows.length,
      importedCount: created.length,
      errorsCount: errors.length,
      imported: created,
      errors,
    };
  }

  update(id: string, data: Partial<MockCourse>) {
    const index = mockDb.courses.findIndex((c) => c.id === id || c.code === id);
    if (index === -1) {
      throw new NotFoundException(`Course ${id} not found`);
    }
    mockDb.courses[index] = { ...mockDb.courses[index], ...data };
    mockDb.save();
    return mockDb.courses[index];
  }

  remove(id: string) {
    const index = mockDb.courses.findIndex((c) => c.id === id || c.code === id);
    if (index === -1) {
      throw new NotFoundException(`Course ${id} not found`);
    }
    const removed = mockDb.courses.splice(index, 1)[0];
    mockDb.save();
    return { success: true, removed };
  }
}

