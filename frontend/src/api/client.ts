import axios from 'axios';
import {
  College,
  Course,
  Demand,
  Faculty,
  FeeCalculationResult,
  PaymentReceipt,
  Proceeding,
  SeatMatrixItem,
  Student,
  User,
  WorkflowQuery,
} from './types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('aknu_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401s
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Clear token if invalid
      // localStorage.removeItem('aknu_access_token');
    }
    return Promise.reject(error);
  },
);

export const api = {
  // Auth
  auth: {
    login: (data: { identifier?: string; email?: string; password: string }) =>
      apiClient.post<{ accessToken: string; refreshToken: string; user: User; college?: College }>('/auth/login', data),
    sendOtp: (identifier: string, type: 'UNIVERSITY' | 'COLLEGE') =>
      apiClient.post<{ success: boolean; message: string; userName?: string; role?: string }>('/auth/send-otp', {
        identifier,
        type,
      }),
    verifyOtp: (identifier: string, otp: string) =>
      apiClient.post<{ accessToken: string; refreshToken: string; user: User; college?: College }>('/auth/verify-otp', {
        identifier,
        otp,
      }),
    collegeLogin: (data: { identifier: string; password: string }) =>
      apiClient.post<{
        success: boolean;
        mustChangePassword: boolean;
        accessToken?: string;
        refreshToken?: string;
        user?: User;
        college?: College;
        identifier?: string;
        collegeCode?: string;
        collegeName?: string;
        message?: string;
      }>('/auth/college-login', data),
    collegeUpdatePassword: (data: { identifier: string; currentPassword: string; newPassword: string }) =>
      apiClient.post<{
        success: boolean;
        accessToken: string;
        refreshToken: string;
        user: User;
        college: College;
        message: string;
      }>('/auth/college-update-password', data),
    getMe: () => apiClient.get<{ user: User; college?: College }>('/auth/me'),
  },

  // Colleges
  colleges: {
    list: (params?: { search?: string; type?: string; location?: string; district?: string }) =>
      apiClient.get<College[]>('/colleges', { params }),
    getStats: () =>
      apiClient.get<{
        total: number;
        govt: number;
        aided: number;
        unaided: number;
        autonomous: number;
        rural: number;
        urban: number;
      }>('/colleges/stats'),
    getById: (id: string) => apiClient.get<College & { demands: Demand[]; proceedings: Proceeding[]; studentsCount: number }>(`/colleges/${id}`),
    create: (data: Partial<College>) => apiClient.post<College>('/colleges', data),
    update: (id: string, data: Partial<College>) => apiClient.put<College>(`/colleges/${id}`, data),
    delete: (id: string) => apiClient.delete<{ success: boolean; removed: College }>(`/colleges/${id}`),
    bulkUpload: (rows: any[]) =>
      apiClient.post<{
        success: boolean;
        totalReceived: number;
        importedCount: number;
        errorsCount: number;
        imported: College[];
        errors: { row: number; error: string }[];
      }>('/colleges/bulk-upload', { rows }),
    bulkSeatMatrix: (rows: any[]) =>
      apiClient.post<{
        success: boolean;
        totalReceived: number;
        importedCount: number;
        errorsCount: number;
        summary: any[];
        errors: { row: number; error: string }[];
      }>('/colleges/bulk-seat-matrix', { rows }),
    clearAll: (includeCourses?: boolean) =>
      apiClient.post<{ success: boolean; message: string; collegesCount: number; studentsCount: number }>('/colleges/clear-all', { includeCourses }),
  },

  // Courses
  courses: {
    list: (courseGroup?: string) => apiClient.get<Course[]>('/courses', { params: { courseGroup } }),
    getById: (id: string) => apiClient.get<Course>(`/courses/${id}`),
    create: (data: Partial<Course>) => apiClient.post<Course>('/courses', data),
    update: (id: string, data: Partial<Course>) => apiClient.put<Course>(`/courses/${id}`, data),
    delete: (id: string) => apiClient.delete<{ success: boolean; removed: Course }>(`/courses/${id}`),
    bulkUpload: (rows: any[]) =>
      apiClient.post<{
        success: boolean;
        totalReceived: number;
        importedCount: number;
        errorsCount: number;
        imported: Course[];
        errors: { row: number; error: string }[];
      }>('/courses/bulk-upload', { rows }),
  },

  // Proceedings
  proceedings: {
    list: (params?: { collegeId?: string; courseGroupId?: string; status?: string; academicYear?: string }) =>
      apiClient.get<Proceeding[]>('/proceedings', { params }),
    getById: (id: string) => apiClient.get<Proceeding>(`/proceedings/${id}`),
    verifyQr: (qrCode: string) => apiClient.get<any>(`/proceedings/verify/${qrCode}`),
    createDraft: (data: any) => apiClient.post<Proceeding>('/proceedings/draft', data),
    check: (id: string) => apiClient.put<Proceeding>(`/proceedings/${id}/check`),
    sign: (id: string) => apiClient.put<Proceeding>(`/proceedings/${id}/sign`),
    bulkApprove: (ids: string[]) => apiClient.post<{ success: boolean; count: number; proceedings: Proceeding[] }>('/proceedings/bulk-approve', { ids }),
    acknowledge: (id: string) => apiClient.put<Proceeding>(`/proceedings/${id}/acknowledge`),
    bulkUpload: (rows: any[]) =>
      apiClient.post<{
        success: boolean;
        totalReceived: number;
        proceedingsCreated: number;
        errorsCount: number;
        proceedings: Proceeding[];
        errors: { row: number; error: string }[];
      }>('/proceedings/bulk-upload', { rows }),
    uploadPdf: (formData: FormData) =>
      apiClient.post<{
        success: boolean;
        college: { id: string; code: string; name: string };
        fileMeta: { originalFileName: string; storedFileName: string; fileSizeBytes: number; relativeUrl: string };
        parsedData: any;
      }>('/proceedings/upload-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    confirmUpload: (data: any) =>
      apiClient.post<{
        success: boolean;
        message: string;
        proceeding: Proceeding;
        college: any;
      }>('/proceedings/confirm-upload', data),
    getDownloadUrl: (id: string) => `/api/proceedings/${id}/download-pdf`,
  },

  // Students
  students: {
    list: (params?: { collegeId?: string; courseId?: string; yearOfStudy?: number; academicYear?: string; status?: string }) =>
      apiClient.get<Student[]>('/students', { params }),
    getSeatMatrix: (collegeId: string, academicYear?: string) =>
      apiClient.get<SeatMatrixItem[]>(`/students/seat-matrix/${collegeId}`, { params: { academicYear } }),
    createSingle: (data: any) => apiClient.post<Student>('/students/single', data),
    bulkUpload: (collegeId: string, rows: any[], academicYear?: string) =>
      apiClient.post<{ totalProcessed: number; successCount: number; errorCount: number; errorReports: any[]; sampleAdded: Student[] }>('/students/bulk-upload', {
        collegeId,
        rows,
        academicYear,
      }),
    autoPromote: (collegeId: string) => apiClient.post<any>(`/students/auto-promote/${collegeId}`),
    updateStatus: (id: string, status: string) => apiClient.put<Student>(`/students/${id}/status`, { status }),
  },

  // Faculty
  faculty: {
    list: (collegeId?: string) => apiClient.get<Faculty[]>('/faculty', { params: { collegeId } }),
    create: (data: any) => apiClient.post<Faculty>('/faculty', data),
    bulkUpload: (collegeId: string, rows: any[]) => apiClient.post<any>('/faculty/bulk', { collegeId, rows }),
    toggleRatify: (id: string, isRatified: boolean, ratifyYear?: string) =>
      apiClient.put<Faculty>(`/faculty/${id}/ratify`, { isRatified, ratifyYear }),
  },

  // Fees & Demands
  fees: {
    preview: (data: {
      collegeId: string;
      courseGroupId: string;
      academicYear?: string;
      includeInspection?: boolean;
      includeHostel?: boolean;
      previouslyPaidStudentIds?: string[];
    }) => apiClient.post<FeeCalculationResult>('/fees/preview', data),
    generateDemand: (data: {
      collegeId: string;
      courseGroupId: string;
      academicYear?: string;
      dueDate?: string;
      graceDays?: number;
    }) => apiClient.post<Demand>('/fees/generate-demand', data),
    listDemands: (params?: { collegeId?: string; courseGroupId?: string; status?: string; academicYear?: string }) =>
      apiClient.get<Demand[]>('/fees/demands', { params }),
    getDemandById: (id: string) => apiClient.get<Demand>(`/fees/demands/${id}`),
  },

  // Late Fee
  lateFee: {
    calculate: (demandId: string, asOfDate?: string) =>
      apiClient.post<any>('/late-fee/calculate', { demandId, asOfDate }),
    requestWaiver: (data: { demandId: string; requestedWaiverINR: number; reason: string }) =>
      apiClient.post<any>('/late-fee/waiver-request', data),
    listWaivers: () => apiClient.get<any[]>('/late-fee/waivers'),
    reviewWaiver: (id: string, decision: 'APPROVED' | 'REJECTED', approvedPaise?: number) =>
      apiClient.put<any>(`/late-fee/waivers/${id}/review`, { decision, approvedPaise }),
  },

  // Payments
  payments: {
    initiate: (data: {
      collegeId: string;
      gateway: 'SBI_COLLECT' | 'RAZORPAY' | 'MANUAL_CHALLAN';
      allocations: Array<{ demandId: string; amountPaise: number }>;
      idempotencyKey?: string;
    }) => apiClient.post<any>('/payments/initiate', data),
    confirm: (paymentId: string) => apiClient.post<any>('/payments/confirm', { paymentId }),
    getReceipt: (receiptNumber: string) =>
      apiClient.get<PaymentReceipt>(`/payments/receipt/${encodeURIComponent(receiptNumber)}`),
    list: (collegeId?: string) => apiClient.get<any[]>('/payments', { params: { collegeId } }),
    reconcile: () => apiClient.post<any>('/payments/reconcile'),
  },

  // Workflow
  workflow: {
    listQueries: (params?: { collegeId?: string; courseGroupId?: string; status?: string }) =>
      apiClient.get<WorkflowQuery[]>('/workflow/queries', { params }),
    createQuery: (data: any) => apiClient.post<WorkflowQuery>('/workflow/queries', data),
    respondQuery: (id: string, responseText: string) =>
      apiClient.put<WorkflowQuery>(`/workflow/queries/${id}/respond`, { responseText }),
    getAuditLogs: (limit?: number) => apiClient.get<any[]>('/workflow/audit-logs', { params: { limit } }),
  },

  // Reports
  reports: {
    getCollectionStatus: (academicYear?: string) =>
      apiClient.get<any>('/reports/collection-status', { params: { academicYear } }),
    getDefaulters: (academicYear?: string) =>
      apiClient.get<any[]>('/reports/defaulters', { params: { academicYear } }),
    getHeadWise: (academicYear?: string) =>
      apiClient.get<any[]>('/reports/head-wise', { params: { academicYear } }),
    getAishe: (academicYear?: string) =>
      apiClient.get<any>('/reports/aishe-enrolment', { params: { academicYear } }),
  },

  // Notifications
  notifications: {
    list: (collegeId?: string) => apiClient.get<any[]>('/notifications', { params: { collegeId } }),
    sendBulkReminders: (collegeIds: string[], message?: string) =>
      apiClient.post<any>('/notifications/send-bulk-reminders', { collegeIds, message }),
  },
};
