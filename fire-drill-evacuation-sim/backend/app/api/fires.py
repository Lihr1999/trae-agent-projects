from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import FireIncident, Building, EventLog, User
from app.schemas.schemas import FireIncidentCreate, FireIncidentUpdate, FireIncidentResponse, FireSpreadRequest, ApiResponse
from app.services.fire_spread_service import FireSpreadService

router = APIRouter(prefix="/fires", tags=["火灾管理"])
fire_spread_service = FireSpreadService()


@router.get("", response_model=ApiResponse)
def list_fires(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fires = db.query(FireIncident).offset(skip).limit(limit).all()
    return ApiResponse(
        success=True,
        data=[FireIncidentResponse.model_validate(f).model_dump() for f in fires],
        message="获取火灾列表成功"
    )


@router.get("/{fire_id}", response_model=ApiResponse)
def get_fire(fire_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fire = db.query(FireIncident).filter(FireIncident.id == fire_id).first()
    if not fire:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="火灾事件不存在")
    return ApiResponse(
        success=True,
        data=FireIncidentResponse.model_validate(fire).model_dump(),
        message="获取火灾详情成功"
    )


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def create_fire(fire_data: FireIncidentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fire = FireIncident(**fire_data.model_dump())
    db.add(fire)
    db.commit()
    db.refresh(fire)

    event = EventLog(
        event_type="fire_detected",
        description=f"检测到火灾，位置({fire.position_x},{fire.position_y},{fire.position_z})，等级{fire.fire_level}",
        related_object_id=fire.id,
        operator_name=current_user.username
    )
    db.add(event)
    db.commit()

    affected = fire_spread_service.get_affected_buildings(db, fire.id)
    for b in affected:
        building = db.query(Building).filter(Building.id == b["building_id"]).first()
        if building:
            building.status = "fire"

    db.commit()

    return ApiResponse(
        success=True,
        data=FireIncidentResponse.model_validate(fire).model_dump(),
        message="创建火灾事件成功"
    )


@router.put("/{fire_id}", response_model=ApiResponse)
def update_fire(fire_id: int, fire_data: FireIncidentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fire = db.query(FireIncident).filter(FireIncident.id == fire_id).first()
    if not fire:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="火灾事件不存在")
    update_data = fire_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(fire, key, value)
    db.commit()
    db.refresh(fire)
    return ApiResponse(
        success=True,
        data=FireIncidentResponse.model_validate(fire).model_dump(),
        message="更新火灾事件成功"
    )


@router.delete("/{fire_id}", response_model=ApiResponse)
def delete_fire(fire_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fire = db.query(FireIncident).filter(FireIncident.id == fire_id).first()
    if not fire:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="火灾事件不存在")
    db.delete(fire)
    db.commit()
    return ApiResponse(success=True, message="删除火灾事件成功")


@router.post("/{fire_id}/spread-calculation", response_model=ApiResponse)
def calculate_spread(fire_id: int, request: FireSpreadRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = fire_spread_service.calculate_spread(db, fire_id, request.elapsed_minutes, request.weather_condition)
    if not result.get("spread_calculated"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.get("message", "计算失败"))
    return ApiResponse(success=True, data=result, message="火势蔓延计算完成")


@router.post("/{fire_id}/contain", response_model=ApiResponse)
def contain_fire(fire_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fire = db.query(FireIncident).filter(FireIncident.id == fire_id).first()
    if not fire:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="火灾事件不存在")
    fire.status = "contained"
    db.commit()
    db.refresh(fire)

    event = EventLog(
        event_type="fire_contained",
        description=f"火灾{fire_id}已被控制",
        related_object_id=fire_id,
        operator_name=current_user.username
    )
    db.add(event)
    db.commit()

    return ApiResponse(
        success=True,
        data=FireIncidentResponse.model_validate(fire).model_dump(),
        message="火灾已控制"
    )


@router.post("/{fire_id}/extinguish", response_model=ApiResponse)
def extinguish_fire(fire_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fire = db.query(FireIncident).filter(FireIncident.id == fire_id).first()
    if not fire:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="火灾事件不存在")
    fire.status = "extinguished"
    db.commit()
    db.refresh(fire)

    event = EventLog(
        event_type="fire_extinguished",
        description=f"火灾{fire_id}已被扑灭",
        related_object_id=fire_id,
        operator_name=current_user.username
    )
    db.add(event)
    db.commit()

    affected = fire_spread_service.get_affected_buildings(db, fire_id)
    for b in affected:
        building = db.query(Building).filter(Building.id == b["building_id"]).first()
        if building and building.status == "fire":
            building.status = "evacuating"
    db.commit()

    return ApiResponse(
        success=True,
        data=FireIncidentResponse.model_validate(fire).model_dump(),
        message="火灾已扑灭"
    )
