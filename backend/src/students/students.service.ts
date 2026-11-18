import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { mockDb, MockStudent } from '../common/mock-db';

export interface StudentRowInput {
  admissionNo: string;
  name: string;
  fatherName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  category: 'SC' | 'ST' | 'BC' | 'OC';
  isPh?: boolean;
  isMinority?: boolean;
  courseCode: string;
  yearOfStudy: number;
  quota: 'CONVENOR' | 'SPOT' | 'MANAGEMENT';
  admissionDate: string;
  apaarId: string;
}

@Injectable()
export class StudentsService {
  findAll(query?: { collegeId?: string; courseId?: string; yearOfStudy?: number; academicYear?: string; status?: string }) {
    let result = mockDb.students;

    if (query?.collegeId) {
      result = result.filter((s) => s.collegeId === query.collegeId);
    }
    if (query?.courseId) {
      result = result.filter((s) => s.courseId === query.courseId);
    }
    if (query?.yearOfStudy) {
      result = result.filter((s) => s.yearOfStudy === Number(query.yearOfStudy));
    }
    if (query?.academicYear) {
      result = result.filter((s) => s.academicYear === query.academicYear);
    }
    if (query?.status) {
      result = result.filter((s) => s.status === query.status);
    }

    return result.map((s) => {
      const course = mockDb.courses.find((c) => c.id === s.courseId);
      const college = mockDb.colleges.find((c) => c.id === s.collegeId);
      return {
        ...s,
        courseName: course?.name,
        courseCode: course?.code,
        collegeName: college?.name,
      };
    });
  }

  findOne(id: string) {
    const student = mockDb.students.find((s) => s.id === id);
    if (!student) {
      throw new NotFoundException(`Student ${id} not found`);
    }
    return student;
  }

  createSingle(collegeId: string, input: StudentRowInput, academicYear: string = '2026-27') {
    // 1. Verify course
    const course = mockDb.courses.find(
      (c) => c.code.toLowerCase() === input.courseCode.toLowerCase() || c.id === input.courseCode,
    );
    if (!course) {
      throw new BadRequestException(`Course "${input.courseCode}" is not recognized.`);
    }

    // 2. Verify college offers this course
    const college = mockDb.colleges.find((c) => c.id === collegeId);
    if (college && college.courseIds && college.courseIds.length > 0) {
      const isOffered = college.courseIds.some(
        (id) => id === course.id || id.toLowerCase() === course.code.toLowerCase(),
      );
      if (!isOffered) {
        throw new BadRequestException(
          `Course "${course.name}" (${course.code}) is not sanctioned or offered by ${college.name}.`,
        );
      }
    }

    // 3. Enforce Sanctioned Intake Limit from Proceedings / College Intake Matrix
    const seatMatrix = this.getSeatMatrix(collegeId, academicYear);
    const courseSeat = seatMatrix.find(
      (sm) =>
        sm.courseCode.toLowerCase() === course.code.toLowerCase() ||
        sm.courseName.toLowerCase() === course.name.toLowerCase(),
    );

    if (courseSeat) {
      if (courseSeat.vacantTotal <= 0) {
        throw new BadRequestException(
          `Sanctioned intake limit reached for "${course.name}"! Approved intake is ${courseSeat.sanctionedIntake} seats, and ${courseSeat.filledTotal} students are already enrolled. Admissions beyond sanctioned intake are strictly prohibited.`,
        );
      }
      if (input.quota === 'CONVENOR' && courseSeat.vacantCQ <= 0) {
        throw new BadRequestException(
          `Convenor Quota (CQ) intake full for "${course.name}" (${courseSeat.filledCQ}/${courseSeat.convenorCap} filled).`,
        );
      }
      if (input.quota === 'MANAGEMENT' && courseSeat.vacantMQ <= 0) {
        throw new BadRequestException(
          `Management Quota (MQ) intake full for "${course.name}" (${courseSeat.filledMQ}/${courseSeat.managementCap} filled).`,
        );
      }
    }

    // 4. Validate APAAR ID across all colleges
    const existingApaar = mockDb.students.find(
      (s) => s.apaarId.trim().toLowerCase() === input.apaarId.trim().toLowerCase(),
    );
    if (existingApaar) {
      const otherCol = mockDb.colleges.find((c) => c.id === existingApaar.collegeId);
      throw new BadRequestException(
        `Duplicate APAAR ID "${input.apaarId}". Already registered to student "${existingApaar.name}" at college ${otherCol?.name || existingApaar.collegeId}.`,
      );
    }

    // 5. Validate duplicate admissionNo within same college
    const existingAdm = mockDb.students.find(
      (s) => s.collegeId === collegeId && s.admissionNo.toLowerCase() === input.admissionNo.toLowerCase(),
    );
    if (existingAdm) {
      throw new BadRequestException(
        `Admission number "${input.admissionNo}" already exists in this college.`,
      );
    }

    const newStudent: MockStudent = {
      id: `stu-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      collegeId,
      courseId: course.id,
      academicYear,
      admissionNo: input.admissionNo.trim(),
      name: input.name.trim(),
      fatherName: input.fatherName.trim(),
      gender: input.gender,
      dob: input.dob,
      category: input.category,
      isPh: !!input.isPh,
      isMinority: !!input.isMinority,
      yearOfStudy: Number(input.yearOfStudy) || 1,
      quota: input.quota,
      admissionDate: input.admissionDate,
      apaarId: input.apaarId.trim(),
      status: 'ACTIVE',
    };

    mockDb.students.push(newStudent);
    return newStudent;
  }

  bulkUpload(collegeId: string, rows: StudentRowInput[], academicYear: string = '2026-27') {
    const successRows: MockStudent[] = [];
    const errorReports: Array<{ rowNumber: number; admissionNo: string; apaarId: string; error: string }> = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // header is row 1
      try {
        if (!row.admissionNo || !row.name || !row.apaarId || !row.courseCode) {
          throw new Error('Mandatory fields missing (Admission No, Name, APAAR ID, Course Code)');
        }
        const created = this.createSingle(collegeId, row, academicYear);
        successRows.push(created);
      } catch (err: any) {
        errorReports.push({
          rowNumber: rowNum,
          admissionNo: row.admissionNo || 'N/A',
          apaarId: row.apaarId || 'N/A',
          error: err.message || 'Validation error',
        });
      }
    });

    return {
      totalProcessed: rows.length,
      successCount: successRows.length,
      errorCount: errorReports.length,
      errorReports,
      sampleAdded: successRows.slice(0, 5),
    };
  }

  getSeatMatrix(collegeId: string, academicYear: string = '2026-27') {
    // Extract approved intakes from proceedings for this college
    const collegeProceedings = mockDb.proceedings.filter(
      (p) => p.collegeId === collegeId && p.status !== 'REJECTED',
    );

    const seatMatrix: Array<{
      courseCode: string;
      courseName: string;
      sanctionedIntake: number;
      convenorCap: number;
      spotCap: number;
      managementCap: number;
      filledTotal: number;
      filledCQ: number;
      filledSA: number;
      filledMQ: number;
      vacantTotal: number;
      vacantCQ: number;
      vacantSA: number;
      vacantMQ: number;
    }> = [];

    // Aggregate intakes by course
    const courseMap = new Map<string, { cq: number; sa: number; mq: number; total: number }>();
    for (const proc of collegeProceedings) {
      for (const item of proc.items) {
        const key = item.courseName;
        const cur = courseMap.get(key) || { cq: 0, sa: 0, mq: 0, total: 0 };
        cur.cq += item.convenorQuota || 0;
        cur.sa += item.spotAdmission || 0;
        cur.mq += item.managementQuota || 0;
        cur.total += item.sanctionedIntake || 0;
        courseMap.set(key, cur);
      }
    }

    // If no proceedings found yet, pull from college courseIntakes or mapped courses
    if (courseMap.size === 0) {
      const col = mockDb.colleges.find((c) => c.id === collegeId);
      if (col && col.courseIntakes && col.courseIntakes.length > 0) {
        col.courseIntakes.forEach((ci) => {
          courseMap.set(ci.courseName, {
            cq: ci.convenorQuota || Math.round((ci.sanctionedIntake || 60) * 0.7),
            sa: ci.spotAdmission || 0,
            mq: ci.managementQuota || Math.round((ci.sanctionedIntake || 60) * 0.3),
            total: ci.sanctionedIntake || 60,
          });
        });
      } else if (col && col.courseIds && col.courseIds.length > 0) {
        mockDb.courses
          .filter((c) => col.courseIds?.includes(c.id) || col.courseIds?.includes(c.code))
          .forEach((c) => {
            const intake = c.defaultIntake || 60;
            courseMap.set(c.name, {
              cq: Math.round(intake * 0.7),
              sa: 0,
              mq: intake - Math.round(intake * 0.7),
              total: intake,
            });
          });
      }
    }

    const students = mockDb.students.filter(
      (s) => s.collegeId === collegeId && (s.status === 'ACTIVE' || s.status === 'PROMOTED'),
    );

    courseMap.forEach((cap, courseName) => {
      const courseObj = mockDb.courses.find((c) => c.name === courseName);
      const enrolled = students.filter(
        (s) => s.courseId === courseObj?.id || s.courseId === courseName,
      );

      const cqFilled = enrolled.filter((s) => s.quota === 'CONVENOR').length;
      const saFilled = enrolled.filter((s) => s.quota === 'SPOT').length;
      const mqFilled = enrolled.filter((s) => s.quota === 'MANAGEMENT').length;
      const totalFilled = cqFilled + saFilled + mqFilled;

      seatMatrix.push({
        courseCode: courseObj?.code || 'UG-GEN',
        courseName,
        sanctionedIntake: cap.total,
        convenorCap: cap.cq,
        spotCap: cap.sa,
        managementCap: cap.mq,
        filledTotal: totalFilled,
        filledCQ: cqFilled,
        filledSA: saFilled,
        filledMQ: mqFilled,
        vacantTotal: Math.max(0, cap.total - totalFilled),
        vacantCQ: Math.max(0, cap.cq - cqFilled),
        vacantSA: Math.max(0, cap.sa - saFilled),
        vacantMQ: Math.max(0, cap.mq - mqFilled),
      });
    });

    return seatMatrix;
  }

  autoPromote(collegeId: string) {
    let promotedCount = 0;
    let completedCount = 0;

    for (const student of mockDb.students) {
      if (student.collegeId === collegeId && student.status === 'ACTIVE') {
        const course = mockDb.courses.find((c) => c.id === student.courseId);
        const maxDuration = course?.durationYears || 4;

        if (student.yearOfStudy < maxDuration) {
          student.yearOfStudy += 1;
          student.status = 'PROMOTED';
          promotedCount++;
        } else {
          student.status = 'LEFT';
          completedCount++;
        }
      }
    }

    return {
      success: true,
      promotedCount,
      graduatedCount: completedCount,
      message: `Successfully promoted ${promotedCount} continuing students and marked ${completedCount} final-year graduates.`,
    };
  }

  updateStatus(id: string, status: MockStudent['status']) {
    const student = mockDb.students.find((s) => s.id === id);
    if (!student) {
      throw new NotFoundException(`Student ${id} not found`);
    }
    student.status = status;
    return student;
  }
}
