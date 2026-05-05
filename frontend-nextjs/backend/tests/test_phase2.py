"""
Phase 2 smoke tests — auth, watchlist, quota.
Run with: pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    """Sign up a test user and return auth headers."""
    import time
    email = f"test_{int(time.time())}@example.com"
    r = client.post("/api/auth/signup", json={
        "email": email,
        "password": "TestPass123!",
        "full_name": "Test User",
    })
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert "database" in r.json()["services"]


def test_signup_login_flow(client):
    import time
    email = f"flow_{int(time.time())}@test.com"

    # Signup
    r = client.post("/api/auth/signup", json={
        "email": email, "password": "Pass1234!",
    })
    assert r.status_code == 201
    assert "access_token" in r.json()

    # Duplicate signup → 409
    r = client.post("/api/auth/signup", json={
        "email": email, "password": "Pass1234!",
    })
    assert r.status_code == 409

    # Login
    r = client.post("/api/auth/login", json={
        "email": email, "password": "Pass1234!",
    })
    assert r.status_code == 200
    tokens = r.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # Wrong password
    r = client.post("/api/auth/login", json={
        "email": email, "password": "wrong",
    })
    assert r.status_code == 401


def test_me_requires_auth(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_with_auth(client, auth_headers):
    r = client.get("/api/auth/me", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert "email" in body
    assert body["tier"] == "free"


def test_my_limits(client, auth_headers):
    r = client.get("/api/auth/me/limits", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["tier"] == "free"
    assert body["daily_quota"] > 0


def test_watchlist_crud(client, auth_headers):
    # Empty
    r = client.get("/api/watchlist", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []

    # Add
    r = client.post(
        "/api/watchlist",
        headers=auth_headers,
        json={"symbol": "AAPL", "notes": "test"},
    )
    assert r.status_code == 201
    item_id = r.json()["id"]

    # Duplicate add → 409
    r = client.post(
        "/api/watchlist",
        headers=auth_headers,
        json={"symbol": "AAPL"},
    )
    assert r.status_code == 409

    # List
    r = client.get("/api/watchlist", headers=auth_headers)
    assert len(r.json()) == 1
    assert r.json()[0]["symbol"] == "AAPL"

    # Update
    r = client.patch(
        f"/api/watchlist/{item_id}",
        headers=auth_headers,
        json={"notes": "updated", "target_price": 200.0},
    )
    assert r.status_code == 200
    assert r.json()["target_price"] == 200.0

    # Delete
    r = client.delete(f"/api/watchlist/{item_id}", headers=auth_headers)
    assert r.status_code == 204

    # Empty again
    r = client.get("/api/watchlist", headers=auth_headers)
    assert r.json() == []


def test_watchlist_requires_auth(client):
    r = client.get("/api/watchlist")
    assert r.status_code == 401


def test_invalid_symbol_rejected(client, auth_headers):
    r = client.post(
        "/api/watchlist",
        headers=auth_headers,
        json={"symbol": "lower-case"},  # fails pattern
    )
    assert r.status_code == 422


def test_security_headers(client):
    r = client.get("/")
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("X-Frame-Options") == "DENY"


def test_request_id_header(client):
    r = client.get("/")
    assert "x-request-id" in {k.lower() for k in r.headers}
