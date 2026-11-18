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
} from 'antd';
import {
  UsergroupAddOutlined,
  UploadOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
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

  const [singleModal, setSingleModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkDataText, setBulkDataText] = useState('');
  const [bulkReport, setBulkReport] = useState<any | null>(null);

  const [form] = Form.useForm();

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

  const handleBulkUpload = async () => {
    try {
      // Parse sample or user CSV/tab text
      let rowsToUpload: any[] = [];
      if (!bulkDataText.trim()) {
        // Use demo sample rows
        rowsToUpload = [
          {
            admissionNo: `${college?.code}-26-101`,
            name: 'K. Sai Krishna',
            fatherName: 'K. Venkanna',
            gender: 'MALE',
            dob: '2005-03-15',
            category: 'BC',
            courseCode: 'BSC-MPCS',
            yearOfStudy: 1,
            quota: 'CONVENOR',
            admissionDate: '2026-08-01',
            apaarId: `APAAR-533-${college?.code}-9001`,
          },
          {
            admissionNo: `${college?.code}-26-102`,
            name: 'S. Divya Sri',
            fatherName: 'S. Satyanarayana',
            gender: 'FEMALE',
            dob: '2005-09-12',
            category: 'OC',
            courseCode: 'BSC-MPCS',
            yearOfStudy: 1,
            quota: 'CONVENOR',
            admissionDate: '2026-08-02',
            apaarId: `APAAR-533-${college?.code}-9002`,
          },
          {
            // Intentional duplicate APAAR to demo error report
            admissionNo: `${college?.code}-26-103`,
            name: 'M. Ramesh',
            fatherName: 'M. Apparao',
            gender: 'MALE',
            dob: '2005-06-20',
            category: 'SC',
            courseCode: 'BSC-MPCS',
            yearOfStudy: 1,
            quota: 'SPOT',
            admissionDate: '2026-08-05',
            apaarId: 'APAAR-533-001-9871', // Existing duplicate
          },
        ];
      } else {
        // Parse JSON or comma-separated lines
        try {
          rowsToUpload = JSON.parse(bulkDataText);
        } catch (e) {
          message.error('Please input valid JSON array of student objects.');
          return;
        }
      }

      const res = await api.students.bulkUpload(college!.id, rowsToUpload, '2026-27');
      setBulkReport(res.data);
      message.info(`Processed ${res.data.totalProcessed} records. ${res.data.successCount} added, ${res.data.errorCount} errors.`);
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Bulk upload failed');
    }
  };

  const handleAutoPromote = async () => {
    Modal.confirm({
      title: 'Auto-Promote Students for New Academic Year?',
      content: 'This will advance all active 1st, 2nd, and 3rd year students to the next year of study. Final-year students will be marked as Completed/Graduated.',
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
            icon={<UploadOutlined />}
            onClick={() => {
              setBulkReport(null);
              setBulkModal(true);
            }}
            style={{ background: '#52c41a', border: 'none' }}
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
                  <Text copyable style={{ fontSize: '12px' }}>{id}</Text>
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
                  <span style={{ fontSize: '11px', color: '#666' }}>{r.category} • {r.gender}</span>
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

      {/* Excel Bulk Upload Modal */}
      <Modal
        title="Excel Bulk Student Upload & Row-by-Row Error Report"
        open={bulkModal}
        width={720}
        onCancel={() => setBulkModal(false)}
        footer={[
          <Button key="close" onClick={() => setBulkModal(false)}>
            Close
          </Button>,
          <Button key="upload" type="primary" onClick={handleBulkUpload} style={{ background: '#52c41a', border: 'none' }}>
            Process Excel Upload
          </Button>,
        ]}
      >
        <Alert
          message="Excel Bulk Ingestion with Validation Engine"
          description="Validates mandatory columns, quota limits against sanctioned intake proceedings, duplicate admission numbers within college, and duplicate APAAR IDs across the entire university."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Paragraph style={{ fontSize: '13px', margin: '0 0 8px' }}>
          <strong>Input JSON/Excel payload (or click Process to run standard test batch with duplicate APAAR test):</strong>
        </Paragraph>
        <TextArea
          rows={5}
          placeholder="Leave empty to run simulated Excel batch, or paste JSON array of students..."
          value={bulkDataText}
          onChange={(e) => setBulkDataText(e.target.value)}
        />

        {bulkReport && (
          <div style={{ marginTop: 16 }}>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', gap: '16px', marginBottom: 12 }}>
              <Tag color="blue">Total Processed: {bulkReport.totalProcessed}</Tag>
              <Tag color="green">Successfully Ingested: {bulkReport.successCount}</Tag>
              <Tag color="red">Validation Errors: {bulkReport.errorCount}</Tag>
            </div>

            {bulkReport.errorReports?.length > 0 && (
              <Card size="small" title="Row-wise Error Report:" style={{ background: '#fff2f0', borderColor: '#ffccc7' }}>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={bulkReport.errorReports}
                  rowKey="rowNumber"
                  columns={[
                    { title: 'Excel Row #', dataIndex: 'rowNumber', key: 'rowNumber', width: 100 },
                    { title: 'Admission No', dataIndex: 'admissionNo', key: 'admissionNo' },
                    { title: 'APAAR ID', dataIndex: 'apaarId', key: 'apaarId' },
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
