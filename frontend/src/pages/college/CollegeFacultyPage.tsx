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
  message,
} from 'antd';
import { TeamOutlined, PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Faculty, Course } from '../../api/types';

const { Title, Text } = Typography;

export const CollegeFacultyPage: React.FC = () => {
  const { college } = useAuth();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    if (!college) return;
    setLoading(true);
    try {
      const [fRes, cRes] = await Promise.all([
        api.faculty.list(college.id),
        api.courses.list(),
      ]);
      setFaculty(fRes.data);
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

  const handleCreate = async (values: any) => {
    try {
      await api.faculty.create({
        ...values,
        collegeId: college!.id,
      });
      message.success('Faculty member added to college register!');
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error('Failed to add faculty member');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1e3c72' }}>
            College Teaching Faculty Register & Ratification
          </Title>
          <Text type="secondary">
            Teaching staff profiles, UGC qualification compliance, PAN, and University ratification status
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalOpen(true)}
          style={{ background: '#1e3c72' }}
        >
          Add Faculty Member
        </Button>
      </div>

      <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          dataSource={faculty}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'Faculty Name',
              dataIndex: 'name',
              key: 'name',
              render: (name) => <Text strong>{name}</Text>,
            },
            {
              title: 'Designation',
              dataIndex: 'designation',
              key: 'designation',
              render: (des) => <Tag color="blue">{des}</Tag>,
            },
            {
              title: 'Qualification',
              dataIndex: 'qualification',
              key: 'qualification',
              render: (q) => <Text style={{ fontSize: '13px' }}>{q}</Text>,
            },
            {
              title: 'PAN & Aadhar Last 4',
              key: 'compliance',
              render: (_, r) => (
                <div style={{ fontSize: '12px' }}>
                  <div>PAN: <code>{r.panNumber}</code></div>
                  <Text type="secondary">Aadhaar: **** **** {r.aadharLast4}</Text>
                </div>
              ),
            },
            {
              title: 'University Ratification',
              key: 'ratify',
              render: (_, r) =>
                r.isRatified ? (
                  <Tag color="green" icon={<SafetyCertificateOutlined />}>
                    Ratified ({r.ratifyYear || '2023'})
                  </Tag>
                ) : (
                  <Tag color="orange">Pending Ratification</Tag>
                ),
            },
            {
              title: 'Contact',
              key: 'contact',
              render: (_, r) => (
                <div style={{ fontSize: '12px' }}>
                  <div>📱 {r.mobile}</div>
                  <Text type="secondary">{r.email}</Text>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Add Faculty Member"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form layout="vertical" form={form} onFinish={handleCreate}>
          <Form.Item name="name" label="Faculty Full Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Dr. K. Satyanarayana" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="designation" label="Designation" initialValue="Assistant Professor">
                <Select
                  options={[
                    { label: 'Principal', value: 'Principal' },
                    { label: 'Professor & HOD', value: 'Professor & HOD' },
                    { label: 'Associate Professor', value: 'Associate Professor' },
                    { label: 'Assistant Professor', value: 'Assistant Professor' },
                    { label: 'Lecturer', value: 'Lecturer' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="qualification" label="Highest Qualification" rules={[{ required: true }]}>
                <Input placeholder="e.g. Ph.D, NET, SET, M.Sc" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="panNumber" label="PAN Card Number" rules={[{ required: true }]}>
                <Input placeholder="ABCDE1234F" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="aadharLast4" label="Aadhaar Last 4 Digits" rules={[{ required: true }]}>
                <Input maxLength={4} placeholder="4321" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="mobile" label="Mobile Number" rules={[{ required: true }]}>
                <Input placeholder="9848011223" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email Address" rules={[{ required: true }]}>
                <Input placeholder="faculty@college.edu.in" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};
