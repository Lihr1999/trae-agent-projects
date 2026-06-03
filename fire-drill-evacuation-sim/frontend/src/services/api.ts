import axios from 'axios'
import type {
  Token,
  User,
  Building,
  Floor,
  Exit,
  Road,
  PeopleGroup,
  FireIncident,
  RescueVehicle,
  DispatchTask,
  EventLog,
  DrillReport,
  FireSpreadResult,
  EvacuationRoute,
  ApiResponse
} from '@/types'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login(username: string, password: string) {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)
    return api.post<Token>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  },
  register(username: string, password: string) {
    return api.post<User>('/auth/register', { username, password })
  }
}

export const buildingApi = {
  getAll() {
    return api.get<Building[]>('/buildings')
  },
  getById(id: number) {
    return api.get<Building>(`/buildings/${id}`)
  },
  create(data: Partial<Building>) {
    return api.post<Building>('/buildings', data)
  },
  update(id: number, data: Partial<Building>) {
    return api.put<Building>(`/buildings/${id}`, data)
  },
  delete(id: number) {
    return api.delete(`/buildings/${id}`)
  },
  getRiskAssessment(id: number) {
    return api.get<ApiResponse>(`/buildings/${id}/risk-assessment`)
  }
}

export const floorApi = {
  getAll() {
    return api.get<Floor[]>('/floors')
  },
  getByBuilding(buildingId: number) {
    return api.get<Floor[]>(`/buildings/${buildingId}/floors`)
  },
  create(data: Partial<Floor>) {
    return api.post<Floor>('/floors', data)
  },
  update(id: number, data: Partial<Floor>) {
    return api.put<Floor>(`/floors/${id}`, data)
  },
  delete(id: number) {
    return api.delete(`/floors/${id}`)
  }
}

export const exitApi = {
  getAll() {
    return api.get<Exit[]>('/exits')
  },
  create(data: Partial<Exit>) {
    return api.post<Exit>('/exits', data)
  },
  update(id: number, data: Partial<Exit>) {
    return api.put<Exit>(`/exits/${id}`, data)
  },
  delete(id: number) {
    return api.delete(`/exits/${id}`)
  },
  block(id: number) {
    return api.put<Exit>(`/exits/${id}/block`)
  },
  unblock(id: number) {
    return api.put<Exit>(`/exits/${id}/unblock`)
  },
  updateStatus(id: number, status: Exit['status']) {
    return api.put<Exit>(`/exits/${id}/status`, { status })
  }
}

export const roadApi = {
  getAll() {
    return api.get<Road[]>('/roads')
  },
  create(data: Partial<Road>) {
    return api.post<Road>('/roads', data)
  },
  update(id: number, data: Partial<Road>) {
    return api.put<Road>(`/roads/${id}`, data)
  },
  delete(id: number) {
    return api.delete(`/roads/${id}`)
  },
  updateStatus(id: number, status: Road['status']) {
    return api.put<Road>(`/roads/${id}/status`, { status })
  }
}

export const peopleApi = {
  getAll() {
    return api.get<PeopleGroup[]>('/people')
  },
  create(data: Partial<PeopleGroup>) {
    return api.post<PeopleGroup>('/people', data)
  },
  update(id: number, data: Partial<PeopleGroup>) {
    return api.put<PeopleGroup>(`/people/${id}`, data)
  },
  delete(id: number) {
    return api.delete(`/people/${id}`)
  },
  evacuate(buildingId: number) {
    return api.post<ApiResponse>(`/people/evacuate/${buildingId}`)
  }
}

export const fireApi = {
  getAll() {
    return api.get<FireIncident[]>('/fires')
  },
  getById(id: number) {
    return api.get<FireIncident>(`/fires/${id}`)
  },
  create(data: Partial<FireIncident>) {
    return api.post<FireIncident>('/fires', data)
  },
  update(id: number, data: Partial<FireIncident>) {
    return api.put<FireIncident>(`/fires/${id}`, data)
  },
  delete(id: number) {
    return api.delete(`/fires/${id}`)
  },
  calculateSpread(id: number, params: { elapsed_minutes: number; weather_condition?: string }) {
    return api.post<FireSpreadResult>(`/fires/${id}/calculate-spread`, params)
  },
  contain(id: number) {
    return api.put<FireIncident>(`/fires/${id}/contain`)
  },
  extinguish(id: number) {
    return api.put<FireIncident>(`/fires/${id}/extinguish`)
  }
}

export const vehicleApi = {
  getAll() {
    return api.get<RescueVehicle[]>('/vehicles')
  },
  getAvailable() {
    return api.get<RescueVehicle[]>('/vehicles/available')
  },
  create(data: Partial<RescueVehicle>) {
    return api.post<RescueVehicle>('/vehicles', data)
  },
  update(id: number, data: Partial<RescueVehicle>) {
    return api.put<RescueVehicle>(`/vehicles/${id}`, data)
  },
  delete(id: number) {
    return api.delete(`/vehicles/${id}`)
  },
  dispatch(id: number, data: { target_x: number; target_y: number; target_z: number; task_type: string }) {
    return api.post<DispatchTask>(`/vehicles/${id}/dispatch`, data)
  }
}

export const dispatchApi = {
  autoDispatch(fireId: number) {
    return api.post<ApiResponse>(`/dispatch/auto/${fireId}`)
  },
  manualDispatch(data: { vehicle_id: number; task_type: string; target_x: number; target_y: number; target_z: number }) {
    return api.post<DispatchTask>('/dispatch/manual', data)
  },
  getTasks() {
    return api.get<DispatchTask[]>('/dispatch/tasks')
  },
  getVehicleRoute(vehicleId: number) {
    return api.get<ApiResponse>(`/dispatch/vehicle-route/${vehicleId}`)
  }
}

export const eventApi = {
  getAll(params?: { event_type?: string; skip?: number; limit?: number }) {
    return api.get<EventLog[]>('/events', { params })
  },
  create(data: Partial<EventLog>) {
    return api.post<EventLog>('/events', data)
  },
  update(id: number, data: Partial<EventLog>) {
    return api.put<EventLog>(`/events/${id}`, data)
  },
  getTimeline() {
    return api.get<EventLog[]>('/events/timeline')
  }
}

export const reportApi = {
  getAll() {
    return api.get<DrillReport[]>('/reports')
  },
  generate(data: Partial<DrillReport>) {
    return api.post<DrillReport>('/reports/generate', data)
  },
  getById(id: number) {
    return api.get<DrillReport>(`/reports/${id}`)
  },
  exportPdf(id: number) {
    return api.get(`/reports/${id}/export/pdf`, { responseType: 'blob' })
  },
  exportExcel(id: number) {
    return api.get(`/reports/${id}/export/excel`, { responseType: 'blob' })
  }
}

export const drillApi = {
  start() {
    return api.post<ApiResponse>('/drill/start')
  },
  end() {
    return api.post<ApiResponse>('/drill/end')
  },
  reset(data?: Record<string, any>) {
    return api.post<ApiResponse>('/drill/reset', data)
  },
  getStatus() {
    return api.get<ApiResponse>('/drill/status')
  }
}

export const evacuationApi = {
  calculateRoutes(buildingId: number, fireId: number) {
    return api.post<EvacuationRoute[]>(`/evacuation/calculate-routes`, { building_id: buildingId, fire_id: fireId })
  },
  updateRouteOnExitBlocked(exitId: number) {
    return api.post<EvacuationRoute[]>(`/evacuation/update-route/exit-blocked/${exitId}`)
  }
}

export default api
