from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import RescueVehicle, User
from app.schemas.schemas import RescueVehicleCreate, RescueVehicleUpdate, RescueVehicleResponse, ApiResponse

router = APIRouter(prefix="/vehicles", tags=["车辆管理"])


@router.get("", response_model=ApiResponse)
def list_vehicles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicles = db.query(RescueVehicle).offset(skip).limit(limit).all()
    return ApiResponse(
        success=True,
        data=[RescueVehicleResponse.model_validate(v).model_dump() for v in vehicles],
        message="获取车辆列表成功"
    )


@router.get("/{vehicle_id}", response_model=ApiResponse)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.query(RescueVehicle).filter(RescueVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="车辆不存在")
    return ApiResponse(
        success=True,
        data=RescueVehicleResponse.model_validate(vehicle).model_dump(),
        message="获取车辆详情成功"
    )


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(vehicle_data: RescueVehicleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = RescueVehicle(**vehicle_data.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return ApiResponse(
        success=True,
        data=RescueVehicleResponse.model_validate(vehicle).model_dump(),
        message="创建车辆成功"
    )


@router.put("/{vehicle_id}", response_model=ApiResponse)
def update_vehicle(vehicle_id: int, vehicle_data: RescueVehicleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.query(RescueVehicle).filter(RescueVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="车辆不存在")
    update_data = vehicle_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vehicle, key, value)
    db.commit()
    db.refresh(vehicle)
    return ApiResponse(
        success=True,
        data=RescueVehicleResponse.model_validate(vehicle).model_dump(),
        message="更新车辆成功"
    )


@router.delete("/{vehicle_id}", response_model=ApiResponse)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicle = db.query(RescueVehicle).filter(RescueVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="车辆不存在")
    db.delete(vehicle)
    db.commit()
    return ApiResponse(success=True, message="删除车辆成功")


@router.get("/available/list", response_model=ApiResponse)
def list_available_vehicles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    vehicles = db.query(RescueVehicle).filter(RescueVehicle.status == "idle").all()
    return ApiResponse(
        success=True,
        data=[RescueVehicleResponse.model_validate(v).model_dump() for v in vehicles],
        message="获取可用车辆列表成功"
    )


@router.post("/{vehicle_id}/dispatch", response_model=ApiResponse)
def dispatch_vehicle(vehicle_id: int, target_x: float = 0.0, target_y: float = 0.0, target_z: float = 0.0, task_type: str = "fire_suppression", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.models import DispatchTask, EventLog
    from app.services.dispatch_service import DispatchService
    from datetime import datetime, timezone, timedelta

    vehicle = db.query(RescueVehicle).filter(RescueVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="车辆不存在")
    if vehicle.status != "idle":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="车辆不可用，当前状态不是空闲")

    dispatch_service = DispatchService()
    conflict = dispatch_service.check_dispatch_conflicts(db, vehicle_id)
    if conflict["has_conflict"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict["message"])

    import math
    dist = math.sqrt(
        (vehicle.position_x - target_x) ** 2 +
        (vehicle.position_y - target_y) ** 2 +
        (vehicle.position_z - target_z) ** 2
    )
    travel_time = (dist / vehicle.max_speed) * 60 if vehicle.max_speed > 0 else 0
    est_completion = datetime.now(timezone.utc) + timedelta(minutes=travel_time + 30)

    task = DispatchTask(
        vehicle_id=vehicle_id,
        task_type=task_type,
        target_x=target_x,
        target_y=target_y,
        target_z=target_z,
        estimated_completion=est_completion,
        status="pending"
    )
    db.add(task)

    vehicle.status = "dispatched"
    db.commit()
    db.refresh(task)

    event = EventLog(
        event_type="vehicle_dispatched",
        description=f"车辆{vehicle.vehicle_number}已调度，任务类型: {task_type}",
        related_object_id=vehicle_id,
        operator_name=current_user.username
    )
    db.add(event)
    db.commit()

    return ApiResponse(
        success=True,
        data={
            "task_id": task.id,
            "vehicle_id": vehicle_id,
            "vehicle_number": vehicle.vehicle_number,
            "status": vehicle.status,
            "estimated_arrival_minutes": round(travel_time, 2)
        },
        message="车辆调度成功"
    )
