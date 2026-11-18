import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Alert,
  Drawer,
  Modal,
  Form,
  Input,
  message,
} from 'antd';
import {
  FileDoneOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  QrcodeOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Proceeding } from '../../api/types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const CollegeProceedingsPage: React.FC = () => {
  const { college } = useAuth();
  const [proceedings, setProceedings] = useState<Proceeding[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProc, setSelectedProc] = useState<Proceeding | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [intakeChangeModal, setIntakeChangeModal] = useState(false);
  const [form] = Form.useForm();

  const loadProceedings = async () => {
    if (!college) return;
    setLoading(true);
    try {
      const res = await api.proceedings.list({ collegeId: college.id });
      setProceedings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProceedings();
  }, [college]);

  const handleAcknowledge = async (id: string) => {
    try {
      await api.proceedings.acknowledge(id);
      message.success('Affiliation Proceeding Acknowledged! Sanctioned intake is now locked as official cap.');
      loadProceedings();
      if (selectedProc && selectedProc.id === id) {
        setSelectedProc({ ...selectedProc, status: 'ACKNOWLEDGED' });
      }
    } catch (err) {
      message.error('Acknowledgement failed');
    }
  };

  const handleIntakeChangeRequest = async (values: any) => {
    try {
      await api.workflow.createQuery({
        collegeId: college!.id,
        courseGroupId: selectedProc?.courseGroupId || 'UG',
        stage: 'COLLEGE',
        subject: `Request for Sanctioned Intake Change - ${values.courseName}`,
        queryText: `The College requests revision of intake for ${values.courseName} from ${values.currentIntake} to ${values.requestedIntake}. Reason: ${values.reason}`,
      });
      message.success('Intake modification request submitted to CDC Section Officer for review!');
      setIntakeChangeModal(false);
      form.resetFields();
    } catch (err) {
      message.error('Failed to submit request');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1e3c72' }}>
            Official Affiliation Orders & Sanctioned Intakes
          </Title>
          <Text type="secondary">
            Digitally signed (DSC) orders from Adikavi Nannaya University. Formal acknowledgement sets the admission cap.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => setIntakeChangeModal(true)}
          style={{ background: '#1e3c72' }}
        >
          Request Intake Change
        </Button>
      </div>

      <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          dataSource={proceedings}
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={[
            {
              title: 'Proceeding No',
              dataIndex: 'proceedingNumber',
              key: 'proceedingNumber',
              render: (p) => <Text strong>{p}</Text>,
            },
            {
              title: 'Order Type',
              dataIndex: 'templateType',
              key: 'templateType',
              render: (t) => <Tag color="cyan">{t}</Tag>,
            },
            {
              title: 'Section',
              dataIndex: 'courseGroupId',
              key: 'courseGroupId',
              render: (s) => <Tag color="blue">{s}</Tag>,
            },
            {
              title: 'Subject',
              dataIndex: 'subject',
              key: 'subject',
              ellipsis: true,
              render: (sub) => <span style={{ fontSize: '13px' }}>{sub}</span>,
            },
            {
              title: 'Digital Signature (DSC)',
              key: 'dsc',
              render: (_, r) =>
                r.dscSignatureHash ? (
                  <Tag color="green" icon={<SafetyCertificateOutlined />}>
                    DSC Verified
                  </Tag>
                ) : (
                  <Tag color="orange">Pending Sign</Tag>
                ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (st) => (
                <Tag color={st === 'ACKNOWLEDGED' ? 'green' : 'gold'} style={{ fontWeight: 600 }}>
                  {st}
                </Tag>
              ),
            },
            {
              title: 'Actions',
              key: 'act',
              render: (_, r) => (
                <Space size="small">
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => {
                      setSelectedProc(r);
                      setDrawerOpen(true);
                    }}
                  >
                    View Order
                  </Button>
                  {r.status === 'ISSUED' && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleAcknowledge(r.id)}
                      style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    >
                      Acknowledge
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* View Order Drawer */}
      <Drawer
        title={selectedProc?.proceedingNumber || 'Proceeding Details'}
        placement="right"
        width={680}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedProc && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message={
                selectedProc.status === 'ACKNOWLEDGED'
                  ? 'Order Acknowledged by Principal. Binding Admission Cap Active.'
                  : 'Action Required: Please click Acknowledge below to confirm receipt.'
              }
              type={selectedProc.status === 'ACKNOWLEDGED' ? 'success' : 'warning'}
              showIcon
            />

            <div>
              <Text type="secondary">Subject:</Text>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e3c72' }}>
                {selectedProc.subject}
              </div>
            </div>

            <Card size="small" style={{ background: '#fafafa' }}>
              <Paragraph style={{ whiteSpace: 'pre-line', margin: 0, fontSize: '13px' }}>
                {selectedProc.bodyTemplate}
              </Paragraph>
            </Card>

            <Title level={5}>Approved Sanctioned Intake Cap Matrix:</Title>
            <Table
              size="small"
              pagination={false}
              dataSource={selectedProc.items || []}
              rowKey="courseName"
              columns={[
                { title: 'Course Name', dataIndex: 'courseName', key: 'courseName' },
                { title: 'Total Intake', dataIndex: 'sanctionedIntake', key: 'sanctionedIntake' },
                { title: 'Convenor (CQ)', dataIndex: 'convenorQuota', key: 'convenorQuota' },
                { title: 'Spot (SA)', dataIndex: 'spotAdmission', key: 'spotAdmission' },
                { title: 'Management (MQ)', dataIndex: 'managementQuota', key: 'managementQuota' },
              ]}
            />

            <div>
              <Text strong>Regulatory Conditions:</Text>
              <Paragraph style={{ whiteSpace: 'pre-line', fontSize: '12px', color: '#666' }}>
                {selectedProc.conditions}
              </Paragraph>
            </div>

            <div style={{ background: '#f6ffed', padding: 12, borderRadius: 6, border: '1px solid #b7eb8f' }}>
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                🔒 Digital Signature Certificate:
              </Text>
              <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                {selectedProc.dscSignatureHash}
              </code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                icon={<QrcodeOutlined />}
                onClick={() => window.open(`/verify-proceeding?code=${selectedProc.qrVerificationCode}`, '_blank')}
              >
                Verify QR Code Authenticity
              </Button>

              {selectedProc.status === 'ISSUED' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleAcknowledge(selectedProc.id)}
                  style={{ background: '#52c41a', border: 'none' }}
                >
                  Confirm & Acknowledge Intake
                </Button>
              )}
            </div>
          </Space>
        )}
      </Drawer>

      {/* Request Intake Change Modal */}
      <Modal
        title="Request Course Intake Revision / Change"
        open={intakeChangeModal}
        onCancel={() => setIntakeChangeModal(false)}
        onOk={() => form.submit()}
      >
        <Form layout="vertical" form={form} onFinish={handleIntakeChangeRequest}>
          <Form.Item name="courseName" label="Course Name" initialValue="B.Sc (Mathematics, Physics, Computer Science)">
            <Input />
          </Form.Item>
          <Form.Item name="currentIntake" label="Current Sanctioned Intake" initialValue={60}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="requestedIntake" label="Requested New Intake Cap" rules={[{ required: true }]}>
            <Input type="number" placeholder="e.g. 90 or 120" />
          </Form.Item>
          <Form.Item name="reason" label="Justification / Demand by Students" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="State classroom, lab infrastructure, and faculty readiness..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
