import * as fs from 'fs';
import * as path from 'path';
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
  pdfUrl?: string;
  originalFileName?: string;
  fileSizeBytes?: number;
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

  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.seedMockData();
    this.loadFromDisk();
    this.registerExitHooks();
  }

  private getStorageFilePath(): string {
    const candidatePaths = [
      path.resolve(process.cwd(), 'data/mock-db-store.json'),
      path.resolve(process.cwd(), 'backend/data/mock-db-store.json'),
      path.resolve(__dirname, '../../data/mock-db-store.json'),
      path.resolve(__dirname, '../../../data/mock-db-store.json'),
    ];

    // 1. If file already exists, return that path
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // 2. Otherwise return candidate whose directory exists
    for (const p of candidatePaths) {
      const dir = path.dirname(p);
      if (fs.existsSync(dir)) {
        return p;
      }
    }

    // 3. Fallback: ensure backend/data exists
    const fallback = path.resolve(process.cwd(), 'backend/data/mock-db-store.json');
    try {
      const dir = path.dirname(fallback);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (_) {}
    return fallback;
  }

  public loadFromDisk(): void {
    try {
      const filePath = this.getStorageFilePath();
      if (!fs.existsSync(filePath)) {
        return;
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (!raw.trim()) {
        return;
      }
      const data = JSON.parse(raw);

      if (Array.isArray(data.colleges)) {
        this.colleges = data.colleges;
      }
      if (Array.isArray(data.courses) && data.courses.length > 0) {
        const seedMap = new Map(this.courses.map((c) => [c.id, c]));
        for (const crs of data.courses) {
          seedMap.set(crs.id, crs);
        }
        this.courses = Array.from(seedMap.values());
      }
      if (Array.isArray(data.students)) {
        this.students = data.students;
      }
      if (Array.isArray(data.faculty)) {
        this.faculty = data.faculty;
      }
      if (Array.isArray(data.proceedings)) {
        this.proceedings = data.proceedings;
      }
      if (Array.isArray(data.demands)) {
        this.demands = data.demands;
      }
      if (Array.isArray(data.payments)) {
        this.payments = data.payments;
      }
      if (Array.isArray(data.workflowQueries)) {
        this.workflowQueries = data.workflowQueries;
      }
      if (Array.isArray(data.notifications)) {
        this.notifications = data.notifications;
      }
      if (Array.isArray(data.lateFeeWaivers)) {
        this.lateFeeWaivers = data.lateFeeWaivers;
      }
      if (Array.isArray(data.auditLogs)) {
        this.auditLogs = data.auditLogs;
      }
      if (Array.isArray(data.users)) {
        const userMap = new Map(this.users.map((u) => [u.id, u]));
        for (const u of data.users) {
          userMap.set(u.id, u);
        }
        this.users = Array.from(userMap.values());
      }

      console.log(
        `[MockDatabase] Restored persistent state from ${filePath}: ${this.colleges.length} colleges, ${this.proceedings.length} proceedings, ${this.courses.length} courses, ${this.demands.length} demands, ${this.students.length} students.`,
      );
    } catch (err) {
      console.warn('[MockDatabase] Error loading persisted data from disk:', (err as Error).message);
    }
  }

  public saveToDisk(): void {
    try {
      const filePath = this.getStorageFilePath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const payload = {
        colleges: this.colleges,
        courses: this.courses,
        students: this.students,
        faculty: this.faculty,
        proceedings: this.proceedings,
        demands: this.demands,
        payments: this.payments,
        workflowQueries: this.workflowQueries,
        auditLogs: this.auditLogs,
        notifications: this.notifications,
        lateFeeWaivers: this.lateFeeWaivers,
        users: this.users,
        savedAt: new Date().toISOString(),
      };

      const tmpPath = `${filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      console.warn('[MockDatabase] Failed to write persistent store to disk:', (err as Error).message);
    }
  }

  public save(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveToDisk();
      this.saveTimer = null;
    }, 50);
    if (this.saveTimer.unref) {
      this.saveTimer.unref();
    }
  }

  private registerExitHooks(): void {
    const interval = setInterval(() => {
      this.saveToDisk();
    }, 2000);
    if (interval.unref) {
      interval.unref();
    }

    process.on('beforeExit', () => {
      this.saveToDisk();
    });
    process.on('SIGINT', () => {
      this.saveToDisk();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      this.saveToDisk();
      process.exit(0);
    });
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

    // 4. Colleges (Empty - add/upload dynamically)
    this.colleges = [];

    // 5. Students (Empty - add/upload dynamically)
    this.students = [];

    // 6. Faculty (Empty - add dynamically)
    this.faculty = [];

    // 7. Proceedings (Empty - draft and issue dynamically)
    this.proceedings = [];

    // 8. Demands (Empty - generate dynamically via pure Fee Engine)
    this.demands = [];

    // 9. Payments (Empty - pay dynamically)
    this.payments = [];

    // 10. Workflow Queries (Empty - submit dynamically)
    this.workflowQueries = [];

    // 11. Notifications (Empty - dispatch dynamically)
    this.notifications = [];

    // 12. Late Fee Waivers & Audit Logs (Empty)
    this.lateFeeWaivers = [];
    this.auditLogs = [];
  }

  public clearAllData(includeCourses: boolean = false) {
    this.colleges = [];
    this.students = [];
    this.faculty = [];
    this.proceedings = [];
    this.demands = [];
    this.payments = [];
    this.workflowQueries = [];
    this.auditLogs = [];
    this.notifications = [];
    this.lateFeeWaivers = [];
    // Keep only University administrative accounts (Super Admin, Dean, Section Officers)
    this.users = this.users.filter((u) => !u.collegeId && u.role !== 'COLLEGE_PRINCIPAL' && u.role !== 'COLLEGE_STAFF');
    if (includeCourses) {
      this.courses = [];
    }
    this.saveToDisk();
  }
}

// Global Singleton for mock database when Postgres is offline
export const mockDb = new MockDatabase();
