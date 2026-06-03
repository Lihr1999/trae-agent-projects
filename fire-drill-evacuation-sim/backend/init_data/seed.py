import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, Building, Floor, Exit, Road,
    PeopleGroup, RescueVehicle
)

Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    existing = db.query(User).filter(User.username == "admin").first()
    if not existing:
        admin = User(username="admin", hashed_password=get_password_hash("admin123"), is_active=True)
        db.add(admin)
        db.commit()
        print("管理员用户已创建: admin/admin123")
    else:
        print("管理员用户已存在，跳过创建")

    if db.query(Building).count() == 0:
        buildings_data = [
            {"name": "A栋办公楼", "position_x": 0.0, "position_y": 0.0, "position_z": 0.0, "size_x": 30.0, "size_y": 20.0, "size_z": 45.0, "building_type": "office", "risk_level": "medium", "status": "normal"},
            {"name": "B栋教学楼", "position_x": 50.0, "position_y": 0.0, "position_z": 0.0, "size_x": 40.0, "size_y": 25.0, "size_z": 30.0, "building_type": "school", "risk_level": "low", "status": "normal"},
            {"name": "C栋实验楼", "position_x": 100.0, "position_y": 0.0, "position_z": 0.0, "size_x": 25.0, "size_y": 20.0, "size_z": 36.0, "building_type": "laboratory", "risk_level": "high", "status": "normal"},
            {"name": "D栋宿舍楼", "position_x": 0.0, "position_y": 50.0, "position_z": 0.0, "size_x": 35.0, "size_y": 15.0, "size_z": 54.0, "building_type": "dormitory", "risk_level": "medium", "status": "normal"},
            {"name": "E栋图书馆", "position_x": 50.0, "position_y": 50.0, "position_z": 0.0, "size_x": 45.0, "size_y": 30.0, "size_z": 24.0, "building_type": "library", "risk_level": "medium", "status": "normal"},
            {"name": "F栋食堂", "position_x": 100.0, "position_y": 50.0, "position_z": 0.0, "size_x": 30.0, "size_y": 25.0, "size_z": 12.0, "building_type": "canteen", "risk_level": "low", "status": "normal"},
        ]

        buildings = []
        for bd in buildings_data:
            b = Building(**bd)
            db.add(b)
            db.flush()
            buildings.append(b)

        for b in buildings:
            num_floors = int(b.size_z / 3)
            for floor_num in range(1, num_floors + 1):
                floor = Floor(
                    building_id=b.id,
                    floor_number=floor_num,
                    area=b.size_x * b.size_y,
                    max_capacity=int(b.size_x * b.size_y * 0.5),
                    current_people=int(b.size_x * b.size_y * 0.3) if floor_num <= 3 else int(b.size_x * b.size_y * 0.15),
                )
                db.add(floor)
                db.flush()

                exit1 = Exit(
                    building_id=b.id,
                    floor_id=floor.id,
                    position_x=b.position_x,
                    position_y=b.position_y,
                    position_z=floor_num * 3.0,
                    width=2.0,
                    status="normal"
                )
                exit2 = Exit(
                    building_id=b.id,
                    floor_id=floor.id,
                    position_x=b.position_x + b.size_x,
                    position_y=b.position_y + b.size_y,
                    position_z=floor_num * 3.0,
                    width=1.8,
                    status="normal"
                )
                db.add(exit1)
                db.add(exit2)

        db.flush()
        print(f"已创建{len(buildings)}栋建筑，含楼层和出口")

    if db.query(Road).count() == 0:
        roads_data = [
            {"start_x": 30.0, "start_y": 10.0, "start_z": 0.0, "end_x": 50.0, "end_y": 10.0, "end_z": 0.0, "width": 8.0, "connected_buildings": [1, 2]},
            {"start_x": 75.0, "start_y": 10.0, "start_z": 0.0, "end_x": 100.0, "end_y": 10.0, "end_z": 0.0, "width": 6.0, "connected_buildings": [2, 3]},
            {"start_x": 15.0, "start_y": 20.0, "start_z": 0.0, "end_x": 15.0, "end_y": 50.0, "end_z": 0.0, "width": 8.0, "connected_buildings": [1, 4]},
            {"start_x": 70.0, "start_y": 25.0, "start_z": 0.0, "end_x": 70.0, "end_y": 50.0, "end_z": 0.0, "width": 6.0, "connected_buildings": [2, 5]},
            {"start_x": 112.5, "start_y": 20.0, "start_z": 0.0, "end_x": 112.5, "end_y": 50.0, "end_z": 0.0, "width": 6.0, "connected_buildings": [3, 6]},
            {"start_x": 15.0, "start_y": 50.0, "start_z": 0.0, "end_x": 50.0, "end_y": 65.0, "end_z": 0.0, "width": 8.0, "connected_buildings": [4, 5]},
            {"start_x": 70.0, "start_y": 65.0, "start_z": 0.0, "end_x": 100.0, "end_y": 62.0, "end_z": 0.0, "width": 6.0, "connected_buildings": [5, 6]},
            {"start_x": 50.0, "start_y": -10.0, "start_z": 0.0, "end_x": 50.0, "end_y": 65.0, "end_z": 0.0, "width": 10.0, "connected_buildings": [1, 2, 4, 5]},
        ]

        for rd in roads_data:
            road = Road(**rd)
            db.add(road)

        db.flush()
        print(f"已创建{len(roads_data)}条道路")

    if db.query(PeopleGroup).count() == 0:
        people_data = [
            {"name": "A栋一层办公人员", "count": 45, "position_x": 15.0, "position_y": 10.0, "position_z": 0.0, "move_speed": 1.2, "evacuation_priority": 2, "status": "stationary"},
            {"name": "C栋实验室人员", "count": 30, "position_x": 112.5, "position_y": 10.0, "position_z": 0.0, "move_speed": 1.0, "evacuation_priority": 1, "status": "stationary"},
            {"name": "D栋宿舍人员", "count": 80, "position_x": 15.0, "position_y": 57.5, "position_z": 0.0, "move_speed": 0.8, "evacuation_priority": 3, "status": "stationary"},
            {"name": "E栋图书馆读者", "count": 60, "position_x": 72.5, "position_y": 65.0, "position_z": 0.0, "move_speed": 1.1, "evacuation_priority": 2, "status": "stationary"},
        ]

        for pd in people_data:
            pg = PeopleGroup(**pd)
            db.add(pg)

        db.flush()
        print(f"已创建{len(people_data)}个人员组")

    if db.query(RescueVehicle).count() == 0:
        vehicles_data = [
            {"vehicle_type": "fire_truck", "vehicle_number": "消防001", "position_x": -20.0, "position_y": 25.0, "position_z": 0.0, "status": "idle", "max_speed": 80.0, "capacity": 8},
            {"vehicle_type": "ambulance", "vehicle_number": "救护001", "position_x": -20.0, "position_y": 35.0, "position_z": 0.0, "status": "idle", "max_speed": 100.0, "capacity": 4},
            {"vehicle_type": "command_car", "vehicle_number": "指挥001", "position_x": -20.0, "position_y": 45.0, "position_z": 0.0, "status": "idle", "max_speed": 120.0, "capacity": 6},
        ]

        for vd in vehicles_data:
            vehicle = RescueVehicle(**vd)
            db.add(vehicle)

        db.flush()
        print(f"已创建{len(vehicles_data)}辆救援车辆")

    db.commit()
    print("\n数据库初始化完成！")

finally:
    db.close()
