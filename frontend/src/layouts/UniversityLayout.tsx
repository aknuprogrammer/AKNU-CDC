import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Space,
  Avatar,
  Badge,
  Tag,
  Typography,
  Select,
} from 'antd';
import {
  DashboardOutlined,
  BankOutlined,
  BookOutlined,
  FileDoneOutlined,
  UsergroupAddOutlined,
  TeamOutlined,
  CalculatorOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CommentOutlined,
  BarChartOutlined,
  LogoutOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const UniversityLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      key: '/university/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/university/dashboard">Dashboard</Link>,
    },
    {
      key: '/university/colleges',
      icon: <BankOutlined />,
      label: <Link to="/university/colleges">Affiliated Colleges Master</Link>,
    },
    {
      key: '/university/proceedings',
      icon: <FileDoneOutlined />,
      label: <Link to="/university/proceedings">Proceedings & Affiliation</Link>,
    },
    {
      key: '/university/students',
      icon: <UsergroupAddOutlined />,
      label: <Link to="/university/students">Student Data & Intake</Link>,
    },
    {
      key: '/university/fee-engine',
      icon: <CalculatorOutlined />,
      label: <Link to="/university/fee-engine">Fee Engine & Demands</Link>,
    },
    {
      key: '/university/late-fee',
      icon: <ClockCircleOutlined />,
      label: <Link to="/university/late-fee">Late Fee & Waivers</Link>,
    },
    {
      key: '/university/finance',
      icon: <DollarOutlined />,
      label: <Link to="/university/finance">Payments & Accounts</Link>,
    },
    {
      key: '/university/workflow',
      icon: <CommentOutlined />,
      label: <Link to="/university/workflow">Workflow & Queries</Link>,
    },
    {
      key: '/university/reports',
      icon: <BarChartOutlined />,
      label: <Link to="/university/reports">AISHE & Reports</Link>,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Top AKNU University Branding Header */}
      <Header
        style={{
          background: 'linear-gradient(90deg, #001f3f 0%, #002b5c 50%, #0a3d62 100%)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '3px solid #D4AF37',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
          {/* AKNU Seal Emblem */}
          {/* Official AKNU University Seal Emblem */}
          <img
            src="/aknu-logo.png"
            alt="Adikavi Nannaya University"
            style={{
              width: 50,
              height: 50,
              minWidth: 50,
              objectFit: 'contain',
              borderRadius: '50%',
              background: '#ffffff',
              padding: '2px',
              border: '2px solid #D4AF37',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}
          />
          <div style={{ lineHeight: '1.25' }}>
            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700, letterSpacing: '0.2px' }}>
              Adikavi Nannaya University
            </div>
            <div style={{ color: '#D4AF37', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
              College Development Council (CDC) - Affiliation Fee Portal • Rajamahendravaram - 533296, Andhra Pradesh
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <Space size="middle" align="center" wrap>
          {/* Section Indicator */}
          {user?.courseSection && user.courseSection !== 'ALL' && (
            <Tag color="gold" style={{ fontWeight: 600, margin: 0 }}>
              Section: {user.courseSection}
            </Tag>
          )}

          {/* User Profile */}
          <Space size="small">
            <Avatar style={{ backgroundColor: '#D4AF37', color: '#001f3f', fontWeight: 'bold' }}>
              {user?.name?.charAt(0) || 'U'}
            </Avatar>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{user?.name || 'Administrator'}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>{user?.role?.replace(/_/g, ' ')}</div>
            </div>
          </Space>

          {/* Logout */}
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{ color: '#ff7875' }}
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
            background: '#001529',
            boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
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
              background: '#001529',
              border: '2px solid #D4AF37',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#D4AF37',
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
            items={navItems}
            style={{ background: '#001529', paddingTop: '10px' }}
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
