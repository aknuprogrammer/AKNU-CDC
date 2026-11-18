import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Modal,
  Alert,
  Divider,
  Typography,
  message,
  Tabs,
  Input,
  InputNumber,
  Radio,
  Upload,
  Descriptions,
  Badge,
  Tooltip,
} from 'antd';
import {
  DollarOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  PrinterOutlined,
  BankOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  BookOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import * as XLSX from 'xlsx';

const { Title, Text, Paragraph } = Typography;

// Stream Metadata & Color Palette
export const STREAM_CONFIG: Record<
  string,
  {
    title: string;
    shortName: string;
    color: string;
    icon: string;
    defaultDuration: number;
    year1Rate: number;
    yearOtherRate: number;
    mqRate?: number;
  }
> = {
  UG: {
    title: 'Undergraduate (UG) Programs',
    shortName: 'UG',
    color: 'blue',
    icon: '📘',
    defaultDuration: 3,
    year1Rate: 560,
    yearOtherRate: 340,
  },
  PG: {
    title: 'Postgraduate (PG) Programs',
    shortName: 'PG',
    color: 'green',
    icon: '🔬',
    defaultDuration: 2,
    year1Rate: 1300,
    yearOtherRate: 1300,
    mqRate: 3300,
  },
  MBA_MCA: {
    title: 'Professional (MBA & MCA) Department',
    shortName: 'MBA / MCA',
    color: 'purple',
    icon: '💼',
    defaultDuration: 2,
    year1Rate: 1960,
    yearOtherRate: 1960,
    mqRate: 3300,
  },
  LAW: {
    title: 'Legal Studies (LL.B & LL.M) Department',
    shortName: 'LAW',
    color: 'volcano',
    icon: '⚖️',
    defaultDuration: 3,
    year1Rate: 920,
    yearOtherRate: 820,
  },
  EDUCATION: {
    title: 'Education (B.Ed / M.Ed / B.P.Ed)',
    shortName: 'EDUCATION',
    color: 'cyan',
    icon: '🎓',
    defaultDuration: 2,
    year1Rate: 1660,
    yearOtherRate: 560,
  },
};

export const CollegeStreamFeePage: React.FC = () => {
  const { streamId = 'UG', tab = 'admissions' } = useParams<{ streamId: string; tab?: string }>();
  const { college } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>(tab);
  const [collegeData, setCollegeData] = useState<any>(college);
  const [loading, setLoading] = useState(false);

  // Active Stream Definition
  const streamKey = (streamId || 'UG').toUpperCase();
  const streamInfo = STREAM_CONFIG[streamKey] || {
    title: `${streamKey} Programs`,
    shortName: streamKey,
    color: 'geekblue',
    icon: '📚',
    defaultDuration: 3,
    year1Rate: 560,
    yearOtherRate: 340,
  };

  // Synchronize Tab with URL
  useEffect(() => {
    if (tab && ['admissions', 'payment', 'annexure'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [tab]);

  // Load Fresh College Data & Courses
  useEffect(() => {
    if (college?.id) {
      setLoading(true);
      api.colleges
        .getById(college.id)
        .then((res) => {
          setCollegeData(res.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [college?.id]);

  // Filter Courses belonging strictly to this stream
  const streamCourses = useMemo(() => {
    const list = collegeData?.courses || college?.courses || [];
    return list.filter((c: any) => {
      const grp = (c.course?.courseGroup || c.courseGroup || c.stream || 'UG').toUpperCase();
      if (streamKey === 'MBA_MCA') {
        return grp === 'MBA_MCA' || grp === 'MBA' || grp === 'MCA';
      }
      return grp === streamKey;
    });
  }, [collegeData, college, streamKey]);

  // ==========================================
  // ADMISSION MATRIX STATE
  // Stored locally & persisted per (collegeId, streamKey)
  // ==========================================
  interface AdmissionRow {
    courseId: string;
    courseCode: string;
    courseName: string;
    yearOfStudy: number;
    sanctionedIntake: number;
    convenorQuota: number;
    spotAdmission: number;
    managementQuota: number;
    droppedCount: number;
    detainedCount: number;
    // Categories
    scM: number;
    scF: number;
    stM: number;
    stF: number;
    bcM: number;
    bcF: number;
    ocM: number;
    ocF: number;
    phM: number;
    phF: number;
    minorityM: number;
    minorityF: number;
  }

  const storageKey = `aknu_admissions_${college?.code || '001'}_${streamKey}_2025-26`;
  const paymentStorageKey = `aknu_payment_${college?.code || '001'}_${streamKey}_2025-26`;

  const [admissionRows, setAdmissionRows] = useState<AdmissionRow[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Initialize Admission Rows if empty
  useEffect(() => {
    if (streamCourses.length > 0 && admissionRows.length === 0) {
      const initRows: AdmissionRow[] = [];
      streamCourses.forEach((c: any) => {
        const duration = c.durationYears || c.course?.durationYears || streamInfo.defaultDuration;
        const intake = c.sanctionedIntake || c.defaultIntake || 60;
        const cq = c.convenorQuota || Math.round(intake * 0.7);
        const mq = c.managementQuota || Math.round(intake * 0.3);

        for (let yr = 1; yr <= duration; yr++) {
          // Pre-populate sensible historic attrition for Y2/Y3
          const isY1 = yr === 1;
          const drop = isY1 ? 0 : Math.floor(Math.random() * 3);
          const det = isY1 ? 0 : Math.floor(Math.random() * 2);

          initRows.push({
            courseId: c.id,
            courseCode: c.code || c.course?.code || 'CRS',
            courseName: c.name || c.course?.name || 'Academic Course',
            yearOfStudy: yr,
            sanctionedIntake: intake,
            convenorQuota: Math.max(0, cq - drop),
            spotAdmission: isY1 ? 2 : 0,
            managementQuota: mq,
            droppedCount: drop,
            detainedCount: det,
            scM: 5,
            scF: 6,
            stM: 2,
            stF: 2,
            bcM: 15,
            bcF: 16,
            ocM: 6,
            ocF: 8,
            phM: 0,
            phF: 0,
            minorityM: 1,
            minorityF: 1,
          });
        }
      });
      setAdmissionRows(initRows);
    }
  }, [streamCourses, streamInfo.defaultDuration]);

  // Update a single cell in admission matrix
  const handleCellChange = (index: number, field: keyof AdmissionRow, val: number) => {
    setAdmissionRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: Math.max(0, Number(val) || 0) };
      return next;
    });
  };

  const handleSaveAdmissions = () => {
    localStorage.setItem(storageKey, JSON.stringify(admissionRows));
    message.success(`Admitted Student Return for ${streamInfo.title} saved successfully!`);
    setActiveTab('payment');
  };

  // ==========================================
  // BULK EXCEL DOWNLOAD & UPLOAD
  // ==========================================
  const handleDownloadExcelTemplate = () => {
    const templateData = admissionRows.map((r) => {
      const total = r.convenorQuota + r.spotAdmission + r.managementQuota;
      return {
        'Course Code': r.courseCode,
        'Program Title': r.courseName,
        'Year of Study': `Year ${r.yearOfStudy}`,
        'Sanctioned Intake': r.sanctionedIntake,
        'Convenor Quota (CQ)': r.convenorQuota,
        'Spot Admission (SA)': r.spotAdmission,
        'Management Quota (MQ)': r.managementQuota,
        'Total Admitted': total,
        'Dropouts / TC Taken': r.droppedCount,
        'Detained (Attendance/Credits)': r.detainedCount,
        'Active Continuing Students': total - (r.droppedCount + r.detainedCount),
        'SC (M)': r.scM,
        'SC (F)': r.scF,
        'ST (M)': r.stM,
        'ST (F)': r.stF,
        'BC (M)': r.bcM,
        'BC (F)': r.bcF,
        'OC (M)': r.ocM,
        'OC (F)': r.ocF,
        'Minority (M)': r.minorityM,
        'Minority (F)': r.minorityF,
      };
    });

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${streamKey}_Admissions`);
    XLSX.writeFile(wb, `${college?.code || 'College'}_${streamKey}_Admissions_AY2025-26.xlsx`);
    message.success(`Downloaded official Excel template for ${streamKey}!`);
  };

  const handleUploadExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          message.error('Excel file is empty or formatted incorrectly.');
          return;
        }

        setAdmissionRows((prev) => {
          return prev.map((row) => {
            const match = json.find(
              (j) =>
                j['Course Code'] === row.courseCode &&
                String(j['Year of Study']).includes(String(row.yearOfStudy)),
            );
            if (!match) return row;
            return {
              ...row,
              convenorQuota: Number(match['Convenor Quota (CQ)']) || row.convenorQuota,
              spotAdmission: Number(match['Spot Admission (SA)']) || row.spotAdmission,
              managementQuota: Number(match['Management Quota (MQ)']) || row.managementQuota,
              droppedCount: Number(match['Dropouts / TC Taken']) || row.droppedCount,
              detainedCount: Number(match['Detained (Attendance/Credits)']) || row.detainedCount,
              scM: Number(match['SC (M)']) || row.scM,
              scF: Number(match['SC (F)']) || row.scF,
              stM: Number(match['ST (M)']) || row.stM,
              stF: Number(match['ST (F)']) || row.stF,
              bcM: Number(match['BC (M)']) || row.bcM,
              bcF: Number(match['BC (F)']) || row.bcF,
              ocM: Number(match['OC (M)']) || row.ocM,
              ocF: Number(match['OC (F)']) || row.ocF,
            };
          });
        });
        message.success(`Successfully imported admissions from Excel for ${json.length} rows!`);
      } catch (err) {
        message.error('Failed to parse Excel file. Please use the official template.');
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // Prevent automatic HTTP post
  };

  // ==========================================
  // REAL-TIME AUTO FEE ENGINE CALCULATION
  // Replicating official university annexures
  // ==========================================
  const feeCalculation = useMemo(() => {
    // 1. Total counts across years
    const year1Rows = admissionRows.filter((r) => r.yearOfStudy === 1);
    const yearOtherRows = admissionRows.filter((r) => r.yearOfStudy > 1);

    const year1Admitted = year1Rows.reduce(
      (sum, r) => sum + r.convenorQuota + r.spotAdmission + r.managementQuota,
      0,
    );
    const year1MQ = year1Rows.reduce((sum, r) => sum + r.managementQuota, 0);

    const yearOtherActive = yearOtherRows.reduce((sum, r) => {
      const enrolled = r.convenorQuota + r.spotAdmission + r.managementQuota;
      return sum + Math.max(0, enrolled - (r.droppedCount + r.detainedCount));
    }, 0);

    const totalActiveStrength = year1Admitted + yearOtherActive;

    // Total sanctioned intake across stream
    const totalIntake = streamCourses.reduce((sum: number, c: any) => sum + (c.sanctionedIntake || 60), 0);

    // Fixed institutional fees
    const inspectionFee = 8000;
    const sportsFee = 1600;

    // 2. Stream-Specific Annual Affiliation Fee (Tiered Slabs)
    let affiliationFee = 0;
    let slabTitle = '';

    if (streamKey === 'UG') {
      // UG based on 3-yr total strength
      if (totalActiveStrength <= 300) {
        affiliationFee = 5500;
        slabTitle = 'Below 300 Enrolled Students (₹5,500)';
      } else if (totalActiveStrength <= 600) {
        affiliationFee = 8000;
        slabTitle = '301 - 600 Enrolled Students (₹8,000)';
      } else if (totalActiveStrength <= 1200) {
        affiliationFee = 16500;
        slabTitle = '601 - 1200 Enrolled Students (₹16,500)';
      } else if (totalActiveStrength <= 1800) {
        affiliationFee = 24500;
        slabTitle = '1201 - 1800 Enrolled Students (₹24,500)';
      } else {
        affiliationFee = 27500;
        slabTitle = '1801 and Above Enrolled Students (₹27,500)';
      }
    } else if (streamKey === 'PG') {
      // PG based on Intake Strength
      if (totalIntake <= 30) {
        affiliationFee = 36500;
        slabTitle = 'Up to 30 Intake (₹36,500)';
      } else if (totalIntake <= 60) {
        affiliationFee = 72500;
        slabTitle = '31 - 60 Intake (₹72,500)';
      } else if (totalIntake <= 120) {
        affiliationFee = 144000;
        slabTitle = '61 - 120 Intake (₹1,44,000)';
      } else {
        affiliationFee = 217500;
        slabTitle = '121 - 180 Intake (₹2,17,500)';
      }
    } else if (streamKey === 'MBA_MCA') {
      // Professional based on Intake
      if (totalIntake <= 60) {
        affiliationFee = 22000;
        slabTitle = 'Up to 60 Intake (₹22,000)';
      } else if (totalIntake <= 120) {
        affiliationFee = 27500;
        slabTitle = '61 - 120 Intake (₹27,500)';
      } else {
        affiliationFee = 33000;
        slabTitle = '121 and Above Intake (₹33,000)';
      }
    } else if (streamKey === 'EDUCATION') {
      if (totalIntake <= 100) {
        affiliationFee = 22000;
        slabTitle = 'Below 100 Intake (₹22,000)';
      } else if (totalIntake <= 150) {
        affiliationFee = 27500;
        slabTitle = '101 - 150 Intake (₹27,500)';
      } else {
        affiliationFee = 33000;
        slabTitle = '151 and Above Intake (₹33,000)';
      }
    } else if (streamKey === 'LAW') {
      affiliationFee = 3500;
      slabTitle = 'Law College Annual Affiliation (₹3,500)';
    } else {
      affiliationFee = 8000;
      slabTitle = 'Standard College Affiliation (₹8,000)';
    }

    // 3. Per-student variable fees
    const year1Rate = streamInfo.year1Rate;
    const yearOtherRate = streamInfo.yearOtherRate;
    const year1Total = year1Admitted * year1Rate;
    const yearOtherTotal = yearOtherActive * yearOtherRate;

    // 4. Management Quota Special Fee
    const mqRate = streamInfo.mqRate || 0;
    const mqTotal = year1MQ * mqRate;

    // 5. Computer Course Sections (UG specific)
    const computerSectionsCount = streamCourses.filter((c: any) => c.isComputer).length;
    const computerCourseFee = streamKey === 'UG' ? computerSectionsCount * 3300 : 0;

    // 6. Hostel Recognition (if college has attached hostel)
    const hasHostel = !!collegeData?.hasHostel;
    const isUrban = collegeData?.location === 'URBAN';
    const hostelInspection = hasHostel ? 5000 : 0;
    const hostelRecognition = hasHostel ? (isUrban ? 11000 : 5500) : 0;

    // 7. Staff Ratification (Education specific)
    const staffRatification = streamKey === 'EDUCATION' ? 22000 : 0;

    // Grand Total
    const grandTotal =
      inspectionFee +
      sportsFee +
      affiliationFee +
      year1Total +
      yearOtherTotal +
      mqTotal +
      computerCourseFee +
      hostelInspection +
      hostelRecognition +
      staffRatification;

    return {
      totalIntake,
      totalActiveStrength,
      year1Admitted,
      year1Rate,
      year1Total,
      yearOtherActive,
      yearOtherRate,
      yearOtherTotal,
      year1MQ,
      mqRate,
      mqTotal,
      inspectionFee,
      sportsFee,
      affiliationFee,
      slabTitle,
      computerSectionsCount,
      computerCourseFee,
      hasHostel,
      hostelInspection,
      hostelRecognition,
      staffRatification,
      grandTotal,
    };
  }, [admissionRows, streamCourses, streamKey, streamInfo, collegeData]);

  // ==========================================
  // PAYMENT SUBMISSION STATE
  // ==========================================
  interface PaymentRecord {
    paymentMode: 'ONLINE' | 'DD_CHALLAN';
    ddNumber: string;
    bankName: string;
    ddDate: string;
    amountPaid: number;
    receiptUrl?: string;
    submittedAt: string;
    status: 'SUBMITTED' | 'VERIFIED' | 'RECONCILED';
  }

  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(() => {
    try {
      const saved = localStorage.getItem(paymentStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [paymentMode, setPaymentMode] = useState<'ONLINE' | 'DD_CHALLAN'>('DD_CHALLAN');
  const [ddNumber, setDdNumber] = useState('');
  const [bankName, setBankName] = useState('Union Bank of India, Kakinada Main');
  const [ddDate, setDdDate] = useState('2026-10-22');
  const [amountPaid, setAmountPaid] = useState<number>(feeCalculation.grandTotal);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    if (!paymentRecord) {
      setAmountPaid(feeCalculation.grandTotal);
    }
  }, [feeCalculation.grandTotal, paymentRecord]);

  const handleSubmitPayment = () => {
    if (paymentMode === 'DD_CHALLAN' && !ddNumber.trim()) {
      message.error('Please enter the Demand Draft (DD) or UTR Number.');
      return;
    }

    setSubmittingPayment(true);
    setTimeout(() => {
      const rec: PaymentRecord = {
        paymentMode,
        ddNumber: paymentMode === 'ONLINE' ? `TXN-ONL-${Date.now().toString().slice(-6)}` : ddNumber.trim(),
        bankName: paymentMode === 'ONLINE' ? 'SBI e-Pay Portal' : bankName.trim(),
        ddDate,
        amountPaid: amountPaid || feeCalculation.grandTotal,
        submittedAt: new Date().toISOString(),
        status: paymentMode === 'ONLINE' ? 'VERIFIED' : 'SUBMITTED',
      };
      setPaymentRecord(rec);
      localStorage.setItem(paymentStorageKey, JSON.stringify(rec));
      setSubmittingPayment(false);
      message.success(
        paymentMode === 'ONLINE'
          ? 'Online payment verified successfully!'
          : 'Demand Draft details submitted to University CDC accounts for verification!',
      );
      setActiveTab('annexure');
    }, 800);
  };

  // ==========================================
  // RENDER COLUMNS FOR ADMISSION RETURN
  // ==========================================
  const admissionColumns = [
    {
      title: 'Course & Branch',
      key: 'course',
      width: 220,
      render: (_: any, r: AdmissionRow) => (
        <div>
          <Tag color="geekblue" style={{ fontWeight: 700, margin: 0 }}>
            {r.courseCode}
          </Tag>
          <div style={{ fontSize: '12px', fontWeight: 600, marginTop: 2 }}>{r.courseName}</div>
        </div>
      ),
    },
    {
      title: 'Year of Study',
      key: 'year',
      width: 110,
      render: (_: any, r: AdmissionRow) => (
        <Tag color={r.yearOfStudy === 1 ? 'green' : 'default'} style={{ fontWeight: 700 }}>
          Year {r.yearOfStudy}
        </Tag>
      ),
    },
    {
      title: 'Intake Cap',
      key: 'intake',
      width: 90,
      render: (_: any, r: AdmissionRow) => (
        <span style={{ fontWeight: 700, color: '#002147' }}>{r.sanctionedIntake}</span>
      ),
    },
    {
      title: 'C.Q (Convenor)',
      key: 'cq',
      width: 100,
      render: (_: any, r: AdmissionRow, idx: number) => (
        <InputNumber
          min={0}
          max={r.sanctionedIntake}
          size="small"
          value={r.convenorQuota}
          onChange={(val) => handleCellChange(idx, 'convenorQuota', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'S.A (Spot)',
      key: 'sa',
      width: 90,
      render: (_: any, r: AdmissionRow, idx: number) => (
        <InputNumber
          min={0}
          max={r.sanctionedIntake}
          size="small"
          value={r.spotAdmission}
          onChange={(val) => handleCellChange(idx, 'spotAdmission', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'M.Q (Management)',
      key: 'mq',
      width: 100,
      render: (_: any, r: AdmissionRow, idx: number) => (
        <InputNumber
          min={0}
          max={r.sanctionedIntake}
          size="small"
          value={r.managementQuota}
          onChange={(val) => handleCellChange(idx, 'managementQuota', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Total Admitted',
      key: 'total',
      width: 110,
      render: (_: any, r: AdmissionRow) => {
        const total = r.convenorQuota + r.spotAdmission + r.managementQuota;
        const isOver = total > r.sanctionedIntake;
        return (
          <span style={{ fontWeight: 800, color: isOver ? '#cf1322' : '#389e0d' }}>
            {total} / {r.sanctionedIntake} {isOver && '⚠️ Exceeded!'}
          </span>
        );
      },
    },
    {
      title: 'Dropped / TC',
      key: 'dropped',
      width: 100,
      render: (_: any, r: AdmissionRow, idx: number) => (
        <InputNumber
          min={0}
          size="small"
          value={r.droppedCount}
          onChange={(val) => handleCellChange(idx, 'droppedCount', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Detained',
      key: 'detained',
      width: 90,
      render: (_: any, r: AdmissionRow, idx: number) => (
        <InputNumber
          min={0}
          size="small"
          value={r.detainedCount}
          onChange={(val) => handleCellChange(idx, 'detainedCount', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Active Continuing',
      key: 'active',
      width: 120,
      render: (_: any, r: AdmissionRow) => {
        const total = r.convenorQuota + r.spotAdmission + r.managementQuota;
        const active = Math.max(0, total - (r.droppedCount + r.detainedCount));
        return (
          <Tag color="cyan" style={{ fontWeight: 800 }}>
            {active} Students
          </Tag>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '4px 0 24px' }}>
      {/* Stream Header Banner */}
      <Card
        style={{
          borderRadius: 8,
          marginBottom: 16,
          background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
          border: 'none',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Space size="middle">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              {streamInfo.icon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={4} style={{ color: '#fff', margin: 0 }}>
                  {streamInfo.title}
                </Title>
                <Tag color={streamInfo.color} style={{ fontWeight: 800 }}>
                  {streamKey}
                </Tag>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: 3 }}>
                Affiliation Fee & Student Return Portal • AY 2025–26 • College Code: {college?.code || '001'}
              </div>
            </div>
          </Space>

          <Space size="middle" wrap>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Stream Sanctioned Intake</span>}
              value={feeCalculation.totalIntake}
              suffix="Seats"
              valueStyle={{ color: '#f1c40f', fontWeight: 800, fontSize: '18px' }}
            />
            <Divider type="vertical" style={{ height: 35, borderColor: 'rgba(255,255,255,0.2)' }} />
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Active Enrolled Students</span>}
              value={feeCalculation.totalActiveStrength}
              suffix="Students"
              valueStyle={{ color: '#2ecc71', fontWeight: 800, fontSize: '18px' }}
            />
            <Divider type="vertical" style={{ height: 35, borderColor: 'rgba(255,255,255,0.2)' }} />
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Total Amount Payable</span>}
              value={feeCalculation.grandTotal}
              prefix="₹"
              valueStyle={{ color: '#ffffff', fontWeight: 800, fontSize: '20px' }}
            />
          </Space>
        </div>
      </Card>

      {/* Main Tabs Flow */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => {
          setActiveTab(k);
          navigate(`/college/stream/${streamKey}/${k}`, { replace: true });
        }}
        type="card"
        style={{ background: '#fff', borderRadius: 8, padding: '10px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        items={[
          {
            key: 'admissions',
            label: (
              <span>
                <FileExcelOutlined /> Step 1: Student Admitted Strength (Excel / Form)
              </span>
            ),
            children: (
              <div>
                {/* Action Bar for Excel */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    marginBottom: 14,
                  }}
                >
                  <Space size="middle" wrap>
                    <Text strong style={{ color: '#002147' }}>
                      📋 Admitted Student Quota & Category Return:
                    </Text>
                    <Tag color="blue">Academic Year: 2025–26</Tag>
                    <Tag color="cyan">
                      Strict Intake Cap: Total CQ + SA + MQ cannot exceed Approved Intake
                    </Tag>
                  </Space>

                  <Space size="small" wrap>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadExcelTemplate}
                      style={{ fontSize: '12px' }}
                    >
                      Download Excel Template
                    </Button>
                    <Upload
                      accept=".xlsx, .xls"
                      showUploadList={false}
                      beforeUpload={handleUploadExcel}
                    >
                      <Button type="primary" icon={<UploadOutlined />} style={{ background: '#002147', fontSize: '12px' }}>
                        Upload Filled Excel
                      </Button>
                    </Upload>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSaveAdmissions}
                      style={{ background: '#27ae60', fontSize: '12px' }}
                    >
                      Save & Calculate Fee
                    </Button>
                  </Space>
                </div>

                {/* Admission Matrix Table */}
                <Table
                  dataSource={admissionRows}
                  columns={admissionColumns}
                  rowKey={(r) => `${r.courseCode}-${r.yearOfStudy}`}
                  pagination={false}
                  size="small"
                  bordered
                  style={{ marginBottom: 16 }}
                />

                <Alert
                  type="info"
                  showIcon
                  message="Automated Promotion & Attrition Adjustment"
                  description="Year 1 students are newly admitted. Continuing students in Year 2, 3, and 4 automatically reflect dropouts, TCs, and detentions so the college is only billed for active, enrolled students."
                  style={{ fontSize: '12px', marginBottom: 14 }}
                />

                <div style={{ textAlign: 'right' }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<DollarOutlined />}
                    onClick={handleSaveAdmissions}
                    style={{ background: '#002147', padding: '0 24px', fontWeight: 700 }}
                  >
                    Proceed to Step 2: Auto-Fee Statement & Payment ➔
                  </Button>
                </div>
              </div>
            ),
          },
          {
            key: 'payment',
            label: (
              <span>
                <DollarOutlined /> Step 2: Affiliation Fee Demand & Payment
              </span>
            ),
            children: (
              <div>
                <Row gutter={[16, 16]}>
                  {/* Left: Auto-Calculated University Statement */}
                  <Col xs={24} lg={15}>
                    <Card
                      title={
                        <Space>
                          <BankOutlined style={{ color: '#002147' }} />
                          <span style={{ fontWeight: 700, color: '#002147' }}>
                            AKNU - CDC Official Affiliation Fee Demand Statement
                          </span>
                        </Space>
                      }
                      extra={<Tag color="green" style={{ fontWeight: 700 }}>AY 2025–26</Tag>}
                      bordered
                      style={{ borderRadius: 8 }}
                      styles={{ body: { padding: '12px 16px' } }}
                    >
                      <Descriptions size="small" bordered column={2} style={{ marginBottom: 14 }}>
                        <Descriptions.Item label="College Name">
                          {collegeData?.name || college?.name}
                        </Descriptions.Item>
                        <Descriptions.Item label="College Code">
                          {collegeData?.code || college?.code}
                        </Descriptions.Item>
                        <Descriptions.Item label="Stream / Department">
                          {streamInfo.title}
                        </Descriptions.Item>
                        <Descriptions.Item label="Location">
                          {collegeData?.location || 'RURAL'} Area
                        </Descriptions.Item>
                        <Descriptions.Item label="Active Enrolled Strength">
                          <Text strong>{feeCalculation.totalActiveStrength} Students</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Sanctioned Intake Capacity">
                          <Text strong>{feeCalculation.totalIntake} Seats</Text>
                        </Descriptions.Item>
                      </Descriptions>

                      {/* Official Statement Line Items */}
                      <Table
                        size="small"
                        pagination={false}
                        bordered
                        columns={[
                          { title: 'S.No', dataIndex: 'sno', width: 55, align: 'center' },
                          { title: 'Nature of Fee (From University Notification)', dataIndex: 'nature' },
                          { title: 'Rate / Slab Rule', dataIndex: 'rate', width: 180 },
                          { title: 'Units / Count', dataIndex: 'units', width: 110, align: 'center' },
                          { title: 'Amount Payable (₹)', dataIndex: 'amount', width: 140, align: 'right' },
                        ]}
                        dataSource={[
                          {
                            key: '1',
                            sno: 1,
                            nature: 'Inspection Fee per College',
                            rate: 'Fixed Annual Rate',
                            units: '1 College',
                            amount: '₹8,000',
                          },
                          {
                            key: '2',
                            sno: 2,
                            nature: `College Annual Affiliation Fee: Based on Intake Strength Slabs`,
                            rate: feeCalculation.slabTitle,
                            units: `${feeCalculation.totalIntake} Intake`,
                            amount: `₹${feeCalculation.affiliationFee.toLocaleString('en-IN')}`,
                          },
                          {
                            key: '3',
                            sno: 3,
                            nature: 'I.C.G.S. & Sports Fee per College',
                            rate: 'Fixed University Fund',
                            units: '1 College',
                            amount: '₹1,600',
                          },
                          {
                            key: '4',
                            sno: 4,
                            nature: `1st Year Student Fee (Addl. Affiliation, IUT, Cultural, Youth Fest, Library, Health & Dev Funds)`,
                            rate: `₹${feeCalculation.year1Rate} / candidate`,
                            units: `${feeCalculation.year1Admitted} Students`,
                            amount: `₹${feeCalculation.year1Total.toLocaleString('en-IN')}`,
                          },
                          {
                            key: '5',
                            sno: 5,
                            nature: `2nd, 3rd, 4th Year Continuing Student Fee`,
                            rate: `₹${feeCalculation.yearOtherRate} / candidate`,
                            units: `${feeCalculation.yearOtherActive} Students`,
                            amount: `₹${feeCalculation.yearOtherTotal.toLocaleString('en-IN')}`,
                          },
                          ...(feeCalculation.mqRate > 0
                            ? [
                                {
                                  key: '6',
                                  sno: 6,
                                  nature: `Other Fee for Category: MQ (${streamKey} Management Quota)`,
                                  rate: `₹${feeCalculation.mqRate} / MQ candidate`,
                                  units: `${feeCalculation.year1MQ} Students`,
                                  amount: `₹${feeCalculation.mqTotal.toLocaleString('en-IN')}`,
                                },
                              ]
                            : []),
                          ...(feeCalculation.computerCourseFee > 0
                            ? [
                                {
                                  key: '7',
                                  sno: 7,
                                  nature: 'Special Fee for Computer Courses (Science / Arts Sections)',
                                  rate: '₹3,300 per section',
                                  units: `${feeCalculation.computerSectionsCount} Sections`,
                                  amount: `₹${feeCalculation.computerCourseFee.toLocaleString('en-IN')}`,
                                },
                              ]
                            : []),
                          ...(feeCalculation.hasHostel
                            ? [
                                {
                                  key: '8',
                                  sno: 8,
                                  nature: 'Attached Hostel Inspection & Recognition Fee',
                                  rate: 'Hostel Insp (₹5,000) + Recog',
                                  units: '1 Hostel',
                                  amount: `₹${(feeCalculation.hostelInspection + feeCalculation.hostelRecognition).toLocaleString('en-IN')}`,
                                },
                              ]
                            : []),
                          ...(feeCalculation.staffRatification > 0
                            ? [
                                {
                                  key: '9',
                                  sno: 9,
                                  nature: 'Staff Ratification Fee',
                                  rate: 'Fixed Rate (₹22,000)',
                                  units: '1 Faculty',
                                  amount: `₹${feeCalculation.staffRatification.toLocaleString('en-IN')}`,
                                },
                              ]
                            : []),
                        ]}
                      />

                      {/* Grand Total Footer */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: '#f6ffed',
                          border: '2px solid #b7eb8f',
                          borderRadius: 6,
                          marginTop: 12,
                        }}
                      >
                        <div>
                          <Text strong style={{ fontSize: '15px', color: '#135200' }}>
                            GRAND TOTAL AMOUNT PAYABLE:
                          </Text>
                          <div style={{ fontSize: '11px', color: '#555' }}>
                            All fee heads automatically verified against university intake limits
                          </div>
                        </div>
                        <Text strong style={{ fontSize: '24px', color: '#237804' }}>
                          ₹{feeCalculation.grandTotal.toLocaleString('en-IN')}
                        </Text>
                      </div>
                    </Card>
                  </Col>

                  {/* Right: Payment Submission Box */}
                  <Col xs={24} lg={9}>
                    <Card
                      title={
                        <Space>
                          <CreditCardOutlined style={{ color: '#002147' }} />
                          <span style={{ fontWeight: 700, color: '#002147' }}>Submit Stream Payment</span>
                        </Space>
                      }
                      bordered
                      style={{ borderRadius: 8 }}
                      styles={{ body: { padding: '16px' } }}
                    >
                      {paymentRecord ? (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
                          <Title level={4} style={{ color: '#002147', margin: 0 }}>
                            Payment Recorded!
                          </Title>
                          <Tag color="green" style={{ marginTop: 6, fontWeight: 700, padding: '2px 8px' }}>
                            STATUS: {paymentRecord.status}
                          </Tag>
                          <Descriptions size="small" column={1} bordered style={{ marginTop: 16, textAlign: 'left' }}>
                            <Descriptions.Item label="Payment Mode">{paymentRecord.paymentMode}</Descriptions.Item>
                            <Descriptions.Item label="DD / TXN Ref">{paymentRecord.ddNumber}</Descriptions.Item>
                            <Descriptions.Item label="Bank Name">{paymentRecord.bankName}</Descriptions.Item>
                            <Descriptions.Item label="Amount Paid">
                              ₹{paymentRecord.amountPaid.toLocaleString('en-IN')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Submitted On">
                              {new Date(paymentRecord.submittedAt).toLocaleDateString('en-IN')}
                            </Descriptions.Item>
                          </Descriptions>

                          <Space style={{ marginTop: 16 }}>
                            <Button
                              type="primary"
                              icon={<PrinterOutlined />}
                              onClick={() => setActiveTab('annexure')}
                              style={{ background: '#002147' }}
                            >
                              View Official Annexure
                            </Button>
                            <Button
                              onClick={() => {
                                localStorage.removeItem(paymentStorageKey);
                                setPaymentRecord(null);
                              }}
                            >
                              Edit / Resubmit
                            </Button>
                          </Space>
                        </div>
                      ) : (
                        <div>
                          <div style={{ marginBottom: 14 }}>
                            <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 6 }}>
                              Select Payment Method:
                            </Text>
                            <Radio.Group
                              value={paymentMode}
                              onChange={(e) => setPaymentMode(e.target.value)}
                              buttonStyle="solid"
                              style={{ width: '100%' }}
                            >
                              <Radio.Button value="DD_CHALLAN" style={{ width: '50%', textAlign: 'center' }}>
                                🏦 Demand Draft (DD)
                              </Radio.Button>
                              <Radio.Button value="ONLINE" style={{ width: '50%', textAlign: 'center' }}>
                                💳 Online Gateway
                              </Radio.Button>
                            </Radio.Group>
                          </div>

                          {paymentMode === 'DD_CHALLAN' ? (
                            <div>
                              <Alert
                                type="info"
                                message="Offline Demand Draft / Bank Challan Mode"
                                description="Enter the DD details from Andhra Bank / SBI / Union Bank drawn in favor of Registrar, AKNU."
                                style={{ fontSize: '11px', marginBottom: 12 }}
                              />
                              <div style={{ marginBottom: 10 }}>
                                <Text strong style={{ fontSize: '12px' }}>Demand Draft (DD) No. / UTR:</Text>
                                <Input
                                  placeholder="e.g. DD #584920"
                                  value={ddNumber}
                                  onChange={(e) => setDdNumber(e.target.value)}
                                  style={{ marginTop: 4 }}
                                />
                              </div>
                              <div style={{ marginBottom: 10 }}>
                                <Text strong style={{ fontSize: '12px' }}>Drawn Bank & Branch:</Text>
                                <Input
                                  placeholder="e.g. Union Bank, Kakinada Main Branch"
                                  value={bankName}
                                  onChange={(e) => setBankName(e.target.value)}
                                  style={{ marginTop: 4 }}
                                />
                              </div>
                              <div style={{ marginBottom: 10 }}>
                                <Text strong style={{ fontSize: '12px' }}>DD Date:</Text>
                                <Input
                                  type="date"
                                  value={ddDate}
                                  onChange={(e) => setDdDate(e.target.value)}
                                  style={{ marginTop: 4 }}
                                />
                              </div>
                              <div style={{ marginBottom: 14 }}>
                                <Text strong style={{ fontSize: '12px' }}>Amount Paid (₹):</Text>
                                <InputNumber
                                  value={amountPaid}
                                  onChange={(v) => setAmountPaid(v || feeCalculation.grandTotal)}
                                  style={{ width: '100%', marginTop: 4 }}
                                  formatter={(val) => `₹ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                />
                              </div>
                              <div style={{ marginBottom: 16 }}>
                                <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                                  Upload Scanned DD / Challan Copy:
                                </Text>
                                <Upload beforeUpload={() => false} maxCount={1}>
                                  <Button icon={<UploadOutlined />} style={{ width: '100%' }}>
                                    Attach DD Photo / PDF
                                  </Button>
                                </Upload>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Alert
                                type="success"
                                message="Instant Online Payment"
                                description="Pay securely via SBI e-Pay, NetBanking, Debit/Credit Card, or UPI with instant receipt generation."
                                style={{ fontSize: '11px', marginBottom: 16 }}
                              />
                              <Statistic
                                title="Net Payable Online"
                                value={feeCalculation.grandTotal}
                                prefix="₹"
                                valueStyle={{ color: '#27ae60', fontWeight: 800, fontSize: '26px' }}
                              />
                            </div>
                          )}

                          <Button
                            type="primary"
                            size="large"
                            block
                            loading={submittingPayment}
                            onClick={handleSubmitPayment}
                            style={{ background: '#002147', fontWeight: 700, height: 44, marginTop: 8 }}
                          >
                            {paymentMode === 'ONLINE' ? 'Pay Online Now' : 'Submit DD Details to University CDC'}
                          </Button>
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
          {
            key: 'annexure',
            label: (
              <span>
                <PrinterOutlined /> Step 3: Official University Filled Annexure
              </span>
            ),
            children: (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text strong style={{ fontSize: '14px', color: '#002147' }}>
                    🏛️ Official University CDC Filled Annexure Format (Print-Ready)
                  </Text>
                  <Button
                    type="primary"
                    icon={<PrinterOutlined />}
                    onClick={() => window.print()}
                    style={{ background: '#002147' }}
                  >
                    Print / Download PDF Annexure
                  </Button>
                </div>

                {/* Pixel-Perfect Replica of the University Paper Form */}
                <div
                  style={{
                    background: '#fff',
                    padding: 24,
                    border: '2px solid #333',
                    borderRadius: 4,
                    color: '#000',
                    fontFamily: 'serif',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 6 }}>
                    <div>
                      <div><b>Name of the College :</b> {collegeData?.name || college?.name}</div>
                      <div style={{ marginTop: 4 }}><b>College Code No :</b> {collegeData?.code || college?.code} &nbsp;&nbsp;&nbsp; <b>Location:</b> {collegeData?.location || 'RURAL'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{streamKey}</span>
                      <div><b>Academic Year :</b> 2025–2026</div>
                    </div>
                  </div>

                  {/* Quota Matrix Table */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 4 }}>
                      STUDENTS' ADMITTED STRENGTH & QUOTA DETAILS
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid #000' }}>
                      <thead>
                        <tr style={{ background: '#f0f0f0' }}>
                          <th style={{ border: '1px solid #000', padding: 4 }}>Year of Study</th>
                          <th style={{ border: '1px solid #000', padding: 4 }}>C.Q (Convenor)</th>
                          <th style={{ border: '1px solid #000', padding: 4 }}>S.A (Spot)</th>
                          <th style={{ border: '1px solid #000', padding: 4 }}>M.Q (Management)</th>
                          <th style={{ border: '1px solid #000', padding: 4 }}>Total Admitted</th>
                          <th style={{ border: '1px solid #000', padding: 4 }}>Active Continuing</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: 4 }}><b>I Year</b></td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>
                            {admissionRows.filter((r) => r.yearOfStudy === 1).reduce((s, r) => s + r.convenorQuota, 0)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>
                            {admissionRows.filter((r) => r.yearOfStudy === 1).reduce((s, r) => s + r.spotAdmission, 0)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>
                            {admissionRows.filter((r) => r.yearOfStudy === 1).reduce((s, r) => s + r.managementQuota, 0)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4 }}><b>{feeCalculation.year1Admitted}</b></td>
                          <td style={{ border: '1px solid #000', padding: 4 }}><b>{feeCalculation.year1Admitted}</b></td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: 4 }}><b>II Year</b></td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>
                            {admissionRows.filter((r) => r.yearOfStudy === 2).reduce((s, r) => s + r.convenorQuota, 0)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>
                            {admissionRows.filter((r) => r.yearOfStudy === 2).reduce((s, r) => s + r.spotAdmission, 0)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>
                            {admissionRows.filter((r) => r.yearOfStudy === 2).reduce((s, r) => s + r.managementQuota, 0)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>
                            {admissionRows.filter((r) => r.yearOfStudy === 2).reduce((s, r) => s + r.convenorQuota + r.spotAdmission + r.managementQuota, 0)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4 }}><b>{feeCalculation.yearOtherActive}</b></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Fee Statement Table */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 4 }}>
                      NATURE OF FEE & PAYMENT PARTICULARS
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f0f0f0' }}>
                          <th style={{ border: '1px solid #000', padding: 4, width: 40 }}>S.No</th>
                          <th style={{ border: '1px solid #000', padding: 4 }}>Nature of Fee</th>
                          <th style={{ border: '1px solid #000', padding: 4, width: 130 }}>Amount Payable Rs.</th>
                          <th style={{ border: '1px solid #000', padding: 4, width: 110 }}>Amount Paid Rs.</th>
                          <th style={{ border: '1px solid #000', padding: 4, width: 170 }}>Details of Paid DD No. & Date</th>
                          <th style={{ border: '1px solid #000', padding: 4, width: 80 }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>1</td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>Inspection Fee per College</td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>8,000/-</td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>{paymentRecord ? '8,000/-' : '-'}</td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>{paymentRecord?.ddNumber || '-'}</td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>Nil</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>2</td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>
                            College Annual Affiliation Fee: {feeCalculation.slabTitle}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>
                            {feeCalculation.affiliationFee.toLocaleString('en-IN')}/-
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>
                            {paymentRecord ? `${feeCalculation.affiliationFee.toLocaleString('en-IN')}/-` : '-'}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>{paymentRecord?.bankName || '-'}</td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>Nil</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>3</td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>I.C.G.S. & Sports Fee Per College</td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>1,600/-</td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>{paymentRecord ? '1,600/-' : '-'}</td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>{paymentRecord?.ddDate || '-'}</td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>Nil</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>4</td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>
                            1st Year Student Fee @ Rs. {feeCalculation.year1Rate}/- per candidate ({feeCalculation.year1Admitted} students)
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>
                            {feeCalculation.year1Total.toLocaleString('en-IN')}/-
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>
                            {paymentRecord ? `${feeCalculation.year1Total.toLocaleString('en-IN')}/-` : '-'}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>-</td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>Nil</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>5</td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>
                            2nd Year Student Fee @ Rs. {feeCalculation.yearOtherRate}/- per candidate ({feeCalculation.yearOtherActive} active students)
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>
                            {feeCalculation.yearOtherTotal.toLocaleString('en-IN')}/-
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>
                            {paymentRecord ? `${feeCalculation.yearOtherTotal.toLocaleString('en-IN')}/-` : '-'}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 4 }}>-</td>
                          <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>Nil</td>
                        </tr>
                        <tr style={{ background: '#f5f5f5', fontWeight: 'bold' }}>
                          <td colSpan={2} style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>
                            TOTAL :-
                          </td>
                          <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>
                            ₹{feeCalculation.grandTotal.toLocaleString('en-IN')}/-
                          </td>
                          <td style={{ border: '1px solid #000', padding: 6, textAlign: 'right' }}>
                            {paymentRecord ? `₹${paymentRecord.amountPaid.toLocaleString('en-IN')}/-` : '-'}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 6 }}>
                            {paymentRecord?.ddNumber ? `Ref: ${paymentRecord.ddNumber}` : 'Pending Submission'}
                          </td>
                          <td style={{ border: '1px solid #000', padding: 6, textAlign: 'center' }}>Nil</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 45, paddingTop: 10 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ height: 35 }}></div>
                      <div><b>Signature of the Principal</b></div>
                      <div style={{ fontSize: '11px' }}>(With Official Seal)</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ height: 35 }}></div>
                      <div><b>Signature of the Correspondent</b></div>
                      <div style={{ fontSize: '11px' }}>Name of the Society</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ height: 35 }}></div>
                      <div><b>Dean, CDC (Verification)</b></div>
                      <div style={{ fontSize: '11px' }}>Adikavi Nannaya University</div>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};
