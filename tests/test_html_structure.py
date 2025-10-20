# © 2025 Impro World
# This file is part of this project and is licensed under the GNU General Public License v3.0.
# See the LICENSE file for more details.

"""Pruebas estructurales para los documentos HTML del proyecto."""
from __future__ import annotations

from pathlib import Path
import re

import pytest


REPO_ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = sorted(path for path in REPO_ROOT.glob("*.html") if path.is_file())


@pytest.mark.parametrize("html_file", HTML_FILES)
def test_html_files_exist(html_file: Path) -> None:
    """Verifica que la colección de páginas HTML no esté vacía."""
    assert HTML_FILES, "No se encontraron archivos HTML para probar."
    assert html_file.exists(), f"El archivo {html_file} no existe."


@pytest.mark.parametrize("html_file", HTML_FILES)
def test_html_has_doctype(html_file: Path) -> None:
    """Cada archivo debe comenzar con una declaración de DOCTYPE HTML5."""
    content = html_file.read_text(encoding="utf-8").lstrip()
    assert content.lower().startswith("<!doctype html>"), (
        "El archivo debe comenzar con <!DOCTYPE html> para asegurar compatibilidad HTML5."
    )


@pytest.mark.parametrize("html_file", HTML_FILES)
def test_html_lang_attribute(html_file: Path) -> None:
    """Los documentos deben declarar explícitamente el atributo lang."""
    content = html_file.read_text(encoding="utf-8")
    match = re.search(r"<html[^>]*\blang=\"([^\"]+)\"", content, re.IGNORECASE)
    assert match, "Cada documento necesita un atributo lang en la etiqueta <html>."
    assert match.group(1).lower().startswith("es"), "El atributo lang debe apuntar al español."


@pytest.mark.parametrize("html_file", HTML_FILES)
def test_html_head_and_body_sections(html_file: Path) -> None:
    """Comprueba la existencia de secciones <head> y <body>."""
    content = html_file.read_text(encoding="utf-8").lower()
    assert "<head" in content, "Se espera una sección <head> en cada documento HTML."
    assert "<body" in content, "Se espera una sección <body> en cada documento HTML."


@pytest.mark.parametrize("html_file", HTML_FILES)
def test_html_has_title(html_file: Path) -> None:
    """Asegura que cada página tenga un título legible."""
    content = html_file.read_text(encoding="utf-8")
    match = re.search(r"<title>\s*(.+?)\s*</title>", content, re.IGNORECASE | re.DOTALL)
    assert match, "Cada documento debe definir un título en la sección <head>."
    assert match.group(1).strip(), "El título no puede estar vacío."


@pytest.mark.parametrize("html_file", HTML_FILES)
def test_html_has_meta_charset(html_file: Path) -> None:
    """Cada documento debe indicar explícitamente la codificación de caracteres."""
    content = html_file.read_text(encoding="utf-8").lower()
    assert "<meta charset=" in content, "Debe declararse <meta charset> en cada documento."


@pytest.mark.parametrize("html_file", HTML_FILES)
def test_html_contains_page_container(html_file: Path) -> None:
    """Garantiza que exista el contenedor principal .page para estilos comunes."""
    content = html_file.read_text(encoding="utf-8")
    assert re.search(r"class=\"page\"", content), (
        "Cada documento debe mantener un contenedor con la clase 'page' para consistencia de layout."
    )
