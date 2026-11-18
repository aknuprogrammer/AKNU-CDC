import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Progress, Row, Col, Statistic, Space, Typography } from 'antd';
import { AppstoreOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { SeatMatrixItem } from '../../api/types';

const { Title, Text } = Typography;

export const CollegeSeatMatrixPage: React.FC = () => {
  const { college } = useAuth();
  const [matrix, setMatrix] = useState<SeatMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMatrix() {
      if (!college) return;
      setLoading(true);
      try {
        const res = await api.students.getSeatMatrix(college.id);
        setMatrix(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMatrix();
  }, [college]);

  const totalSanctioned = matrix.reduce((sum, item) => sum + item.sanctionedIntake, 0);
  const totalFilled = matrix.reduce((sum, item) => sum + item.filledTotal, 0);
  const totalVacant = matrix.reduce((sum, item) => sum + item.vacantTotal, 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: '#1e3c72' }}>
          Official Seat Matrix (Intake / Filled / Vacant by Quota)
        </Title>
        <Text type="secondary">
          Live monitoring of Convenor Quota (CQ), Spot Admission (SA), and Management Quota (MQ) limits
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: '8px', borderLeft: '4px solid #1e3c72' }}>
            <Statistic
              title="Total Sanctioned Intake"
              value={totalSanctioned}
              prefix={<AppstoreOutlined style={{ color: '#1e3c72' }} />}
              suffix="Seats"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card style={{ borderRadius: '8px', borderLeft: '4px solid #52c41a' }}>
            <Statistic
              title="Total Filled Admissions"
              value={totalFilled}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              suffix="Seats"
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card style={{ borderRadius: '8px', borderLeft: '4px solid #faad14' }}>
            <Statistic
              title="Remaining Vacancies"
              value={totalVacant}
              valueStyle={{ color: '#faad14' }}
              suffix="Available"
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          dataSource={matrix}
          rowKey="courseCode"
          loading={loading}
          pagination={false}
          columns={[
            {
              title: 'Course Program',
              key: 'course',
              render: (_, r) => (
                <div>
                  <Text strong>{r.courseName}</Text>
                  <div style={{ fontSize: '11px', color: '#888' }}>Code: {r.courseCode}</div>
                </div>
              ),
            },
            {
              title: 'Sanctioned Intake',
              dataIndex: 'sanctionedIntake',
              key: 'sanctionedIntake',
              align: 'center',
              render: (intake) => <Tag color="blue" style={{ fontWeight: 700 }}>{intake}</Tag>,
            },
            {
              title: 'Convenor Quota (CQ)',
              key: 'cq',
              render: (_, r) => (
                <div>
                  <div>{r.filledCQ} / {r.convenorCap} filled</div>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Vacant: {r.vacantCQ}</Text>
                </div>
              ),
            },
            {
              title: 'Spot Admission (SA)',
              key: 'sa',
              render: (_, r) => (
                <div>
                  <div>{r.filledSA} / {r.spotCap} filled</div>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Vacant: {r.vacantSA}</Text>
                </div>
              ),
            },
            {
              title: 'Management Quota (MQ)',
              key: 'mq',
              render: (_, r) => (
                <div>
                  <div>{r.filledMQ} / {r.managementCap} filled</div>
                  <Text type="secondary" style={{ fontSize: '11px' }}>Vacant: {r.vacantMQ}</Text>
                </div>
              ),
            },
            {
              title: 'Seat Utilization',
              key: 'progress',
              width: 180,
              render: (_, r) => {
                const pct = r.sanctionedIntake > 0 ? Math.round((r.filledTotal / r.sanctionedIntake) * 100) : 0;
                return (
                  <Progress
                    percent={pct}
                    size="small"
                    strokeColor={pct >= 100 ? '#f5222d' : pct > 75 ? '#faad14' : '#52c41a'}
                  />
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
};
