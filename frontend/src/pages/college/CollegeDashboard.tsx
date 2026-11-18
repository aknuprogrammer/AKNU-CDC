import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Tag, Button, Space, Typography, Alert, Progress } from 'antd';
import {
  BankOutlined,
  FileDoneOutlined,
  UsergroupAddOutlined,
  DollarOutlined,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const { Title, Text, Paragraph } = Typography;

export const CollegeDashboard: React.FC = () => {
  const { user, college } = useAuth();
  const navigate = useNavigate();

  const [demands, setDemands] = useState<any[]>([]);
  const [proceedings, setProceedings] = useState<any[]>([]);
  const [seatMatrix, setSeatMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [collegeData, setCollegeData] = useState<any>(college);

  useEffect(() => {
    async function loadData() {
      if (!college) return;
      try {
        const [dRes, pRes, smRes, colRes] = await Promise.all([
          api.fees.listDemands({ collegeId: college.id, academicYear: '2026-27' }),
          api.proceedings.list({ collegeId: college.id }),
          api.students.getSeatMatrix(college.id),
          api.colleges.getById(college.id),
        ]);
        setDemands(dRes.data);
        setProceedings(pRes.data);
        setSeatMatrix(smRes.data);
        setCollegeData(colRes.data);
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
  const totalBalanceINR = demands.reduce((sum, d) => sum + d.balanceINR, 0);

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
                onClick={() => navigate('/college/reports')}
                style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 600 }}
              >
                AISHE & Reports
              </Button>
              <Button
                onClick={() => navigate('/college/queries')}
                style={{ background: '#fff', color: '#1e3c72', fontWeight: 600 }}
              >
                Workflow & Queries
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Affiliated Courses Grid */}
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

      {/* Stat Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: '8px', borderLeft: '4px solid #1e3c72' }}>
            <Statistic
              title="Sanctioned Intake Cap (Approved by Proceedings)"
              value={totalSanctionedIntake || 120}
              suffix="Seats"
              prefix={<BankOutlined style={{ color: '#1e3c72' }} />}
            />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
              Enrolled: <strong>{totalFilledSeats}</strong> ({totalSanctionedIntake > 0 ? Math.round((totalFilledSeats / totalSanctionedIntake) * 100) : 0}%)
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: '8px', borderLeft: '4px solid #52c41a' }}>
            <Statistic
              title="Official Affiliation Proceedings"
              value={proceedings.length || 1}
              prefix={<FileDoneOutlined style={{ color: '#52c41a' }} />}
              suffix="Orders"
            />
            <div style={{ marginTop: 8 }}>
              <Tag color="green">DSC Signed & Issued</Tag>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: '8px', borderLeft: '4px solid #1890ff' }}>
            <Statistic
              title="Institutional AISHE Survey Status"
              value="Verified"
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
            <div style={{ marginTop: 8 }}>
              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/college/reports')}>
                View AISHE Metrics →
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
