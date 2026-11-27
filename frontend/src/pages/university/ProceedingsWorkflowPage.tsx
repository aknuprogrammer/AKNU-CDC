import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Drawer,
  Typography,
  Divider,
  Alert,
  message,
  Upload,
  Tooltip,
} from 'antd';
import {
  FileDoneOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  QrcodeOutlined,
  UploadOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { api } from '../../api/client';
import { Proceeding, College } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const ProceedingsWorkflowPage: React.FC = () => {
  const { user } = useAuth();
  const [proceedings, setProceedings] = useState<Proceeding[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [draftModal, setDraftModal] = useState(false);
  const [viewDrawer, setViewDrawer] = useState(false);
  const [selectedProc, setSelectedProc] = useState<any | null>(null);
  const [form] = Form.useForm();

  // Option 2: Bulk Upload Affiliation Proceedings & Intakes (.xlsx) State
  const [bulkProcModalOpen, setBulkProcModalOpen] = useState(false);
  const [procPastedData, setProcPastedData] = useState<string>('');
  const [procParsedRows, setProcParsedRows] = useState<any[]>([]);
  const [procUploading, setProcUploading] = useState(false);

  // Option 3: Upload Official Proceeding PDF (Auto-fetch courses, streams & intakes)
  const [pdfUploadModalOpen, setPdfUploadModalOpen] = useState(false);
  const [pdfTargetCollegeId, setPdfTargetCollegeId] = useState<string>('');
  const [pdfSelectedFile, setPdfSelectedFile] = useState<File | null>(null);
  const [pdfParsedResult, setPdfParsedResult] = useState<any | null>(null);
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfConfirming, setPdfConfirming] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.proceedings.list(),
        api.colleges.list(),
      ]);
      setProceedings(pRes.data);
      setColleges(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDraft = async (values: any) => {
    try {
      const college = colleges.find((c) => c.id === values.collegeId);
      const items = [
        {
          courseName: values.courseName || 'B.Sc (Mathematics, Physics, Computer Science)',
          sanctionedIntake: Number(values.sanctionedIntake) || 60,
          convenorQuota: Math.round((Number(values.sanctionedIntake) || 60) * 0.7),
          spotAdmission: Math.round((Number(values.sanctionedIntake) || 60) * 0.1),
          managementQuota: Math.round((Number(values.sanctionedIntake) || 60) * 0.2),
        },
      ];

      await api.proceedings.createDraft({
        collegeId: values.collegeId,
        courseGroupId: values.courseGroupId,
        templateType: values.templateType,
        subject: values.subject,
        bodyTemplate: values.bodyTemplate,
        conditions: values.conditions,
        items,
      });

      message.success('Proceeding drafted successfully!');
      setDraftModal(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error('Failed to create draft proceeding');
    }
  };

  const handleSuperintendentCheck = async (id: string) => {
    try {
      await api.proceedings.check(id);
      message.success('Proceeding verified and recommended by Superintendent!');
      loadData();
    } catch (err) {
      message.error('Action failed');
    }
  };

  const handleDeanSign = async (id: string) => {
    try {
      await api.proceedings.sign(id);
      message.success('Digitally signed (DSC) and issued to college portal with SMS alert!');
      loadData();
    } catch (err) {
      message.error('Signing failed');
    }
  };

  const handleBulkSign = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one proceeding to sign.');
      return;
    }
    try {
      await api.proceedings.bulkApprove(selectedRowKeys as string[]);
      message.success(`Successfully batch-signed (DSC) and issued ${selectedRowKeys.length} proceedings!`);
      setSelectedRowKeys([]);
      loadData();
    } catch (err) {
      message.error('Bulk signing failed');
    }
  };

  const handleTemplateChange = (val: string) => {
    if (val === 'AFFILIATION') {
      form.setFieldsValue({
        subject: 'Grant of Affiliation & Sanction of Course Intake Caps for Academic Year 2026-27',
        bodyTemplate:
          'Sub: AKNU - CDC - Grant of Affiliation for Approved Courses - Orders - Issued.\nRef: 1. Application from College Principal.\n2. Inspection Commission Report dated 12-06-2026.\n3. Orders of the Hon’ble Vice-Chancellor.',
        conditions:
          '1. Adhere strictly to sanctioned intake limit; no excess admissions entertained.\n2. Remit all prescribed affiliation fees before cut-off date.\n3. Maintain qualified faculty with university ratification.',
      });
    } else if (val === 'CORRIGENDUM') {
      form.setFieldsValue({
        subject: 'Corrigendum - Amendment to Course Intake Sanction Order 2026-27',
        bodyTemplate:
          'In partial modification to the earlier Affiliation Proceedings, the following revised seat intake matrix is hereby approved.',
        conditions: 'All other terms and conditions remain unaltered.',
      });
    } else if (val === 'FEE_NOTICE') {
      form.setFieldsValue({
        subject: 'Demand Notice - Affiliation & Inspection Fee Collection for 2026-27',
        bodyTemplate:
          'Notice is hereby given to the Management/Principal to remit the outstanding affiliation fees on CDC portal.',
        conditions: 'Late fees will apply after expiry of 15 grace days.',
      });
    }
  };

  // Option 2: Excel Bulk Upload Affiliation Proceedings & Sanctioned Intakes
  const parseProceedingsText = (rawText: string) => {
    if (!rawText.trim()) {
      setProcParsedRows([]);
      return;
    }

    const lines = rawText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    let delimiter = ',';
    if (lines[0].includes('\t')) delimiter = '\t';
    else if (lines[0].includes(';') && !lines[0].includes(',')) delimiter = ';';

    const headerParts = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ''));
    const isHeader = headerParts.some((h) => h.includes('college') || h.includes('course') || h.includes('intake') || h.includes('year'));
    const dataLines = isHeader ? lines.slice(1) : lines;

    const rows: any[] = [];
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      const parts = line.split(delimiter).map((p) => p.trim());
      const rowObj: any = { _rowNum: i + 1 };

      if (isHeader) {
        headerParts.forEach((h, idx) => {
          const val = parts[idx] !== undefined ? parts[idx] : '';
          if (h.includes('collegecode') || h === 'code') rowObj.collegeCode = val;
          else if (h.includes('collegename') || h.includes('college')) rowObj.collegeName = val;
          else if (h.includes('year') || h.includes('ay')) rowObj.academicYear = val;
          else if (h.includes('group')) rowObj.courseGroup = val.toUpperCase();
          else if (h.includes('coursename') || h.includes('course') || h.includes('program')) rowObj.courseName = val;
          else if (h.includes('intake') || h.includes('sanctioned') || h.includes('capacity')) rowObj.sanctionedIntake = parseInt(val, 10) || 60;
          else if (h.includes('convenor') || h.includes('cq')) rowObj.convenorQuota = parseInt(val, 10);
          else if (h.includes('management') || h.includes('mq')) rowObj.managementQuota = parseInt(val, 10);
        });
      } else {
        rowObj.collegeCode = parts[0] || '';
        rowObj.collegeName = parts[1] || '';
        rowObj.academicYear = parts[2] || '2026-27';
        rowObj.courseGroup = (parts[3] || 'UG').toUpperCase();
        rowObj.courseName = parts[4] || '';
        rowObj.sanctionedIntake = parseInt(parts[5], 10) || 60;
        rowObj.convenorQuota = parts[6] ? parseInt(parts[6], 10) : undefined;
        rowObj.managementQuota = parts[7] ? parseInt(parts[7], 10) : undefined;
      }

      if (!rowObj.academicYear) rowObj.academicYear = '2026-27';
      if (!rowObj.courseGroup) rowObj.courseGroup = 'UG';
      if (!rowObj.convenorQuota && rowObj.sanctionedIntake) {
        rowObj.convenorQuota = Math.round(rowObj.sanctionedIntake * 0.7);
      }
      if (!rowObj.managementQuota && rowObj.sanctionedIntake) {
        rowObj.managementQuota = Math.round(rowObj.sanctionedIntake * 0.3);
      }

      rowObj._isValid = !!(rowObj.collegeCode && rowObj.courseName && rowObj.sanctionedIntake > 0);
      rowObj._error = !rowObj.collegeCode
        ? 'Missing College Code'
        : !rowObj.courseName
        ? 'Missing Course Name'
        : !rowObj.sanctionedIntake
        ? 'Invalid Intake'
        : null;

      rows.push(rowObj);
    }

    setProcParsedRows(rows);
  };

  const handleProcFileUpload = (file: File) => {
    const isExcel =
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel';

    const reader = new FileReader();
    if (isExcel) {
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet);
          setProcPastedData(csvText);
          parseProceedingsText(csvText);
          message.success(`Parsed Affiliation Proceedings Excel (.xlsx): ${file.name}`);
        } catch (err) {
          message.error('Failed to parse Excel file. Please ensure it is a valid .xlsx file.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setProcPastedData(text);
        parseProceedingsText(text);
        message.success(`Parsed file: ${file.name}`);
      };
      reader.readAsText(file);
    }
    return false;
  };

  const downloadProceedingsTemplate = () => {
    const headers = [
      'College_Code',
      'College_Name',
      'Academic_Year',
      'Course_Group',
      'Course_Name',
      'Sanctioned_Intake',
      'Convenor_Quota',
      'Management_Quota',
    ];
    const rows = [
      headers,
      ['001', 'Government Degree College (Autonomous)', '2026-27', 'UG', 'B.Sc Data Science & AI', 60, 42, 18],
      ['001', 'Government Degree College (Autonomous)', '2026-27', 'UG', 'B.Com Computer Applications', 120, 84, 36],
      ['001', 'Government Degree College (Autonomous)', '2026-27', 'MBA_MCA', 'Master of Business Administration', 60, 42, 18],
      ['002', 'Aditya Degree College for Women', '2026-27', 'UG', 'B.Sc Data Science & AI', 120, 84, 36],
      ['002', 'Aditya Degree College for Women', '2026-27', 'MBA_MCA', 'Master of Business Administration', 60, 42, 18],
      ['003', 'SKBR College', '2026-27', 'UG', 'B.Com Computer Applications', 60, 42, 18],
      ['003', 'SKBR College', '2026-27', 'MBA_MCA', 'Master of Computer Applications', 60, 42, 18],
      ['004', 'P.R. Government Degree College', '2026-27', 'UG', 'B.Sc Data Science & AI', 120, 84, 36],
      ['004', 'P.R. Government Degree College', '2026-27', 'UG', 'B.Com Computer Applications', 120, 84, 36],
      ['004', 'P.R. Government Degree College', '2026-27', 'MBA_MCA', 'Master of Business Administration', 60, 42, 18],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 42 },
      { wch: 16 },
      { wch: 16 },
      { wch: 36 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AffiliationProceedings');
    XLSX.writeFile(wb, 'AKNU_Affiliation_Proceedings_Template.xlsx');
    message.success('Downloaded AKNU_Affiliation_Proceedings_Template.xlsx successfully!');
  };

  const loadDemoProceedingsData = () => {
    const demo =
      'College_Code,College_Name,Academic_Year,Course_Group,Course_Name,Sanctioned_Intake,Convenor_Quota,Management_Quota\n' +
      '004,P.R. Government Degree College,2026-27,UG,B.Sc Data Science & AI,120,84,36\n' +
      '004,P.R. Government Degree College,2026-27,UG,B.Com Computer Applications,120,84,36\n' +
      '004,P.R. Government Degree College,2026-27,MBA_MCA,Master of Business Administration,60,42,18\n' +
      '005,VSM College of Arts & Science,2026-27,UG,B.Sc Data Science & AI,60,42,18\n' +
      '005,VSM College of Arts & Science,2026-27,MBA_MCA,Master of Business Administration,60,42,18\n' +
      '006,Sri YN College,2026-27,UG,B.Sc Data Science & AI,60,42,18\n' +
      '006,Sri YN College,2026-27,MBA_MCA,Master of Computer Applications,60,42,18\n' +
      '007,DNR College,2026-27,UG,B.Com Computer Applications,120,84,36\n' +
      '007,DNR College,2026-27,MBA_MCA,Master of Business Administration,120,84,36\n' +
      '008,Ideal Institute of Degree Studies,2026-27,UG,B.Sc Data Science & AI,60,42,18\n';
    setProcPastedData(demo);
    parseProceedingsText(demo);
  };

  const handleExecuteBulkProceedingsUpload = async () => {
    const validRows = procParsedRows.filter((r) => r._isValid);
    if (!validRows.length) {
      message.error('No valid proceeding rows found to import.');
      return;
    }

    setProcUploading(true);
    try {
      const res = await api.proceedings.bulkUpload(validRows);
      message.success(
        `Issued ${res.data.proceedingsCreated} Affiliation Proceedings with DSC Digital Signature & Synced Course Intakes!`,
      );
      setBulkProcModalOpen(false);
      setProcPastedData('');
      setProcParsedRows([]);
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Bulk proceedings upload failed');
    } finally {
      setProcUploading(false);
    }
  };

  const handlePdfFileSelect = async (file: File) => {
    if (!pdfTargetCollegeId) {
      message.error('Please select a college first before uploading its proceeding PDF.');
      return false;
    }
    setPdfSelectedFile(file);
    setPdfParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('collegeId', pdfTargetCollegeId);
      formData.append('academicYear', '2026-27');

      const res = await api.proceedings.uploadPdf(formData);
      setPdfParsedResult(res.data);
      message.success(`Parsed ${res.data.parsedData.courses?.length || 0} single-major programmes from official PDF!`);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to extract text from PDF');
    } finally {
      setPdfParsing(false);
    }
    return false;
  };

  const handleConfirmPdfProceeding = async () => {
    if (!pdfParsedResult || !pdfTargetCollegeId) return;
    setPdfConfirming(true);
    try {
      const payload = {
        collegeId: pdfTargetCollegeId,
        proceedingNumber: pdfParsedResult.parsedData.proceedingNumber,
        academicYear: pdfParsedResult.parsedData.academicYear || '2026-27',
        courseGroupId: 'UG',
        subject: pdfParsedResult.parsedData.subject,
        bodyTemplate: pdfParsedResult.parsedData.orderBody,
        conditions: pdfParsedResult.parsedData.conditions,
        items: pdfParsedResult.parsedData.courses,
        pdfUrl: pdfParsedResult.fileMeta.relativeUrl,
        originalFileName: pdfParsedResult.fileMeta.originalFileName,
        fileSizeBytes: pdfParsedResult.fileMeta.fileSizeBytes,
      };

      await api.proceedings.confirmUpload(payload);
      message.success(
        `Official Proceeding issued to Principal portal & ${payload.items.length} Single Major courses auto-synced!`,
      );
      setPdfUploadModalOpen(false);
      setPdfTargetCollegeId('');
      setPdfSelectedFile(null);
      setPdfParsedResult(null);
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to confirm proceeding upload');
    } finally {
      setPdfConfirming(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#002147' }}>
            Proceedings & Affiliation Orders Register
          </Title>
          <Text type="secondary">
            Section Draft → Superintendent Verification → Dean/Registrar Bulk DSC e-Signing → Digital Issuance & Intake Sync
          </Text>
        </div>
        <Space wrap size="small">
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadProceedingsTemplate}
          >
            Affiliation Template (.xlsx)
          </Button>
          <Button
            icon={<FilePdfOutlined style={{ color: '#cf1322' }} />}
            onClick={() => {
              setPdfParsedResult(null);
              setPdfSelectedFile(null);
              setPdfTargetCollegeId('');
              setPdfUploadModalOpen(true);
            }}
            style={{ borderColor: '#ffa39e', color: '#cf1322' }}
          >
            Upload Proceeding PDF
          </Button>
          <Button
            icon={<UploadOutlined style={{ color: '#096dd9' }} />}
            onClick={() => {
              setProcPastedData('');
              setProcParsedRows([]);
              setBulkProcModalOpen(true);
            }}
            style={{ borderColor: '#91d5ff', color: '#096dd9' }}
          >
            Bulk Issue Proceedings (.xlsx)
          </Button>
          <Button
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={handleBulkSign}
            disabled={selectedRowKeys.length === 0}
            style={{ background: '#52c41a', border: 'none' }}
          >
            Bulk DSC Sign & Issue ({selectedRowKeys.length})
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              handleTemplateChange('AFFILIATION');
              setDraftModal(true);
            }}
            style={{ background: '#002147' }}
          >
            Draft New Proceeding
          </Button>
        </Space>
      </div>

      <Card style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          dataSource={proceedings}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: 'Proceeding No',
              dataIndex: 'proceedingNumber',
              key: 'proceedingNumber',
              render: (val, r) => (
                <Space direction="vertical" size={2}>
                  <Text strong>{val}</Text>
                  {r.pdfUrl ? (
                    <Tag color="red" icon={<FilePdfOutlined />}>
                      Official PDF
                    </Tag>
                  ) : null}
                </Space>
              ),
            },
            {
              title: 'College',
              key: 'college',
              render: (_, r) => (
                <div>
                  <Text strong>{r.collegeName}</Text>
                  <div style={{ fontSize: '11px', color: '#888' }}>Code: {r.collegeCode}</div>
                </div>
              ),
            },
            {
              title: 'Type & Section',
              key: 'type',
              render: (_, r) => (
                <Space direction="vertical" size={2}>
                  <Tag color="cyan">{r.templateType}</Tag>
                  <Tag color="blue">{r.courseGroupId}</Tag>
                </Space>
              ),
            },
            {
              title: 'Workflow Status',
              dataIndex: 'status',
              key: 'status',
              render: (status) => {
                const color =
                  status === 'ISSUED' || status === 'ACKNOWLEDGED'
                    ? 'green'
                    : status === 'SUPERINTENDENT_CHECKED'
                    ? 'gold'
                    : status === 'APPROVED'
                    ? 'cyan'
                    : 'default';
                return <Tag color={color} style={{ fontWeight: 600 }}>{status}</Tag>;
              },
            },
            {
              title: 'DSC / e-Sign',
              key: 'dsc',
              render: (_, r) =>
                r.dscSignatureHash ? (
                  <Tag color="green" icon={<SafetyCertificateOutlined />}>
                    Signed
                  </Tag>
                ) : (
                  <Tag color="orange">Pending Sign</Tag>
                ),
            },
            {
              title: 'Workflow Actions',
              key: 'actions',
              render: (_, r) => (
                <Space size="small">
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => {
                      setSelectedProc(r);
                      setViewDrawer(true);
                    }}
                  >
                    View
                  </Button>

                  {r.pdfUrl && (
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => window.open(api.proceedings.getDownloadUrl(r.id), '_blank')}
                      style={{ borderColor: '#ff4d4f', color: '#cf1322' }}
                    >
                      PDF
                    </Button>
                  )}

                  {r.status === 'DRAFT' && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => handleSuperintendentCheck(r.id)}
                      style={{ background: '#faad14', borderColor: '#faad14' }}
                    >
                      Check
                    </Button>
                  )}

                  {r.status === 'SUPERINTENDENT_CHECKED' && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<SafetyCertificateOutlined />}
                      onClick={() => handleDeanSign(r.id)}
                      style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    >
                      Sign & Issue
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* View Proceeding Order Drawer */}
      <Drawer
        title={selectedProc?.proceedingNumber || 'Proceeding Order'}
        placement="right"
        width={680}
        onClose={() => setViewDrawer(false)}
        open={viewDrawer}
      >
        {selectedProc && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message={`Status: ${selectedProc.status}`}
              description={
                selectedProc.dscSignatureHash
                  ? `Authenticated with Digital Signature Certificate (DSC): ${selectedProc.dscSignatureHash.slice(0, 32)}...`
                  : 'Pending final review and signature by Dean CDC.'
              }
              type={selectedProc.dscSignatureHash ? 'success' : 'info'}
              showIcon
            />

            {selectedProc.pdfUrl && (
              <Alert
                message="Official Signed Vice-Chancellor Proceeding Order Attached"
                description={`Uploaded Document: ${selectedProc.originalFileName || 'AKNU_Affiliation_Proceeding.pdf'}`}
                type="success"
                showIcon
                action={
                  <Button
                    type="primary"
                    danger
                    icon={<DownloadOutlined />}
                    onClick={() => window.open(api.proceedings.getDownloadUrl(selectedProc.id), '_blank')}
                  >
                    Download PDF
                  </Button>
                }
              />
            )}

            <div>
              <Text type="secondary">Subject:</Text>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#002147' }}>
                {selectedProc.subject}
              </div>
            </div>

            <Card size="small" style={{ background: '#fafafa' }}>
              <Paragraph style={{ whiteSpace: 'pre-line', margin: 0, fontSize: '13px' }}>
                {selectedProc.bodyTemplate}
              </Paragraph>
            </Card>

            <Title level={5}>Sanctioned Intake Matrix (Binding Admission Cap):</Title>
            <Table
              size="small"
              pagination={false}
              dataSource={selectedProc.items || []}
              rowKey="courseName"
              columns={[
                { title: 'Course Name', dataIndex: 'courseName', key: 'courseName' },
                { title: 'Total Intake', dataIndex: 'sanctionedIntake', key: 'sanctionedIntake' },
                { title: 'Convenor (CQ)', dataIndex: 'convenorQuota', key: 'convenorQuota' },
                { title: 'Spot (SA)', dataIndex: 'spotAdmission', key: 'spotAdmission' },
                { title: 'Management (MQ)', dataIndex: 'managementQuota', key: 'managementQuota' },
              ]}
            />

            <div>
              <Text strong>Mandatory Conditions:</Text>
              <Paragraph style={{ whiteSpace: 'pre-line', fontSize: '12px', color: '#555' }}>
                {selectedProc.conditions}
              </Paragraph>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                  QR Verification Code:
                </Text>
                <code>{selectedProc.qrVerificationCode}</code>
              </div>
              <Button
                icon={<QrcodeOutlined />}
                onClick={() => window.open(`/verify-proceeding?code=${selectedProc.qrVerificationCode}`, '_blank')}
              >
                Public QR Page
              </Button>
            </div>
          </Space>
        )}
      </Drawer>

      {/* Draft New Proceeding Modal */}
      <Modal
        title="Draft Affiliation Proceeding from Template"
        open={draftModal}
        width={680}
        onCancel={() => setDraftModal(false)}
        onOk={() => form.submit()}
      >
        <Form layout="vertical" form={form} onFinish={handleCreateDraft}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="templateType" label="Template Type" initialValue="AFFILIATION">
                <Select
                  onChange={handleTemplateChange}
                  options={[
                    { label: 'Affiliation Order', value: 'AFFILIATION' },
                    { label: 'Intake Sanction', value: 'INTAKE_SANCTION' },
                    { label: 'Corrigendum Order', value: 'CORRIGENDUM' },
                    { label: 'Supplementary Intake', value: 'SUPPLEMENTARY' },
                    { label: 'Fee Demand Notice', value: 'FEE_NOTICE' },
                    { label: 'General Circular', value: 'CIRCULAR' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="courseGroupId" label="Course Group" initialValue="UG">
                <Select
                  options={[
                    { label: 'Undergraduate (UG)', value: 'UG' },
                    { label: 'Postgraduate (PG)', value: 'PG' },
                    { label: 'MBA & MCA', value: 'MBA_MCA' },
                    { label: 'LAW', value: 'LAW' },
                    { label: 'Education (B.Ed)', value: 'EDUCATION' },
                    { label: 'Physical Education', value: 'PHYSICAL_EDUCATION' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="collegeId" label="Affiliated College" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select College"
              options={colleges.map((c) => ({
                label: `[${c.code}] ${c.name} (${c.district})`,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="courseName" label="Course Name" initialValue="B.Sc (Mathematics, Physics, Computer Science)">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sanctionedIntake" label="Sanctioned Intake" initialValue={60}>
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="subject" label="Proceeding Subject" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="bodyTemplate" label="Order Content Body">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item name="conditions" label="Conditions">
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item name="attachedPdf" label="Add / Upload PDF">
            <Upload
              accept=".pdf"
              maxCount={1}
              beforeUpload={() => false}
              listType="text"
            >
              <Button icon={<UploadOutlined />}>Select PDF File</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* ==========================================
          MODAL: BULK UPLOAD AFFILIATION PROCEEDINGS (OPTION 2)
          ========================================== */}
      <Modal
        title={
          <Space>
            <UploadOutlined style={{ color: '#096dd9' }} />
            <span style={{ fontWeight: 700, color: '#002147' }}>
              Bulk Issue Affiliation Proceedings & Sanctioned Intakes (.xlsx)
            </span>
          </Space>
        }
        open={bulkProcModalOpen}
        onCancel={() => {
          setBulkProcModalOpen(false);
          setProcPastedData('');
          setProcParsedRows([]);
        }}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            type="info"
            showIcon
            message="Affiliation Proceedings & Intake Cap Enforcement (Option 2)"
            description="Upload official university affiliation orders with course intakes (.xlsx). The system automatically drafts, digitally signs (DSC), publishes official proceedings with QR codes, and syncs sanctioned intakes into college seat matrices."
            style={{ marginBottom: 14 }}
          />

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Upload.Dragger
                name="file"
                multiple={false}
                accept=".xlsx,.xls,.csv,.txt,.tsv"
                beforeUpload={handleProcFileUpload}
                showUploadList={false}
                style={{ padding: '16px 0', background: '#fafafa', borderRadius: '6px' }}
              >
                <p className="ant-upload-drag-icon" style={{ margin: 0 }}>
                  <FileExcelOutlined style={{ fontSize: 28, color: '#52c41a' }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: '13px', margin: '4px 0 0', fontWeight: 600 }}>
                  Click or drag Affiliation Orders Excel (.xlsx)
                </p>
                <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>Supports .xlsx, .xls, .csv</p>
              </Upload.Dragger>
            </Col>

            <Col xs={24} md={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  block
                  icon={<DownloadOutlined />}
                  onClick={downloadProceedingsTemplate}
                >
                  Download Affiliation Template (.xlsx)
                </Button>
                <Button
                  block
                  icon={<ThunderboltOutlined />}
                  onClick={loadDemoProceedingsData}
                >
                  Load Demo Affiliation Orders
                </Button>
              </Space>
            </Col>
          </Row>

          <div style={{ marginTop: 12 }}>
            <Text strong style={{ fontSize: '12px' }}>Or Paste Tabular Data from Excel / CSV:</Text>
            <TextArea
              rows={4}
              placeholder="College_Code,College_Name,Academic_Year,Course_Group,Course_Name,Sanctioned_Intake,Convenor_Quota,Management_Quota..."
              value={procPastedData}
              onChange={(e) => {
                setProcPastedData(e.target.value);
                parseProceedingsText(e.target.value);
              }}
              style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: 4 }}
            />
          </div>
        </div>

        {/* Preview parsed proceedings rows */}
        {procParsedRows.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>
                Parsed Affiliation Orders ({procParsedRows.length} entries,{' '}
                <Text type="success">{procParsedRows.filter((r) => r._isValid).length} ready</Text>)
              </Text>
              <Tag color="green">
                Total Sanctioned Seats:{' '}
                {procParsedRows
                  .filter((r) => r._isValid)
                  .reduce((sum, r) => sum + (r.sanctionedIntake || 0), 0)}
              </Tag>
            </div>
            <Table
              dataSource={procParsedRows}
              rowKey="_rowNum"
              pagination={{ pageSize: 5, size: 'small' }}
              scroll={{ x: 800 }}
              size="small"
              columns={[
                {
                  title: 'Row',
                  dataIndex: '_rowNum',
                  key: '_rowNum',
                  width: 50,
                  fixed: 'left',
                },
                {
                  title: 'Status',
                  key: '_isValid',
                  width: 85,
                  fixed: 'left',
                  render: (_, r) =>
                    r._isValid ? <Tag color="success">READY</Tag> : <Tag color="error">INVALID</Tag>,
                },
                {
                  title: 'College Code',
                  dataIndex: 'collegeCode',
                  key: 'collegeCode',
                  width: 100,
                  render: (c) => <Tag color="blue">{c}</Tag>,
                },
                {
                  title: 'Academic Year',
                  dataIndex: 'academicYear',
                  key: 'academicYear',
                  width: 100,
                  render: (y) => <Tag>{y || '2026-27'}</Tag>,
                },
                {
                  title: 'Group',
                  dataIndex: 'courseGroup',
                  key: 'courseGroup',
                  width: 90,
                  render: (g) => <Tag color="geekblue">{g || 'UG'}</Tag>,
                },
                {
                  title: 'Course / Branch Name',
                  dataIndex: 'courseName',
                  key: 'courseName',
                  width: 200,
                  ellipsis: true,
                  render: (n) => <span style={{ fontWeight: 600 }}>{n}</span>,
                },
                {
                  title: 'Sanctioned Intake',
                  dataIndex: 'sanctionedIntake',
                  key: 'sanctionedIntake',
                  width: 120,
                  render: (i) => (
                    <Tag color="green" style={{ fontWeight: 800 }}>
                      {i || 60} Seats
                    </Tag>
                  ),
                },
                {
                  title: 'Quotas (CQ / MQ)',
                  key: 'quotas',
                  width: 120,
                  render: (_, r) => (
                    <span style={{ fontSize: '11px' }}>
                      CQ: {r.convenorQuota ?? Math.round((r.sanctionedIntake || 60) * 0.7)} | MQ:{' '}
                      {r.managementQuota ?? Math.round((r.sanctionedIntake || 60) * 0.3)}
                    </span>
                  ),
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 70,
                  fixed: 'right',
                  render: (_, record) => (
                    <Tooltip title="Delete Row">
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setProcParsedRows((prev) =>
                            prev.filter((item) => item._rowNum !== record._rowNum),
                          );
                        }}
                      />
                    </Tooltip>
                  ),
                },
              ]}
            />
          </div>
        )}

        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button
              onClick={() => {
                setBulkProcModalOpen(false);
                setProcPastedData('');
                setProcParsedRows([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SafetyCertificateOutlined />}
              loading={procUploading}
              disabled={!procParsedRows.some((r) => r._isValid)}
              onClick={handleExecuteBulkProceedingsUpload}
              style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 700 }}
            >
              Issue & Digitally Sign Orders (Sync Intakes)
            </Button>
          </Space>
        </div>
      </Modal>

      {/* Upload Official Proceeding PDF Modal */}
      <Modal
        title={
          <Space>
            <FilePdfOutlined style={{ color: '#cf1322', fontSize: '20px' }} />
            <span>Upload Official Proceeding PDF (Vice-Chancellor Order)</span>
          </Space>
        }
        open={pdfUploadModalOpen}
        width={850}
        onCancel={() => {
          setPdfUploadModalOpen(false);
          setPdfParsedResult(null);
          setPdfSelectedFile(null);
          setPdfTargetCollegeId('');
        }}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            message="Auto-Fetch College Courses, Streams & Sanctioned Intakes"
            description="Upload the official 3-page Vice-Chancellor Proceeding Order (.pdf). The extraction engine will automatically parse single-major programmes, sanctioned intakes, and regulatory conditions, then immediately make it accessible exclusively to the respective College Principal portal."
            type="info"
            showIcon
          />

          <Row gutter={16}>
            <Col span={14}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>1. Select Target Affiliated College:</div>
              <Select
                showSearch
                style={{ width: '100%' }}
                placeholder="Search and select college by code or name..."
                optionFilterProp="children"
                value={pdfTargetCollegeId || undefined}
                onChange={(val) => setPdfTargetCollegeId(val)}
                options={colleges.map((c) => ({
                  value: c.id,
                  label: `[Code: ${c.code}] ${c.name} (${c.district})`,
                }))}
              />
            </Col>
            <Col span={10}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>2. Select Proceeding PDF:</div>
              <Upload.Dragger
                accept=".pdf,application/pdf"
                multiple={false}
                showUploadList={false}
                beforeUpload={handlePdfFileSelect}
                disabled={!pdfTargetCollegeId || pdfParsing}
                style={{ padding: '8px 0' }}
              >
                <p className="ant-upload-drag-icon" style={{ margin: '4px 0' }}>
                  <FilePdfOutlined style={{ color: pdfTargetCollegeId ? '#cf1322' : '#bfbfbf', fontSize: '28px' }} />
                </p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                  {pdfParsing ? 'Parsing Document...' : pdfSelectedFile ? pdfSelectedFile.name : 'Click / Drag Proceeding PDF'}
                </p>
              </Upload.Dragger>
            </Col>
          </Row>

          {pdfParsedResult && (
            <Card
              size="small"
              style={{ background: '#f6ffed', borderColor: '#b7eb8f', borderRadius: '8px' }}
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span style={{ fontWeight: 700 }}>
                    Extracted: {pdfParsedResult.parsedData?.courses?.length || 0} Single-Major Programmes (Total Intake: {pdfParsedResult.parsedData?.courses?.reduce((sum: number, c: any) => sum + (c.sanctionedIntake || 0), 0)} Seats)
                  </span>
                </Space>
              }
            >
              <div style={{ marginBottom: 12 }}>
                <div><Text strong>Proceeding No:</Text> <code>{pdfParsedResult.parsedData?.proceedingNumber}</code></div>
                <div><Text strong>Target College:</Text> {pdfParsedResult.college?.name} (Code: {pdfParsedResult.college?.code})</div>
                <div><Text strong>Subject:</Text> {pdfParsedResult.parsedData?.subject}</div>
              </div>

              <Table
                size="small"
                pagination={{ pageSize: 5 }}
                dataSource={pdfParsedResult.parsedData?.courses || []}
                rowKey="courseName"
                columns={[
                  { title: 'Single Major Programme', dataIndex: 'courseName', key: 'courseName', render: (t) => <Text strong>{t}</Text> },
                  { title: 'Medium', dataIndex: 'medium', key: 'medium', width: 90, render: (m) => <Tag>{m || 'English'}</Tag> },
                  { title: 'Intake', dataIndex: 'sanctionedIntake', key: 'sanctionedIntake', width: 80, render: (v) => <Tag color="blue">{v}</Tag> },
                  { title: 'CQ (70%)', dataIndex: 'convenorQuota', key: 'convenorQuota', width: 90 },
                  { title: 'MQ (30%)', dataIndex: 'managementQuota', key: 'managementQuota', width: 90 },
                ]}
              />

              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setPdfParsedResult(null)}>Re-upload</Button>
                  <Button
                    type="primary"
                    icon={<SafetyCertificateOutlined />}
                    loading={pdfConfirming}
                    onClick={handleConfirmPdfProceeding}
                    style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 700 }}
                  >
                    Confirm & Issue to College Principal Portal
                  </Button>
                </Space>
              </div>
            </Card>
          )}
        </Space>
      </Modal>
    </div>
  );
};
