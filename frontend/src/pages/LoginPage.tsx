import React, { useState } from 'react';
import { Card, Tabs, Input, Button, Alert, Space, Typography, message } from 'antd';
import {
  BankOutlined,
  UserOutlined,
  MobileOutlined,
  LockOutlined,
  KeyOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'UNIVERSITY' | 'COLLEGE'>('UNIVERSITY');
  const [universityEmail, setUniversityEmail] = useState('admin@aknu.edu.in');
  const [universityPassword, setUniversityPassword] = useState('Aknu@2026');

  const [collegeId, setCollegeId] = useState('001');
  const [collegePassword, setCollegePassword] = useState('Aknu@001');
  const [isPasswordUpdateMode, setIsPasswordUpdateMode] = useState(false);
  const [pendingCollegeName, setPendingCollegeName] = useState('');
  const [pendingIdentifier, setPendingIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);

  // University Email & Password Login
  const handleUniversityLogin = async () => {
    if (!universityEmail.trim()) {
      message.error('Please enter your official AKNU email');
      return;
    }
    if (!universityPassword) {
      message.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login({
        email: universityEmail.trim(),
        password: universityPassword,
      });

      login(res.data.accessToken, res.data.user);
      message.success('Login successful! Welcome to AKNU University Portal.');
      navigate('/university/dashboard');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Invalid official email or password.');
    } finally {
      setLoading(false);
    }
  };

  // College Principal Password Login
  const handleCollegeLogin = async () => {
    if (!collegeId.trim()) {
      message.error('Please enter your College Code or Official Email');
      return;
    }
    if (!collegePassword) {
      message.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.collegeLogin({
        identifier: collegeId.trim(),
        password: collegePassword,
      });

      if (res.data.mustChangePassword) {
        setIsPasswordUpdateMode(true);
        setPendingIdentifier(res.data.identifier || collegeId.trim());
        setPendingCollegeName(res.data.collegeName || 'Affiliated College');
        message.info(res.data.message || 'First-time login detected. Please create your permanent password.');
      } else {
        login(res.data.accessToken!, res.data.user!, res.data.college!);
        message.success('Login successful! Welcome to College Portal.');
        navigate('/college/dashboard');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Invalid login credentials or password.');
    } finally {
      setLoading(false);
    }
  };

  // College First-Time Password Update
  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      message.error('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      message.error('New Password and Confirm New Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.collegeUpdatePassword({
        identifier: pendingIdentifier || collegeId.trim(),
        currentPassword: collegePassword,
        newPassword: newPassword,
      });

      login(res.data.accessToken, res.data.user, res.data.college);
      message.success('Permanent password created successfully! Welcome to College Portal.');
      navigate('/college/dashboard');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update password. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001f3f 0%, #002b5c 40%, #0a3d62 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 500, width: '100%' }}>
        {/* AKNU University Seal & Banner */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src="/aknu-logo.png"
            alt="Adikavi Nannaya University"
            style={{
              width: 80,
              height: 80,
              objectFit: 'contain',
              borderRadius: '50%',
              background: '#ffffff',
              padding: '4px',
              border: '3px solid #D4AF37',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              marginBottom: 12,
            }}
          />
          <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
            Adikavi Nannaya University
          </Title>
          <Paragraph style={{ color: '#D4AF37', margin: '4px 0 0', fontWeight: 600 }}>
            College Development Council (CDC) - Affiliation Fee Portal
          </Paragraph>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
            Rajamahendravaram - 533296, Andhra Pradesh
          </Text>
        </div>

        {/* Login Card */}
        <Card
          style={{
            borderRadius: '14px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key as any);
              setIsPasswordUpdateMode(false);
            }}
            centered
            items={[
              {
                key: 'UNIVERSITY',
                label: (
                  <span>
                    <BankOutlined /> {t('auth.universityLogin')}
                  </span>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Paragraph type="secondary" style={{ fontSize: '13px', margin: 0 }}>
                      Super Admin, Dean CDC, and Section Officers. Enter your official email and password to access the portal.
                    </Paragraph>

                    <div>
                      <Text strong>Official Email Address</Text>
                      <Input
                        prefix={<UserOutlined style={{ color: '#002b5c' }} />}
                        placeholder="e.g. admin@aknu.edu.in or dean.cdc@aknu.edu.in"
                        value={universityEmail}
                        onChange={(e) => setUniversityEmail(e.target.value)}
                        size="large"
                        style={{ marginTop: 6 }}
                        onPressEnter={handleUniversityLogin}
                      />
                    </div>

                    <div>
                      <Text strong>Password</Text>
                      <Input.Password
                        prefix={<LockOutlined style={{ color: '#002b5c' }} />}
                        placeholder="Enter your password"
                        value={universityPassword}
                        onChange={(e) => setUniversityPassword(e.target.value)}
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                        size="large"
                        style={{ marginTop: 6 }}
                        onPressEnter={handleUniversityLogin}
                      />
                    </div>

                    <Button
                      type="primary"
                      block
                      size="large"
                      loading={loading}
                      onClick={handleUniversityLogin}
                      style={{
                        background: 'linear-gradient(135deg, #002b5c 0%, #0a3d62 100%)',
                        border: 'none',
                        fontWeight: 600,
                        marginTop: 4,
                      }}
                    >
                      Login to University Portal
                    </Button>
                  </Space>
                ),
              },
              {
                key: 'COLLEGE',
                label: (
                  <span>
                    <MobileOutlined /> {t('auth.collegeLogin')}
                  </span>
                ),
                children: (
                  <div>
                    {!isPasswordUpdateMode ? (
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Paragraph type="secondary" style={{ fontSize: '13px', margin: 0 }}>
                          Principal Login. Please enter your College Code or Official Email and Password to access your portal.
                        </Paragraph>

                        <div>
                          <Text strong>College Code or Official Email</Text>
                          <Input
                            prefix={<BankOutlined style={{ color: '#1e3c72' }} />}
                            placeholder="e.g. 001, 042, or principal.001@aknu.edu.in"
                            value={collegeId}
                            onChange={(e) => setCollegeId(e.target.value)}
                            size="large"
                            style={{ marginTop: 6 }}
                          />
                        </div>

                        <div>
                          <Text strong>Password</Text>
                          <Input.Password
                            prefix={<LockOutlined style={{ color: '#1e3c72' }} />}
                            placeholder="Enter password"
                            value={collegePassword}
                            onChange={(e) => setCollegePassword(e.target.value)}
                            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                            size="large"
                            style={{ marginTop: 6 }}
                            onPressEnter={handleCollegeLogin}
                          />
                        </div>

                        <Alert
                          type="info"
                          showIcon
                          message={
                            <span style={{ fontSize: '12px' }}>
                              <strong>First Time Login?</strong> Use your assigned temporary password (e.g. <code>Aknu@&lt;CollegeCode&gt;</code>). On submit, you will be prompted to create your new permanent password.
                            </span>
                          }
                        />

                        <Button
                          type="primary"
                          block
                          size="large"
                          loading={loading}
                          onClick={handleCollegeLogin}
                          style={{
                            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                            border: 'none',
                            fontWeight: 600,
                            marginTop: 4,
                          }}
                        >
                          Login to College Portal
                        </Button>
                      </Space>
                    ) : (
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Alert
                          type="warning"
                          showIcon
                          message="First-Time Login: Set Permanent Password"
                          description={
                            <span>
                              Temporary password verified for <strong>{pendingCollegeName}</strong> ({pendingIdentifier}). You must now set a new permanent password. Subsequent logins will strictly require your new password.
                            </span>
                          }
                        />

                        <div>
                          <Text strong>New Password</Text>
                          <Input.Password
                            prefix={<KeyOutlined style={{ color: '#52c41a' }} />}
                            placeholder="Enter new permanent password (min 6 characters)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                            size="large"
                            style={{ marginTop: 6 }}
                          />
                        </div>

                        <div>
                          <Text strong>Confirm New Password</Text>
                          <Input.Password
                            prefix={<KeyOutlined style={{ color: '#52c41a' }} />}
                            placeholder="Confirm new permanent password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                            size="large"
                            style={{ marginTop: 6 }}
                            onPressEnter={handleUpdatePassword}
                          />
                          {confirmPassword && newPassword !== confirmPassword && (
                            <Text type="danger" style={{ fontSize: '12px', marginTop: 4, display: 'block' }}>
                              Passwords do not match
                            </Text>
                          )}
                        </div>

                        <Button
                          type="primary"
                          block
                          size="large"
                          loading={loading}
                          onClick={handleUpdatePassword}
                          disabled={!newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                          style={{
                            background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                            border: 'none',
                            fontWeight: 700,
                            marginTop: 4,
                          }}
                        >
                          Save New Password & Enter College Portal
                        </Button>

                        <div style={{ textAlign: 'center' }}>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => {
                              setIsPasswordUpdateMode(false);
                              setNewPassword('');
                              setConfirmPassword('');
                            }}
                          >
                            ← Back to Login
                          </Button>
                        </div>
                      </Space>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* Public QR verification shortcut */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button
            type="link"
            onClick={() => navigate('/verify-proceeding')}
            style={{ color: '#D4AF37', fontSize: '13px' }}
          >
            🔍 Public QR Verification Portal for Proceedings & Receipts →
          </Button>
        </div>
      </div>
    </div>
  );
};
