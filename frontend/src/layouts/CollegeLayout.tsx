import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Space,
  Avatar,
  Tag,
  Typography,
  Select,
} from 'antd';
import {
  DashboardOutlined,
  CommentOutlined,
  LogoutOutlined,
  LeftOutlined,
  RightOutlined,
  BookOutlined,
  BarChartOutlined,
  DollarOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  ExperimentOutlined,
  BankOutlined,
  FileDoneOutlined,
  UsergroupAddOutlined,
  TeamOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const CollegeLayout: React.FC = () => {
  const { user, college, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [collegeData, setCollegeData] = useState<any>(college);

  useEffect(() => {
    if (college?.id) {
      api.colleges.getById(college.id).then((res) => {
        setCollegeData(res.data);
      }).catch(() => {});
    }
  }, [college?.id]);

  const courseList = collegeData?.courses || college?.courses || [];

  // Group approved courses strictly by stream
  const streamMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    courseList.forEach((c: any) => {
      let grp = (c.course?.courseGroup || c.courseGroup || c.stream || 'UG').toUpperCase();
      if (grp === 'MBA' || grp === 'MCA') {
        grp = 'MBA_MCA';
      }
      if (!map[grp]) map[grp] = [];
      map[grp].push(c);
    });
    return map;
  }, [courseList]);

  const offeredStreams = Object.keys(streamMap);

  const streamMeta: Record<string, { label: string; icon: React.ReactNode }> = {
    UG: { label: 'UG Programs (Undergraduate)', icon: <BookOutlined style={{ color: '#40a9ff' }} /> },
    PG: { label: 'PG Programs (Postgraduate)', icon: <ExperimentOutlined style={{ color: '#73d13d' }} /> },
    MBA_MCA: { label: 'MBA & MCA Department', icon: <ApartmentOutlined style={{ color: '#b37feb' }} /> },
    LAW: { label: 'Law Programs (LL.B / LL.M)', icon: <BankOutlined style={{ color: '#ff7a45' }} /> },
    EDUCATION: { label: 'Education (B.Ed / M.Ed)', icon: <SafetyCertificateOutlined style={{ color: '#36cfc9' }} /> },
    PHYSICAL_EDUCATION: { label: 'Physical Education (B.P.Ed)', icon: <SafetyCertificateOutlined style={{ color: '#36cfc9' }} /> },
  };

  const navItems = [
    {
      key: '/college/dashboard',
      icon: <DashboardOutlined style={{ color: '#f1c40f' }} />,
      label: <Link to="/college/dashboard">College Dashboard</Link>,
    },
    {
      key: '/college/proceedings',
      icon: <SafetyCertificateOutlined style={{ color: '#52c41a' }} />,
      label: <Link to="/college/proceedings" style={{ fontWeight: 600 }}>Official Proceedings</Link>,
    },
    {
      key: '/college/fees',
      icon: <DollarOutlined style={{ color: '#faad14' }} />,
      label: <Link to="/college/fees" style={{ fontWeight: 600 }}>Affiliation Fees & Demands</Link>,
    },
    {
      key: '/college/students',
      icon: <UsergroupAddOutlined style={{ color: '#1890ff' }} />,
      label: <Link to="/college/students">Admitted Students</Link>,
    },
    {
      key: '/college/seat-matrix',
      icon: <ApartmentOutlined style={{ color: '#13c2c2' }} />,
      label: <Link to="/college/seat-matrix">Sanctioned Seat Matrix</Link>,
    },
    {
      key: '/college/faculty',
      icon: <TeamOutlined style={{ color: '#b37feb' }} />,
      label: <Link to="/college/faculty">Teaching Faculty</Link>,
    },
    // Stream-Specific Navigation (ONLY for streams offered by this college)
    ...(offeredStreams.length > 0
      ? offeredStreams.map((st) => {
          const meta = streamMeta[st] || {
            label: `${st} Department`,
            icon: <BookOutlined style={{ color: '#69c0ff' }} />,
          };
          const count = streamMap[st]?.length || 0;

          return {
            key: `/college/stream/${st}`,
            icon: meta.icon,
            label: <span style={{ fontWeight: 600 }}>{meta.label}</span>,
            children: [
              {
                key: `/college/stream/${st}/admissions`,
                icon: <FileDoneOutlined style={{ color: '#52c41a' }} />,
                label: (
                  <Link to={`/college/stream/${st}/admissions`}>
                    Admitted Students ({count})
                  </Link>
                ),
              },
              {
                key: `/college/stream/${st}/payment`,
                icon: <DollarOutlined style={{ color: '#faad14' }} />,
                label: (
                  <Link to={`/college/stream/${st}/payment`}>
                    Affiliation Fee Payment
                  </Link>
                ),
              },
              {
                key: `/college/stream/${st}/annexure`,
                icon: <SafetyCertificateOutlined style={{ color: '#13c2c2' }} />,
                label: (
                  <Link to={`/college/stream/${st}/annexure`}>
                    Official Annexure & Proceeding
                  </Link>
                ),
              },
            ],
          };
        })
      : [
          {
            key: '/college/no-courses',
            icon: <BookOutlined style={{ color: '#d9d9d9' }} />,
            label: <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>No Courses Assigned</span>,
            disabled: true,
          },
        ]),
    {
      key: '/college/queries',
      icon: <CommentOutlined style={{ color: '#52c41a' }} />,
      label: <Link to="/college/queries">Workflow & Queries</Link>,
    },
    {
      key: '/college/reports',
      icon: <BarChartOutlined style={{ color: '#ff7875' }} />,
      label: <Link to="/college/reports">AISHE & Reports</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f6f8' }}>
      {/* College Portal Header */}
      <Header
        style={{
          background: 'linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '3px solid #f1c40f',
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          zIndex: 1000,
          minHeight: '70px',
          height: 'auto',
          lineHeight: 'normal',
          flexWrap: 'wrap',
          gap: '12px',
          position: 'sticky',
          top: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '4px 0' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '8px',
              background: '#f1c40f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e3c72',
              fontWeight: 800,
              fontSize: '16px',
            }}
          >
            {college?.code || '001'}
          </div>
          <div style={{ lineHeight: '1.25' }}>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700, lineHeight: 1.25 }}>
              {college?.name || 'Government Degree College (Autonomous), Rajamahendravaram'}
            </div>
            <Space size="small" style={{ marginTop: '4px' }} wrap>
              <Tag color="cyan" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                {college?.type || 'GOVERNMENT'}
              </Tag>
              <Tag color="geekblue" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                {college?.location || 'RURAL'}
              </Tag>
              {college?.isAutonomous && (
                <Tag color="purple" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                  AUTONOMOUS
                </Tag>
              )}
              {college?.hasHostel && (
                <Tag color="orange" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                  HOSTEL
                </Tag>
              )}
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px' }}>
                {college?.district || 'East Godavari'}
              </Text>
            </Space>
          </div>
        </div>

        {/* Right side controls */}
        <Space size="middle" align="center" wrap>
          <Space size="small">
            <Avatar style={{ backgroundColor: '#f1c40f', color: '#1e3c72', fontWeight: 'bold' }}>
              {user?.name?.charAt(0) || 'P'}
            </Avatar>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{user?.name || 'Principal'}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>College Code: {college?.code || '001'}</div>
            </div>
          </Space>

          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{ color: '#ff7875' }}
            title="Logout"
          />
        </Space>
      </Header>

      <Layout>
        {/* Left Navigation Sider */}
        <Sider
          collapsible
          trigger={null}
          breakpoint="lg"
          collapsedWidth={80}
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          width={240}
          style={{
            background: '#1a252f',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: 70,
            height: 'calc(100vh - 70px)',
            zIndex: 999,
          }}
        >
          {/* Edge Collapse / Expand Trigger on Top Right Edge */}
          <div
            role="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-edge-toggle"
            style={{
              position: 'absolute',
              top: 14,
              right: -13,
              zIndex: 1001,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#1a252f',
              border: '2px solid #f1c40f',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#f1c40f',
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <RightOutlined style={{ fontSize: 11, fontWeight: 'bold' }} />
            ) : (
              <LeftOutlined style={{ fontSize: 11, fontWeight: 'bold' }} />
            )}
          </div>

          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            defaultOpenKeys={offeredStreams.map((st) => `/college/stream/${st}`)}
            items={navItems}
            style={{ background: '#1a252f', paddingTop: '10px' }}
          />
        </Sider>

        {/* Content Area */}
        <Layout style={{ padding: '16px 20px 24px', overflowX: 'hidden' }}>
          <Content
            style={{
              margin: 0,
              minHeight: 280,
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};
