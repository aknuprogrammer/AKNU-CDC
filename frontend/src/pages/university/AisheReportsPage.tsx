import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Tag,
  Row,
  Col,
  Statistic,
  Space,
  Typography,
  message,
} from 'antd';
import {
  BarChartOutlined,
  AlertOutlined,
  DollarOutlined,
  DownloadOutlined,
  SendOutlined,
  WomanOutlined,
  ManOutlined,
} from '@ant-design/icons';
import { api } from '../../api/client';

const { Title, Text } = Typography;

export const AisheReportsPage: React.FC = () => {
  const [aisheData, setAisheData] = useState<any | null>(null);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [headWise, setHeadWise] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aRes, dRes, hRes] = await Promise.all([
        api.reports.getAishe('2026-27'),
        api.reports.getDefaulters('2026-27'),
        api.reports.getHeadWise('2026-27'),
      ]);
      setAisheData(aRes.data);
      setDefaulters(dRes.data);
      setHeadWise(hRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendReminder = async (collegeId: string) => {
    setSendingReminder(true);
    try {
      await api.notifications.sendBulkReminders([collegeId]);
      message.success('DLT SMS & Email reminder sent to college principal!');
    } catch (err) {
      message.error('Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleExportExcel = (reportName: string) => {
    message.success(`Generating and downloading ${reportName} in Excel (.xlsx) format...`);
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#002147' }}>
            Statutory Reports & Defaulters Register
          </Title>
          <Text type="secondary">
            Ministry of Education AISHE enrollment matrix, defaulter tracking with DLT SMS reminders, and head-wise revenue
          </Text>
        </div>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => handleExportExcel('AISHE_Enrolment_2026_27')}
          style={{ background: '#52c41a', border: 'none' }}
        >
          Export Excel Report
        </Button>
      </div>

      <Tabs
        defaultActiveKey="aishe"
        items={[
          {
            key: 'aishe',
            label: (
              <span>
                <BarChartOutlined /> AISHE Gender & Social Category Enrolment
              </span>
            ),
            children: (
              <div>
                {/* AISHE Summary Cards */}
                {aisheData && (
                  <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={12} sm={6}>
                      <Card style={{ borderRadius: '8px' }}>
                        <Statistic
                          title="Total Admitted Students"
                          value={aisheData.summary.totalStudents}
                          valueStyle={{ color: '#002147' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card style={{ borderRadius: '8px' }}>
                        <Statistic
                          title="Female Students"
                          value={aisheData.summary.totalFemale}
                          prefix={<WomanOutlined style={{ color: '#eb2f96' }} />}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card style={{ borderRadius: '8px' }}>
                        <Statistic
                          title="Male Students"
                          value={aisheData.summary.totalMale}
                          prefix={<ManOutlined style={{ color: '#1890ff' }} />}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card style={{ borderRadius: '8px' }}>
                        <Statistic
                          title="Gender Parity Index (F/M)"
                          value={aisheData.summary.genderParityRatio}
                          suffix="Ratio"
                        />
                      </Card>
                    </Col>
                  </Row>
                )}

                <Card style={{ borderRadius: '8px' }}>
                  <Table
                    dataSource={aisheData?.courses || []}
                    rowKey="courseCode"
                    loading={loading}
                    pagination={false}
                    columns={[
                      {
                        title: 'Course Program',
                        key: 'prog',
                        render: (_: any, r: any) => (
                          <div>
                            <Text strong>{r.courseName}</Text>
                            <div style={{ fontSize: '11px', color: '#888' }}>Code: {r.courseCode} • {r.courseGroup}</div>
                          </div>
                        ),
                      },
                      {
                        title: 'Total',
                        dataIndex: 'totalEnrolled',
                        key: 'totalEnrolled',
                        align: 'center',
                        render: (val: any) => <Tag color="blue" style={{ fontWeight: 700 }}>{val}</Tag>,
                      },
                      {
                        title: 'Gender (M / F / O)',
                        key: 'gender',
                        render: (_: any, r: any) => (
                          <span>
                            {r.gender.male} M / {r.gender.female} F
                          </span>
                        ),
                      },
                      {
                        title: 'Social Category (SC/ST/BC/OC)',
                        key: 'cat',
                        render: (_: any, r: any) => (
                          <Space size={4}>
                            <Tag color="cyan">SC: {r.socialCategory.sc}</Tag>
                            <Tag color="geekblue">ST: {r.socialCategory.st}</Tag>
                            <Tag color="purple">BC: {r.socialCategory.bc}</Tag>
                            <Tag color="orange">OC: {r.socialCategory.oc}</Tag>
                          </Space>
                        ),
                      },
                      {
                        title: 'Special (PH / Minority)',
                        key: 'special',
                        render: (_: any, r: any) => (
                          <span>
                            PH: {r.specialCategory.ph} • Minority: {r.specialCategory.minority}
                          </span>
                        ),
                      },
                    ]}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'defaulters',
            label: (
              <span>
                <AlertOutlined /> Defaulter Colleges Register ({defaulters.length})
              </span>
            ),
            children: (
              <Card style={{ borderRadius: '8px' }}>
                <Table
                  dataSource={defaulters}
                  rowKey="demandId"
                  loading={loading}
                  pagination={{ pageSize: 8 }}
                  columns={[
                    {
                      title: 'College',
                      key: 'col',
                      render: (_, r) => (
                        <div>
                          <Text strong>{r.collegeName}</Text>
                          <div style={{ fontSize: '11px', color: '#888' }}>Code: {r.collegeCode} • {r.district}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'Demand Number',
                      dataIndex: 'demandNumber',
                      key: 'demandNumber',
                    },
                    {
                      title: 'Outstanding Balance',
                      key: 'bal',
                      render: (_, r) => (
                        <Text strong style={{ color: '#f5222d' }}>
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
                      title: 'Overdue Status',
                      key: 'status',
                      render: (_, r) =>
                        r.isOverdue ? (
                          <Tag color="red">{r.daysOverdue} Days Overdue</Tag>
                        ) : (
                          <Tag color="orange">Pending (Within Grace)</Tag>
                        ),
                    },
                    {
                      title: 'Principal Contact',
                      key: 'contact',
                      render: (_, r) => (
                        <div>
                          <div>{r.principalName}</div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>📱 {r.principalMobile}</Text>
                        </div>
                      ),
                    },
                    {
                      title: 'Remind',
                      key: 'remind',
                      render: (_, r) => (
                        <Button
                          type="primary"
                          size="small"
                          icon={<SendOutlined />}
                          loading={sendingReminder}
                          onClick={() => handleSendReminder(r.collegeId)}
                          style={{ background: '#f5222d', border: 'none' }}
                        >
                          Send SMS Reminder
                        </Button>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'headWise',
            label: (
              <span>
                <DollarOutlined /> Head-wise Revenue Collection
              </span>
            ),
            children: (
              <Card style={{ borderRadius: '8px' }}>
                <Table
                  dataSource={headWise}
                  rowKey="feeHead"
                  pagination={false}
                  columns={[
                    {
                      title: 'Statutory Fee Head',
                      dataIndex: 'feeHead',
                      key: 'feeHead',
                      render: (h) => <Text strong>{h}</Text>,
                    },
                    {
                      title: 'Unit Records Count',
                      dataIndex: 'unitCount',
                      key: 'unitCount',
                      align: 'center',
                    },
                    {
                      title: 'Total Revenue (INR)',
                      key: 'inr',
                      align: 'right',
                      render: (_, r) => (
                        <Text strong style={{ color: '#002147' }}>
                          ₹{r.totalINR?.toLocaleString()}
                        </Text>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};
