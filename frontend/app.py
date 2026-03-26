import json
from io import BytesIO

import requests
import streamlit as st
from PIL import Image

try:
    from streamlit_ace import st_ace
except Exception:
    st_ace = None


st.set_page_config(page_title="Handwritten Code Grader", layout="wide")

DEFAULT_BACKEND = "http://backend:8000"
ACE_THEME = "monokai"
ACE_HEIGHT = 480

if "ocr_result" not in st.session_state:
    st.session_state.ocr_result = None
if "grade_result" not in st.session_state:
    st.session_state.grade_result = None
if "grade_detail" not in st.session_state:
    st.session_state.grade_detail = None
if "grade_submission_id" not in st.session_state:
    st.session_state.grade_submission_id = ""
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


def fetch_submission_grade_detail(backend_url: str, submission_id: str) -> dict:
    response = requests.get(f"{backend_url}/api/grades/submission/{submission_id}", timeout=30)
    response.raise_for_status()
    return response.json()


def update_submission_page_ocr(backend_url: str, page_id: str, ocr_text: str) -> dict:
    response = requests.patch(
        f"{backend_url}/api/grades/submission-pages/{page_id}/ocr-text",
        json={"ocr_text": ocr_text},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def re_evaluate_submission_grade(backend_url: str, grade_id: str) -> dict:
    response = requests.post(
        f"{backend_url}/api/grades/{grade_id}/re-evaluate-ai",
        json={},
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


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
                image = Image.open(uploaded).convert("RGB")
                st.image(image, use_container_width=True)
    elif uploaded is not None:
        image = Image.open(uploaded).convert("RGB")
        st.image(image, use_container_width=True)
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

st.markdown("### 3. Submission Review & AI Grading")

grading_enabled = bool(ready_payload.get("grading_enabled"))
review_col, load_col = st.columns([1.4, 0.6])

with review_col:
    submission_id_input = st.text_input(
        "Submission ID",
        value=st.session_state.grade_submission_id,
        placeholder="Paste submission_id from /api/submit response",
        disabled=not grading_enabled,
    )

with load_col:
    st.markdown("<div style='height: 22px'></div>", unsafe_allow_html=True)
    load_submission = st.button(
        "Load Submission",
        type="primary",
        use_container_width=True,
        disabled=(not grading_enabled or not submission_id_input.strip()),
    )

if not grading_enabled:
    st.caption("Grading is disabled by backend config.")
else:
    st.caption("AI grading mới chạy theo submission review flow: load submission, sửa OCR text nếu cần, rồi re-evaluate AI.")

if load_submission:
    try:
        detail = fetch_submission_grade_detail(backend_url, submission_id_input.strip())
        st.session_state.grade_submission_id = submission_id_input.strip()
        st.session_state.grade_detail = detail
        pages = detail.get("pages", [])
        if pages:
            st.session_state.editor_code = pages[0].get("ocr_text", "")
        st.session_state.grade_result = None
        st.rerun()
    except requests.HTTPError as exc:
        detail = exc.response.text if exc.response is not None else str(exc)
        st.error(f"Load submission failed: {detail}")
    except Exception as exc:
        st.error(f"Load submission failed: {exc}")

grade_detail = st.session_state.grade_detail or {}
pages = grade_detail.get("pages", [])
grades = grade_detail.get("grades", [])
submission = grade_detail.get("submission", {})
current_page = pages[0] if pages else None
current_grade = grades[0] if grades else None

if grade_detail:
    info_col1, info_col2, info_col3 = st.columns(3)
    with info_col1:
        st.metric("Submission Status", submission.get("ocr_status", "-"))
    with info_col2:
        st.metric("AI Score", current_grade.get("ai_score", 0.0) if current_grade else 0.0)
    with info_col3:
        st.metric("AI Confidence", f"{(current_grade.get('ai_confidence', 0.0) if current_grade else 0.0) * 100:.1f}%")

    if current_grade and current_grade.get("question_text"):
        st.markdown("**Question Prompt**")
        st.write(current_grade["question_text"])

    action_col1, action_col2 = st.columns(2)
    with action_col1:
        save_ocr = st.button(
            "💾 Save OCR Text",
            use_container_width=True,
            disabled=not bool(current_page),
        )
    with action_col2:
        rerun_ai = st.button(
            "🤖 Re-evaluate AI",
            use_container_width=True,
            disabled=not bool(current_page and current_grade),
        )

    if save_ocr and current_page:
        try:
            update_submission_page_ocr(backend_url, current_page["id"], st.session_state.editor_code)
            refreshed = fetch_submission_grade_detail(backend_url, st.session_state.grade_submission_id)
            st.session_state.grade_detail = refreshed
            st.success("OCR text saved to submission.")
            st.rerun()
        except requests.HTTPError as exc:
            detail = exc.response.text if exc.response is not None else str(exc)
            st.error(f"Save OCR failed: {detail}")
        except Exception as exc:
            st.error(f"Save OCR failed: {exc}")

    if rerun_ai and current_page and current_grade:
        try:
            update_submission_page_ocr(backend_url, current_page["id"], st.session_state.editor_code)
            updated_grade = re_evaluate_submission_grade(backend_url, current_grade["id"])
            refreshed = fetch_submission_grade_detail(backend_url, st.session_state.grade_submission_id)
            st.session_state.grade_detail = refreshed
            st.session_state.grade_result = updated_grade
            st.success("AI re-evaluation completed.")
            st.rerun()
        except requests.HTTPError as exc:
            detail = exc.response.text if exc.response is not None else str(exc)
            st.error(f"AI re-evaluation failed: {detail}")
        except Exception as exc:
            st.error(f"AI re-evaluation failed: {exc}")
else:
    st.info("OCR upload ở trên chỉ chạy inference trực tiếp. Muốn dùng AI grading mới, hãy load một submission đã có trong hệ thống.")

st.markdown("#### AI Grading Result")

if current_grade:
    reasoning_raw = current_grade.get("ai_reasoning", "")
    st.markdown("<div class='result-box'>", unsafe_allow_html=True)
    if reasoning_raw:
        try:
            st.json(json.loads(reasoning_raw))
        except Exception:
            st.code(reasoning_raw)
    else:
        st.write("No AI reasoning available yet.")
    st.markdown("</div>", unsafe_allow_html=True)
else:
    st.markdown("<div class='result-box'>", unsafe_allow_html=True)
    st.write("Load a submission to inspect or re-evaluate AI grading.")
    st.markdown("</div>", unsafe_allow_html=True)

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
