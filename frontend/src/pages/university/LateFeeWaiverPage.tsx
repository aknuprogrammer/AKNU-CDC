import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  InputNumber,
  Select,
  Alert,
  Modal,
  Form,
  message,
} from 'antd';
import {
  ClockCircleOutlined,
  LockOutlined,
  UnlockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { api } from '../../api/client';
import { Demand } from '../../api/types';

const { Title, Text, Paragraph } = Typography;

export const LateFeeWaiverPage: React.FC = () => {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [waivers, setWaivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation test state
  const [selectedDemandId, setSelectedDemandId] = useState<string>('');
  const [simDaysOverdue, setSimDaysOverdue] = useState<number>(20);
  const [calcResult, setCalcResult] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dRes, wRes] = await Promise.all([
        api.fees.listDemands({ academicYear: '2026-27' }),
        api.lateFee.listWaivers(),
      ]);
      setDemands(dRes.data);
      setWaivers(wRes.data);
      if (dRes.data.length > 0) {
        setSelectedDemandId(dRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCalculateSim = async () => {
    if (!selectedDemandId) return;
    try {
      // Simulate date with overdue days
      const simDate = new Date();
      simDate.setDate(simDate.getDate() + simDaysOverdue);

      const res = await api.lateFee.calculate(selectedDemandId, simDate.toISOString());
      setCalcResult(res.data);
    } catch (err) {
      message.error('Failed to calculate simulated late fee');
    }
  };

  const handleReviewWaiver = async (waiverId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await api.lateFee.reviewWaiver(waiverId, decision);
      message.success(`Waiver application marked as ${decision}!`);
      loadData();
    } catch (err) {
      message.error('Action failed');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: '#002147' }}>
          Late Fee Management & Waiver Approval System
        </Title>
        <Text type="secondary">
          Statutory grace period (15 days), daily/slab rates, cap enforcement, final cut-off payment locks, and official waiver workflow
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Rules Summary Card */}
        <Col xs={24} lg={12}>
          <Card title="Active Late Fee Penalty Policy (2026-27)" style={{ borderRadius: '8px' }}>
            <ul>
              <li><strong>Grace Period:</strong> 15 days from due date without penalty</li>
              <li><strong>Default Rate:</strong> ₹100 / day overdue after grace expiry</li>
              <li><strong>Maximum Cap:</strong> ₹25,000 statutory ceiling per demand</li>
              <li>
                <strong>Final Cut-off Lock:</strong> After 60 days overdue, demand is{' '}
                <Tag color="red">LOCKED</Tag> preventing online payment until Dean/Finance approval
              </li>
              <li><strong>Waiver Power:</strong> Dean CDC / Registrar may waive late fees on valid grounds</li>
            </ul>
          </Card>
        </Col>

        {/* Live Simulator Card */}
        <Col xs={24} lg={12}>
          <Card title="Late Fee Penalty Simulator" style={{ borderRadius: '8px' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row gutter={12}>
                <Col span={14}>
                  <Text strong>Select Demand:</Text>
                  <Select
                    style={{ width: '100%', marginTop: 4 }}
                    value={selectedDemandId}
                    onChange={setSelectedDemandId}
                    options={demands.map((d) => ({
                      label: `${d.demandNumber} - ₹${d.totalINR?.toLocaleString()}`,
                      value: d.id,
                    }))}
                  />
                </Col>
                <Col span={10}>
                  <Text strong>Overdue Days:</Text>
                  <InputNumber
                    min={0}
                    max={120}
                    style={{ width: '100%', marginTop: 4 }}
                    value={simDaysOverdue}
                    onChange={(val) => setSimDaysOverdue(val || 0)}
                  />
                </Col>
              </Row>

              <Button
                type="primary"
                icon={<ClockCircleOutlined />}
                onClick={handleCalculateSim}
                style={{ background: '#002147' }}
              >
                Compute Penalty & Lock Status
              </Button>

              {calcResult && (
                <div style={{ background: '#fafafa', padding: 12, borderRadius: 6, border: '1px solid #e8e8e8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Calculated Late Fee:</Text>
                    <Title level={4} style={{ color: '#f5222d', margin: 0 }}>
                      ₹{calcResult.lateFeeINR?.toLocaleString()}
                    </Title>
                  </div>
                  <div>Rule Applied: <Tag color="blue">{calcResult.appliedRule}</Tag></div>
                  <div style={{ marginTop: 6 }}>
                    Status:{' '}
                    {calcResult.isLocked ? (
                      <Tag color="red" icon={<LockOutlined />}>
                        LOCKED (Exceeded 60-day cut-off)
                      </Tag>
                    ) : (
                      <Tag color="green" icon={<UnlockOutlined />}>
                        UNLOCKED (Payable)
                      </Tag>
                    )}
                  </div>
                </div>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Waiver Applications Table */}
      <Card
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#002147' }} />
            <span>Late-Fee Waiver Applications (Requires Dean CDC Approval)</span>
          </Space>
        }
        style={{ borderRadius: '8px' }}
      >
        <Table
          dataSource={waivers}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: 'No pending waiver applications on record.' }}
          columns={[
            {
              title: 'Demand Number',
              dataIndex: 'demandNumber',
              key: 'demandNumber',
              render: (d) => <Text strong>{d}</Text>,
            },
            {
              title: 'Requested Waiver',
              key: 'waiver',
              render: (_, r) => (
                <Text strong style={{ color: '#f5222d' }}>
                  ₹{r.requestedWaiverINR?.toLocaleString()}
                </Text>
              ),
            },
            {
              title: 'Justification / Reason',
              dataIndex: 'reason',
              key: 'reason',
            },
            {
              title: 'Applicant',
              dataIndex: 'requestedBy',
              key: 'requestedBy',
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (st) => (
                <Tag color={st === 'APPROVED' ? 'green' : st === 'REJECTED' ? 'red' : 'gold'}>
                  {st}
                </Tag>
              ),
            },
            {
              title: 'Official Decision',
              key: 'decision',
              render: (_, r) =>
                r.status === 'PENDING' ? (
                  <Space size="small">
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleReviewWaiver(r.id, 'APPROVED')}
                      style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    >
                      Approve
                    </Button>
                    <Button
                      danger
                      size="small"
                      icon={<CloseCircleOutlined />}
                      onClick={() => handleReviewWaiver(r.id, 'REJECTED')}
                    >
                      Reject
                    </Button>
                  </Space>
                ) : (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Reviewed by {r.reviewedBy || 'Dean'}
                  </Text>
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
