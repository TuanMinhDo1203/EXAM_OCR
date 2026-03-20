from io import BytesIO

import requests
import streamlit as st
from PIL import Image


st.set_page_config(page_title="Handwritten Code OCR Client", layout="wide")

DEFAULT_BACKEND = "http://backend:8000"

if "ocr_result" not in st.session_state:
    st.session_state.ocr_result = None
if "grade_result" not in st.session_state:
    st.session_state.grade_result = None

st.title("Handwritten Code OCR")
st.caption("Thin Streamlit client for the FastAPI OCR backend.")

with st.sidebar:
    backend_url = st.text_input("Backend URL", value=DEFAULT_BACKEND).rstrip("/")
    st.markdown("The frontend only uploads images and renders backend responses.")

    try:
        ready_response = requests.get(f"{backend_url}/ready", timeout=5)
        ready_response.raise_for_status()
        ready_payload = ready_response.json()
        st.success(
            f"Backend: {ready_payload['status']} | models_loaded={ready_payload['models_loaded']} | device={ready_payload.get('device')}"
        )
    except Exception as exc:
        ready_payload = {"grading_enabled": False}
        st.error(f"Backend unavailable: {exc}")

left, right = st.columns([1, 1])

with left:
    uploaded = st.file_uploader("Upload image", type=["png", "jpg", "jpeg"])
    if uploaded is not None:
        st.image(Image.open(uploaded).convert("RGB"), use_container_width=True)

    run_ocr = st.button("Run OCR", type="primary", disabled=uploaded is None)

    if run_ocr and uploaded is not None:
        files = {"file": (uploaded.name, uploaded.getvalue(), uploaded.type or "application/octet-stream")}
        try:
            with st.spinner("Calling backend OCR API..."):
                response = requests.post(f"{backend_url}/api/ocr/predict", files=files, timeout=180)
                response.raise_for_status()
                st.session_state.ocr_result = response.json()
                st.session_state.grade_result = None
        except requests.HTTPError as exc:
            detail = exc.response.text if exc.response is not None else str(exc)
            st.error(f"OCR request failed: {detail}")
        except Exception as exc:
            st.error(f"OCR request failed: {exc}")

with right:
    st.subheader("OCR Result")
    result = st.session_state.ocr_result
    recognized_text = result["recognized_text"] if result else ""
    st.text_area("Digitized code", value=recognized_text, height=420)

    if result and result.get("visualization_path"):
        try:
            viz_response = requests.get(f"{backend_url}{result['visualization_path']}", timeout=30)
            viz_response.raise_for_status()
            st.image(Image.open(BytesIO(viz_response.content)), caption="Detection / classification visualization", use_container_width=True)
        except Exception as exc:
            st.warning(f"Could not load visualization: {exc}")

if result:
    st.markdown("### OCR Metadata")
    st.json(
        {
            "request_id": result.get("request_id"),
            "filename": result.get("filename"),
            "processing_time": result.get("processing_time"),
            "boxes": result.get("boxes", []),
        }
    )

if ready_payload.get("grading_enabled"):
    st.markdown("### Internal Grading")
    code = st.text_area("Code to grade", value=recognized_text if result else "", height=220)
    input_col, output_col, button_col = st.columns([1, 1, 0.6])
    with input_col:
        test_input = st.text_input("Test input", value="[1, 2, 3]")
    with output_col:
        expected_output = st.text_input("Expected output", value="6")
    with button_col:
        grade_clicked = st.button("Run internal grading", disabled=not code.strip())

    if grade_clicked:
        try:
            response = requests.post(
                f"{backend_url}/api/grade/run",
                json={
                    "code": code,
                    "test_input": test_input,
                    "expected_output": expected_output,
                },
                timeout=30,
            )
            response.raise_for_status()
            st.session_state.grade_result = response.json()
        except requests.HTTPError as exc:
            detail = exc.response.text if exc.response is not None else str(exc)
            st.error(f"Grading request failed: {detail}")
        except Exception as exc:
            st.error(f"Grading request failed: {exc}")

if st.session_state.grade_result:
    st.markdown("### Grading Result")
    st.json(st.session_state.grade_result)
