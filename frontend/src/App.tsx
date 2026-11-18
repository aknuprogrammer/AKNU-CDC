import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { UniversityLayout } from './layouts/UniversityLayout';
import { CollegeLayout } from './layouts/CollegeLayout';

import { LoginPage } from './pages/LoginPage';
import { QrVerificationPage } from './pages/QrVerificationPage';

import { UniversityDashboard } from './pages/university/UniversityDashboard';
import { CollegesMasterPage } from './pages/university/CollegesMasterPage';
import { CoursesMasterPage } from './pages/university/CoursesMasterPage';
import { ProceedingsWorkflowPage } from './pages/university/ProceedingsWorkflowPage';
import { StudentVerificationPage } from './pages/university/StudentVerificationPage';
import { FeeEnginePage } from './pages/university/FeeEnginePage';
import { LateFeeWaiverPage } from './pages/university/LateFeeWaiverPage';
import { FinanceReconciliationPage } from './pages/university/FinanceReconciliationPage';
import { WorkflowQueriesPage } from './pages/university/WorkflowQueriesPage';
import { AisheReportsPage } from './pages/university/AisheReportsPage';

import { CollegeDashboard } from './pages/college/CollegeDashboard';
import { CollegeProceedingsPage } from './pages/college/CollegeProceedingsPage';
import { CollegeSeatMatrixPage } from './pages/college/CollegeSeatMatrixPage';
import { CollegeStudentsPage } from './pages/college/CollegeStudentsPage';
import { CollegeFacultyPage } from './pages/college/CollegeFacultyPage';
import { CollegeFeesPaymentPage } from './pages/college/CollegeFeesPaymentPage';
import { CollegeQueriesPage } from './pages/college/CollegeQueriesPage';
import { CollegeCourseDetailPage } from './pages/college/CollegeCourseDetailPage';
import { CollegeReportsPage } from './pages/college/CollegeReportsPage';
import { CollegeStreamFeePage } from './pages/college/CollegeStreamFeePage';

export const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#002147', // AKNU Royal Navy
          colorSuccess: '#52c41a',
          colorWarning: '#D4AF37', // AKNU Warm Gold
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          borderRadius: 6,
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify-proceeding" element={<QrVerificationPage />} />

            {/* University CDC Routes */}
            <Route path="/university" element={<UniversityLayout />}>
              <Route index element={<Navigate to="/university/dashboard" replace />} />
              <Route path="dashboard" element={<UniversityDashboard />} />
              <Route path="colleges" element={<CollegesMasterPage />} />
              <Route path="courses" element={<Navigate to="/university/colleges" replace />} />
              <Route path="proceedings" element={<ProceedingsWorkflowPage />} />
              <Route path="students" element={<StudentVerificationPage />} />
              <Route path="fee-engine" element={<FeeEnginePage />} />
              <Route path="late-fee" element={<LateFeeWaiverPage />} />
              <Route path="finance" element={<FinanceReconciliationPage />} />
              <Route path="workflow" element={<WorkflowQueriesPage />} />
              <Route path="reports" element={<AisheReportsPage />} />
            </Route>

            {/* Affiliated College Portal Routes */}
            <Route path="/college" element={<CollegeLayout />}>
              <Route index element={<Navigate to="/college/dashboard" replace />} />
              <Route path="dashboard" element={<CollegeDashboard />} />
              <Route path="proceedings" element={<CollegeProceedingsPage />} />
              <Route path="seat-matrix" element={<CollegeSeatMatrixPage />} />
              <Route path="students" element={<CollegeStudentsPage />} />
              <Route path="faculty" element={<CollegeFacultyPage />} />
              <Route path="fees" element={<CollegeFeesPaymentPage />} />
              <Route path="stream/:streamId" element={<CollegeStreamFeePage />} />
              <Route path="stream/:streamId/:tab" element={<CollegeStreamFeePage />} />
              <Route path="queries" element={<CollegeQueriesPage />} />
              <Route path="course/:courseCode" element={<CollegeCourseDetailPage />} />
              <Route path="reports" element={<CollegeReportsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/university/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
