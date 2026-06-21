# Testing

This repo has two independent test suites: a Python/pytest suite for the
FastAPI backend, and a Vitest suite for the React frontend.

## Backend (pytest)

```bash
cd backend
pip install -r requirements-dev.txt
pytest -v
```

`requirements-dev.txt` installs the production dependencies (`-r requirements.txt`)
plus `pytest` and `httpx`. Production `requirements.txt` is never modified by
test tooling.

### Database safety — read this before adding new tests

Backend tests run against the **real local `it_inventory` PostgreSQL database**
configured via the same env vars `database.py` already uses
(`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`). There is no
separate test database.

This is safe because every test that uses the `db` fixture (see
`backend/conftest.py`) runs inside a single outer transaction opened directly
on a raw connection, with an inner SAVEPOINT nested inside it. The session
handed to test code (and to the app via the `client` fixture's `get_db`
override) is bound to that connection.

This means:

- When application code calls `session.commit()`, SQLAlchemy only releases
  the current SAVEPOINT — it does **not** commit the outer transaction.
- A listener on `after_transaction_end` immediately reopens a new SAVEPOINT
  after each release, so the session keeps behaving normally across multiple
  commits within the same test.
- In fixture teardown, the **outer transaction is always rolled back** and the
  connection is closed, regardless of whether the test passed, failed, or
  raised.

Net effect: no row ever written during a test is persisted to the real
database, even though the code under test believes it successfully committed.

If you write a new test that touches the database, use the `db` fixture (or
`client`, which wraps it for FastAPI endpoint tests) — do not instantiate
`database.SessionLocal()` directly, since that session is NOT wrapped in the
rollback transaction.

## Frontend (vitest)

```bash
cd frontend
npm install
npm test
```

`npm test` runs `vitest run` (single pass, CI-friendly). Use `npm run test:watch`
for interactive watch mode during development.
