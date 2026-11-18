import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Select,
  Button,
  Table,
  Tag,
  Statistic,
  Space,
  Switch,
  Typography,
  Divider,
  Alert,
  Tabs,
  Drawer,
  Descriptions,
  message,
} from 'antd';
import {
  CalculatorOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  FileProtectOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { api } from '../../api/client';
import { College, FeeCalculationResult, Demand } from '../../api/types';

const { Title, Text, Paragraph } = Typography;

export const FeeEnginePage: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('col-001');
  const [selectedGroup, setSelectedGroup] = useState<string>('UG');
  const [includeInspection, setIncludeInspection] = useState<boolean>(true);
  const [includeHostel, setIncludeHostel] = useState<boolean>(true);

  const [previewResult, setPreviewResult] = useState<FeeCalculationResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generatingDemand, setGeneratingDemand] = useState(false);

  const [demands, setDemands] = useState<Demand[]>([]);
  const [loadingDemands, setLoadingDemands] = useState(true);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadInitialData = async () => {
    try {
      const [colRes, dmdRes] = await Promise.all([
        api.colleges.list(),
        api.fees.listDemands({ academicYear: '2026-27' }),
      ]);
      setColleges(colRes.data);
      setDemands(dmdRes.data);
      if (colRes.data.length > 0) {
        setSelectedCollegeId(colRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDemands(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleCalculatePreview = async () => {
    if (!selectedCollegeId) return;
    setLoadingPreview(true);
    try {
      const res = await api.fees.preview({
        collegeId: selectedCollegeId,
        courseGroupId: selectedGroup,
        academicYear: '2026-27',
        includeInspection,
        includeHostel,
      });
      setPreviewResult(res.data);
      message.success('Live fee preview computed from pure fee engine!');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Calculation preview failed');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Run calculation preview on load or change
  useEffect(() => {
    if (selectedCollegeId) {
      handleCalculatePreview();
    }
  }, [selectedCollegeId, selectedGroup, includeInspection, includeHostel]);

  const handleGenerateDemand = async () => {
    if (!selectedCollegeId) return;
    setGeneratingDemand(true);
    try {
      const res = await api.fees.generateDemand({
        collegeId: selectedCollegeId,
        courseGroupId: selectedGroup,
        academicYear: '2026-27',
      });
      message.success(`Official Demand ${res.data.demandNumber} generated & issued to college portal!`);
      // Refresh demands
      const dmdRes = await api.fees.listDemands({ academicYear: '2026-27' });
      setDemands(dmdRes.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to generate demand');
    } finally {
      setGeneratingDemand(false);
    }
  };

  const selectedColObj = colleges.find((c) => c.id === selectedCollegeId);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: '#002147' }}>
          AKNU Pure Fee Calculation Engine & Demand Generator
        </Title>
        <Text type="secondary">
          Pure deterministic mathematical functions (backend/src/fees) with zero manual overrides. All counts derived from student records.
        </Text>
      </div>

      <Tabs
        defaultActiveKey="preview"
        items={[
          {
            key: 'preview',
            label: (
              <span>
                <ThunderboltOutlined /> Live Fee Engine Simulator (POST /fees/preview)
              </span>
            ),
            children: (
              <div>
                {/* Control Bar */}
                <Card style={{ marginBottom: 20, borderRadius: '8px' }}>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={8}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>Select College:</Text>
                      <Select
                        showSearch
                        style={{ width: '100%' }}
                        value={selectedCollegeId}
                        onChange={setSelectedCollegeId}
                        options={colleges.map((c) => ({
                          label: `[${c.code}] ${c.name} (${c.location})`,
                          value: c.id,
                        }))}
                      />
                    </Col>
                    <Col xs={24} md={6}>
                      <Text strong style={{ display: 'block', marginBottom: 4 }}>Course Section / Group:</Text>
                      <Select
                        style={{ width: '100%' }}
                        value={selectedGroup}
                        onChange={setSelectedGroup}
                        options={[
                          { label: 'UG (Undergraduate 4Y NEP)', value: 'UG' },
                          { label: 'PG (Postgraduate MSc/MA/MCom)', value: 'PG' },
                          { label: 'MBA & MCA (AICTE)', value: 'MBA_MCA' },
                          { label: 'LAW (LL.B 3Y/5Y)', value: 'LAW' },
                          { label: 'Education (B.Ed / M.Ed)', value: 'EDUCATION' },
                          { label: 'Physical Education (B.P.Ed)', value: 'PHYSICAL_EDUCATION' },
                        ]}
                      />
                    </Col>
                    <Col xs={12} md={5}>
                      <Text strong style={{ display: 'block', marginBottom: 6 }}>Options:</Text>
                      <Space direction="vertical" size={2}>
                        <Space>
                          <Switch size="small" checked={includeInspection} onChange={setIncludeInspection} />
                          <span style={{ fontSize: '12px' }}>Inspection (₹8,000)</span>
                        </Space>
                        <Space>
                          <Switch size="small" checked={includeHostel} onChange={setIncludeHostel} />
                          <span style={{ fontSize: '12px' }}>Hostel Fees</span>
                        </Space>
                      </Space>
                    </Col>
                    <Col xs={12} md={5} style={{ textAlign: 'right' }}>
                      <Button
                        type="primary"
                        icon={<FileProtectOutlined />}
                        loading={generatingDemand}
                        onClick={handleGenerateDemand}
                        style={{ background: '#52c41a', border: 'none', fontWeight: 600 }}
                      >
                        Generate Official Demand
                      </Button>
                    </Col>
                  </Row>
                </Card>

                {/* Calculation Output */}
                {previewResult && (
                  <div>
                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                      <Col xs={24} md={8}>
                        <Card style={{ background: '#002147', color: '#fff', borderRadius: '8px' }}>
                          <Text style={{ color: '#D4AF37', fontWeight: 600 }}>TOTAL PAYABLE AMOUNT</Text>
                          <Title level={2} style={{ color: '#fff', margin: '8px 0 0' }}>
                            ₹{previewResult.totalINR.toLocaleString()}
                          </Title>
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                            Exact Integer: {previewResult.totalPaise.toLocaleString()} Paise
                          </Text>
                        </Card>
                      </Col>

                      <Col xs={12} md={8}>
                        <Card style={{ borderRadius: '8px' }}>
                          <Statistic
                            title="Active Enrolled Students (Count from Records)"
                            value={previewResult.totalActiveStudents}
                            prefix={<CalculatorOutlined style={{ color: '#1890ff' }} />}
                            suffix="Students"
                          />
                          <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
                            College Type: <Tag color="blue">{selectedColObj?.type}</Tag>
                            Location: <Tag color="cyan">{selectedColObj?.location}</Tag>
                          </div>
                        </Card>
                      </Col>

                      <Col xs={12} md={8}>
                        <Card style={{ borderRadius: '8px' }}>
                          <Statistic
                            title="Fee Heads Count"
                            value={previewResult.breakdown.length}
                            suffix="Applicable Heads"
                          />
                          <div style={{ marginTop: 8, fontSize: '12px', color: '#888' }}>
                            Academic Year: <strong>{previewResult.academicYear}</strong>
                          </div>
                        </Card>
                      </Col>
                    </Row>

                    {/* Breakdown Table */}
                    <Card
                      title={
                        <Space>
                          <CalculatorOutlined style={{ color: '#002147' }} />
                          <span>Detailed Fee Head & Component Breakup (Paise Accurate)</span>
                        </Space>
                      }
                      style={{ borderRadius: '8px' }}
                    >
                      <Table
                        dataSource={previewResult.breakdown}
                        rowKey="id"
                        pagination={false}
                        columns={[
                          {
                            title: 'Category',
                            dataIndex: 'category',
                            key: 'category',
                            render: (cat) => <Tag color="blue">{cat}</Tag>,
                          },
                          {
                            title: 'Fee Head Name',
                            dataIndex: 'head',
                            key: 'head',
                            render: (head, r) => (
                              <div>
                                <Text strong>{head}</Text>
                                <div style={{ fontSize: '11px', color: '#888' }}>{r.description}</div>
                              </div>
                            ),
                          },
                          {
                            title: 'Unit Count',
                            dataIndex: 'unitCount',
                            key: 'unitCount',
                            align: 'center',
                          },
                          {
                            title: 'Rate (₹)',
                            key: 'rate',
                            align: 'right',
                            render: (_, r) => `₹${Math.round(r.ratePaise / 100).toLocaleString()}`,
                          },
                          {
                            title: 'Amount (Paise)',
                            dataIndex: 'amountPaise',
                            key: 'amountPaise',
                            align: 'right',
                            render: (paise) => `${paise.toLocaleString()} p`,
                          },
                          {
                            title: 'Amount (INR)',
                            key: 'amountINR',
                            align: 'right',
                            render: (_, r) => (
                              <Text strong style={{ color: '#002147' }}>
                                ₹{Math.round(r.amountPaise / 100).toLocaleString()}
                              </Text>
                            ),
                          },
                        ]}
                      />
                    </Card>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'demands',
            label: (
              <span>
                <DollarOutlined /> Issued Official Demands ({demands.length})
              </span>
            ),
            children: (
              <Card style={{ borderRadius: '8px' }}>
                <Table
                  dataSource={demands}
                  rowKey="id"
                  loading={loadingDemands}
                  pagination={{ pageSize: 8 }}
                  columns={[
                    {
                      title: 'Demand Number',
                      dataIndex: 'demandNumber',
                      key: 'demandNumber',
                      render: (d) => <Text strong>{d}</Text>,
                    },
                    {
                      title: 'College',
                      key: 'col',
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
                      render: (grp) => <Tag color="blue">{grp}</Tag>,
                    },
                    {
                      title: 'Total (INR)',
                      key: 'total',
                      render: (_, r) => <Text strong>₹{r.totalINR?.toLocaleString()}</Text>,
                    },
                    {
                      title: 'Paid',
                      key: 'paid',
                      render: (_, r) => (
                        <span style={{ color: r.paidINR > 0 ? '#52c41a' : '#888' }}>
                          ₹{r.paidINR?.toLocaleString()}
                        </span>
                      ),
                    },
                    {
                      title: 'Balance',
                      key: 'balance',
                      render: (_, r) => (
                        <span style={{ color: r.balanceINR > 0 ? '#f5222d' : '#52c41a', fontWeight: 600 }}>
                          ₹{r.balanceINR?.toLocaleString()}
                        </span>
                      ),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (st) => {
                        const color = st === 'PAID' ? 'green' : st === 'PARTIALLY_PAID' ? 'orange' : 'red';
                        return <Tag color={color}>{st}</Tag>;
                      },
                    },
                    {
                      title: 'Action',
                      key: 'act',
                      render: (_, r) => (
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedDemand(r);
                            setDrawerOpen(true);
                          }}
                        >
                          View Breakdown
                        </Button>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'rules2026',
            label: (
              <span>
                <InfoCircleOutlined /> 2026-27 Fee Structure Reference
              </span>
            ),
            children: (
              <Card title="Adikavi Nannaya University - Affiliation Fee Matrix 2026-27" style={{ borderRadius: '8px' }}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card size="small" title="Undergraduate (UG) Fee Rules">
                      <ul>
                        <li>Inspection Fee: <strong>₹8,000</strong> (flat per college)</li>
                        <li>ICGS Sports Fund: <strong>₹1,600</strong> (flat per college)</li>
                        <li>Affiliation Slabs on Total Students:
                          <ul>
                            <li>1 to 100 Students: <strong>₹5,500</strong></li>
                            <li>101 to 300 Students: <strong>₹8,000</strong></li>
                            <li>301 to 600 Students: <strong>₹16,500</strong></li>
                            <li>601 to 1000 Students: <strong>₹24,500</strong></li>
                            <li>1001+ Students: <strong>₹27,500</strong></li>
                          </ul>
                        </li>
                        <li>Computer Lab Sections: Science <strong>₹3,300</strong> / Arts <strong>₹1,100</strong></li>
                        <li>Student Tuition/Univ Fee: 1st Year <strong>₹560</strong> / Other Years <strong>₹340</strong></li>
                        <li>Hostel Inspection: <strong>₹5,000</strong></li>
                        <li>Hostel Recognition: Rural <strong>₹5,500</strong> / Urban <strong>₹11,000</strong></li>
                      </ul>
                    </Card>
                  </Col>

                  <Col span={12}>
                    <Card size="small" title="PG, LAW & Education Fee Rules">
                      <ul>
                        <li><strong>LAW:</strong> 1st Year <strong>₹900</strong> / Other Years <strong>₹800</strong></li>
                        <li><strong>Education (B.Ed / B.P.Ed / D.P.Ed):</strong>
                          <ul>
                            <li>1st Year: <strong>₹1,660</strong> / 2nd Year: <strong>₹560</strong></li>
                            <li>Staff Ratification (Unratified): <strong>₹22,000</strong></li>
                            <li>Affiliation Slabs: <strong>₹22,000 / ₹27,500 / ₹33,000</strong></li>
                          </ul>
                        </li>
                        <li><strong>Postgraduate (PG):</strong>
                          <ul>
                            <li>M.Sc: <strong>₹1,300</strong> per student</li>
                            <li>M.A / M.Com / MHRM: <strong>₹1,200</strong> per student</li>
                            <li>M.Sc Computer Science: <strong>₹1,960</strong> per student</li>
                            <li>Management Quota: Arts <strong>₹3,300</strong> / Science <strong>₹5,500</strong></li>
                          </ul>
                        </li>
                      </ul>
                    </Card>
                  </Col>
                </Row>
              </Card>
            ),
          },
        ]}
      />

      {/* Demand Drawer */}
      <Drawer
        title={selectedDemand?.demandNumber || 'Demand Details'}
        placement="right"
        width={600}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedDemand && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message={`Demand Status: ${selectedDemand.status}`}
              description={`Due Date: ${new Date(selectedDemand.dueDate).toLocaleDateString()} • Grace Period: ${selectedDemand.graceDays} Days`}
              type={selectedDemand.status === 'PAID' ? 'success' : 'warning'}
              showIcon
            />

            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Demand No">{selectedDemand.demandNumber}</Descriptions.Item>
              <Descriptions.Item label="Academic Year">{selectedDemand.academicYear}</Descriptions.Item>
              <Descriptions.Item label="Course Group">{selectedDemand.courseGroupId}</Descriptions.Item>
              <Descriptions.Item label="Type">{selectedDemand.demandType}</Descriptions.Item>
              <Descriptions.Item label="Total Amount">₹{selectedDemand.totalINR?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Balance Due">₹{selectedDemand.balanceINR?.toLocaleString()}</Descriptions.Item>
            </Descriptions>

            <Title level={5}>Component Breakup:</Title>
            <Table
              size="small"
              pagination={false}
              dataSource={selectedDemand.breakdown || []}
              rowKey="head"
              columns={[
                { title: 'Fee Head', dataIndex: 'head', key: 'head' },
                { title: 'Units', dataIndex: 'unitCount', key: 'unitCount', align: 'center' },
                {
                  title: 'Amount (INR)',
                  key: 'amt',
                  align: 'right',
                  render: (_, r) => `₹${Math.round(r.amountPaise / 100).toLocaleString()}`,
                },
              ]}
            />
          </Space>
        )}
      </Drawer>
    </div>
  );
};
