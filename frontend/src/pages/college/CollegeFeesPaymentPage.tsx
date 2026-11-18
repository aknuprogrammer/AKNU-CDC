import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Radio,
  Space,
  Row,
  Col,
  Statistic,
  Modal,
  Alert,
  Divider,
  Drawer,
  Descriptions,
  Typography,
  message,
} from 'antd';
import {
  DollarOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  QrcodeOutlined,
  EyeOutlined,
  LockOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Demand, PaymentReceipt } from '../../api/types';

const { Title, Text, Paragraph } = Typography;

export const CollegeFeesPaymentPage: React.FC = () => {
  const { college } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [gateway, setGateway] = useState<'SBI_COLLECT' | 'RAZORPAY'>('SBI_COLLECT');
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [initiatingPay, setInitiatingPay] = useState(false);
  const [confirmingPay, setConfirmingPay] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<any | null>(null);

  const [receiptDrawer, setReceiptDrawer] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceipt | null>(null);

  const loadDemands = async () => {
    if (!college) return;
    setLoading(true);
    try {
      const res = await api.fees.listDemands({ collegeId: college.id });
      setDemands(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemands();
  }, [college]);

  const selectedDemands = demands.filter((d) => selectedRowKeys.includes(d.id));
  const totalPayableINR = selectedDemands.reduce((sum, d) => sum + d.balanceINR, 0);
  const totalPayablePaise = selectedDemands.reduce((sum, d) => sum + d.balancePaise, 0);

  const handleInitiateCheckout = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one demand to pay.');
      return;
    }

    setInitiatingPay(true);
    try {
      const allocations = selectedDemands.map((d) => ({
        demandId: d.id,
        amountPaise: d.balancePaise,
      }));

      const res = await api.payments.initiate({
        collegeId: college!.id,
        gateway,
        allocations,
      });

      setCurrentPayment(res.data);
      setCheckoutModal(true);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Payment initiation failed');
    } finally {
      setInitiatingPay(false);
    }
  };

  const handleConfirmSimulation = async () => {
    if (!currentPayment) return;
    setConfirmingPay(true);
    try {
      await api.payments.confirm(currentPayment.paymentId);
      message.success('Payment completed successfully via gateway webhook!');
      setCheckoutModal(false);
      loadDemands();
      // Load receipt
      const receiptRes = await api.payments.getReceipt(currentPayment.receiptNumber);
      setActiveReceipt(receiptRes.data);
      setReceiptDrawer(true);
      setSelectedRowKeys([]);
    } catch (err) {
      message.error('Payment confirmation error');
    } finally {
      setConfirmingPay(false);
    }
  };

  const handleViewExistingReceipt = async (receiptNumber: string) => {
    try {
      const res = await api.payments.getReceipt(receiptNumber);
      setActiveReceipt(res.data);
      setReceiptDrawer(true);
    } catch (err) {
      message.error('Receipt not found');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: '#1e3c72' }}>
          Affiliation Fee Demands & Online Gateway Payment
        </Title>
        <Text type="secondary">
          Integrated with SBI Collect & Razorpay. Multi-demand single payment checkout, integer paise accuracy, and instant verified QR receipt.
        </Text>
      </div>

      {/* Payment Action Bar */}
      <Card
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #f9fafb 0%, #f4f6f8 100%)',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space direction="vertical" size={2}>
              <Text strong style={{ fontSize: '15px' }}>
                Multi-Demand Unified Checkout:
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Select one or multiple pending demands below to cover in a single online transaction
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text strong>Selected Total:</Text>{' '}
                <Text strong style={{ fontSize: '20px', color: '#1e3c72', marginLeft: 8 }}>
                  ₹{totalPayableINR.toLocaleString()}
                </Text>
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {selectedRowKeys.length} Demands Selected
                </Tag>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space direction="vertical" align="end" size="small">
              <div>
                <Text strong style={{ marginRight: 8 }}>Payment Gateway:</Text>
                <Radio.Group value={gateway} onChange={(e) => setGateway(e.target.value)}>
                  <Radio.Button value="SBI_COLLECT">State Bank of India (SBI Collect)</Radio.Button>
                  <Radio.Button value="RAZORPAY">Razorpay</Radio.Button>
                </Radio.Group>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<CreditCardOutlined />}
                disabled={selectedRowKeys.length === 0}
                loading={initiatingPay}
                onClick={handleInitiateCheckout}
                style={{
                  background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                  border: 'none',
                  fontWeight: 700,
                  marginTop: 8,
                }}
              >
                Proceed to Pay ₹{totalPayableINR.toLocaleString()}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Demands Table */}
      <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({
              disabled: record.status === 'PAID' || record.isLocked,
            }),
          }}
          dataSource={demands}
          rowKey="id"
          loading={loading}
          pagination={false}
          columns={[
            {
              title: 'Demand Number',
              dataIndex: 'demandNumber',
              key: 'demandNumber',
              render: (d) => <Text strong>{d}</Text>,
            },
            {
              title: 'Course Section',
              dataIndex: 'courseGroupId',
              key: 'courseGroupId',
              render: (g) => <Tag color="blue">{g}</Tag>,
            },
            {
              title: 'Total Demand',
              key: 'total',
              render: (_, r) => <span>₹{r.totalINR?.toLocaleString()}</span>,
            },
            {
              title: 'Paid Amount',
              key: 'paid',
              render: (_, r) => (
                <span style={{ color: r.paidINR > 0 ? '#52c41a' : '#888' }}>
                  ₹{r.paidINR?.toLocaleString()}
                </span>
              ),
            },
            {
              title: 'Balance Payable',
              key: 'balance',
              render: (_, r) => (
                <Text strong style={{ color: r.balanceINR > 0 ? '#f5222d' : '#52c41a' }}>
                  ₹{r.balanceINR?.toLocaleString()}
                </Text>
              ),
            },
            {
              title: 'Due Date',
              dataIndex: 'dueDate',
              key: 'dueDate',
              render: (d) => new Date(d).toLocaleDateString(),
            },
            {
              title: 'Payment Status',
              key: 'status',
              render: (_, r) => {
                if (r.isLocked) {
                  return (
                    <Tag color="red" icon={<LockOutlined />}>
                      LOCKED (Cut-off)
                    </Tag>
                  );
                }
                const color = r.status === 'PAID' ? 'green' : r.status === 'PARTIALLY_PAID' ? 'orange' : 'volcano';
                return <Tag color={color} style={{ fontWeight: 600 }}>{r.status}</Tag>;
              },
            },
          ]}
        />
      </Card>

      {/* Gateway Simulation Modal */}
      <Modal
        title={
          <Space>
            <BankOutlined style={{ color: '#1e3c72' }} />
            <span>
              {gateway === 'SBI_COLLECT' ? 'State Bank of India (SBI Collect Gateway)' : 'Razorpay Secure Checkout'}
            </span>
          </Space>
        }
        open={checkoutModal}
        width={560}
        onCancel={() => setCheckoutModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setCheckoutModal(false)}>
            Cancel Transaction
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={confirmingPay}
            onClick={handleConfirmSimulation}
            style={{ background: '#52c41a', border: 'none', fontWeight: 700 }}
          >
            Authorize Payment (Simulate Gateway Success)
          </Button>,
        ]}
      >
        {currentPayment && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message="Simulated Pluggable Gateway Environment"
              description="Demonstrating secure HMAC webhook callback, multi-demand distribution, and integer paise balance clearing."
              type="info"
              showIcon
            />

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Merchant Account">Adikavi Nannaya University - CDC Collection</Descriptions.Item>
              <Descriptions.Item label="Order ID"><code>{currentPayment.gatewayOrderId}</code></Descriptions.Item>
              <Descriptions.Item label="Receipt Assigned">{currentPayment.receiptNumber}</Descriptions.Item>
              <Descriptions.Item label="Total Amount to Remit">
                <Text strong style={{ fontSize: '20px', color: '#1e3c72' }}>
                  ₹{currentPayment.totalINR?.toLocaleString()}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Modal>

      {/* Receipt Drawer */}
      <Drawer
        title="Official AKNU Affiliation Fee Receipt"
        placement="right"
        width={600}
        onClose={() => setReceiptDrawer(false)}
        open={receiptDrawer}
      >
        {activeReceipt && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message="Payment Successful & Confirmed by University Bank Gateway"
              type="success"
              showIcon
            />

            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Receipt No">{activeReceipt.receiptNumber}</Descriptions.Item>
              <Descriptions.Item label="Date">{new Date(activeReceipt.paidAt).toLocaleDateString()}</Descriptions.Item>
              <Descriptions.Item label="College" span={2}>
                [{activeReceipt.collegeCode}] {activeReceipt.collegeName}
              </Descriptions.Item>
              <Descriptions.Item label="Gateway">{activeReceipt.gateway}</Descriptions.Item>
              <Descriptions.Item label="Transaction ID">{activeReceipt.gatewayPaymentId}</Descriptions.Item>
              <Descriptions.Item label="Amount Paid" span={2}>
                <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                  ₹{activeReceipt.totalINR?.toLocaleString()}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>Covered Demands:</Title>
            <Table
              size="small"
              pagination={false}
              dataSource={activeReceipt.allocatedDemands || []}
              rowKey="demandNumber"
              columns={[
                { title: 'Demand No', dataIndex: 'demandNumber', key: 'demandNumber' },
                { title: 'Section', dataIndex: 'courseGroup', key: 'courseGroup' },
                {
                  title: 'Allocated Amount',
                  key: 'amt',
                  render: (_, r) => `₹${r.allocatedINR?.toLocaleString()}`,
                },
              ]}
            />

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginBottom: 4 }}>
                Authenticity QR Verification Code:
              </Text>
              <code>{activeReceipt.qrReceiptCode}</code>
              <div style={{ marginTop: 8 }}>
                <Button
                  icon={<QrcodeOutlined />}
                  onClick={() => window.open(`/verify-proceeding?code=${activeReceipt.qrReceiptCode}`, '_blank')}
                >
                  Verify QR Authenticity
                </Button>
              </div>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
};
