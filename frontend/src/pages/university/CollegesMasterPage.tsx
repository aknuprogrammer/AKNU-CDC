import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Drawer,
  Descriptions,
  Modal,
  Form,
  Row,
  Col,
  Typography,
  Tabs,
  Upload,
  Alert,
  InputNumber,
  Switch,
  Divider,
  Badge,
  message,
  Popconfirm,
  Tooltip,
  Checkbox,
  Collapse,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  BankOutlined,
  BookOutlined,
  UploadOutlined,
  DownloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  FileExcelOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  ApartmentOutlined,
  BranchesOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { College, Course } from '../../api/types';
import * as XLSX from 'xlsx';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Reference mapping of known sample colleges to their original principal names and numbers
const KNOWN_PRINCIPALS: Record<string, { name: string; mobile: string }> = {
  '001': { name: 'Dr. K. Srinivas Rao', mobile: '9440123456' },
  '002': { name: 'Dr. P. Lakshmi Devi', mobile: '9848123456' },
  '003': { name: 'Dr. M. Satyanarayana', mobile: '9440987654' },
  '004': { name: 'Dr. V. Prasad', mobile: '9440112233' },
  '005': { name: 'Dr. K. Ranga Rao', mobile: '9848223344' },
  '006': { name: 'Dr. G. Venkanna', mobile: '9440334455' },
  '007': { name: 'Dr. Ch. Mohan', mobile: '9440445566' },
  '008': { name: 'Dr. S. Rama Krishna', mobile: '9848556677' },
};

// ==========================================
// SEARCHABLE & CREATABLE DYNAMIC DROPDOWN COMPONENT
// ==========================================
interface CreatableSelectProps {
  value?: string;
  onChange?: (val: string) => void;
  options: { label: string; value: string }[];
  onAddOption: (val: string) => void;
  placeholder?: string;
  itemName?: string;
}

const CreatableSelect: React.FC<CreatableSelectProps> = ({
  value,
  onChange,
  options,
  onAddOption,
  placeholder = 'Select or search...',
  itemName = 'option',
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [customInput, setCustomInput] = useState('');

  const trimmedSearch = searchValue.trim();
  const searchExists = useMemo(() => {
    if (!trimmedSearch) return true;
    return options.some(
      (opt) =>
        opt.value.toLowerCase() === trimmedSearch.toLowerCase() ||
        opt.label.toLowerCase() === trimmedSearch.toLowerCase(),
    );
  }, [options, trimmedSearch]);

  const handleAddNew = (newVal: string) => {
    const clean = newVal.trim();
    if (!clean) return;
    onAddOption(clean);
    onChange?.(clean);
    setSearchValue('');
    setCustomInput('');
    message.success(`Added "${clean}" to ${itemName} options`);
  };

  const combinedOptions = useMemo(() => {
    const list = [...options];
    if (trimmedSearch && !searchExists) {
      list.unshift({
        label: `➕ Add "${trimmedSearch}" (Create new ${itemName})`,
        value: trimmedSearch,
      });
    }
    return list;
  }, [options, trimmedSearch, searchExists, itemName]);

  return (
    <Select
      showSearch
      allowClear
      value={value}
      onChange={(val) => {
        if (val) {
          if (!options.some((o) => o.value === val)) {
            onAddOption(val);
          }
          onChange?.(val);
        } else {
          onChange?.(val);
        }
        setSearchValue('');
      }}
      searchValue={searchValue}
      onSearch={setSearchValue}
      placeholder={placeholder}
      filterOption={(input, option) => {
        if (option?.value === trimmedSearch) return true;
        return (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase());
      }}
      options={combinedOptions}
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '6px 0' }} />
          <Space style={{ padding: '0 8px 6px', width: '100%' }}>
            <Input
              size="small"
              placeholder={`Add custom ${itemName}...`}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNew(customInput);
                }
              }}
              style={{ width: 170 }}
            />
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAddNew(customInput)}
              disabled={!customInput.trim()}
              style={{ background: '#002147' }}
            >
              Add
            </Button>
          </Space>
        </>
      )}
    />
  );
};

export const CollegesMasterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 2 Tabs Only: 'colleges' | 'courses'
  const initialTab = location.pathname.includes('/courses') ? 'courses' : 'colleges';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // ==========================================
  // TAB 1: COLLEGES STATE
  // ==========================================
  const [colleges, setColleges] = useState<College[]>([]);
  const [collegesLoading, setCollegesLoading] = useState(true);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [locationFilter, setLocationFilter] = useState<string | undefined>();
  const [districtFilter, setDistrictFilter] = useState<string | undefined>();
  const [selectedCollege, setSelectedCollege] = useState<any | null>(null);
  const [collegeDrawerOpen, setCollegeDrawerOpen] = useState(false);
  const [createCollegeModal, setCreateCollegeModal] = useState(false);
  const [bulkCollegeModal, setBulkCollegeModal] = useState(false);
  const [collegeForm] = Form.useForm();

  // ==========================================
  // TAB 2: COURSES STATE
  // ==========================================
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courseGroupFilter, setCourseGroupFilter] = useState<string>('ALL');
  const [courseSearch, setCourseSearch] = useState('');
  const [createCourseModal, setCreateCourseModal] = useState(false);
  const [bulkCourseModal, setBulkCourseModal] = useState(false);
  const [courseForm] = Form.useForm();

  // Dynamic options for Register College & Course modals (searchable + add from dropdown)
  const [modalCategoryOptions, setModalCategoryOptions] = useState<{ label: string; value: string }[]>([
    { label: 'Government', value: 'GOVERNMENT' },
    { label: 'Aided', value: 'AIDED' },
    { label: 'Unaided / Private', value: 'UNAIDED' },
  ]);

  const [modalDistrictOptions, setModalDistrictOptions] = useState<{ label: string; value: string }[]>([
    { label: 'East Godavari', value: 'East Godavari' },
    { label: 'Kakinada', value: 'Kakinada' },
    { label: 'Dr. B.R. Ambedkar Konaseema', value: 'Dr. B.R. Ambedkar Konaseema' },
    { label: 'West Godavari', value: 'West Godavari' },
    { label: 'Eluru', value: 'Eluru' },
    { label: 'Alluri Sitharama Raju', value: 'Alluri Sitharama Raju' },
    { label: 'Visakhapatnam', value: 'Visakhapatnam' },
    { label: 'Anakapalli', value: 'Anakapalli' },
    { label: 'Vizianagaram', value: 'Vizianagaram' },
    { label: 'Parvathipuram Manyam', value: 'Parvathipuram Manyam' },
    { label: 'Srikakulam', value: 'Srikakulam' },
    { label: 'Krishna', value: 'Krishna' },
    { label: 'NTR', value: 'NTR' },
    { label: 'Guntur', value: 'Guntur' },
    { label: 'Bapatla', value: 'Bapatla' },
    { label: 'Palnadu', value: 'Palnadu' },
    { label: 'Prakasam', value: 'Prakasam' },
    { label: 'Nellore', value: 'Nellore' },
    { label: 'Tirupati', value: 'Tirupati' },
    { label: 'Chittoor', value: 'Chittoor' },
    { label: 'Annamayya', value: 'Annamayya' },
    { label: 'YSR Kadapa', value: 'YSR Kadapa' },
    { label: 'Sri Sathya Sai', value: 'Sri Sathya Sai' },
    { label: 'Anantapur', value: 'Anantapur' },
    { label: 'Kurnool', value: 'Kurnool' },
    { label: 'Nandyal', value: 'Nandyal' },
  ]);

  const [modalLocationOptions, setModalLocationOptions] = useState<{ label: string; value: string }[]>([
    { label: 'Rural', value: 'RURAL' },
    { label: 'Urban', value: 'URBAN' },
  ]);

  const [modalCourseGroupOptions, setModalCourseGroupOptions] = useState<{ label: string; value: string }[]>([
    { label: 'Undergraduate (UG)', value: 'UG' },
    { label: 'Postgraduate (PG)', value: 'PG' },
    { label: 'Professional (MBA & MCA)', value: 'MBA_MCA' },
    { label: 'Legal Studies (LAW)', value: 'LAW' },
    { label: 'Education (B.Ed / M.Ed)', value: 'EDUCATION' },
    { label: 'Physical Education (B.P.Ed / M.P.Ed)', value: 'PHYSICAL_EDUCATION' },
  ]);

  // ==========================================
  // BULK UPLOAD MODAL STATE
  // ==========================================
  const [pastedData, setPastedData] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  // ==========================================
  // BULK UPLOAD SEAT MATRIX (OPTION 3) STATE
  // ==========================================
  const [bulkSeatMatrixModalOpen, setBulkSeatMatrixModalOpen] = useState(false);
  const [seatMatrixPastedData, setSeatMatrixPastedData] = useState<string>('');
  const [seatMatrixParsedRows, setSeatMatrixParsedRows] = useState<any[]>([]);
  const [seatMatrixUploading, setSeatMatrixUploading] = useState(false);

  // ==========================================
  // EDIT STATE: MAIN TABLES & PREVIEW ROWS
  // ==========================================
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [editCollegeModalOpen, setEditCollegeModalOpen] = useState(false);
  const [editCollegeForm] = Form.useForm();

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseModalOpen, setEditCourseModalOpen] = useState(false);
  const [editCourseForm] = Form.useForm();

  const [editingPreviewRow, setEditingPreviewRow] = useState<any | null>(null);
  const [editingPreviewType, setEditingPreviewType] = useState<'COLLEGES' | 'COURSES'>('COLLEGES');
  const [previewEditModalOpen, setPreviewEditModalOpen] = useState(false);
  const [previewEditForm] = Form.useForm();

  // ==========================================
  // DYNAMIC ACADEMIC HIERARCHY STATE
  // Level 1: Stream (UG, PG, LAW, EDUCATION...)
  // Level 2: Degree (B.Tech, B.Sc, MBA, LL.B...)
  // Level 3: Branch / Specialization (CSE, ECE...)
  // Level 4: College Mapping with Sanctioned Intake
  // ==========================================
  const [customStreams, setCustomStreams] = useState<string[]>(['UG', 'PG', 'LAW', 'EDUCATION']);
  const [customDegrees, setCustomDegrees] = useState<Record<string, string[]>>({});

  // Hierarchy Explorer filter in Tab 2
  const [hierarchyStreamFilter, setHierarchyStreamFilter] = useState<string>('ALL');

  // Quick modals for adding dynamic Streams & Degrees
  const [addStreamModalOpen, setAddStreamModalOpen] = useState(false);
  const [newStreamInput, setNewStreamInput] = useState('');
  const [addDegreeModalOpen, setAddDegreeModalOpen] = useState(false);
  const [degreeStreamTarget, setDegreeStreamTarget] = useState('UG');
  const [newDegreeInput, setNewDegreeInput] = useState('');

  // Course mapping state for Create College Modal
  const [createCollegeStreams, setCreateCollegeStreams] = useState<string[]>(['UG']);
  const [createCollegeIntakes, setCreateCollegeIntakes] = useState<Record<string, number>>({});

  // Course mapping state for Edit College Modal
  const [editCollegeStreams, setEditCollegeStreams] = useState<string[]>([]);
  const [editCollegeIntakes, setEditCollegeIntakes] = useState<Record<string, number>>({});

  // ------------------------------------------
  // Data Loaders
  // ------------------------------------------
  const loadColleges = async () => {
    setCollegesLoading(true);
    try {
      const res = await api.colleges.list();
      setColleges(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCollegesLoading(false);
    }
  };

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await api.courses.list();
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    loadColleges();
    loadCourses();
  }, []);

  // Dynamic filter dropdown options: strictly derived from created data (no static options)
  const categoryOptions = useMemo(() => {
    const unique = Array.from(
      new Set(colleges.map((c) => c.type).filter(Boolean)),
    ).sort();
    return unique.map((type) => {
      const label = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      return { label, value: type };
    });
  }, [colleges]);

  const districtOptions = useMemo(() => {
    const unique = Array.from(
      new Set(colleges.map((c) => c.district).filter((d): d is string => Boolean(d && d.trim()))),
    ).sort();
    return unique.map((d) => ({ label: d, value: d }));
  }, [colleges]);

  const locationOptions = useMemo(() => {
    const unique = Array.from(
      new Set(colleges.map((c) => c.location).filter(Boolean)),
    ).sort();
    return unique.map((loc) => {
      const label = loc.charAt(0).toUpperCase() + loc.slice(1).toLowerCase();
      return { label, value: loc };
    });
  }, [colleges]);

  const courseGroupOptions = useMemo(() => {
    const unique = Array.from(
      new Set(courses.map((c) => c.courseGroup).filter(Boolean)),
    ).sort();
    if (unique.length === 0) {
      return [];
    }
    const groupNameMap: Record<string, string> = {
      UG: 'Undergraduate (UG)',
      PG: 'Postgraduate (PG)',
      MBA_MCA: 'Professional (MBA & MCA)',
      LAW: 'Legal Studies (LAW)',
      EDUCATION: 'Education (B.Ed / M.Ed)',
      PHYSICAL_EDUCATION: 'Physical Education (B.P.Ed / M.P.Ed)',
    };
    return [
      { label: 'All Course Groups', value: 'ALL' },
      ...unique.map((g) => ({
        label: groupNameMap[g] || g,
        value: g,
      })),
    ];
  }, [courses]);

  // Reset selected filters if the filtered value no longer exists in created dataset
  useEffect(() => {
    if (typeFilter && !categoryOptions.some((o) => o.value === typeFilter)) {
      setTypeFilter(undefined);
    }
  }, [categoryOptions, typeFilter]);

  useEffect(() => {
    if (districtFilter && !districtOptions.some((o) => o.value === districtFilter)) {
      setDistrictFilter(undefined);
    }
  }, [districtOptions, districtFilter]);

  useEffect(() => {
    if (locationFilter && !locationOptions.some((o) => o.value === locationFilter)) {
      setLocationFilter(undefined);
    }
  }, [locationOptions, locationFilter]);

  useEffect(() => {
    if (courseGroupFilter !== 'ALL' && !courseGroupOptions.some((o) => o.value === courseGroupFilter)) {
      setCourseGroupFilter('ALL');
    }
  }, [courseGroupOptions, courseGroupFilter]);

  // Live filter colleges while typing (instant 0ms response)
  const filteredColleges = colleges.filter((c) => {
    const q = collegeSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.code?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.district?.toLowerCase().includes(q) ||
      c.principalName?.toLowerCase().includes(q) ||
      c.principalEmail?.toLowerCase().includes(q) ||
      c.principalMobile?.includes(q);

    const matchesType = !typeFilter || c.type === typeFilter;
    const matchesDistrict = !districtFilter || c.district === districtFilter;
    const matchesLocation = !locationFilter || c.location === locationFilter;

    return matchesSearch && matchesType && matchesDistrict && matchesLocation;
  });

  // Live filter courses while typing (instant 0ms response)
  const filteredCourses = courses.filter((c) => {
    const q = courseSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.code?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q);

    const matchesGroup = courseGroupFilter === 'ALL' || c.courseGroup === courseGroupFilter;

    return matchesSearch && matchesGroup;
  });

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'colleges') {
      navigate('/university/colleges', { replace: true });
    } else if (key === 'courses') {
      navigate('/university/courses', { replace: true });
    }
  };

  const resetCollegeFilters = () => {
    setCollegeSearch('');
    setTypeFilter(undefined);
    setLocationFilter(undefined);
    setDistrictFilter(undefined);
  };

  const resetCourseFilters = () => {
    setCourseSearch('');
    setCourseGroupFilter('ALL');
  };

  const allStreams = useMemo(() => {
    const fromCourses = courses.map((c) => c.stream || c.courseGroup).filter(Boolean);
    const set = new Set([...customStreams, ...fromCourses]);
    return Array.from(set);
  }, [customStreams, courses]);

  const degreesByStream = useMemo(() => {
    const map: Record<string, string[]> = {};
    allStreams.forEach((st) => {
      map[st] = customDegrees[st] ? [...customDegrees[st]] : [];
    });
    courses.forEach((c) => {
      const st = c.stream || c.courseGroup || 'UG';
      const deg = c.degreeType || 'Other';
      if (!map[st]) map[st] = [];
      if (!map[st].includes(deg)) map[st].push(deg);
    });
    return map;
  }, [allStreams, customDegrees, courses]);

  const handleAddNewStream = () => {
    const clean = newStreamInput.trim().toUpperCase();
    if (!clean) return;
    if (!customStreams.includes(clean)) {
      setCustomStreams((prev) => [...prev, clean]);
      setCustomDegrees((prev) => ({ ...prev, [clean]: [] }));
      message.success(`New Academic Stream "${clean}" created successfully!`);
    }
    setNewStreamInput('');
    setAddStreamModalOpen(false);
  };

  const handleAddNewDegree = () => {
    const clean = newDegreeInput.trim();
    if (!clean) return;
    setCustomDegrees((prev) => {
      const list = prev[degreeStreamTarget] || [];
      if (!list.includes(clean)) {
        return { ...prev, [degreeStreamTarget]: [...list, clean] };
      }
      return prev;
    });
    message.success(`New Degree "${clean}" added under ${degreeStreamTarget}!`);
    setNewDegreeInput('');
    setAddDegreeModalOpen(false);
  };

  // ------------------------------------------
  // College Handlers
  // ------------------------------------------
  const handleViewCollege = async (id: string) => {
    try {
      const res = await api.colleges.getById(id);
      setSelectedCollege(res.data);
      setCollegeDrawerOpen(true);
    } catch (err) {
      message.error('Failed to load college details');
    }
  };

  const handleCreateCollege = async (values: any) => {
    try {
      const selectedCourseIds = Object.keys(createCollegeIntakes).filter(
        (id) => (createCollegeIntakes[id] || 0) > 0,
      );
      const courseIntakes = selectedCourseIds.map((cId) => {
        const crs = courses.find((c) => c.id === cId || c.code === cId);
        const sanctioned = createCollegeIntakes[cId] || crs?.defaultIntake || 60;
        return {
          courseId: crs?.id || cId,
          courseCode: crs?.code || cId,
          courseName: crs?.name || cId,
          stream: crs?.stream || crs?.courseGroup || 'UG',
          degreeType: crs?.degreeType || 'Degree',
          branch: crs?.branch || crs?.name || '',
          sanctionedIntake: sanctioned,
          convenorQuota: Math.round(sanctioned * 0.7),
          managementQuota: Math.round(sanctioned * 0.3),
          spotAdmission: 0,
        };
      });

      const payload = {
        ...values,
        streams: createCollegeStreams,
        courseIds: selectedCourseIds,
        courseIntakes,
      };

      await api.colleges.create(payload);
      message.success('New affiliated college registered with sanctioned course intakes!');
      setCreateCollegeModal(false);
      collegeForm.resetFields();
      setCreateCollegeStreams(['UG']);
      setCreateCollegeIntakes({});
      loadColleges();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to register college');
    }
  };

  const handleClearAllData = async () => {
    try {
      const res = await api.colleges.clearAll(false);
      message.success(res.data.message || 'All college data cleared successfully! Ready for fresh entries.');
      loadColleges();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Failed to clear data');
    }
  };

  const openEditCollegeModal = (record: College) => {
    setEditingCollege(record);
    const isNamePhone = /^\+?\d[\d\s\-]{7,15}$/.test((record.principalName || '').trim());
    const isPlaceholder = (record.principalName || '').startsWith('Principal (');
    const known = KNOWN_PRINCIPALS[record.code];
    let initialName = record.principalName;
    let initialMobile = record.principalMobile;
    if ((isNamePhone || isPlaceholder || !initialName) && known) {
      initialName = known.name;
      initialMobile = known.mobile || record.principalMobile;
    } else if (isNamePhone) {
      initialName = known?.name || '';
      initialMobile = record.principalName;
    }

    // Populate active streams
    const colStreams = record.streams && record.streams.length > 0
      ? record.streams
      : record.courseIntakes && record.courseIntakes.length > 0
        ? Array.from(new Set(record.courseIntakes.map((ci) => ci.stream).filter(Boolean)))
        : ['UG'];
    setEditCollegeStreams(colStreams);

    // Populate intakes map
    const intakesMap: Record<string, number> = {};
    if (record.courseIntakes && record.courseIntakes.length > 0) {
      record.courseIntakes.forEach((ci) => {
        intakesMap[ci.courseId] = ci.sanctionedIntake;
      });
    } else if ((record as any).courses?.length) {
      (record as any).courses.forEach((c: any) => {
        intakesMap[c.id || c.code] = c.sanctionedIntake || c.defaultIntake || 60;
      });
    } else if (record.courseIds?.length) {
      record.courseIds.forEach((cId) => {
        const crs = courses.find((c) => c.id === cId || c.code === cId);
        intakesMap[cId] = crs?.defaultIntake || 60;
      });
    }
    setEditCollegeIntakes(intakesMap);

    editCollegeForm.setFieldsValue({
      code: record.code,
      name: record.name,
      type: record.type,
      district: record.district,
      location: record.location,
      principalName: initialName,
      principalMobile: initialMobile,
      principalEmail: record.principalEmail,
      isAutonomous: !!record.isAutonomous,
      hasHostel: !!record.hasHostel,
    });
    setEditCollegeModalOpen(true);
  };

  const handleUpdateCollege = async (values: any) => {
    if (!editingCollege) return;
    try {
      const selectedCourseIds = Object.keys(editCollegeIntakes).filter(
        (id) => (editCollegeIntakes[id] || 0) > 0,
      );
      const courseIntakes = selectedCourseIds.map((cId) => {
        const crs = courses.find((c) => c.id === cId || c.code === cId);
        const sanctioned = editCollegeIntakes[cId] || crs?.defaultIntake || 60;
        return {
          courseId: crs?.id || cId,
          courseCode: crs?.code || cId,
          courseName: crs?.name || cId,
          stream: crs?.stream || crs?.courseGroup || 'UG',
          degreeType: crs?.degreeType || 'Degree',
          branch: crs?.branch || crs?.name || '',
          sanctionedIntake: sanctioned,
          convenorQuota: Math.round(sanctioned * 0.7),
          managementQuota: Math.round(sanctioned * 0.3),
          spotAdmission: 0,
        };
      });

      const payload = {
        ...values,
        streams: editCollegeStreams,
        courseIds: selectedCourseIds,
        courseIntakes,
      };

      await api.colleges.update(editingCollege.id, payload);
      message.success('Affiliated college and sanctioned courses updated successfully!');
      setEditCollegeModalOpen(false);
      setEditingCollege(null);
      loadColleges();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update college');
    }
  };

  const handleDeleteCollege = async (id: string) => {
    try {
      await api.colleges.delete(id);
      message.success('Affiliated college deleted successfully!');
      loadColleges();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete college');
    }
  };

  // ------------------------------------------
  // Course Handlers
  // ------------------------------------------
  const handleCreateCourse = async (values: any) => {
    try {
      const streamVal = values.stream || values.courseGroup || 'UG';
      const degVal = values.degreeType || 'Other';
      const branchVal = values.branch || values.name;
      const codeVal = values.code || `${degVal}-${branchVal}`.toUpperCase().replace(/\s+/g, '-');
      const nameVal = values.name || `${degVal} ${branchVal}`;

      await api.courses.create({
        ...values,
        code: codeVal,
        name: nameVal,
        stream: streamVal,
        courseGroup: streamVal,
        degreeType: degVal,
        branch: branchVal,
        durationYears: values.durationYears || (streamVal === 'UG' ? (degVal === 'B.Tech' ? 4 : 3) : 2),
        defaultIntake: values.defaultIntake || 60,
        degreeLevel: streamVal === 'UG' ? 'UG' : 'PG',
        isComputer: !!values.isComputer,
      });
      message.success('New academic course registered in hierarchy successfully!');
      setCreateCourseModal(false);
      courseForm.resetFields();
      loadCourses();
    } catch (err) {
      message.error('Failed to create course');
    }
  };

  const openEditCourseModal = (record: Course) => {
    setEditingCourse(record);
    editCourseForm.setFieldsValue({
      code: record.code,
      name: record.name,
      stream: record.stream || record.courseGroup,
      courseGroup: record.courseGroup,
      degreeType: record.degreeType,
      branch: record.branch,
      durationYears: record.durationYears,
      defaultIntake: record.defaultIntake || 60,
      degreeLevel: record.degreeLevel,
      isComputer: !!record.isComputer,
      active: record.active !== false,
    });
    setEditCourseModalOpen(true);
  };

  const handleUpdateCourse = async (values: any) => {
    if (!editingCourse) return;
    try {
      const streamVal = values.stream || values.courseGroup || 'UG';
      const degVal = values.degreeType || editingCourse.degreeType || 'Other';
      const branchVal = values.branch || values.name;
      const codeVal = values.code || editingCourse.code;
      const nameVal = values.name || `${degVal} ${branchVal}`;

      await api.courses.update(editingCourse.id, {
        ...values,
        code: codeVal,
        name: nameVal,
        stream: streamVal,
        courseGroup: streamVal,
        degreeType: degVal,
        branch: branchVal,
        durationYears: values.durationYears || editingCourse.durationYears,
        defaultIntake: values.defaultIntake || editingCourse.defaultIntake || 60,
        degreeLevel: streamVal === 'UG' ? 'UG' : 'PG',
        isComputer: !!values.isComputer,
      });
      message.success('Academic course updated successfully!');
      setEditCourseModalOpen(false);
      setEditingCourse(null);
      loadCourses();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update course');
    }
  };

  // Reusable Academic Hierarchy Mapper for College Forms
  const renderCourseHierarchyMapper = (
    currentStreams: string[],
    setCurrentStreams: (streams: string[]) => void,
    intakesMap: Record<string, number>,
    setIntakesMap: React.Dispatch<React.SetStateAction<Record<string, number>>>,
  ) => {
    const streamColorMap: Record<string, string> = {
      UG: 'blue',
      PG: 'green',
      LAW: 'volcano',
      EDUCATION: 'purple',
    };

    const selectedCourseIds = Object.keys(intakesMap).filter((id) => (intakesMap[id] || 0) > 0);
    const totalCapacity = selectedCourseIds.reduce((sum, id) => sum + (intakesMap[id] || 0), 0);

    return (
      <div style={{ background: '#f8fafc', border: '1px solid #d9e1e8', borderRadius: 8, padding: 14 }}>
        {/* Step 1: Select Streams Offered */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: '13px', color: '#002147' }}>
              <ApartmentOutlined style={{ marginRight: 6, color: '#1890ff' }} />
              Step 1: Select Streams Offered by College (Hierarchy Level 1)
            </Text>
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setAddStreamModalOpen(true)}
              style={{ padding: 0 }}
            >
              Add New Stream
            </Button>
          </div>
          <Checkbox.Group
            value={currentStreams}
            onChange={(checkedVals) => setCurrentStreams(checkedVals as string[])}
            style={{ width: '100%' }}
          >
            <Row gutter={[8, 8]}>
              {allStreams.map((st) => (
                <Col key={st} xs={12} sm={6}>
                  <div
                    style={{
                      cursor: 'pointer',
                      border: currentStreams.includes(st) ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      background: currentStreams.includes(st) ? '#f0f7ff' : '#fff',
                      borderRadius: 6,
                      padding: '8px 10px',
                    }}
                  >
                    <Checkbox value={st}>
                      <Tag color={streamColorMap[st] || 'geekblue'} style={{ fontWeight: 800, margin: 0 }}>
                        {st}
                      </Tag>
                    </Checkbox>
                  </div>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </div>

        {/* Step 2: Degrees & Sanctioned Branches with Intake */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: '13px', color: '#002147' }}>
              <BranchesOutlined style={{ marginRight: 6, color: '#52c41a' }} />
              Step 2: Map Sanctioned Degrees & Branches with Intake (Levels 2 & 3)
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Colleges only offer approved courses with strict intake limits
            </Text>
          </div>

          {/* Quick Batch Intake Presets & Actions Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              background: '#eef2f6',
              border: '1px solid #d0dbe5',
              borderRadius: 6,
              padding: '6px 10px',
              marginBottom: 10,
            }}
          >
            <Space size="small" wrap>
              <Text strong style={{ fontSize: '11px', color: '#334155' }}>
                ⚡ Quick Presets:
              </Text>
              <Button
                size="small"
                onClick={() => {
                  setIntakesMap((prev) => {
                    const next = { ...prev };
                    Object.keys(next).forEach((id) => {
                      if (next[id] > 0) next[id] = 60;
                    });
                    return next;
                  });
                  message.info('Set intake of all selected branches to 60 (1 Unit)');
                }}
                style={{ fontSize: '11px', height: 24, padding: '0 8px' }}
              >
                ⚡ Set All Selected to 60 (1 Unit)
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setIntakesMap((prev) => {
                    const next = { ...prev };
                    Object.keys(next).forEach((id) => {
                      if (next[id] > 0) next[id] = 120;
                    });
                    return next;
                  });
                  message.info('Set intake of all selected branches to 120 (2 Units)');
                }}
                style={{ fontSize: '11px', height: 24, padding: '0 8px' }}
              >
                ⚡ Set All Selected to 120 (2 Units)
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setIntakesMap((prev) => {
                    const next = { ...prev };
                    Object.keys(next).forEach((id) => {
                      const crs = courses.find((c) => c.id === id);
                      if (next[id] > 0) next[id] = crs?.defaultIntake || 60;
                    });
                    return next;
                  });
                  message.info('Reset all selected branches to course default intakes');
                }}
                style={{ fontSize: '11px', height: 24, padding: '0 8px' }}
              >
                🔄 Reset to Defaults
              </Button>
            </Space>

            <Space size="small">
              <Button
                type="link"
                size="small"
                style={{ fontSize: '11px', padding: 0 }}
                onClick={() => {
                  const activeCourses = courses.filter((c) => currentStreams.includes(c.stream || c.courseGroup || 'UG'));
                  setIntakesMap((prev) => {
                    const next = { ...prev };
                    activeCourses.forEach((c) => {
                      next[c.id] = next[c.id] || c.defaultIntake || 60;
                    });
                    return next;
                  });
                  message.success(`Selected all ${activeCourses.length} branches in active streams!`);
                }}
              >
                Select All in Active Streams
              </Button>
              <Divider type="vertical" />
              <Button
                type="link"
                size="small"
                danger
                style={{ fontSize: '11px', padding: 0 }}
                onClick={() => {
                  setIntakesMap({});
                  message.info('Cleared all selected course branches');
                }}
              >
                Clear All
              </Button>
            </Space>
          </div>

          {currentStreams.length === 0 ? (
            <Alert type="warning" showIcon message="Please select at least one stream above to view and assign approved programs." />
          ) : (
            <div style={{ maxHeight: 440, overflowY: 'auto', paddingRight: 4 }}>
              <Collapse
                defaultActiveKey={currentStreams}
                style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #d9e1e8' }}
                items={currentStreams.map((stream) => {
                  const streamCourses = courses.filter((c) => (c.stream || c.courseGroup) === stream);
                  const degreesInStream = Array.from(
                    new Set(streamCourses.map((c) => c.degreeType || 'Other').filter(Boolean)),
                  ).sort();

                  const selectedInStream = streamCourses.filter((c) => (intakesMap[c.id] || 0) > 0);
                  const streamTotalSeats = selectedInStream.reduce((sum, c) => sum + (intakesMap[c.id] || 0), 0);

                  return {
                    key: stream,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 8 }}>
                        <Space>
                          <Tag color={streamColorMap[stream] || 'blue'} style={{ fontWeight: 800, fontSize: '13px', margin: 0 }}>
                            STREAM: {stream}
                          </Tag>
                          <span style={{ fontSize: '12px', color: '#555', fontWeight: 500 }}>
                            ({degreesInStream.length} {degreesInStream.length === 1 ? 'Degree' : 'Degrees'} • {streamCourses.length} {streamCourses.length === 1 ? 'Branch' : 'Branches'} available)
                          </span>
                        </Space>
                        <Space>
                          {selectedInStream.length > 0 ? (
                            <Tag color="green" style={{ fontWeight: 700, margin: 0 }}>
                              ✓ {selectedInStream.length} Selected ({streamTotalSeats} Seats)
                            </Tag>
                          ) : (
                            <Tag style={{ margin: 0, color: '#888' }}>0 Selected</Tag>
                          )}
                        </Space>
                      </div>
                    ),
                    extra: (
                      <Button
                        size="small"
                        type="link"
                        icon={<PlusOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          courseForm.resetFields();
                          courseForm.setFieldsValue({
                            stream: stream,
                            courseGroup: stream,
                            defaultIntake: 60,
                            durationYears: stream === 'UG' ? 3 : 2,
                          });
                          setCreateCourseModal(true);
                        }}
                        style={{ padding: '0 4px', fontSize: '12px' }}
                      >
                        + Add Degree / Course
                      </Button>
                    ),
                    children: (
                      <div>
                        {degreesInStream.length === 0 ? (
                          <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                            No approved degree courses under {stream} yet. Click "+ Add Degree / Course" above to create one.
                          </Text>
                        ) : (
                          <Collapse
                            size="small"
                            defaultActiveKey={degreesInStream.filter((deg) => {
                              const degCourses = streamCourses.filter((c) => (c.degreeType || 'Other') === deg);
                              return degCourses.some((c) => (intakesMap[c.id] || 0) > 0);
                            })}
                            style={{ background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}
                            items={degreesInStream.map((deg) => {
                              const degCourses = streamCourses.filter((c) => (c.degreeType || 'Other') === deg);
                              if (degCourses.length === 0) return null;

                              const selectedInDeg = degCourses.filter((c) => (intakesMap[c.id] || 0) > 0);
                              const degTotalSeats = selectedInDeg.reduce((sum, c) => sum + (intakesMap[c.id] || 0), 0);

                              return {
                                key: `${stream}-${deg}`,
                                label: (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 8 }}>
                                    <Space>
                                      <Tag color="cyan" style={{ fontWeight: 700, margin: 0 }}>
                                        {deg}
                                      </Tag>
                                      <span style={{ fontSize: '12px', color: '#666' }}>
                                        ({degCourses.length} {degCourses.length === 1 ? 'Branch' : 'Branches'})
                                      </span>
                                    </Space>
                                    <div>
                                      {selectedInDeg.length > 0 ? (
                                        <Tag color="blue" style={{ fontWeight: 600, fontSize: '11px', margin: 0 }}>
                                          {selectedInDeg.length} Selected • {degTotalSeats} Seats
                                        </Tag>
                                      ) : (
                                        <span style={{ fontSize: '11px', color: '#999' }}>0 selected</span>
                                      )}
                                    </div>
                                  </div>
                                ),
                                children: (
                                  <Row gutter={[8, 8]}>
                                    {degCourses.map((course) => {
                                      const isOffered = (intakesMap[course.id] || 0) > 0;
                                      const intakeVal = intakesMap[course.id] || course.defaultIntake || 60;
                                      const cq = Math.round(intakeVal * 0.7);
                                      const mq = Math.round(intakeVal * 0.3);

                                      return (
                                        <Col key={course.id} xs={24} sm={12}>
                                          <div
                                            style={{
                                              padding: '6px 8px',
                                              borderRadius: 6,
                                              border: isOffered ? '1px solid #91d5ff' : '1px solid #e8e8e8',
                                              background: isOffered ? '#e6f7ff' : '#ffffff',
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                              <Checkbox
                                                checked={isOffered}
                                                onChange={(e) => {
                                                  const checked = e.target.checked;
                                                  setIntakesMap((prev) => {
                                                    const next = { ...prev };
                                                    if (checked) {
                                                      next[course.id] = course.defaultIntake || 60;
                                                    } else {
                                                      delete next[course.id];
                                                    }
                                                    return next;
                                                  });
                                                }}
                                              >
                                                <span style={{ fontWeight: 600, fontSize: '12px' }}>
                                                  {course.branch || course.name}
                                                </span>
                                                <Tag style={{ fontSize: '10px', marginLeft: 4 }}>{course.code}</Tag>
                                              </Checkbox>
                                            </div>

                                            {isOffered && (
                                              <div style={{ marginTop: 6, paddingLeft: 24 }}>
                                                <Space size="small" align="center" wrap>
                                                  <span style={{ fontSize: '11px', color: '#555', fontWeight: 600 }}>Intake:</span>
                                                  <InputNumber
                                                    size="small"
                                                    min={10}
                                                    max={600}
                                                    step={10}
                                                    value={intakeVal}
                                                    onChange={(val) => {
                                                      const num = Number(val) || 60;
                                                      setIntakesMap((prev) => ({ ...prev, [course.id]: num }));
                                                    }}
                                                    style={{ width: 75 }}
                                                  />
                                                  <Space size={2}>
                                                    <Tag
                                                      color={intakeVal === 60 ? 'blue' : 'default'}
                                                      style={{ cursor: 'pointer', fontSize: '10px', padding: '0 5px', margin: 0 }}
                                                      onClick={() => setIntakesMap((prev) => ({ ...prev, [course.id]: 60 }))}
                                                    >
                                                      60 (1U)
                                                    </Tag>
                                                    <Tag
                                                      color={intakeVal === 120 ? 'blue' : 'default'}
                                                      style={{ cursor: 'pointer', fontSize: '10px', padding: '0 5px', margin: 0 }}
                                                      onClick={() => setIntakesMap((prev) => ({ ...prev, [course.id]: 120 }))}
                                                    >
                                                      120 (2U)
                                                    </Tag>
                                                    <Tag
                                                      color={intakeVal === 180 ? 'blue' : 'default'}
                                                      style={{ cursor: 'pointer', fontSize: '10px', padding: '0 5px', margin: 0 }}
                                                      onClick={() => setIntakesMap((prev) => ({ ...prev, [course.id]: 180 }))}
                                                    >
                                                      180 (3U)
                                                    </Tag>
                                                  </Space>
                                                  <Tag color="cyan" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                                                    CQ 70%: {cq}
                                                  </Tag>
                                                  <Tag color="orange" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                                                    MQ 30%: {mq}
                                                  </Tag>
                                                </Space>
                                              </div>
                                            )}
                                          </div>
                                        </Col>
                                      );
                                    })}
                                  </Row>
                                ),
                              };
                            }).filter(Boolean) as any}
                          />
                        )}
                      </div>
                    ),
                  };
                })}
              />
            </div>
          )}
        </div>

        {/* Real-time Sanctioned Capacity Summary */}
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <div>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
            <Text strong style={{ fontSize: '12px', color: '#389e0d' }}>
              Sanctioned Capacity: {totalCapacity} Seats across {selectedCourseIds.length} Branches
            </Text>
          </div>
          <Tag color="red" style={{ margin: 0, fontSize: '11px', fontWeight: 600 }}>
            Strict Intake Cap: Admissions Cannot Exceed Sanctioned Seats
          </Tag>
        </div>
      </div>
    );
  };


  const handleDeleteCourse = async (id: string) => {
    try {
      await api.courses.delete(id);
      message.success('Academic course deleted successfully!');
      loadCourses();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete course');
    }
  };

  // ------------------------------------------
  // Preview Row Handlers (Edit & Delete)
  // ------------------------------------------
  const handleDeletePreviewRow = (rowNum: number) => {
    setParsedRows((prev) => prev.filter((r) => r._rowNum !== rowNum));
    message.success(`Row #${rowNum} removed from preview`);
  };

  const openEditPreviewRow = (record: any, type: 'COLLEGES' | 'COURSES') => {
    setEditingPreviewRow(record);
    setEditingPreviewType(type);
    previewEditForm.setFieldsValue({
      code: record.code || '',
      name: record.name || '',
      type: record.type || 'UNAIDED',
      location: record.location || 'RURAL',
      district: record.district || '',
      principalName: record.principalName || '',
      principalMobile: record.principalMobile || '',
      principalEmail: record.principalEmail || '',
      isAutonomous: !!record.isAutonomous,
      hasHostel: !!record.hasHostel,
      courseIds: record.courseIds || [],
      courseGroup: record.courseGroup || 'UG',
      degreeLevel: record.degreeLevel || 'UG',
      durationYears: record.durationYears || 3,
      isComputer: !!record.isComputer,
    });
    setPreviewEditModalOpen(true);
  };

  const handleSavePreviewRow = (values: any) => {
    if (!editingPreviewRow) return;
    setParsedRows((prev) =>
      prev.map((row) => {
        if (row._rowNum === editingPreviewRow._rowNum) {
          const updated = { ...row, ...values };
          if (values.courseIds) {
            updated.courseIds = values.courseIds;
            const matchedCodes = courses
              .filter((c) => values.courseIds.includes(c.id) || values.courseIds.includes(c.code))
              .map((c) => c.code);
            updated.programsStr = matchedCodes.join('; ');
          }
          const isValid = !!(updated.code && updated.name);
          updated._isValid = isValid;
          updated._error = !updated.code ? 'Missing Code' : !updated.name ? 'Missing Name' : null;
          return updated;
        }
        return row;
      }),
    );
    message.success(`Preview row #${editingPreviewRow._rowNum} updated!`);
    setPreviewEditModalOpen(false);
    setEditingPreviewRow(null);
  };

  // ------------------------------------------
  // Bulk Upload Helpers
  // ------------------------------------------
  const parseDelimitedText = (text: string, target: 'COLLEGES' | 'COURSES') => {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setParsedRows([]);
      return;
    }

    const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : ';';
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const rawCols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const rowObj: any = { _rowNum: i };

      headers.forEach((h, colIdx) => {
        const val = rawCols[colIdx] || '';
        // 1. Mobile / Phone (check before generic principal)
        if (h.includes('mobile') || h.includes('phone') || h.includes('contact')) {
          rowObj.principalMobile = val;
        }
        // 2. Email (check before generic principal)
        else if (h.includes('email') || h.includes('mail')) {
          rowObj.principalEmail = val;
        }
        // 3. Principal Name (contains principal, but not mobile/email)
        else if (h.includes('principal')) {
          rowObj.principalName = val;
        }
        // 4. College / Course Code
        else if (h.includes('code')) {
          rowObj.code = val;
        }
        // 5. College / Course Name
        else if (h.includes('name')) {
          rowObj.name = val;
        }
        // 6. Category / Type
        else if (h.includes('type') || h.includes('category')) {
          rowObj.type = val.toUpperCase();
        }
        // 7. Location / Area
        else if (h.includes('location') || h.includes('area')) {
          rowObj.location = val.toUpperCase();
        }
        // 8. District
        else if (h.includes('district')) {
          rowObj.district = val;
        }
        // 9. Address
        else if (h.includes('address')) {
          rowObj.address = val;
        }
        // 10. Autonomous
        else if (h.includes('autonomous')) {
          rowObj.isAutonomous = ['yes', 'true', '1', 'y'].includes(val.toLowerCase());
        }
        // 11. Hostel
        else if (h.includes('hostel')) {
          rowObj.hasHostel = ['yes', 'true', '1', 'y'].includes(val.toLowerCase());
        }
        // 12. Course Group
        else if (h.includes('group')) {
          rowObj.courseGroup = val.toUpperCase();
        }
        // 13. Duration
        else if (h.includes('duration')) {
          rowObj.durationYears = parseInt(val, 10) || 3;
        }
        // 14. Degree Level
        else if (h.includes('degree') || h.includes('level')) {
          rowObj.degreeLevel = val.toUpperCase();
        }
        // 15. Computer Lab Fee
        else if (h.includes('computer')) {
          rowObj.isComputer = ['yes', 'true', '1', 'y'].includes(val.toLowerCase());
        }
        // 16. Sanctioned Programs / Courses for Colleges (Supports "Code:Intake", e.g., "B.Sc-DS:60; B.Com-CA:120")
        else if (h.includes('course') || h.includes('program')) {
          rowObj.programsStr = val;
          const tokens = val.split(/[;,|]/).map((t: string) => t.trim()).filter(Boolean);
          const matchedIds: string[] = [];
          const parsedIntakes: any[] = [];

          tokens.forEach((tok: string) => {
            let cleanCode = tok;
            let intake = 60;
            if (tok.includes(':')) {
              const [c, i] = tok.split(':');
              cleanCode = c.trim();
              intake = parseInt(i.trim(), 10) || 60;
            } else if (tok.includes('(') && tok.includes(')')) {
              const match = tok.match(/(.*?)\((\d+)\)/);
              if (match) {
                cleanCode = match[1].trim();
                intake = parseInt(match[2].trim(), 10) || 60;
              }
            }

            const found = courses.find(
              (c) =>
                c.code.toLowerCase() === cleanCode.toLowerCase() ||
                c.name.toLowerCase().includes(cleanCode.toLowerCase()) ||
                c.id.toLowerCase() === cleanCode.toLowerCase(),
            );

            if (found) {
              matchedIds.push(found.id);
              parsedIntakes.push({
                courseId: found.id,
                courseCode: found.code,
                courseName: found.name,
                stream: found.stream || found.courseGroup || 'UG',
                degreeType: found.degreeType || 'Degree',
                branch: found.branch || found.name,
                sanctionedIntake: intake,
                convenorQuota: Math.round(intake * 0.7),
                managementQuota: Math.round(intake * 0.3),
              });
            } else {
              matchedIds.push(cleanCode);
            }
          });

          rowObj.courseIds = matchedIds;
          if (parsedIntakes.length > 0) {
            rowObj.courseIntakes = parsedIntakes;
          }
        }
      });

      if (target === 'COLLEGES') {
        rowObj._isValid = !!(rowObj.code && rowObj.name);
        rowObj._error = !rowObj.code ? 'Missing Code' : !rowObj.name ? 'Missing Name' : null;
      } else {
        rowObj._isValid = !!(rowObj.code && rowObj.name);
        rowObj._error = !rowObj.code ? 'Missing Code' : !rowObj.name ? 'Missing Name' : null;
      }

      rows.push(rowObj);
    }

    setParsedRows(rows);
  };

  const handleFileUpload = (file: File, target: 'COLLEGES' | 'COURSES') => {
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
          setPastedData(csvText);
          parseDelimitedText(csvText, target);
          message.success(`Parsed Excel (.xlsx) file: ${file.name}`);
        } catch (err) {
          message.error('Failed to parse Excel file. Please ensure it is a valid .xlsx spreadsheet.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setPastedData(content);
        parseDelimitedText(content, target);
        message.success(`Parsed file: ${file.name}`);
      };
      reader.readAsText(file);
    }
    return false;
  };

  const handleExecuteBulkUpload = async (target: 'COLLEGES' | 'COURSES') => {
    const validRows = parsedRows.filter((r) => r._isValid);
    if (!validRows.length) {
      message.error('No valid records found to import. Please check data.');
      return;
    }

    setBulkUploading(true);
    try {
      if (target === 'COLLEGES') {
        const res = await api.colleges.bulkUpload(validRows);
        message.success(`Successfully imported ${res.data.importedCount} colleges!`);
        setBulkCollegeModal(false);
        loadColleges();
      } else {
        const res = await api.courses.bulkUpload(validRows);
        message.success(`Successfully imported ${res.data.importedCount} courses!`);
        setBulkCourseModal(false);
        loadCourses();
      }
      setPastedData('');
      setParsedRows([]);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Bulk upload failed');
    } finally {
      setBulkUploading(false);
    }
  };

  const downloadSampleTemplate = (type: 'COLLEGES' | 'COURSES') => {
    if (type === 'COLLEGES') {
      const headers = [
        'College_Code',
        'College_Name',
        'Type',
        'Location',
        'District',
        'Principal_Name',
        'Principal_Mobile',
        'Principal_Email',
        'Autonomous',
        'Hostel',
        'Courses_Offered (e.g. B.Sc-DS:60; B.Com-CA:120; M.B.A:60)',
      ];
      const rows = [
        headers,
        [
          '001',
          'Government Degree College (Autonomous)',
          'GOVERNMENT',
          'RURAL',
          'East Godavari',
          'Dr. K. Srinivas Rao',
          '9440123456',
          'principal.001@aknu.edu.in',
          'YES',
          'YES',
          'B.Sc-DS:60; B.Com-CA:120; M.B.A:60',
        ],
        [
          '002',
          'Aditya Degree College for Women',
          'UNAIDED',
          'URBAN',
          'Kakinada',
          'Dr. P. Lakshmi Devi',
          '9848123456',
          'principal.002@aknu.edu.in',
          'NO',
          'YES',
          'B.Sc-DS:120; M.B.A:60',
        ],
        [
          '003',
          'SKBR College',
          'AIDED',
          'RURAL',
          'Dr. B.R. Ambedkar Konaseema',
          'Dr. M. Satyanarayana',
          '9440987654',
          'principal.003@aknu.edu.in',
          'NO',
          'NO',
          'B.Com-CA:60; M.C.A:60',
        ],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 14 },
        { wch: 42 },
        { wch: 14 },
        { wch: 12 },
        { wch: 28 },
        { wch: 24 },
        { wch: 16 },
        { wch: 28 },
        { wch: 14 },
        { wch: 12 },
        { wch: 42 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Colleges');
      XLSX.writeFile(wb, 'AKNU_Colleges_Template.xlsx');
      message.success('Downloaded AKNU_Colleges_Template.xlsx with course intake caps successfully!');
    } else {
      const headers = [
        'Course_Code',
        'Course_Name',
        'Course_Group',
        'Degree_Level',
        'Duration_Years',
        'Computer_Fee',
      ];
      const rows = [
        headers,
        ['B.Sc-DS', 'B.Sc Data Science & AI', 'UG', 'UG', 4, 'YES'],
        ['B.Com-CA', 'B.Com Computer Applications', 'UG', 'UG', 4, 'YES'],
        ['M.B.A', 'Master of Business Administration', 'MBA_MCA', 'PG', 2, 'YES'],
        ['M.C.A', 'Master of Computer Applications', 'MBA_MCA', 'PG', 2, 'YES'],
        ['L.L.B-3Y', 'Bachelor of Laws (3 Years)', 'LAW', 'UG', 3, 'NO'],
        ['B.Ed', 'Bachelor of Education', 'EDUCATION', 'UG', 2, 'NO'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 16 },
        { wch: 38 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Courses');
      XLSX.writeFile(wb, 'AKNU_Courses_Template.xlsx');
      message.success('Downloaded AKNU_Courses_Template.xlsx successfully!');
    }
  };

  // Option 3: Dedicated Seat Matrix Bulk Upload (.xlsx) Methods
  const parseSeatMatrixText = (rawText: string) => {
    if (!rawText.trim()) {
      setSeatMatrixParsedRows([]);
      return;
    }

    const lines = rawText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    let delimiter = ',';
    if (lines[0].includes('\t')) delimiter = '\t';
    else if (lines[0].includes(';') && !lines[0].includes(',')) delimiter = ';';

    const headerParts = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ''));
    const isHeader = headerParts.some((h) => h.includes('college') || h.includes('course') || h.includes('intake'));
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
          else if (h.includes('coursecode')) rowObj.courseCode = val;
          else if (h.includes('coursename') || h.includes('course') || h.includes('program')) rowObj.courseName = val;
          else if (h.includes('intake') || h.includes('sanctioned') || h.includes('capacity')) rowObj.sanctionedIntake = parseInt(val, 10) || 60;
          else if (h.includes('convenor') || h.includes('cq')) rowObj.convenorQuota = parseInt(val, 10);
          else if (h.includes('management') || h.includes('mq')) rowObj.managementQuota = parseInt(val, 10);
        });
      } else {
        rowObj.collegeCode = parts[0] || '';
        rowObj.collegeName = parts[1] || '';
        rowObj.courseCode = parts[2] || '';
        rowObj.courseName = parts[3] || '';
        rowObj.sanctionedIntake = parseInt(parts[4], 10) || 60;
        rowObj.convenorQuota = parts[5] ? parseInt(parts[5], 10) : undefined;
        rowObj.managementQuota = parts[6] ? parseInt(parts[6], 10) : undefined;
      }

      if (!rowObj.convenorQuota && rowObj.sanctionedIntake) {
        rowObj.convenorQuota = Math.round(rowObj.sanctionedIntake * 0.7);
      }
      if (!rowObj.managementQuota && rowObj.sanctionedIntake) {
        rowObj.managementQuota = Math.round(rowObj.sanctionedIntake * 0.3);
      }

      rowObj._isValid = !!(rowObj.collegeCode && (rowObj.courseCode || rowObj.courseName) && rowObj.sanctionedIntake > 0);
      rowObj._error = !rowObj.collegeCode
        ? 'Missing College Code'
        : !(rowObj.courseCode || rowObj.courseName)
          ? 'Missing Course'
          : !rowObj.sanctionedIntake
            ? 'Invalid Intake'
            : null;

      rows.push(rowObj);
    }

    setSeatMatrixParsedRows(rows);
  };

  const handleSeatMatrixFileUpload = (file: File) => {
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
          setSeatMatrixPastedData(csvText);
          parseSeatMatrixText(csvText);
          message.success(`Parsed Seat Matrix Excel (.xlsx): ${file.name}`);
        } catch (err) {
          message.error('Failed to parse Excel file. Please ensure it is a valid .xlsx file.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setSeatMatrixPastedData(text);
        parseSeatMatrixText(text);
        message.success(`Parsed file: ${file.name}`);
      };
      reader.readAsText(file);
    }
    return false;
  };

  const downloadSeatMatrixTemplate = () => {
    const headers = [
      'College_Code',
      'College_Name',
      'Course_Code',
      'Course_Name',
      'Sanctioned_Intake',
      'Convenor_Quota',
      'Management_Quota',
    ];
    const rows = [
      headers,
      ['001', 'Government Degree College (Autonomous)', 'B.Sc-DS', 'B.Sc Data Science & AI', 60, 42, 18],
      ['001', 'Government Degree College (Autonomous)', 'B.Com-CA', 'B.Com Computer Applications', 120, 84, 36],
      ['001', 'Government Degree College (Autonomous)', 'M.B.A', 'Master of Business Administration', 60, 42, 18],
      ['002', 'Aditya Degree College for Women', 'B.Sc-DS', 'B.Sc Data Science & AI', 120, 84, 36],
      ['002', 'Aditya Degree College for Women', 'M.B.A', 'Master of Business Administration', 60, 42, 18],
      ['003', 'SKBR College', 'B.Com-CA', 'B.Com Computer Applications', 60, 42, 18],
      ['003', 'SKBR College', 'M.C.A', 'Master of Computer Applications', 60, 42, 18],
      ['004', 'P.R. Government Degree College', 'B.Sc-DS', 'B.Sc Data Science & AI', 120, 84, 36],
      ['004', 'P.R. Government Degree College', 'B.Com-CA', 'B.Com Computer Applications', 120, 84, 36],
      ['004', 'P.R. Government Degree College', 'M.B.A', 'Master of Business Administration', 60, 42, 18],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 42 },
      { wch: 16 },
      { wch: 36 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SeatMatrix');
    XLSX.writeFile(wb, 'AKNU_College_Seat_Matrix_Template.xlsx');
    message.success('Downloaded AKNU_College_Seat_Matrix_Template.xlsx successfully!');
  };

  const loadDemoSeatMatrixData = () => {
    const demo =
      'College_Code,College_Name,Course_Code,Course_Name,Sanctioned_Intake,Convenor_Quota,Management_Quota\n' +
      '004,P.R. Government Degree College,B.Sc-DS,B.Sc Data Science & AI,120,84,36\n' +
      '004,P.R. Government Degree College,B.Com-CA,B.Com Computer Applications,120,84,36\n' +
      '004,P.R. Government Degree College,M.B.A,Master of Business Administration,60,42,18\n' +
      '005,VSM College of Arts & Science,B.Sc-DS,B.Sc Data Science & AI,60,42,18\n' +
      '005,VSM College of Arts & Science,M.B.A,Master of Business Administration,60,42,18\n' +
      '006,Sri YN College,B.Sc-DS,B.Sc Data Science & AI,60,42,18\n' +
      '006,Sri YN College,M.C.A,Master of Computer Applications,60,42,18\n' +
      '007,DNR College,B.Com-CA,B.Com Computer Applications,120,84,36\n' +
      '007,DNR College,M.B.A,Master of Business Administration,120,84,36\n' +
      '008,Ideal Institute of Degree Studies,B.Sc-DS,B.Sc Data Science & AI,60,42,18\n';
    setSeatMatrixPastedData(demo);
    parseSeatMatrixText(demo);
  };

  const handleExecuteSeatMatrixUpload = async () => {
    const validRows = seatMatrixParsedRows.filter((r) => r._isValid);
    if (!validRows.length) {
      message.error('No valid seat matrix rows found to import. Please check data.');
      return;
    }

    setSeatMatrixUploading(true);
    try {
      const res = await api.colleges.bulkSeatMatrix(validRows);
      message.success(`Seat matrix updated! Successfully synced ${res.data.importedCount} sanctioned course intakes across colleges.`);
      setBulkSeatMatrixModalOpen(false);
      setSeatMatrixPastedData('');
      setSeatMatrixParsedRows([]);
      loadColleges();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Bulk seat matrix update failed');
    } finally {
      setSeatMatrixUploading(false);
    }
  };

  const loadDemoBulkData = (type: 'COLLEGES' | 'COURSES') => {
    let demo = '';
    if (type === 'COLLEGES') {
      demo =
        'College_Code,College_Name,Type,Location,District,Principal_Name,Principal_Mobile,Principal_Email,Autonomous,Hostel,Courses_Offered\n' +
        '004,P.R. Government Degree College,GOVERNMENT,URBAN,Kakinada,Dr. V. Prasad,9440112233,prgdc.kakinada@aknu.edu.in,YES,YES,B.Sc-DS:120; B.Com-CA:120; M.B.A:60\n' +
        '005,VSM College of Arts & Science,AIDED,RURAL,Dr. B.R. Ambedkar Konaseema,Dr. K. Ranga Rao,9848223344,vsm.ramachandrapuram@aknu.edu.in,YES,NO,B.Sc-DS:60; M.B.A:60\n' +
        '006,Sri YN College,AIDED,RURAL,West Godavari,Dr. G. Venkanna,9440334455,sriyn.narsapur@aknu.edu.in,YES,YES,B.Sc-DS:60; B.Com-CA:60; M.C.A:60\n' +
        '007,DNR College,AIDED,URBAN,West Godavari,Dr. Ch. Mohan,9440445566,dnr.bhimavaram@aknu.edu.in,YES,YES,B.Com-CA:120; M.B.A:120; M.C.A:60\n' +
        '008,Ideal Institute of Degree Studies,UNAIDED,URBAN,Kakinada,Dr. S. Rama Krishna,9848556677,ideal.kakinada@aknu.edu.in,NO,NO,B.Sc-DS:60; B.Com-CA:60\n';
    } else {
      demo =
        'Course_Code,Course_Name,Course_Group,Degree_Level,Duration_Years,Computer_Fee\n' +
        'M.Sc-CY,M.Sc Organic Chemistry,PG,PG,2,YES\n' +
        'M.Sc-CS,M.Sc Computer Science,PG,PG,2,YES\n' +
        'L.L.M-CL,Master of Laws (Constitutional Law),LAW,PG,2,NO\n' +
        'M.Ed,Master of Education,EDUCATION,PG,2,NO\n' +
        'B.P.Ed,Bachelor of Physical Education,PHYSICAL_EDUCATION,UG,2,NO\n';
    }
    setPastedData(demo);
    parseDelimitedText(demo, type);
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, color: '#002147', fontWeight: 700, fontSize: '20px' }}>
            Affiliated Colleges Master Register
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Adikavi Nannaya University • Affiliated Institutions & Sanctioned Seat Matrix
          </Text>
        </div>

        {/* Action Buttons */}
        <Space wrap size="small">
          <Button
            size="middle"
            icon={<DownloadOutlined />}
            onClick={() => downloadSampleTemplate('COLLEGES')}
          >
            Template (.xlsx)
          </Button>
          <Button
            size="middle"
            icon={<UploadOutlined />}
            onClick={() => {
              setPastedData('');
              setParsedRows([]);
              setBulkCollegeModal(true);
            }}
          >
            Bulk Upload
          </Button>
          <Button
            type="primary"
            size="middle"
            icon={<PlusOutlined />}
            onClick={() => setCreateCollegeModal(true)}
            style={{ background: '#002147' }}
          >
            Add College
          </Button>
          <Popconfirm
            title="Clear all data?"
            description="Are you sure you want to clear all colleges, students, demands, and proceedings to start fresh?"
            onConfirm={handleClearAllData}
            okText="Yes, Clear All"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button danger size="middle" icon={<DeleteOutlined />}>
              Clear All Data
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <div>
        {/* Sleek Compact Stats Strip */}
        <Card
          size="small"
          style={{
            borderRadius: '8px',
            marginBottom: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            background: '#ffffff',
            border: '1px solid #eef0f2',
          }}
          styles={{ body: { padding: '10px 16px' } }}
        >
          <Row gutter={[12, 8]} align="middle" justify="space-between">
            <Col xs={12} sm={8} md={4}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    background: 'rgba(0, 33, 71, 0.08)',
                    color: '#002147',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  <BankOutlined />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Total Colleges</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#002147', lineHeight: 1.1 }}>{colleges.length}</div>
                </div>
              </div>
            </Col>

            <Col xs={12} sm={8} md={4}>
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: 12 }}>
                <div style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>Government</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#096dd9' }}>
                  {colleges.filter((c) => c.type === 'GOVERNMENT').length}
                </div>
              </div>
            </Col>

            <Col xs={12} sm={8} md={4}>
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: 12 }}>
                <div style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>Aided</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#389e0d' }}>
                  {colleges.filter((c) => c.type === 'AIDED').length}
                </div>
              </div>
            </Col>

            <Col xs={12} sm={8} md={4}>
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: 12 }}>
                <div style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>Unaided / Private</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#d48806' }}>
                  {colleges.filter((c) => c.type === 'UNAIDED').length}
                </div>
              </div>
            </Col>

            <Col xs={12} sm={8} md={4}>
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: 12 }}>
                <div style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>Autonomous</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#722ed1' }}>
                  {colleges.filter((c) => c.isAutonomous).length}
                </div>
              </div>
            </Col>

            <Col xs={12} sm={8} md={4}>
              <div style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: 12 }}>
                <div style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>With Hostels</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#c41d7f' }}>
                  {colleges.filter((c) => c.hasHostel).length}
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Main Unified Colleges Register Card */}
        <Card
          style={{
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            border: '1px solid #eef0f2',
          }}
          styles={{ body: { padding: '16px' } }}
        >
          {/* Integrated Filter Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <Space wrap size="small">
              <Input
                placeholder="Search code, name, principal, district..."
                prefix={<SearchOutlined style={{ color: '#aaa' }} />}
                value={collegeSearch}
                onChange={(e) => setCollegeSearch(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />

              <Select
                placeholder={categoryOptions.length === 0 ? 'Category (None created)' : 'Category'}
                allowClear
                value={typeFilter}
                style={{ width: 170 }}
                onChange={(val) => setTypeFilter(val || undefined)}
                options={[{ label: 'All', value: '' }, ...categoryOptions]}
                notFoundContent="No categories created"
              />

              <Select
                placeholder={districtOptions.length === 0 ? 'District (None created)' : 'District'}
                allowClear
                value={districtFilter}
                style={{ width: 180 }}
                onChange={(val) => setDistrictFilter(val || undefined)}
                options={[{ label: 'All', value: '' }, ...districtOptions]}
                notFoundContent="No districts created"
              />

              <Select
                placeholder={locationOptions.length === 0 ? 'Location (None created)' : 'Location'}
                allowClear
                value={locationFilter}
                style={{ width: 170 }}
                onChange={(val) => setLocationFilter(val || undefined)}
                options={[{ label: 'All', value: '' }, ...locationOptions]}
                notFoundContent="No locations created"
              />

              {(collegeSearch || typeFilter || districtFilter || locationFilter) && (
                <Button icon={<ReloadOutlined />} onClick={resetCollegeFilters}>
                  Clear
                </Button>
              )}
            </Space>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              Showing <strong>{filteredColleges.length}</strong> of {colleges.length} colleges
            </Text>
          </div>

          {/* Colleges Table */}
          <Table
            dataSource={filteredColleges}
            rowKey="id"
            loading={collegesLoading}
            pagination={{ pageSize: 10, showSizeChanger: true, size: 'small' }}
            scroll={{ x: 1300 }}
            size="middle"
            columns={[
              {
                title: 'Code',
                dataIndex: 'code',
                key: 'code',
                width: 85,
                render: (code) => (
                  <Tag
                    color="blue"
                    style={{ fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}
                  >
                    {code}
                  </Tag>
                ),
              },
              {
                title: 'Affiliated College Name',
                dataIndex: 'name',
                key: 'name',
                render: (name, record) => (
                  <div>
                    <div style={{ fontWeight: 600, color: '#002147', fontSize: '13px' }}>{name}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {record.address || record.district}
                    </div>
                  </div>
                ),
              },
              {
                title: 'Category',
                dataIndex: 'type',
                key: 'type',
                width: 120,
                render: (type) => {
                  const colors: Record<string, string> = {
                    GOVERNMENT: 'cyan',
                    AIDED: 'green',
                    UNAIDED: 'orange',
                  };
                  return <Tag color={colors[type] || 'default'}>{type}</Tag>;
                },
              },
              {
                title: 'District & Area',
                key: 'district',
                width: 170,
                render: (_, record) => (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500 }}>{record.district}</div>
                    <Tag color="geekblue" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                      {record.location}
                    </Tag>
                  </div>
                ),
              },
              {
                title: 'Tags',
                key: 'tags',
                width: 130,
                render: (_, record) => (
                  <Space size={2} direction="vertical">
                    {record.isAutonomous && (
                      <Tag color="purple" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                        AUTONOMOUS
                      </Tag>
                    )}
                    {record.hasHostel && (
                      <Tag color="gold" style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                        HOSTEL
                      </Tag>
                    )}
                  </Space>
                ),
              },
              {
                title: 'Academic Streams & Sanctioned Programs',
                key: 'courses',
                width: 250,
                render: (_, record) => {
                  const collegeCourses = record.courses && record.courses.length > 0
                    ? record.courses
                    : (record.courseIds && record.courseIds.length > 0)
                      ? courses.filter((c) => record.courseIds?.includes(c.id) || record.courseIds?.includes(c.code))
                      : [];

                  const colStreams = record.streams && record.streams.length > 0
                    ? record.streams
                    : record.courseIntakes && record.courseIntakes.length > 0
                      ? Array.from(new Set(record.courseIntakes.map((ci) => ci.stream).filter(Boolean)))
                      : collegeCourses.map((c: any) => c.stream || c.courseGroup || 'UG');
                  const uniqueStreams = Array.from(new Set(colStreams));

                  const totalSeats = record.courseIntakes && record.courseIntakes.length > 0
                    ? record.courseIntakes.reduce((sum, ci) => sum + (ci.sanctionedIntake || 0), 0)
                    : collegeCourses.reduce((sum: number, c: any) => sum + (c.sanctionedIntake || c.defaultIntake || 60), 0);

                  const streamColors: Record<string, string> = {
                    UG: 'blue',
                    PG: 'green',
                    LAW: 'volcano',
                    EDUCATION: 'purple',
                  };

                  if (collegeCourses.length === 0 && uniqueStreams.length === 0) {
                    return <span style={{ color: '#aaa', fontSize: '11px', fontStyle: 'italic' }}>No programs mapped</span>;
                  }

                  return (
                    <div>
                      {uniqueStreams.length > 0 && (
                        <div style={{ marginBottom: 4 }}>
                          <Space size={[2, 2]} wrap>
                            {uniqueStreams.map((st) => (
                              <Tag
                                key={st}
                                color={streamColors[st] || 'geekblue'}
                                style={{ fontSize: '10px', fontWeight: 800, padding: '0 5px', margin: 0 }}
                              >
                                {st}
                              </Tag>
                            ))}
                          </Space>
                        </div>
                      )}
                      <Tooltip
                        title={
                          <div style={{ fontSize: '11px' }}>
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>Sanctioned Programs:</div>
                            {(record.courseIntakes?.length ? record.courseIntakes : collegeCourses).map((c: any) => (
                              <div key={c.courseId || c.id || c.code}>
                                • {c.courseName || c.name} ({c.courseCode || c.code}): <strong>{c.sanctionedIntake || c.defaultIntake || 60} Seats</strong>
                              </div>
                            ))}
                          </div>
                        }
                      >
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#002147', cursor: 'pointer' }}>
                          {collegeCourses.length || record.courseIntakes?.length || 0} Programs • <Tag color="cyan" style={{ fontWeight: 700, marginLeft: 2 }}>{totalSeats} Seats</Tag>
                        </span>
                      </Tooltip>
                    </div>
                  );
                },
              },
              {
                title: 'Principal Contact',
                key: 'contact',
                width: 220,
                render: (_, record) => {
                  const isNamePhone = /^\+?\d[\d\s\-]{7,15}$/.test((record.principalName || '').trim());
                  const isPlaceholder = (record.principalName || '').startsWith('Principal (');
                  const known = KNOWN_PRINCIPALS[record.code];
                  const displayName = (known && (isNamePhone || isPlaceholder || !record.principalName))
                    ? known.name
                    : isNamePhone
                      ? (known?.name || `Dr. Principal`)
                      : (record.principalName || known?.name || `Dr. Principal (${record.code})`);
                  const displayMobile = isNamePhone
                    ? record.principalName
                    : (record.principalMobile || known?.mobile);
                  return (
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#002147' }}>{displayName}</div>
                      {displayMobile && (
                        <div style={{ color: '#555', fontSize: '11px', fontWeight: 500 }}>{displayMobile}</div>
                      )}
                      {record.principalEmail && (
                        <div style={{ color: '#888', fontSize: '10px' }}>{record.principalEmail}</div>
                      )}
                    </div>
                  );
                },
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 130,
                fixed: 'right',
                render: (_, record) => (
                  <Space size={2}>
                    <Tooltip title="View Details">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined style={{ color: '#002147' }} />}
                        onClick={() => handleViewCollege(record.id)}
                      />
                    </Tooltip>
                    <Tooltip title="Edit College">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined style={{ color: '#1890ff' }} />}
                        onClick={() => openEditCollegeModal(record)}
                      />
                    </Tooltip>
                    <Tooltip title="Delete College">
                      <Popconfirm
                        title="Delete College"
                        description={`Are you sure you want to delete ${record.name}?`}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDeleteCollege(record.id)}
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </Tooltip>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </div>

      {/* ==========================================
          MODAL: BULK UPLOAD COLLEGES
          ========================================== */}
      <Modal
        title={
          <Space>
            <UploadOutlined style={{ color: '#002147' }} />
            <span>Bulk Upload Affiliated Colleges</span>
          </Space>
        }
        open={bulkCollegeModal}
        onCancel={() => {
          setBulkCollegeModal(false);
          setPastedData('');
          setParsedRows([]);
        }}
        footer={null}
        width={750}
      >
        <div style={{ marginBottom: 16 }}>
          <Paragraph type="secondary" style={{ fontSize: '13px', marginBottom: 12 }}>
            Upload Excel (.xlsx) file with columns: <code>College_Code</code>, <code>College_Name</code>, <code>Type</code> (GOVERNMENT/AIDED/UNAIDED), <code>Location</code>, <code>District</code>, <code>Principal_Name</code>, <code>Principal_Mobile</code>, <code>Principal_Email</code>, <code>Autonomous</code>, <code>Hostel</code>.
          </Paragraph>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={30}>
              <Upload.Dragger
                name="file"
                multiple={false}
                accept=".xlsx,.xls,.csv,.txt,.tsv"
                beforeUpload={(file) => handleFileUpload(file, 'COLLEGES')}
                showUploadList={false}
                style={{ padding: '16px 0', background: '#fafafa', borderRadius: '6px' }}
              >
                <p className="ant-upload-drag-icon" style={{ margin: 0 }}>
                  <FileExcelOutlined style={{ fontSize: 28, color: '#52c41a' }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: '13px', margin: '4px 0 0' }}>
                  Click or drag Excel (.xlsx) spreadsheet
                </p>
              </Upload.Dragger>
            </Col>


          </Row>


        </div>

        {/* Preview parsed rows */}
        {parsedRows.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>
                Parsed Preview ({parsedRows.length} rows,{' '}
                <Text type="success">{parsedRows.filter((r) => r._isValid).length} ready</Text>)
              </Text>
            </div>
            <Table
              dataSource={parsedRows}
              rowKey="_rowNum"
              pagination={{ pageSize: 5, size: 'small' }}
              scroll={{ x: 1350 }}
              size="small"
              columns={[
                {
                  title: 'Row',
                  dataIndex: '_rowNum',
                  key: '_rowNum',
                  width: 55,
                  fixed: 'left',
                },
                {
                  title: 'Status',
                  key: '_isValid',
                  width: 90,
                  fixed: 'left',
                  render: (_, r) =>
                    r._isValid ? <Tag color="success">READY</Tag> : <Tag color="error">INVALID</Tag>,
                },
                {
                  title: 'Code',
                  dataIndex: 'code',
                  key: 'code',
                  width: 80,
                  fixed: 'left',
                  render: (c) => <Tag color="blue">{c}</Tag>,
                },
                {
                  title: 'College Name',
                  dataIndex: 'name',
                  key: 'name',
                  width: 220,
                  render: (n) => <span style={{ fontWeight: 600 }}>{n}</span>,
                },
                {
                  title: 'Type',
                  dataIndex: 'type',
                  key: 'type',
                  width: 105,
                  render: (t) => <Tag>{t || 'UNAIDED'}</Tag>,
                },
                {
                  title: 'Location',
                  dataIndex: 'location',
                  key: 'location',
                  width: 95,
                  render: (loc) => <Tag color="geekblue">{loc || 'RURAL'}</Tag>,
                },
                {
                  title: 'District',
                  dataIndex: 'district',
                  key: 'district',
                  width: 150,
                },
                {
                  title: 'Principal Name',
                  dataIndex: 'principalName',
                  key: 'principalName',
                  width: 150,
                },
                {
                  title: 'Mobile',
                  dataIndex: 'principalMobile',
                  key: 'principalMobile',
                  width: 115,
                },
                {
                  title: 'Email',
                  dataIndex: 'principalEmail',
                  key: 'principalEmail',
                  width: 180,
                },
                {
                  title: 'Autonomous',
                  dataIndex: 'isAutonomous',
                  key: 'isAutonomous',
                  width: 105,
                  render: (v) => (v ? <Tag color="purple">YES</Tag> : <Tag>NO</Tag>),
                },
                {
                  title: 'Hostel',
                  dataIndex: 'hasHostel',
                  key: 'hasHostel',
                  width: 90,
                  render: (v) => (v ? <Tag color="gold">YES</Tag> : <Tag>NO</Tag>),
                },
                {
                  title: 'Programs',
                  key: 'programs',
                  width: 140,
                  render: (_, r) => {
                    const count = r.courseIds?.length || 0;
                    if (count === 0 && !r.programsStr) {
                      return <span style={{ color: '#aaa', fontSize: '11px' }}>None</span>;
                    }
                    return (
                      <Tooltip title={r.programsStr || `${count} programs linked`}>
                        <Tag color="cyan">{count > 0 ? `${count} Programs` : r.programsStr}</Tag>
                      </Tooltip>
                    );
                  },
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 90,
                  fixed: 'right',
                  render: (_, record) => (
                    <Space size={2}>
                      <Tooltip title="Edit Row Data">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined style={{ color: '#1890ff' }} />}
                          onClick={() => openEditPreviewRow(record, 'COLLEGES')}
                        />
                      </Tooltip>
                      <Tooltip title="Delete Row">
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeletePreviewRow(record._rowNum)}
                        />
                      </Tooltip>
                    </Space>
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
                setBulkCollegeModal(false);
                setPastedData('');
                setParsedRows([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={bulkUploading}
              disabled={!parsedRows.some((r) => r._isValid)}
              onClick={() => handleExecuteBulkUpload('COLLEGES')}
              style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 700 }}
            >
              Import {parsedRows.filter((r) => r._isValid).length} Colleges
            </Button>
          </Space>
        </div>
      </Modal>

      {/* ==========================================
          MODAL: BULK UPLOAD COURSES
          ========================================== */}
      <Modal
        title={
          <Space>
            <UploadOutlined style={{ color: '#002147' }} />
            <span>Bulk Upload Academic Courses</span>
          </Space>
        }
        open={bulkCourseModal}
        onCancel={() => {
          setBulkCourseModal(false);
          setPastedData('');
          setParsedRows([]);
        }}
        footer={null}
        width={720}
      >
        <div style={{ marginBottom: 16 }}>
          <Paragraph type="secondary" style={{ fontSize: '13px', marginBottom: 12 }}>
            Upload Excel (.xlsx) file with columns: <code>Course_Code</code>, <code>Course_Name</code>, <code>Course_Group</code> (UG/PG/MBA_MCA/LAW/EDUCATION), <code>Degree_Level</code>, <code>Duration_Years</code>, <code>Computer_Fee</code>.
          </Paragraph>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Upload.Dragger
                name="file"
                multiple={false}
                accept=".xlsx,.xls,.csv,.txt,.tsv"
                beforeUpload={(file) => handleFileUpload(file, 'COURSES')}
                showUploadList={false}
                style={{ padding: '16px 0', background: '#fafafa', borderRadius: '6px' }}
              >
                <p className="ant-upload-drag-icon" style={{ margin: 0 }}>
                  <FileExcelOutlined style={{ fontSize: 28, color: '#52c41a' }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: '13px', margin: '4px 0 0' }}>
                  Click or drag Excel (.xlsx) spreadsheet
                </p>
              </Upload.Dragger>
            </Col>

            <Col xs={24} md={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  block
                  icon={<DownloadOutlined />}
                  onClick={() => downloadSampleTemplate('COURSES')}
                >
                  Download Sample Excel (.xlsx) Template
                </Button>
                <Button
                  block
                  icon={<ThunderboltOutlined />}
                  onClick={() => loadDemoBulkData('COURSES')}
                >
                  Load Demo Courses Data
                </Button>
              </Space>
            </Col>
          </Row>

          <div style={{ marginTop: 12 }}>
            <Text strong style={{ fontSize: '12px' }}>Or Paste Tabular Data from Excel / CSV:</Text>
            <TextArea
              rows={4}
              placeholder="Course_Code,Course_Name,Course_Group,Degree_Level,Duration_Years,Computer_Fee..."
              value={pastedData}
              onChange={(e) => {
                setPastedData(e.target.value);
                parseDelimitedText(e.target.value, 'COURSES');
              }}
              style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: 4 }}
            />
          </div>
        </div>

        {/* Preview parsed rows */}
        {parsedRows.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>
                Parsed Preview ({parsedRows.length} rows,{' '}
                <Text type="success">{parsedRows.filter((r) => r._isValid).length} ready</Text>)
              </Text>
            </div>
            <Table
              dataSource={parsedRows}
              rowKey="_rowNum"
              pagination={{ pageSize: 5, size: 'small' }}
              scroll={{ x: 950 }}
              size="small"
              columns={[
                {
                  title: 'Row',
                  dataIndex: '_rowNum',
                  key: '_rowNum',
                  width: 55,
                  fixed: 'left',
                },
                {
                  title: 'Status',
                  key: '_isValid',
                  width: 90,
                  fixed: 'left',
                  render: (_, r) =>
                    r._isValid ? <Tag color="success">READY</Tag> : <Tag color="error">INVALID</Tag>,
                },
                {
                  title: 'Code',
                  dataIndex: 'code',
                  key: 'code',
                  width: 100,
                  fixed: 'left',
                  render: (c) => <Tag color="geekblue">{c}</Tag>,
                },
                {
                  title: 'Program Title',
                  dataIndex: 'name',
                  key: 'name',
                  width: 220,
                  render: (n) => <span style={{ fontWeight: 600 }}>{n}</span>,
                },
                {
                  title: 'Group',
                  dataIndex: 'courseGroup',
                  key: 'courseGroup',
                  width: 120,
                  render: (g) => <Tag>{g || 'UG'}</Tag>,
                },
                {
                  title: 'Level',
                  dataIndex: 'degreeLevel',
                  key: 'degreeLevel',
                  width: 85,
                  render: (l) => <Tag>{l || 'UG'}</Tag>,
                },
                {
                  title: 'Duration',
                  dataIndex: 'durationYears',
                  key: 'durationYears',
                  width: 95,
                  render: (d) => `${d || 3} Years`,
                },
                {
                  title: 'Computer Fee',
                  dataIndex: 'isComputer',
                  key: 'isComputer',
                  width: 130,
                  render: (c) => (c ? <Tag color="cyan">YES (₹1,500)</Tag> : <Tag>NO</Tag>),
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 90,
                  fixed: 'right',
                  render: (_, record) => (
                    <Space size={2}>
                      <Tooltip title="Edit Row Data">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined style={{ color: '#1890ff' }} />}
                          onClick={() => openEditPreviewRow(record, 'COURSES')}
                        />
                      </Tooltip>
                      <Tooltip title="Delete Row">
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeletePreviewRow(record._rowNum)}
                        />
                      </Tooltip>
                    </Space>
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
                setBulkCourseModal(false);
                setPastedData('');
                setParsedRows([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={bulkUploading}
              disabled={!parsedRows.some((r) => r._isValid)}
              onClick={() => handleExecuteBulkUpload('COURSES')}
              style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 700 }}
            >
              Import {parsedRows.filter((r) => r._isValid).length} Courses
            </Button>
          </Space>
        </div>
      </Modal>

      {/* ==========================================
          MODAL: BULK UPLOAD SEAT MATRIX & INTAKES (OPTION 3)
          ========================================== */}
      <Modal
        title={
          <Space>
            <UploadOutlined style={{ color: '#096dd9' }} />
            <span style={{ fontWeight: 700, color: '#002147' }}>
              Bulk Upload College Seat Matrix & Sanctioned Intakes (.xlsx)
            </span>
          </Space>
        }
        open={bulkSeatMatrixModalOpen}
        onCancel={() => {
          setBulkSeatMatrixModalOpen(false);
          setSeatMatrixPastedData('');
          setSeatMatrixParsedRows([]);
        }}
        footer={null}
        width={780}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            type="info"
            showIcon
            message="Excel-Based Seat Matrix & Cap Sync (Option 3)"
            description="Upload college course seat matrices in bulk (.xlsx). System automatically maps approved programs, branches, and strictly enforces intake capacities for admissions."
            style={{ marginBottom: 14 }}
          />

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Upload.Dragger
                name="file"
                multiple={false}
                accept=".xlsx,.xls,.csv,.txt,.tsv"
                beforeUpload={handleSeatMatrixFileUpload}
                showUploadList={false}
                style={{ padding: '16px 0', background: '#fafafa', borderRadius: '6px' }}
              >
                <p className="ant-upload-drag-icon" style={{ margin: 0 }}>
                  <FileExcelOutlined style={{ fontSize: 28, color: '#52c41a' }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: '13px', margin: '4px 0 0', fontWeight: 600 }}>
                  Click or drag Seat Matrix Excel (.xlsx)
                </p>
                <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>Supports .xlsx, .xls, .csv</p>
              </Upload.Dragger>
            </Col>

            <Col xs={24} md={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  block
                  icon={<DownloadOutlined />}
                  onClick={downloadSeatMatrixTemplate}
                >
                  Download Seat Matrix Template (.xlsx)
                </Button>
                <Button
                  block
                  icon={<ThunderboltOutlined />}
                  onClick={loadDemoSeatMatrixData}
                >
                  Load Demo Seat Matrix Data
                </Button>
              </Space>
            </Col>
          </Row>

          <div style={{ marginTop: 12 }}>
            <Text strong style={{ fontSize: '12px' }}>Or Paste Tabular Data from Excel / CSV:</Text>
            <TextArea
              rows={4}
              placeholder="College_Code,College_Name,Course_Code,Course_Name,Sanctioned_Intake,Convenor_Quota,Management_Quota..."
              value={seatMatrixPastedData}
              onChange={(e) => {
                setSeatMatrixPastedData(e.target.value);
                parseSeatMatrixText(e.target.value);
              }}
              style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: 4 }}
            />
          </div>
        </div>

        {/* Preview parsed seat matrix rows */}
        {seatMatrixParsedRows.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>
                Parsed Seat Matrix ({seatMatrixParsedRows.length} entries,{' '}
                <Text type="success">{seatMatrixParsedRows.filter((r) => r._isValid).length} ready</Text>)
              </Text>
              <Tag color="blue">
                Total Capacity:{' '}
                {seatMatrixParsedRows
                  .filter((r) => r._isValid)
                  .reduce((sum, r) => sum + (r.sanctionedIntake || 0), 0)}{' '}
                Seats
              </Tag>
            </div>
            <Table
              dataSource={seatMatrixParsedRows}
              rowKey="_rowNum"
              pagination={{ pageSize: 5, size: 'small' }}
              scroll={{ x: 800 }}
              size="small"
              columns={[
                {
                  title: 'Row',
                  dataIndex: '_rowNum',
                  key: '_rowNum',
                  width: 55,
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
                  width: 105,
                  render: (c) => <Tag color="blue">{c}</Tag>,
                },
                {
                  title: 'College Name',
                  dataIndex: 'collegeName',
                  key: 'collegeName',
                  width: 180,
                  ellipsis: true,
                  render: (n) => <span style={{ fontWeight: 600 }}>{n || '—'}</span>,
                },
                {
                  title: 'Course Code',
                  dataIndex: 'courseCode',
                  key: 'courseCode',
                  width: 110,
                  render: (c) => <Tag color="geekblue">{c || '—'}</Tag>,
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
                  width: 130,
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
                          setSeatMatrixParsedRows((prev) =>
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
                setBulkSeatMatrixModalOpen(false);
                setSeatMatrixPastedData('');
                setSeatMatrixParsedRows([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={seatMatrixUploading}
              disabled={!seatMatrixParsedRows.some((r) => r._isValid)}
              onClick={handleExecuteSeatMatrixUpload}
              style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 700 }}
            >
              Apply Seat Matrix ({seatMatrixParsedRows.filter((r) => r._isValid).length} Allocations)
            </Button>
          </Space>
        </div>
      </Modal>

      {/* ==========================================
          MODAL: ADD SINGLE COLLEGE
          ========================================== */}
      <Modal
        title={
          <Space>
            <BankOutlined style={{ color: '#002147' }} />
            <span>Register New Affiliated College & Map Sanctioned Programs</span>
          </Space>
        }
        open={createCollegeModal}
        onCancel={() => setCreateCollegeModal(false)}
        footer={null}
        width={780}
      >
        <Form form={collegeForm} layout="vertical" onFinish={handleCreateCollege}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="code" label="College Code" rules={[{ required: true, message: 'Code required' }]}>
                <Input placeholder="e.g. 055" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="College Name" rules={[{ required: true, message: 'Name required' }]}>
                <Input placeholder="e.g. Aditya Degree College" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="type" label="Category" initialValue="UNAIDED" rules={[{ required: true, message: 'Category required' }]}>
                <CreatableSelect
                  placeholder="Select or search category..."
                  itemName="category"
                  options={modalCategoryOptions}
                  onAddOption={(newVal) => {
                    const formatted = newVal.toUpperCase();
                    const label = newVal.charAt(0).toUpperCase() + newVal.slice(1);
                    setModalCategoryOptions((prev) => [...prev, { label, value: formatted }]);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="district" label="District" initialValue="East Godavari" rules={[{ required: true, message: 'District required' }]}>
                <CreatableSelect
                  placeholder="Select or search district..."
                  itemName="district"
                  options={modalDistrictOptions}
                  onAddOption={(newVal) => {
                    setModalDistrictOptions((prev) => [...prev, { label: newVal, value: newVal }]);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="location" label="Location" initialValue="RURAL" rules={[{ required: true, message: 'Location required' }]}>
                <CreatableSelect
                  placeholder="Select or search location..."
                  itemName="location"
                  options={modalLocationOptions}
                  onAddOption={(newVal) => {
                    const formatted = newVal.toUpperCase();
                    const label = newVal.charAt(0).toUpperCase() + newVal.slice(1);
                    setModalLocationOptions((prev) => [...prev, { label, value: formatted }]);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="principalName" label="Principal Name" rules={[{ required: true }]}>
                <Input placeholder="Dr. S. Kumar" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="principalMobile" label="Principal Mobile" rules={[{ required: true }]}>
                <Input placeholder="9440123456" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="principalEmail" label="Principal Email" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="principal@college.edu.in" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="isAutonomous" label="Autonomous Status" valuePropName="checked">
                <Switch checkedChildren="Autonomous" unCheckedChildren="Affiliated" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hasHostel" label="Hostel Recognized" valuePropName="checked">
                <Switch checkedChildren="Hostel Available" unCheckedChildren="No Hostel" />
              </Form.Item>
            </Col>
          </Row>

          {/* Dynamic Academic Hierarchy & Sanctioned Seat Mapper */}
          <div style={{ marginBottom: 16 }}>
            {renderCourseHierarchyMapper(
              createCollegeStreams,
              setCreateCollegeStreams,
              createCollegeIntakes,
              setCreateCollegeIntakes,
            )}
          </div>

          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Initial Principal Credentials (First-Time Login)"
            description={
              <div style={{ fontSize: '12px' }}>
                <div>• Initial Temporary Password: <code>Aknu@&lt;CollegeCode&gt;</code></div>
                <div>• The Principal will be prompted to update to a new permanent password on first login.</div>
              </div>
            }
          />

          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <Space>
              <Button onClick={() => setCreateCollegeModal(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#002147' }}>
                Register College
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ==========================================
          MODAL: ADD SINGLE COURSE / BRANCH
          ========================================== */}
      <Modal
        title={
          <Space>
            <BookOutlined style={{ color: '#002147' }} />
            <span>Add Approved Academic Course / Branch</span>
          </Space>
        }
        open={createCourseModal}
        onCancel={() => setCreateCourseModal(false)}
        footer={null}
        width={600}
      >
        <Form form={courseForm} layout="vertical" onFinish={handleCreateCourse}>
          <div style={{ background: '#f0f5ff', padding: '8px 12px', borderRadius: 6, marginBottom: 14 }}>
            <Text strong style={{ fontSize: '12px', color: '#002147' }}>
              Academic Hierarchy Placement:
            </Text>
            <div style={{ fontSize: '11px', color: '#555', marginTop: 2 }}>
              Stream (Level 1) ➔ Degree (Level 2) ➔ Branch / Specialization (Level 3)
            </div>
          </div>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="stream" label="Level 1: Academic Stream" initialValue="UG" rules={[{ required: true, message: 'Stream required' }]}>
                <CreatableSelect
                  placeholder="Select stream (UG, PG, LAW...)"
                  itemName="stream"
                  options={allStreams.map((s) => ({ label: s, value: s }))}
                  onAddOption={(newVal) => {
                    const upper = newVal.toUpperCase();
                    if (!customStreams.includes(upper)) {
                      setCustomStreams((prev) => [...prev, upper]);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="degreeType" label="Level 2: Degree Program" initialValue="B.Tech" rules={[{ required: true, message: 'Degree required' }]}>
                <CreatableSelect
                  placeholder="e.g. B.Tech, B.Sc, MBA..."
                  itemName="degree"
                  options={[
                    { label: 'B.Tech', value: 'B.Tech' },
                    { label: 'B.Sc', value: 'B.Sc' },
                    { label: 'B.Com', value: 'B.Com' },
                    { label: 'B.A', value: 'B.A' },
                    { label: 'MBA', value: 'MBA' },
                    { label: 'MCA', value: 'MCA' },
                    { label: 'M.Sc', value: 'M.Sc' },
                    { label: 'LL.B', value: 'LL.B' },
                    { label: 'LL.M', value: 'LL.M' },
                    { label: 'B.Ed', value: 'B.Ed' },
                    { label: 'M.Ed', value: 'M.Ed' },
                    { label: 'B.P.Ed', value: 'B.P.Ed' },
                  ]}
                  onAddOption={(newVal) => {
                    setCustomDegrees((prev) => ({
                      ...prev,
                      UG: [...(prev.UG || []), newVal],
                    }));
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="branch" label="Level 3: Branch / Specialization" rules={[{ required: true, message: 'Branch required' }]}>
                <Input placeholder="e.g. Computer Science & Engineering" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="Course Code" rules={[{ required: true, message: 'Code required' }]}>
                <Input placeholder="e.g. BTECH-CSE" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="name" label="Full Program Title" tooltip="Full official title">
            <Input placeholder="e.g. B.Tech Computer Science & Engineering" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="durationYears" label="Duration (Years)" initialValue={3} rules={[{ required: true }]}>
                <InputNumber min={1} max={6} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="defaultIntake" label="Default Sanctioned Intake" initialValue={60} rules={[{ required: true }]}>
                <InputNumber min={10} max={600} step={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isComputer" label="Computer Lab Fee" valuePropName="checked">
                <Switch checkedChildren="₹1,500" unCheckedChildren="None" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <Space>
              <Button onClick={() => setCreateCourseModal(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#002147' }}>
                Save Program
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ==========================================
          DRAWER: COLLEGE DETAILS & SANCTIONED SEATS
          ========================================== */}
      <Drawer
        title={selectedCollege ? `${selectedCollege.code} - ${selectedCollege.name}` : 'College Details'}
        placement="right"
        width={680}
        onClose={() => setCollegeDrawerOpen(false)}
        open={collegeDrawerOpen}
      >
        {selectedCollege && (
          <div>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="College Code">
                <Tag color="blue" style={{ fontWeight: 800 }}>{selectedCollege.code}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Institution Type">
                <Tag color="cyan">{selectedCollege.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="District">{selectedCollege.district}</Descriptions.Item>
              <Descriptions.Item label="Location">{selectedCollege.location}</Descriptions.Item>
              <Descriptions.Item label="Autonomous Status">
                {selectedCollege.isAutonomous ? <Tag color="purple">AUTONOMOUS</Tag> : <Tag>AFFILIATED</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Hostel Recognized">
                {selectedCollege.hasHostel ? <Tag color="gold">YES</Tag> : <Tag>NO</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Principal Name">{selectedCollege.principalName}</Descriptions.Item>
              <Descriptions.Item label="Principal Mobile">{selectedCollege.principalMobile}</Descriptions.Item>
              <Descriptions.Item label="Principal Email">{selectedCollege.principalEmail}</Descriptions.Item>
              <Descriptions.Item label="Principal Password Status">
                {selectedCollege.mustChangePassword !== false ? (
                  <Tag color="volcano">Temporary Password ({selectedCollege.tempPassword || `Aknu@${selectedCollege.code}`}) - Must Change</Tag>
                ) : (
                  <Tag color="green">Permanent Password Active</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Approved Streams">
                <Space wrap size={[4, 4]}>
                  {(() => {
                    const colStreams = selectedCollege.streams?.length
                      ? selectedCollege.streams
                      : selectedCollege.courseIntakes?.length
                        ? Array.from(new Set(selectedCollege.courseIntakes.map((ci: any) => ci.stream).filter(Boolean)))
                        : selectedCollege.courses?.length
                          ? Array.from(new Set(selectedCollege.courses.map((c: any) => c.stream || c.courseGroup || 'UG').filter(Boolean)))
                          : ['UG'];
                    const streamColors: Record<string, string> = {
                      UG: 'blue',
                      PG: 'green',
                      LAW: 'volcano',
                      EDUCATION: 'purple',
                    };
                    return colStreams.map((st: string) => (
                      <Tag key={st} color={streamColors[st] || 'geekblue'} style={{ fontWeight: 800 }}>
                        {st}
                      </Tag>
                    ));
                  })()}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Sanctioned Capacity">
                {(() => {
                  const intakes = selectedCollege.courseIntakes?.length
                    ? selectedCollege.courseIntakes
                    : selectedCollege.courses?.length
                      ? selectedCollege.courses
                      : [];
                  const total = intakes.reduce(
                    (s: number, c: any) => s + (c.sanctionedIntake || c.defaultIntake || 60),
                    0,
                  );
                  return (
                    <span style={{ fontWeight: 700, color: '#002147' }}>
                      <Tag color="purple" style={{ fontWeight: 800, fontSize: '13px' }}>{total} Total Seats</Tag>
                      across {intakes.length} Sanctioned Programs
                    </span>
                  );
                })()}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '16px 0 12px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Title level={5} style={{ margin: 0, color: '#002147' }}>
                <BranchesOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                Approved Course & Sanctioned Seat Matrix
              </Title>
              <Tag color="red" style={{ fontWeight: 700 }}>
                Strict Intake Cap Active
              </Tag>
            </div>

            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12, fontSize: '12px' }}
              message="Student Admission Intake Cap Policy"
              description="Admissions are strictly capped based on the approved sanctioned intake below. The student registration portal will automatically reject admissions once sanctioned seats are full."
            />

            {/* Sanctioned Seat Matrix Table */}
            <Table
              dataSource={
                selectedCollege.courseIntakes?.length
                  ? selectedCollege.courseIntakes
                  : selectedCollege.courses?.length
                    ? selectedCollege.courses.map((c: any) => ({
                      courseId: c.id,
                      courseCode: c.code,
                      courseName: c.name,
                      stream: c.stream || c.courseGroup || 'UG',
                      degreeType: c.degreeType || 'Degree',
                      branch: c.branch || c.name,
                      sanctionedIntake: c.sanctionedIntake || c.defaultIntake || 60,
                      convenorQuota: Math.round((c.sanctionedIntake || c.defaultIntake || 60) * 0.7),
                      managementQuota: Math.round((c.sanctionedIntake || c.defaultIntake || 60) * 0.3),
                    }))
                    : []
              }
              rowKey={(r: any) => r.courseId || r.courseCode || r.code || Math.random().toString()}
              pagination={false}
              size="small"
              bordered
              columns={[
                {
                  title: 'Stream',
                  dataIndex: 'stream',
                  key: 'stream',
                  width: 80,
                  render: (st: any) => <Tag color="blue">{st || 'UG'}</Tag>,
                },
                {
                  title: 'Degree',
                  dataIndex: 'degreeType',
                  key: 'degreeType',
                  width: 90,
                  render: (deg: any) => <Tag color="cyan" style={{ fontWeight: 700 }}>{deg || 'Degree'}</Tag>,
                },
                {
                  title: 'Branch / Program',
                  key: 'branch',
                  render: (_: any, r: any) => (
                    <div>
                      <div style={{ fontWeight: 600, color: '#002147' }}>
                        {r.branch || r.courseName || r.name}
                      </div>
                      <Tag style={{ fontSize: '10px' }}>{r.courseCode || r.code}</Tag>
                    </div>
                  ),
                },
                {
                  title: 'Sanctioned Intake',
                  dataIndex: 'sanctionedIntake',
                  key: 'sanctionedIntake',
                  width: 120,
                  align: 'right',
                  render: (seats: any) => (
                    <Tag color="purple" style={{ fontWeight: 800, fontSize: '12px' }}>
                      {seats || 60} Seats
                    </Tag>
                  ),
                },
                {
                  title: 'Convenor (70%)',
                  dataIndex: 'convenorQuota',
                  key: 'convenorQuota',
                  width: 105,
                  align: 'right',
                  render: (cq: any, r: any) => cq || Math.round((r.sanctionedIntake || 60) * 0.7),
                },
                {
                  title: 'Mgmt (30%)',
                  dataIndex: 'managementQuota',
                  key: 'managementQuota',
                  width: 95,
                  align: 'right',
                  render: (mq: any, r: any) => mq || Math.round((r.sanctionedIntake || 60) * 0.3),
                },
              ]}
            />

            <Divider style={{ margin: '16px 0 12px' }} />

            <Title level={5} style={{ margin: '0 0 8px' }}>Official Affiliation Demands (2026-27)</Title>
            {selectedCollege.demands?.length ? (
              <Table
                dataSource={selectedCollege.demands}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  { title: 'Demand #', dataIndex: 'demandNumber', key: 'demandNumber' },
                  { title: 'Section', dataIndex: 'courseGroup', key: 'courseGroup' },
                  {
                    title: 'Demanded',
                    dataIndex: 'totalDemandedINR',
                    key: 'totalDemandedINR',
                    render: (amt) => `₹${(amt || 0).toLocaleString()}`,
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status) => <Tag color={status === 'PAID' ? 'green' : 'orange'}>{status}</Tag>,
                  },
                ]}
              />
            ) : (
              <Alert type="info" message="No demands issued yet for academic year 2026-27." />
            )}
          </div>
        )}
      </Drawer>

      {/* ==========================================
          MODAL: EDIT COLLEGE & COURSE INTAKES
          ========================================== */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#1890ff' }} />
            <span>Edit Affiliated College & Sanctioned Courses ({editingCollege?.code})</span>
          </Space>
        }
        open={editCollegeModalOpen}
        onCancel={() => {
          setEditCollegeModalOpen(false);
          setEditingCollege(null);
        }}
        footer={null}
        width={780}
      >
        <Form form={editCollegeForm} layout="vertical" onFinish={handleUpdateCollege}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="code" label="College Code" rules={[{ required: true, message: 'Code required' }]}>
                <Input placeholder="e.g. 055" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="College Name" rules={[{ required: true, message: 'Name required' }]}>
                <Input placeholder="e.g. Aditya Degree College" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="type" label="Category" rules={[{ required: true, message: 'Category required' }]}>
                <CreatableSelect
                  placeholder="Select category..."
                  itemName="category"
                  options={modalCategoryOptions}
                  onAddOption={(newVal) => {
                    const formatted = newVal.toUpperCase();
                    const label = newVal.charAt(0).toUpperCase() + newVal.slice(1);
                    setModalCategoryOptions((prev) => [...prev, { label, value: formatted }]);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="district" label="District" rules={[{ required: true, message: 'District required' }]}>
                <CreatableSelect
                  placeholder="Select district..."
                  itemName="district"
                  options={modalDistrictOptions}
                  onAddOption={(newVal) => {
                    setModalDistrictOptions((prev) => [...prev, { label: newVal, value: newVal }]);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="location" label="Location" rules={[{ required: true, message: 'Location required' }]}>
                <CreatableSelect
                  placeholder="Select location..."
                  itemName="location"
                  options={modalLocationOptions}
                  onAddOption={(newVal) => {
                    const formatted = newVal.toUpperCase();
                    const label = newVal.charAt(0).toUpperCase() + newVal.slice(1);
                    setModalLocationOptions((prev) => [...prev, { label, value: formatted }]);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="principalName" label="Principal Name" rules={[{ required: true }]}>
                <Input placeholder="Dr. S. Kumar" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="principalMobile" label="Principal Mobile" rules={[{ required: true }]}>
                <Input placeholder="9440123456" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="principalEmail" label="Principal Email" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="principal@college.edu.in" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="isAutonomous" label="Autonomous Status" valuePropName="checked">
                <Switch checkedChildren="Autonomous" unCheckedChildren="Affiliated" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hasHostel" label="Hostel Recognized" valuePropName="checked">
                <Switch checkedChildren="Hostel Available" unCheckedChildren="No Hostel" />
              </Form.Item>
            </Col>
          </Row>

          {/* Dynamic Academic Hierarchy & Sanctioned Seat Mapper */}
          <div style={{ marginBottom: 16 }}>
            {renderCourseHierarchyMapper(
              editCollegeStreams,
              setEditCollegeStreams,
              editCollegeIntakes,
              setEditCollegeIntakes,
            )}
          </div>

          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <Space>
              <Button onClick={() => setEditCollegeModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#002147' }}>
                Save Changes
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ==========================================
          MODAL: EDIT COURSE (ORIGINAL TABLE)
          ========================================== */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#1890ff' }} />
            <span>Edit Academic Course ({editingCourse?.code})</span>
          </Space>
        }
        open={editCourseModalOpen}
        onCancel={() => {
          setEditCourseModalOpen(false);
          setEditingCourse(null);
        }}
        footer={null}
        width={600}
      >
        <Form form={editCourseForm} layout="vertical" onFinish={handleUpdateCourse}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="stream" label="Level 1: Academic Stream" rules={[{ required: true, message: 'Stream required' }]}>
                <CreatableSelect
                  placeholder="Select stream..."
                  itemName="stream"
                  options={allStreams.map((s) => ({ label: s, value: s }))}
                  onAddOption={(newVal) => {
                    const upper = newVal.toUpperCase();
                    if (!customStreams.includes(upper)) {
                      setCustomStreams((prev) => [...prev, upper]);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="degreeType" label="Level 2: Degree Program" rules={[{ required: true, message: 'Degree required' }]}>
                <CreatableSelect
                  placeholder="e.g. B.Tech, B.Sc, MBA..."
                  itemName="degree"
                  options={[
                    { label: 'B.Tech', value: 'B.Tech' },
                    { label: 'B.Sc', value: 'B.Sc' },
                    { label: 'B.Com', value: 'B.Com' },
                    { label: 'B.A', value: 'B.A' },
                    { label: 'MBA', value: 'MBA' },
                    { label: 'MCA', value: 'MCA' },
                    { label: 'M.Sc', value: 'M.Sc' },
                    { label: 'LL.B', value: 'LL.B' },
                    { label: 'LL.M', value: 'LL.M' },
                    { label: 'B.Ed', value: 'B.Ed' },
                    { label: 'M.Ed', value: 'M.Ed' },
                    { label: 'B.P.Ed', value: 'B.P.Ed' },
                  ]}
                  onAddOption={(newVal) => {
                    setCustomDegrees((prev) => ({
                      ...prev,
                      UG: [...(prev.UG || []), newVal],
                    }));
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="branch" label="Level 3: Branch / Specialization" rules={[{ required: true, message: 'Branch required' }]}>
                <Input placeholder="e.g. Computer Science & Engineering" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="Course Code" rules={[{ required: true, message: 'Code required' }]}>
                <Input placeholder="e.g. BTECH-CSE" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="name" label="Full Program Title" tooltip="Full official title">
            <Input placeholder="e.g. B.Tech Computer Science & Engineering" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="durationYears" label="Duration (Years)" rules={[{ required: true }]}>
                <InputNumber min={1} max={6} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="defaultIntake" label="Default Intake" rules={[{ required: true }]}>
                <InputNumber min={10} max={600} step={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isComputer" label="Computer Lab Fee" valuePropName="checked">
                <Switch checkedChildren="₹1,500" unCheckedChildren="None" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="active" label="Course Status" valuePropName="checked">
                <Switch checkedChildren="Active Course" unCheckedChildren="Inactive Course" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <Space>
              <Button onClick={() => setEditCourseModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#002147' }}>
                Save Changes
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ==========================================
          MODAL: ADD DYNAMIC STREAM (LEVEL 1)
          ========================================== */}
      <Modal
        title={
          <Space>
            <ApartmentOutlined style={{ color: '#002147' }} />
            <span>Add New Academic Stream (Level 1)</span>
          </Space>
        }
        open={addStreamModalOpen}
        onCancel={() => {
          setAddStreamModalOpen(false);
          setNewStreamInput('');
        }}
        onOk={handleAddNewStream}
        okText="Add Stream"
        okButtonProps={{ style: { background: '#002147' } }}
      >
        <div style={{ padding: '8px 0' }}>
          <Paragraph type="secondary" style={{ fontSize: '13px' }}>
            Add a new broad faculty or category (e.g. <code>PHARMACY</code>, <code>NURSING</code>, <code>ALLIED_HEALTH</code>).
          </Paragraph>
          <Input
            placeholder="Stream Code (e.g. PHARMACY)"
            value={newStreamInput}
            onChange={(e) => setNewStreamInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddNewStream();
            }}
          />
        </div>
      </Modal>

      {/* ==========================================
          MODAL: ADD DYNAMIC DEGREE (LEVEL 2)
          ========================================== */}
      <Modal
        title={
          <Space>
            <BranchesOutlined style={{ color: '#002147' }} />
            <span>Add New Degree Program (Level 2)</span>
          </Space>
        }
        open={addDegreeModalOpen}
        onCancel={() => {
          setAddDegreeModalOpen(false);
          setNewDegreeInput('');
        }}
        onOk={handleAddNewDegree}
        okText="Add Degree"
        okButtonProps={{ style: { background: '#002147' } }}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
              Select Stream (Level 1):
            </Text>
            <Select
              style={{ width: '100%' }}
              value={degreeStreamTarget}
              onChange={setDegreeStreamTarget}
              options={allStreams.map((s) => ({ label: `Stream: ${s}`, value: s }))}
            />
          </div>
          <div>
            <Text strong style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
              Degree Title (Level 2):
            </Text>
            <Input
              placeholder="e.g. B.Pharm, M.Pharm, B.Arch, M.Com"
              value={newDegreeInput}
              onChange={(e) => setNewDegreeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNewDegree();
              }}
            />
          </div>
        </div>
      </Modal>

      {/* ==========================================
          MODAL: EDIT PREVIEW ROW (BEFORE IMPORT)
          ========================================== */}
      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: '#1890ff' }} />
            <span>
              Edit Preview Row #{editingPreviewRow?._rowNum} (
              {editingPreviewType === 'COLLEGES' ? 'College Record' : 'Course Record'})
            </span>
          </Space>
        }
        open={previewEditModalOpen}
        onCancel={() => {
          setPreviewEditModalOpen(false);
          setEditingPreviewRow(null);
        }}
        footer={null}
        width={680}
      >
        <Form form={previewEditForm} layout="vertical" onFinish={handleSavePreviewRow}>
          {editingPreviewType === 'COLLEGES' ? (
            <>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="code" label="College Code" rules={[{ required: true, message: 'Code required' }]}>
                    <Input placeholder="e.g. 001" />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name="name" label="College Name" rules={[{ required: true, message: 'Name required' }]}>
                    <Input placeholder="e.g. Government Degree College" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="type" label="Category" rules={[{ required: true }]}>
                    <CreatableSelect
                      placeholder="Select category..."
                      itemName="category"
                      options={modalCategoryOptions}
                      onAddOption={(newVal) => {
                        const formatted = newVal.toUpperCase();
                        const label = newVal.charAt(0).toUpperCase() + newVal.slice(1);
                        setModalCategoryOptions((prev) => [...prev, { label, value: formatted }]);
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="district" label="District" rules={[{ required: true }]}>
                    <CreatableSelect
                      placeholder="Select district..."
                      itemName="district"
                      options={modalDistrictOptions}
                      onAddOption={(newVal) => {
                        setModalDistrictOptions((prev) => [...prev, { label: newVal, value: newVal }]);
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="location" label="Location" rules={[{ required: true }]}>
                    <CreatableSelect
                      placeholder="Select location..."
                      itemName="location"
                      options={modalLocationOptions}
                      onAddOption={(newVal) => {
                        const formatted = newVal.toUpperCase();
                        const label = newVal.charAt(0).toUpperCase() + newVal.slice(1);
                        setModalLocationOptions((prev) => [...prev, { label, value: formatted }]);
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name="principalName" label="Principal Name">
                    <Input placeholder="Dr. S. Kumar" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="principalMobile" label="Principal Mobile">
                    <Input placeholder="9440123456" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="principalEmail" label="Principal Email">
                    <Input placeholder="principal@college.edu.in" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="isAutonomous" label="Autonomous Status" valuePropName="checked">
                    <Switch checkedChildren="Autonomous" unCheckedChildren="Affiliated" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="hasHostel" label="Hostel Recognized" valuePropName="checked">
                    <Switch checkedChildren="Hostel Available" unCheckedChildren="No Hostel" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="courseIds"
                label="Sanctioned Programs / Courses"
                tooltip="Select all academic courses sanctioned for this college"
              >
                <Select
                  mode="multiple"
                  placeholder="Select programs..."
                  allowClear
                  optionFilterProp="label"
                  options={courses.map((c) => ({
                    label: `${c.name} (${c.code}) - ${c.courseGroup}`,
                    value: c.id,
                  }))}
                />
              </Form.Item>
            </>
          ) : (
            <>
              <Row gutter={12}>
                <Col span={10}>
                  <Form.Item name="code" label="Course Code" rules={[{ required: true, message: 'Code required' }]}>
                    <Input placeholder="e.g. B.Sc-DS" />
                  </Form.Item>
                </Col>
                <Col span={14}>
                  <Form.Item name="name" label="Program Title" rules={[{ required: true, message: 'Name required' }]}>
                    <Input placeholder="e.g. B.Sc Data Science & AI" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="courseGroup" label="Academic Group" rules={[{ required: true }]}>
                    <CreatableSelect
                      placeholder="Select group..."
                      itemName="group"
                      options={modalCourseGroupOptions}
                      onAddOption={(newVal) => {
                        setModalCourseGroupOptions((prev) => [...prev, { label: newVal, value: newVal }]);
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="durationYears" label="Duration" rules={[{ required: true }]}>
                    <InputNumber min={1} max={6} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="degreeLevel" label="Level" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { label: 'UG', value: 'UG' },
                        { label: 'PG', value: 'PG' },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="isComputer" label="Computer Lab Fee Applicable (₹1,500/seat)" valuePropName="checked">
                <Switch checkedChildren="Computer Course" unCheckedChildren="Standard Theory" />
              </Form.Item>
            </>
          )}

          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <Space>
              <Button onClick={() => setPreviewEditModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                Update Preview Row
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
