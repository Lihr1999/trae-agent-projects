import math
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Building, Floor, Exit, FireIncident, User
from app.schemas.schemas import BuildingCreate, BuildingUpdate, BuildingResponse, ApiResponse

router = APIRouter(prefix="/buildings", tags=["建筑管理"])


@router.get("", response_model=ApiResponse)
def list_buildings(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    buildings = db.query(Building).offset(skip).limit(limit).all()
    return ApiResponse(
        success=True,
        data=[BuildingResponse.model_validate(b).model_dump() for b in buildings],
        message="获取建筑列表成功"
    )


@router.get("/{building_id}", response_model=ApiResponse)
def get_building(building_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="建筑不存在")
    return ApiResponse(
        success=True,
        data=BuildingResponse.model_validate(building).model_dump(),
        message="获取建筑详情成功"
    )


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def create_building(building_data: BuildingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    building = Building(**building_data.model_dump())
    db.add(building)
    db.commit()
    db.refresh(building)
    return ApiResponse(
        success=True,
        data=BuildingResponse.model_validate(building).model_dump(),
        message="创建建筑成功"
    )


@router.put("/{building_id}", response_model=ApiResponse)
def update_building(building_id: int, building_data: BuildingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="建筑不存在")
    update_data = building_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(building, key, value)
    db.commit()
    db.refresh(building)
    return ApiResponse(
        success=True,
        data=BuildingResponse.model_validate(building).model_dump(),
        message="更新建筑成功"
    )


@router.delete("/{building_id}", response_model=ApiResponse)
def delete_building(building_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="建筑不存在")
    db.delete(building)
    db.commit()
    return ApiResponse(success=True, message="删除建筑成功")


@router.get("/{building_id}/risk-assessment", response_model=ApiResponse)
def risk_assessment(building_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="建筑不存在")

    floors = db.query(Floor).filter(Floor.building_id == building_id).all()
    exits = db.query(Exit).filter(Exit.building_id == building_id).all()
    fires = db.query(FireIncident).filter(FireIncident.status == "active").all()

    total_people = sum(f.current_people for f in floors)
    total_capacity = sum(f.max_capacity for f in floors)
    usable_exits = [e for e in exits if e.status != "blocked"]
    exit_width = sum(e.width for e in usable_exits)

    risk_score = 0

    if total_people > total_capacity * 0.9:
        risk_score += 30
    elif total_people > total_capacity * 0.7:
        risk_score += 15

    if len(usable_exits) == 0:
        risk_score += 40
    elif len(usable_exits) == 1:
        risk_score += 20

    if exit_width < 3.0:
        risk_score += 15

    for fire in fires:
        dist = math.sqrt(
            (building.position_x - fire.position_x) ** 2 +
            (building.position_y - fire.position_y) ** 2 +
            (building.position_z - fire.position_z) ** 2
        )
        if dist < fire.affected_radius:
            risk_score += 30
        elif dist < fire.affected_radius * 2:
            risk_score += 10

    if building.risk_level == "critical":
        risk_score += 20
    elif building.risk_level == "high":
        risk_score += 10
    elif building.risk_level == "medium":
        risk_score += 5

    risk_score = min(risk_score, 100)

    if risk_score >= 70:
        level = "critical"
    elif risk_score >= 50:
        level = "high"
    elif risk_score >= 25:
        level = "medium"
    else:
        level = "low"

    return ApiResponse(
        success=True,
        data={
            "building_id": building_id,
            "risk_score": risk_score,
            "risk_level": level,
            "total_people": total_people,
            "total_capacity": total_capacity,
            "usable_exits": len(usable_exits),
            "total_exits": len(exits),
            "nearby_fires": len(fires),
        },
        message="风险评估完成"
    )
