"""Real DB test: create a User row inside the rollback-bound session.

Proves the test transaction performs a genuine INSERT against the real
`it_inventory` database and reads it back — then the fixture rolls it back,
so nothing persists.
"""
import models
import auth


def test_create_user_persists_within_transaction(db):
    username = "pytest_rollback_probe_user"

    assert db.query(models.User).filter_by(username=username).first() is None

    user = models.User(
        username=username,
        full_name="Pytest Probe",
        hashed_password=auth.get_password_hash("throwaway-pw-123"),
        role="user",
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    db.commit()

    fetched = db.query(models.User).filter_by(username=username).first()
    assert fetched is not None
    assert fetched.id is not None
    assert fetched.role == "user"
    assert fetched.is_active is True
