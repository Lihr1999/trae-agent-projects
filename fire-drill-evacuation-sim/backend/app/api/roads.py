from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Road, EventLog, User
from app.schemas.schemas import RoadCreate, RoadUpdate, RoadResponse, ApiResponse

router = APIRouter(prefix="/roads", tags=["道路管理"])


@router.get("", response_model=ApiResponse)
def list_roads(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    roads = db.query(Road).offset(skip).limit(limit).all()
    return ApiResponse(
        success=True,
        data=[RoadResponse.model_validate(r).model_dump() for r in roads],
        message="获取道路列表成功"
    )


@router.get("/{road_id}", response_model=ApiResponse)
def get_road(road_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    road = db.query(Road).filter(Road.id == road_id).first()
    if not road:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="道路不存在")
    return ApiResponse(
        success=True,
        data=RoadResponse.model_validate(road).model_dump(),
        message="获取道路详情成功"
    )


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def create_road(road_data: RoadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    road = Road(**road_data.model_dump())
    db.add(road)
    db.commit()
    db.refresh(road)
    return ApiResponse(
        success=True,
        data=RoadResponse.model_validate(road).model_dump(),
        message="创建道路成功"
    )


@router.put("/{road_id}", response_model=ApiResponse)
def update_road(road_id: int, road_data: RoadUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    road = db.query(Road).filter(Road.id == road_id).first()
    if not road:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="道路不存在")
    update_data = road_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(road, key, value)
    db.commit()
    db.refresh(road)
    return ApiResponse(
        success=True,
        data=RoadResponse.model_validate(road).model_dump(),
        message="更新道路成功"
    )


@router.delete("/{road_id}", response_model=ApiResponse)
def delete_road(road_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    road = db.query(Road).filter(Road.id == road_id).first()
    if not road:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="道路不存在")
    db.delete(road)
    db.commit()
    return ApiResponse(success=True, message="删除道路成功")


@router.patch("/{road_id}/status", response_model=ApiResponse)
def update_road_status(road_id: int, status_value: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    road = db.query(Road).filter(Road.id == road_id).first()
    if not road:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="道路不存在")
    valid_statuses = ["clear", "blocked"]
    if status_value not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"无效状态，可选值: {valid_statuses}")
    road.status = status_value
    db.commit()
    db.refresh(road)
    if status_value == "blocked":
        event = EventLog(
            event_type="road_blocked",
            description=f"道路{road_id}已被封锁",
            related_object_id=road_id,
            operator_name=current_user.username
        )
        db.add(event)
        db.commit()
    return ApiResponse(
        success=True,
        data=RoadResponse.model_validate(road).model_dump(),
        message=f"道路状态已更新为{status_value}"
    )
