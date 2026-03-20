from io import BytesIO

import requests
import streamlit as st
from PIL import Image

try:
    from streamlit_ace import st_ace
except Exception:
    st_ace = None


st.set_page_config(page_title="Handwritten Code Grader", layout="wide")

DEFAULT_BACKEND = "http://localhost:8000"
ACE_THEME = "monokai"
ACE_HEIGHT = 480

if "ocr_result" not in st.session_state:
    st.session_state.ocr_result = None
if "grade_result" not in st.session_state:
    st.session_state.grade_result = None
if "editor_code" not in st.session_state:
    st.session_state.editor_code = ""
if "backend_ready" not in st.session_state:
    st.session_state.backend_ready = {"grading_enabled": False}

st.markdown(
    """
    <style>
    .main { background: #f6f7fb; }
    .block-container { padding-top: 2rem; }
    .card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .small-label { color: #6b7280; font-size: 0.85rem; }
    .result-box {
        background: #0b0f16;
        border: 1px solid #1f2937;
        border-radius: 12px;
        padding: 12px;
        color: #e5e7eb;
    }
    .status-good {
        background: #16a34a;
        color: white;
        padding: 12px;
        border-radius: 8px;
        text-align: center;
        font-weight: 600;
    }
    .status-bad {
        background: #dc2626;
        color: white;
        padding: 12px;
        border-radius: 8px;
        text-align: center;
        font-weight: 600;
    }
    .status-neutral {
        background: #6b7280;
        color: white;
        padding: 12px;
        border-radius: 8px;
        text-align: center;
        font-weight: 600;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def fetch_backend_ready(backend_url: str) -> dict:
    try:
        response = requests.get(f"{backend_url}/ready", timeout=5)
        response.raise_for_status()
        payload = response.json()
        st.session_state.backend_ready = payload
        return payload
    except Exception as exc:
        payload = {"grading_enabled": False, "error": str(exc)}
        st.session_state.backend_ready = payload
        return payload


def render_code_editor(value: str, key: str, height: int) -> str:
    if st_ace is not None:
        rendered = st_ace(
            value=value,
            language="python",
            theme=ACE_THEME,
            height=height,
            key=key,
            auto_update=True,
            wrap=True,
            font_size=14,
            show_gutter=True,
        )
        return rendered if rendered is not None else value

    return st.text_area("OCR Result", value=value, height=height, key=f"{key}_textarea")


st.sidebar.header("Configuration")
st.sidebar.markdown("**Phase 1 Model (Detection)**")
phase1 = st.sidebar.selectbox("Detection model", ["YOLOv8"], index=0, label_visibility="collapsed")

st.sidebar.markdown("**Phase 2 Model (Recognition)**")
phase2 = st.sidebar.selectbox("Recognition model", ["TrOCR Base"], index=0, label_visibility="collapsed")

backend_url = st.sidebar.text_input("Backend URL", value=DEFAULT_BACKEND).rstrip("/")
ready_payload = fetch_backend_ready(backend_url)

if ready_payload.get("error"):
    st.sidebar.error(f"Backend unavailable: {ready_payload['error']}")
else:
    st.sidebar.success(
        f"Backend: {ready_payload['status']} | models_loaded={ready_payload['models_loaded']} | device={ready_payload.get('device')}"
    )

st.sidebar.info("Tip: Frontend only handles upload, preview, and API rendering.")

st.title("✍️ Handwritten Code Grader Pipeline")

if ready_payload.get("load_error"):
    st.error(ready_payload["load_error"])

st.markdown("### 1. Source Document")

result = st.session_state.ocr_result
left, right = st.columns([1.05, 1])

with left:
    st.markdown("<div class='card'>", unsafe_allow_html=True)
    st.markdown("<div class='small-label'>Upload handwritten image</div>", unsafe_allow_html=True)
    uploaded = st.file_uploader("Upload image", type=["png", "jpg", "jpeg"], label_visibility="collapsed")

    if result and result.get("visualization_path"):
        try:
            viz_response = requests.get(f"{backend_url}{result['visualization_path']}", timeout=30)
            viz_response.raise_for_status()
            st.image(
                Image.open(BytesIO(viz_response.content)),
                caption="Detection / classification visualization",
                use_container_width=True,
            )
        except Exception as exc:
            st.warning(f"Could not load visualization: {exc}")
            if uploaded is not None:
                st.image(Image.open(uploaded).convert("RGB"), use_container_width=True)
    elif uploaded is not None:
        st.image(Image.open(uploaded).convert("RGB"), use_container_width=True)
    else:
        st.markdown("<div class='small-label'>Drag and drop file here</div>", unsafe_allow_html=True)

    run_ocr = st.button("🚀 Run OCR", type="primary", use_container_width=True, disabled=uploaded is None)

    if run_ocr and uploaded is not None:
        files = {"file": (uploaded.name, uploaded.getvalue(), uploaded.type or "application/octet-stream")}
        try:
            with st.spinner("Detecting, classifying, and OCR..."):
                response = requests.post(f"{backend_url}/api/ocr/predict", files=files, timeout=180)
                response.raise_for_status()
                st.session_state.ocr_result = response.json()
                st.session_state.editor_code = st.session_state.ocr_result.get("recognized_text", "")
                st.session_state.grade_result = None
                st.rerun()
        except requests.HTTPError as exc:
            detail = exc.response.text if exc.response is not None else str(exc)
            st.error(f"OCR request failed: {detail}")
        except Exception as exc:
            st.error(f"OCR request failed: {exc}")

    st.markdown("</div>", unsafe_allow_html=True)

with right:
    st.markdown("<div class='card'>", unsafe_allow_html=True)
    st.markdown("<div class='small-label'>2. Digitized Code Review</div>", unsafe_allow_html=True)
    result = st.session_state.ocr_result
    recognized_text = result["recognized_text"] if result else ""
    if result and recognized_text != st.session_state.editor_code:
        st.session_state.editor_code = recognized_text

    st.session_state.editor_code = render_code_editor(
        value=st.session_state.editor_code,
        key=f"digitized_code_editor_{result.get('request_id', 'empty') if result else 'empty'}",
        height=ACE_HEIGHT,
    )
    st.markdown("</div>", unsafe_allow_html=True)

st.markdown("### 3. Testing & Grading")

grading_enabled = bool(ready_payload.get("grading_enabled"))
input_col, output_col, run_col = st.columns([1, 1, 0.6])

with input_col:
    st.markdown("<div class='small-label'>Test Input (e.g., [1,2,3])</div>", unsafe_allow_html=True)
    test_input = st.text_input("Test input", value="[1, 2, 3]", label_visibility="collapsed", disabled=not grading_enabled)

with output_col:
    st.markdown("<div class='small-label'>Expected Output</div>", unsafe_allow_html=True)
    expected_output = st.text_input("Expected output", value="6", label_visibility="collapsed", disabled=not grading_enabled)

with run_col:
    st.markdown("<div style='height: 22px'></div>", unsafe_allow_html=True)
    run_grade = st.button("🚀 Run & Grade", type="primary", use_container_width=True, disabled=(not grading_enabled or not st.session_state.editor_code.strip()))

if not grading_enabled:
    st.caption("Grading is disabled by backend config.")

if run_grade:
    try:
        response = requests.post(
            f"{backend_url}/api/grade/run",
            json={
                "code": st.session_state.editor_code,
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

st.markdown("#### Execution Result")

grade_result = st.session_state.grade_result or {}
last_result = grade_result.get("result", "Upload an image to start")
code_status = grade_result.get("code_status")
test_status = grade_result.get("test_status")
num_functions = grade_result.get("num_functions")

st.markdown("<div class='result-box'>", unsafe_allow_html=True)
st.code(last_result)
st.markdown("</div>", unsafe_allow_html=True)

if code_status or test_status:
    if num_functions:
        st.info(f"ℹ️ Found {num_functions} function(s). Testing first one.")

    col1, col2 = st.columns(2)
    with col1:
        if code_status == "good":
            st.markdown("<div class='status-good'>✅ GOOD CODE</div>", unsafe_allow_html=True)
        elif code_status:
            st.markdown("<div class='status-bad'>❌ BAD CODE</div>", unsafe_allow_html=True)

    with col2:
        if test_status == "passed":
            st.markdown("<div class='status-good'>✅ TEST PASSED</div>", unsafe_allow_html=True)
        elif test_status == "failed":
            st.markdown("<div class='status-bad'>❌ TEST FAILED</div>", unsafe_allow_html=True)
        elif test_status:
            st.markdown("<div class='status-neutral'>⚪ TEST NOT RUN</div>", unsafe_allow_html=True)

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

st.caption(f"Models: {phase1} + {phase2}")
