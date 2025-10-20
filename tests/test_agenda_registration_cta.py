# © 2025 Impro World
# This file is part of this project and is licensed under the GNU General Public License v3.0.
# See the LICENSE file for more details.

"""Verificaciones específicas para el botón de registro en la agenda."""
from __future__ import annotations

import posixpath
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
AGENDA_PAGE = REPO_ROOT / "public" / "agendacalendar" / "index.html"
EXPECTED_TARGET = "public/agendacalendar/registro.html"


def test_month_view_registration_button_points_to_registration() -> None:
    """Asegura que el botón '¿Tienes un show? Regístralo' redirige al formulario correcto."""
    content = AGENDA_PAGE.read_text(encoding="utf-8")
    pattern = re.compile(
        r'<a[^>]*class="[^"]*\bmonth-row__cta\b[^"]*"[^>]*href="([^"]+)"[^>]*>\s*¿Tienes un show\?\s*Regístralo\s*</a>',
        re.IGNORECASE,
    )
    match = pattern.search(content)
    assert match, "No se encontró el enlace de registro en la vista mensual."

    href = match.group(1)
    assert href, "El enlace de registro debe definir un destino en href."
    assert not href.startswith("javascript:"), "El enlace de registro no debe depender de JavaScript explícito."
    assert not href.startswith("#"), "El enlace de registro debe apuntar a una página válida."

    resolved_target = posixpath.normpath(posixpath.join("public/agendacalendar", href))
    assert (
        resolved_target == EXPECTED_TARGET
    ), f"El enlace debe dirigir a {EXPECTED_TARGET}, pero apunta a {resolved_target}."
