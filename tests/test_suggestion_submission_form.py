"""Verifica el formulario de sugerencias del calendario."""
from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
AGENDA_PAGE = REPO_ROOT / "public" / "agendacalendar" / "index.html"
EXPECTED_FORM_ACTION = (
    "https://docs.google.com/forms/d/e/1FAIpQLScCdkRzlzCz5LYI-UWOafbBLKZJ5oHd4Ah32JTmB8_TfV5PJg/formResponse"
)


class SuggestionFormParser(HTMLParser):
    """Extrae información relevante del formulario de sugerencias."""

    def __init__(self) -> None:
        super().__init__()
        self.form_attrs: dict[str, str] | None = None
        self._current_form_id: str | None = None
        self.inputs: list[dict[str, str]] = []
        self.textareas: list[dict[str, str]] = []
        self.iframes: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {name: value for name, value in attrs if value is not None}
        if tag == "form" and attributes.get("id") == "suggestionForm":
            self.form_attrs = attributes
            self._current_form_id = attributes.get("id")
        elif tag == "form":
            # Ignora otros formularios.
            self._current_form_id = None

        if tag == "textarea" and self._current_form_id == "suggestionForm":
            self.textareas.append(attributes)

        if tag == "input" and self._current_form_id == "suggestionForm":
            self.inputs.append(attributes)

        if tag == "iframe":
            self.iframes.append(attributes)

    def handle_endtag(self, tag: str) -> None:
        if tag == "form" and self._current_form_id == "suggestionForm":
            self._current_form_id = None


def test_suggestion_form_posts_to_google_forms() -> None:
    """Asegura que el formulario envía la información al endpoint esperado."""
    html_content = AGENDA_PAGE.read_text(encoding="utf-8")
    parser = SuggestionFormParser()
    parser.feed(html_content)

    assert parser.form_attrs is not None, "El formulario de sugerencias debe existir en la página."
    assert (
        parser.form_attrs.get("action") == EXPECTED_FORM_ACTION
    ), "El formulario debe enviar datos al formulario de Google configurado."
    assert parser.form_attrs.get("method", "").upper() == "POST", "El formulario debe usar el método POST."
    assert (
        parser.form_attrs.get("target") == "suggestionFrame"
    ), "El formulario debe enviar la respuesta al iframe oculto para evitar recargas."

    iframe_targets = {iframe.get("name") for iframe in parser.iframes}
    assert "suggestionFrame" in iframe_targets, "Debe existir un iframe receptor llamado suggestionFrame."

    textarea_names = {textarea.get("name") for textarea in parser.textareas}
    assert "sugerencia-visible" in textarea_names, "El textarea principal debe tener el nombre esperado."

    hidden_inputs = [
        input_attrs
        for input_attrs in parser.inputs
        if input_attrs.get("type", "").lower() == "hidden"
    ]
    hidden_ids = {input_attrs.get("id") for input_attrs in hidden_inputs}
    assert "suggestionHidden" in hidden_ids, "El formulario debe contener el campo oculto que replica la sugerencia."

    hidden_names = {input_attrs.get("name") for input_attrs in hidden_inputs}
    assert any(name and name.startswith("entry.") for name in hidden_names), (
        "El campo oculto debe mapearse a un identificador de Google Forms (entry.*)."
    )

    hidden_by_name = {input_attrs.get("name"): input_attrs for input_attrs in hidden_inputs}
    assert hidden_by_name.get("fvv", {}).get("value") == "1", (
        "Google Forms requiere el campo oculto fvv con valor 1."
    )
    assert hidden_by_name.get("draftResponse", {}).get("value") == "[]", (
        "Google Forms requiere el campo oculto draftResponse."
    )
    assert hidden_by_name.get("pageHistory", {}).get("value") == "0", (
        "Google Forms requiere el campo oculto pageHistory con valor 0."
    )
    assert "fbzx" in hidden_by_name, "Debe incluirse el token fbzx para la sesión del formulario."
    assert hidden_by_name["fbzx"].get("id") == "suggestionFbzx", (
        "El token fbzx debe poder regenerarse dinámicamente."
    )
