from fastapi import APIRouter, Request

from app.schemas.app_v2 import OCRSettingsResponse, OCRSettingsUpdateRequest

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _to_response(settings) -> OCRSettingsResponse:
    return OCRSettingsResponse(
        ocr_inference_mode=settings.ocr_inference_mode,
        yolo_conf=settings.yolo_conf,
        yolo_iou=settings.yolo_iou,
        yolo_min_conf=settings.yolo_min_conf,
        trocr_num_beams=settings.trocr_num_beams,
        trocr_max_tokens=settings.trocr_max_tokens,
        save_visualizations=settings.save_visualizations,
    )


@router.get("/ocr", response_model=OCRSettingsResponse)
def get_ocr_settings(request: Request) -> OCRSettingsResponse:
    return _to_response(request.app.state.settings)


@router.patch("/ocr", response_model=OCRSettingsResponse)
def update_ocr_settings(payload: OCRSettingsUpdateRequest, request: Request) -> OCRSettingsResponse:
    settings = request.app.state.settings
    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(settings, field, value)

    return _to_response(settings)
