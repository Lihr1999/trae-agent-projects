from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import PeopleGroup, EventLog, User
from app.schemas.schemas import PeopleGroupCreate, PeopleGroupUpdate, PeopleGroupResponse, ApiResponse
from app.services.evacuation_service import EvacuationService

router = APIRouter(prefix="/people", tags=["人员管理"])
evacuation_service = EvacuationService()


@router.get("", response_model=ApiResponse)
def list_people(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    people = db.query(PeopleGroup).offset(skip).limit(limit).all()
    return ApiResponse(
        success=True,
        data=[PeopleGroupResponse.model_validate(p).model_dump() for p in people],
        message="获取人员列表成功"
    )


@router.get("/{people_id}", response_model=ApiResponse)
def get_people(people_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    people = db.query(PeopleGroup).filter(PeopleGroup.id == people_id).first()
    if not people:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="人员组不存在")
    return ApiResponse(
        success=True,
        data=PeopleGroupResponse.model_validate(people).model_dump(),
        message="获取人员详情成功"
    )


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def create_people(people_data: PeopleGroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    people = PeopleGroup(**people_data.model_dump())
    db.add(people)
    db.commit()
    db.refresh(people)
    return ApiResponse(
        success=True,
        data=PeopleGroupResponse.model_validate(people).model_dump(),
        message="创建人员组成功"
    )


@router.put("/{people_id}", response_model=ApiResponse)
def update_people(people_id: int, people_data: PeopleGroupUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    people = db.query(PeopleGroup).filter(PeopleGroup.id == people_id).first()
    if not people:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="人员组不存在")
    update_data = people_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(people, key, value)
    db.commit()
    db.refresh(people)
    return ApiResponse(
        success=True,
        data=PeopleGroupResponse.model_validate(people).model_dump(),
        message="更新人员组成功"
    )


@router.delete("/{people_id}", response_model=ApiResponse)
def delete_people(people_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    people = db.query(PeopleGroup).filter(PeopleGroup.id == people_id).first()
    if not people:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="人员组不存在")
    db.delete(people)
    db.commit()
    return ApiResponse(success=True, message="删除人员组成功")


@router.post("/evacuate", response_model=ApiResponse)
def trigger_evacuation(building_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    people_groups = db.query(PeopleGroup).filter(
        PeopleGroup.status.in_(["stationary", "evacuating"])
    ).all()

    updated = []
    for pg in people_groups:
        pg.status = "evacuating"
        updated.append(pg.id)

    db.commit()

    event = EventLog(
        event_type="evacuation_started",
        description=f"建筑{building_id}开始疏散，涉及{len(updated)}个人员组",
        related_object_id=building_id,
        operator_name=current_user.username
    )
    db.add(event)
    db.commit()

    result = evacuation_service.optimize_crowd_flow(db, building_id)

    return ApiResponse(
        success=True,
        data={
            "evacuating_groups": len(updated),
            "group_ids": updated,
            "optimization": result
        },
        message="疏散已触发"
    )
