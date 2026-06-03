from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Exit, EventLog, User
from app.schemas.schemas import ExitCreate, ExitUpdate, ExitResponse, ApiResponse

router = APIRouter(prefix="/exits", tags=["出口管理"])


@router.get("", response_model=ApiResponse)
def list_exits(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exits = db.query(Exit).offset(skip).limit(limit).all()
    return ApiResponse(
        success=True,
        data=[ExitResponse.model_validate(e).model_dump() for e in exits],
        message="获取出口列表成功"
    )


@router.get("/{exit_id}", response_model=ApiResponse)
def get_exit(exit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exit_obj = db.query(Exit).filter(Exit.id == exit_id).first()
    if not exit_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="出口不存在")
    return ApiResponse(
        success=True,
        data=ExitResponse.model_validate(exit_obj).model_dump(),
        message="获取出口详情成功"
    )


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def create_exit(exit_data: ExitCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exit_obj = Exit(**exit_data.model_dump())
    db.add(exit_obj)
    db.commit()
    db.refresh(exit_obj)
    return ApiResponse(
        success=True,
        data=ExitResponse.model_validate(exit_obj).model_dump(),
        message="创建出口成功"
    )


@router.put("/{exit_id}", response_model=ApiResponse)
def update_exit(exit_id: int, exit_data: ExitUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exit_obj = db.query(Exit).filter(Exit.id == exit_id).first()
    if not exit_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="出口不存在")
    update_data = exit_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(exit_obj, key, value)
    db.commit()
    db.refresh(exit_obj)
    return ApiResponse(
        success=True,
        data=ExitResponse.model_validate(exit_obj).model_dump(),
        message="更新出口成功"
    )


@router.delete("/{exit_id}", response_model=ApiResponse)
def delete_exit(exit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exit_obj = db.query(Exit).filter(Exit.id == exit_id).first()
    if not exit_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="出口不存在")
    db.delete(exit_obj)
    db.commit()
    return ApiResponse(success=True, message="删除出口成功")


@router.patch("/{exit_id}/status", response_model=ApiResponse)
def update_exit_status(exit_id: int, status_value: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exit_obj = db.query(Exit).filter(Exit.id == exit_id).first()
    if not exit_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="出口不存在")
    valid_statuses = ["normal", "congested", "blocked"]
    if status_value not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"无效状态，可选值: {valid_statuses}")
    exit_obj.status = status_value
    db.commit()
    db.refresh(exit_obj)
    return ApiResponse(
        success=True,
        data=ExitResponse.model_validate(exit_obj).model_dump(),
        message=f"出口状态已更新为{status_value}"
    )


@router.post("/{exit_id}/block", response_model=ApiResponse)
def block_exit(exit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exit_obj = db.query(Exit).filter(Exit.id == exit_id).first()
    if not exit_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="出口不存在")
    exit_obj.status = "blocked"
    db.commit()
    db.refresh(exit_obj)
    event = EventLog(
        event_type="exit_blocked",
        description=f"出口{exit_id}已被封锁",
        related_object_id=exit_id,
        operator_name=current_user.username
    )
    db.add(event)
    db.commit()
    return ApiResponse(
        success=True,
        data=ExitResponse.model_validate(exit_obj).model_dump(),
        message="出口已封锁"
    )


@router.post("/{exit_id}/unblock", response_model=ApiResponse)
def unblock_exit(exit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exit_obj = db.query(Exit).filter(Exit.id == exit_id).first()
    if not exit_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="出口不存在")
    exit_obj.status = "normal"
    db.commit()
    db.refresh(exit_obj)
    return ApiResponse(
        success=True,
        data=ExitResponse.model_validate(exit_obj).model_dump(),
        message="出口已解除封锁"
    )
