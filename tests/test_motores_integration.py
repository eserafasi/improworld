"""Pruebas de integración para la API y WebSocket de Motores."""
from __future__ import annotations

from typing import Dict

import pytest

fastapi_module = pytest.importorskip("fastapi")
TestClient = fastapi_module.testclient.TestClient

from app import app


client = TestClient(app)


def _connect(session_id: str):
    """Abre una conexión WebSocket y devuelve el contexto y el mensaje inicial."""

    websocket = client.websocket_connect(f"/ws/{session_id}")
    init_message: Dict[str, object] = websocket.receive_json()
    return websocket, init_message


def test_websocket_receives_initial_snapshot_and_broadcasts_updates() -> None:
    """Un cliente conectado debe recibir el estado inicial y los nuevos motores."""

    websocket, init = _connect("prueba-integracion")
    try:
        assert init["type"] == "init"
        assert init["summary"] == {"total": 0, "categories": []}

        response = client.post(
            "/api/sessions/prueba-integracion/motors",
            json={"text": "Una idea", "category": "Inspiración"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["motor"]["text"] == "Una idea"

        broadcast = websocket.receive_json()
        assert broadcast["type"] == "motor_added"
        assert broadcast["motor"]["text"] == "Una idea"
        assert broadcast["summary"]["total"] == 1
    finally:
        websocket.close()


def test_reset_notifies_clients_and_clears_state() -> None:
    """Vaciar una sesión debe informar al cliente conectado."""

    websocket, _ = _connect("prueba-reset")
    try:
        response = client.post(
            "/api/sessions/prueba-reset/motors",
            json={"text": "Motor fugaz", "category": "General"},
        )
        assert response.status_code == 200
        websocket.receive_json()  # consume el broadcast de creación

        reset_response = client.post("/api/sessions/prueba-reset/reset")
        assert reset_response.status_code == 200
        reset_event = websocket.receive_json()
        assert reset_event["type"] == "reset"
    finally:
        websocket.close()
