from app.models.models import RescueVehicle, FireIncident


def test_manual_dispatch(client, auth_headers, db_session):
    vehicle = RescueVehicle(vehicle_type="fire_truck", vehicle_number="TEST-001", status="idle", max_speed=80.0, capacity=8)
    db_session.add(vehicle)
    db_session.commit()
    db_session.refresh(vehicle)

    response = client.post(
        "/api/v1/dispatch/manual",
        json={
            "vehicle_id": vehicle.id,
            "task_type": "fire_suppression",
            "target_x": 50.0,
            "target_y": 25.0,
            "target_z": 0.0,
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["task_type"] == "fire_suppression"


def test_auto_dispatch(client, auth_headers, db_session):
    vehicle1 = RescueVehicle(vehicle_type="fire_truck", vehicle_number="AUTO-FT-01", status="idle", max_speed=80.0, capacity=8)
    vehicle2 = RescueVehicle(vehicle_type="ambulance", vehicle_number="AUTO-AM-01", status="idle", max_speed=100.0, capacity=4)
    vehicle3 = RescueVehicle(vehicle_type="command_car", vehicle_number="AUTO-CC-01", status="idle", max_speed=120.0, capacity=6)
    db_session.add_all([vehicle1, vehicle2, vehicle3])

    fire = FireIncident(position_x=50.0, position_y=25.0, position_z=0.0, fire_level=3, spread_speed=1.5, affected_radius=20.0, status="active")
    db_session.add(fire)
    db_session.commit()
    db_session.refresh(fire)

    response = client.post(
        f"/api/v1/dispatch/auto?fire_incident_id={fire.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0


def test_list_dispatch_tasks(client, auth_headers, db_session):
    vehicle = RescueVehicle(vehicle_type="fire_truck", vehicle_number="LIST-01", status="idle", max_speed=80.0, capacity=8)
    db_session.add(vehicle)
    db_session.commit()
    db_session.refresh(vehicle)

    client.post(
        "/api/v1/dispatch/manual",
        json={"vehicle_id": vehicle.id, "task_type": "fire_suppression", "target_x": 10.0, "target_y": 10.0},
        headers=auth_headers,
    )

    response = client.get("/api/v1/dispatch/tasks", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1


def test_get_vehicle_route(client, auth_headers, db_session):
    vehicle = RescueVehicle(vehicle_type="fire_truck", vehicle_number="ROUTE-01", position_x=0.0, position_y=0.0, status="idle", max_speed=80.0, capacity=8)
    db_session.add(vehicle)
    db_session.commit()
    db_session.refresh(vehicle)

    response = client.get(
        f"/api/v1/dispatch/vehicle/{vehicle.id}/route?target_x=100.0&target_y=50.0&target_z=0.0",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["found"] is True
    assert "distance" in data["data"]


def test_dispatch_conflict(client, auth_headers, db_session):
    vehicle = RescueVehicle(vehicle_type="fire_truck", vehicle_number="CONFLICT-01", status="idle", max_speed=80.0, capacity=8)
    db_session.add(vehicle)
    db_session.commit()
    db_session.refresh(vehicle)

    client.post(
        "/api/v1/dispatch/manual",
        json={"vehicle_id": vehicle.id, "task_type": "fire_suppression", "target_x": 10.0, "target_y": 10.0},
        headers=auth_headers,
    )

    second_dispatch = client.post(
        "/api/v1/dispatch/manual",
        json={"vehicle_id": vehicle.id, "task_type": "rescue", "target_x": 20.0, "target_y": 20.0},
        headers=auth_headers,
    )
    assert second_dispatch.status_code in (400, 409)
