from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import EventLog, User
from app.schemas.schemas import EventLogCreate, EventLogUpdate, EventLogResponse, ApiResponse

router = APIRouter(prefix="/events", tags=["事件日志"])


@router.get("", response_model=ApiResponse)
def list_events(
    skip: int = 0,
    limit: int = 100,
    event_type: Optional[str] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(EventLog)
    if event_type:
        query = query.filter(EventLog.event_type == event_type)
    if start_time:
        query = query.filter(EventLog.timestamp >= start_time)
    if end_time:
        query = query.filter(EventLog.timestamp <= end_time)
    events = query.order_by(EventLog.timestamp.desc()).offset(skip).limit(limit).all()
    return ApiResponse(
        success=True,
        data=[EventLogResponse.model_validate(e).model_dump() for e in events],
        message="获取事件列表成功"
    )


@router.get("/timeline", response_model=ApiResponse)
def get_timeline(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    events = db.query(EventLog).order_by(EventLog.timestamp.asc()).all()
    timeline = []
    for e in events:
        timeline.append({
            "id": e.id,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "event_type": e.event_type,
            "description": e.description,
            "related_object_id": e.related_object_id,
            "operator_name": e.operator_name,
        })
    return ApiResponse(
        success=True,
        data=timeline,
        message="获取时间线成功"
    )


@router.get("/{event_id}", response_model=ApiResponse)
def get_event(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    event = db.query(EventLog).filter(EventLog.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="事件不存在")
    return ApiResponse(
        success=True,
        data=EventLogResponse.model_validate(event).model_dump(),
        message="获取事件详情成功"
    )


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def create_event(event_data: EventLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    event = EventLog(**event_data.model_dump())
    if not event.timestamp:
        event.timestamp = datetime.now()
    db.add(event)
    db.commit()
    db.refresh(event)
    return ApiResponse(
        success=True,
        data=EventLogResponse.model_validate(event).model_dump(),
        message="创建事件成功"
    )


@router.put("/{event_id}", response_model=ApiResponse)
def update_event(event_id: int, event_data: EventLogUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    event = db.query(EventLog).filter(EventLog.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="事件不存在")
    update_data = event_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return ApiResponse(
        success=True,
        data=EventLogResponse.model_validate(event).model_dump(),
        message="更新事件成功"
    )
