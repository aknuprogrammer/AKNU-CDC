import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Tabs,
  Space,
  Input,
  Modal,
  Form,
  Select,
  Typography,
  message,
} from 'antd';
import {
  CommentOutlined,
  HistoryOutlined,
  PlusOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { api } from '../../api/client';
import { WorkflowQuery, College } from '../../api/types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const WorkflowQueriesPage: React.FC = () => {
  const [queries, setQueries] = useState<WorkflowQuery[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);

  const [createModal, setCreateModal] = useState(false);
  const [respondModal, setRespondModal] = useState(false);
  const [activeQuery, setActiveQuery] = useState<WorkflowQuery | null>(null);
  const [responseForm] = Form.useForm();
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [qRes, aRes, cRes] = await Promise.all([
        api.workflow.listQueries(),
        api.workflow.getAuditLogs(50),
        api.colleges.list(),
      ]);
      setQueries(qRes.data);
      setAuditLogs(aRes.data);
      setColleges(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateQuery = async (values: any) => {
    try {
      await api.workflow.createQuery(values);
      message.success('Clarification query dispatched to college!');
      setCreateModal(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error('Failed to create query');
    }
  };

  const handleRespond = async (values: { responseText: string }) => {
    if (!activeQuery) return;
    try {
      await api.workflow.respondQuery(activeQuery.id, values.responseText);
      message.success('Response recorded and query resolved!');
      setRespondModal(false);
      responseForm.resetFields();
      loadData();
    } catch (err) {
      message.error('Failed to respond to query');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#002147' }}>
            Workflow Hierarchy, Queries & Audit Trail
          </Title>
          <Text type="secondary">
            Clerk → Superintendent → Dean review pipeline, clarification threads, and immutable audit logs
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModal(true)}
          style={{ background: '#002147' }}
        >
          Raise Query to College
        </Button>
      </div>

      <Tabs
        defaultActiveKey="queries"
        items={[
          {
            key: 'queries',
            label: (
              <span>
                <CommentOutlined /> Course Section Queries ({queries.length})
              </span>
            ),
            children: (
              <Card style={{ borderRadius: '8px' }}>
                <Table
                  dataSource={queries}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 8 }}
                  columns={[
                    {
                      title: 'College',
                      key: 'col',
                      render: (_, r) => <Text strong>{r.collegeName}</Text>,
                    },
                    {
                      title: 'Section & Stage',
                      key: 'stage',
                      render: (_, r) => (
                        <Space size={2} direction="vertical">
                          <Tag color="blue">{r.courseGroupId}</Tag>
                          <Tag color="cyan">Stage: {r.stage}</Tag>
                        </Space>
                      ),
                    },
                    {
                      title: 'Subject & Query',
                      key: 'subject',
                      render: (_, r) => (
                        <div>
                          <Text strong>{r.subject}</Text>
                          <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                            {r.queryText}
                          </Paragraph>
                          {r.responseText && (
                            <div style={{ background: '#f6ffed', padding: '4px 8px', borderRadius: 4, marginTop: 4, fontSize: '12px', borderLeft: '3px solid #52c41a' }}>
                              <strong>Response:</strong> {r.responseText}
                            </div>
                          )}
                        </div>
                      ),
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
                          Respond
                        </Button>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'audit',
            label: (
              <span>
                <HistoryOutlined /> System Audit Trail ({auditLogs.length})
              </span>
            ),
            children: (
              <Card style={{ borderRadius: '8px' }}>
                <Table
                  dataSource={auditLogs}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: 'Timestamp',
                      dataIndex: 'createdAt',
                      key: 'createdAt',
                      render: (t) => new Date(t).toLocaleString(),
                    },
                    {
                      title: 'Action Performed',
                      dataIndex: 'action',
                      key: 'action',
                      render: (act) => <Tag color="geekblue">{act}</Tag>,
                    },
                    {
                      title: 'Entity',
                      dataIndex: 'entityName',
                      key: 'entityName',
                      render: (e) => <Tag color="purple">{e}</Tag>,
                    },
                    {
                      title: 'Details / Payload',
                      dataIndex: 'newValue',
                      key: 'newValue',
                      ellipsis: true,
                      render: (val) => <span style={{ fontSize: '12px' }}>{val || 'N/A'}</span>,
                    },
                    {
                      title: 'IP Address',
                      dataIndex: 'ipAddress',
                      key: 'ipAddress',
                      render: (ip) => <code>{ip}</code>,
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Raise Query Modal */}
      <Modal
        title="Raise Query or Defect Notice to College"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={() => form.submit()}
      >
        <Form layout="vertical" form={form} onFinish={handleCreateQuery}>
          <Form.Item name="collegeId" label="College" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select College"
              options={colleges.map((c) => ({
                label: `[${c.code}] ${c.name}`,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="courseGroupId" label="Course Section" initialValue="UG">
            <Select
              options={[
                { label: 'UG', value: 'UG' },
                { label: 'PG', value: 'PG' },
                { label: 'MBA_MCA', value: 'MBA_MCA' },
                { label: 'LAW', value: 'LAW' },
                { label: 'EDUCATION', value: 'EDUCATION' },
              ]}
            />
          </Form.Item>

          <Form.Item name="stage" label="Workflow Review Stage" initialValue="SUPERINTENDENT">
            <Select
              options={[
                { label: 'Clerk Review', value: 'CLERK' },
                { label: 'Superintendent Review', value: 'SUPERINTENDENT' },
                { label: 'Dean CDC Verification', value: 'DEAN' },
              ]}
            />
          </Form.Item>

          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="e.g. Discrepancy in spot admission quotas" />
          </Form.Item>

          <Form.Item name="queryText" label="Query / Instruction Details" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Describe the document discrepancy or requirement..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Respond Modal */}
      <Modal
        title="Respond & Resolve Workflow Query"
        open={respondModal}
        onCancel={() => setRespondModal(false)}
        onOk={() => responseForm.submit()}
      >
        {activeQuery && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Query from {activeQuery.fromUserName}:</Text>
            <div style={{ fontWeight: 600, color: '#002147' }}>{activeQuery.subject}</div>
            <Paragraph style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 6, fontSize: '12px' }}>
              {activeQuery.queryText}
            </Paragraph>
          </div>
        )}
        <Form layout="vertical" form={responseForm} onFinish={handleRespond}>
          <Form.Item name="responseText" label="Official Response / Clarification" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Enter resolution details..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
