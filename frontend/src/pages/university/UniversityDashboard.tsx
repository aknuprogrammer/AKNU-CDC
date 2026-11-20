import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Button, Progress, Typography, Space } from 'antd';
import {
  BankOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  FileDoneOutlined,
  UsergroupAddOutlined,
  ArrowRightOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

const { Title, Text } = Typography;

const formatINR = (amt?: number) => {
  if (!amt || amt === 0) return '₹0';
  if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
  if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)}L`;
  return `₹${amt.toLocaleString()}`;
};

export const UniversityDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [collectionStats, setCollectionStats] = useState<any>(null);
  const [collegeStats, setCollegeStats] = useState<any>(null);
  const [recentDemands, setRecentDemands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [cStats, colStats, demands] = await Promise.all([
          api.reports.getCollectionStatus('2026-27'),
          api.colleges.getStats(),
          api.fees.listDemands({ academicYear: '2026-27' }),
        ]);
        setCollectionStats(cStats.data);
        setCollegeStats(colStats.data);
        setRecentDemands(demands.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#002147' }}>
            CDC Affiliation & Fee Collection Control Center
          </Title>
          <Text type="secondary">
            Adikavi Nannaya University • Academic Year 2026-27 Affiliation Cycle
          </Text>
        </div>
        <Space wrap>
          <Button
            type="primary"
            icon={<FileDoneOutlined />}
            onClick={() => navigate('/university/proceedings')}
            style={{ background: '#002147' }}
          >
            Draft Proceedings
          </Button>
          <Button
            type="primary"
            icon={<DollarOutlined />}
            onClick={() => navigate('/university/fee-engine')}
            style={{ background: '#D4AF37', color: '#002147', border: 'none', fontWeight: 600 }}
          >
            Fee Engine Preview
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={12} xl={6}>
          <Card
            style={{
              borderLeft: '4px solid #002147',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              height: '100%',
            }}
          >
            <Statistic
              title="Affiliated Colleges"
              value={collegeStats?.total ?? 0}
              prefix={<BankOutlined style={{ color: '#002147' }} />}
              suffix={<Text type="secondary" style={{ fontSize: '12px' }}>Total</Text>}
            />
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <Tag color="cyan">Govt: {collegeStats?.govt ?? 0}</Tag>
              <Tag color="blue">Aided: {collegeStats?.aided ?? 0}</Tag>
              <Tag color="purple">Autonomous: {collegeStats?.autonomous ?? 0}</Tag>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} xl={6}>
          <Card
            style={{
              borderLeft: '4px solid #D4AF37',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              height: '100%',
            }}
          >
            <Statistic
              title="Total Demanded (2026-27)"
              value={formatINR(collectionStats?.totalDemandedINR)}
              prefix={<DollarOutlined style={{ color: '#D4AF37' }} />}
            />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
              Demands Issued: <strong>{collectionStats?.totalDemandsCount ?? 0}</strong>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} xl={6}>
          <Card
            style={{
              borderLeft: '4px solid #52c41a',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              height: '100%',
            }}
          >
            <Statistic
              title="Online Realized Revenue"
              value={formatINR(collectionStats?.totalCollectedINR)}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={collectionStats?.collectionPercentage ?? 0}
                size="small"
                status="active"
                strokeColor="#52c41a"
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={12} xl={6}>
          <Card
            style={{
              borderLeft: '4px solid #f5222d',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              height: '100%',
            }}
          >
            <Statistic
              title="Pending Balance / Dues"
              value={formatINR(collectionStats?.totalBalanceINR)}
              valueStyle={{ color: '#f5222d' }}
              prefix={<AlertOutlined style={{ color: '#f5222d' }} />}
            />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              <Tag color={collectionStats?.pendingCount > 0 ? 'red' : 'default'}>Defaulters: {collectionStats?.pendingCount ?? 0}</Tag>
              <Button type="link" size="small" onClick={() => navigate('/university/reports')} style={{ padding: 0 }}>
                View Defaulters →
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Grid: Recent Demands & Quick Action Hub */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            title={
              <Space>
                <DollarOutlined style={{ color: '#002147' }} />
                <span>Recent Affiliation Fee Demands</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/university/fee-engine')}>
                All Demands →
              </Button>
            }
            style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Table
              dataSource={recentDemands}
              rowKey="id"
              pagination={false}
              size="middle"
              scroll={{ x: 600 }}
              columns={[
                {
                  title: 'Demand No',
                  dataIndex: 'demandNumber',
                  key: 'demandNumber',
                  render: (val) => <Text strong>{val}</Text>,
                },
                {
                  title: 'College',
                  key: 'college',
                  render: (_, r) => (
                    <div>
                      <div>{r.collegeName}</div>
                      <Text type="secondary" style={{ fontSize: '11px' }}>Code: {r.collegeCode}</Text>
                    </div>
                  ),
                },
                {
                  title: 'Section',
                  dataIndex: 'courseGroupId',
                  key: 'courseGroupId',
                  render: (val) => <Tag color="blue">{val}</Tag>,
                },
                {
                  title: 'Amount',
                  key: 'totalINR',
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
                  render: (status) => {
                    const color = status === 'PAID' ? 'green' : status === 'PARTIALLY_PAID' ? 'orange' : 'red';
                    return <Tag color={color}>{status}</Tag>;
                  },
                },
                {
                  title: 'Action',
                  key: 'action',
                  render: (_, r) => (
                    <Button size="small" onClick={() => navigate(`/university/fee-engine?demandId=${r.id}`)}>
                      Breakdown
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* Quick Operations Hub */}
        <Col xs={24} lg={8}>
          <Card
            title="University CDC Operations"
            style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button
                block
                size="large"
                icon={<BankOutlined />}
                onClick={() => navigate('/university/colleges')}
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>Affiliated Colleges Register ({collegeStats?.total ?? 0})</span>
                <ArrowRightOutlined />
              </Button>

              <Button
                block
                size="large"
                icon={<FileDoneOutlined />}
                onClick={() => navigate('/university/proceedings')}
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>Bulk DSC Proceeding Signing</span>
                <ArrowRightOutlined />
              </Button>

              <Button
                block
                size="large"
                icon={<UsergroupAddOutlined />}
                onClick={() => navigate('/university/students')}
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>Student Intake & APAAR Check</span>
                <ArrowRightOutlined />
              </Button>

              <Button
                block
                size="large"
                icon={<DownloadOutlined />}
                onClick={() => navigate('/university/reports')}
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>AISHE Ministry Enrolment Report</span>
                <ArrowRightOutlined />
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
