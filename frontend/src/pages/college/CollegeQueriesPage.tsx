import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  message,
} from 'antd';
import { CommentOutlined, PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { WorkflowQuery } from '../../api/types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const CollegeQueriesPage: React.FC = () => {
  const { college } = useAuth();
  const [queries, setQueries] = useState<WorkflowQuery[]>([]);
  const [loading, setLoading] = useState(true);

  const [createModal, setCreateModal] = useState(false);
  const [respondModal, setRespondModal] = useState(false);
  const [activeQuery, setActiveQuery] = useState<WorkflowQuery | null>(null);

  const [form] = Form.useForm();
  const [responseForm] = Form.useForm();

  const loadQueries = async () => {
    if (!college) return;
    setLoading(true);
    try {
      const res = await api.workflow.listQueries({ collegeId: college.id });
      setQueries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, [college]);

  const handleCreateQuery = async (values: any) => {
    try {
      await api.workflow.createQuery({
        collegeId: college!.id,
        courseGroupId: values.courseGroupId,
        stage: 'COLLEGE',
        subject: values.subject,
        queryText: values.queryText,
      });
      message.success('Query submitted to CDC Section Officer!');
      setCreateModal(false);
      form.resetFields();
      loadQueries();
    } catch (err) {
      message.error('Failed to submit query');
    }
  };

  const handleRespond = async (values: { responseText: string }) => {
    if (!activeQuery) return;
    try {
      await api.workflow.respondQuery(activeQuery.id, values.responseText);
      message.success('Clarification response submitted!');
      setRespondModal(false);
      responseForm.resetFields();
      loadQueries();
    } catch (err) {
      message.error('Failed to submit response');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1e3c72' }}>
            CDC Section Queries & Official Support
          </Title>
          <Text type="secondary">
            Direct communication channel with CDC Section Officers, Superintendents, and Clerks
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModal(true)}
          style={{ background: '#1e3c72' }}
        >
          Submit Query to University
        </Button>
      </div>

      <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          dataSource={queries}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'Subject & Inquiry',
              key: 'subj',
              render: (_, r) => (
                <div>
                  <Text strong>{r.subject}</Text>
                  <Paragraph style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                    {r.queryText}
                  </Paragraph>
                  {r.responseText && (
                    <div style={{ background: '#f6ffed', padding: '6px 10px', borderRadius: 4, marginTop: 6, borderLeft: '3px solid #52c41a' }}>
                      <Text strong style={{ color: '#52c41a' }}>Official Response: </Text>
                      <span style={{ fontSize: '12px' }}>{r.responseText}</span>
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'Section',
              dataIndex: 'courseGroupId',
              key: 'courseGroupId',
              render: (g) => <Tag color="blue">{g}</Tag>,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (st) => (
                <Tag color={st === 'RESOLVED' ? 'green' : 'orange'}>
                  {st}
                </Tag>
              ),
            },
            {
              title: 'Action',
              key: 'act',
              render: (_, r) => (
                <Button
                  size="small"
                  disabled={r.status === 'RESOLVED'}
                  onClick={() => {
                    setActiveQuery(r);
                    setRespondModal(true);
                  }}
                >
                  Reply / Clarify
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {/* Submit Query Modal */}
      <Modal
        title="Submit Inquiry to CDC Section Officer"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={() => form.submit()}
      >
        <Form layout="vertical" form={form} onFinish={handleCreateQuery}>
          <Form.Item name="courseGroupId" label="Course Section" initialValue="UG">
            <Select
              options={[
                { label: 'UG Section', value: 'UG' },
                { label: 'PG Section', value: 'PG' },
                { label: 'MBA & MCA Section', value: 'MBA_MCA' },
                { label: 'LAW Section', value: 'LAW' },
                { label: 'Education Section', value: 'EDUCATION' },
              ]}
            />
          </Form.Item>
          <Form.Item name="subject" label="Subject / Purpose" rules={[{ required: true }]}>
            <Input placeholder="e.g. Affiliation fee slab calculation clarification" />
          </Form.Item>
          <Form.Item name="queryText" label="Detailed Explanation" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Type your query or document clarification here..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reply Modal */}
      <Modal
        title="Reply / Provide Clarification"
        open={respondModal}
        onCancel={() => setRespondModal(false)}
        onOk={() => responseForm.submit()}
      >
        {activeQuery && (
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary">Inquiry Subject:</Text>
            <div style={{ fontWeight: 600 }}>{activeQuery.subject}</div>
          </div>
        )}
        <Form layout="vertical" form={responseForm} onFinish={handleRespond}>
          <Form.Item name="responseText" label="Your Response" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Type your clarification..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
