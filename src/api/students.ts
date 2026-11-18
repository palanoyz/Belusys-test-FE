import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

export interface Student {
  id: number
  studentCode: string
  prefixId: number
  firstName: string
  lastName: string
  genderId: number
  birthDate: string
  gradeLevelId: number
}

export interface StudentInput {
  studentCode: string
  prefixId: number
  firstName: string
  lastName: string
  genderId: number
  birthDate: string
  gradeLevelId: number
}

export interface StudentSearch {
  studentCode?: string
  firstName?: string
  lastName?: string
  gradeLevelId?: number
}

export interface StudentLookups {
  prefixes: Array<{ id: number; shortName: string; name: string; genderId: number }>
  genders: Array<{ id: number; name: string; nameEn: string }>
  gradeLevels: Array<{ id: number; code: string; name: string; fullName: string }>
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
    const response = await operation()
    return response.data
  } catch (error) {
    throw apiError(error)
  }
}

export const getStudents = (search: StudentSearch = {}) =>
  request(() => api.get<Student[]>('/students', { params: search }))

export const getStudentLookups = () =>
  request(() => api.get<StudentLookups>('/student-lookups'))

export const createStudent = (student: StudentInput) =>
  request(() => api.post<Student>('/students', student))

export const updateStudent = (id: number, student: StudentInput) =>
  request(() => api.patch<Student>(`/students/${id}`, student))

export const deleteStudent = (id: number) =>
  request(() => api.delete<void>(`/students/${id}`))
