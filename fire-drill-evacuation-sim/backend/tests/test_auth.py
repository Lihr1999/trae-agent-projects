def test_register(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "newuser", "password": "newpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["username"] == "newuser"


def test_login(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["token_type"] == "bearer"


def test_login_wrong_password(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_register_duplicate(client, test_user):
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "testuser", "password": "anotherpass"},
    )
    assert response.status_code == 400


def test_unauthorized_access(client):
    response = client.get("/api/v1/buildings")
    assert response.status_code == 401
