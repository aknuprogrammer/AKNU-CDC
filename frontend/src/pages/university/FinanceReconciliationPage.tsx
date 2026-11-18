import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Button,
  Tag,
  Statistic,
  Row,
  Col,
  Space,
  Typography,
  Drawer,
  Descriptions,
  message,
} from 'antd';
import {
  DollarOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  QrcodeOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { api } from '../../api/client';
import { PaymentReceipt } from '../../api/types';

const { Title, Text } = Typography;

export const FinanceReconciliationPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.payments.list();
      setPayments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const res = await api.payments.reconcile();
      message.success(
        `Batch reconciliation completed! ${res.data.matchedRecords} transaction(s) reconciled with payment gateway settlements.`,
      );
      loadPayments();
    } catch (err) {
      message.error('Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  const handleViewReceipt = async (receiptNumber: string) => {
    try {
      const res = await api.payments.getReceipt(receiptNumber);
      setSelectedReceipt(res.data);
      setDrawerOpen(true);
    } catch (err) {
      message.error('Failed to load official receipt');
    }
  };

  const totalCollectedINR = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.totalINR, 0);

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#002147' }}>
            Finance Accounts & Gateway Reconciliation
          </Title>
          <Text type="secondary">
            SBI Collect & Razorpay automated webhook ledger, multi-demand allocation, and daily settlement reconciliation
          </Text>
        </div>
        <Button
          type="primary"
          icon={<SyncOutlined spin={reconciling} />}
          loading={reconciling}
          onClick={handleReconcile}
          style={{ background: '#52c41a', border: 'none', fontWeight: 600 }}
        >
          Run Daily Gateway Reconciliation Batch
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: '8px', borderLeft: '4px solid #52c41a' }}>
            <Statistic
              title="Total Reconciled Collections"
              value={`₹${totalCollectedINR.toLocaleString()}`}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card style={{ borderRadius: '8px', borderLeft: '4px solid #002147' }}>
            <Statistic
              title="Successful Transactions"
              value={payments.filter((p) => p.status === 'SUCCESS').length}
              prefix={<CheckCircleOutlined style={{ color: '#002147' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8}>
          <Card style={{ borderRadius: '8px', borderLeft: '4px solid #D4AF37' }}>
            <Statistic
              title="Active Payment Gateways"
              value="SBI Collect / Razorpay"
              valueStyle={{ fontSize: '18px' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          dataSource={payments}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'Receipt No',
              dataIndex: 'receiptNumber',
              key: 'receiptNumber',
              render: (r) => <Text strong>{r}</Text>,
            },
            {
              title: 'College',
              key: 'col',
              render: (_, r) => (
                <div>
                  <Text strong>{r.collegeName}</Text>
                  <div style={{ fontSize: '11px', color: '#888' }}>Code: {r.collegeCode}</div>
                </div>
              ),
            },
            {
              title: 'Gateway',
              dataIndex: 'gateway',
              key: 'gateway',
              render: (gw) => (
                <Tag color={gw === 'SBI_COLLECT' ? 'blue' : 'purple'}>
                  {gw}
                </Tag>
              ),
            },
            {
              title: 'Amount (INR)',
              key: 'amt',
              render: (_, r) => (
                <Text strong style={{ color: '#002147' }}>
                  ₹{r.totalINR?.toLocaleString()}
                </Text>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (st) => (
                <Tag color={st === 'SUCCESS' ? 'green' : 'orange'}>
                  {st}
                </Tag>
              ),
            },
            {
              title: 'Reconciled',
              dataIndex: 'reconciled',
              key: 'reconciled',
              render: (rec) =>
                rec ? (
                  <Tag color="cyan">Settled</Tag>
                ) : (
                  <Tag color="default">Pending Batch</Tag>
                ),
            },
            {
              title: 'Action',
              key: 'act',
              render: (_, r) => (
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handleViewReceipt(r.receiptNumber)}
                >
                  Receipt
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {/* Official Receipt Drawer */}
      <Drawer
        title="Official AKNU CDC Affiliation Fee Receipt"
        placement="right"
        width={620}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedReceipt && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card
              style={{
                textAlign: 'center',
                background: 'linear-gradient(135deg, #001f3f 0%, #002b5c 100%)',
                color: '#fff',
                borderRadius: '8px',
                border: '2px solid #D4AF37',
              }}
            >
              <div style={{ color: '#D4AF37', fontWeight: 700, fontSize: '15px' }}>
                ADIKAVI NANNAYA UNIVERSITY
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                College Development Council (CDC) • Rajamahendravaram
              </div>
              <Title level={4} style={{ color: '#fff', margin: '8px 0 0' }}>
                E-RECEIPT: {selectedReceipt.receiptNumber}
              </Title>
            </Card>

            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Receipt No">{selectedReceipt.receiptNumber}</Descriptions.Item>
              <Descriptions.Item label="Payment Date">
                {new Date(selectedReceipt.paidAt).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="College" span={2}>
                [{selectedReceipt.collegeCode}] {selectedReceipt.collegeName}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Gateway">{selectedReceipt.gateway}</Descriptions.Item>
              <Descriptions.Item label="Transaction ID">
                {selectedReceipt.gatewayPaymentId || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Remitted" span={2}>
                <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                  ₹{selectedReceipt.totalINR?.toLocaleString()}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>Allocated Demands Covered by this Payment:</Title>
            <Table
              size="small"
              pagination={false}
              dataSource={selectedReceipt.allocatedDemands || []}
              rowKey="demandNumber"
              columns={[
                { title: 'Demand Number', dataIndex: 'demandNumber', key: 'demandNumber' },
                { title: 'Course Group', dataIndex: 'courseGroup', key: 'courseGroup' },
                {
                  title: 'Allocated Amount',
                  key: 'amt',
                  render: (_, r) => `₹${r.allocatedINR?.toLocaleString()}`,
                },
              ]}
            />

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: 4 }}>
                Authenticity QR Verification Code:
              </Text>
              <code>{selectedReceipt.qrReceiptCode}</code>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
};
