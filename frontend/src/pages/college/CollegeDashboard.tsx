import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Tag,
  Button,
  Space,
  Typography,
  Alert,
  Table,
  Drawer,
  Descriptions,
  Badge,
} from 'antd';
import {
  BankOutlined,
  FileDoneOutlined,
  UsergroupAddOutlined,
  DollarOutlined,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  EyeOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Demand, Proceeding } from '../../api/types';

const { Title, Text, Paragraph } = Typography;

export const CollegeDashboard: React.FC = () => {
  const { user, college } = useAuth();
  const navigate = useNavigate();

  const [demands, setDemands] = useState<Demand[]>([]);
  const [proceedings, setProceedings] = useState<Proceeding[]>([]);
  const [seatMatrix, setSeatMatrix] = useState<any[]>([]);
  const [studentsCount, setStudentsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [collegeData, setCollegeData] = useState<any>(college);
  const [breakdownDrawer, setBreakdownDrawer] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!college) return;
      setLoading(true);
      try {
        const [dRes, pRes, smRes, colRes, sRes] = await Promise.all([
          api.fees.listDemands({ collegeId: college.id, academicYear: '2026-27' }),
          api.proceedings.list({ collegeId: college.id }),
          api.students.getSeatMatrix(college.id),
          api.colleges.getById(college.id),
          api.students.list({ collegeId: college.id }),
        ]);
        setDemands(dRes.data);
        setProceedings(pRes.data);
        setSeatMatrix(smRes.data);
        setCollegeData(colRes.data);
        setStudentsCount(sRes.data?.length || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [college]);

  const courses = collegeData?.courses || college?.courses || [];
  const totalSanctionedIntake = seatMatrix.reduce((sum, item) => sum + item.sanctionedIntake, 0);
  const totalFilledSeats = seatMatrix.reduce((sum, item) => sum + item.filledTotal, 0);
  const totalBalanceINR = demands.reduce((sum, d) => sum + (d.balanceINR || 0), 0);
  const unpaidDemands = demands.filter((d) => d.status !== 'PAID');
  const latestDemand = unpaidDemands[0] || demands[0];

  const handleOpenBreakdown = (d: Demand) => {
    setSelectedDemand(d);
    setBreakdownDrawer(true);
  };

  return (
    <div>
      {/* College Banner */}
      <Card
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          color: '#fff',
          borderRadius: '10px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
        }}
      >
        <Row justify="space-between" align="middle">
          <Col xs={24} md={16}>
            <Space align="center" size="middle">
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '10px',
                  background: '#f1c40f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1e3c72',
                  fontSize: '22px',
                  fontWeight: 900,
                }}
              >
                {college?.code || '001'}
              </div>
              <div>
                <Title level={4} style={{ color: '#fff', margin: 0 }}>
                  {college?.name || 'Affiliated College'}
                </Title>
                <div style={{ marginTop: 4 }}>
                  <Space size="small" wrap>
                    <Tag color="cyan">{college?.type || 'UNAIDED'}</Tag>
                    <Tag color="geekblue">{college?.location || 'RURAL'}</Tag>
                    {college?.isAutonomous && <Tag color="purple">AUTONOMOUS</Tag>}
                    {college?.hasHostel && <Tag color="orange">RECOGNIZED HOSTEL</Tag>}
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px' }}>
                      District: {college?.district || 'East Godavari'}
                    </span>
                  </Space>
                </div>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={8} style={{ textAlign: 'right', marginTop: '12px' }}>
            <Space wrap>
              <Button
                type="primary"
                onClick={() => navigate('/college/fees')}
                style={{ background: '#f1c40f', color: '#1e3c72', borderColor: '#f1c40f', fontWeight: 700 }}
              >
                Pay Affiliation Fees ({unpaidDemands.length})
              </Button>
              <Button
                onClick={() => navigate('/college/proceedings')}
                style={{ background: '#fff', color: '#1e3c72', fontWeight: 600 }}
              >
                View Proceedings ({proceedings.length})
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* High-Priority Official Demand Alert Banner */}
      {unpaidDemands.length > 0 && latestDemand && (
        <Alert
          style={{
            marginBottom: 20,
            borderRadius: '8px',
            border: '2px solid #D4AF37',
            background: '#fffdf6',
            boxShadow: '0 2px 8px rgba(212, 175, 55, 0.15)',
          }}
          type="warning"
          showIcon
          icon={<DollarOutlined style={{ color: '#D4AF37', fontSize: '20px' }} />}
          message={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#002147' }}>
                📢 Official Affiliation Fee Demand Issued: {latestDemand.demandNumber}
              </span>
              <Tag color="red" style={{ fontWeight: 600, fontSize: '12px', padding: '2px 8px' }}>
                Payment Pending: ₹{latestDemand.balanceINR?.toLocaleString()}
              </Tag>
            </div>
          }
          description={
            <div style={{ marginTop: 6 }}>
              <Paragraph style={{ margin: 0, fontSize: '13px', color: '#444' }}>
                University CDC has generated an official demand for <strong>{latestDemand.courseGroupId} Programs ({latestDemand.academicYear})</strong>.
                Total Demanded: <strong>₹{latestDemand.totalINR?.toLocaleString()}</strong> | Due Date: <strong>{new Date(latestDemand.dueDate).toLocaleDateString()}</strong> (Grace: {latestDemand.graceDays} days).
              </Paragraph>
              <div style={{ marginTop: 10 }}>
                <Space wrap>
                  <Button
                    type="primary"
                    icon={<CreditCardOutlined />}
                    onClick={() => navigate(`/college/fees?demandId=${latestDemand.id}`)}
                    style={{ background: '#002147', fontWeight: 600 }}
                  >
                    View Breakdown & Pay Online →
                  </Button>
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => handleOpenBreakdown(latestDemand)}
                  >
                    View Itemized Breakdown
                  </Button>
                </Space>
              </div>
            </div>
          }
        />
      )}

      {/* 4 Interactive KPI Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Card 1: Sanctioned Intake Cap */}
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => navigate('/college/seat-matrix')}
            style={{
              borderRadius: '8px',
              borderLeft: '4px solid #1e3c72',
              cursor: 'pointer',
              height: '100%',
            }}
          >
            <Statistic
              title="Sanctioned Intake Cap"
              value={totalSanctionedIntake ?? 0}
              suffix="Seats"
              prefix={<BankOutlined style={{ color: '#1e3c72' }} />}
            />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>
                Enrolled: <strong>{totalFilledSeats}</strong> ({totalSanctionedIntake > 0 ? Math.round((totalFilledSeats / totalSanctionedIntake) * 100) : 0}%)
              </span>
              <Button type="link" size="small" style={{ padding: 0 }}>
                Seat Matrix →
              </Button>
            </div>
          </Card>
        </Col>

        {/* Card 2: Official Affiliation Proceedings (Clickable) */}
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => navigate('/college/proceedings')}
            style={{
              borderRadius: '8px',
              borderLeft: '4px solid #52c41a',
              cursor: 'pointer',
              height: '100%',
              background: proceedings.length > 0 ? '#f6ffed' : '#fff',
            }}
          >
            <Statistic
              title="Official Affiliation Proceedings"
              value={proceedings.length ?? 0}
              prefix={<FileDoneOutlined style={{ color: '#52c41a' }} />}
              suffix="Orders"
            />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Tag color={proceedings.length > 0 ? 'green' : 'default'}>
                {proceedings.length > 0 ? 'DSC Signed & Active' : 'No Orders Issued'}
              </Tag>
              <Button type="link" size="small" style={{ padding: 0 }}>
                View Orders →
              </Button>
            </div>
          </Card>
        </Col>

        {/* Card 3: Affiliation Fee Demands (Clickable) */}
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => navigate('/college/fees')}
            style={{
              borderRadius: '8px',
              borderLeft: totalBalanceINR > 0 ? '4px solid #f5222d' : '4px solid #52c41a',
              cursor: 'pointer',
              height: '100%',
              background: totalBalanceINR > 0 ? '#fff1f0' : '#fff',
            }}
          >
            <Statistic
              title="Affiliation Fee Balance Due"
              value={`₹${totalBalanceINR.toLocaleString()}`}
              valueStyle={{ color: totalBalanceINR > 0 ? '#f5222d' : '#52c41a' }}
              prefix={<DollarOutlined style={{ color: totalBalanceINR > 0 ? '#f5222d' : '#52c41a' }} />}
            />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>
                {demands.length} Demands ({unpaidDemands.length} Pending)
              </span>
              <Button type="link" size="small" style={{ padding: 0 }}>
                Open Fees →
              </Button>
            </div>
          </Card>
        </Col>

        {/* Card 4: Admitted Students (Clickable) */}
        <Col xs={24} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => navigate('/college/students')}
            style={{
              borderRadius: '8px',
              borderLeft: '4px solid #1890ff',
              cursor: 'pointer',
              height: '100%',
            }}
          >
            <Statistic
              title="Admitted Students (APAAR)"
              value={studentsCount ?? 0}
              prefix={<UsergroupAddOutlined style={{ color: '#1890ff' }} />}
              suffix="Students"
            />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>
                Verified via APAAR / Roll
              </span>
              <Button type="link" size="small" style={{ padding: 0 }}>
                View List →
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Official Affiliation Demands & Invoices Section */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Space>
              <DollarOutlined style={{ color: '#002147' }} />
              <span style={{ color: '#002147', fontWeight: 700 }}>
                Official Affiliation Fee Demands & Invoices ({demands.length})
              </span>
            </Space>
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<CreditCardOutlined />}
            onClick={() => navigate('/college/fees')}
            style={{ background: '#1e3c72', fontWeight: 600 }}
          >
            Open Online Payment Portal →
          </Button>
        }
        style={{ marginBottom: 20, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {demands.length > 0 ? (
          <Table
            dataSource={demands}
            rowKey="id"
            pagination={false}
            size="middle"
            scroll={{ x: 750 }}
            columns={[
              {
                title: 'Demand Number',
                dataIndex: 'demandNumber',
                key: 'demandNumber',
                render: (val, r) => (
                  <div>
                    <Text strong style={{ color: '#1e3c72' }}>{val}</Text>
                    <div style={{ fontSize: '11px', color: '#888' }}>Academic Year: {r.academicYear}</div>
                  </div>
                ),
              },
              {
                title: 'Section / Stream',
                dataIndex: 'courseGroupId',
                key: 'courseGroupId',
                render: (val) => <Tag color="blue">{val}</Tag>,
              },
              {
                title: 'Total Demanded',
                key: 'totalINR',
                align: 'right',
                render: (_, r) => (
                  <Text strong>₹{r.totalINR?.toLocaleString()}</Text>
                ),
              },
              {
                title: 'Paid',
                key: 'paidINR',
                align: 'right',
                render: (_, r) => (
                  <span style={{ color: r.paidINR > 0 ? '#52c41a' : '#888' }}>
                    ₹{r.paidINR?.toLocaleString()}
                  </span>
                ),
              },
              {
                title: 'Balance Payable',
                key: 'balanceINR',
                align: 'right',
                render: (_, r) => (
                  <Text strong style={{ color: r.balanceINR > 0 ? '#f5222d' : '#52c41a', fontSize: '14px' }}>
                    ₹{r.balanceINR?.toLocaleString()}
                  </Text>
                ),
              },
              {
                title: 'Due Date',
                dataIndex: 'dueDate',
                key: 'dueDate',
                render: (val) => new Date(val).toLocaleDateString(),
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (status, r) => {
                  if (r.isLocked) {
                    return <Tag color="red" icon={<LockOutlined />}>LOCKED</Tag>;
                  }
                  const color = status === 'PAID' ? 'green' : status === 'PARTIALLY_PAID' ? 'orange' : 'volcano';
                  return <Tag color={color} style={{ fontWeight: 600 }}>{status}</Tag>;
                },
              },
              {
                title: 'Actions',
                key: 'actions',
                align: 'center',
                render: (_, r) => (
                  <Space size="small">
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleOpenBreakdown(r)}
                    >
                      Breakdown
                    </Button>
                    {r.status !== 'PAID' && !r.isLocked && (
                      <Button
                        size="small"
                        type="primary"
                        style={{ background: '#1e3c72' }}
                        onClick={() => navigate(`/college/fees?demandId=${r.id}`)}
                      >
                        Pay Online
                      </Button>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="No affiliation fee demands generated yet for Academic Year 2026-27."
            description="When University CDC issues an official fee demand for your sanctioned programs, it will immediately appear here with itemized heads and online payment options."
          />
        )}
      </Card>

      {/* Official Affiliation Orders / Proceedings Section (Clickable) */}
      <Card
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            <span style={{ color: '#002147', fontWeight: 700 }}>
              Official Affiliation Proceedings & Sanctioned Intakes ({proceedings.length})
            </span>
          </Space>
        }
        extra={
          <Button type="link" onClick={() => navigate('/college/proceedings')}>
            All Proceedings →
          </Button>
        }
        style={{ marginBottom: 20, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {proceedings.length > 0 ? (
          <Table
            dataSource={proceedings}
            rowKey="id"
            pagination={false}
            size="middle"
            scroll={{ x: 700 }}
            columns={[
              {
                title: 'Proceeding No',
                dataIndex: 'proceedingNumber',
                key: 'proceedingNumber',
                render: (val, r) => (
                  <a
                    onClick={() => navigate(`/college/proceedings?id=${r.id}`)}
                    style={{ fontWeight: 700, color: '#1e3c72' }}
                  >
                    {val}
                  </a>
                ),
              },
              {
                title: 'Section',
                dataIndex: 'courseGroupId',
                key: 'courseGroupId',
                render: (val) => <Tag color="blue">{val}</Tag>,
              },
              {
                title: 'Subject',
                dataIndex: 'subject',
                key: 'subject',
                ellipsis: true,
              },
              {
                title: 'Sanctioned Programs',
                key: 'items',
                render: (_, r) => <span>{r.items?.length || 0} Programs</span>,
              },
              {
                title: 'DSC Signature',
                key: 'dsc',
                render: (_, r) =>
                  r.dscSignatureHash ? (
                    <Tag color="green" icon={<SafetyCertificateOutlined />}>DSC Verified</Tag>
                  ) : (
                    <Tag color="orange">Pending</Tag>
                  ),
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (val) => (
                  <Tag color={val === 'ACKNOWLEDGED' ? 'green' : 'gold'} style={{ fontWeight: 600 }}>
                    {val}
                  </Tag>
                ),
              },
              {
                title: 'Action',
                key: 'act',
                render: (_, r) => (
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/college/proceedings?id=${r.id}`)}
                  >
                    Open Order
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <Alert
            type="info"
            showIcon
            message="No affiliation proceedings issued yet."
            description="Official affiliation orders digitally signed by AKNU Dean CDC will appear here once approved."
          />
        )}
      </Card>

      {/* Affiliated Courses Offered */}
      <Card
        title={
          <Space>
            <span style={{ color: '#002147', fontWeight: 700 }}>
              📚 Affiliated Courses Offered by this College ({courses.length})
            </span>
          </Space>
        }
        style={{ marginBottom: 20, borderRadius: '8px' }}
      >
        {courses.length > 0 ? (
          <Row gutter={[16, 16]}>
            {courses.map((crs: any) => (
              <Col xs={24} sm={12} md={8} key={crs.id || crs.code}>
                <Card
                  size="small"
                  hoverable
                  style={{ borderRadius: 6, border: '1px solid #e8e8e8' }}
                  onClick={() => navigate(`/college/course/${crs.code}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Tag color="blue" style={{ fontWeight: 700 }}>
                      {crs.code}
                    </Tag>
                    <Tag color="cyan">{crs.courseGroup || 'UG'}</Tag>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '14px', margin: '8px 0 4px', color: '#002147' }}>
                    {crs.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: 10 }}>
                    {crs.degreeLevel || 'UG'} • {crs.durationYears || 3} Years Duration
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="success" style={{ fontSize: '11px', fontWeight: 600 }}>
                      ✓ Sanctioned & Active
                    </Text>
                    <Button type="link" size="small" style={{ padding: 0 }}>
                      View Program →
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Alert
            type="info"
            showIcon
            message="No specific academic courses assigned to this college yet."
            description="University CDC administrators configure affiliated courses during registration. You may raise a query to Section Officers in the Workflow & Queries section."
          />
        )}
      </Card>

      {/* Itemized Demand Breakdown Drawer */}
      <Drawer
        title={
          <Space>
            <DollarOutlined style={{ color: '#1e3c72' }} />
            <span>Official Demand Breakdown: {selectedDemand?.demandNumber}</span>
          </Space>
        }
        width={720}
        open={breakdownDrawer}
        onClose={() => setBreakdownDrawer(false)}
        footer={
          selectedDemand && selectedDemand.status !== 'PAID' && !selectedDemand.isLocked ? (
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setBreakdownDrawer(false)}>Close</Button>
                <Button
                  type="primary"
                  icon={<CreditCardOutlined />}
                  style={{ background: '#1e3c72', fontWeight: 600 }}
                  onClick={() => {
                    setBreakdownDrawer(false);
                    navigate(`/college/fees?demandId=${selectedDemand.id}`);
                  }}
                >
                  Proceed to Pay Balance ₹{selectedDemand.balanceINR?.toLocaleString()} →
                </Button>
              </Space>
            </div>
          ) : null
        }
      >
        {selectedDemand && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message={`Official Affiliation Demand (${selectedDemand.academicYear})`}
              description={`Issued by Adikavi Nannaya University CDC. Status: ${selectedDemand.status}`}
              type={selectedDemand.status === 'PAID' ? 'success' : 'info'}
              showIcon
            />

            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Demand Number">{selectedDemand.demandNumber}</Descriptions.Item>
              <Descriptions.Item label="Section">
                <Tag color="blue">{selectedDemand.courseGroupId}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selectedDemand.academicYear}</Descriptions.Item>
              <Descriptions.Item label="Demand Type">{selectedDemand.demandType}</Descriptions.Item>
              <Descriptions.Item label="Due Date">{new Date(selectedDemand.dueDate).toLocaleDateString()}</Descriptions.Item>
              <Descriptions.Item label="Grace Days">{selectedDemand.graceDays} Days</Descriptions.Item>
              <Descriptions.Item label="Total Demanded">
                <Text strong style={{ fontSize: '15px', color: '#1e3c72' }}>
                  ₹{selectedDemand.totalINR?.toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Balance Payable">
                <Text strong style={{ fontSize: '16px', color: selectedDemand.balanceINR > 0 ? '#f5222d' : '#52c41a' }}>
                  ₹{selectedDemand.balanceINR?.toLocaleString()}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 12 }}>Itemized Fee Heads Breakdown:</Title>
            <Table
              size="small"
              pagination={false}
              dataSource={selectedDemand.breakdown || []}
              rowKey="id"
              columns={[
                {
                  title: 'Fee Head & Category',
                  key: 'head',
                  render: (_, r: any) => (
                    <div>
                      <Text strong>{r.head}</Text>
                      <div style={{ fontSize: '11px', color: '#888' }}>{r.description}</div>
                    </div>
                  ),
                },
                {
                  title: 'Units / Students',
                  dataIndex: 'unitCount',
                  key: 'unitCount',
                  align: 'center',
                  render: (c) => <Tag>{c}</Tag>,
                },
                {
                  title: 'Unit Rate',
                  key: 'rate',
                  align: 'right',
                  render: (_, r: any) => `₹${Math.round((r.ratePaise || 0) / 100).toLocaleString()}`,
                },
                {
                  title: 'Total Amount',
                  key: 'amt',
                  align: 'right',
                  render: (_, r: any) => (
                    <Text strong style={{ color: '#002147' }}>
                      ₹{Math.round((r.amountPaise || 0) / 100).toLocaleString()}
                    </Text>
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Drawer>
    </div>
  );
};
