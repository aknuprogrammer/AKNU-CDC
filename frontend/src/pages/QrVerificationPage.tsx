import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Result, Tag, Table, Typography, Space, Divider, message } from 'antd';
import { QrcodeOutlined, SafetyCertificateOutlined, CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

const { Title, Text, Paragraph } = Typography;

export const QrVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQr = searchParams.get('code') || 'AKNU-PROC-2026-001-GDC';

  const [qrInput, setQrInput] = useState(initialQr);
  const [loading, setLoading] = useState(false);
  const [verifiedData, setVerifiedData] = useState<any | null>(null);

  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || qrInput).trim();
    if (!code) {
      message.warning('Please enter a QR verification code.');
      return;
    }
    setLoading(true);
    try {
      if (code.startsWith('AKNU-PAY') || code.startsWith('RCP/')) {
        // Payment receipt verification
        const res = await api.payments.getReceipt(code);
        setVerifiedData({ type: 'RECEIPT', ...res.data });
        message.success('Authentic AKNU Payment Receipt Verified!');
      } else {
        // Proceeding verification
        const res = await api.proceedings.verifyQr(code);
        setVerifiedData({ type: 'PROCEEDING', ...res.data });
        message.success('Authentic AKNU Affiliation Proceeding Verified!');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Verification failed. Document code not found.');
      setVerifiedData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQr) {
      handleVerify(initialQr);
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001f3f 0%, #002b5c 50%, #0a3d62 100%)',
        padding: '36px 20px',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/login')} style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.3)', background: 'transparent' }}>
            Back to Portal
          </Button>
          <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: '15px' }}>
            AKNU Digital Trust & Verification Service
          </div>
        </div>

        <Card
          style={{
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            border: '2px solid #D4AF37',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img
              src="/aknu-logo.png"
              alt="Adikavi Nannaya University"
              style={{
                width: 65,
                height: 65,
                objectFit: 'contain',
                borderRadius: '50%',
                background: '#ffffff',
                padding: '3px',
                border: '2px solid #D4AF37',
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                marginBottom: 10,
              }}
            />
            <Title level={3} style={{ margin: 0, color: '#002b5c' }}>
              Adikavi Nannaya University, Rajamahendravaram
            </Title>
            <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              Official Document Verification Portal (CDC Affiliation Orders & Payment Receipts)
            </Paragraph>
          </div>

          <div style={{ maxWidth: 560, margin: '0 auto 24px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Scan or Enter QR Verification Code:</Text>
              <Input.Search
                prefix={<QrcodeOutlined style={{ color: '#002b5c' }} />}
                placeholder="e.g. AKNU-PROC-2026-001-GDC or AKNU-PAY-2026-001-00001"
                enterButton="Verify Authenticity"
                size="large"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onSearch={() => handleVerify()}
                loading={loading}
              />
              <Space size="small">
                <Text type="secondary" style={{ fontSize: '12px' }}>Try Sample Codes:</Text>
                <Tag
                  color="blue"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setQrInput('AKNU-PROC-2026-001-GDC');
                    handleVerify('AKNU-PROC-2026-001-GDC');
                  }}
                >
                  Proceeding #001
                </Tag>
                <Tag
                  color="green"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setQrInput('AKNU-PAY-2026-001-00001');
                    handleVerify('AKNU-PAY-2026-001-00001');
                  }}
                >
                  Receipt #00001
                </Tag>
              </Space>
            </Space>
          </div>

          {verifiedData && (
            <Card
              style={{
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 16 }}>
                <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                <div>
                  <Title level={4} style={{ color: '#274916', margin: 0 }}>
                    VERIFIED AUTHENTIC OFFICIAL DOCUMENT
                  </Title>
                  <Text style={{ color: '#52c41a', fontWeight: 600 }}>
                    Issued by College Development Council (CDC), Adikavi Nannaya University
                  </Text>
                </div>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {verifiedData.type === 'PROCEEDING' ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: 16 }}>
                    <div>
                      <Text type="secondary">Proceeding Order Number:</Text>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{verifiedData.proceedingNumber}</div>
                    </div>
                    <div>
                      <Text type="secondary">Affiliated College:</Text>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>
                        [{verifiedData.collegeCode}] {verifiedData.collegeName}
                      </div>
                    </div>
                    <div>
                      <Text type="secondary">Academic Year & Section:</Text>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>
                        {verifiedData.academicYear} • {verifiedData.courseGroup}
                      </div>
                    </div>
                    <div>
                      <Text type="secondary">Issuance Status:</Text>
                      <div>
                        <Tag color="green" style={{ fontWeight: 700 }}>
                          {verifiedData.status}
                        </Tag>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e8e8e8', marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>
                      🔒 Digital Signature Certificate (DSC / e-Sign) Hash:
                    </Text>
                    <code style={{ fontSize: '12px', wordBreak: 'break-all', color: '#002b5c' }}>
                      {verifiedData.dscSignatureHash}
                    </code>
                  </div>

                  <Title level={5} style={{ marginBottom: 8 }}>
                    Sanctioned Course Intake Cap Matrix:
                  </Title>
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={verifiedData.items || []}
                    rowKey="courseName"
                    columns={[
                      { title: 'Course Name', dataIndex: 'courseName', key: 'courseName' },
                      { title: 'Total Intake', dataIndex: 'sanctionedIntake', key: 'sanctionedIntake' },
                      { title: 'Convenor (CQ)', dataIndex: 'convenorQuota', key: 'convenorQuota' },
                      { title: 'Spot (SA)', dataIndex: 'spotAdmission', key: 'spotAdmission' },
                      { title: 'Management (MQ)', dataIndex: 'managementQuota', key: 'managementQuota' },
                    ]}
                  />
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: 16 }}>
                    <div>
                      <Text type="secondary">Official Receipt Number:</Text>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{verifiedData.receiptNumber}</div>
                    </div>
                    <div>
                      <Text type="secondary">College:</Text>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>
                        [{verifiedData.collegeCode}] {verifiedData.collegeName}
                      </div>
                    </div>
                    <div>
                      <Text type="secondary">Total Remitted Amount:</Text>
                      <div style={{ fontWeight: 700, fontSize: '18px', color: '#52c41a' }}>
                        ₹{verifiedData.totalINR?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <Text type="secondary">Payment Gateway:</Text>
                      <div style={{ fontWeight: 700 }}>{verifiedData.gateway} ({verifiedData.gatewayPaymentId})</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </Card>
      </div>
    </div>
  );
};
