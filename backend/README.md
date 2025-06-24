# Backend

This directory contains the FastAPI application. It uses SQLite as a simple storage backend.

Run the development server with:

```bash
# install dependencies using uv
uv pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API schema is documented in `../docs/api_schema.md`.
