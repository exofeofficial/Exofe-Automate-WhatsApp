FROM python:3.12-slim

# uv handles dependency resolution/install from pyproject.toml + uv.lock —
# this is the official way to get the uv binary into a Docker build.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Dependencies first so this layer is cached and only rebuilds when
# pyproject.toml/uv.lock actually change, not on every code edit.
# --no-install-project: this is an application (no [build-system] in
# pyproject.toml), not an installable package — only its dependencies
# need to land in .venv, never the backend source itself.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY . .

ENV PATH="/app/.venv/bin:$PATH"

# Koyeb (like most PaaS) injects PORT at runtime rather than using a fixed
# port — default to 8000 for any environment that doesn't set it.
ENV PORT=8000
EXPOSE 8000

CMD uv run --no-project uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
