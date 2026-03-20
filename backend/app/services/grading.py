import ast
import json

from app.core.config import Settings

BLACKLISTED_KEYWORDS = [
    "__import__",
    "exec",
    "eval",
    "compile",
    "open",
    "input",
    "subprocess",
    "os.system",
]


def validate_code(code: str) -> tuple[bool, str]:
    if not code or not code.strip():
        return False, "Code cannot be empty"

    code_upper = code.upper()
    for keyword in BLACKLISTED_KEYWORDS:
        if keyword.upper() in code_upper:
            return False, f"Dangerous operation not allowed: {keyword}"
    return True, ""


def run_grade_demo(code: str, test_input: str, expected_output: str, settings: Settings) -> dict:
    is_valid, error_message = validate_code(code)
    if not is_valid:
        return {
            "success": False,
            "result": f"Validation error: {error_message}",
            "code_status": "bad",
            "test_status": "failed",
            "num_functions": 0,
            "error": error_message,
        }

    exec_globals = {
        "__builtins__": {
            "range": range,
            "len": len,
            "list": list,
            "dict": dict,
            "str": str,
            "int": int,
            "float": float,
            "bool": bool,
            "print": print,
            "sum": sum,
        }
    }
    exec_locals: dict = {}

    try:
        exec(code, exec_globals, exec_locals)
    except SyntaxError as exc:
        return {
            "success": False,
            "result": f"Syntax error: {exc}",
            "code_status": "bad",
            "test_status": "failed",
            "num_functions": 0,
            "error": str(exc),
        }
    except Exception as exc:
        return {
            "success": False,
            "result": f"Execution error: {exc}",
            "code_status": "bad",
            "test_status": "failed",
            "num_functions": 0,
            "error": str(exc),
        }

    functions = [name for name, value in exec_locals.items() if callable(value) and not name.startswith("_")]
    if not functions:
        return {
            "success": True,
            "result": "Code compiled, but no function found",
            "code_status": "good",
            "test_status": "not_run",
            "num_functions": 0,
            "error": None,
        }

    try:
        parsed_input = ast.literal_eval(test_input)
    except Exception:
        return {
            "success": False,
            "result": f"Invalid test input format: {test_input}",
            "code_status": "good",
            "test_status": "failed",
            "num_functions": len(functions),
            "error": "Invalid test input format",
        }

    try:
        expected_value = ast.literal_eval(expected_output)
    except Exception:
        expected_value = expected_output

    function = exec_locals[functions[0]]
    try:
        if isinstance(parsed_input, (list, tuple)):
            result = function(*parsed_input)
        else:
            result = function(parsed_input)
    except TypeError as exc:
        return {
            "success": False,
            "result": f"Function signature mismatch: {exc}",
            "code_status": "good",
            "test_status": "failed",
            "num_functions": len(functions),
            "error": str(exc),
        }
    except Exception as exc:
        return {
            "success": False,
            "result": f"Runtime error: {exc}",
            "code_status": "good",
            "test_status": "failed",
            "num_functions": len(functions),
            "error": str(exc),
        }

    result_text = json.dumps(result) if isinstance(result, (dict, list, tuple, bool, int, float, str, type(None))) else str(result)
    expected_text = json.dumps(expected_value) if isinstance(expected_value, (dict, list, tuple, bool, int, float, str, type(None))) else str(expected_value)
    test_status = "passed" if result_text == expected_text else "failed"
    return {
        "success": True,
        "result": str(result),
        "code_status": "good",
        "test_status": test_status,
        "num_functions": len(functions),
        "error": None,
    }
