from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status

from app.schemas.ocr_response import OCRResponse
from app.services.file_manager import FileValidationError, validate_upload, write_upload
from app.utils.image_utils import load_image_from_bytes

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


@router.post("/predict", response_model=OCRResponse)
async def predict(request: Request, file: UploadFile = File(...)) -> OCRResponse:
    settings = request.app.state.settings
    logger = request.app.state.logger
    request_id = request.state.request_id

    content = await file.read()
    try:
        validate_upload(file.filename or "upload.bin", content, settings)
        image = load_image_from_bytes(content)
        if settings.save_uploads:
            write_upload(file.filename or "upload.bin", content, settings)
        result = request.app.state.ocr_service.predict(
            image=image,
            original_filename=file.filename or "upload.bin",
            request_id=request_id,
        )
        logger.info(
            "OCR prediction completed size_bytes=%s processing_time=%s stage_timings=%s",
            len(content),
            result["processing_time"],
            result["stage_timings"],
            extra={"request_id": request_id, "upload_name": file.filename or "-"},
        )
        return OCRResponse(**result)
    except FileValidationError as exc:
        logger.warning(
            "Upload validation failed: %s",
            exc,
            extra={"request_id": request_id, "upload_name": file.filename or "-"},
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "OCR prediction failed",
            extra={"request_id": request_id, "upload_name": file.filename or "-"},
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
