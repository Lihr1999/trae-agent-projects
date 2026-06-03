from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import DrillReport, User
from app.schemas.schemas import DrillReportCreate, DrillReportUpdate, DrillReportResponse, ApiResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["演练报告"])
report_service = ReportService()


@router.get("", response_model=ApiResponse)
def list_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = db.query(DrillReport).offset(skip).limit(limit).all()
    return ApiResponse(
        success=True,
        data=[DrillReportResponse.model_validate(r).model_dump() for r in reports],
        message="获取报告列表成功"
    )


@router.get("/{report_id}", response_model=ApiResponse)
def get_report(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(DrillReport).filter(DrillReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="报告不存在")
    return ApiResponse(
        success=True,
        data=DrillReportResponse.model_validate(report).model_dump(),
        message="获取报告详情成功"
    )


@router.post("/generate", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def generate_report(report_data: DrillReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = DrillReport(**report_data.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)

    report = report_service.generate_report(db, report.id)
    if not report:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="报告生成失败")

    return ApiResponse(
        success=True,
        data=DrillReportResponse.model_validate(report).model_dump(),
        message="报告生成成功"
    )


@router.get("/{report_id}/export/pdf")
def export_pdf(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pdf_bytes = report_service.export_pdf(db, report_id)
    if not pdf_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="报告不存在")
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"}
    )


@router.get("/{report_id}/export/excel")
def export_excel(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    excel_bytes = report_service.export_excel(db, report_id)
    if not excel_bytes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="报告不存在")
    return StreamingResponse(
        iter([excel_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.xlsx"}
    )
