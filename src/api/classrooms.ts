import axios from 'axios'
import type { Student } from './students'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

export interface Classroom {
  id: number
  roomNo: string
  roomName: string
  academicYear: number
  gradeLevelId: number
  homeroomTeacherId: number
}

export interface ClassroomInput {
  roomNo: string
  roomName: string
  academicYear: number
  gradeLevelId: number
  homeroomTeacherId: number
}

export interface ClassroomSearch {
  roomNo?: string
  roomName?: string
  homeroomTeacher?: string
}

export interface TeacherOption {
  id: number
  firstName: string
  lastName: string
  teacherCode: string
  prefix: string | null
}

function apiError(error: unknown): Error {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const detail = error.response?.data?.message
    if (Array.isArray(detail)) return new Error(detail.join(', '))
    if (detail) return new Error(detail)
    if (error.code === 'ECONNABORTED') return new Error('The server took too long to respond')
    if (!error.response) return new Error('Cannot reach the server. Check that the backend is running.')
  }
  return error instanceof Error ? error : new Error('An unexpected error occurred')
}

async function request<T>(operation: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await operation()).data
  } catch (error) {
    throw apiError(error)
  }
}

export const getClassrooms = (search: ClassroomSearch = {}) =>
  request(() => api.get<Classroom[]>('/classrooms', { params: search }))

export const getClassroomLookups = () =>
  request(() => api.get<TeacherOption[]>('/classroom-lookups'))

export const createClassroom = (input: ClassroomInput) =>
  request(() => api.post<Classroom>('/classrooms', input))

export const updateClassroom = (id: number, input: ClassroomInput) =>
  request(() => api.patch<Classroom>(`/classrooms/${id}`, input))

export const deleteClassroom = (id: number) =>
  request(() => api.delete<void>(`/classrooms/${id}`))

export const getClassroomStudents = (id: number) =>
  request(() => api.get<Student[]>(`/classrooms/${id}/students`))

export const enrollStudent = (classroomId: number, studentId: number) =>
  request(() =>
    api.post(`/classrooms/${classroomId}/students`, { studentId }),
  )

export const removeClassroomStudent = (classroomId: number, studentId: number) =>
  request(() => api.delete<void>(`/classrooms/${classroomId}/students/${studentId}`))

export const getAvailableStudents = () =>
  request(() => api.get<Student[]>('/students'))
