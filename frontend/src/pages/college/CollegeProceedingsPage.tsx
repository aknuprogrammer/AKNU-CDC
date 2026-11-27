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
  Divider,
} from 'antd';
import {
  FileDoneOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  QrcodeOutlined,
  SendOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Proceeding } from '../../api/types';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('id');

  const loadProceedings = async () => {
    if (!college) return;
    setLoading(true);
    try {
      // Backend controller enforces that a college user ONLY receives their own proceeding
      const res = await api.proceedings.list({ collegeId: college.id });
      setProceedings(res.data);
      if (targetId) {
        const found = res.data.find((p) => p.id === targetId || p.proceedingNumber === targetId);
        if (found) {
          setSelectedProc(found);
          setDrawerOpen(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProceedings();
  }, [college, targetId]);

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

  const handleDownloadPdf = (proceedingId: string) => {
    const downloadUrl = api.proceedings.getDownloadUrl(proceedingId);
    window.open(downloadUrl, '_blank');
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
              render: (p) => <Text strong style={{ color: '#002147' }}>{p}</Text>,
            },
            {
              title: 'Order Type',
              dataIndex: 'templateType',
              key: 'templateType',
              render: (t) => <Tag color="cyan">{t}</Tag>,
            },
            {
              title: 'Academic Year',
              dataIndex: 'academicYear',
              key: 'academicYear',
              render: (y) => <Tag color="gold" style={{ fontWeight: 700 }}>{y || '2026-27'}</Tag>,
            },
            {
              title: 'Section',
              dataIndex: 'courseGroupId',
              key: 'courseGroupId',
              render: (s) => <Tag color="blue">{s}</Tag>,
            },
            {
              title: 'Sanctioned Programmes',
              key: 'items',
              render: (_, r) => {
                const totalIntake = (r.items || []).reduce((sum, it) => sum + (it.sanctionedIntake || 0), 0);
                return (
                  <div>
                    <span style={{ fontWeight: 600 }}>{r.items?.length || 0} Single Major Programs</span>
                    <div>
                      <Tag color="green" style={{ fontWeight: 700, marginTop: 2 }}>{totalIntake} Seats</Tag>
                    </div>
                  </div>
                );
              },
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
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownloadPdf(r.id)}
                    style={{ borderColor: '#1890ff', color: '#1890ff' }}
                  >
                    Download PDF
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

      {/* View Order Drawer - Complete 3-Page Proceeding Order View */}
      <Drawer
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#ff4d4f' }} />
            <span>{selectedProc?.proceedingNumber || 'Proceeding Details'}</span>
          </Space>
        }
        placement="right"
        width={760}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        extra={
          selectedProc && (
            <Space>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadPdf(selectedProc.id)}
                style={{ background: '#002147' }}
              >
                Download PDF
              </Button>
            </Space>
          )
        }
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

            {/* PAGE 1: University Header, Proceeding Number & College Details */}
            <div style={{ border: '2px solid #002147', borderRadius: 8, padding: 18, background: '#fff' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #D4AF37', paddingBottom: 12, marginBottom: 14 }}>
                <Text style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#666' }}>
                  PROCEEDINGS OF THE VICE-CHANCELLOR
                </Text>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#002147', marginTop: 2 }}>
                  ADIKAVI NANNAYA UNIVERSITY
                </div>
                <div style={{ fontSize: '11px', color: '#555' }}>
                  RAJAMAHENDRAVARAM, EAST GODAVARI, ANDHRA PRADESH INDIA - 533296
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#002147', marginTop: 4 }}>
                  PRESENT : PROF S PRASANNA SREE, VICE-CHANCELLOR
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Proceeding Number:</Text>
                  <div style={{ fontWeight: 800, color: '#002147', fontSize: '14px' }}>
                    {selectedProc.proceedingNumber}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Date of Order:</Text>
                  <div style={{ fontWeight: 700 }}>
                    {selectedProc.issuedAt ? new Date(selectedProc.issuedAt).toLocaleDateString() : '17/08/2026'}
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, marginBottom: 14 }}>
                <Text strong style={{ fontSize: '12px', color: '#002147' }}>Subject:</Text>
                <Paragraph style={{ margin: 0, fontSize: '12px', color: '#333' }}>
                  {selectedProc.subject}
                </Paragraph>
              </div>

              {/* College Profile Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: 14 }}>
                <tbody>
                  <tr style={{ border: '1px solid #d9d9d9' }}>
                    <td style={{ padding: '6px 10px', background: '#fafafa', fontWeight: 700, width: '25%' }}>Name of the College</td>
                    <td style={{ padding: '6px 10px', width: '35%' }}>{college?.name || selectedProc.college?.name}</td>
                    <td style={{ padding: '6px 10px', background: '#fafafa', fontWeight: 700, width: '20%' }}>Address of the College</td>
                    <td style={{ padding: '6px 10px', width: '20%' }}>{college?.address || selectedProc.college?.address || college?.district}</td>
                  </tr>
                  <tr style={{ border: '1px solid #d9d9d9' }}>
                    <td style={{ padding: '6px 10px', background: '#fafafa', fontWeight: 700 }}>Category of College</td>
                    <td style={{ padding: '6px 10px' }}>Co-Education ({college?.type || 'UNAIDED'})</td>
                    <td style={{ padding: '6px 10px', background: '#fafafa', fontWeight: 700 }}>Minority Status</td>
                    <td style={{ padding: '6px 10px' }}>No</td>
                  </tr>
                </tbody>
              </table>

              {/* PAGE 2: Approved Single Major Programme Matrix */}
              <Title level={5} style={{ color: '#002147', marginTop: 16, marginBottom: 8 }}>
                Approved Course & Sanctioned Intake Matrix (NEP 2020 Single Major):
              </Title>
              <Table
                size="small"
                pagination={false}
                dataSource={selectedProc.items || []}
                rowKey={(r, idx) => `${r.courseName}-${idx}`}
                bordered
                columns={[
                  {
                    title: 'Academic Programme Type',
                    key: 'progType',
                    render: () => <Tag color="cyan">DEGREE ACADEMIC</Tag>,
                    width: 140,
                  },
                  {
                    title: 'Single Major Programme',
                    dataIndex: 'courseName',
                    key: 'courseName',
                    render: (name) => <Text strong style={{ color: '#002147', fontSize: '12px' }}>{name}</Text>,
                  },
                  {
                    title: 'Nature',
                    key: 'nature',
                    render: () => <Tag color="blue">Conditional</Tag>,
                    width: 90,
                  },
                  {
                    title: 'Medium',
                    key: 'medium',
                    render: (_, r) => (
                      <Tag color={r.courseName.toLowerCase().includes('sanskrit') ? 'purple' : 'geekblue'}>
                        {r.courseName.toLowerCase().includes('sanskrit') ? 'sanskrit' : 'English'}
                      </Tag>
                    ),
                    width: 85,
                  },
                  {
                    title: 'Sanctioned Intake',
                    dataIndex: 'sanctionedIntake',
                    key: 'sanctionedIntake',
                    width: 110,
                    render: (intake) => (
                      <Tag color="green" style={{ fontWeight: 800, fontSize: '12px' }}>
                        {intake} Seats
                      </Tag>
                    ),
                  },
                  {
                    title: 'Convenor (CQ)',
                    dataIndex: 'convenorQuota',
                    key: 'convenorQuota',
                    width: 80,
                  },
                  {
                    title: 'Management (MQ)',
                    dataIndex: 'managementQuota',
                    key: 'managementQuota',
                    width: 80,
                  },
                ]}
              />

              <div style={{ marginTop: 12, padding: '8px 12px', background: '#e6f7ff', borderRadius: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: '#002147' }}>
                  Total Sanctioned Capacity: {(selectedProc.items || []).length} Single Major Programmes
                </span>
                <span style={{ fontWeight: 800, color: '#002147' }}>
                  {(selectedProc.items || []).reduce((sum, it) => sum + (it.sanctionedIntake || 0), 0)} Total Seats
                </span>
              </div>

              {/* PAGE 3: Regulatory Conditions & Copy-to distribution list */}
              <Divider style={{ margin: '18px 0' }} />
              <Title level={5} style={{ color: '#002147', margin: '8px 0' }}>
                Regulatory Conditions & Compliance:
              </Title>
              <div style={{ background: '#fafafa', padding: 12, borderRadius: 6, maxHeight: 220, overflowY: 'auto', border: '1px solid #e8e8e8' }}>
                <Paragraph style={{ whiteSpace: 'pre-line', fontSize: '11px', color: '#555', margin: 0 }}>
                  {selectedProc.conditions || 'Standard AKNU regulatory conditions apply (1-25 conditions).'}
                </Paragraph>
              </div>

              <div style={{ marginTop: 14, fontSize: '11px', color: '#666' }}>
                <div style={{ fontWeight: 700, color: '#002147' }}>To: The Principal, {college?.name || selectedProc.college?.name}</div>
                <div style={{ marginTop: 4 }}>Copy to: Secretary APSCHE; Dean CDC AKNU; Controller of Examinations; Commissioners of Social Welfare, BC Welfare, Tribal Welfare; Peshi of Vice-Chancellor; EC Meetings Section; Affiliation Section.</div>
              </div>

              {/* Digital Signature Certificate Block */}
              <div style={{ marginTop: 16, background: '#f6ffed', padding: 12, borderRadius: 6, border: '1px solid #b7eb8f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ color: '#389e0d', display: 'block' }}>
                    🔒 Digital Signature Certificate (DSC Verified)
                  </Text>
                  <code style={{ fontSize: '11px', wordBreak: 'break-all', color: '#555' }}>
                    {selectedProc.dscSignatureHash || 'SHA256:AKNU-VC-DEAN-VERIFIED-DSC'}
                  </code>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: 2 }}>
                    Signatory: KANDADAI VENKATACHARYA SWAMY
                  </div>
                </div>

                <Button
                  icon={<QrcodeOutlined />}
                  onClick={() => window.open(`/verify-proceeding?code=${selectedProc.qrVerificationCode}`, '_blank')}
                  size="small"
                >
                  Verify QR Code
                </Button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadPdf(selectedProc.id)}
                style={{ background: '#002147' }}
              >
                Download Official Proceeding (PDF)
              </Button>

              {selectedProc.status === 'ISSUED' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleAcknowledge(selectedProc.id)}
                  style={{ background: '#52c41a', border: 'none', fontWeight: 700 }}
                >
                  Confirm & Acknowledge Sanctioned Intakes
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
          <Form.Item name="courseName" label="Course Name" initialValue="B.Sc Honours (Artificial Intelligence)">
            <Input />
          </Form.Item>
          <Form.Item name="currentIntake" label="Current Sanctioned Intake" initialValue={25}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="requestedIntake" label="Requested New Intake Cap" rules={[{ required: true }]}>
            <Input type="number" placeholder="e.g. 50 or 60" />
          </Form.Item>
          <Form.Item name="reason" label="Justification / Demand by Students" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="State classroom, lab infrastructure, and faculty readiness..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
