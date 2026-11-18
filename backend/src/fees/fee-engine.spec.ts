import { calculateFeesForCourseGroup } from './fee-engine';
import { CollegeFeeContext, CourseStudentData } from './fee-engine.types';

describe('AKNU CDC Fee Calculation Engine', () => {
  const baseRuralCollege: CollegeFeeContext = {
    collegeId: 'col-001',
    collegeCode: '042',
    collegeName: 'Govt Degree College, Rajamahendravaram',
    type: 'GOVERNMENT',
    isAutonomous: false,
    location: 'RURAL',
    hasHostel: true,
  };

  const baseUrbanCollege: CollegeFeeContext = {
    collegeId: 'col-002',
    collegeCode: '088',
    collegeName: 'Aditya Degree College, Kakinada',
    type: 'UNAIDED',
    isAutonomous: false,
    location: 'URBAN',
    hasHostel: true,
  };

  describe('UG Fee Calculations', () => {
    it('calculates UG fees correctly with 1st year and continuing students, computer sections, and rural hostel', () => {
      const courses: CourseStudentData[] = [
        {
          courseId: 'c1',
          courseCode: 'B.Sc-Computer Science',
          courseName: 'B.Sc (Mathematics, Physics, Computer Science)',
          courseGroup: 'UG',
          durationYears: 4,
          degreeLevel: 'UG',
          isComputer: true,
          sectionsCount: 2,
          students: [
            { id: 's1', admissionNo: 'UG01', yearOfStudy: 1, quota: 'CONVENOR', status: 'ACTIVE' },
            { id: 's2', admissionNo: 'UG02', yearOfStudy: 1, quota: 'CONVENOR', status: 'ACTIVE' },
            { id: 's3', admissionNo: 'UG03', yearOfStudy: 2, quota: 'CONVENOR', status: 'ACTIVE' },
            { id: 's4', admissionNo: 'UG04', yearOfStudy: 3, quota: 'CONVENOR', status: 'ACTIVE' },
          ],
        },
        {
          courseId: 'c2',
          courseCode: 'B.A-Computer Applications',
          courseName: 'B.A (History, Economics, Computer Applications)',
          courseGroup: 'UG',
          durationYears: 4,
          degreeLevel: 'UG',
          isComputer: true,
          sectionsCount: 1,
          students: [
            { id: 's5', admissionNo: 'UG05', yearOfStudy: 1, quota: 'CONVENOR', status: 'ACTIVE' },
            { id: 's6', admissionNo: 'UG06', yearOfStudy: 2, quota: 'CONVENOR', status: 'ACTIVE' },
          ],
        },
      ];

      // Total students = 6 (1 to 100 slab -> 5500 INR)
      // Inspection: 8000 INR
      // ICGS: 1600 INR
      // Slab: 5500 INR
      // Comp Sci sections (2 * 3300 = 6600 INR)
      // Comp Arts sections (1 * 1100 = 1100 INR)
      // 1st year students: 3 * 560 = 1680 INR
      // Other years: 3 * 340 = 1020 INR
      // Hostel inspection: 5000 INR
      // Hostel recognition (Rural): 5500 INR
      // Total INR: 8000 + 1600 + 5500 + 6600 + 1100 + 1680 + 1020 + 5000 + 5500 = 36,000 INR = 3,600,000 paise

      const result = calculateFeesForCourseGroup(baseRuralCollege, courses, {
        academicYear: '2026-27',
        includeInspection: true,
        includeHostel: true,
      });

      expect(result.totalActiveStudents).toBe(6);
      expect(result.totalPaise).toBe(3600000);
      expect(result.totalINR).toBe(36000);

      // Verify student fee mapping
      expect(result.studentFeeMap['s1'].amountPaise).toBe(56000);
      expect(result.studentFeeMap['s3'].amountPaise).toBe(34000);
    });

    it('applies urban hostel recognition fee (11,000 INR) for urban colleges', () => {
      const courses: CourseStudentData[] = [
        {
          courseId: 'c1',
          courseCode: 'B.Com-Gen',
          courseName: 'B.Com General',
          courseGroup: 'UG',
          durationYears: 4,
          degreeLevel: 'UG',
          isComputer: false,
          students: [
            { id: 's1', admissionNo: 'UGB01', yearOfStudy: 1, quota: 'CONVENOR', status: 'ACTIVE' },
          ],
        },
      ];

      const result = calculateFeesForCourseGroup(baseUrbanCollege, courses, {
        academicYear: '2026-27',
        includeInspection: true,
        includeHostel: true,
      });

      const hostelRecItem = result.breakdown.find((i) => i.id === 'HOSTEL_RECOGNITION');
      expect(hostelRecItem).toBeDefined();
      expect(hostelRecItem?.amountPaise).toBe(1100000); // 11,000 INR in paise
    });

    it('correctly maps all 5 student slabs for UG affiliation fees', () => {
      const makeStudents = (count: number) =>
        Array.from({ length: count }, (_, i) => ({
          id: `st-${i}`,
          admissionNo: `ADM-${i}`,
          yearOfStudy: 1,
          quota: 'CONVENOR' as const,
          status: 'ACTIVE' as const,
        }));

      // Slab 1: 1-100 students -> 5500 INR
      const r1 = calculateFeesForCourseGroup(baseRuralCollege, [
        { courseId: 'c', courseCode: 'BA', courseName: 'BA', courseGroup: 'UG', durationYears: 4, degreeLevel: 'UG', isComputer: false, students: makeStudents(50) },
      ], { academicYear: '2026-27', includeHostel: false, includeInspection: false });
      expect(r1.breakdown.find(b => b.id === 'UG_AFFILIATION_SLAB')?.amountPaise).toBe(550000);

      // Slab 2: 101-300 students -> 8000 INR
      const r2 = calculateFeesForCourseGroup(baseRuralCollege, [
        { courseId: 'c', courseCode: 'BA', courseName: 'BA', courseGroup: 'UG', durationYears: 4, degreeLevel: 'UG', isComputer: false, students: makeStudents(150) },
      ], { academicYear: '2026-27', includeHostel: false, includeInspection: false });
      expect(r2.breakdown.find(b => b.id === 'UG_AFFILIATION_SLAB')?.amountPaise).toBe(800000);

      // Slab 3: 301-600 students -> 16500 INR
      const r3 = calculateFeesForCourseGroup(baseRuralCollege, [
        { courseId: 'c', courseCode: 'BA', courseName: 'BA', courseGroup: 'UG', durationYears: 4, degreeLevel: 'UG', isComputer: false, students: makeStudents(400) },
      ], { academicYear: '2026-27', includeHostel: false, includeInspection: false });
      expect(r3.breakdown.find(b => b.id === 'UG_AFFILIATION_SLAB')?.amountPaise).toBe(1650000);

      // Slab 4: 601-1000 students -> 24500 INR
      const r4 = calculateFeesForCourseGroup(baseRuralCollege, [
        { courseId: 'c', courseCode: 'BA', courseName: 'BA', courseGroup: 'UG', durationYears: 4, degreeLevel: 'UG', isComputer: false, students: makeStudents(800) },
      ], { academicYear: '2026-27', includeHostel: false, includeInspection: false });
      expect(r4.breakdown.find(b => b.id === 'UG_AFFILIATION_SLAB')?.amountPaise).toBe(2450000);

      // Slab 5: >1000 students -> 27500 INR
      const r5 = calculateFeesForCourseGroup(baseRuralCollege, [
        { courseId: 'c', courseCode: 'BA', courseName: 'BA', courseGroup: 'UG', durationYears: 4, degreeLevel: 'UG', isComputer: false, students: makeStudents(1200) },
      ], { academicYear: '2026-27', includeHostel: false, includeInspection: false });
      expect(r5.breakdown.find(b => b.id === 'UG_AFFILIATION_SLAB')?.amountPaise).toBe(2750000);
    });
  });

  describe('LAW Fee Calculations', () => {
    it('calculates 1st year (900 INR) and senior years (800 INR) per student', () => {
      const courses: CourseStudentData[] = [
        {
          courseId: 'law1',
          courseCode: 'LL.B-3Y',
          courseName: 'Bachelor of Laws (3 Year)',
          courseGroup: 'LAW',
          durationYears: 3,
          degreeLevel: 'PROFESSIONAL',
          isComputer: false,
          students: [
            { id: 'l1', admissionNo: 'L01', yearOfStudy: 1, quota: 'CONVENOR', status: 'ACTIVE' },
            { id: 'l2', admissionNo: 'L02', yearOfStudy: 1, quota: 'CONVENOR', status: 'ACTIVE' },
            { id: 'l3', admissionNo: 'L03', yearOfStudy: 2, quota: 'CONVENOR', status: 'ACTIVE' },
            { id: 'l4', admissionNo: 'L04', yearOfStudy: 3, quota: 'CONVENOR', status: 'ACTIVE' },
          ],
        },
      ];

      // Inspection: 8000
      // ICGS: 1600
      // 1st year (2 * 900 = 1800 INR = 180000 paise)
      // Other years (2 * 800 = 1600 INR = 160000 paise)
      // Total INR = 8000 + 1600 + 1800 + 1600 = 13000 INR = 1,300,000 paise

      const result = calculateFeesForCourseGroup(baseUrbanCollege, courses, {
        academicYear: '2026-27',
      });

      expect(result.totalPaise).toBe(1300000);
      expect(result.totalINR).toBe(13000);
    });
  });

  describe('Education & Physical Education (B.Ed / B.P.Ed / D.P.Ed) Calculations', () => {
    it('calculates 1st year (1660 INR), 2nd year (560 INR), staff ratification (22000 INR), and affiliation slab', () => {
      const courses: CourseStudentData[] = [
        {
          courseId: 'bed1',
          courseCode: 'B.Ed',
          courseName: 'Bachelor of Education',
          courseGroup: 'EDUCATION',
          durationYears: 2,
          degreeLevel: 'PROFESSIONAL',
          isComputer: false,
          students: [
            { id: 'e1', admissionNo: 'BED01', yearOfStudy: 1, quota: 'CONVENOR', status: 'ACTIVE' },
            { id: 'e2', admissionNo: 'BED02', yearOfStudy: 2, quota: 'CONVENOR', status: 'ACTIVE' },
          ],
        },
      ];

      // Inspection: 8000
      // ICGS: 1600
      // Affiliation slab (2 students <= 100): 22000 INR
      // Staff ratification: 1 unratified faculty -> 22000 INR
      // 1st year (1 * 1660 = 1660 INR)
      // 2nd year (1 * 560 = 560 INR)
      // Total INR = 8000 + 1600 + 22000 + 22000 + 1660 + 560 = 55,820 INR = 5,582,000 paise

      const result = calculateFeesForCourseGroup(baseRuralCollege, courses, {
        academicYear: '2026-27',
        unratifiedFacultyCount: 1,
      });

      expect(result.totalPaise).toBe(5582000);
      expect(result.totalINR).toBe(55820);
    });
  });

  describe('PG Fee Calculations with Management Quota', () => {
    it('applies MSc (1300 INR), MA/MCom (1200 INR), MSc CS (1960 INR) and MQ surcharges (3300 Arts / 5500 Science)', () => {
      const courses: CourseStudentData[] = [
        {
          courseId: 'pg1',
          courseCode: 'M.Sc-Computer Science',
          courseName: 'M.Sc Computer Science',
          courseGroup: 'PG',
          durationYears: 2,
          degreeLevel: 'PG',
          isComputer: true,
          students: [
            // 1 MSc CS Convenor student
            { id: 'p1', admissionNo: 'PG01', yearOfStudy: 1, quota: 'CONVENOR', status: 'ACTIVE' },
            // 1 MSc CS Management Quota student
            { id: 'p2', admissionNo: 'PG02', yearOfStudy: 1, quota: 'MANAGEMENT', status: 'ACTIVE' },
          ],
        },
        {
          courseId: 'pg2',
          courseCode: 'M.Sc-Organic Chemistry',
          courseName: 'M.Sc Organic Chemistry',
          courseGroup: 'PG',
          durationYears: 2,
          degreeLevel: 'PG',
          isComputer: false,
          students: [
            { id: 'p3', admissionNo: 'PG03', yearOfStudy: 1, quota: 'CONVENOR', status: 'ACTIVE' },
          ],
        },
        {
          courseId: 'pg3',
          courseCode: 'M.Com',
          courseName: 'Master of Commerce',
          courseGroup: 'PG',
          durationYears: 2,
          degreeLevel: 'PG',
          isComputer: false,
          students: [
            { id: 'p4', admissionNo: 'PG04', yearOfStudy: 1, quota: 'MANAGEMENT', status: 'ACTIVE' },
          ],
        },
      ];

      // Inspection: 8000 INR
      // ICGS: 1600 INR
      // M.Sc CS students: 2 * 1960 = 3920 INR
      // M.Sc general students: 1 * 1300 = 1300 INR
      // M.Com arts students: 1 * 1200 = 1200 INR
      // MQ Science student (p2): 1 * 5500 = 5500 INR
      // MQ Arts student (p4): 1 * 3300 = 3300 INR
      // Total INR: 8000 + 1600 + 3920 + 1300 + 1200 + 5500 + 3300 = 24,820 INR = 2,482,000 paise

      const result = calculateFeesForCourseGroup(baseUrbanCollege, courses, {
        academicYear: '2026-27',
      });

      expect(result.totalPaise).toBe(2482000);
      expect(result.totalINR).toBe(24820);
    });
  });

  describe('Supplementary Demands for Late Admissions', () => {
    it('charges only for new late-admitted students and ignores previously paid students and institutional fees', () => {
      const courses: CourseStudentData[] = [
        {
          courseId: 'c1',
          courseCode: 'B.Sc-MPC',
          courseName: 'B.Sc MPC',
          courseGroup: 'UG',
          durationYears: 4,
          degreeLevel: 'UG',
          isComputer: false,
          students: [
            { id: 's1', admissionNo: 'OLD01', yearOfStudy: 1, quota: 'CONVENOR', status: 'ACTIVE' },
            { id: 's2', admissionNo: 'LATE01', yearOfStudy: 1, quota: 'SPOT', status: 'ACTIVE' },
          ],
        },
      ];

      // 's1' is already paid in regular demand.
      // Supplementary should ONLY charge for 's2' (1st year = 560 INR = 56000 paise).
      // No inspection fee, no ICGS, no hostel base fee.
      const result = calculateFeesForCourseGroup(baseRuralCollege, courses, {
        academicYear: '2026-27',
        previouslyPaidStudentIds: ['s1'],
      });

      expect(result.totalPaise).toBe(56000);
      expect(result.totalINR).toBe(560);
      expect(result.newAdmissionsCount).toBe(1);
    });
  });
});
