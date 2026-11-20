import React, { useEffect, useState } from 'react';
import { Table, Card, Input, Select, Space, Tag, Row, Col, Typography, Button, message } from 'antd';
import { SearchOutlined, SafetyCertificateOutlined, FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { Student, College, Course } from '../../api/types';
import * as XLSX from 'xlsx';

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

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      message.warning('No data to export');
      return;
    }
    const rows = filteredStudents.map((s) => ({
      'APAAR ID': s.apaarId,
      'Admission No': s.admissionNo,
      'Student Name': s.name,
      'Father Name': s.fatherName,
      'College': s.collegeName,
      'Course': s.courseName || s.courseCode,
      'Year of Study': s.yearOfStudy,
      'Quota': s.quota,
      'Category': s.category,
      'Gender': s.gender,
      'Status': s.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'students_export.xlsx');
    message.success('Exported to Excel successfully!');
  };

  const handleExportPdf = () => {
    if (filteredStudents.length === 0) {
      message.warning('No data to export');
      return;
    }
    const rows = filteredStudents
      .map(
        (s) =>
          `<tr>
            <td>${s.apaarId}</td>
            <td>${s.admissionNo}</td>
            <td>${s.name}</td>
            <td>${s.collegeName}</td>
            <td>${s.courseName || s.courseCode}</td>
            <td>Year ${s.yearOfStudy}</td>
            <td>${s.quota} Quota</td>
            <td>${s.status}</td>
          </tr>`,
      )
      .join('');
    const html = `
      <html>
        <head>
          <title>Student Data Export – AKNU CDC</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            h2 { color: #002147; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #002147; color: #fff; padding: 6px 8px; text-align: left; }
            td { border: 1px solid #ddd; padding: 5px 8px; }
            tr:nth-child(even) { background: #f9f9f9; }
          </style>
        </head>
        <body>
          <h2>Enrolled Student Admissions &amp; APAAR ID Registry</h2>
          <p>Total Records: ${filteredStudents.length}</p>
          <table>
            <thead>
              <tr>
                <th>APAAR ID</th><th>Admission No</th><th>Student Name</th>
                <th>College</th><th>Course</th><th>Year</th><th>Quota</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    } else {
      message.error('Popup blocked – please allow popups for this site');
    }
  };

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
          <Col xs={24} md={5}>
            <Space>
              <Button
                icon={<FilePdfOutlined />}
                onClick={handleExportPdf}
                style={{ background: '#d32f2f', color: '#fff', borderColor: '#d32f2f' }}
              >
                Export PDF
              </Button>
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExportExcel}
                style={{ background: '#217346', color: '#fff', borderColor: '#217346' }}
              >
                Export Excel
              </Button>
            </Space>
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
