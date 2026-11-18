import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  Layout,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import {
  createStudent,
  deleteStudent,
  getStudentLookups,
  getStudents,
  updateStudent,
} from './api/students'
import type {
  Student,
  StudentInput,
  StudentLookups,
  StudentSearch,
} from './api/students'
import ClassroomsPage from './pages/ClassroomsPage'
import './App.css'

type StudentFormValues = Omit<StudentInput, 'birthDate'> & {
  birthDate: Dayjs
}

const emptyLookups: StudentLookups = {
  prefixes: [],
  genders: [],
  gradeLevels: [],
}

function App() {
  const [students, setStudents] = useState<Student[]>([])
  const [lookups, setLookups] = useState<StudentLookups>(emptyLookups)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filters, setFilters] = useState<StudentSearch>({})
  const [activePage, setActivePage] = useState<'students' | 'classrooms'>('students')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [searchForm] = Form.useForm<StudentSearch>()
  const [studentForm] = Form.useForm<StudentFormValues>()
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [messageApi, messageContext] = message.useMessage()

  const refreshStudents = async (search: StudentSearch = filters) => {
    setLoading(true)
    setLoadError('')
    try {
      const result = await getStudents(search)
      setStudents(result)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([getStudentLookups(), getStudents({})])
      .then(([studentLookups, result]) => {
        if (!active) return
        setLookups(studentLookups)
        setStudents(result)
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : 'Unable to load student data')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const lookupMaps = useMemo(
    () => ({
      prefixes: new Map(lookups.prefixes.map((item) => [item.id, item.shortName])),
      genders: new Map(lookups.genders.map((item) => [item.id, item.name])),
      grades: new Map(lookups.gradeLevels.map((item) => [item.id, item.name])),
    }),
    [lookups],
  )

  const openCreateForm = () => {
    setEditingStudent(null)
    studentForm.resetFields()
    setFormOpen(true)
  }

  const openEditForm = (student: Student) => {
    setEditingStudent(student)
    studentForm.setFieldsValue({
      studentCode: student.studentCode,
      prefixId: student.prefixId,
      firstName: student.firstName,
      lastName: student.lastName,
      genderId: student.genderId,
      birthDate: dayjs(student.birthDate),
      gradeLevelId: student.gradeLevelId,
    })
    setFormOpen(true)
  }

  const saveStudent = async (values: StudentFormValues) => {
    const input: StudentInput = {
      ...values,
      birthDate: values.birthDate.format('YYYY-MM-DD'),
    }
    setSaving(true)
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, input)
        messageApi.success('Student updated')
      } else {
        await createStudent(input)
        messageApi.success('Student added')
      }
      setFormOpen(false)
      await refreshStudents()
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'Unable to save student')
    } finally {
      setSaving(false)
    }
  }

  const removeStudent = (student: Student) => {
    Modal.confirm({
      title: 'Delete this student?',
      content: `${student.firstName} ${student.lastName} will be removed from active student records.`,
      okText: 'Delete student',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteStudent(student.id)
          messageApi.success('Student deleted')
          await refreshStudents()
        } catch (error) {
          messageApi.error(error instanceof Error ? error.message : 'Unable to delete student')
        }
      },
    })
  }

  const columns: TableColumnsType<Student> = [
    {
      title: 'Student',
      key: 'name',
      render: (_, student) => (
        <Space size={12}>
          <Avatar className="student-avatar" icon={<UserOutlined />} />
          <div className="student-name">
            <Typography.Text strong>
              {lookupMaps.prefixes.get(student.prefixId)} {student.firstName} {student.lastName}
            </Typography.Text>
            <Typography.Text type="secondary">ID {student.studentCode}</Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Grade',
      dataIndex: 'gradeLevelId',
      render: (id: number) => <Tag className="grade-tag">{lookupMaps.grades.get(id) ?? `Grade ${id}`}</Tag>,
    },
    {
      title: 'Gender',
      dataIndex: 'genderId',
      render: (id: number) => lookupMaps.genders.get(id) ?? '—',
    },
    {
      title: 'Date of birth',
      dataIndex: 'birthDate',
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, student) => (
        <Space size={4}>
          <Button aria-label={`View ${student.firstName}`} type="text" icon={<EyeOutlined />} onClick={() => setViewingStudent(student)} />
          <Button aria-label={`Edit ${student.firstName}`} type="text" icon={<EditOutlined />} onClick={() => openEditForm(student)} />
          <Button aria-label={`Delete ${student.firstName}`} type="text" danger icon={<DeleteOutlined />} onClick={() => removeStudent(student)} />
        </Space>
      ),
    },
  ]

  return (
    <Layout className="app-shell">
      {messageContext}
      <Layout.Sider className="sidebar" width={248} breakpoint="lg" collapsedWidth="0">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <Typography.Text className="brand-name">Belusys</Typography.Text>
            <Typography.Text className="brand-caption">SCHOOL ADMIN</Typography.Text>
          </div>
        </div>
        <Typography.Text className="nav-heading">WORKSPACE</Typography.Text>
        <button
          type="button"
          className={`nav-item nav-button ${activePage === 'students' ? 'nav-item-active' : ''}`}
          onClick={() => setActivePage('students')}
        >
          <UserOutlined />
          <span>Students</span>
          <span className="nav-count">{students.length}</span>
        </button>
        <button
          type="button"
          className={`nav-item nav-button ${activePage === 'classrooms' ? 'nav-item-active' : ''}`}
          onClick={() => setActivePage('classrooms')}
        >
          <TeamOutlined />
          <span>Classrooms</span>
        </button>
        <div className="sidebar-note">
          <span className="online-indicator" />
          <span>Student records</span>
          <span className="sidebar-note-subtitle">Connected to school database</span>
        </div>
      </Layout.Sider>

      <Layout className="main-layout">
        <Layout.Header className="topbar">
          <Typography.Text className="breadcrumb">Workspace <span>/</span> {activePage === 'students' ? 'Students' : 'Classrooms'}</Typography.Text>
          <Space size={12}>
            <Tag className="academic-tag">Academic year 2569</Tag>
            <Avatar className="profile-avatar">AD</Avatar>
          </Space>
        </Layout.Header>

        <Layout.Content className="page-content">
          {activePage === 'students' ? (
            <>
          <div className="page-heading">
            <div>
              <Typography.Text className="eyebrow">PEOPLE DIRECTORY</Typography.Text>
              <Typography.Title level={1}>Students</Typography.Title>
              <Typography.Paragraph className="page-description">
                Manage student profiles, enrollment details, and records.
              </Typography.Paragraph>
            </div>
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openCreateForm}>
              Add student
            </Button>
          </div>

          <Row gutter={[16, 16]} className="summary-row">
            <Col xs={24} sm={12} xl={8}>
              <Card className="summary-card" variant="borderless">
                <span className="summary-label">ACTIVE STUDENTS</span>
                <Typography.Title level={2}>{students.length}</Typography.Title>
                <span className="summary-footnote">Matching current filters</span>
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={8}>
              <Card className="summary-card summary-card-muted" variant="borderless">
                <span className="summary-label">GRADE LEVELS</span>
                <Typography.Title level={2}>{lookups.gradeLevels.length}</Typography.Title>
                <span className="summary-footnote">Available in this school</span>
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={8}>
              <Card className="summary-card summary-card-muted summary-card-extra" variant="borderless">
                <span className="summary-label">DIRECTORY STATUS</span>
                <Typography.Title level={2} className="status-title"><span className="online-indicator" />Connected</Typography.Title>
                <span className="summary-footnote">Changes save to the school database</span>
              </Card>
            </Col>
          </Row>

          <Card className="directory-card" variant="borderless">
            <div className="directory-header">
              <div>
                <Typography.Title level={3}>Student directory</Typography.Title>
                <Typography.Text type="secondary">Search and manage student profiles</Typography.Text>
              </div>
              <Button icon={<ReloadOutlined />} onClick={() => void refreshStudents()}>Refresh</Button>
            </div>
            <Form
              className="search-form"
              form={searchForm}
              layout="vertical"
              onFinish={(values) => {
                const nextFilters = Object.fromEntries(
                  Object.entries(values).filter(([, value]) => value !== undefined && value !== ''),
                ) as StudentSearch
                setFilters(nextFilters)
                setPagination((current) => ({ ...current, current: 1 }))
                void refreshStudents(nextFilters)
              }}
            >
              <Row gutter={[12, 0]} align="bottom">
                <Col xs={24} md={8}>
                  <Form.Item label="Student ID" name="studentCode">
                    <Input allowClear placeholder="e.g. 10025" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="First name" name="firstName">
                    <Input allowClear placeholder="Search first name" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Last name" name="lastName">
                    <Input allowClear placeholder="Search last name" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Grade level" name="gradeLevelId">
                    <Select allowClear placeholder="All grade levels" options={lookups.gradeLevels.map((grade) => ({ value: grade.id, label: grade.name }))} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16} className="search-actions">
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>Search</Button>
                    <Button onClick={() => { searchForm.resetFields(); setFilters({}); setPagination((current) => ({ ...current, current: 1 })); void refreshStudents({}) }}>Clear filters</Button>
                  </Space>
                </Col>
              </Row>
            </Form>

            {loadError && <Alert className="load-error" type="error" showIcon message={loadError} />}
            <Table<Student>
              rowKey="id"
              columns={columns}
              dataSource={students}
              loading={loading}
              pagination={{
                ...pagination,
                showSizeChanger: { showSearch: false },
                pageSizeOptions: [10, 20, 50],
                showTotal: (total) => `${total} students`,
                onChange: (current, pageSize) => setPagination({ current, pageSize }),
              }}
              locale={{ emptyText: loading ? <Spin /> : <Empty description="No students found" /> }}
              scroll={{ x: 700 }}
            />
          </Card>
            </>
          ) : (
            <ClassroomsPage gradeLevels={lookups.gradeLevels} />
          )}
        </Layout.Content>
      </Layout>

      <Modal
        title={editingStudent ? 'Edit student' : 'Add student'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={() => studentForm.submit()}
        okText={editingStudent ? 'Save changes' : 'Add student'}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form<StudentFormValues> form={studentForm} layout="vertical" onFinish={(values) => void saveStudent(values)}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Student ID" name="studentCode" rules={[{ required: true }, { max: 20 }]}>
                <Input placeholder="Registration number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Prefix" name="prefixId" rules={[{ required: true }]}>
                <Select options={lookups.prefixes.map((item) => ({ value: item.id, label: item.shortName }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="First name" name="firstName" rules={[{ required: true }, { max: 100 }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Last name" name="lastName" rules={[{ required: true }, { max: 100 }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Gender" name="genderId" rules={[{ required: true }]}>
                <Select options={lookups.genders.map((item) => ({ value: item.id, label: item.name }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Grade level" name="gradeLevelId" rules={[{ required: true }]}>
                <Select options={lookups.gradeLevels.map((item) => ({ value: item.id, label: item.name }))} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Date of birth" name="birthDate" rules={[{ required: true }]}>
                <DatePicker className="full-width" format="DD-MM-YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Student profile"
        open={viewingStudent !== null}
        onCancel={() => setViewingStudent(null)}
        footer={<Button onClick={() => setViewingStudent(null)}>Close</Button>}
      >
        {viewingStudent && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Student ID">{viewingStudent.studentCode}</Descriptions.Item>
            <Descriptions.Item label="Name">
              {lookupMaps.prefixes.get(viewingStudent.prefixId)} {viewingStudent.firstName} {viewingStudent.lastName}
            </Descriptions.Item>
            <Descriptions.Item label="Gender">{lookupMaps.genders.get(viewingStudent.genderId) ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Date of birth">{dayjs(viewingStudent.birthDate).format('DD MMM YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Grade level">{lookupMaps.grades.get(viewingStudent.gradeLevelId) ?? '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Layout>
  )
}

export default App
