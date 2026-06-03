import enum
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, JSON, Enum as SAEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class BuildingStatus(str, enum.Enum):
    normal = "normal"
    fire = "fire"
    evacuating = "evacuating"
    damaged = "damaged"


class ExitStatus(str, enum.Enum):
    normal = "normal"
    congested = "congested"
    blocked = "blocked"


class RoadStatus(str, enum.Enum):
    clear = "clear"
    blocked = "blocked"


class PeopleStatus(str, enum.Enum):
    stationary = "stationary"
    evacuating = "evacuating"
    evacuated = "evacuated"


class FireStatus(str, enum.Enum):
    active = "active"
    contained = "contained"
    extinguished = "extinguished"


class WeatherCondition(str, enum.Enum):
    clear = "clear"
    windy = "windy"
    rainy = "rainy"
    snowy = "snowy"


class VehicleType(str, enum.Enum):
    fire_truck = "fire_truck"
    ambulance = "ambulance"
    command_car = "command_car"


class VehicleStatus(str, enum.Enum):
    idle = "idle"
    dispatched = "dispatched"
    en_route = "en_route"
    on_site = "on_site"
    returning = "returning"


class TaskType(str, enum.Enum):
    fire_suppression = "fire_suppression"
    rescue = "rescue"
    evacuation_assist = "evacuation_assist"
    supply = "supply"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class EventType(str, enum.Enum):
    fire_detected = "fire_detected"
    evacuation_started = "evacuation_started"
    vehicle_dispatched = "vehicle_dispatched"
    exit_blocked = "exit_blocked"
    road_blocked = "road_blocked"
    vehicle_arrived = "vehicle_arrived"
    fire_contained = "fire_contained"
    fire_extinguished = "fire_extinguished"
    drill_start = "drill_start"
    drill_end = "drill_end"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    position_x: Mapped[float] = mapped_column(Float, default=0.0)
    position_y: Mapped[float] = mapped_column(Float, default=0.0)
    position_z: Mapped[float] = mapped_column(Float, default=0.0)
    size_x: Mapped[float] = mapped_column(Float, default=10.0)
    size_y: Mapped[float] = mapped_column(Float, default=10.0)
    size_z: Mapped[float] = mapped_column(Float, default=10.0)
    building_type: Mapped[str] = mapped_column(String(50), default="office")
    risk_level: Mapped[str] = mapped_column(String(20), default=RiskLevel.low.value)
    status: Mapped[str] = mapped_column(String(20), default=BuildingStatus.normal.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    floors: Mapped[List["Floor"]] = relationship(back_populates="building", cascade="all, delete-orphan")
    exits: Mapped[List["Exit"]] = relationship(back_populates="building", cascade="all, delete-orphan")


class Floor(Base):
    __tablename__ = "floors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    building_id: Mapped[int] = mapped_column(Integer, ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False)
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    area: Mapped[float] = mapped_column(Float, default=100.0)
    max_capacity: Mapped[int] = mapped_column(Integer, default=100)
    current_people: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    building: Mapped["Building"] = relationship(back_populates="floors")
    exits: Mapped[List["Exit"]] = relationship(back_populates="floor", cascade="all, delete-orphan")


class Exit(Base):
    __tablename__ = "exits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    building_id: Mapped[int] = mapped_column(Integer, ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False)
    floor_id: Mapped[int] = mapped_column(Integer, ForeignKey("floors.id", ondelete="CASCADE"), nullable=False)
    position_x: Mapped[float] = mapped_column(Float, default=0.0)
    position_y: Mapped[float] = mapped_column(Float, default=0.0)
    position_z: Mapped[float] = mapped_column(Float, default=0.0)
    width: Mapped[float] = mapped_column(Float, default=2.0)
    status: Mapped[str] = mapped_column(String(20), default=ExitStatus.normal.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    building: Mapped["Building"] = relationship(back_populates="exits")
    floor: Mapped["Floor"] = relationship(back_populates="exits")


class Road(Base):
    __tablename__ = "roads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    start_x: Mapped[float] = mapped_column(Float, default=0.0)
    start_y: Mapped[float] = mapped_column(Float, default=0.0)
    start_z: Mapped[float] = mapped_column(Float, default=0.0)
    end_x: Mapped[float] = mapped_column(Float, default=0.0)
    end_y: Mapped[float] = mapped_column(Float, default=0.0)
    end_z: Mapped[float] = mapped_column(Float, default=0.0)
    width: Mapped[float] = mapped_column(Float, default=6.0)
    status: Mapped[str] = mapped_column(String(20), default=RoadStatus.clear.value)
    connected_buildings: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class PeopleGroup(Base):
    __tablename__ = "people_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=1)
    position_x: Mapped[float] = mapped_column(Float, default=0.0)
    position_y: Mapped[float] = mapped_column(Float, default=0.0)
    position_z: Mapped[float] = mapped_column(Float, default=0.0)
    move_speed: Mapped[float] = mapped_column(Float, default=1.0)
    evacuation_priority: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default=PeopleStatus.stationary.value)
    target_exit_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("exits.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    target_exit: Mapped[Optional["Exit"]] = relationship()


class FireIncident(Base):
    __tablename__ = "fire_incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    position_x: Mapped[float] = mapped_column(Float, default=0.0)
    position_y: Mapped[float] = mapped_column(Float, default=0.0)
    position_z: Mapped[float] = mapped_column(Float, default=0.0)
    start_time: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    fire_level: Mapped[int] = mapped_column(Integer, default=1)
    spread_speed: Mapped[float] = mapped_column(Float, default=1.0)
    affected_radius: Mapped[float] = mapped_column(Float, default=10.0)
    status: Mapped[str] = mapped_column(String(20), default=FireStatus.active.value)
    weather_condition: Mapped[str] = mapped_column(String(20), default=WeatherCondition.clear.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class RescueVehicle(Base):
    __tablename__ = "rescue_vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    vehicle_type: Mapped[str] = mapped_column(String(30), default=VehicleType.fire_truck.value)
    vehicle_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    position_x: Mapped[float] = mapped_column(Float, default=0.0)
    position_y: Mapped[float] = mapped_column(Float, default=0.0)
    position_z: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default=VehicleStatus.idle.value)
    max_speed: Mapped[float] = mapped_column(Float, default=60.0)
    capacity: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    dispatch_tasks: Mapped[List["DispatchTask"]] = relationship(back_populates="vehicle", cascade="all, delete-orphan")


class DispatchTask(Base):
    __tablename__ = "dispatch_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    vehicle_id: Mapped[int] = mapped_column(Integer, ForeignKey("rescue_vehicles.id", ondelete="CASCADE"), nullable=False)
    task_type: Mapped[str] = mapped_column(String(30), default=TaskType.fire_suppression.value)
    target_x: Mapped[float] = mapped_column(Float, default=0.0)
    target_y: Mapped[float] = mapped_column(Float, default=0.0)
    target_z: Mapped[float] = mapped_column(Float, default=0.0)
    start_time: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    estimated_completion: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=TaskStatus.pending.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    vehicle: Mapped["RescueVehicle"] = relationship(back_populates="dispatch_tasks")


class EventLog(Base):
    __tablename__ = "event_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    related_object_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    operator_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class DrillReport(Base):
    __tablename__ = "drill_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    drill_name: Mapped[str] = mapped_column(String(200), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    total_buildings: Mapped[int] = mapped_column(Integer, default=0)
    total_people: Mapped[int] = mapped_column(Integer, default=0)
    evacuated_people: Mapped[int] = mapped_column(Integer, default=0)
    total_vehicles: Mapped[int] = mapped_column(Integer, default=0)
    average_evacuation_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fire_containment_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    statistics: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
