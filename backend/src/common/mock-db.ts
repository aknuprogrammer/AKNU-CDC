import { FEE_RATES_2026_27 } from '../fees/fee-rates-2026';

export interface MockUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: string;
  courseSection: string;
  collegeId?: string;
  otpCode?: string;
  otpExpiresAt?: Date;
  isActive: boolean;
  password?: string;
  tempPassword?: string;
  mustChangePassword?: boolean;
}

export interface MockCollege {
  id: string;
  code: string;
  name: string;
  type: 'GOVERNMENT' | 'AIDED' | 'UNAIDED' | string;
  isAutonomous: boolean;
  location: 'RURAL' | 'URBAN' | string;
  district: string;
  address: string;
  pincode: string;
  principalName: string;
  principalMobile: string;
  principalEmail: string;
  alternatePhone?: string;
  hasHostel: boolean;
  active: boolean;
  createdAt: string;
  streams?: string[];
  courseIds?: string[];
  courseIntakes?: Array<{
    courseId: string;
    courseCode: string;
    courseName: string;
    stream: string;
    degreeType: string;
    branch: string;
    sanctionedIntake: number;
    convenorQuota: number;
    managementQuota: number;
    spotAdmission: number;
  }>;
  courses?: any[];
  tempPassword?: string;
  password?: string;
  mustChangePassword?: boolean;
}

export interface MockCourse {
  id: string;
  code: string;
  name: string;
  stream?: string;             // Level 1: "UG" | "PG" | "LAW" | "EDUCATION" (Dynamic)
  courseGroup: string;        // Compatibility alias for stream
  degreeType?: string;         // Level 2: "B.Tech" | "B.Sc" | "B.Com" | "B.A" | "M.B.A" | "M.C.A" | "M.Sc" | "LL.B" | "LL.M" | "B.Ed" (Dynamic)
  branch?: string;             // Level 3: "CSE" | "ECE" | "Civil" | "Data Science" | "Corporate Law" (Dynamic)
  durationYears: number;
  degreeLevel: string;
  isComputer: boolean;
  defaultIntake?: number;
  active: boolean;
}

export interface MockStudent {
  id: string;
  collegeId: string;
  courseId: string;
  academicYear: string;
  admissionNo: string;
  name: string;
  fatherName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  category: 'SC' | 'ST' | 'BC' | 'OC';
  isPh: boolean;
  isMinority: boolean;
  yearOfStudy: number;
  quota: 'CONVENOR' | 'SPOT' | 'MANAGEMENT';
  admissionDate: string;
  apaarId: string;
  status: 'ACTIVE' | 'PROMOTED' | 'DETAINED' | 'LEFT' | 'DISCONTINUED';
}

export interface MockFaculty {
  id: string;
  collegeId: string;
  courseId: string;
  name: string;
  designation: string;
  qualification: string;
  panNumber: string;
  aadharLast4: string;
  isRatified: boolean;
  ratifyYear?: string;
  mobile: string;
  email: string;
}

export interface MockProceeding {
  id: string;
  proceedingNumber: string;
  academicYear: string;
  collegeId: string;
  courseGroupId: string;
  templateType: string;
  status: 'DRAFT' | 'SUPERINTENDENT_CHECKED' | 'APPROVED' | 'ISSUED' | 'ACKNOWLEDGED' | 'REJECTED';
  draftedById?: string;
  superintendentId?: string;
  approvedById?: string;
  subject: string;
  bodyTemplate: string;
  conditions: string;
  dscSignatureHash?: string;
  qrVerificationCode: string;
  acknowledgedAt?: string;
  issuedAt?: string;
  createdAt: string;
  items: Array<{
    courseName: string;
    sanctionedIntake: number;
    convenorQuota: number;
    spotAdmission: number;
    managementQuota: number;
  }>;
}

export interface MockDemand {
  id: string;
  demandNumber: string;
  collegeId: string;
  courseGroupId: string;
  academicYear: string;
  demandType: 'REGULAR' | 'SUPPLEMENTARY' | 'REVISED';
  totalPaise: number;
  paidPaise: number;
  balancePaise: number;
  lateFeePaise: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'WAIVED';
  dueDate: string;
  graceDays: number;
  isLocked: boolean;
  breakdown: any[];
  studentFeeMap?: Record<string, { amountPaise: number; heads: string[] }>;
  createdAt: string;
}

export interface MockPayment {
  id: string;
  receiptNumber: string;
  collegeId: string;
  totalAmountPaise: number;
  gateway: 'SBI_COLLECT' | 'RAZORPAY' | 'MANUAL_CHALLAN';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  status: 'INITIATED' | 'SUCCESS' | 'FAILED';
  qrReceiptCode: string;
  idempotencyKey: string;
  reconciled: boolean;
  paidAt?: string;
  allocations: Array<{ demandId: string; allocatedPaise: number }>;
  createdAt: string;
}

export interface MockWorkflowQuery {
  id: string;
  collegeId: string;
  courseGroupId: string;
  demandId?: string;
  proceedingId?: string;
  stage: 'CLERK' | 'SUPERINTENDENT' | 'DEAN' | 'COLLEGE';
  fromUserId: string;
  toUserId?: string;
  subject: string;
  queryText: string;
  responseText?: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedAt?: string;
  createdAt: string;
}

export class MockDatabase {
  public users: MockUser[] = [];
  public colleges: MockCollege[] = [];
  public courses: MockCourse[] = [];
  public students: MockStudent[] = [];
  public faculty: MockFaculty[] = [];
  public proceedings: MockProceeding[] = [];
  public demands: MockDemand[] = [];
  public payments: MockPayment[] = [];
  public workflowQueries: MockWorkflowQuery[] = [];
  public auditLogs: any[] = [];
  public notifications: any[] = [];
  public lateFeeWaivers: any[] = [];

  constructor() {
    this.seedMockData();
  }

  private seedMockData() {
    // 1. Colleges: Empty initially - to be added dynamically
    this.colleges = [];

    // 2. University Logins: Super Admin, Dean CDC (all module access), and course-wise section logins
    this.users = [
      {
        id: 'usr-admin',
        email: 'admin@aknu.edu.in',
        phone: '9848012345',
        name: 'AKNU Super Admin',
        role: 'SUPER_ADMIN',
        courseSection: 'ALL',
        isActive: true,
      },
      {
        id: 'usr-dean',
        email: 'dean.cdc@aknu.edu.in',
        phone: '9848023456',
        name: 'Prof. P. Suresh Varma (Dean CDC - All Modules Access)',
        role: 'DEAN_CDC',
        courseSection: 'ALL',
        isActive: true,
      },
      {
        id: 'usr-sec-ug',
        email: 'section.ug@aknu.edu.in',
        phone: '9848067890',
        name: 'UG Section Officer (Undergraduate Courses)',
        role: 'SECTION_OFFICER',
        courseSection: 'UG',
        isActive: true,
      },
      {
        id: 'usr-sec-pg',
        email: 'section.pg@aknu.edu.in',
        phone: '9848078901',
        name: 'PG Section Officer (M.B.A, M.C.A, M.Com, M.Sc, M.A)',
        role: 'SECTION_OFFICER',
        courseSection: 'PG',
        isActive: true,
      },
      {
        id: 'usr-sec-education',
        email: 'section.education@aknu.edu.in',
        phone: '9848089012',
        name: 'Education Section Officer (B.Ed, M.Ed, B.P.Ed, M.P.Ed)',
        role: 'SECTION_OFFICER',
        courseSection: 'EDUCATION',
        isActive: true,
      },
      {
        id: 'usr-sec-law',
        email: 'section.law@aknu.edu.in',
        phone: '9848090123',
        name: 'LAW Section Officer (L.L.B, L.L.M)',
        role: 'SECTION_OFFICER',
        courseSection: 'LAW',
        isActive: true,
      },
    ];

    // 3. Courses Master: Pre-populated with clear 3-Level Dynamic Academic Hierarchy
    // Level 1: Stream (UG/PG/LAW/EDUCATION) -> Level 2: Degree (B.Tech, B.Sc, MBA, LLB, B.Ed) -> Level 3: Branch (CSE, ECE, Data Science, etc.)
    this.courses = [
      // --- UG -> B.Tech ---
      {
        id: 'crs-btech-cse',
        code: 'B.Tech-CSE',
        name: 'B.Tech Computer Science & Engineering',
        stream: 'UG',
        courseGroup: 'UG',
        degreeType: 'B.Tech',
        branch: 'CSE',
        durationYears: 4,
        degreeLevel: 'UG',
        isComputer: true,
        defaultIntake: 60,
        active: true,
      },
      {
        id: 'crs-btech-ece',
        code: 'B.Tech-ECE',
        name: 'B.Tech Electronics & Communication Engineering',
        stream: 'UG',
        courseGroup: 'UG',
        degreeType: 'B.Tech',
        branch: 'ECE',
        durationYears: 4,
        degreeLevel: 'UG',
        isComputer: true,
        defaultIntake: 60,
        active: true,
      },
      {
        id: 'crs-btech-civil',
        code: 'B.Tech-Civil',
        name: 'B.Tech Civil Engineering',
        stream: 'UG',
        courseGroup: 'UG',
        degreeType: 'B.Tech',
        branch: 'Civil Engineering',
        durationYears: 4,
        degreeLevel: 'UG',
        isComputer: false,
        defaultIntake: 60,
        active: true,
      },
      {
        id: 'crs-btech-mech',
        code: 'B.Tech-Mech',
        name: 'B.Tech Mechanical Engineering',
        stream: 'UG',
        courseGroup: 'UG',
        degreeType: 'B.Tech',
        branch: 'Mechanical Engineering',
        durationYears: 4,
        degreeLevel: 'UG',
        isComputer: false,
        defaultIntake: 60,
        active: true,
      },
      // --- UG -> B.Sc ---
      {
        id: 'crs-bsc-ds',
        code: 'B.Sc-DS',
        name: 'B.Sc Data Science & AI',
        stream: 'UG',
        courseGroup: 'UG',
        degreeType: 'B.Sc',
        branch: 'Data Science & AI',
        durationYears: 3,
        degreeLevel: 'UG',
        isComputer: true,
        defaultIntake: 50,
        active: true,
      },
      {
        id: 'crs-bsc-cs',
        code: 'B.Sc-CS',
        name: 'B.Sc Computer Science',
        stream: 'UG',
        courseGroup: 'UG',
        degreeType: 'B.Sc',
        branch: 'Computer Science',
        durationYears: 3,
        degreeLevel: 'UG',
        isComputer: true,
        defaultIntake: 50,
        active: true,
      },
      {
        id: 'crs-bsc-mpc',
        code: 'B.Sc-MPC',
        name: 'B.Sc Mathematics, Physics & Chemistry',
        stream: 'UG',
        courseGroup: 'UG',
        degreeType: 'B.Sc',
        branch: 'MPC',
        durationYears: 3,
        degreeLevel: 'UG',
        isComputer: false,
        defaultIntake: 50,
        active: true,
      },
      // --- UG -> B.Com ---
      {
        id: 'crs-bcom-ca',
        code: 'B.Com-CA',
        name: 'B.Com Computer Applications',
        stream: 'UG',
        courseGroup: 'UG',
        degreeType: 'B.Com',
        branch: 'Computer Applications',
        durationYears: 3,
        degreeLevel: 'UG',
        isComputer: true,
        defaultIntake: 60,
        active: true,
      },
      {
        id: 'crs-bcom-gen',
        code: 'B.Com-Gen',
        name: 'B.Com General',
        stream: 'UG',
        courseGroup: 'UG',
        degreeType: 'B.Com',
        branch: 'General',
        durationYears: 3,
        degreeLevel: 'UG',
        isComputer: false,
        defaultIntake: 60,
        active: true,
      },
      // --- UG -> B.A ---
      {
        id: 'crs-ba-hep',
        code: 'B.A-HEP',
        name: 'B.A History, Economics & Politics',
        stream: 'UG',
        courseGroup: 'UG',
        degreeType: 'B.A',
        branch: 'History, Economics & Politics',
        durationYears: 3,
        degreeLevel: 'UG',
        isComputer: false,
        defaultIntake: 50,
        active: true,
      },
      // --- PG -> M.B.A ---
      {
        id: 'crs-mba',
        code: 'M.B.A',
        name: 'Master of Business Administration',
        stream: 'PG',
        courseGroup: 'PG',
        degreeType: 'M.B.A',
        branch: 'Business Administration',
        durationYears: 2,
        degreeLevel: 'PG',
        isComputer: true,
        defaultIntake: 60,
        active: true,
      },
      // --- PG -> M.C.A ---
      {
        id: 'crs-mca',
        code: 'M.C.A',
        name: 'Master of Computer Applications',
        stream: 'PG',
        courseGroup: 'PG',
        degreeType: 'M.C.A',
        branch: 'Computer Applications',
        durationYears: 2,
        degreeLevel: 'PG',
        isComputer: true,
        defaultIntake: 60,
        active: true,
      },
      // --- PG -> M.Sc ---
      {
        id: 'crs-msc-chem',
        code: 'M.Sc-OrgChem',
        name: 'M.Sc Organic Chemistry',
        stream: 'PG',
        courseGroup: 'PG',
        degreeType: 'M.Sc',
        branch: 'Organic Chemistry',
        durationYears: 2,
        degreeLevel: 'PG',
        isComputer: false,
        defaultIntake: 30,
        active: true,
      },
      {
        id: 'crs-msc-cs',
        code: 'M.Sc-CS',
        name: 'M.Sc Computer Science',
        stream: 'PG',
        courseGroup: 'PG',
        degreeType: 'M.Sc',
        branch: 'Computer Science',
        durationYears: 2,
        degreeLevel: 'PG',
        isComputer: true,
        defaultIntake: 30,
        active: true,
      },
      // --- LAW -> LL.B & LL.M ---
      {
        id: 'crs-llb-3y',
        code: 'LL.B-3Y',
        name: 'Bachelor of Laws (3 Years)',
        stream: 'LAW',
        courseGroup: 'LAW',
        degreeType: 'LL.B',
        branch: 'General Law',
        durationYears: 3,
        degreeLevel: 'UG',
        isComputer: false,
        defaultIntake: 120,
        active: true,
      },
      {
        id: 'crs-ballb-5y',
        code: 'B.A.LL.B-5Y',
        name: 'B.A. LL.B (5 Years Integrated)',
        stream: 'LAW',
        courseGroup: 'LAW',
        degreeType: 'LL.B',
        branch: 'Integrated Law',
        durationYears: 5,
        degreeLevel: 'UG',
        isComputer: false,
        defaultIntake: 60,
        active: true,
      },
      {
        id: 'crs-llm',
        code: 'LL.M',
        name: 'Master of Laws (Constitutional Law)',
        stream: 'LAW',
        courseGroup: 'LAW',
        degreeType: 'LL.M',
        branch: 'Constitutional Law',
        durationYears: 2,
        degreeLevel: 'PG',
        isComputer: false,
        defaultIntake: 30,
        active: true,
      },
      // --- EDUCATION -> B.Ed & M.Ed ---
      {
        id: 'crs-bed',
        code: 'B.Ed',
        name: 'Bachelor of Education',
        stream: 'EDUCATION',
        courseGroup: 'EDUCATION',
        degreeType: 'B.Ed',
        branch: 'Secondary Education',
        durationYears: 2,
        degreeLevel: 'UG',
        isComputer: false,
        defaultIntake: 100,
        active: true,
      },
      {
        id: 'crs-med',
        code: 'M.Ed',
        name: 'Master of Education',
        stream: 'EDUCATION',
        courseGroup: 'EDUCATION',
        degreeType: 'M.Ed',
        branch: 'Advanced Pedagogy',
        durationYears: 2,
        degreeLevel: 'PG',
        isComputer: false,
        defaultIntake: 50,
        active: true,
      },
      {
        id: 'crs-bped',
        code: 'B.P.Ed',
        name: 'Bachelor of Physical Education',
        stream: 'EDUCATION',
        courseGroup: 'EDUCATION',
        degreeType: 'B.P.Ed',
        branch: 'Physical Education',
        durationYears: 2,
        degreeLevel: 'UG',
        isComputer: false,
        defaultIntake: 50,
        active: true,
      },
    ];

    // Seed Sample Colleges illustrating distinct Stream and Course Mappings
    this.colleges = [
      {
        id: 'col-001',
        code: '001',
        name: 'Government College of Engineering & Technology (Autonomous)',
        type: 'GOVERNMENT',
        isAutonomous: true,
        location: 'RURAL',
        district: 'East Godavari',
        address: 'Kateru Road, Rajahmundry',
        pincode: '533105',
        principalName: 'Dr. K. Srinivas Rao',
        principalMobile: '9440123456',
        principalEmail: 'principal.001@aknu.edu.in',
        hasHostel: true,
        active: true,
        createdAt: new Date().toISOString(),
        streams: ['UG'], // Offers only UG (specifically B.Tech programs only)
        courseIds: ['crs-btech-cse', 'crs-btech-ece', 'crs-btech-civil'],
        courseIntakes: [
          {
            courseId: 'crs-btech-cse',
            courseCode: 'B.Tech-CSE',
            courseName: 'B.Tech Computer Science & Engineering',
            stream: 'UG',
            degreeType: 'B.Tech',
            branch: 'CSE',
            sanctionedIntake: 60,
            convenorQuota: 42,
            managementQuota: 18,
            spotAdmission: 0,
          },
          {
            courseId: 'crs-btech-ece',
            courseCode: 'B.Tech-ECE',
            courseName: 'B.Tech Electronics & Communication Engineering',
            stream: 'UG',
            degreeType: 'B.Tech',
            branch: 'ECE',
            sanctionedIntake: 60,
            convenorQuota: 42,
            managementQuota: 18,
            spotAdmission: 0,
          },
          {
            courseId: 'crs-btech-civil',
            courseCode: 'B.Tech-Civil',
            courseName: 'B.Tech Civil Engineering',
            stream: 'UG',
            degreeType: 'B.Tech',
            branch: 'Civil Engineering',
            sanctionedIntake: 60,
            convenorQuota: 42,
            managementQuota: 18,
            spotAdmission: 0,
          },
        ],
      },
      {
        id: 'col-002',
        code: '002',
        name: 'Aditya Degree & PG College for Women',
        type: 'UNAIDED',
        isAutonomous: false,
        location: 'URBAN',
        district: 'Kakinada',
        address: 'Srinagar, Kakinada',
        pincode: '533003',
        principalName: 'Dr. P. Lakshmi Devi',
        principalMobile: '9848123456',
        principalEmail: 'principal.002@aknu.edu.in',
        hasHostel: true,
        active: true,
        createdAt: new Date().toISOString(),
        streams: ['UG', 'PG'], // Offers both UG and PG
        courseIds: ['crs-bsc-ds', 'crs-bcom-ca', 'crs-mba'],
        courseIntakes: [
          {
            courseId: 'crs-bsc-ds',
            courseCode: 'B.Sc-DS',
            courseName: 'B.Sc Data Science & AI',
            stream: 'UG',
            degreeType: 'B.Sc',
            branch: 'Data Science & AI',
            sanctionedIntake: 50,
            convenorQuota: 35,
            managementQuota: 15,
            spotAdmission: 0,
          },
          {
            courseId: 'crs-bcom-ca',
            courseCode: 'B.Com-CA',
            courseName: 'B.Com Computer Applications',
            stream: 'UG',
            degreeType: 'B.Com',
            branch: 'Computer Applications',
            sanctionedIntake: 60,
            convenorQuota: 42,
            managementQuota: 18,
            spotAdmission: 0,
          },
          {
            courseId: 'crs-mba',
            courseCode: 'M.B.A',
            courseName: 'Master of Business Administration',
            stream: 'PG',
            degreeType: 'M.B.A',
            branch: 'Business Administration',
            sanctionedIntake: 60,
            convenorQuota: 42,
            managementQuota: 18,
            spotAdmission: 0,
          },
        ],
      },
      {
        id: 'col-003',
        code: '003',
        name: 'SKBR Degree College',
        type: 'AIDED',
        isAutonomous: false,
        location: 'RURAL',
        district: 'Dr. B.R. Ambedkar Konaseema',
        address: 'Amalapuram Road',
        pincode: '533201',
        principalName: 'Dr. M. Satyanarayana',
        principalMobile: '9440987654',
        principalEmail: 'principal.003@aknu.edu.in',
        hasHostel: false,
        active: true,
        createdAt: new Date().toISOString(),
        streams: ['UG'], // Offers only UG
        courseIds: ['crs-bsc-cs', 'crs-bcom-gen', 'crs-ba-hep'],
        courseIntakes: [
          {
            courseId: 'crs-bsc-cs',
            courseCode: 'B.Sc-CS',
            courseName: 'B.Sc Computer Science',
            stream: 'UG',
            degreeType: 'B.Sc',
            branch: 'Computer Science',
            sanctionedIntake: 50,
            convenorQuota: 35,
            managementQuota: 15,
            spotAdmission: 0,
          },
          {
            courseId: 'crs-bcom-gen',
            courseCode: 'B.Com-Gen',
            courseName: 'B.Com General',
            stream: 'UG',
            degreeType: 'B.Com',
            branch: 'General',
            sanctionedIntake: 60,
            convenorQuota: 42,
            managementQuota: 18,
            spotAdmission: 0,
          },
          {
            courseId: 'crs-ba-hep',
            courseCode: 'B.A-HEP',
            courseName: 'B.A History, Economics & Politics',
            stream: 'UG',
            degreeType: 'B.A',
            branch: 'History, Economics & Politics',
            sanctionedIntake: 50,
            convenorQuota: 35,
            managementQuota: 15,
            spotAdmission: 0,
          },
        ],
      },
      {
        id: 'col-004',
        code: '004',
        name: 'GSKP College of Law',
        type: 'UNAIDED',
        isAutonomous: false,
        location: 'URBAN',
        district: 'West Godavari',
        address: 'Bhimavaram',
        pincode: '534201',
        principalName: 'Dr. V. Prasad',
        principalMobile: '9440112233',
        principalEmail: 'principal.004@aknu.edu.in',
        hasHostel: true,
        active: true,
        createdAt: new Date().toISOString(),
        streams: ['LAW'], // Offers only LAW
        courseIds: ['crs-llb-3y', 'crs-llm'],
        courseIntakes: [
          {
            courseId: 'crs-llb-3y',
            courseCode: 'LL.B-3Y',
            courseName: 'Bachelor of Laws (3 Years)',
            stream: 'LAW',
            degreeType: 'LL.B',
            branch: 'General Law',
            sanctionedIntake: 120,
            convenorQuota: 84,
            managementQuota: 36,
            spotAdmission: 0,
          },
          {
            courseId: 'crs-llm',
            courseCode: 'LL.M',
            courseName: 'Master of Laws (Constitutional Law)',
            stream: 'LAW',
            degreeType: 'LL.M',
            branch: 'Constitutional Law',
            sanctionedIntake: 30,
            convenorQuota: 21,
            managementQuota: 9,
            spotAdmission: 0,
          },
        ],
      },
      {
        id: 'col-005',
        code: '005',
        name: "St. Mary's College of Education",
        type: 'AIDED',
        isAutonomous: false,
        location: 'RURAL',
        district: 'East Godavari',
        address: 'Peddapuram',
        pincode: '533437',
        principalName: 'Dr. K. Ranga Rao',
        principalMobile: '9848223344',
        principalEmail: 'principal.005@aknu.edu.in',
        hasHostel: false,
        active: true,
        createdAt: new Date().toISOString(),
        streams: ['EDUCATION'], // Offers only Education
        courseIds: ['crs-bed', 'crs-med'],
        courseIntakes: [
          {
            courseId: 'crs-bed',
            courseCode: 'B.Ed',
            courseName: 'Bachelor of Education',
            stream: 'EDUCATION',
            degreeType: 'B.Ed',
            branch: 'Secondary Education',
            sanctionedIntake: 100,
            convenorQuota: 70,
            managementQuota: 30,
            spotAdmission: 0,
          },
          {
            courseId: 'crs-med',
            courseCode: 'M.Ed',
            courseName: 'Master of Education',
            stream: 'EDUCATION',
            degreeType: 'M.Ed',
            branch: 'Advanced Pedagogy',
            sanctionedIntake: 50,
            convenorQuota: 35,
            managementQuota: 15,
            spotAdmission: 0,
          },
        ],
      },
    ];

    // Seed Sample Proceedings representing published orders for these colleges
    this.proceedings = [
      {
        id: 'proc-001',
        proceedingNumber: 'AKNU/CDC/AFFIL/2026-27/001',
        academicYear: '2026-27',
        collegeId: 'col-001',
        courseGroupId: 'UG',
        templateType: 'GRANT_AFFILIATION',
        status: 'ISSUED',
        subject: 'Grant of Permanent Affiliation & Binding Sanctioned Intake for 2026-27',
        bodyTemplate: 'Order of Affiliation and Binding Cap of Sanctioned Intake for Engineering Programs.',
        conditions: '1. Total admissions must not exceed the sanctioned intake of each program under any circumstances.',
        qrVerificationCode: 'AKNU-PROC-2026-001-QR',
        issuedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        items: [
          { courseName: 'B.Tech Computer Science & Engineering', sanctionedIntake: 60, convenorQuota: 42, spotAdmission: 0, managementQuota: 18 },
          { courseName: 'B.Tech Electronics & Communication Engineering', sanctionedIntake: 60, convenorQuota: 42, spotAdmission: 0, managementQuota: 18 },
          { courseName: 'B.Tech Civil Engineering', sanctionedIntake: 60, convenorQuota: 42, spotAdmission: 0, managementQuota: 18 },
        ],
      },
      {
        id: 'proc-002',
        proceedingNumber: 'AKNU/CDC/AFFIL/2026-27/002',
        academicYear: '2026-27',
        collegeId: 'col-002',
        courseGroupId: 'UG',
        templateType: 'GRANT_AFFILIATION',
        status: 'ISSUED',
        subject: 'Sanction of Academic Intake for UG & PG Programs 2026-27',
        bodyTemplate: 'Approved intake capacity with binding seat matrix for B.Sc, B.Com, and MBA.',
        conditions: 'Strict quota adherence required for CQ and MQ admissions.',
        qrVerificationCode: 'AKNU-PROC-2026-002-QR',
        issuedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        items: [
          { courseName: 'B.Sc Data Science & AI', sanctionedIntake: 50, convenorQuota: 35, spotAdmission: 0, managementQuota: 15 },
          { courseName: 'B.Com Computer Applications', sanctionedIntake: 60, convenorQuota: 42, spotAdmission: 0, managementQuota: 18 },
          { courseName: 'Master of Business Administration', sanctionedIntake: 60, convenorQuota: 42, spotAdmission: 0, managementQuota: 18 },
        ],
      },
    ];

    // 4. Students (Empty - add/upload dynamically)
    this.students = [];

    // 5. Faculty (Empty - add dynamically)
    this.faculty = [];

    // 6. Proceedings (Empty - draft and issue dynamically)
    this.proceedings = [];

    // 7. Demands (Empty - generate dynamically via pure Fee Engine)
    this.demands = [];

    // 8. Payments (Empty - pay dynamically)
    this.payments = [];

    // 9. Workflow Queries (Empty - submit dynamically)
    this.workflowQueries = [];

    // 10. Notifications (Empty - dispatch dynamically)
    this.notifications = [];
  }
}

// Global Singleton for mock database when Postgres is offline
export const mockDb = new MockDatabase();
