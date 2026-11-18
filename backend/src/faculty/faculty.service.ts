import { Injectable, NotFoundException } from '@nestjs/common';
import { mockDb, MockFaculty } from '../common/mock-db';

@Injectable()
export class FacultyService {
  findAll(collegeId?: string) {
    if (collegeId) {
      return mockDb.faculty.filter((f) => f.collegeId === collegeId);
    }
    return mockDb.faculty;
  }

  findOne(id: string) {
    const faculty = mockDb.faculty.find((f) => f.id === id);
    if (!faculty) {
      throw new NotFoundException(`Faculty ${id} not found`);
    }
    return faculty;
  }

  create(collegeId: string, data: Partial<MockFaculty>) {
    const newFaculty: MockFaculty = {
      id: `fac-${Date.now()}`,
      collegeId,
      courseId: data.courseId || mockDb.courses[0].id,
      name: data.name || 'Faculty Member',
      designation: data.designation || 'Assistant Professor',
      qualification: data.qualification || 'M.Sc, NET',
      panNumber: data.panNumber || 'ABCDE1234F',
      aadharLast4: data.aadharLast4 || '1234',
      isRatified: !!data.isRatified,
      ratifyYear: data.ratifyYear,
      mobile: data.mobile || '9849000000',
      email: data.email || `faculty${Date.now()}@college.edu.in`,
    };
    mockDb.faculty.push(newFaculty);
    return newFaculty;
  }

  bulkUpload(collegeId: string, rows: Partial<MockFaculty>[]) {
    const added: MockFaculty[] = [];
    for (const r of rows) {
      added.push(this.create(collegeId, r));
    }
    return {
      success: true,
      count: added.length,
      faculty: added,
    };
  }

  toggleRatification(id: string, isRatified: boolean, ratifyYear?: string) {
    const faculty = mockDb.faculty.find((f) => f.id === id);
    if (!faculty) {
      throw new NotFoundException(`Faculty ${id} not found`);
    }
    faculty.isRatified = isRatified;
    faculty.ratifyYear = ratifyYear || (isRatified ? '2026' : undefined);
    return faculty;
  }
}
