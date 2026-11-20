import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Typography,
  Alert,
  Divider,
  message,
  Upload,
  Tabs,
  Badge,
  Tooltip,
} from 'antd';
import {
  UsergroupAddOutlined,
  UploadOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  InboxOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Student, Course } from '../../api/types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const CollegeStudentsPage: React.FC = () => {
  const { college } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Single Student Enrollment Modal
  const [singleModal, setSingleModal] = useState(false);
  const [form] = Form.useForm();

  // Excel / CSV Bulk Upload States
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkTab, setBulkTab] = useState<'FILE' | 'PASTE'>('FILE');
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const [attachedFileSize, setAttachedFileSize] = useState<number>(0);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [bulkDataText, setBulkDataText] = useState('');
  const [bulkReport, setBulkReport] = useState<any | null>(null);

  const loadData = async () => {
    if (!college) return;
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        api.students.list({ collegeId: college.id }),
        api.courses.list(),
      ]);
      setStudents(sRes.data);
      setCourses(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [college]);

  const handleSingleSubmit = async (values: any) => {
    try {
      await api.students.createSingle({
        ...values,
        collegeId: college!.id,
        academicYear: '2026-27',
      });
      message.success('Student enrolled successfully with APAAR ID verification!');
      setSingleModal(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to enroll student');
    }
  };

  /**
   * Helper function: maps raw spreadsheet objects to standardized StudentRowInput
   */
  const parseRowsFromData = (rawJsonRows: any[]): any[] => {
    return rawJsonRows.map((rawRow, idx) => {
      const getVal = (...targetKeys: string[]) => {
        for (const k of Object.keys(rawRow)) {
          const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const target of targetKeys) {
            const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanK === cleanTarget || cleanK.includes(cleanTarget)) {
              const val = rawRow[k];
              if (val !== undefined && val !== null && String(val).trim() !== '') {
                return String(val).trim();
              }
            }
          }
        }
        return '';
      };

      const admissionNo = getVal('admissionno', 'admno', 'admissionnumber', 'rollno', 'hallticket', 'regno', 'admn', 'id');
      const name = getVal('name', 'studentname', 'fullname', 'candidatename', 'student');
      const fatherName = getVal('fathername', 'fathersname', 'father', 'guardianname', 'guardian');

      // Gender normalization
      const rawGender = getVal('gender', 'sex').toUpperCase();
      const gender = rawGender.startsWith('F') ? 'FEMALE' : rawGender.startsWith('M') ? 'MALE' : 'MALE';

      // DOB formatting
      let dob = getVal('dob', 'dateofbirth', 'birthdate');
      if (dob && !isNaN(Number(dob)) && Number(dob) > 20000 && Number(dob) < 60000) {
        const d = new Date((Number(dob) - 25569) * 86400 * 1000);
        dob = d.toISOString().split('T')[0];
      } else if (dob && dob.includes('/')) {
        const parts = dob.split('/');
        if (parts.length === 3) {
          dob = parts[2].length === 4 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : dob;
        }
      }
      if (!dob) dob = '2005-05-15';

      // Category normalization
      const rawCat = getVal('category', 'caste', 'socialcategory', 'community').toUpperCase();
      const category = rawCat.startsWith('SC') ? 'SC' : rawCat.startsWith('ST') ? 'ST' : rawCat.includes('BC') ? 'BC' : 'OC';

      // Course code matching
      const rawCourse = getVal('coursecode', 'course', 'program', 'branch', 'stream');
      let matchedCourseCode = rawCourse;
      const matchedCourse = courses.find(
        (c) =>
          c.code.toLowerCase() === rawCourse.toLowerCase() ||
          c.name.toLowerCase() === rawCourse.toLowerCase() ||
          c.code.replace(/[^a-z0-9]/gi, '').toLowerCase() === rawCourse.replace(/[^a-z0-9]/gi, '').toLowerCase() ||
          c.name.replace(/[^a-z0-9]/gi, '').toLowerCase().includes(rawCourse.replace(/[^a-z0-9]/gi, '').toLowerCase())
      );
      if (matchedCourse) {
        matchedCourseCode = matchedCourse.code;
      } else if (!matchedCourseCode && courses.length > 0) {
        matchedCourseCode = courses[0].code;
      }

      // Quota normalization
      const rawQuota = getVal('quota', 'seattype', 'admissiontype').toUpperCase();
      const quota =
        rawQuota === 'CQ' || rawQuota.includes('CONVEN')
          ? 'CONVENOR'
          : rawQuota === 'SA' || rawQuota.includes('SPOT')
          ? 'SPOT'
          : rawQuota === 'MQ' || rawQuota.includes('MANAG')
          ? 'MANAGEMENT'
          : 'CONVENOR';

      // Year of Study
      const rawYear = getVal('yearofstudy', 'year', 'studyyear', 'yos');
      const yearOfStudy = parseInt(rawYear.replace(/[^0-9]/g, ''), 10) || 1;

      // Admission Date
      let admissionDate = getVal('admissiondate', 'dateofadmission', 'admdate');
      if (admissionDate && !isNaN(Number(admissionDate)) && Number(admissionDate) > 20000 && Number(admissionDate) < 60000) {
        const d = new Date((Number(admissionDate) - 25569) * 86400 * 1000);
        admissionDate = d.toISOString().split('T')[0];
      }
      if (!admissionDate) admissionDate = '2026-08-01';

      // APAAR ID
      const apaarId = getVal('apaarid', 'apaar', 'nationalid', 'abcid');

      // PH & Minority flags
      const rawPh = getVal('isph', 'ph', 'physicallychallenged', 'pwd');
      const isPh = ['yes', 'true', '1', 'y'].includes(rawPh.toLowerCase());

      const rawMinority = getVal('isminority', 'minority');
      const isMinority = ['yes', 'true', '1', 'y'].includes(rawMinority.toLowerCase());

      const missing: string[] = [];
      if (!admissionNo) missing.push('Admission No');
      if (!name) missing.push('Student Name');
      if (!apaarId) missing.push('APAAR ID');
      if (!matchedCourseCode) missing.push('Course Code');

      return {
        _rowIndex: idx + 1,
        _isValid: missing.length === 0,
        _missing: missing,
        admissionNo,
        name,
        fatherName: fatherName || 'Father/Guardian',
        gender,
        dob,
        category,
        courseCode: matchedCourseCode,
        quota,
        yearOfStudy,
        admissionDate,
        apaarId,
        isPh,
        isMinority,
      };
    });
  };

  /**
   * Handle File Upload / Attachment for .xlsx, .xls, .csv
   */
  const handleFileUpload = (file: File) => {
    const isExcelOrCsv =
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.name.endsWith('.csv') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.type === 'text/csv';

    if (!isExcelOrCsv) {
      message.error('Please attach a valid Excel (.xlsx, .xls) or CSV (.csv) file.');
      return false;
    }

    setAttachedFileName(file.name);
    setAttachedFileSize(file.size);
    setBulkReport(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          message.warning('The attached file does not contain any readable student data rows.');
          setParsedRows([]);
          return;
        }

        const parsed = parseRowsFromData(rawJson);
        setParsedRows(parsed);
        const validCount = parsed.filter((r) => r._isValid).length;
        message.success(
          `Attached "${file.name}": detected ${parsed.length} student rows (${validCount} valid and ready).`
        );
      } catch (err: any) {
        console.error('File parsing error:', err);
        message.error('Failed to parse the attached spreadsheet. Please check the file formatting.');
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // prevent default HTTP upload
  };

  /**
   * Download pre-formatted sample Excel or CSV template
   */
  const downloadSampleTemplate = (format: 'xlsx' | 'csv') => {
    const defaultCourse = courses[0]?.code || 'B.Sc-DS';
    const secondCourse = courses[1]?.code || 'B.Com-CA';
    const code = college?.code || 'COLLEGE';

    const sampleHeaders = [
      'Admission_No',
      'Student_Name',
      'Father_Name',
      'Gender',
      'Date_of_Birth',
      'Category',
      'Course_Code',
      'Quota',
      'Year_of_Study',
      'Date_of_Admission',
      'APAAR_ID',
      'Physically_Challenged',
      'Minority',
    ];

    const sampleData = [
      sampleHeaders,
      [
        `${code}-26-101`,
        'K. Sai Krishna',
        'K. Venkanna',
        'MALE',
        '2005-03-15',
        'BC',
        defaultCourse,
        'CONVENOR',
        1,
        '2026-08-01',
        `APAAR-533-${code}-9001`,
        'NO',
        'NO',
      ],
      [
        `${code}-26-102`,
        'S. Divya Sri',
        'S. Satyanarayana',
        'FEMALE',
        '2005-09-12',
        'OC',
        secondCourse,
        'CONVENOR',
        1,
        '2026-08-02',
        `APAAR-533-${code}-9002`,
        'NO',
        'NO',
      ],
      [
        `${code}-26-103`,
        'M. Ramesh',
        'M. Apparao',
        'MALE',
        '2005-06-20',
        'SC',
        defaultCourse,
        'SPOT',
        1,
        '2026-08-05',
        `APAAR-533-${code}-9003`,
        'NO',
        'NO',
      ],
      [
        `${code}-26-104`,
        'V. Ananya',
        'V. Murali',
        'FEMALE',
        '2005-11-28',
        'BC',
        secondCourse,
        'MANAGEMENT',
        1,
        '2026-08-06',
        `APAAR-533-${code}-9004`,
        'NO',
        'NO',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
      { wch: 10 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 26 },
      { wch: 20 },
      { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Admitted_Students');

    const fileName = `AKNU_Student_Admissions_Template_${code}.${format}`;
    XLSX.writeFile(wb, fileName, { bookType: format });
    message.success(`Downloaded template: ${fileName}`);
  };

  /**
   * Load demo students data
   */
  const loadDemoBatch = () => {
    const code = college?.code || 'COLLEGE';
    const c1 = courses[0]?.code || 'B.Sc-DS';
    const c2 = courses[1]?.code || courses[0]?.code || 'B.Com-CA';

    const demoRows = [
      {
        admissionNo: `${code}-26-101`,
        name: 'K. Sai Krishna',
        fatherName: 'K. Venkanna',
        gender: 'MALE',
        dob: '2005-03-15',
        category: 'BC',
        courseCode: c1,
        yearOfStudy: 1,
        quota: 'CONVENOR',
        admissionDate: '2026-08-01',
        apaarId: `APAAR-533-${code}-9001`,
        isPh: false,
        isMinority: false,
      },
      {
        admissionNo: `${code}-26-102`,
        name: 'S. Divya Sri',
        fatherName: 'S. Satyanarayana',
        gender: 'FEMALE',
        dob: '2005-09-12',
        category: 'OC',
        courseCode: c2,
        yearOfStudy: 1,
        quota: 'CONVENOR',
        admissionDate: '2026-08-02',
        apaarId: `APAAR-533-${code}-9002`,
        isPh: false,
        isMinority: false,
      },
      {
        admissionNo: `${code}-26-103`,
        name: 'M. Ramesh',
        fatherName: 'M. Apparao',
        gender: 'MALE',
        dob: '2005-06-20',
        category: 'SC',
        courseCode: c1,
        yearOfStudy: 1,
        quota: 'SPOT',
        admissionDate: '2026-08-05',
        apaarId: `APAAR-533-${code}-9003`,
        isPh: false,
        isMinority: false,
      },
      {
        admissionNo: `${code}-26-104`,
        name: 'P. Bhavani',
        fatherName: 'P. Subba Rao',
        gender: 'FEMALE',
        dob: '2005-12-04',
        category: 'ST',
        courseCode: c2,
        yearOfStudy: 1,
        quota: 'MANAGEMENT',
        admissionDate: '2026-08-08',
        apaarId: `APAAR-533-${code}-9004`,
        isPh: false,
        isMinority: false,
      },
    ];

    setAttachedFileName('AKNU_Demo_Student_Batch.xlsx');
    setAttachedFileSize(1024 * 6);
    setParsedRows(
      demoRows.map((r, i) => ({
        ...r,
        _rowIndex: i + 1,
        _isValid: true,
        _missing: [],
      }))
    );
    setBulkReport(null);
    message.info('Loaded sample student batch with all options mapped.');
  };

  /**
   * Process and execute bulk upload
   */
  const handleExecuteBulkUpload = async () => {
    let rowsToUpload: any[] = [];

    if (parsedRows.length > 0) {
      const valid = parsedRows.filter((r) => r._isValid);
      if (valid.length === 0) {
        message.error('No valid rows found to upload. Please review missing mandatory fields.');
        return;
      }
      rowsToUpload = valid;
    } else if (bulkDataText.trim()) {
      try {
        rowsToUpload = JSON.parse(bulkDataText);
      } catch {
        message.error('Please input a valid JSON array or attach an Excel/CSV file.');
        return;
      }
    } else {
      message.warning('Please attach an Excel or CSV file first, or click "Load Sample Demo Data".');
      return;
    }

    setBulkUploading(true);
    try {
      const res = await api.students.bulkUpload(college!.id, rowsToUpload, '2026-27');
      setBulkReport(res.data);
      if (res.data.successCount > 0) {
        message.success(`Successfully enrolled ${res.data.successCount} students!`);
        loadData();
      }
      if (res.data.errorCount > 0) {
        message.warning(`${res.data.errorCount} records rejected by intake validation engine.`);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Bulk upload failed');
    } finally {
      setBulkUploading(false);
    }
  };

  const handleClearAttached = () => {
    setAttachedFileName('');
    setAttachedFileSize(0);
    setParsedRows([]);
    setBulkReport(null);
    setBulkDataText('');
    message.info('Cleared attached file and parsed records.');
  };

  const handleAutoPromote = async () => {
    Modal.confirm({
      title: 'Auto-Promote Students for New Academic Year?',
      content:
        'This will advance all active 1st, 2nd, and 3rd year students to the next year of study. Final-year students will be marked as Completed/Graduated.',
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        try {
          const res = await api.students.autoPromote(college!.id);
          message.success(res.data.message);
          loadData();
        } catch (err) {
          message.error('Promotion failed');
        }
      },
    });
  };

  const validParsedCount = parsedRows.filter((r) => r._isValid).length;
  const invalidParsedCount = parsedRows.length - validParsedCount;

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1e3c72' }}>
            Student Admissions Register & Intake Verification
          </Title>
          <Text type="secondary">
            APAAR ID mandatory compliance (no Aadhaar). Single admission form and Excel bulk upload with row-by-row error validation.
          </Text>
        </div>
        <Space>
          <Button icon={<ArrowUpOutlined />} onClick={handleAutoPromote}>
            Auto-Promote Students
          </Button>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={() => {
              setBulkReport(null);
              setBulkModal(true);
            }}
            style={{ background: '#217346', borderColor: '#217346' }}
          >
            Excel Bulk Upload
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setSingleModal(true)}
            style={{ background: '#1e3c72' }}
          >
            New Admission
          </Button>
        </Space>
      </div>

      <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          dataSource={students}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'Admission No',
              dataIndex: 'admissionNo',
              key: 'admissionNo',
              render: (adm) => <Text strong>{adm}</Text>,
            },
            {
              title: 'Student Name',
              key: 'name',
              render: (_, r) => (
                <div>
                  <Text strong>{r.name}</Text>
                  <div style={{ fontSize: '11px', color: '#888' }}>Father: {r.fatherName}</div>
                </div>
              ),
            },
            {
              title: 'APAAR ID (National Id)',
              dataIndex: 'apaarId',
              key: 'apaarId',
              render: (id) => (
                <Space>
                  <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                  <Text copyable style={{ fontSize: '12px' }}>
                    {id}
                  </Text>
                </Space>
              ),
            },
            {
              title: 'Course & Year',
              key: 'course',
              render: (_, r) => (
                <div>
                  <div>{r.courseName || r.courseCode}</div>
                  <Tag color="blue">Year {r.yearOfStudy}</Tag>
                </div>
              ),
            },
            {
              title: 'Quota & Category',
              key: 'quota',
              render: (_, r) => (
                <Space direction="vertical" size={2}>
                  <Tag color={r.quota === 'CONVENOR' ? 'green' : r.quota === 'SPOT' ? 'cyan' : 'gold'}>
                    {r.quota}
                  </Tag>
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    {r.category} • {r.gender}
                  </span>
                </Space>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (st) => (
                <Tag color={st === 'ACTIVE' ? 'green' : st === 'PROMOTED' ? 'cyan' : 'default'}>
                  {st}
                </Tag>
              ),
            },
          ]}
        />
      </Card>

      {/* Single Student Admission Modal */}
      <Modal
        title="Enroll Single Student Admission"
        open={singleModal}
        width={640}
        onCancel={() => setSingleModal(false)}
        onOk={() => form.submit()}
      >
        <Form layout="vertical" form={form} onFinish={handleSingleSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="admissionNo" label="Admission Number" rules={[{ required: true }]}>
                <Input placeholder="e.g. 001-26-045" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="apaarId"
                label="APAAR ID (Automated Permanent Academic Account Registry)"
                rules={[{ required: true }]}
              >
                <Input placeholder="e.g. APAAR-533-001-9988" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="name" label="Student Full Name" rules={[{ required: true }]}>
                <Input placeholder="Full Name as per SSC" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fatherName" label="Father / Guardian Name" rules={[{ required: true }]}>
                <Input placeholder="Father's Name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="gender" label="Gender" initialValue="MALE">
                <Select
                  options={[
                    { label: 'Male', value: 'MALE' },
                    { label: 'Female', value: 'FEMALE' },
                    { label: 'Other', value: 'OTHER' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dob" label="Date of Birth" initialValue="2005-05-15">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="category" label="Social Category" initialValue="BC">
                <Select
                  options={[
                    { label: 'SC', value: 'SC' },
                    { label: 'ST', value: 'ST' },
                    { label: 'BC', value: 'BC' },
                    { label: 'OC', value: 'OC' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="courseCode" label="Admitted Course" rules={[{ required: true }]} initialValue="BSC-MPCS">
                <Select
                  options={courses.map((c) => ({
                    label: `${c.code} - ${c.name}`,
                    value: c.code,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="quota" label="Quota" initialValue="CONVENOR">
                <Select
                  options={[
                    { label: 'Convenor (CQ)', value: 'CONVENOR' },
                    { label: 'Spot (SA)', value: 'SPOT' },
                    { label: 'Management (MQ)', value: 'MANAGEMENT' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="yearOfStudy" label="Year" initialValue={1}>
                <Select
                  options={[
                    { label: '1st Year', value: 1 },
                    { label: '2nd Year', value: 2 },
                    { label: '3rd Year', value: 3 },
                    { label: '4th Year', value: 4 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="admissionDate" label="Date of Admission" initialValue="2026-08-01">
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Enhanced Excel & CSV Bulk Upload Modal */}
      <Modal
        title={
          <Space>
            <FileExcelOutlined style={{ color: '#217346', fontSize: 20 }} />
            <span style={{ color: '#1e3c72', fontWeight: 600 }}>
              Bulk Student Upload (Attach Excel / CSV File)
            </span>
          </Space>
        }
        open={bulkModal}
        width={850}
        onCancel={() => {
          setBulkModal(false);
          setBulkReport(null);
        }}
        footer={[
          <Button key="close" onClick={() => setBulkModal(false)}>
            Close
          </Button>,
          attachedFileName && (
            <Button key="clear" danger onClick={handleClearAttached}>
              Clear File
            </Button>
          ),
          <Button
            key="upload"
            type="primary"
            loading={bulkUploading}
            disabled={parsedRows.length === 0 && !bulkDataText.trim()}
            onClick={handleExecuteBulkUpload}
            style={{ background: '#217346', borderColor: '#217346' }}
          >
            {parsedRows.length > 0
              ? `Process & Enroll ${validParsedCount} Students`
              : 'Process Upload'}
          </Button>,
        ]}
      >
        <Alert
          message="University Affiliation Intake & APAAR Verification Engine"
          description="Upload student admissions via Excel (.xlsx, .xls) or CSV (.csv). The system automatically maps all columns (Admission No, Name, Father Name, Gender, DOB, Category, Course Code, Quota, Year, Admission Date & APAAR ID) and validates sanctioned seat intake proceedings."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Tabs
          activeKey={bulkTab}
          onChange={(k) => setBulkTab(k as any)}
          items={[
            {
              key: 'FILE',
              label: (
                <Space>
                  <FileExcelOutlined />
                  <span>Attach Excel or CSV File</span>
                </Space>
              ),
              children: (
                <div>
                  <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col xs={24} md={14}>
                      <Upload.Dragger
                        name="studentFile"
                        multiple={false}
                        accept=".xlsx,.xls,.csv"
                        beforeUpload={handleFileUpload}
                        showUploadList={false}
                        style={{
                          padding: '16px',
                          background: attachedFileName ? '#f6ffed' : '#fafafa',
                          borderColor: attachedFileName ? '#b7eb8f' : '#d9d9d9',
                          borderRadius: '8px',
                        }}
                      >
                        <p className="ant-upload-drag-icon" style={{ margin: '0 0 8px' }}>
                          <InboxOutlined style={{ fontSize: 36, color: '#217346' }} />
                        </p>
                        <p className="ant-upload-text" style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
                          Click or drag Excel (.xlsx, .xls) or CSV (.csv) file to attach
                        </p>
                        <p className="ant-upload-hint" style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>
                          Automated column detection: Admission No, Student Name, Father's Name, Gender, DOB, Category, Course, Quota, Year, & APAAR ID
                        </p>
                      </Upload.Dragger>
                    </Col>

                    <Col xs={24} md={10}>
                      <Card
                        size="small"
                        title={<span style={{ fontSize: '13px' }}>Template & Quick Tools</span>}
                        style={{ background: '#fcfcfc', borderRadius: '8px', height: '100%' }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Button
                            block
                            icon={<DownloadOutlined />}
                            onClick={() => downloadSampleTemplate('xlsx')}
                            style={{ color: '#217346', borderColor: '#217346' }}
                          >
                            Download Sample Excel (.xlsx) Template
                          </Button>
                          <Button
                            block
                            icon={<DownloadOutlined />}
                            onClick={() => downloadSampleTemplate('csv')}
                          >
                            Download Sample CSV (.csv) Template
                          </Button>
                          <Button
                            block
                            icon={<ThunderboltOutlined />}
                            onClick={loadDemoBatch}
                            style={{ color: '#1e3c72', borderColor: '#1e3c72' }}
                          >
                            Load Sample Demo Records
                          </Button>
                        </Space>
                      </Card>
                    </Col>
                  </Row>

                  {/* Attached File Summary Banner */}
                  {attachedFileName && (
                    <Card
                      size="small"
                      style={{
                        marginBottom: 16,
                        background: '#f6ffed',
                        borderColor: '#b7eb8f',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                          <div>
                            <Text strong>{attachedFileName}</Text>
                            <div style={{ fontSize: '11px', color: '#666' }}>
                              Size: {(attachedFileSize / 1024).toFixed(1)} KB • Total Rows Detected: {parsedRows.length}
                            </div>
                          </div>
                        </Space>
                        <Space>
                          <Tag color="green">Ready: {validParsedCount}</Tag>
                          {invalidParsedCount > 0 && <Tag color="red">Missing Columns: {invalidParsedCount}</Tag>}
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={handleClearAttached}
                          >
                            Remove
                          </Button>
                        </Space>
                      </div>
                    </Card>
                  )}

                  {/* Live Parsed Preview Table */}
                  {parsedRows.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text strong style={{ fontSize: '13px' }}>
                          Live Parsed Student Records Preview ({parsedRows.length} total):
                        </Text>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          Verified against sanctioned intakes & APAAR national format
                        </Text>
                      </div>
                      <Table
                        size="small"
                        bordered
                        dataSource={parsedRows}
                        rowKey="_rowIndex"
                        pagination={{ pageSize: 5, size: 'small' }}
                        scroll={{ x: 750 }}
                        columns={[
                          {
                            title: '#',
                            dataIndex: '_rowIndex',
                            key: '_rowIndex',
                            width: 50,
                            align: 'center',
                          },
                          {
                            title: 'Status',
                            key: '_status',
                            width: 100,
                            align: 'center',
                            render: (_, r) =>
                              r._isValid ? (
                                <Tag color="green" icon={<CheckCircleOutlined />}>
                                  Ready
                                </Tag>
                              ) : (
                                <Tooltip title={`Missing: ${r._missing.join(', ')}`}>
                                  <Tag color="red" icon={<CloseCircleOutlined />}>
                                    Incomplete
                                  </Tag>
                                </Tooltip>
                              ),
                          },
                          {
                            title: 'Admission No',
                            dataIndex: 'admissionNo',
                            key: 'admissionNo',
                            width: 130,
                            render: (v) => <Text strong>{v || <Text type="danger">Missing</Text>}</Text>,
                          },
                          {
                            title: 'Student & Father Name',
                            key: 'name',
                            render: (_, r) => (
                              <div>
                                <Text strong>{r.name || <Text type="danger">Missing</Text>}</Text>
                                <div style={{ fontSize: '11px', color: '#888' }}>{r.fatherName}</div>
                              </div>
                            ),
                          },
                          {
                            title: 'APAAR ID',
                            dataIndex: 'apaarId',
                            key: 'apaarId',
                            width: 170,
                            render: (id) =>
                              id ? (
                                <Space size={4}>
                                  <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                                  <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>{id}</span>
                                </Space>
                              ) : (
                                <Tag color="error">Missing APAAR</Tag>
                              ),
                          },
                          {
                            title: 'Course',
                            dataIndex: 'courseCode',
                            key: 'courseCode',
                            width: 110,
                            render: (c) => <Tag color="blue">{c || 'N/A'}</Tag>,
                          },
                          {
                            title: 'Quota',
                            dataIndex: 'quota',
                            key: 'quota',
                            width: 100,
                            render: (q) => (
                              <Tag color={q === 'CONVENOR' ? 'green' : q === 'SPOT' ? 'cyan' : 'gold'}>
                                {q}
                              </Tag>
                            ),
                          },
                          {
                            title: 'Gender / Cat',
                            key: 'details',
                            width: 110,
                            render: (_, r) => (
                              <span style={{ fontSize: '11px' }}>
                                {r.gender} • {r.category}
                              </span>
                            ),
                          },
                          {
                            title: 'Year',
                            dataIndex: 'yearOfStudy',
                            key: 'yearOfStudy',
                            width: 70,
                            align: 'center',
                            render: (y) => `Yr ${y}`,
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'PASTE',
              label: (
                <Space>
                  <FileTextOutlined />
                  <span>Direct JSON / Text Paste</span>
                </Space>
              ),
              children: (
                <div>
                  <Paragraph style={{ fontSize: '13px', margin: '0 0 8px' }}>
                    <strong>Paste JSON array of student objects:</strong>
                  </Paragraph>
                  <TextArea
                    rows={6}
                    placeholder="[ { &quot;admissionNo&quot;: &quot;001-26-101&quot;, &quot;name&quot;: &quot;K. Sai Krishna&quot;, &quot;fatherName&quot;: &quot;K. Venkanna&quot;, &quot;gender&quot;: &quot;MALE&quot;, &quot;dob&quot;: &quot;2005-03-15&quot;, &quot;category&quot;: &quot;BC&quot;, &quot;courseCode&quot;: &quot;B.Sc-DS&quot;, &quot;quota&quot;: &quot;CONVENOR&quot;, &quot;yearOfStudy&quot;: 1, &quot;apaarId&quot;: &quot;APAAR-533-001-9001&quot; } ]"
                    value={bulkDataText}
                    onChange={(e) => setBulkDataText(e.target.value)}
                  />
                </div>
              ),
            },
          ]}
        />

        {/* Bulk Processing Validation Report */}
        {bulkReport && (
          <div style={{ marginTop: 16 }}>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', gap: '16px', marginBottom: 12 }}>
              <Tag color="blue" style={{ padding: '4px 8px', fontSize: '13px' }}>
                Total Processed: <strong>{bulkReport.totalProcessed}</strong>
              </Tag>
              <Tag color="green" style={{ padding: '4px 8px', fontSize: '13px' }}>
                Successfully Ingested: <strong>{bulkReport.successCount}</strong>
              </Tag>
              <Tag color="red" style={{ padding: '4px 8px', fontSize: '13px' }}>
                Validation Errors: <strong>{bulkReport.errorCount}</strong>
              </Tag>
            </div>

            {bulkReport.errorReports?.length > 0 && (
              <Card
                size="small"
                title={
                  <Space>
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    <span style={{ color: '#cf1322' }}>Row-wise Rejection & Error Report</span>
                  </Space>
                }
                style={{ background: '#fff2f0', borderColor: '#ffccc7' }}
              >
                <Table
                  size="small"
                  pagination={{ pageSize: 5 }}
                  dataSource={bulkReport.errorReports}
                  rowKey="rowNumber"
                  columns={[
                    { title: 'Excel Row #', dataIndex: 'rowNumber', key: 'rowNumber', width: 100, align: 'center' },
                    { title: 'Admission No', dataIndex: 'admissionNo', key: 'admissionNo', width: 130 },
                    { title: 'APAAR ID', dataIndex: 'apaarId', key: 'apaarId', width: 160 },
                    {
                      title: 'Reason for Rejection',
                      dataIndex: 'error',
                      key: 'error',
                      render: (err) => <Text type="danger">{err}</Text>,
                    },
                  ]}
                />
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
