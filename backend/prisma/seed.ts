import { PrismaClient } from '@prisma/client';
import { FEE_RATES_2026_27 } from '../src/fees/fee-rates-2026';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('Seeding AKNU CDC Affiliation System database...');

  // 1. Fee Rules for 2026-27
  const academicYear = '2026-27';

  // Check if already seeded
  const existingRules = await prisma.feeRule.findMany({ where: { academicYear } });
  if (existingRules.length === 0) {
    console.log('Creating fee rules for 2026-27...');
    await prisma.feeRule.createMany({
      data: [
        // UG Rules
        {
          academicYear,
          courseGroup: 'UG',
          ruleName: 'UG Inspection Fee',
          ruleType: 'FLAT_PER_COLLEGE',
          baseAmountPaise: BigInt(FEE_RATES_2026_27.INSPECTION_FEE_PAISE),
          description: 'Annual inspection and physical infrastructure verification fee',
        },
        {
          academicYear,
          courseGroup: 'UG',
          ruleName: 'UG ICGS Sports Fund',
          ruleType: 'FLAT_PER_COLLEGE',
          baseAmountPaise: BigInt(FEE_RATES_2026_27.ICGS_FEE_PAISE),
          description: 'Inter-Collegiate Games and Sports affiliation fund',
        },
        {
          academicYear,
          courseGroup: 'UG',
          ruleName: 'UG Affiliation Slabs',
          ruleType: 'SLAB_STUDENTS',
          slabJson: JSON.stringify(FEE_RATES_2026_27.UG.AFFILIATION_SLABS),
          description: 'Slabs on total enrolled UG students: 5500/8000/16500/24500/27500 INR',
        },
        {
          academicYear,
          courseGroup: 'UG',
          ruleName: 'UG Computer Sections',
          ruleType: 'PER_SECTION',
          compSciencePaise: BigInt(FEE_RATES_2026_27.UG.COMPUTER_SCIENCE_SECTION_PAISE),
          compArtsPaise: BigInt(FEE_RATES_2026_27.UG.COMPUTER_ARTS_SECTION_PAISE),
          description: 'Science computer sections (3300 INR) & Arts computer sections (1100 INR)',
        },
        {
          academicYear,
          courseGroup: 'UG',
          ruleName: 'UG Per-Student Tuition Fee',
          ruleType: 'PER_STUDENT_YEAR',
          year1Paise: BigInt(FEE_RATES_2026_27.UG.YEAR_1_PAISE),
          otherYearsPaise: BigInt(FEE_RATES_2026_27.UG.YEAR_OTHER_PAISE),
          description: '1st Year 560 INR, 2nd/3rd/4th Year 340 INR per enrolled student',
        },
        {
          academicYear,
          courseGroup: 'UG',
          ruleName: 'Hostel Fees',
          ruleType: 'OPTIONAL_HOSTEL',
          baseAmountPaise: BigInt(FEE_RATES_2026_27.UG.HOSTEL_INSPECTION_PAISE),
          ruralPaise: BigInt(FEE_RATES_2026_27.UG.HOSTEL_RECOGNITION_RURAL_PAISE),
          urbanPaise: BigInt(FEE_RATES_2026_27.UG.HOSTEL_RECOGNITION_URBAN_PAISE),
          description: 'Hostel inspection (5000 INR), Recognition (5500 INR Rural / 11000 INR Urban)',
        },
        // LAW Rules
        {
          academicYear,
          courseGroup: 'LAW',
          ruleName: 'LAW Per-Student Fee',
          ruleType: 'PER_STUDENT_YEAR',
          year1Paise: BigInt(FEE_RATES_2026_27.LAW.YEAR_1_PAISE),
          otherYearsPaise: BigInt(FEE_RATES_2026_27.LAW.YEAR_OTHER_PAISE),
          description: '1st Year 900 INR, subsequent years 800 INR',
        },
        // Education Rules
        {
          academicYear,
          courseGroup: 'EDUCATION',
          ruleName: 'B.Ed/B.P.Ed Student & Staff Ratification',
          ruleType: 'PER_STUDENT_YEAR',
          year1Paise: BigInt(FEE_RATES_2026_27.EDUCATION.YEAR_1_PAISE),
          otherYearsPaise: BigInt(FEE_RATES_2026_27.EDUCATION.YEAR_2_PAISE),
          baseAmountPaise: BigInt(FEE_RATES_2026_27.EDUCATION.STAFF_RATIFICATION_PAISE),
          slabJson: JSON.stringify(FEE_RATES_2026_27.EDUCATION.AFFILIATION_SLABS),
          description: '1st yr 1660 INR, 2nd yr 560 INR, Staff ratification 22000 INR, Affiliation slabs 22k/27.5k/33k',
        },
        // PG Rules
        {
          academicYear,
          courseGroup: 'PG',
          ruleName: 'PG Affiliation Rates & MQ',
          ruleType: 'PER_STUDENT_YEAR',
          compSciencePaise: BigInt(FEE_RATES_2026_27.PG.MSC_COMP_SCI_STUDENT_PAISE),
          mqArtsPaise: BigInt(FEE_RATES_2026_27.PG.MQ_ARTS_STUDENT_PAISE),
          mqSciencePaise: BigInt(FEE_RATES_2026_27.PG.MQ_SCIENCE_STUDENT_PAISE),
          description: 'MSc 1300, MA/MCom 1200, MSc CS 1960; MQ Arts 3300, MQ Science 5500',
        },
      ],
    });
  }

  // 2. Colleges: Dynamic entry (none seeded)
  console.log('Colleges table is clean for dynamic onboarding.');

  // 3. Seed Courses Master Catalog
  const coursesData = [
    { code: 'BSC-MPC', name: 'B.Sc (Mathematics, Physics, Chemistry)', courseGroup: 'UG' as const, durationYears: 4, degreeLevel: 'UG', isComputer: false },
    { code: 'BSC-MPCS', name: 'B.Sc (Mathematics, Physics, Computer Science)', courseGroup: 'UG' as const, durationYears: 4, degreeLevel: 'UG', isComputer: true },
    { code: 'BA-HEP', name: 'B.A (History, Economics, Politics)', courseGroup: 'UG' as const, durationYears: 4, degreeLevel: 'UG', isComputer: false },
    { code: 'BCOM-CA', name: 'B.Com (Computer Applications)', courseGroup: 'UG' as const, durationYears: 4, degreeLevel: 'UG', isComputer: true },
    { code: 'MSC-CS', name: 'M.Sc (Computer Science)', courseGroup: 'PG' as const, durationYears: 2, degreeLevel: 'PG', isComputer: true },
    { code: 'MSC-ORGC', name: 'M.Sc (Organic Chemistry)', courseGroup: 'PG' as const, durationYears: 2, degreeLevel: 'PG', isComputer: false },
    { code: 'MCOM', name: 'Master of Commerce (M.Com)', courseGroup: 'PG' as const, durationYears: 2, degreeLevel: 'PG', isComputer: false },
    { code: 'MBA', name: 'Master of Business Administration (MBA)', courseGroup: 'MBA_MCA' as const, durationYears: 2, degreeLevel: 'PG', isComputer: false },
    { code: 'MCA', name: 'Master of Computer Applications (MCA)', courseGroup: 'MBA_MCA' as const, durationYears: 2, degreeLevel: 'PG', isComputer: true },
    { code: 'LLB-3Y', name: 'Bachelor of Laws (LL.B - 3 Year)', courseGroup: 'LAW' as const, durationYears: 3, degreeLevel: 'PROFESSIONAL', isComputer: false },
    { code: 'BED', name: 'Bachelor of Education (B.Ed)', courseGroup: 'EDUCATION' as const, durationYears: 2, degreeLevel: 'PROFESSIONAL', isComputer: false },
    { code: 'BPED', name: 'Bachelor of Physical Education (B.P.Ed)', courseGroup: 'PHYSICAL_EDUCATION' as const, durationYears: 2, degreeLevel: 'PROFESSIONAL', isComputer: false },
  ];

  for (const crs of coursesData) {
    await prisma.course.upsert({
      where: { code: crs.code },
      update: crs,
      create: crs,
    });
  }

  // 4. Seed Official University Staff Logins
  const usersData = [
    {
      email: 'admin@aknu.edu.in',
      phone: '9848012345',
      name: 'AKNU Super Admin',
      role: 'SUPER_ADMIN' as const,
      courseSection: 'ALL' as const,
    },
    {
      email: 'dean.cdc@aknu.edu.in',
      phone: '9848023456',
      name: 'Prof. P. Suresh Varma (Dean CDC - All Modules Access)',
      role: 'DEAN_CDC' as const,
      courseSection: 'ALL' as const,
    },
    {
      email: 'section.ug@aknu.edu.in',
      phone: '9848067890',
      name: 'UG Section Officer (Undergraduate Courses)',
      role: 'SECTION_OFFICER' as const,
      courseSection: 'UG' as const,
    },
    {
      email: 'section.pg@aknu.edu.in',
      phone: '9848078901',
      name: 'PG Section Officer (M.B.A, M.C.A, M.Com, M.Sc, M.A)',
      role: 'SECTION_OFFICER' as const,
      courseSection: 'PG' as const,
    },
    {
      email: 'section.education@aknu.edu.in',
      phone: '9848089012',
      name: 'Education Section Officer (B.Ed, M.Ed, B.P.Ed, M.P.Ed)',
      role: 'SECTION_OFFICER' as const,
      courseSection: 'EDUCATION' as const,
    },
    {
      email: 'section.law@aknu.edu.in',
      phone: '9848090123',
      name: 'LAW Section Officer (L.L.B, L.L.M)',
      role: 'SECTION_OFFICER' as const,
      courseSection: 'LAW' as const,
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: u,
      create: {
        ...u,
        isActive: true,
      },
    });
  }

  console.log('AKNU CDC database successfully seeded!');
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
