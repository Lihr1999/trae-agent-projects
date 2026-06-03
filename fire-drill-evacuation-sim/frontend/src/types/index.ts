export interface Token {
  access_token: string
  token_type: string
}

export interface User {
  id: number
  username: string
  is_active: boolean
  created_at: string
}

export interface Building {
  id: number
  name: string
  position_x: number
  position_y: number
  position_z: number
  size_x: number
  size_y: number
  size_z: number
  building_type: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  status: 'normal' | 'fire' | 'evacuating' | 'damaged'
  created_at: string
}

export interface Floor {
  id: number
  building_id: number
  floor_number: number
  area: number
  max_capacity: number
  current_people: number
  created_at: string
}

export interface Exit {
  id: number
  building_id: number
  floor_id: number
  position_x: number
  position_y: number
  position_z: number
  width: number
  status: 'normal' | 'congested' | 'blocked'
  created_at: string
}

export interface Road {
  id: number
  start_x: number
  start_y: number
  start_z: number
  end_x: number
  end_y: number
  end_z: number
  width: number
  status: 'clear' | 'blocked'
  connected_buildings: number[]
  created_at: string
}

export interface PeopleGroup {
  id: number
  name: string
  count: number
  position_x: number
  position_y: number
  position_z: number
  move_speed: number
  evacuation_priority: number
  status: 'stationary' | 'evacuating' | 'evacuated'
  target_exit_id: number | null
  created_at: string
}

export interface FireIncident {
  id: number
  position_x: number
  position_y: number
  position_z: number
  start_time: string
  fire_level: number
  spread_speed: number
  affected_radius: number
  status: 'active' | 'contained' | 'extinguished'
  weather_condition: 'clear' | 'windy' | 'rainy' | 'snowy'
  created_at: string
}

export interface RescueVehicle {
  id: number
  vehicle_type: 'fire_truck' | 'ambulance' | 'command_car'
  vehicle_number: string
  position_x: number
  position_y: number
  position_z: number
  status: 'idle' | 'dispatched' | 'en_route' | 'on_site' | 'returning'
  max_speed: number
  capacity: number
  created_at: string
}

export interface DispatchTask {
  id: number
  vehicle_id: number
  task_type: 'fire_suppression' | 'rescue' | 'evacuation_assist' | 'supply'
  target_x: number
  target_y: number
  target_z: number
  start_time: string
  estimated_completion: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
}

export interface EventLog {
  id: number
  timestamp: string
  event_type: string
  description: string | null
  related_object_id: number | null
  operator_name: string | null
  created_at: string
}

export interface DrillReport {
  id: number
  drill_name: string
  start_time: string
  end_time: string | null
  total_buildings: number
  total_people: number
  evacuated_people: number
  total_vehicles: number
  average_evacuation_time: number | null
  fire_containment_time: number | null
  summary: string | null
  statistics: any
  created_at: string
}

export interface EvacuationRouteStep {
  position_x: number
  position_y: number
  position_z: number
  step_type: string
  description: string
}

export interface EvacuationRoute {
  route_id: string
  building_id: number
  steps: EvacuationRouteStep[]
  estimated_time_minutes: number
  total_distance: number
  target_exit_id: number | null
}

export interface FireSpreadResult {
  fire_incident_id: number
  elapsed_minutes: number
  new_radius: number
  affected_building_ids: number[]
  affected_people_count: number
  spread_direction: string | null
}

export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message: string
}
