from app.models.models import Building


def test_create_building(client, auth_headers):
    response = client.post(
        "/api/v1/buildings",
        json={
            "name": "测试建筑",
            "position_x": 10.0,
            "position_y": 20.0,
            "position_z": 0.0,
            "size_x": 30.0,
            "size_y": 20.0,
            "size_z": 45.0,
            "building_type": "office",
            "risk_level": "low",
            "status": "normal",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "测试建筑"
    assert data["data"]["position_x"] == 10.0


def test_list_buildings(client, auth_headers):
    for i in range(3):
        client.post(
            "/api/v1/buildings",
            json={"name": f"建筑{i}", "building_type": "office"},
            headers=auth_headers,
        )
    response = client.get("/api/v1/buildings", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 3


def test_get_building(client, auth_headers):
    create_resp = client.post(
        "/api/v1/buildings",
        json={"name": "获取测试建筑", "building_type": "school"},
        headers=auth_headers,
    )
    building_id = create_resp.json()["data"]["id"]
    response = client.get(f"/api/v1/buildings/{building_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["name"] == "获取测试建筑"


def test_update_building(client, auth_headers):
    create_resp = client.post(
        "/api/v1/buildings",
        json={"name": "更新前", "building_type": "office"},
        headers=auth_headers,
    )
    building_id = create_resp.json()["data"]["id"]
    response = client.put(
        f"/api/v1/buildings/{building_id}",
        json={"name": "更新后", "risk_level": "high"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["name"] == "更新后"
    assert data["data"]["risk_level"] == "high"


def test_delete_building(client, auth_headers):
    create_resp = client.post(
        "/api/v1/buildings",
        json={"name": "待删除建筑", "building_type": "office"},
        headers=auth_headers,
    )
    building_id = create_resp.json()["data"]["id"]
    response = client.delete(f"/api/v1/buildings/{building_id}", headers=auth_headers)
    assert response.status_code == 200
    get_resp = client.get(f"/api/v1/buildings/{building_id}", headers=auth_headers)
    assert get_resp.status_code == 404


def test_risk_assessment(client, auth_headers, db_session):
    from app.models.models import Floor, Exit
    create_resp = client.post(
        "/api/v1/buildings",
        json={"name": "风险评估建筑", "building_type": "office", "risk_level": "medium"},
        headers=auth_headers,
    )
    building_id = create_resp.json()["data"]["id"]
    floor = Floor(building_id=building_id, floor_number=1, area=600.0, max_capacity=100, current_people=80)
    db_session.add(floor)
    db_session.flush()
    exit1 = Exit(building_id=building_id, floor_id=floor.id, position_x=0, position_y=0, position_z=0, width=2.0, status="normal")
    db_session.add(exit1)
    db_session.commit()

    response = client.get(f"/api/v1/buildings/{building_id}/risk-assessment", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "risk_score" in data["data"]
    assert "risk_level" in data["data"]


def test_get_nonexistent_building(client, auth_headers):
    response = client.get("/api/v1/buildings/99999", headers=auth_headers)
    assert response.status_code == 404
