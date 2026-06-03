from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import DispatchTask, RescueVehicle, EventLog, FireIncident, User
from app.schemas.schemas import DispatchRequest, DispatchTaskResponse, ApiResponse
from app.services.dispatch_service import DispatchService

router = APIRouter(prefix="/dispatch", tags=["调度管理"])
dispatch_service = DispatchService()


@router.post("/auto", response_model=ApiResponse)
def auto_dispatch(fire_incident_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fire = db.query(FireIncident).filter(FireIncident.id == fire_incident_id).first()
    if not fire:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="火灾事件不存在")

    result = dispatch_service.auto_dispatch(db, fire_incident_id)
    if not result:
        return ApiResponse(success=False, data=[], message="没有可用的空闲车辆")

    for item in result:
        event = EventLog(
            event_type="vehicle_dispatched",
            description=f"车辆{item['vehicle_number']}自动调度至火灾现场",
            related_object_id=item["vehicle_id"],
            operator_name=current_user.username
        )
        db.add(event)
    db.commit()

    return ApiResponse(success=True, data=result, message="自动调度完成")


@router.post("/manual", response_model=ApiResponse)
def manual_dispatch(dispatch_data: DispatchRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone, timedelta
    import math

    vehicle = db.query(RescueVehicle).filter(RescueVehicle.id == dispatch_data.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="车辆不存在")
    if vehicle.status != "idle":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="车辆不可用")

    conflict = dispatch_service.check_dispatch_conflicts(db, dispatch_data.vehicle_id)
    if conflict["has_conflict"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict["message"])

    dist = math.sqrt(
        (vehicle.position_x - dispatch_data.target_x) ** 2 +
        (vehicle.position_y - dispatch_data.target_y) ** 2 +
        (vehicle.position_z - dispatch_data.target_z) ** 2
    )
    travel_time = (dist / vehicle.max_speed) * 60 if vehicle.max_speed > 0 else 0
    est_completion = datetime.now(timezone.utc) + timedelta(minutes=travel_time + 30)

    task = DispatchTask(
        vehicle_id=dispatch_data.vehicle_id,
        task_type=dispatch_data.task_type,
        target_x=dispatch_data.target_x,
        target_y=dispatch_data.target_y,
        target_z=dispatch_data.target_z,
        estimated_completion=est_completion,
        status="pending"
    )
    db.add(task)
    vehicle.status = "dispatched"
    db.commit()
    db.refresh(task)

    event = EventLog(
        event_type="vehicle_dispatched",
        description=f"车辆{vehicle.vehicle_number}手动调度，任务: {dispatch_data.task_type}",
        related_object_id=vehicle.id,
        operator_name=current_user.username
    )
    db.add(event)
    db.commit()

    return ApiResponse(
        success=True,
        data=DispatchTaskResponse.model_validate(task).model_dump(),
        message="手动调度成功"
    )


@router.get("/tasks", response_model=ApiResponse)
def list_tasks(skip: int = 0, limit: int = 100, status_filter: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(DispatchTask)
    if status_filter:
        query = query.filter(DispatchTask.status == status_filter)
    tasks = query.offset(skip).limit(limit).all()
    return ApiResponse(
        success=True,
        data=[DispatchTaskResponse.model_validate(t).model_dump() for t in tasks],
        message="获取调度任务列表成功"
    )


@router.get("/vehicle/{vehicle_id}/route", response_model=ApiResponse)
def get_vehicle_route(vehicle_id: int, target_x: float = 0.0, target_y: float = 0.0, target_z: float = 0.0, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = dispatch_service.calculate_optimal_route(db, vehicle_id, target_x, target_y, target_z)
    if not result.get("found"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.get("message", "路线计算失败"))
    return ApiResponse(success=True, data=result, message="最优路线计算完成")
