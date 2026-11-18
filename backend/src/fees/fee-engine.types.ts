export type CourseGroupType =
  | 'UG'
  | 'PG'
  | 'MBA_MCA'
  | 'LAW'
  | 'EDUCATION'
  | 'PHYSICAL_EDUCATION'
  | 'ALL';

export type CollegeType = 'GOVERNMENT' | 'AIDED' | 'UNAIDED' | string;
export type CollegeLocation = 'RURAL' | 'URBAN' | string;
export type AdmissionQuota = 'CONVENOR' | 'SPOT' | 'MANAGEMENT';
export type StudentStatus = 'ACTIVE' | 'PROMOTED' | 'DETAINED' | 'LEFT' | 'DISCONTINUED';

export interface CollegeFeeContext {
  collegeId: string;
  collegeCode: string;
  collegeName: string;
  type: CollegeType;
  isAutonomous: boolean;
  location: CollegeLocation;
  hasHostel: boolean;
}

export interface StudentFeeRecord {
  id: string;
  admissionNo: string;
  name?: string;
  yearOfStudy: number; // 1, 2, 3, 4, 5
  quota: AdmissionQuota;
  status: StudentStatus;
  apaarId?: string;
}

export interface CourseStudentData {
  courseId: string;
  courseCode: string; // e.g. "B.Sc-MPC", "B.A", "M.Sc-CS", "LL.B", "B.Ed"
  courseName: string;
  courseGroup: CourseGroupType;
  durationYears: number;
  degreeLevel: string;
  isComputer: boolean;
  sectionsCount?: number;
  students: StudentFeeRecord[];
}

export interface FeeCalculationOptions {
  academicYear: string; // "2026-27"
  includeInspection?: boolean;
  includeHostel?: boolean;
  unratifiedFacultyCount?: number;
  previouslyPaidStudentIds?: string[];
}

export interface FeeBreakdownItem {
  id: string;
  category: 'INSTITUTIONAL' | 'AFFILIATION' | 'SECTION' | 'STUDENT_TUITION' | 'MANAGEMENT_QUOTA' | 'FACULTY_RATIFICATION' | 'HOSTEL';
  head: string;
  description: string;
  unitCount: number;
  ratePaise: number;
  amountPaise: number;
  studentIds?: string[];
  courseId?: string;
}

export interface FeeCalculationResult {
  academicYear: string;
  collegeId: string;
  courseGroup: CourseGroupType;
  totalPaise: number;
  totalINR: number;
  totalActiveStudents: number;
  newAdmissionsCount: number;
  breakdown: FeeBreakdownItem[];
  studentFeeMap: Record<string, { amountPaise: number; heads: string[] }>;
  summaryByHead: Record<string, number>;
}
