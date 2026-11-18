import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Card,
  Tabs,
  Table,
  Tag,
  Row,
  Col,
  Statistic,
  Space,
  Typography,
  Button,
  Badge,
  Descriptions,
  Alert,
  Input,
} from 'antd';
import {
  BookOutlined,
  UserOutlined,
  TeamOutlined,
  FileDoneOutlined,
  AppstoreOutlined,
  SearchOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Course, Student, Faculty } from '../../api/types';

const { Title, Text, Paragraph } = Typography;

export const CollegeCourseDetailPage: React.FC = () => {
  const { courseCode } = useParams<{ courseCode: string }>();
  const { college } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    loadCourseDetails();
  }, [courseCode, college?.id]);

  const loadCourseDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch courses from API or college
      const cRes = await api.courses.list();
      const matched = cRes.data.find(
        (c) =>
          c.code.toLowerCase() === courseCode?.toLowerCase() ||
          c.id.toLowerCase() === courseCode?.toLowerCase(),
      );
      setCourse(matched || null);

      if (college?.id) {
        // 2. Fetch students for this college
        const sRes = await api.students.list({ collegeId: college.id });
        const courseStudents = sRes.data.filter(
          (s) =>
            s.courseId === matched?.id ||
            s.courseName?.toLowerCase().includes(courseCode?.toLowerCase() || '') ||
            s.courseName?.toLowerCase().includes(matched?.name.toLowerCase() || ''),
        );
        setStudents(courseStudents);

        // 3. Fetch faculty
        const fRes = await api.faculty.list(college.id);
        const courseFaculty = fRes.data.filter(
          (f) => f.courseId === matched?.id || f.designation?.toLowerCase().includes(courseCode?.toLowerCase() || ''),
        );
        setFaculty(courseFaculty);
      }
    } catch (err) {
      console.error('Failed to load course details', err);
    } finally {
      setLoading(false);
    }
  };

  const sanctionedIntake = 60;
  const convenorQuota = Math.round(sanctionedIntake * 0.8);
  const managementQuota = sanctionedIntake - convenorQuota;

  const filteredStudents = students.filter(
    (s) =>
      !studentSearch.trim() ||
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admissionNo?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.apaarId?.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Course Banner */}
      <Card
        style={{
          marginBottom: 16,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          color: '#fff',
        }}
        styles={{ body: { padding: '20px 24px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Space align="center" size="middle">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#f1c40f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1e3c72',
                  fontSize: 24,
                }}
              >
                <BookOutlined />
              </div>
              <div>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>
                  {course?.name || courseCode}
                </Title>
                <Space style={{ marginTop: 4 }} wrap>
                  <Tag color="gold" style={{ fontWeight: 700 }}>
                    CODE: {course?.code || courseCode}
                  </Tag>
                  <Tag color="cyan">{course?.courseGroup || 'UG'} SECTION</Tag>
                  <Tag color="geekblue">{course?.degreeLevel || 'UG'} PROGRAM</Tag>
                  <Tag color="green">{course?.durationYears || 3} YEARS DURATION</Tag>
                  {course?.isComputer && <Tag color="purple">💻 COMPUTER LAB FEE: ₹1,500/SEAT</Tag>}
                </Space>
              </div>
            </Space>
          </div>

          <div>
            <Tag color="success" style={{ fontSize: '13px', padding: '4px 12px', fontWeight: 600 }}>
              <SafetyCertificateOutlined /> AKNU Affiliation Approved (2026-27)
            </Tag>
          </div>
        </div>
      </Card>

      {/* Overview Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: '12px' }}>Sanctioned Intake</Text>}
              value={sanctionedIntake}
              suffix="Seats"
              valueStyle={{ color: '#1e3c72', fontWeight: 700 }}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: '12px' }}>Convenor Quota (80%)</Text>}
              value={convenorQuota}
              suffix="Seats"
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: '12px' }}>Management Quota (20%)</Text>}
              value={managementQuota}
              suffix="Seats"
              valueStyle={{ color: '#faad14', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: '12px' }}>Enrolled Students</Text>}
              value={students.length}
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs for Course-Specific Details */}
      <Card style={{ borderRadius: 8 }}>
        <Tabs
          defaultActiveKey="matrix"
          items={[
            {
              key: 'matrix',
              label: (
                <span>
                  <AppstoreOutlined /> Seat Matrix & Intake
                </span>
              ),
              children: (
                <div>
                  <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }} style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="Program Name">{course?.name || courseCode}</Descriptions.Item>
                    <Descriptions.Item label="Course Code">{course?.code || courseCode}</Descriptions.Item>
                    <Descriptions.Item label="Academic Section">{course?.courseGroup || 'UG'}</Descriptions.Item>
                    <Descriptions.Item label="Degree Level">{course?.degreeLevel || 'UG'}</Descriptions.Item>
                    <Descriptions.Item label="Course Duration">{course?.durationYears || 3} Academic Years</Descriptions.Item>
                    <Descriptions.Item label="Affiliation Status">
                      <Badge status="success" text="Sanctioned & Ratified" />
                    </Descriptions.Item>
                  </Descriptions>

                  <Title level={5} style={{ margin: '16px 0 8px' }}>
                    Approved 3-Category Seat Allocation Matrix (2026-27)
                  </Title>
                  <Table
                    dataSource={[
                      {
                        category: 'Category-A: Convenor Quota (OAMDC / APICET / APPGCET)',
                        percentage: '80%',
                        seats: convenorQuota,
                        admitted: Math.min(students.filter((s) => s.quota === 'CONVENOR').length, convenorQuota),
                        rule: 'Admissions through Andhra Pradesh State Council of Higher Education (APSCHE)',
                      },
                      {
                        category: 'Category-B: Management Quota',
                        percentage: '20%',
                        seats: managementQuota,
                        admitted: Math.min(students.filter((s) => s.quota === 'MANAGEMENT').length, managementQuota),
                        rule: 'Merit-based institutional admissions with university ratification',
                      },
                      {
                        category: 'Spot Admissions / Lateral Entry',
                        percentage: 'Residual',
                        seats: 'As per vacancy',
                        admitted: students.filter((s) => s.quota === 'SPOT').length,
                        rule: 'Subject to university cutoff dates and eligibility compliance',
                      },
                    ]}
                    rowKey="category"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: 'Quota Category',
                        dataIndex: 'category',
                        key: 'category',
                        render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
                      },
                      { title: 'Share', dataIndex: 'percentage', key: 'percentage', width: 90 },
                      {
                        title: 'Sanctioned Seats',
                        dataIndex: 'seats',
                        key: 'seats',
                        width: 130,
                        render: (s) => <Tag color="blue" style={{ fontWeight: 700 }}>{s}</Tag>,
                      },
                      {
                        title: 'Enrolled in Portal',
                        dataIndex: 'admitted',
                        key: 'admitted',
                        width: 140,
                        render: (a) => <Tag color="green">{a} Registered</Tag>,
                      },
                      { title: 'Regulatory Guidelines', dataIndex: 'rule', key: 'rule' },
                    ]}
                  />

                  <Alert
                    style={{ marginTop: 16 }}
                    type="info"
                    showIcon
                    message="Affiliation Fee Calculation for this Academic Course"
                    description={
                      <div style={{ fontSize: '12px' }}>
                        <div>• Standard Course Affiliation Base Fee: <strong>₹25,000 / Academic Year</strong></div>
                        {course?.isComputer && (
                          <div>• Computer Lab Equipment Fee: <strong>₹1,500 × {sanctionedIntake} Seats = ₹90,000</strong></div>
                        )}
                        <div>• APSCHE & AKNU University Inspection Compliance: <strong>Satisfied</strong></div>
                      </div>
                    }
                  />
                </div>
              ),
            },
            {
              key: 'students',
              label: (
                <span>
                  <UserOutlined /> Enrolled Students ({filteredStudents.length})
                </span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                    <Input
                      placeholder="Search student name, hall ticket or APAAR ID..."
                      prefix={<SearchOutlined />}
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      style={{ maxWidth: 360 }}
                      allowClear
                    />
                    <Text type="secondary" style={{ fontSize: '12px', alignSelf: 'center' }}>
                      Showing {filteredStudents.length} of {students.length} students enrolled in {course?.name || courseCode}
                    </Text>
                  </div>

                  <Table
                    dataSource={filteredStudents}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    locale={{ emptyText: 'No student admissions enrolled under this program yet.' }}
                    columns={[
                      {
                        title: 'Admission / Roll #',
                        dataIndex: 'admissionNo',
                        key: 'admissionNo',
                        render: (ht) => <Tag color="geekblue">{ht || 'Pending Allotment'}</Tag>,
                      },
                      {
                        title: 'Student Name',
                        dataIndex: 'name',
                        key: 'name',
                        render: (n) => <span style={{ fontWeight: 600 }}>{n}</span>,
                      },
                      {
                        title: 'APAAR / ABC ID',
                        dataIndex: 'apaarId',
                        key: 'apaarId',
                        render: (id) => (
                          <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                            {id || 'N/A'}
                          </span>
                        ),
                      },
                      {
                        title: 'Quota',
                        dataIndex: 'quota',
                        key: 'quota',
                        render: (q) => {
                          const col = q === 'CONVENOR' ? 'blue' : q === 'MANAGEMENT' ? 'gold' : 'cyan';
                          return <Tag color={col}>{q || 'CONVENOR'}</Tag>;
                        },
                      },
                      {
                        title: 'Gender',
                        dataIndex: 'gender',
                        key: 'gender',
                        render: (g) => <Tag>{g}</Tag>,
                      },
                      {
                        title: 'Category',
                        dataIndex: 'category',
                        key: 'category',
                        render: (c) => <Tag>{c}</Tag>,
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (st) => <Tag color="success">{st || 'ACTIVE'}</Tag>,
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'faculty',
              label: (
                <span>
                  <TeamOutlined /> Department Faculty ({faculty.length})
                </span>
              ),
              children: (
                <div>
                  <Table
                    dataSource={faculty}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 5 }}
                    locale={{
                      emptyText: 'Department faculty list will be displayed here once updated in university records.',
                    }}
                    columns={[
                      { title: 'Faculty Name', dataIndex: 'name', key: 'name', render: (n) => <strong>{n}</strong> },
                      { title: 'Designation', dataIndex: 'designation', key: 'designation' },
                      { title: 'Qualification', dataIndex: 'qualification', key: 'qualification' },
                      {
                        title: 'Ratification Status',
                        dataIndex: 'isRatified',
                        key: 'isRatified',
                        render: (r) => (r ? <Tag color="success">AKNU RATIFIED</Tag> : <Tag color="warning">AD-HOC</Tag>),
                      },
                      { title: 'Contact Email', dataIndex: 'email', key: 'email' },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'proceedings',
              label: (
                <span>
                  <FileDoneOutlined /> Sanction Proceeding
                </span>
              ),
              children: (
                <div style={{ padding: '8px 0' }}>
                  <Alert
                    type="success"
                    showIcon
                    message="Official Sanction Order Details"
                    description={
                      <div>
                        <Paragraph style={{ margin: '8px 0 4px', fontSize: '13px' }}>
                          This academic course <strong>{course?.name} ({course?.code})</strong> was officially sanctioned by Adikavi Nannaya University, Rajamahendravaram under CDC Affiliation Order for Academic Year 2026-27.
                        </Paragraph>
                        <Space wrap style={{ marginTop: 8 }}>
                          <Button type="primary" size="small" icon={<FileDoneOutlined />}>
                            View Affiliation Order (AKNU/CDC/2026-27/{course?.code || 'ORD'})
                          </Button>
                          <Link to="/college/queries">
                            <Button size="small">Raise Query to Section Officer</Button>
                          </Link>
                        </Space>
                      </div>
                    }
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
