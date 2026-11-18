import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, Button, Select, Space, Typography, Modal, Form, Input, InputNumber, Switch, message } from 'antd';
import { BookOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { Course } from '../../api/types';

const { Title, Text } = Typography;

export const CoursesMasterPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [createModal, setCreateModal] = useState(false);
  const [form] = Form.useForm();

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await api.courses.list(selectedGroup === 'ALL' ? undefined : selectedGroup);
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [selectedGroup]);

  const handleCreate = async (values: any) => {
    try {
      await api.courses.create(values);
      message.success('New academic course registered successfully!');
      setCreateModal(false);
      form.resetFields();
      loadCourses();
    } catch (err) {
      message.error('Failed to create course');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#002147' }}>
            Academic Courses & Programs Master
          </Title>
          <Text type="secondary">
            UG (4 Years NEP), PG (2 Years), Professional LAW (3/5 Years), Education (B.Ed 2 Years)
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModal(true)}
          style={{ background: '#002147' }}
        >
          Add Approved Course
        </Button>
      </div>

      <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Text strong>Filter by Section:</Text>
            <Select
              style={{ width: 240 }}
              placeholder={courses.length === 0 ? 'No course groups created' : 'Filter by Section'}
              value={courses.length > 0 ? selectedGroup : undefined}
              onChange={setSelectedGroup}
              disabled={courses.length === 0}
              options={
                courses.length === 0
                  ? []
                  : [
                      { label: 'All Course Groups', value: 'ALL' },
                      ...Array.from(new Set(courses.map((c) => c.courseGroup).filter(Boolean))).map((g) => ({
                        label: g,
                        value: g,
                      })),
                    ]
              }
              notFoundContent="No course groups created"
            />
          </Space>
        </div>

        <Table
          dataSource={courses}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'Code',
              dataIndex: 'code',
              key: 'code',
              render: (code) => <Tag color="geekblue" style={{ fontWeight: 700 }}>{code}</Tag>,
            },
            {
              title: 'Program Name',
              dataIndex: 'name',
              key: 'name',
              render: (name) => <Text strong>{name}</Text>,
            },
            {
              title: 'Section / Group',
              dataIndex: 'courseGroup',
              key: 'courseGroup',
              render: (grp) => <Tag color="blue">{grp}</Tag>,
            },
            {
              title: 'Duration',
              dataIndex: 'durationYears',
              key: 'durationYears',
              render: (dur) => `${dur} Years`,
            },
            {
              title: 'Degree Level',
              dataIndex: 'degreeLevel',
              key: 'degreeLevel',
              render: (level) => <Tag color="cyan">{level}</Tag>,
            },
            {
              title: 'Computer Lab Section',
              dataIndex: 'isComputer',
              key: 'isComputer',
              render: (isComp) =>
                isComp ? <Tag color="purple">Computer Subject</Tag> : <Tag color="default">General</Tag>,
            },
            {
              title: 'Status',
              dataIndex: 'active',
              key: 'active',
              render: (active) => (active ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>),
            },
          ]}
        />
      </Card>

      <Modal
        title="Add Approved Academic Course"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={() => form.submit()}
      >
        <Form layout="vertical" form={form} onFinish={handleCreate}>
          <Form.Item name="code" label="Course Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. BSC-DATA-SCI, B.Ed, MCA" />
          </Form.Item>
          <Form.Item name="name" label="Course Full Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. B.Sc (Data Science & Analytics)" />
          </Form.Item>
          <Form.Item name="courseGroup" label="Course Group" initialValue="UG">
            <Select
              options={[
                { label: 'UG', value: 'UG' },
                { label: 'PG', value: 'PG' },
                { label: 'MBA_MCA', value: 'MBA_MCA' },
                { label: 'LAW', value: 'LAW' },
                { label: 'EDUCATION', value: 'EDUCATION' },
                { label: 'PHYSICAL_EDUCATION', value: 'PHYSICAL_EDUCATION' },
              ]}
            />
          </Form.Item>
          <Form.Item name="durationYears" label="Duration (Years)" initialValue={4}>
            <InputNumber min={1} max={5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isComputer" label="Has Computer Lab Sections?" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
