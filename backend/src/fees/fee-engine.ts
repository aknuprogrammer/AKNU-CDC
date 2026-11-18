import {
  CollegeFeeContext,
  CourseGroupType,
  CourseStudentData,
  FeeBreakdownItem,
  FeeCalculationOptions,
  FeeCalculationResult,
  StudentFeeRecord,
} from './fee-engine.types';
import { FEE_RATES_2026_27 } from './fee-rates-2026';

/**
 * Pure, deterministic fee calculation engine for AKNU CDC.
 * Operates purely on input data with zero external I/O or state mutations.
 * All financial values are strictly represented in integer PAISE.
 */
export function calculateFeesForCourseGroup(
  college: CollegeFeeContext,
  courses: CourseStudentData[],
  options: FeeCalculationOptions,
): FeeCalculationResult {
  const {
    academicYear = '2026-27',
    includeInspection = true,
    includeHostel = true,
    unratifiedFacultyCount = 0,
    previouslyPaidStudentIds = [],
  } = options;

  const previouslyPaidSet = new Set(previouslyPaidStudentIds);
  const breakdown: FeeBreakdownItem[] = [];
  const studentFeeMap: Record<string, { amountPaise: number; heads: string[] }> = {};
  const summaryByHead: Record<string, number> = {};

  const courseGroup: CourseGroupType = courses[0]?.courseGroup || 'UG';

  // 1. Gather active students across courses
  let totalActiveStudents = 0;
  let newAdmissionsCount = 0;

  // Track all active students
  const activeStudents: { student: StudentFeeRecord; course: CourseStudentData }[] = [];

  for (const course of courses) {
    const validStudents = (course.students || []).filter(
      (s) => s.status === 'ACTIVE' || s.status === 'PROMOTED',
    );
    totalActiveStudents += validStudents.length;

    for (const student of validStudents) {
      activeStudents.push({ student, course });
      if (!studentFeeMap[student.id]) {
        studentFeeMap[student.id] = { amountPaise: 0, heads: [] };
      }
    }
  }

  // 2. Base Institutional Fees (only charged once per course group, unless supplementary)
  const isSupplementary = previouslyPaidStudentIds.length > 0;

  if (includeInspection && !isSupplementary) {
    const inspectionAmount = FEE_RATES_2026_27.INSPECTION_FEE_PAISE;
    breakdown.push({
      id: 'INST_INSPECTION',
      category: 'INSTITUTIONAL',
      head: 'Inspection Fee',
      description: 'Annual CDC inspection and affiliation verification fee',
      unitCount: 1,
      ratePaise: inspectionAmount,
      amountPaise: inspectionAmount,
    });
  }

  if (!isSupplementary) {
    const icgsAmount = FEE_RATES_2026_27.ICGS_FEE_PAISE;
    breakdown.push({
      id: 'INST_ICGS',
      category: 'INSTITUTIONAL',
      head: 'Inter-Collegiate Games & Sports (ICGS)',
      description: 'University sports development and tournament affiliation fund',
      unitCount: 1,
      ratePaise: icgsAmount,
      amountPaise: icgsAmount,
    });
  }

  // 3. Course-Group Specific Calculations
  switch (courseGroup) {
    case 'UG': {
      // UG Affiliation Slab based on total active students
      if (!isSupplementary && totalActiveStudents > 0) {
        const slab = FEE_RATES_2026_27.UG.AFFILIATION_SLABS.find(
          (s) => totalActiveStudents >= s.min && totalActiveStudents <= s.max,
        );
        const slabAmount = slab ? slab.amountPaise : 27500 * 100;

        breakdown.push({
          id: 'UG_AFFILIATION_SLAB',
          category: 'AFFILIATION',
          head: 'UG Affiliation Slab Fee',
          description: `Affiliation fee for ${totalActiveStudents} enrolled students`,
          unitCount: totalActiveStudents,
          ratePaise: slabAmount,
          amountPaise: slabAmount,
        });
      }

      // Computer section charges
      if (!isSupplementary) {
        let compSciSections = 0;
        let compArtsSections = 0;

        for (const course of courses) {
          if (course.isComputer) {
            const count = course.sectionsCount || 1;
            const codeUpper = course.courseCode.toUpperCase();
            if (codeUpper.includes('BSC') || codeUpper.includes('B.SC') || codeUpper.includes('BCA')) {
              compSciSections += count;
            } else {
              compArtsSections += count;
            }
          }
        }

        if (compSciSections > 0) {
          const rate = FEE_RATES_2026_27.UG.COMPUTER_SCIENCE_SECTION_PAISE;
          const total = compSciSections * rate;
          breakdown.push({
            id: 'UG_COMP_SCI_SECTION',
            category: 'SECTION',
            head: 'Computer Section Fee (Science)',
            description: `Laboratory & infrastructure verification for ${compSciSections} science computer section(s)`,
            unitCount: compSciSections,
            ratePaise: rate,
            amountPaise: total,
          });
        }

        if (compArtsSections > 0) {
          const rate = FEE_RATES_2026_27.UG.COMPUTER_ARTS_SECTION_PAISE;
          const total = compArtsSections * rate;
          breakdown.push({
            id: 'UG_COMP_ARTS_SECTION',
            category: 'SECTION',
            head: 'Computer Section Fee (Arts/Commerce)',
            description: `Computer facility recognition for ${compArtsSections} arts/commerce section(s)`,
            unitCount: compArtsSections,
            ratePaise: rate,
            amountPaise: total,
          });
        }
      }

      // Per-student tuition / affiliation fee
      const year1Students: string[] = [];
      const otherYearsStudents: string[] = [];

      for (const { student } of activeStudents) {
        if (previouslyPaidSet.has(student.id)) continue;
        newAdmissionsCount++;

        if (student.yearOfStudy === 1) {
          year1Students.push(student.id);
          const rate = FEE_RATES_2026_27.UG.YEAR_1_PAISE;
          studentFeeMap[student.id].amountPaise += rate;
          studentFeeMap[student.id].heads.push('UG 1st Year University Fee');
        } else {
          otherYearsStudents.push(student.id);
          const rate = FEE_RATES_2026_27.UG.YEAR_OTHER_PAISE;
          studentFeeMap[student.id].amountPaise += rate;
          studentFeeMap[student.id].heads.push('UG Subsequent Years Fee');
        }
      }

      if (year1Students.length > 0) {
        const rate = FEE_RATES_2026_27.UG.YEAR_1_PAISE;
        const total = year1Students.length * rate;
        breakdown.push({
          id: 'UG_STUDENT_YEAR_1',
          category: 'STUDENT_TUITION',
          head: 'UG Student Fee (1st Year)',
          description: `Per-student admission & university fee for 1st year (${year1Students.length} students)`,
          unitCount: year1Students.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: year1Students,
        });
      }

      if (otherYearsStudents.length > 0) {
        const rate = FEE_RATES_2026_27.UG.YEAR_OTHER_PAISE;
        const total = otherYearsStudents.length * rate;
        breakdown.push({
          id: 'UG_STUDENT_YEAR_OTHER',
          category: 'STUDENT_TUITION',
          head: 'UG Student Fee (2nd/3rd/4th Year)',
          description: `Per-student renewal fee for continuing students (${otherYearsStudents.length} students)`,
          unitCount: otherYearsStudents.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: otherYearsStudents,
        });
      }

      // Hostel recognition & inspection
      if (college.hasHostel && includeHostel && !isSupplementary) {
        const hostelInsp = FEE_RATES_2026_27.UG.HOSTEL_INSPECTION_PAISE;
        breakdown.push({
          id: 'HOSTEL_INSPECTION',
          category: 'HOSTEL',
          head: 'Hostel Inspection Fee',
          description: 'Hostel facility and sanitation compliance inspection',
          unitCount: 1,
          ratePaise: hostelInsp,
          amountPaise: hostelInsp,
        });

        const recognitionRate =
          college.location === 'RURAL'
            ? FEE_RATES_2026_27.UG.HOSTEL_RECOGNITION_RURAL_PAISE
            : FEE_RATES_2026_27.UG.HOSTEL_RECOGNITION_URBAN_PAISE;

        breakdown.push({
          id: 'HOSTEL_RECOGNITION',
          category: 'HOSTEL',
          head: `Hostel Recognition Fee (${college.location})`,
          description: `Annual hostel recognition for ${college.location.toLowerCase()} college campus`,
          unitCount: 1,
          ratePaise: recognitionRate,
          amountPaise: recognitionRate,
        });
      }
      break;
    }

    case 'LAW': {
      const year1Students: string[] = [];
      const otherYearsStudents: string[] = [];

      for (const { student } of activeStudents) {
        if (previouslyPaidSet.has(student.id)) continue;
        newAdmissionsCount++;

        if (student.yearOfStudy === 1) {
          year1Students.push(student.id);
          const rate = FEE_RATES_2026_27.LAW.YEAR_1_PAISE;
          studentFeeMap[student.id].amountPaise += rate;
          studentFeeMap[student.id].heads.push('LAW 1st Year Fee');
        } else {
          otherYearsStudents.push(student.id);
          const rate = FEE_RATES_2026_27.LAW.YEAR_OTHER_PAISE;
          studentFeeMap[student.id].amountPaise += rate;
          studentFeeMap[student.id].heads.push('LAW Subsequent Years Fee');
        }
      }

      if (year1Students.length > 0) {
        const rate = FEE_RATES_2026_27.LAW.YEAR_1_PAISE;
        const total = year1Students.length * rate;
        breakdown.push({
          id: 'LAW_STUDENT_YEAR_1',
          category: 'STUDENT_TUITION',
          head: 'LAW Student Fee (1st Year)',
          description: `Bar Council & University affiliation fee for 1st Year (${year1Students.length} students)`,
          unitCount: year1Students.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: year1Students,
        });
      }

      if (otherYearsStudents.length > 0) {
        const rate = FEE_RATES_2026_27.LAW.YEAR_OTHER_PAISE;
        const total = otherYearsStudents.length * rate;
        breakdown.push({
          id: 'LAW_STUDENT_YEAR_OTHER',
          category: 'STUDENT_TUITION',
          head: 'LAW Student Fee (Continuing Years)',
          description: `Per-student fee for senior law students (${otherYearsStudents.length} students)`,
          unitCount: otherYearsStudents.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: otherYearsStudents,
        });
      }
      break;
    }

    case 'EDUCATION':
    case 'PHYSICAL_EDUCATION': {
      // Affiliation slabs for B.Ed / B.P.Ed / D.P.Ed
      if (!isSupplementary && totalActiveStudents > 0) {
        const slab = FEE_RATES_2026_27.EDUCATION.AFFILIATION_SLABS.find(
          (s) => totalActiveStudents >= s.min && totalActiveStudents <= s.max,
        );
        const slabAmount = slab ? slab.amountPaise : 33000 * 100;

        breakdown.push({
          id: 'EDU_AFFILIATION_SLAB',
          category: 'AFFILIATION',
          head: 'Education / Physical Education Affiliation Slab',
          description: `NCTE / NCTPE affiliation recognition for ${totalActiveStudents} students`,
          unitCount: totalActiveStudents,
          ratePaise: slabAmount,
          amountPaise: slabAmount,
        });
      }

      // Staff ratification fee if unratified faculty count > 0
      if (unratifiedFacultyCount > 0 && !isSupplementary) {
        const rate = FEE_RATES_2026_27.EDUCATION.STAFF_RATIFICATION_PAISE;
        const total = unratifiedFacultyCount * rate;
        breakdown.push({
          id: 'EDU_STAFF_RATIFICATION',
          category: 'FACULTY_RATIFICATION',
          head: 'Faculty Staff Ratification Fee',
          description: `Approval and university ratification for ${unratifiedFacultyCount} unratified faculty member(s)`,
          unitCount: unratifiedFacultyCount,
          ratePaise: rate,
          amountPaise: total,
        });
      }

      // Student fees: 1st year 1660, 2nd year 560
      const year1Students: string[] = [];
      const year2Students: string[] = [];

      for (const { student } of activeStudents) {
        if (previouslyPaidSet.has(student.id)) continue;
        newAdmissionsCount++;

        if (student.yearOfStudy === 1) {
          year1Students.push(student.id);
          const rate = FEE_RATES_2026_27.EDUCATION.YEAR_1_PAISE;
          studentFeeMap[student.id].amountPaise += rate;
          studentFeeMap[student.id].heads.push('Education 1st Year Fee');
        } else {
          year2Students.push(student.id);
          const rate = FEE_RATES_2026_27.EDUCATION.YEAR_2_PAISE;
          studentFeeMap[student.id].amountPaise += rate;
          studentFeeMap[student.id].heads.push('Education 2nd Year Fee');
        }
      }

      if (year1Students.length > 0) {
        const rate = FEE_RATES_2026_27.EDUCATION.YEAR_1_PAISE;
        const total = year1Students.length * rate;
        breakdown.push({
          id: 'EDU_STUDENT_YEAR_1',
          category: 'STUDENT_TUITION',
          head: 'B.Ed/B.P.Ed Student Fee (1st Year)',
          description: `Student registration & affiliation fee (${year1Students.length} students)`,
          unitCount: year1Students.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: year1Students,
        });
      }

      if (year2Students.length > 0) {
        const rate = FEE_RATES_2026_27.EDUCATION.YEAR_2_PAISE;
        const total = year2Students.length * rate;
        breakdown.push({
          id: 'EDU_STUDENT_YEAR_2',
          category: 'STUDENT_TUITION',
          head: 'B.Ed/B.P.Ed Student Fee (2nd Year)',
          description: `2nd Year student renewal fee (${year2Students.length} students)`,
          unitCount: year2Students.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: year2Students,
        });
      }
      break;
    }

    case 'PG': {
      // Course-specific rates:
      // M.Sc: 1300, M.A/M.Com/MHRM: 1200, M.Sc Computer Science: 1960
      // MQ: 3300 Arts, 5500 Science
      const mscStudents: string[] = [];
      const artsStudents: string[] = [];
      const mscCsStudents: string[] = [];
      const mqArtsStudents: string[] = [];
      const mqScienceStudents: string[] = [];

      for (const { student, course } of activeStudents) {
        if (previouslyPaidSet.has(student.id)) continue;
        newAdmissionsCount++;

        const codeUpper = course.courseCode.toUpperCase();
        const isCompSci = codeUpper.includes('CS') || codeUpper.includes('COMPUTER');
        const isScience = isCompSci || codeUpper.includes('MSC') || codeUpper.includes('M.SC');

        if (isCompSci) {
          mscCsStudents.push(student.id);
          const rate = FEE_RATES_2026_27.PG.MSC_COMP_SCI_STUDENT_PAISE;
          studentFeeMap[student.id].amountPaise += rate;
          studentFeeMap[student.id].heads.push('M.Sc Computer Science University Fee');
        } else if (isScience) {
          mscStudents.push(student.id);
          const rate = FEE_RATES_2026_27.PG.MSC_STUDENT_PAISE;
          studentFeeMap[student.id].amountPaise += rate;
          studentFeeMap[student.id].heads.push('M.Sc Student University Fee');
        } else {
          artsStudents.push(student.id);
          const rate = FEE_RATES_2026_27.PG.MA_MCOM_MHRM_STUDENT_PAISE;
          studentFeeMap[student.id].amountPaise += rate;
          studentFeeMap[student.id].heads.push('PG Arts/Commerce University Fee');
        }

        // Management Quota surcharges
        if (student.quota === 'MANAGEMENT') {
          if (isScience) {
            mqScienceStudents.push(student.id);
            const rate = FEE_RATES_2026_27.PG.MQ_SCIENCE_STUDENT_PAISE;
            studentFeeMap[student.id].amountPaise += rate;
            studentFeeMap[student.id].heads.push('PG Management Quota Fee (Science)');
          } else {
            mqArtsStudents.push(student.id);
            const rate = FEE_RATES_2026_27.PG.MQ_ARTS_STUDENT_PAISE;
            studentFeeMap[student.id].amountPaise += rate;
            studentFeeMap[student.id].heads.push('PG Management Quota Fee (Arts)');
          }
        }
      }

      if (mscCsStudents.length > 0) {
        const rate = FEE_RATES_2026_27.PG.MSC_COMP_SCI_STUDENT_PAISE;
        const total = mscCsStudents.length * rate;
        breakdown.push({
          id: 'PG_MSC_CS',
          category: 'STUDENT_TUITION',
          head: 'M.Sc Computer Science Student Fee',
          description: `Specialized lab & university fee (${mscCsStudents.length} students)`,
          unitCount: mscCsStudents.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: mscCsStudents,
        });
      }

      if (mscStudents.length > 0) {
        const rate = FEE_RATES_2026_27.PG.MSC_STUDENT_PAISE;
        const total = mscStudents.length * rate;
        breakdown.push({
          id: 'PG_MSC',
          category: 'STUDENT_TUITION',
          head: 'M.Sc General Student Fee',
          description: `Science stream affiliation fee (${mscStudents.length} students)`,
          unitCount: mscStudents.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: mscStudents,
        });
      }

      if (artsStudents.length > 0) {
        const rate = FEE_RATES_2026_27.PG.MA_MCOM_MHRM_STUDENT_PAISE;
        const total = artsStudents.length * rate;
        breakdown.push({
          id: 'PG_ARTS',
          category: 'STUDENT_TUITION',
          head: 'M.A / M.Com / MHRM Student Fee',
          description: `Arts & Commerce stream affiliation fee (${artsStudents.length} students)`,
          unitCount: artsStudents.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: artsStudents,
        });
      }

      if (mqScienceStudents.length > 0) {
        const rate = FEE_RATES_2026_27.PG.MQ_SCIENCE_STUDENT_PAISE;
        const total = mqScienceStudents.length * rate;
        breakdown.push({
          id: 'PG_MQ_SCIENCE',
          category: 'MANAGEMENT_QUOTA',
          head: 'Management Quota Fee (Science)',
          description: `AKNU Management Quota statutory fee for Science candidates (${mqScienceStudents.length} students)`,
          unitCount: mqScienceStudents.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: mqScienceStudents,
        });
      }

      if (mqArtsStudents.length > 0) {
        const rate = FEE_RATES_2026_27.PG.MQ_ARTS_STUDENT_PAISE;
        const total = mqArtsStudents.length * rate;
        breakdown.push({
          id: 'PG_MQ_ARTS',
          category: 'MANAGEMENT_QUOTA',
          head: 'Management Quota Fee (Arts/Commerce)',
          description: `AKNU Management Quota statutory fee for Arts candidates (${mqArtsStudents.length} students)`,
          unitCount: mqArtsStudents.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: mqArtsStudents,
        });
      }
      break;
    }

    case 'MBA_MCA': {
      if (!isSupplementary) {
        const affil = FEE_RATES_2026_27.MBA_MCA.AFFILIATION_FLAT_PAISE;
        breakdown.push({
          id: 'MBA_MCA_AFFILIATION',
          category: 'AFFILIATION',
          head: 'MBA & MCA Professional Affiliation Fee',
          description: 'AICTE / AKNU curriculum & affiliation monitoring fee',
          unitCount: 1,
          ratePaise: affil,
          amountPaise: affil,
        });
      }

      const year1Students: string[] = [];
      const year2Students: string[] = [];

      for (const { student } of activeStudents) {
        if (previouslyPaidSet.has(student.id)) continue;
        newAdmissionsCount++;

        if (student.yearOfStudy === 1) {
          year1Students.push(student.id);
          const rate = FEE_RATES_2026_27.MBA_MCA.YEAR_1_PAISE;
          studentFeeMap[student.id].amountPaise += rate;
          studentFeeMap[student.id].heads.push('MBA/MCA 1st Year Fee');
        } else {
          year2Students.push(student.id);
          const rate = FEE_RATES_2026_27.MBA_MCA.YEAR_2_PAISE;
          studentFeeMap[student.id].amountPaise += rate;
          studentFeeMap[student.id].heads.push('MBA/MCA 2nd Year Fee');
        }
      }

      if (year1Students.length > 0) {
        const rate = FEE_RATES_2026_27.MBA_MCA.YEAR_1_PAISE;
        const total = year1Students.length * rate;
        breakdown.push({
          id: 'MBA_MCA_YEAR_1',
          category: 'STUDENT_TUITION',
          head: 'MBA/MCA Student Fee (1st Year)',
          description: `Professional student registration fee (${year1Students.length} students)`,
          unitCount: year1Students.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: year1Students,
        });
      }

      if (year2Students.length > 0) {
        const rate = FEE_RATES_2026_27.MBA_MCA.YEAR_2_PAISE;
        const total = year2Students.length * rate;
        breakdown.push({
          id: 'MBA_MCA_YEAR_2',
          category: 'STUDENT_TUITION',
          head: 'MBA/MCA Student Fee (2nd Year)',
          description: `Continuing student fee (${year2Students.length} students)`,
          unitCount: year2Students.length,
          ratePaise: rate,
          amountPaise: total,
          studentIds: year2Students,
        });
      }
      break;
    }

    default:
      break;
  }

  // 4. Calculate total paise and summaries
  let totalPaise = 0;
  for (const item of breakdown) {
    totalPaise += item.amountPaise;
    summaryByHead[item.head] = (summaryByHead[item.head] || 0) + item.amountPaise;
  }

  return {
    academicYear,
    collegeId: college.collegeId,
    courseGroup,
    totalPaise,
    totalINR: Math.round(totalPaise / 100),
    totalActiveStudents,
    newAdmissionsCount: isSupplementary ? newAdmissionsCount : totalActiveStudents,
    breakdown,
    studentFeeMap,
    summaryByHead,
  };
}
