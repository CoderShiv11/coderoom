import subprocess
import tempfile
import sys
import os

def execute_python(code: str, user_input: str = ""):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".py", mode="w", encoding="utf-8") as tmp:
        tmp.write(code)
        path = tmp.name

    try:
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"

        result = subprocess.run(
            [sys.executable, path],
            input=user_input,
            capture_output=True,
            text=True,
            timeout=3,
            env=env
        )

        return result.stdout.strip()

    except subprocess.TimeoutExpired:
        return "TIMEOUT"

    except Exception as e:
        return str(e)