"""Aplicación FastAPI que ofrece colaboración en tiempo real para "Motores"."""
from __future__ import annotations

import asyncio
from pathlib import Path
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


class MotorCreate(BaseModel):
    """Datos recibidos al crear un nuevo motor."""

    text: str = Field(..., min_length=1, description="Contenido del motor")
    category: Optional[str] = Field(
        None,
        description="Categoría asociada. Si se omite se usará 'General'.",
    )


class DrawRequest(BaseModel):
    """Petición para extraer un motor aleatorio."""

    category: Optional[str] = Field(
        None,
        description="Categoría desde la cual se quiere extraer. Vacío para todas.",
    )


@dataclass
class SessionState:
    """Estado en memoria de una sesión colaborativa."""

    motors: List[Dict[str, Any]] = field(default_factory=list)
    connections: List[WebSocket] = field(default_factory=list)
    last_drawn: Optional[Dict[str, Any]] = None
    _motors_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    _connections_lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def register(self, websocket: WebSocket) -> None:
        async with self._connections_lock:
            self.connections.append(websocket)

    async def unregister(self, websocket: WebSocket) -> None:
        async with self._connections_lock:
            if websocket in self.connections:
                self.connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """Envía un mensaje JSON a todas las conexiones activas."""

        async with self._connections_lock:
            connections_snapshot = list(self.connections)
        to_remove: List[WebSocket] = []
        for connection in connections_snapshot:
            try:
                await connection.send_json(message)
            except (WebSocketDisconnect, RuntimeError):
                to_remove.append(connection)
        if to_remove:
            async with self._connections_lock:
                for connection in to_remove:
                    if connection in self.connections:
                        self.connections.remove(connection)

    async def add_motor(self, text: str, category: Optional[str]) -> Dict[str, Any]:
        normalized_category = (category or "General").strip() or "General"
        async with self._motors_lock:
            motor = {
                "id": uuid.uuid4().hex,
                "text": text.strip(),
                "category": normalized_category,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            self.motors.append(motor)
            return motor

    async def reset(self) -> None:
        async with self._motors_lock:
            self.motors.clear()
            self.last_drawn = None

    async def draw(self, category: Optional[str]) -> Dict[str, Any]:
        async with self._motors_lock:
            pool: List[Dict[str, Any]]
            if category:
                target = category.strip()
                pool = [m for m in self.motors if m["category"].casefold() == target.casefold()]
            else:
                pool = list(self.motors)
            if not pool:
                raise HTTPException(
                    status_code=404,
                    detail="No hay motores disponibles para la categoría solicitada.",
                )
            chosen = secrets.choice(pool)
            self.last_drawn = chosen
            return chosen

    async def snapshot(self) -> Dict[str, Any]:
        async with self._motors_lock:
            motors_copy = [motor.copy() for motor in self.motors]
            summary = self._build_summary_locked()
            last_drawn = self.last_drawn.copy() if self.last_drawn else None
        return {
            "motors": motors_copy,
            "summary": summary,
            "lastDrawn": last_drawn,
        }

    async def summary(self) -> Dict[str, Any]:
        async with self._motors_lock:
            return self._build_summary_locked()

    async def is_empty(self) -> bool:
        async with self._motors_lock:
            motors_empty = not self.motors
        async with self._connections_lock:
            connections_empty = not self.connections
        return motors_empty and connections_empty

    def _build_summary_locked(self) -> Dict[str, Any]:
        counts: Dict[str, int] = {}
        for motor in self.motors:
            counts[motor["category"]] = counts.get(motor["category"], 0) + 1
        categories = [
            {"name": name, "count": counts[name]}
            for name in sorted(counts.keys(), key=lambda value: value.casefold())
        ]
        return {"total": len(self.motors), "categories": categories}


class SessionManager:
    """Gestiona la vida útil de las sesiones colaborativas."""

    def __init__(self) -> None:
        self._sessions: Dict[str, SessionState] = {}
        self._lock = asyncio.Lock()

    async def get(self, session_id: str) -> SessionState:
        normalized = session_id.strip()
        if not normalized:
            raise HTTPException(status_code=400, detail="La sesión no puede estar vacía.")
        async with self._lock:
            if normalized not in self._sessions:
                self._sessions[normalized] = SessionState()
            return self._sessions[normalized]

    async def discard_if_idle(self, session_id: str) -> None:
        async with self._lock:
            session = self._sessions.get(session_id)
        if session and await session.is_empty():
            async with self._lock:
                if await session.is_empty():
                    self._sessions.pop(session_id, None)


manager = SessionManager()
app = FastAPI(title="Motores", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/sessions/{session_id}/motors")
async def create_motor(session_id: str, motor: MotorCreate) -> Dict[str, Any]:
    session = await manager.get(session_id)
    cleaned_text = motor.text.strip()
    if not cleaned_text:
        raise HTTPException(status_code=400, detail="El texto del motor no puede estar vacío.")
    motor_data = await session.add_motor(cleaned_text, motor.category)
    snapshot_summary = await session.summary()
    await session.broadcast({"type": "motor_added", "motor": motor_data, "summary": snapshot_summary})
    return {"motor": motor_data, "summary": snapshot_summary}


@app.get("/api/sessions/{session_id}/motors")
async def list_motors(session_id: str) -> Dict[str, Any]:
    session = await manager.get(session_id)
    snapshot = await session.snapshot()
    return snapshot


@app.post("/api/sessions/{session_id}/draw")
async def draw_motor(session_id: str, draw_request: DrawRequest) -> Dict[str, Any]:
    session = await manager.get(session_id)
    chosen = await session.draw(draw_request.category)
    summary = await session.summary()
    message = {
        "type": "drawn",
        "motor": chosen,
        "requestedCategory": draw_request.category,
        "summary": summary,
    }
    await session.broadcast(message)
    return {"motor": chosen, "summary": summary}


@app.post("/api/sessions/{session_id}/reset")
async def reset_session(session_id: str) -> Dict[str, Any]:
    session = await manager.get(session_id)
    await session.reset()
    await session.broadcast({"type": "reset"})
    await manager.discard_if_idle(session_id)
    return {"status": "ok"}


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str) -> None:
    session = await manager.get(session_id)
    await websocket.accept()
    await session.register(websocket)
    try:
        snapshot = await session.snapshot()
        await websocket.send_json({"type": "init", **snapshot})
        while True:
            # Solo escuchamos para mantener viva la conexión.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await session.unregister(websocket)
        await manager.discard_if_idle(session_id)
    except Exception:
        await session.unregister(websocket)
        await manager.discard_if_idle(session_id)
        raise


app.mount("/", StaticFiles(directory=Path(__file__).resolve().parent, html=True), name="static")
