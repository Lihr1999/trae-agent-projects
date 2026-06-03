def test_create_event(client, auth_headers):
    response = client.post(
        "/api/v1/events",
        json={
            "event_type": "fire_detected",
            "description": "检测到火灾",
            "operator_name": "testuser",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["event_type"] == "fire_detected"


def test_list_events(client, auth_headers):
    client.post(
        "/api/v1/events",
        json={"event_type": "fire_detected", "description": "火灾1"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/events",
        json={"event_type": "evacuation_started", "description": "疏散开始"},
        headers=auth_headers,
    )
    response = client.get("/api/v1/events", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 2


def test_filter_events_by_type(client, auth_headers):
    client.post(
        "/api/v1/events",
        json={"event_type": "fire_detected", "description": "火灾"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/events",
        json={"event_type": "vehicle_dispatched", "description": "车辆调度"},
        headers=auth_headers,
    )
    response = client.get("/api/v1/events?event_type=fire_detected", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 1
    assert data["data"][0]["event_type"] == "fire_detected"


def test_get_timeline(client, auth_headers):
    client.post(
        "/api/v1/events",
        json={"event_type": "drill_start", "description": "演练开始"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/events",
        json={"event_type": "fire_detected", "description": "火灾发现"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/events",
        json={"event_type": "evacuation_started", "description": "疏散开始"},
        headers=auth_headers,
    )
    response = client.get("/api/v1/events/timeline", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 3


def test_update_event(client, auth_headers):
    create_resp = client.post(
        "/api/v1/events",
        json={"event_type": "fire_detected", "description": "原始描述"},
        headers=auth_headers,
    )
    event_id = create_resp.json()["data"]["id"]
    response = client.put(
        f"/api/v1/events/{event_id}",
        json={"description": "更新后的描述"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["data"]["description"] == "更新后的描述"


def test_get_nonexistent_event(client, auth_headers):
    response = client.get("/api/v1/events/99999", headers=auth_headers)
    assert response.status_code == 404
