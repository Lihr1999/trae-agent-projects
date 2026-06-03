from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    created_at: datetime


class BuildingBase(BaseModel):
    name: str
    position_x: float = 0.0
    position_y: float = 0.0
    position_z: float = 0.0
    size_x: float = 10.0
    size_y: float = 10.0
    size_z: float = 10.0
    building_type: str = "office"
    risk_level: str = "low"
    status: str = "normal"


class BuildingCreate(BuildingBase):
    pass


class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    position_z: Optional[float] = None
    size_x: Optional[float] = None
    size_y: Optional[float] = None
    size_z: Optional[float] = None
    building_type: Optional[str] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None


class BuildingResponse(BuildingBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class FloorBase(BaseModel):
    building_id: int
    floor_number: int
    area: float = 100.0
    max_capacity: int = 100
    current_people: int = 0


class FloorCreate(FloorBase):
    pass


class FloorUpdate(BaseModel):
    floor_number: Optional[int] = None
    area: Optional[float] = None
    max_capacity: Optional[int] = None
    current_people: Optional[int] = None


class FloorResponse(FloorBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class ExitBase(BaseModel):
    building_id: int
    floor_id: int
    position_x: float = 0.0
    position_y: float = 0.0
    position_z: float = 0.0
    width: float = 2.0
    status: str = "normal"


class ExitCreate(ExitBase):
    pass


class ExitUpdate(BaseModel):
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    position_z: Optional[float] = None
    width: Optional[float] = None
    status: Optional[str] = None


class ExitResponse(ExitBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class RoadBase(BaseModel):
    start_x: float = 0.0
    start_y: float = 0.0
    start_z: float = 0.0
    end_x: float = 0.0
    end_y: float = 0.0
    end_z: float = 0.0
    width: float = 6.0
    status: str = "clear"
    connected_buildings: Optional[List[Any]] = None


class RoadCreate(RoadBase):
    pass


class RoadUpdate(BaseModel):
    start_x: Optional[float] = None
    start_y: Optional[float] = None
    start_z: Optional[float] = None
    end_x: Optional[float] = None
    end_y: Optional[float] = None
    end_z: Optional[float] = None
    width: Optional[float] = None
    status: Optional[str] = None
    connected_buildings: Optional[List[Any]] = None


class RoadResponse(RoadBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class PeopleGroupBase(BaseModel):
    name: str
    count: int = 1
    position_x: float = 0.0
    position_y: float = 0.0
    position_z: float = 0.0
    move_speed: float = 1.0
    evacuation_priority: int = 1
    status: str = "stationary"
    target_exit_id: Optional[int] = None


class PeopleGroupCreate(PeopleGroupBase):
    pass


class PeopleGroupUpdate(BaseModel):
    name: Optional[str] = None
    count: Optional[int] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    position_z: Optional[float] = None
    move_speed: Optional[float] = None
    evacuation_priority: Optional[int] = None
    status: Optional[str] = None
    target_exit_id: Optional[int] = None


class PeopleGroupResponse(PeopleGroupBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class FireIncidentBase(BaseModel):
    position_x: float = 0.0
    position_y: float = 0.0
    position_z: float = 0.0
    start_time: Optional[datetime] = None
    fire_level: int = 1
    spread_speed: float = 1.0
    affected_radius: float = 10.0
    status: str = "active"
    weather_condition: str = "clear"


class FireIncidentCreate(FireIncidentBase):
    pass


class FireIncidentUpdate(BaseModel):
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    position_z: Optional[float] = None
    fire_level: Optional[int] = None
    spread_speed: Optional[float] = None
    affected_radius: Optional[float] = None
    status: Optional[str] = None
    weather_condition: Optional[str] = None


class FireIncidentResponse(FireIncidentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    start_time: datetime
    created_at: datetime


class RescueVehicleBase(BaseModel):
    vehicle_type: str = "fire_truck"
    vehicle_number: str
    position_x: float = 0.0
    position_y: float = 0.0
    position_z: float = 0.0
    status: str = "idle"
    max_speed: float = 60.0
    capacity: int = 5


class RescueVehicleCreate(RescueVehicleBase):
    pass


class RescueVehicleUpdate(BaseModel):
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    position_z: Optional[float] = None
    status: Optional[str] = None
    max_speed: Optional[float] = None
    capacity: Optional[int] = None


class RescueVehicleResponse(RescueVehicleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class DispatchTaskBase(BaseModel):
    vehicle_id: int
    task_type: str = "fire_suppression"
    target_x: float = 0.0
    target_y: float = 0.0
    target_z: float = 0.0
    start_time: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None
    status: str = "pending"


class DispatchTaskCreate(DispatchTaskBase):
    pass


class DispatchTaskUpdate(BaseModel):
    task_type: Optional[str] = None
    target_x: Optional[float] = None
    target_y: Optional[float] = None
    target_z: Optional[float] = None
    estimated_completion: Optional[datetime] = None
    status: Optional[str] = None


class DispatchTaskResponse(DispatchTaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    start_time: datetime
    created_at: datetime


class EventLogBase(BaseModel):
    timestamp: Optional[datetime] = None
    event_type: str
    description: Optional[str] = None
    related_object_id: Optional[int] = None
    operator_name: Optional[str] = None


class EventLogCreate(EventLogBase):
    pass


class EventLogUpdate(BaseModel):
    timestamp: Optional[datetime] = None
    event_type: Optional[str] = None
    description: Optional[str] = None
    related_object_id: Optional[int] = None
    operator_name: Optional[str] = None


class EventLogResponse(EventLogBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: datetime
    created_at: datetime


class DrillReportBase(BaseModel):
    drill_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    total_buildings: int = 0
    total_people: int = 0
    evacuated_people: int = 0
    total_vehicles: int = 0
    average_evacuation_time: Optional[float] = None
    fire_containment_time: Optional[float] = None
    summary: Optional[str] = None
    statistics: Optional[Any] = None


class DrillReportCreate(DrillReportBase):
    pass


class DrillReportUpdate(BaseModel):
    drill_name: Optional[str] = None
    end_time: Optional[datetime] = None
    total_buildings: Optional[int] = None
    total_people: Optional[int] = None
    evacuated_people: Optional[int] = None
    total_vehicles: Optional[int] = None
    average_evacuation_time: Optional[float] = None
    fire_containment_time: Optional[float] = None
    summary: Optional[str] = None
    statistics: Optional[Any] = None


class DrillReportResponse(DrillReportBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class EvacuationRouteRequest(BaseModel):
    building_id: int
    fire_incident_id: int


class EvacuationRouteStep(BaseModel):
    position_x: float
    position_y: float
    position_z: float
    step_type: str
    description: str


class EvacuationRouteResponse(BaseModel):
    route_id: str
    building_id: int
    steps: List[EvacuationRouteStep]
    estimated_time_minutes: float
    total_distance: float
    target_exit_id: Optional[int] = None


class DispatchRequest(BaseModel):
    vehicle_id: int
    task_type: str = "fire_suppression"
    target_x: float = 0.0
    target_y: float = 0.0
    target_z: float = 0.0


class FireSpreadRequest(BaseModel):
    fire_incident_id: int
    elapsed_minutes: float = 10.0
    weather_condition: str = "clear"


class FireSpreadResult(BaseModel):
    fire_incident_id: int
    elapsed_minutes: float
    new_radius: float
    affected_building_ids: List[int]
    affected_people_count: int
    spread_direction: Optional[str] = None


class DrillResetRequest(BaseModel):
    reset_buildings: bool = True
    reset_people: bool = True
    reset_vehicles: bool = True
    reset_fires: bool = True


class ReportExportRequest(BaseModel):
    report_id: int
    format: str = "pdf"


class ApiResponse(BaseModel):
    success: bool = True
    data: Optional[Any] = None
    message: str = "操作成功"
