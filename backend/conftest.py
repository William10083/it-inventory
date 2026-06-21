"""
Pytest fixtures for the IT Inventory backend.

The `db` fixture runs every test inside a connection-bound outer transaction
that is ALWAYS rolled back in teardown. It binds against the REAL local
`it_inventory` Postgres database via the already-configured `database.engine`,
so no data the test writes is ever persisted — even if the code under test
calls `session.commit()` (that only RELEASEs a SAVEPOINT, never the outer tx).
"""
import pytest
from sqlalchemy import event
from sqlalchemy.orm import Session

import database
from main import app
from database import get_db


@pytest.fixture()
def db():
    connection = database.engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, autoflush=False, expire_on_commit=False)
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, trans):
        if trans.nested and not trans._parent.nested:
            sess.begin_nested()

    try:
        yield session
    finally:
        event.remove(session, "after_transaction_end", _restart_savepoint)
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db):
    """TestClient with get_db overridden to yield the rollback-bound session."""
    from fastapi.testclient import TestClient

    def _override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
