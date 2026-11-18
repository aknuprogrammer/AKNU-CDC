import React, { useEffect, useState } from 'react';
import { Table, Card, Input, Select, Space, Tag, Row, Col, Typography, Button, message } from 'antd';
import { SearchOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { Student, College, Course } from '../../api/types';

const { Title, Text } = Typography;

export const StudentVerificationPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCollege, setSelectedCollege] = useState<string | undefined>();
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>();
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [apaarSearch, setApaarSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, cRes, crsRes] = await Promise.all([
        api.students.list({
          collegeId: selectedCollege,
          courseId: selectedCourse,
          yearOfStudy: selectedYear,
        }),
        api.colleges.list(),
        api.courses.list(),
      ]);
      setStudents(sRes.data);
      setColleges(cRes.data);
      setCourses(crsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCollege, selectedCourse, selectedYear]);

  const filteredStudents = students.filter((s) => {
    if (!apaarSearch) return true;
    const q = apaarSearch.toLowerCase();
    return (
      s.apaarId.toLowerCase().includes(q) ||
      s.admissionNo.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: '#002147' }}>
          Enrolled Student Admissions & APAAR ID Registry
        </Title>
        <Text type="secondary">
          University-wide verification of student admissions, APAAR ID uniqueness across colleges, and quota limits
        </Text>
      </div>

      <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search APAAR ID, Admission No, or Name..."
              value={apaarSearch}
              onChange={(e) => setApaarSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              showSearch
              placeholder="Filter by College"
              allowClear
              style={{ width: '100%' }}
              value={selectedCollege}
              onChange={setSelectedCollege}
              options={colleges.map((c) => ({
                label: `[${c.code}] ${c.name}`,
                value: c.id,
              }))}
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              placeholder="Filter by Course"
              allowClear
              style={{ width: '100%' }}
              value={selectedCourse}
              onChange={setSelectedCourse}
              options={courses.map((crs) => ({
                label: crs.name,
                value: crs.id,
              }))}
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              placeholder="Year of Study"
              allowClear
              style={{ width: '100%' }}
              value={selectedYear}
              onChange={setSelectedYear}
              options={[
                { label: '1st Year', value: 1 },
                { label: '2nd Year', value: 2 },
                { label: '3rd Year', value: 3 },
                { label: '4th Year', value: 4 },
              ]}
            />
          </Col>
        </Row>

        <Table
          dataSource={filteredStudents}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'APAAR ID (National Registry)',
              dataIndex: 'apaarId',
              key: 'apaarId',
              render: (id) => (
                <Space>
                  <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                  <Text strong copyable>{id}</Text>
                </Space>
              ),
            },
            {
              title: 'Admission No',
              dataIndex: 'admissionNo',
              key: 'admissionNo',
            },
            {
              title: 'Student & Father Name',
              key: 'name',
              render: (_, r) => (
                <div>
                  <Text strong>{r.name}</Text>
                  <div style={{ fontSize: '11px', color: '#888' }}>S/o / D/o: {r.fatherName}</div>
                </div>
              ),
            },
            {
              title: 'College',
              dataIndex: 'collegeName',
              key: 'collegeName',
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
                <Space size={2} direction="vertical">
                  <Tag color={r.quota === 'CONVENOR' ? 'green' : r.quota === 'SPOT' ? 'cyan' : 'gold'}>
                    {r.quota} Quota
                  </Tag>
                  <Tag color="purple">{r.category} • {r.gender}</Tag>
                </Space>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (st) => <Tag color={st === 'ACTIVE' ? 'green' : 'orange'}>{st}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
};
