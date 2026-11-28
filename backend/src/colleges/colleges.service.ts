import { Injectable, NotFoundException } from '@nestjs/common';
import { mockDb, MockCollege } from '../common/mock-db';

const KNOWN_PRINCIPALS: Record<string, { name: string; mobile: string }> = {
  '001': { name: 'Dr. K. Srinivas Rao', mobile: '9440123456' },
  '002': { name: 'Dr. P. Lakshmi Devi', mobile: '9848123456' },
  '003': { name: 'Dr. M. Satyanarayana', mobile: '9440987654' },
  '004': { name: 'Dr. V. Prasad', mobile: '9440112233' },
  '005': { name: 'Dr. K. Ranga Rao', mobile: '9848223344' },
  '006': { name: 'Dr. G. Venkanna', mobile: '9440334455' },
  '007': { name: 'Dr. Ch. Mohan', mobile: '9440445566' },
  '008': { name: 'Dr. S. Rama Krishna', mobile: '9848556677' },
};

@Injectable()
export class CollegesService {
  findAll(query?: { search?: string; type?: string; location?: string; district?: string }) {
    // Restore original names for any colleges
    mockDb.colleges.forEach((c) => {
      const isPhone = /^\+?\d[\d\s\-]{7,15}$/.test((c.principalName || '').trim());
      const isPlaceholder = (c.principalName || '').startsWith('Principal (');
      const known = KNOWN_PRINCIPALS[c.code];
      if ((isPhone || isPlaceholder) && known) {
        c.principalName = known.name;
        c.principalMobile = known.mobile;
      } else if (isPhone) {
        c.principalMobile = c.principalName.trim();
        c.principalName = known?.name || 'Dr. Principal';
      }
    });

    let result = mockDb.colleges;

    if (query?.search) {
      const q = query.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.principalName.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q),
      );
    }
    if (query?.type) {
      result = result.filter((c) => c.type === query.type);
    }
    if (query?.location) {
      result = result.filter((c) => c.location === query.location);
    }
    if (query?.district) {
      result = result.filter((c) => c.district.toLowerCase() === query.district.toLowerCase());
    }

    return result.map((c) => {
      const courses = (c.courseIds && c.courseIds.length > 0)
        ? mockDb.courses
          .filter((crs) => c.courseIds?.includes(crs.id) || c.courseIds?.includes(crs.code))
          .map((crs) => {
            const ci = (c.courseIntakes || []).find((item) => item.courseId === crs.id || item.courseCode === crs.code);
            return {
              ...crs,
              sanctionedIntake: ci?.sanctionedIntake || crs.defaultIntake || 60,
              convenorQuota: ci?.convenorQuota || Math.round((ci?.sanctionedIntake || crs.defaultIntake || 60) * 0.7),
              managementQuota: ci?.managementQuota || Math.round((ci?.sanctionedIntake || crs.defaultIntake || 60) * 0.3),
            };
          })
        : [];
      return {
        ...c,
        streams: c.streams && c.streams.length > 0 ? c.streams : Array.from(new Set(courses.map((crs) => crs.stream || crs.courseGroup).filter(Boolean))),
        courses,
      };
    });
  }

  findOne(idOrCode: string) {
    const college = mockDb.colleges.find(
      (c) => c.id === idOrCode || c.code.toLowerCase() === idOrCode.toLowerCase(),
    );
    if (!college) {
      throw new NotFoundException(`College ${idOrCode} not found`);
    }

    const isPhone = /^\+?\d[\d\s\-]{7,15}$/.test((college.principalName || '').trim());
    const isPlaceholder = (college.principalName || '').startsWith('Principal (');
    const known = KNOWN_PRINCIPALS[college.code];
    if ((isPhone || isPlaceholder) && known) {
      college.principalName = known.name;
      college.principalMobile = known.mobile;
    } else if (isPhone) {
      college.principalMobile = college.principalName.trim();
      college.principalName = known?.name || 'Dr. Principal';
    }

    // Attach approved courses, students count, demands summary
    const students = mockDb.students.filter((s) => s.collegeId === college.id);
    const demands = mockDb.demands.filter((d) => d.collegeId === college.id);
    const proceedings = mockDb.proceedings.filter((p) => p.collegeId === college.id);

    // Resolve full course objects for courses offered by this college
    const courses = (college.courseIds && college.courseIds.length > 0)
      ? mockDb.courses
        .filter((c) => college.courseIds?.includes(c.id) || college.courseIds?.includes(c.code))
        .map((c) => {
          const ci = (college.courseIntakes || []).find((item) => item.courseId === c.id || item.courseCode === c.code);
          return {
            ...c,
            sanctionedIntake: ci?.sanctionedIntake || c.defaultIntake || 60,
            convenorQuota: ci?.convenorQuota || Math.round((ci?.sanctionedIntake || c.defaultIntake || 60) * 0.7),
            managementQuota: ci?.managementQuota || Math.round((ci?.sanctionedIntake || c.defaultIntake || 60) * 0.3),
          };
        })
      : [];

    return {
      ...college,
      streams: college.streams && college.streams.length > 0 ? college.streams : Array.from(new Set(courses.map((c) => c.stream || c.courseGroup).filter(Boolean))),
      studentsCount: students.length,
      demands,
      proceedings,
      courses,
    };
  }

  create(data: Partial<MockCollege>) {
    const code = (data.code || `${mockDb.colleges.length + 1}`.padStart(3, '0')).toUpperCase();
    const tempPassword = data.tempPassword || `Aknu@${code}`;
    const known = KNOWN_PRINCIPALS[code];
    let principalName = data.principalName?.trim();
    let principalMobile = data.principalMobile?.trim();

    if (!principalName || /^\+?\d[\d\s\-]{7,15}$/.test(principalName) || principalName.startsWith('Principal (')) {
      if (/^\+?\d[\d\s\-]{7,15}$/.test(principalName || '')) {
        principalMobile = principalName;
      }
      principalName = known?.name || `Dr. Principal`;
      if (!principalMobile && known) {
        principalMobile = known.mobile;
      }
    }
    if (!principalMobile) {
      principalMobile = known?.mobile || '9440999999';
    }

    let courseIds: string[] = [];
    const parsedIntakesMap: Record<string, number> = {};

    const rawCourseStr = (typeof (data as any).programsStr === 'string' && (data as any).programsStr) ||
      (typeof (data as any).programs === 'string' && (data as any).programs) ||
      (typeof (data as any).courses === 'string' && (data as any).courses);

    if (Array.isArray(data.courseIds)) {
      courseIds = data.courseIds;
    } else if (rawCourseStr) {
      const tokens = rawCourseStr.split(/[;,|]/).map((s: string) => s.trim()).filter(Boolean);
      tokens.forEach((tok: string) => {
        // e.g. "BTECH-CSE:120" or "BTECH-CSE(120)" or "B.Sc-DS = 60"
        const match = tok.match(/^([^:(=]+)(?:[:(=]+(\d+)\)?)?/);
        if (match) {
          const rawCode = match[1].trim();
          const intakeNum = match[2] ? parseInt(match[2], 10) : undefined;
          const found = mockDb.courses.find(
            (c) =>
              c.code.toLowerCase() === rawCode.toLowerCase() ||
              c.name.toLowerCase().includes(rawCode.toLowerCase()) ||
              c.id.toLowerCase() === rawCode.toLowerCase(),
          );
          const cId = found ? found.id : rawCode;
          courseIds.push(cId);
          if (intakeNum && !isNaN(intakeNum)) {
            parsedIntakesMap[cId] = intakeNum;
            if (found) parsedIntakesMap[found.code] = intakeNum;
          }
        }
      });
    }

    const resolvedCourses = (courseIds && courseIds.length > 0)
      ? mockDb.courses.filter((c) => courseIds.includes(c.id) || courseIds.includes(c.code))
      : [];

    const courseIntakes = data.courseIntakes && data.courseIntakes.length > 0
      ? data.courseIntakes
      : resolvedCourses.map((crs) => {
        const intake = parsedIntakesMap[crs.id] || parsedIntakesMap[crs.code] || crs.defaultIntake || 60;
        const cq = Math.round(intake * 0.7);
        const mq = intake - cq;
        return {
          courseId: crs.id,
          courseCode: crs.code,
          courseName: crs.name,
          stream: crs.stream || crs.courseGroup,
          degreeType: crs.degreeType,
          branch: crs.branch,
          sanctionedIntake: intake,
          convenorQuota: cq,
          managementQuota: mq,
          spotAdmission: 0,
        };
      });

    const streams = data.streams && data.streams.length > 0
      ? data.streams
      : Array.from(new Set(resolvedCourses.map((c) => c.stream || c.courseGroup).filter(Boolean)));

    const newCollege: MockCollege = {
      id: `col-${code.toLowerCase()}`,
      code: code,
      name: data.name || `Affiliated College (${code})`,
      type: data.type || 'UNAIDED',
      isAutonomous: !!data.isAutonomous,
      location: data.location || 'RURAL',
      district: data.district || 'East Godavari',
      address: data.address || 'Andhra Pradesh',
      pincode: data.pincode || '533001',
      principalName,
      principalMobile,
      principalEmail: data.principalEmail || `principal.${code.toLowerCase()}@aknu.edu.in`,
      hasHostel: !!data.hasHostel,
      active: true,
      createdAt: new Date().toISOString(),
      streams: streams.length > 0 ? streams : ['UG'],
      courseIds,
      courseIntakes,
      tempPassword: tempPassword,
      mustChangePassword: true,
    };
    mockDb.colleges.push(newCollege);

    // Automatically provision Principal login for this newly created college
    const existingUser = mockDb.users.find((u) => u.collegeId === newCollege.id);
    if (!existingUser) {
      mockDb.users.push({
        id: `usr-col-${newCollege.code.toLowerCase()}`,
        email: newCollege.principalEmail,
        phone: newCollege.principalMobile,
        name: `${newCollege.principalName} (Principal)`,
        role: 'COLLEGE_PRINCIPAL',
        courseSection: 'ALL',
        collegeId: newCollege.id,
        isActive: true,
        tempPassword: tempPassword,
        mustChangePassword: true,
      });
    }

    mockDb.save();
    return newCollege;
  }

  bulkUpload(rows: Partial<MockCollege>[]) {
    const created: MockCollege[] = [];
    const errors: { row: number; error: string }[] = [];

    rows.forEach((row, idx) => {
      try {
        if (!row.name && !row.code) {
          errors.push({ row: idx + 1, error: 'College Code or Name is required' });
          return;
        }
        const college = this.create(row);
        created.push(college);
      } catch (err: any) {
        errors.push({ row: idx + 1, error: err.message || 'Failed to create college' });
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

  bulkSeatMatrix(rows: Array<{
    collegeCode: string;
    courseCode: string;
    sanctionedIntake?: number | string;
    convenorQuota?: number | string;
    managementQuota?: number | string;
  }>) {
    let updatedCollegesCount = 0;
    let mappedCoursesCount = 0;
    const errors: Array<{ row: number; error: string }> = [];
    const affectedColleges = new Set<string>();

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      const cCode = (row.collegeCode || '').trim();
      const crsCode = (row.courseCode || '').trim();
      const intake = parseInt(String(row.sanctionedIntake || 60), 10) || 60;

      if (!cCode || !crsCode) {
        errors.push({ row: rowNum, error: 'Both College Code and Course Code are required' });
        return;
      }

      const college = mockDb.colleges.find(
        (c) => c.code.toLowerCase() === cCode.toLowerCase() || c.id.toLowerCase() === cCode.toLowerCase(),
      );
      if (!college) {
        errors.push({ row: rowNum, error: `College with code "${cCode}" not found` });
        return;
      }

      const course = mockDb.courses.find(
        (c) =>
          c.code.toLowerCase() === crsCode.toLowerCase() ||
          c.name.toLowerCase().includes(crsCode.toLowerCase()) ||
          c.id.toLowerCase() === crsCode.toLowerCase(),
      );
      if (!course) {
        errors.push({ row: rowNum, error: `Course with code "${crsCode}" not recognized` });
        return;
      }

      // Add courseId to college.courseIds if not present
      if (!college.courseIds) college.courseIds = [];
      if (!college.courseIds.includes(course.id)) {
        college.courseIds.push(course.id);
      }

      // Add stream to college.streams if not present
      const stream = course.stream || course.courseGroup || 'UG';
      if (!college.streams) college.streams = [];
      if (!college.streams.includes(stream)) {
        college.streams.push(stream);
      }

      // Update or insert into college.courseIntakes
      if (!college.courseIntakes) college.courseIntakes = [];
      const cq = row.convenorQuota ? parseInt(String(row.convenorQuota), 10) : Math.round(intake * 0.7);
      const mq = row.managementQuota ? parseInt(String(row.managementQuota), 10) : intake - cq;

      const existingIdx = college.courseIntakes.findIndex(
        (ci) => ci.courseId === course.id || ci.courseCode.toLowerCase() === course.code.toLowerCase(),
      );

      const entry = {
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        stream,
        degreeType: course.degreeType || 'Degree',
        branch: course.branch || course.name,
        sanctionedIntake: intake,
        convenorQuota: cq,
        managementQuota: mq,
        spotAdmission: 0,
      };

      if (existingIdx !== -1) {
        college.courseIntakes[existingIdx] = entry;
      } else {
        college.courseIntakes.push(entry);
      }

      affectedColleges.add(college.id);
      mappedCoursesCount++;
    });

    updatedCollegesCount = affectedColleges.size;
    mockDb.save();

    return {
      success: true,
      totalReceived: rows.length,
      importedCount: mappedCoursesCount,
      updatedCollegesCount,
      errorsCount: errors.length,
      summary: Array.from(affectedColleges).map((colId) => {
        const col = mockDb.colleges.find((c) => c.id === colId);
        return { collegeId: colId, collegeName: col?.name, mappedCourses: col?.courseIds?.length || 0 };
      }),
      errors,
    };
  }

  update(id: string, data: Partial<MockCollege>) {
    const index = mockDb.colleges.findIndex((c) => c.id === id || c.code === id);
    if (index === -1) {
      throw new NotFoundException(`College ${id} not found`);
    }

    let courseIds = data.courseIds;
    if (typeof (data as any).courses === 'string') {
      courseIds = (data as any).courses.split(/[;,|]/).map((s: string) => s.trim()).filter(Boolean);
    } else if (typeof (data as any).programs === 'string') {
      courseIds = (data as any).programs.split(/[;,|]/).map((s: string) => s.trim()).filter(Boolean);
    }

    mockDb.colleges[index] = {
      ...mockDb.colleges[index],
      ...data,
      ...(courseIds !== undefined ? { courseIds } : {}),
      ...(data.courseIntakes !== undefined ? { courseIntakes: data.courseIntakes } : {}),
      ...(data.streams !== undefined ? { streams: data.streams } : {}),
    };

    const updated = mockDb.colleges[index];
    mockDb.save();
    const courses = (updated.courseIds && updated.courseIds.length > 0)
      ? mockDb.courses.filter((crs) => updated.courseIds?.includes(crs.id) || updated.courseIds?.includes(crs.code))
      : [];

    return {
      ...updated,
      courses,
    };
  }

  remove(id: string) {
    const index = mockDb.colleges.findIndex((c) => c.id === id || c.code === id);
    if (index === -1) {
      throw new NotFoundException(`College ${id} not found`);
    }
    const removed = mockDb.colleges.splice(index, 1)[0];
    mockDb.save();
    return { success: true, removed };
  }

  clearAll(includeCourses: boolean = false) {
    mockDb.clearAllData(includeCourses);
    return {
      success: true,
      message: 'All colleges, students, faculty, proceedings, demands, and payments have been completely cleared.',
      collegesCount: mockDb.colleges.length,
      studentsCount: mockDb.students.length,
    };
  }

  getStats() {
    const total = mockDb.colleges.length;
    const govt = mockDb.colleges.filter((c) => c.type === 'GOVERNMENT').length;
    const aided = mockDb.colleges.filter((c) => c.type === 'AIDED').length;
    const unaided = mockDb.colleges.filter((c) => c.type === 'UNAIDED').length;
    const autonomous = mockDb.colleges.filter((c) => c.isAutonomous).length;
    const rural = mockDb.colleges.filter((c) => c.location === 'RURAL').length;
    const urban = mockDb.colleges.filter((c) => c.location === 'URBAN').length;

    return {
      total,
      govt,
      aided,
      unaided,
      autonomous,
      rural,
      urban,
    };
  }
}
