import math
from typing import List

from sqlalchemy.orm import Session

from app.models.models import Building, FireIncident, PeopleGroup, Floor


class FireSpreadService:

    WEATHER_MULTIPLIERS = {
        "clear": 1.0,
        "windy": 1.8,
        "rainy": 0.5,
        "snowy": 0.3,
    }

    def calculate_spread(self, db: Session, fire_incident_id: int, elapsed_minutes: float, weather: str = "clear") -> dict:
        fire = db.query(FireIncident).filter(FireIncident.id == fire_incident_id).first()
        if not fire:
            return {"spread_calculated": False, "message": "火灾事件不存在"}

        weather_mult = self.WEATHER_MULTIPLIERS.get(weather, 1.0)
        level_mult = 1.0 + (fire.fire_level - 1) * 0.4
        speed_mult = fire.spread_speed

        new_radius = fire.affected_radius + (elapsed_minutes * speed_mult * level_mult * weather_mult * 0.5)
        fire.affected_radius = round(new_radius, 2)
        db.commit()

        affected_buildings = self.get_affected_buildings(db, fire_incident_id)
        affected_building_ids = [b["building_id"] for b in affected_buildings]

        affected_people = 0
        for b in affected_buildings:
            floors = db.query(Floor).filter(Floor.building_id == b["building_id"]).all()
            affected_people += sum(f.current_people for f in floors)

        wind_direction = None
        if weather == "windy":
            wind_direction = "东北方向"

        return {
            "spread_calculated": True,
            "fire_incident_id": fire_incident_id,
            "elapsed_minutes": elapsed_minutes,
            "new_radius": round(new_radius, 2),
            "affected_building_ids": affected_building_ids,
            "affected_people_count": affected_people,
            "spread_direction": wind_direction,
            "weather_factor": weather_mult,
            "message": "火势蔓延计算完成"
        }

    def get_affected_buildings(self, db: Session, fire_id: int) -> List[dict]:
        fire = db.query(FireIncident).filter(FireIncident.id == fire_id).first()
        if not fire:
            return []

        buildings = db.query(Building).all()
        affected = []

        for b in buildings:
            center_x = b.position_x + b.size_x / 2
            center_y = b.position_y + b.size_y / 2
            center_z = b.position_z + b.size_z / 2

            dist = math.sqrt(
                (center_x - fire.position_x) ** 2 +
                (center_y - fire.position_y) ** 2 +
                (center_z - fire.position_z) ** 2
            )

            half_diagonal = math.sqrt(b.size_x ** 2 + b.size_y ** 2 + b.size_z ** 2) / 2

            if dist - half_diagonal < fire.affected_radius:
                overlap = max(0, fire.affected_radius - (dist - half_diagonal))
                affected.append({
                    "building_id": b.id,
                    "building_name": b.name,
                    "distance": round(dist, 2),
                    "overlap_area": round(overlap, 2),
                    "risk": "high" if overlap > half_diagonal else "medium" if overlap > 0 else "low"
                })

        return affected
