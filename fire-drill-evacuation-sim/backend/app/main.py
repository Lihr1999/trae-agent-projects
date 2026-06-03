from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, buildings, floors, exits, roads, people, fires, vehicles, dispatch, events, reports, drill

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(buildings.router, prefix=settings.API_V1_PREFIX)
app.include_router(floors.router, prefix=settings.API_V1_PREFIX)
app.include_router(exits.router, prefix=settings.API_V1_PREFIX)
app.include_router(roads.router, prefix=settings.API_V1_PREFIX)
app.include_router(people.router, prefix=settings.API_V1_PREFIX)
app.include_router(fires.router, prefix=settings.API_V1_PREFIX)
app.include_router(vehicles.router, prefix=settings.API_V1_PREFIX)
app.include_router(dispatch.router, prefix=settings.API_V1_PREFIX)
app.include_router(events.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(drill.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {"message": f"{settings.PROJECT_NAME} API", "version": settings.VERSION, "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
