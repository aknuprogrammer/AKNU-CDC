import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { calculateFeesForCourseGroup } from './fee-engine';
import { CollegeFeeContext, CourseStudentData } from './fee-engine.types';
import { mockDb, MockDemand } from '../common/mock-db';

@Injectable()
export class FeesService {
  /**
   * Builds the clean pure input context from database entities for fee calculation.
   * Guarantees that counts come strictly from student records without manual overrides.
   */
  private buildContext(collegeId: string, courseGroupId: string, academicYear: string = '2026-27') {
    const college = mockDb.colleges.find((c) => c.id === collegeId);
    if (!college) {
      throw new NotFoundException(`College ${collegeId} not found`);
    }

    const collegeCtx: CollegeFeeContext = {
      collegeId: college.id,
      collegeCode: college.code,
      collegeName: college.name,
      type: (college.type as any) || 'UNAIDED',
      isAutonomous: college.isAutonomous,
      location: (college.location as any) || 'RURAL',
      hasHostel: college.hasHostel,
    };

    // Filter courses matching courseGroup
    const groupCourses = mockDb.courses.filter(
      (c) => c.courseGroup === courseGroupId || courseGroupId === 'ALL',
    );

    // Get all students enrolled in these courses at this college for this academic year
    const coursesData: CourseStudentData[] = groupCourses.map((c) => {
      const students = mockDb.students.filter(
        (s) =>
          s.collegeId === college.id &&
          s.courseId === c.id &&
          s.academicYear === academicYear &&
          (s.status === 'ACTIVE' || s.status === 'PROMOTED'),
      );

      return {
        courseId: c.id,
        courseCode: c.code,
        courseName: c.name,
        courseGroup: c.courseGroup as any,
        durationYears: c.durationYears,
        degreeLevel: c.degreeLevel,
        isComputer: c.isComputer,
        sectionsCount: Math.max(1, Math.ceil(students.length / 50)),
        students: students.map((s) => ({
          id: s.id,
          admissionNo: s.admissionNo,
          name: s.name,
          yearOfStudy: s.yearOfStudy,
          quota: s.quota,
          status: s.status,
          apaarId: s.apaarId,
        })),
      };
    });

    // Unratified faculty count for B.Ed / Physical Education
    const unratifiedCount = mockDb.faculty.filter(
      (f) => f.collegeId === college.id && !f.isRatified,
    ).length;

    return {
      collegeCtx,
      coursesData,
      unratifiedCount,
    };
  }

  previewFee(dto: {
    collegeId: string;
    courseGroupId: string;
    academicYear?: string;
    includeInspection?: boolean;
    includeHostel?: boolean;
    isSupplementary?: boolean;
    previouslyPaidStudentIds?: string[];
  }) {
    const { collegeCtx, coursesData, unratifiedCount } = this.buildContext(
      dto.collegeId,
      dto.courseGroupId,
      dto.academicYear,
    );

    return calculateFeesForCourseGroup(collegeCtx, coursesData, {
      academicYear: dto.academicYear || '2026-27',
      includeInspection: dto.includeInspection ?? true,
      includeHostel: dto.includeHostel ?? true,
      unratifiedFacultyCount: unratifiedCount,
      previouslyPaidStudentIds: dto.previouslyPaidStudentIds || [],
    });
  }

  generateDemand(dto: {
    collegeId: string;
    courseGroupId: string;
    academicYear?: string;
    dueDate?: string;
    graceDays?: number;
    demandType?: 'REGULAR' | 'SUPPLEMENTARY' | 'REVISED';
    previouslyPaidStudentIds?: string[];
  }) {
    const year = dto.academicYear || '2026-27';
    const demandType = dto.demandType || 'REGULAR';

    // Run the pure fee engine
    const calculation = this.previewFee({
      collegeId: dto.collegeId,
      courseGroupId: dto.courseGroupId,
      academicYear: year,
      previouslyPaidStudentIds: dto.previouslyPaidStudentIds || [],
    });

    const college = mockDb.colleges.find((c) => c.id === dto.collegeId);
    const seq = mockDb.demands.length + 1;
    const demandNumber = `DMD/${year}/${dto.courseGroupId}/${college?.code || '000'}-${String(seq).padStart(3, '0')}`;

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30); // 30 days default

    const newDemand: MockDemand = {
      id: `dmd-${Date.now()}`,
      demandNumber,
      collegeId: dto.collegeId,
      courseGroupId: dto.courseGroupId,
      academicYear: year,
      demandType,
      totalPaise: calculation.totalPaise,
      paidPaise: 0,
      balancePaise: calculation.totalPaise,
      lateFeePaise: 0,
      status: 'PENDING',
      dueDate: dto.dueDate || defaultDueDate.toISOString(),
      graceDays: dto.graceDays ?? 15,
      isLocked: false,
      breakdown: calculation.breakdown,
      studentFeeMap: calculation.studentFeeMap,
      createdAt: new Date().toISOString(),
    };

    mockDb.demands.push(newDemand);

    // Send SMS notification to College Principal
    if (college) {
      mockDb.notifications.push({
        id: `notif-${Date.now()}`,
        collegeId: college.id,
        type: 'SMS',
        recipient: college.principalMobile,
        subject: `AKNU Affiliation Demand ${demandNumber}`,
        content: `Dear Principal, AKNU Affiliation Demand ${demandNumber} for ${dto.courseGroupId} (Rs. ${calculation.totalINR.toLocaleString()}) has been generated. Due date: ${new Date(newDemand.dueDate).toLocaleDateString()}. AKNURJ`,
        status: 'SENT',
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    return newDemand;
  }

  findAllDemands(query?: { collegeId?: string; courseGroupId?: string; status?: string; academicYear?: string }) {
    let result = mockDb.demands;

    if (query?.collegeId) {
      result = result.filter((d) => d.collegeId === query.collegeId);
    }
    if (query?.courseGroupId && query.courseGroupId !== 'ALL') {
      result = result.filter((d) => d.courseGroupId === query.courseGroupId);
    }
    if (query?.status) {
      result = result.filter((d) => d.status === query.status);
    }
    if (query?.academicYear) {
      result = result.filter((d) => d.academicYear === query.academicYear);
    }

    return result.map((d) => {
      const college = mockDb.colleges.find((c) => c.id === d.collegeId);
      return {
        ...d,
        collegeName: college?.name,
        collegeCode: college?.code,
        totalINR: Math.round(d.totalPaise / 100),
        paidINR: Math.round(d.paidPaise / 100),
        balanceINR: Math.round(d.balancePaise / 100),
      };
    });
  }

  findDemandById(id: string) {
    const demand = mockDb.demands.find((d) => d.id === id);
    if (!demand) {
      throw new NotFoundException(`Demand ${id} not found`);
    }
    const college = mockDb.colleges.find((c) => c.id === demand.collegeId);
    return {
      ...demand,
      college,
      totalINR: Math.round(demand.totalPaise / 100),
      paidINR: Math.round(demand.paidPaise / 100),
      balanceINR: Math.round(demand.balancePaise / 100),
    };
  }
}
