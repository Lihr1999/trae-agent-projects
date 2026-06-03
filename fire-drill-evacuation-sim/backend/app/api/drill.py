from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import (
    Building, Floor, Exit, Road, PeopleGroup,
    FireIncident, RescueVehicle, DispatchTask,
    EventLog, DrillReport, User
)
from app.schemas.schemas import DrillResetRequest, DrillReportResponse, ApiResponse

router = APIRouter(prefix="/drill", tags=["演练控制"])

_drill_active = False
_drill_start_time = None
_drill_report_id = None


@router.post("/start", response_model=ApiResponse)
def start_drill(drill_name: str = "消防演练", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    global _drill_active, _drill_start_time, _drill_report_id

    if _drill_active:
        return ApiResponse(success=False, message="演练正在进行中，无法重复启动")

    _drill_active = True
    _drill_start_time = datetime.now(timezone.utc)

    report = DrillReport(
        drill_name=drill_name,
        start_time=_drill_start_time,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    _drill_report_id = report.id

    event = EventLog(
        event_type="drill_start",
        description=f"演练'{drill_name}'已开始",
        operator_name=current_user.username
    )
    db.add(event)
    db.commit()

    return ApiResponse(
        success=True,
        data={"drill_name": drill_name, "start_time": _drill_start_time.isoformat(), "report_id": report.id},
        message="演练已开始"
    )


@router.post("/end", response_model=ApiResponse)
def end_drill(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    global _drill_active, _drill_start_time, _drill_report_id

    if not _drill_active:
        return ApiResponse(success=False, message="没有正在进行的演练")

    _drill_active = False
    end_time = datetime.now(timezone.utc)

    if _drill_report_id:
        report = db.query(DrillReport).filter(DrillReport.id == _drill_report_id).first()
        if report:
            report.end_time = end_time
            db.commit()

    event = EventLog(
        event_type="drill_end",
        description="演练已结束",
        operator_name=current_user.username
    )
    db.add(event)
    db.commit()

    result = {
        "drill_report_id": _drill_report_id,
        "end_time": end_time.isoformat(),
    }

    _drill_start_time = None
    _drill_report_id = None

    return ApiResponse(success=True, data=result, message="演练已结束")


@router.post("/reset", response_model=ApiResponse)
def reset_drill(reset_request: DrillResetRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    global _drill_active, _drill_start_time, _drill_report_id

    if reset_request.reset_buildings:
        db.query(Building).update({Building.status: "normal"})
        db.query(Floor).update({Floor.current_people: 0})

    if reset_request.reset_people:
        db.query(PeopleGroup).update({PeopleGroup.status: "stationary", PeopleGroup.target_exit_id: None})

    if reset_request.reset_vehicles:
        db.query(RescueVehicle).update({RescueVehicle.status: "idle"})

    if reset_request.reset_fires:
        db.query(FireIncident).update({FireIncident.status: "extinguished"})

    db.query(DispatchTask).update({DispatchTask.status: "cancelled"})
    db.query(Exit).update({Exit.status: "normal"})
    db.query(Road).update({Road.status: "clear"})

    _drill_active = False
    _drill_start_time = None
    _drill_report_id = None

    db.commit()

    event = EventLog(
        event_type="drill_end",
        description="演练数据已重置",
        operator_name=current_user.username
    )
    db.add(event)
    db.commit()

    return ApiResponse(success=True, message="演练数据已重置")


@router.get("/status", response_model=ApiResponse)
def get_drill_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    buildings = db.query(Building).count()
    fires = db.query(FireIncident).filter(FireIncident.status == "active").count()
    evacuating = db.query(PeopleGroup).filter(PeopleGroup.status == "evacuating").count()
    evacuated = db.query(PeopleGroup).filter(PeopleGroup.status == "evacuated").count()
    idle_vehicles = db.query(RescueVehicle).filter(RescueVehicle.status == "idle").count()
    dispatched_vehicles = db.query(RescueVehicle).filter(RescueVehicle.status != "idle").count()

    return ApiResponse(
        success=True,
        data={
            "is_active": _drill_active,
            "start_time": _drill_start_time.isoformat() if _drill_start_time else None,
            "active_fires": fires,
            "total_buildings": buildings,
            "evacuating_groups": evacuating,
            "evacuated_groups": evacuated,
            "idle_vehicles": idle_vehicles,
            "dispatched_vehicles": dispatched_vehicles,
        },
        message="获取演练状态成功"
    )
