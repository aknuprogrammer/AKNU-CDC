export type Role =
  | 'SUPER_ADMIN'
  | 'DEAN_CDC'
  | 'FINANCE_OFFICER'
  | 'REGISTRAR'
  | 'VICE_CHANCELLOR'
  | 'SECTION_OFFICER'
  | 'SUPERINTENDENT'
  | 'CLERK'
  | 'COLLEGE_PRINCIPAL'
  | 'COLLEGE_STAFF';

export type CourseGroup =
  | 'UG'
  | 'PG'
  | 'MBA_MCA'
  | 'LAW'
  | 'EDUCATION'
  | 'PHYSICAL_EDUCATION'
  | 'ALL';

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: Role;
  courseSection: CourseGroup;
  collegeId?: string;
  isActive: boolean;
}

export interface College {
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
  studentsCount?: number;
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
  courses?: Course[];
  tempPassword?: string;
  mustChangePassword?: boolean;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  stream?: string;
  courseGroup: CourseGroup | string;
  degreeType?: string;
  branch?: string;
  durationYears: number;
  degreeLevel: string;
  isComputer: boolean;
  defaultIntake?: number;
  sanctionedIntake?: number;
  convenorQuota?: number;
  managementQuota?: number;
  active: boolean;
}

export interface ProceedingItem {
  courseName: string;
  sanctionedIntake: number;
  convenorQuota: number;
  spotAdmission: number;
  managementQuota: number;
}

export interface Proceeding {
  id: string;
  proceedingNumber: string;
  academicYear: string;
  collegeId: string;
  collegeName?: string;
  collegeCode?: string;
  courseGroupId: CourseGroup;
  templateType: 'AFFILIATION' | 'INTAKE_SANCTION' | 'CORRIGENDUM' | 'SUPPLEMENTARY' | 'FEE_NOTICE' | 'CIRCULAR';
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
  items: ProceedingItem[];
}

export interface Student {
  id: string;
  collegeId: string;
  collegeName?: string;
  courseId: string;
  courseName?: string;
  courseCode?: string;
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

export interface Faculty {
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

export interface FeeBreakdownItem {
  id: string;
  category: string;
  head: string;
  description: string;
  unitCount: number;
  ratePaise: number;
  amountPaise: number;
  studentIds?: string[];
}

export interface FeeCalculationResult {
  academicYear: string;
  collegeId: string;
  courseGroup: CourseGroup;
  totalPaise: number;
  totalINR: number;
  totalActiveStudents: number;
  newAdmissionsCount: number;
  breakdown: FeeBreakdownItem[];
  studentFeeMap: Record<string, { amountPaise: number; heads: string[] }>;
  summaryByHead: Record<string, number>;
}

export interface Demand {
  id: string;
  demandNumber: string;
  collegeId: string;
  collegeName?: string;
  collegeCode?: string;
  courseGroupId: CourseGroup;
  academicYear: string;
  demandType: 'REGULAR' | 'SUPPLEMENTARY' | 'REVISED';
  totalPaise: number;
  totalINR: number;
  paidPaise: number;
  paidINR: number;
  balancePaise: number;
  balanceINR: number;
  lateFeePaise: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'WAIVED';
  dueDate: string;
  graceDays: number;
  isLocked: boolean;
  breakdown: FeeBreakdownItem[];
  createdAt: string;
}

export interface PaymentReceipt {
  receiptNumber: string;
  universityName: string;
  councilName: string;
  collegeCode?: string;
  collegeName?: string;
  collegeAddress?: string;
  collegeDistrict?: string;
  totalAmountPaise: number;
  totalINR: number;
  gateway: string;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  paidAt: string;
  qrReceiptCode: string;
  allocatedDemands: Array<{
    demandNumber?: string;
    courseGroup?: string;
    academicYear?: string;
    allocatedPaise: number;
    allocatedINR: number;
  }>;
  status: string;
}

export interface WorkflowQuery {
  id: string;
  collegeId: string;
  collegeName?: string;
  courseGroupId: CourseGroup;
  demandId?: string;
  proceedingId?: string;
  stage: 'CLERK' | 'SUPERINTENDENT' | 'DEAN' | 'COLLEGE';
  fromUserId: string;
  fromUserName?: string;
  toUserId?: string;
  subject: string;
  queryText: string;
  responseText?: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedAt?: string;
  createdAt: string;
}

export interface SeatMatrixItem {
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
}
