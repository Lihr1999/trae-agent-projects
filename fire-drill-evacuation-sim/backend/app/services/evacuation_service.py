import heapq
import math
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.models import Building, Floor, Exit, PeopleGroup, FireIncident
from app.schemas.schemas import EvacuationRouteStep, EvacuationRouteResponse


class EvacuationService:

    def calculate_evacuation_routes(self, db: Session, building_id: int, fire_incident_id: int) -> List[EvacuationRouteResponse]:
        building = db.query(Building).filter(Building.id == building_id).first()
        if not building:
            return []

        fire = db.query(FireIncident).filter(FireIncident.id == fire_incident_id).first()
        fire_x = fire.position_x if fire else 0.0
        fire_y = fire.position_y if fire else 0.0
        fire_z = fire.position_z if fire else 0.0

        exits = db.query(Exit).filter(
            Exit.building_id == building_id,
            Exit.status != "blocked"
        ).all()

        if not exits:
            return []

        floors = db.query(Floor).filter(Floor.building_id == building_id).all()
        people_groups = db.query(PeopleGroup).filter(
            PeopleGroup.status != "evacuated"
        ).all()

        routes = []
        for idx, exit_obj in enumerate(exits):
            exit_distance_to_fire = math.sqrt(
                (exit_obj.position_x - fire_x) ** 2 +
                (exit_obj.position_y - fire_y) ** 2 +
                (exit_obj.position_z - fire_z) ** 2
            )

            if exit_distance_to_fire < (fire.affected_radius if fire else 0):
                continue

            route_steps = []
            for floor in floors:
                step = EvacuationRouteStep(
                    position_x=building.position_x,
                    position_y=building.position_y,
                    position_z=floor.floor_number * 3.0,
                    step_type="floor_exit",
                    description=f"从{floor.floor_number}层前往楼梯"
                )
                route_steps.append(step)

            route_steps.append(EvacuationRouteStep(
                position_x=exit_obj.position_x,
                position_y=exit_obj.position_y,
                position_z=exit_obj.position_z,
                step_type="building_exit",
                description=f"从出口{exit_obj.id}撤离建筑"
            ))

            total_distance = 0.0
            for i in range(1, len(route_steps)):
                total_distance += math.sqrt(
                    (route_steps[i].position_x - route_steps[i-1].position_x) ** 2 +
                    (route_steps[i].position_y - route_steps[i-1].position_y) ** 2 +
                    (route_steps[i].position_z - route_steps[i-1].position_z) ** 2
                )

            avg_speed = 1.2
            for pg in people_groups:
                if pg.move_speed > 0:
                    avg_speed = min(avg_speed, pg.move_speed)
                    break

            estimated_time = total_distance / avg_speed if avg_speed > 0 else 0.0
            congestion_factor = 1.0
            floor_people = sum(f.current_people for f in floors)
            if exit_obj.status == "congested":
                congestion_factor = 1.5
            elif floor_people > 200:
                congestion_factor = 1.3
            estimated_time *= congestion_factor

            routes.append(EvacuationRouteResponse(
                route_id=f"route_{building_id}_{idx}",
                building_id=building_id,
                steps=route_steps,
                estimated_time_minutes=round(estimated_time, 2),
                total_distance=round(total_distance, 2),
                target_exit_id=exit_obj.id
            ))

        routes.sort(key=lambda r: r.estimated_time_minutes)
        return routes

    def update_routes_on_exit_blocked(self, db: Session, exit_id: int) -> List[EvacuationRouteResponse]:
        exit_obj = db.query(Exit).filter(Exit.id == exit_id).first()
        if not exit_obj:
            return []

        active_fires = db.query(FireIncident).filter(FireIncident.status == "active").all()
        if not active_fires:
            return []

        return self.calculate_evacuation_routes(db, exit_obj.building_id, active_fires[0].id)

    def optimize_crowd_flow(self, db: Session, building_id: int) -> dict:
        exits = db.query(Exit).filter(
            Exit.building_id == building_id,
            Exit.status != "blocked"
        ).all()

        if not exits:
            return {"optimized": False, "message": "没有可用出口"}

        floors = db.query(Floor).filter(Floor.building_id == building_id).all()
        total_people = sum(f.current_people for f in floors)

        exit_capacities = []
        for e in exits:
            capacity = e.width * 60
            exit_capacities.append({"exit_id": e.id, "capacity": capacity})

        total_capacity = sum(ec["capacity"] for ec in exit_capacities)
        if total_capacity == 0:
            return {"optimized": False, "message": "出口总容量为零"}

        allocation = []
        remaining = total_people
        for ec in exit_capacities:
            share = int(total_people * (ec["capacity"] / total_capacity))
            share = min(share, remaining)
            allocation.append({"exit_id": ec["exit_id"], "allocated_people": share})
            remaining -= share

        if remaining > 0 and allocation:
            allocation[0]["allocated_people"] += remaining

        people_groups = db.query(PeopleGroup).filter(
            PeopleGroup.status.in_(["stationary", "evacuating"])
        ).all()

        for i, pg in enumerate(people_groups):
            if i < len(allocation):
                pg.target_exit_id = allocation[i % len(allocation)]["exit_id"]

        db.commit()

        return {
            "optimized": True,
            "total_people": total_people,
            "allocation": allocation,
            "message": "人群分流优化完成"
        }
