def test_create_fire(client, auth_headers):
    response = client.post(
        "/api/v1/fires",
        json={
            "position_x": 50.0,
            "position_y": 25.0,
            "position_z": 0.0,
            "fire_level": 3,
            "spread_speed": 1.5,
            "affected_radius": 20.0,
            "status": "active",
            "weather_condition": "clear",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["fire_level"] == 3
    assert data["data"]["status"] == "active"


def test_list_fires(client, auth_headers):
    client.post(
        "/api/v1/fires",
        json={"fire_level": 1, "spread_speed": 1.0, "affected_radius": 10.0},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/fires",
        json={"fire_level": 2, "spread_speed": 2.0, "affected_radius": 15.0},
        headers=auth_headers,
    )
    response = client.get("/api/v1/fires", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 2


def test_get_fire(client, auth_headers):
    create_resp = client.post(
        "/api/v1/fires",
        json={"fire_level": 4, "spread_speed": 2.5, "affected_radius": 30.0},
        headers=auth_headers,
    )
    fire_id = create_resp.json()["data"]["id"]
    response = client.get(f"/api/v1/fires/{fire_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["data"]["fire_level"] == 4


def test_contain_fire(client, auth_headers):
    create_resp = client.post(
        "/api/v1/fires",
        json={"fire_level": 3, "status": "active"},
        headers=auth_headers,
    )
    fire_id = create_resp.json()["data"]["id"]
    response = client.post(f"/api/v1/fires/{fire_id}/contain", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "contained"


def test_extinguish_fire(client, auth_headers):
    create_resp = client.post(
        "/api/v1/fires",
        json={"fire_level": 2, "status": "active"},
        headers=auth_headers,
    )
    fire_id = create_resp.json()["data"]["id"]
    response = client.post(f"/api/v1/fires/{fire_id}/extinguish", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "extinguished"


def test_spread_calculation(client, auth_headers):
    create_resp = client.post(
        "/api/v1/fires",
        json={"fire_level": 3, "spread_speed": 2.0, "affected_radius": 15.0, "weather_condition": "clear"},
        headers=auth_headers,
    )
    fire_id = create_resp.json()["data"]["id"]
    response = client.post(
        f"/api/v1/fires/{fire_id}/spread-calculation",
        json={"fire_incident_id": fire_id, "elapsed_minutes": 10.0, "weather_condition": "clear"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "new_radius" in data["data"]
    assert data["data"]["new_radius"] > 15.0


def test_delete_fire(client, auth_headers):
    create_resp = client.post(
        "/api/v1/fires",
        json={"fire_level": 1},
        headers=auth_headers,
    )
    fire_id = create_resp.json()["data"]["id"]
    response = client.delete(f"/api/v1/fires/{fire_id}", headers=auth_headers)
    assert response.status_code == 200
