import heapq
import math
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.models import RescueVehicle, DispatchTask, FireIncident, Road


class DispatchService:

    def calculate_optimal_route(self, db: Session, vehicle_id: int, target_x: float, target_y: float, target_z: float = 0.0) -> dict:
        vehicle = db.query(RescueVehicle).filter(RescueVehicle.id == vehicle_id).first()
        if not vehicle:
            return {"found": False, "message": "车辆不存在"}

        roads = db.query(Road).filter(Road.status == "clear").all()

        nodes = {}
        edges = {}

        nodes[vehicle.id * -1] = (vehicle.position_x, vehicle.position_y, vehicle.position_z)
        nodes[-999] = (target_x, target_y, target_z)

        for road in roads:
            start_key = f"road_{road.id}_s"
            end_key = f"road_{road.id}_e"
            nodes[start_key] = (road.start_x, road.start_y, road.start_z)
            nodes[end_key] = (road.end_x, road.end_y, road.end_z)

            dist = math.sqrt(
                (road.end_x - road.start_x) ** 2 +
                (road.end_y - road.start_y) ** 2 +
                (road.end_z - road.start_z) ** 2
            )
            edges.setdefault(start_key, []).append((end_key, dist))
            edges.setdefault(end_key, []).append((start_key, dist))

        vehicle_key = vehicle.id * -1
        for key, pos in nodes.items():
            if key == vehicle_key:
                continue
            dist = math.sqrt(
                (pos[0] - vehicle.position_x) ** 2 +
                (pos[1] - vehicle.position_y) ** 2 +
                (pos[2] - vehicle.position_z) ** 2
            )
            edges.setdefault(vehicle_key, []).append((key, dist))
            edges.setdefault(key, []).append((vehicle_key, dist))

        target_key = -999
        for key, pos in nodes.items():
            if key == target_key:
                continue
            dist = math.sqrt(
                (pos[0] - target_x) ** 2 +
                (pos[1] - target_y) ** 2 +
                (pos[2] - target_z) ** 2
            )
            edges.setdefault(key, []).append((target_key, dist))
            edges.setdefault(target_key, []).append((key, dist))

        dist_map = {vehicle_key: 0.0}
        prev_map = {}
        pq = [(0.0, vehicle_key)]
        visited = set()

        while pq:
            d, u = heapq.heappop(pq)
            if u in visited:
                continue
            visited.add(u)
            if u == target_key:
                break
            for v, w in edges.get(u, []):
                if v not in visited:
                    nd = d + w
                    if v not in dist_map or nd < dist_map[v]:
                        dist_map[v] = nd
                        prev_map[v] = u
                        heapq.heappush(pq, (nd, v))

        if target_key not in dist_map:
            straight_dist = math.sqrt(
                (target_x - vehicle.position_x) ** 2 +
                (target_y - vehicle.position_y) ** 2 +
                (target_z - vehicle.position_z) ** 2
            )
            travel_time = (straight_dist / vehicle.max_speed) * 60 if vehicle.max_speed > 0 else 0
            return {
                "found": True,
                "distance": round(straight_dist, 2),
                "estimated_time_minutes": round(travel_time, 2),
                "waypoints": [
                    {"x": vehicle.position_x, "y": vehicle.position_y, "z": vehicle.position_z},
                    {"x": target_x, "y": target_y, "z": target_z}
                ],
                "message": "直线路径（无道路连接）"
            }

        path = []
        current = target_key
        while current in prev_map:
            path.append(current)
            current = prev_map[current]
        path.append(vehicle_key)
        path.reverse()

        waypoints = []
        for key in path:
            if key in nodes:
                pos = nodes[key]
                waypoints.append({"x": pos[0], "y": pos[1], "z": pos[2]})

        total_dist = dist_map[target_key]
        travel_time = (total_dist / vehicle.max_speed) * 60 if vehicle.max_speed > 0 else 0

        return {
            "found": True,
            "distance": round(total_dist, 2),
            "estimated_time_minutes": round(travel_time, 2),
            "waypoints": waypoints,
            "message": "最优路径已计算"
        }

    def auto_dispatch(self, db: Session, fire_incident_id: int) -> List[dict]:
        fire = db.query(FireIncident).filter(FireIncident.id == fire_incident_id).first()
        if not fire:
            return []

        idle_vehicles = db.query(RescueVehicle).filter(RescueVehicle.status == "idle").all()
        if not idle_vehicles:
            return []

        vehicle_distances = []
        for v in idle_vehicles:
            dist = math.sqrt(
                (v.position_x - fire.position_x) ** 2 +
                (v.position_y - fire.position_y) ** 2 +
                (v.position_z - fire.position_z) ** 2
            )
            vehicle_distances.append((v, dist))

        vehicle_distances.sort(key=lambda x: x[1])

        dispatched = []
        fire_truck_dispatched = False
        ambulance_dispatched = False
        command_car_dispatched = False

        for v, dist in vehicle_distances:
            if v.vehicle_type == "fire_truck" and not fire_truck_dispatched:
                fire_truck_dispatched = True
            elif v.vehicle_type == "ambulance" and not ambulance_dispatched:
                ambulance_dispatched = True
            elif v.vehicle_type == "command_car" and not command_car_dispatched:
                command_car_dispatched = True
            else:
                continue

            task_type = "fire_suppression"
            if v.vehicle_type == "ambulance":
                task_type = "rescue"
            elif v.vehicle_type == "command_car":
                task_type = "evacuation_assist"

            travel_time = (dist / v.max_speed) * 60 if v.max_speed > 0 else 0
            est_completion = datetime.now(timezone.utc) + timedelta(minutes=travel_time + 30)

            task = DispatchTask(
                vehicle_id=v.id,
                task_type=task_type,
                target_x=fire.position_x,
                target_y=fire.position_y,
                target_z=fire.position_z,
                estimated_completion=est_completion,
                status="pending"
            )
            db.add(task)

            v.status = "dispatched"
            db.commit()
            db.refresh(task)

            dispatched.append({
                "vehicle_id": v.id,
                "vehicle_number": v.vehicle_number,
                "vehicle_type": v.vehicle_type,
                "task_id": task.id,
                "distance": round(dist, 2),
                "estimated_arrival_minutes": round(travel_time, 2)
            })

        return dispatched

    def check_dispatch_conflicts(self, db: Session, vehicle_id: int) -> dict:
        active_tasks = db.query(DispatchTask).filter(
            DispatchTask.vehicle_id == vehicle_id,
            DispatchTask.status.in_(["pending", "in_progress"])
        ).all()

        if not active_tasks:
            return {"has_conflict": False, "message": "无调度冲突"}

        return {
            "has_conflict": True,
            "message": f"车辆已有{len(active_tasks)}个进行中的任务",
            "active_tasks": [
                {
                    "task_id": t.id,
                    "task_type": t.task_type,
                    "status": t.status,
                    "target": {"x": t.target_x, "y": t.target_y, "z": t.target_z}
                }
                for t in active_tasks
            ]
        }
