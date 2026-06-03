from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Floor, Building, User
from app.schemas.schemas import FloorCreate, FloorUpdate, FloorResponse, ApiResponse

router = APIRouter(prefix="/floors", tags=["楼层管理"])


@router.get("", response_model=ApiResponse)
def list_floors(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    floors = db.query(Floor).offset(skip).limit(limit).all()
    return ApiResponse(
        success=True,
        data=[FloorResponse.model_validate(f).model_dump() for f in floors],
        message="获取楼层列表成功"
    )


@router.get("/buildings/{building_id}/floors", response_model=ApiResponse)
def list_building_floors(building_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="建筑不存在")
    floors = db.query(Floor).filter(Floor.building_id == building_id).all()
    return ApiResponse(
        success=True,
        data=[FloorResponse.model_validate(f).model_dump() for f in floors],
        message="获取建筑楼层列表成功"
    )


@router.get("/{floor_id}", response_model=ApiResponse)
def get_floor(floor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    floor = db.query(Floor).filter(Floor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="楼层不存在")
    return ApiResponse(
        success=True,
        data=FloorResponse.model_validate(floor).model_dump(),
        message="获取楼层详情成功"
    )


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def create_floor(floor_data: FloorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    building = db.query(Building).filter(Building.id == floor_data.building_id).first()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="建筑不存在")
    floor = Floor(**floor_data.model_dump())
    db.add(floor)
    db.commit()
    db.refresh(floor)
    return ApiResponse(
        success=True,
        data=FloorResponse.model_validate(floor).model_dump(),
        message="创建楼层成功"
    )


@router.put("/{floor_id}", response_model=ApiResponse)
def update_floor(floor_id: int, floor_data: FloorUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    floor = db.query(Floor).filter(Floor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="楼层不存在")
    update_data = floor_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(floor, key, value)
    db.commit()
    db.refresh(floor)
    return ApiResponse(
        success=True,
        data=FloorResponse.model_validate(floor).model_dump(),
        message="更新楼层成功"
    )


@router.delete("/{floor_id}", response_model=ApiResponse)
def delete_floor(floor_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    floor = db.query(Floor).filter(Floor.id == floor_id).first()
    if not floor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="楼层不存在")
    db.delete(floor)
    db.commit()
    return ApiResponse(success=True, message="删除楼层成功")
