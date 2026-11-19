import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
} from '@ant-design/icons'
import type { Classroom, ClassroomInput, ClassroomSearch, TeacherOption } from '../api/classrooms'
import {
  createClassroom,
  deleteClassroom,
  enrollStudent,
  getAvailableStudents,
  getClassroomLookups,
  getClassrooms,
  getClassroomStudents,
  removeClassroomStudent,
  updateClassroom,
} from '../api/classrooms'
import type { Student, StudentLookups } from '../api/students'

interface ClassroomsPageProps {
  gradeLevels: StudentLookups['gradeLevels']
}

function ClassroomsPage({ gradeLevels }: ClassroomsPageProps) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [roster, setRoster] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<ClassroomSearch>({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null)
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const [form] = Form.useForm<ClassroomInput>()
  const [searchForm] = Form.useForm<ClassroomSearch>()
  const [messageApi, messageContext] = message.useMessage()

  const refreshClassrooms = async (search: ClassroomSearch = filters) => {
    setLoading(true)
    setError('')
    try {
      setClassrooms(await getClassrooms(search))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load classrooms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([getClassroomLookups(), getClassrooms({}), getAvailableStudents()])
      .then(([teacherOptions, roomList, studentList]) => {
        if (!active) return
        setTeachers(teacherOptions)
        setClassrooms(roomList)
        setStudents(studentList)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load classroom data')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const gradeNames = useMemo(
    () => new Map(gradeLevels.map((grade) => [grade.id, grade.name])),
    [gradeLevels],
  )
  const teacherNames = useMemo(
    () =>
      new Map(
        teachers.map((teacher) => [
          teacher.id,
          `${teacher.prefix ? `${teacher.prefix} ` : ''}${teacher.firstName} ${teacher.lastName}`,
        ]),
      ),
    [teachers],
  )

  const openCreate = () => {
    setEditingClassroom(null)
    form.resetFields()
    form.setFieldValue('academicYear', 2569)
    setFormOpen(true)
  }

  const openEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom)
    form.setFieldsValue({
      roomNo: classroom.roomNo,
      roomName: classroom.roomName,
      academicYear: classroom.academicYear,
      gradeLevelId: classroom.gradeLevelId,
      homeroomTeacherId: classroom.homeroomTeacherId,
    })
    setFormOpen(true)
  }

  const saveClassroom = async (values: ClassroomInput) => {
    setSaving(true)
    try {
      if (editingClassroom) {
        await updateClassroom(editingClassroom.id, values)
        messageApi.success('Classroom updated')
      } else {
        await createClassroom(values)
        messageApi.success('Classroom added')
      }
      setFormOpen(false)
      await refreshClassrooms()
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : 'Unable to save classroom')
    } finally {
      setSaving(false)
    }
  }

  const showRoster = async (classroom: Classroom) => {
    setActiveClassroom(classroom)
    setLoading(true)
    try {
      setRoster(await getClassroomStudents(classroom.id))
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : 'Unable to load classroom roster')
    } finally {
      setLoading(false)
    }
  }

  const addStudent = async (studentId: number) => {
    if (!activeClassroom) return
    try {
      await enrollStudent(activeClassroom.id, studentId)
      setRoster(await getClassroomStudents(activeClassroom.id))
      messageApi.success('Student enrolled')
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : 'Unable to enroll student')
    }
  }

  const dropStudent = async (student: Student) => {
    if (!activeClassroom) return
    try {
      await removeClassroomStudent(activeClassroom.id, student.id)
      setRoster(await getClassroomStudents(activeClassroom.id))
      messageApi.success('Student removed from classroom')
    } catch (cause) {
      messageApi.error(cause instanceof Error ? cause.message : 'Unable to remove student')
    }
  }

  const removeClassroom = (classroom: Classroom) => {
    Modal.confirm({
      title: 'Delete this classroom?',
      content: `${classroom.roomName} will be removed from active classrooms.`,
      okText: 'Delete classroom',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteClassroom(classroom.id)
          messageApi.success('Classroom deleted')
          await refreshClassrooms()
        } catch (cause) {
          messageApi.error(cause instanceof Error ? cause.message : 'Unable to delete classroom')
        }
      },
    })
  }

  const columns: TableColumnsType<Classroom> = [
    {
      title: 'Classroom',
      key: 'name',
      render: (_, classroom) => (
        <div className="student-name">
          <Typography.Text strong>{classroom.roomName}</Typography.Text>
          <Typography.Text type="secondary">Room {classroom.roomNo} · {classroom.academicYear}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'Grade',
      dataIndex: 'gradeLevelId',
      render: (id: number) => <Tag className="grade-tag">{gradeNames.get(id) ?? `Grade ${id}`}</Tag>,
    },
    {
      title: 'Homeroom teacher',
      dataIndex: 'homeroomTeacherId',
      render: (id: number) => teacherNames.get(id) ?? '—',
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, classroom) => (
        <Space size={4}>
          <Button aria-label={`View ${classroom.roomName}`} type="text" icon={<EyeOutlined />} onClick={() => void showRoster(classroom)} />
          <Button aria-label={`Edit ${classroom.roomName}`} type="text" icon={<EditOutlined />} onClick={() => openEdit(classroom)} />
          <Button aria-label={`Delete ${classroom.roomName}`} type="text" danger icon={<DeleteOutlined />} onClick={() => removeClassroom(classroom)} />
        </Space>
      ),
    },
  ]

  if (activeClassroom && !assignmentOpen) {
    return (
      <>
        {messageContext}
        <div className="page-heading">
          <div>
            <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => setActiveClassroom(null)}>All classrooms</Button>
            <Typography.Title level={1}>{activeClassroom.roomName}</Typography.Title>
            <Typography.Paragraph className="page-description">
              Room {activeClassroom.roomNo} · {gradeNames.get(activeClassroom.gradeLevelId)} · Academic year {activeClassroom.academicYear}
            </Typography.Paragraph>
          </div>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setAssignmentOpen(true)}>Manage students</Button>
        </div>
        <Card className="directory-card" variant="borderless">
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="Room number">{activeClassroom.roomNo}</Descriptions.Item>
            <Descriptions.Item label="Classroom name">{activeClassroom.roomName}</Descriptions.Item>
            <Descriptions.Item label="Grade level">{gradeNames.get(activeClassroom.gradeLevelId)}</Descriptions.Item>
            <Descriptions.Item label="Academic year">{activeClassroom.academicYear}</Descriptions.Item>
            <Descriptions.Item label="Homeroom teacher">{teacherNames.get(activeClassroom.homeroomTeacherId)}</Descriptions.Item>
          </Descriptions>
          <Typography.Title level={4} style={{ marginTop: 24 }}>Enrolled students ({roster.length})</Typography.Title>
          {roster.length ? roster.map((student) => (
            <div className="roster-row" key={student.id}>
              <Space>
                <Avatar className="student-avatar">{student.firstName[0]}</Avatar>
                <span>{student.firstName} {student.lastName}</span>
                <Typography.Text type="secondary">ID {student.studentCode}</Typography.Text>
              </Space>
            </div>
          )) : <Empty description="No enrolled students" />}
        </Card>
      </>
    )
  }

  if (activeClassroom && assignmentOpen) {
    const enrolledIds = new Set(roster.map((student) => student.id))
    const availableStudents = students.filter((student) => !enrolledIds.has(student.id))
    return (
      <>
        {messageContext}
        <div className="page-heading">
          <div>
            <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => setAssignmentOpen(false)}>Classroom details</Button>
            <Typography.Title level={1}>Manage students</Typography.Title>
            <Typography.Paragraph className="page-description">
              {activeClassroom.roomName} · Academic year {activeClassroom.academicYear}
            </Typography.Paragraph>
          </div>
          <Select
            className="enroll-select"
            showSearch
            optionFilterProp="label"
            placeholder="Select a student to enroll"
            value={undefined}
            options={availableStudents.map((student) => ({
              value: student.id,
              label: `${student.studentCode} · ${student.firstName} ${student.lastName}`,
            }))}
            onChange={(studentId: number) => void addStudent(studentId)}
          />
        </div>
        <Card className="directory-card" variant="borderless">
          {error && <Alert type="error" showIcon message={error} />}
          <div className="directory-header">
            <div>
              <Typography.Title level={3}>Enrolled students</Typography.Title>
              <Typography.Text type="secondary">{roster.length} students in this classroom</Typography.Text>
            </div>
            <Button icon={<ReloadOutlined />} onClick={() => void showRoster(activeClassroom)}>Refresh</Button>
          </div>
          {roster.length ? roster.map((student) => (
            <div className="roster-row" key={student.id}>
              <Space>
                <Avatar className="student-avatar">{student.firstName[0]}</Avatar>
                <div className="student-name">
                  <Typography.Text strong>{student.firstName} {student.lastName}</Typography.Text>
                  <Typography.Text type="secondary">ID {student.studentCode}</Typography.Text>
                </div>
              </Space>
              <Button danger type="text" icon={<UserDeleteOutlined />} onClick={() => void dropStudent(student)}>Remove</Button>
            </div>
          )) : <Empty description="No students enrolled yet" />}
        </Card>
      </>
    )
  }

  return (
    <>
      {messageContext}
      <div className="page-heading">
        <div>
          <Typography.Text className="eyebrow">LEARNING SPACES</Typography.Text>
          <Typography.Title level={1}>Classrooms</Typography.Title>
          <Typography.Paragraph className="page-description">
            Manage classrooms, homeroom teachers, and student assignments.
          </Typography.Paragraph>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openCreate}>Add classroom</Button>
      </div>
      <Row gutter={[16, 16]} className="summary-row">
        <Col xs={24} sm={12}>
          <Card className="summary-card" variant="borderless">
            <span className="summary-label">ACTIVE CLASSROOMS</span>
            <Typography.Title level={2}>{classrooms.length}</Typography.Title>
            <span className="summary-footnote">Matching current filters</span>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className="summary-card" variant="borderless">
            <span className="summary-label">HOMEROOM TEACHERS</span>
            <Typography.Title level={2}>{teachers.length}</Typography.Title>
            <span className="summary-footnote">Available for assignment</span>
          </Card>
        </Col>
      </Row>
      <Card className="directory-card" variant="borderless">
        <div className="directory-header">
          <div>
            <Typography.Title level={3}>Classroom directory</Typography.Title>
            <Typography.Text type="secondary">Search and manage classrooms</Typography.Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => void refreshClassrooms()}>Refresh</Button>
        </div>
        <Form
          form={searchForm}
          className="search-form"
          layout="vertical"
          onFinish={(values) => {
            const next = Object.fromEntries(
              Object.entries(values).filter(([, value]) => value !== undefined && value !== ''),
            ) as ClassroomSearch
            setFilters(next)
            setPagination((current) => ({ ...current, current: 1 }))
            void refreshClassrooms(next)
          }}
        >
          <Row gutter={[12, 0]} align="bottom">
            <Col xs={24} md={8}>
              <Form.Item label="Room number" name="roomNo"><Input allowClear placeholder="Search room number" /></Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Classroom name" name="roomName"><Input allowClear placeholder="Search classroom name" /></Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Homeroom teacher" name="homeroomTeacher"><Input allowClear placeholder="Search teacher name" /></Form.Item>
            </Col>
            <Col span={24} className="search-actions">
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>Search</Button>
                <Button onClick={() => { searchForm.resetFields(); setFilters({}); setPagination((current) => ({ ...current, current: 1 })); void refreshClassrooms({}) }}>Clear filters</Button>
              </Space>
            </Col>
          </Row>
        </Form>
        {error && <Alert className="load-error" type="error" showIcon message={error} />}
        <Table<Classroom>
          rowKey="id"
          columns={columns}
          dataSource={classrooms}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: { showSearch: false },
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => `${total} classrooms`,
            onChange: (current, pageSize) => setPagination({ current, pageSize }),
          }}
          scroll={{ x: 700 }}
          onRow={(classroom) => ({ onDoubleClick: () => void showRoster(classroom) })}
        />
      </Card>
      <Modal
        title={editingClassroom ? 'Edit classroom' : 'Add classroom'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={() => form.submit()}
        okText={editingClassroom ? 'Save changes' : 'Add classroom'}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={(values) => void saveClassroom(values)}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Room number" name="roomNo" rules={[{ required: true }, { max: 20 }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Classroom name" name="roomName" rules={[{ required: true }, { max: 100 }]}><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Academic year" name="academicYear" rules={[{ required: true, type: 'number', min: 1, max: 9999 }]}><InputNumber className="full-width" min={1} max={9999} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Grade level" name="gradeLevelId" rules={[{ required: true }]}>
                <Select options={gradeLevels.map((grade) => ({ value: grade.id, label: grade.name }))} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Homeroom teacher" name="homeroomTeacherId" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={teachers.map((teacher) => ({
                    value: teacher.id,
                    label: `${teacher.prefix ? `${teacher.prefix} ` : ''}${teacher.firstName} ${teacher.lastName} · ${teacher.teacherCode}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  )
}

export default ClassroomsPage
