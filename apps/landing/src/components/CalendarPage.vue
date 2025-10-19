<template>
  <div class="calendar-page">
    <header class="hero">
      <div class="hero__inner"></div>
    </header>

    <main>
      <div class="wrap">
        <section class="calendar-card">
          <div class="calendar-card__header">
            <div class="calendar-card__title">
              <h2 id="calendar-title">{{ mesActualLabel }}</h2>
            </div>
            <div class="calendar-card__actions">
              <div class="calendar-controls" role="group" aria-label="Cambiar de mes">
                <button type="button" @click="cambiarMes(-1)" aria-label="Ir al mes anterior">←</button>
                <span aria-hidden="true">{{ mesActualCorto }}</span>
                <button type="button" @click="cambiarMes(1)" aria-label="Ir al mes siguiente">→</button>
              </div>
              <div class="view-toggle" role="group" aria-label="Cambiar vista del calendario">
                <button type="button" :aria-pressed="vista === 'month'" @click="vista = 'month'">
                  Vista mensual
                </button>
                <button type="button" :aria-pressed="vista === 'agenda'" @click="vista = 'agenda'">
                  Vista agenda
                </button>
              </div>
            </div>
          </div>

          <div v-if="error" class="empty">{{ error }}</div>
          <div v-else-if="cargando" class="loading">Cargando eventos…</div>
          <template v-else>
            <template v-if="vista === 'month'">
              <FiltersPanel
                :filters="filters"
                :filters-expanded="filtersExpanded"
                :filters-toggle-label="filtersToggleLabel"
                :pais-options="paisOptions"
                :ciudad-options="ciudadOptions"
                :compania-options="companiaOptions"
                :active-filters="activeFilters"
                :min-date="hoyISO"
                @toggle="toggleFilters"
                @remove="removeFilter"
              />
              <div class="calendar-month netflix-month" role="list" aria-labelledby="calendar-title">
                <article
                  v-for="day in diasDelMes"
                  :key="day.iso"
                  class="month-row"
                  :class="{ 'month-row--today': day.esHoy }"
                  role="listitem"
                  :aria-label="descripcionFila(day)"
                >
                  <header class="month-row__header">
                    <div class="month-row__title">
                      <span class="month-row__day">{{ diaSemanaCorta(day.iso) }} · {{ day.numero }}</span>
                      <span class="month-row__date">{{ fechaLarga(day.iso) }}</span>
                    </div>
                    <span class="month-row__badge">
                      {{ day.eventos.length }} · {{ day.eventos.length === 1 ? 'evento' : 'eventos' }}
                    </span>
                  </header>
                  <div
                    v-if="day.eventos.length"
                    class="month-row__scroller"
                    role="group"
                    :aria-label="`Eventos del ${fechaLarga(day.iso)}`"
                  >
                    <article
                      v-for="evento in day.eventos"
                      :key="evento.id"
                      class="show-card"
                      role="group"
                      :aria-label="`Evento ${evento.nombre}`"
                    >
                      <button
                        v-if="evento.imageCandidates.length"
                        type="button"
                        class="show-card__thumb-button"
                        @click="(event) => openFlyer(evento, event)"
                        :aria-label="`Ver flyer completo de ${evento.nombre}`"
                        aria-haspopup="dialog"
                      >
                        <span class="visually-hidden">Ver flyer completo de {{ evento.nombre }}</span>
                        <div
                          class="show-card__thumb"
                          v-img-fallback="{ sources: evento.imageCandidates, alt: `Flyer del evento ${evento.nombre}` }"
                        ></div>
                      </button>
                      <div class="show-card__thumb show-card__thumb--empty" v-else aria-hidden="true"></div>
                      <div class="show-card__body">
                        <h3 class="show-card__title">{{ evento.nombre }}</h3>
                        <div class="show-card__meta">
                          <span><strong>{{ evento.horaLabel }}</strong></span>
                          <span>{{ evento.lugarLabel }}</span>
                          <span v-if="evento.ciudadLabel">{{ evento.ciudadLabel }}</span>
                        </div>
                        <a
                          v-if="evento.boleteria"
                          class="show-card__cta"
                          :href="evento.boleteria"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Comprar boletas
                        </a>
                      </div>
                    </article>
                  </div>
                  <div v-else class="month-row__empty">
                    <span class="month-row__summary">No hay eventos para este día.</span>
                    <a class="month-row__cta" href="registro.html">¿Tienes un show? Regístralo</a>
                  </div>
                </article>
                <p v-if="!diasDelMes.length" class="empty">No hay eventos programados para este mes.</p>
              </div>
            </template>
            <div v-else class="agenda-view" aria-labelledby="calendar-title">
              <FiltersPanel
                :filters="filters"
                :filters-expanded="filtersExpanded"
                :filters-toggle-label="filtersToggleLabel"
                :pais-options="paisOptions"
                :ciudad-options="ciudadOptions"
                :compania-options="companiaOptions"
                :active-filters="activeFilters"
                :show-count="agendaResultsLabel"
                :min-date="hoyISO"
                @toggle="toggleFilters"
                @remove="removeFilter"
              />
              <section class="agenda-section">
                <div class="agenda" id="agenda" role="region" aria-live="polite">
                  <template v-if="cargando">
                    <article v-for="n in 6" :key="`skeleton-${n}`" class="skeleton-card">
                      <div class="skeleton-thumb"></div>
                      <div class="skeleton-body">
                        <span class="skeleton-line"></span>
                        <span class="skeleton-line"></span>
                        <span class="skeleton-line short"></span>
                      </div>
                    </article>
                  </template>
                  <template v-else>
                    <transition-group name="scale" tag="div" class="agenda__list">
                      <article v-for="event in agendaEventosFiltrados" :key="event.id" class="card">
                        <div class="thumb" v-img-fallback="event.piezaCands">
                          <div class="thumb__overlay">
                            <span class="badge badge--format" v-if="event.formato">{{ event.formato }}</span>
                            <span class="badge badge--country" v-if="event.pais">{{ event.pais }}</span>
                          </div>
                        </div>
                        <div class="content">
                          <h3>{{ event.nombre }}</h3>
                          <p class="meta">
                            <strong>Fecha</strong>
                            <span>{{ event.fechaLabel || 'Por confirmar' }}</span>
                          </p>
                          <p class="meta">
                            <strong>Hora</strong>
                            <span>{{ event.horaLabel || 'Por definir' }}</span>
                          </p>
                          <p class="meta">
                            <strong>Lugar</strong>
                            <span>{{ event.lugarLabel || 'Pronto' }}</span>
                          </p>
                          <div class="actions" v-if="event.boleteria">
                            <a :href="event.boleteria" target="_blank" rel="noopener" class="btn btn-primary">
                              Comprar boletas
                            </a>
                          </div>
                        </div>
                      </article>
                    </transition-group>
                    <div v-if="!agendaEventosFiltrados.length" class="empty-state">
                      <strong>No encontramos eventos con esos filtros.</strong>
                      <span>
                        Prueba ajustando la búsqueda o borra los filtros activos para ver toda la programación.
                      </span>
                    </div>
                  </template>
                </div>
              </section>
              <section class="agenda-footer">
                <div class="hero__meta">
                  <span><strong>{{ totalEventos }}</strong> eventos publicados</span>
                  <span>Actualizado el <strong>{{ ultimaActualizacion }}</strong></span>
                  <span>Países representados <strong>{{ totalPaisesAgenda }}</strong></span>
                </div>
                <div class="agenda-footer__download">
                  <button
                    type="button"
                    class="btn btn-secondary agenda-footer__button"
                    @click="downloadAgendaPdf"
                    :disabled="downloadingAgendaPdf || cargando"
                  >
                    {{ downloadingAgendaPdf ? 'Generando PDF…' : 'Descargar PDF' }}
                  </button>
                </div>
              </section>
            </div>
          </template>
        </section>
      </div>
    </main>

    <dialog
      class="flyer-dialog"
      ref="flyerDialog"
      @cancel.prevent="closeFlyer"
      @click.self="closeFlyer"
      aria-labelledby="flyerDialogTitle"
    >
      <div class="flyer-dialog__inner" role="document">
        <button type="button" class="flyer-dialog__close" @click="closeFlyer" aria-label="Cerrar flyer">
          &times;
        </button>
        <div
          class="flyer-dialog__media"
          v-if="flyerDialogData.candidates.length"
          v-img-fallback="{ sources: flyerDialogData.candidates, alt: flyerDialogData.alt }"
        ></div>
        <div class="flyer-dialog__info">
          <h2 id="flyerDialogTitle">{{ flyerDialogData.title }}</h2>
          <p v-if="flyerDialogData.meta">{{ flyerDialogData.meta }}</p>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import FiltersPanel from '@/components/FiltersPanel.vue';
import {
  WEBAPP_URL,
  norm,
  mountImageWithFallback,
  formatWithCapitalizedMonth,
  normalizeText,
} from '@/utils/events.js';

const cargando = ref(true);
const error = ref('');
const lista = ref([]);
const hoy = new Date();
const hoyISO = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().split('T')[0];
const hoySinHora = new Date(hoy.getTime());
hoySinHora.setHours(0, 0, 0, 0);
const hoyTimestamp = hoySinHora.getTime();
const mesActual = ref(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
const ultimaActualizacion = ref(new Date().toLocaleDateString('es-ES', { dateStyle: 'long' }));
const vista = ref('month');

const filters = reactive({
  search: '',
  pais: '',
  ciudad: '',
  compania: '',
  fecha: hoyISO,
});
const filtersExpanded = ref(false);
const downloadingAgendaPdf = ref(false);
const detectedCountry = ref('');
const flyerDialog = ref(null);
const flyerDialogData = reactive({ title: '', alt: '', meta: '', candidates: [] });
let lastFlyerTrigger = null;

const eventosPublicados = computed(() => lista.value.filter((ev) => ev.estado !== 'Despublicado'));

const eventosFiltrados = computed(() => {
  const q = normalizeText(filters.search);
  const p = filters.pais;
  const c = filters.ciudad;
  const co = filters.compania;
  const f = filters.fecha;

  return eventosPublicados.value.filter((ev) => {
    const okQ = !q || ev.searchText.includes(q);
    const okP = !p || normalizeText(ev.pais) === p;
    const okC = !c || normalizeText(ev.ciudad) === c;
    const okCo = !co || normalizeText(ev.compania) === co;
    const okF = !f || (ev.fechaISO && ev.fechaISO >= f);
    return okQ && okP && okC && okCo && okF;
  });
});

const eventosPorDia = computed(() => {
  const map = new Map();
  for (const item of eventosFiltrados.value) {
    if (!item.fechaISO) continue;
    if (!map.has(item.fechaISO)) {
      map.set(item.fechaISO, []);
    }
    map.get(item.fechaISO).push(item);
  }
  for (const events of map.values()) {
    events.sort((a, b) => a.horaValue - b.horaValue || a.nombre.localeCompare(b.nombre, 'es'));
  }
  return map;
});

const totalEventos = computed(() => eventosPublicados.value.length);

const dias = computed(() => {
  const base = new Date(mesActual.value.getTime());
  base.setDate(1);
  const offset = (base.getDay() + 6) % 7;
  const inicio = new Date(base.getTime());
  inicio.setDate(inicio.getDate() - offset);
  const celdas = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(inicio.getTime());
    d.setDate(inicio.getDate() + i);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const fechaLocal = new Date(`${iso}T00:00:00`);
    const weekdayLongRaw = fechaLocal.toLocaleDateString('es-ES', { weekday: 'long' });
    const weekdayShortRaw = fechaLocal.toLocaleDateString('es-ES', { weekday: 'short' });
    const monthLabel = formatWithCapitalizedMonth(fechaLocal, { day: 'numeric', month: 'long' });
    const eventos = eventosPorDia.value.get(iso) || [];
    celdas.push({
      iso,
      numero: d.getDate(),
      mesActual: d.getMonth() === mesActual.value.getMonth(),
      esHoy: iso === hoyISO,
      eventos,
      weekdayLong: weekdayLongRaw.charAt(0).toUpperCase() + weekdayLongRaw.slice(1),
      weekdayShort: weekdayShortRaw.charAt(0).toUpperCase() + weekdayShortRaw.slice(1),
      fechaLabel: monthLabel,
    });
  }
  return celdas;
});

const diasDelMes = computed(() =>
  dias.value.filter((day) => {
    if (!day.mesActual) return false;
    const dayDate = new Date(`${day.iso}T00:00:00`);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate.getTime() >= hoyTimestamp;
  })
);

const mesActualLabel = computed(() => formatWithCapitalizedMonth(mesActual.value, { month: 'long', year: 'numeric' }));
const mesActualCorto = computed(() => formatWithCapitalizedMonth(mesActual.value, { month: 'short', year: 'numeric' }));

function cambiarMes(delta) {
  const nuevo = new Date(mesActual.value.getTime());
  nuevo.setMonth(nuevo.getMonth() + delta, 1);
  mesActual.value = nuevo;
}

function fechaLarga(iso) {
  const fecha = new Date(`${iso}T00:00:00`);
  const baseRaw = formatWithCapitalizedMonth(fecha, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return baseRaw.charAt(0).toUpperCase() + baseRaw.slice(1);
}

function diaSemanaCorta(iso) {
  const fecha = new Date(`${iso}T00:00:00`);
  const raw = fecha.toLocaleDateString('es-ES', { weekday: 'short' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function descripcionFila(day) {
  const base = fechaLarga(day.iso);
  if (!day.eventos.length) {
    return `${base}. Sin eventos.`;
  }
  const cantidad = day.eventos.length === 1 ? 'Un evento' : `${day.eventos.length} eventos`;
  return `${base}. ${cantidad}.`;
}

function toggleFilters() {
  filtersExpanded.value = !filtersExpanded.value;
}

const filtersToggleLabel = computed(() => (filtersExpanded.value ? 'Ocultar filtros' : 'Mostrar filtros'));

function optionFromMap(items) {
  const map = new Map();
  items.forEach((label) => {
    if (!label) return;
    const value = normalizeText(label);
    if (!map.has(value)) {
      map.set(value, label);
    }
  });
  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

const paisOptions = computed(() => optionFromMap(eventosPublicados.value.map((ev) => ev.pais)));
const ciudadOptions = computed(() => optionFromMap(eventosPublicados.value.map((ev) => ev.ciudad)));
const companiaOptions = computed(() => optionFromMap(eventosPublicados.value.map((ev) => ev.compania)));

const activeFilters = computed(() => {
  const chips = [];
  if (filters.pais) {
    const found = paisOptions.value.find((opt) => opt.value === filters.pais);
    chips.push({ key: 'pais', label: 'País', value: found ? found.label : filters.pais });
  }
  if (filters.ciudad) {
    const found = ciudadOptions.value.find((opt) => opt.value === filters.ciudad);
    chips.push({ key: 'ciudad', label: 'Ciudad', value: found ? found.label : filters.ciudad });
  }
  if (filters.compania) {
    const found = companiaOptions.value.find((opt) => opt.value === filters.compania);
    chips.push({ key: 'compania', label: 'Compañía', value: found ? found.label : filters.compania });
  }
  if (filters.fecha) {
    const formatted = new Date(`${filters.fecha}T00:00:00`).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    chips.push({ key: 'fecha', label: 'Desde', value: formatted });
  }
  if (filters.search) {
    chips.push({ key: 'search', label: 'Búsqueda', value: filters.search });
  }
  return chips;
});

const agendaEventosFiltrados = computed(() => {
  const f = filters.fecha;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  return eventosFiltrados.value
    .filter((ev) => {
      const isPastEvent = typeof ev.fechaTime === 'number' && ev.fechaTime < todayTime;
      const okPast = !isPastEvent || (f && ev.fechaISO === f);
      return okPast;
    })
    .sort((a, b) => {
      const timeA = typeof a.fechaTime === 'number' ? a.fechaTime : Number.POSITIVE_INFINITY;
      const timeB = typeof b.fechaTime === 'number' ? b.fechaTime : Number.POSITIVE_INFINITY;
      if (timeA !== timeB) return timeA - timeB;
      if (a.horaValue !== b.horaValue) return a.horaValue - b.horaValue;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
});

const agendaResultsLabel = computed(() => {
  if (cargando.value) return 'Cargando…';
  const count = agendaEventosFiltrados.value.length;
  return `${count} ${count === 1 ? 'resultado' : 'resultados'}`;
});

const totalPaisesAgenda = computed(
  () => new Set(eventosPublicados.value.map((ev) => ev.pais).filter(Boolean)).size
);

function removeFilter(key) {
  if (Object.prototype.hasOwnProperty.call(filters, key)) {
    filters[key] = '';
  }
}

function resetFlyerDialog() {
  flyerDialogData.title = '';
  flyerDialogData.alt = '';
  flyerDialogData.meta = '';
  flyerDialogData.candidates = [];
}

function handleFlyerDialogClose() {
  resetFlyerDialog();
  if (lastFlyerTrigger && typeof lastFlyerTrigger.focus === 'function') {
    lastFlyerTrigger.focus();
  }
  lastFlyerTrigger = null;
}

function closeFlyer() {
  const dialogEl = flyerDialog.value;
  if (!dialogEl) return;
  if (typeof dialogEl.close === 'function' && dialogEl.open) {
    dialogEl.close();
  } else {
    dialogEl.removeAttribute('open');
    handleFlyerDialogClose();
  }
}

function openFlyer(evento, nativeEvent) {
  if (!evento || !Array.isArray(evento.imageCandidates) || !evento.imageCandidates.length) {
    return;
  }
  const name = evento.nombre && String(evento.nombre).trim() ? String(evento.nombre).trim() : 'Evento sin nombre';
  flyerDialogData.title = name;
  flyerDialogData.alt = `Flyer del evento ${name}`;
  const details = [evento.fechaLabel, evento.horaLabel, evento.lugarLabel]
    .map((part) => (part ? String(part).trim() : ''))
    .filter(Boolean);
  flyerDialogData.meta = details.join(' · ');
  flyerDialogData.candidates = evento.imageCandidates.slice(0, 8);
  const dialogEl = flyerDialog.value;
  if (!dialogEl) {
    return;
  }
  lastFlyerTrigger =
    nativeEvent && nativeEvent.currentTarget instanceof HTMLElement ? nativeEvent.currentTarget : null;
  if (typeof dialogEl.showModal === 'function') {
    dialogEl.showModal();
  } else {
    dialogEl.setAttribute('open', '');
  }
}

const applyDetectedCountry = () => {
  if (filters.pais || !detectedCountry.value) return;
  const normalized = normalizeText(detectedCountry.value);
  if (!normalized) return;
  const found = paisOptions.value.find((opt) => opt.value === normalized);
  if (found) {
    filters.pais = found.value;
  }
};

const detectCountry = async () => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) return;
    const data = await response.json();
    detectedCountry.value = data.country_name || data.country || '';
    applyDetectedCountry();
  } catch (err) {
    console.warn('No se pudo determinar el país del visitante', err);
  }
};

watch(paisOptions, applyDetectedCountry);

async function downloadAgendaPdf() {
  if (typeof window === 'undefined') return;
  if (typeof html2pdf === 'undefined') {
    console.error('La librería html2pdf no está disponible en este navegador.');
    return;
  }
  if (downloadingAgendaPdf.value) return;
  downloadingAgendaPdf.value = true;

  const removeContainer = (container) => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  const printable = document.createElement('div');
  printable.style.position = 'fixed';
  printable.style.left = '-9999px';
  printable.style.top = '0';
  printable.style.width = '210mm';
  printable.style.maxWidth = '100%';
  printable.style.padding = '24px';
  printable.style.backgroundColor = '#ffffff';
  printable.style.color = '#101828';
  printable.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  printable.style.lineHeight = '1.4';

  const title = document.createElement('h1');
  title.textContent = 'Agenda ImproWorld';
  title.style.textAlign = 'center';
  title.style.margin = '0 0 6px';
  printable.appendChild(title);

  const generatedAt = document.createElement('p');
  generatedAt.textContent = `Generado el ${new Date().toLocaleDateString('es-ES', { dateStyle: 'full' })}`;
  generatedAt.style.textAlign = 'center';
  generatedAt.style.margin = '0 0 18px';
  generatedAt.style.color = '#475467';
  printable.appendChild(generatedAt);

  const totals = document.createElement('p');
  totals.textContent = `Mostrando ${agendaEventosFiltrados.value.length} de ${eventosPublicados.value.length} eventos disponibles.`;
  totals.style.margin = '0 0 12px';
  printable.appendChild(totals);

  const filtersParagraph = document.createElement('p');
  filtersParagraph.style.margin = '0 0 20px';
  filtersParagraph.textContent = activeFilters.value.length
    ? `Filtros aplicados: ${activeFilters.value.map((chip) => `${chip.label}: ${chip.value}`).join(', ')}`
    : 'Filtros aplicados: ninguno';
  printable.appendChild(filtersParagraph);

  const events = agendaEventosFiltrados.value;

  if (!events.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No hay eventos disponibles con los filtros seleccionados.';
    empty.style.marginTop = '24px';
    printable.appendChild(empty);
  } else {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '11pt';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['Evento', 'Fecha', 'Hora', 'Lugar', 'Ciudad', 'País', 'Compañía'];
    headers.forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      th.style.border = '1px solid #e2e8f0';
      th.style.padding = '8px';
      th.style.backgroundColor = '#f8fafc';
      th.style.color = '#344054';
      th.style.textAlign = 'left';
      th.style.fontWeight = '600';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    events.forEach((ev) => {
      const row = document.createElement('tr');

      const eventCell = document.createElement('td');
      eventCell.style.border = '1px solid #e2e8f0';
      eventCell.style.padding = '10px';
      eventCell.style.verticalAlign = 'top';

      const name = document.createElement('div');
      name.textContent = ev.nombre;
      name.style.fontWeight = '600';
      name.style.marginBottom = '4px';
      eventCell.appendChild(name);

      const info = document.createElement('div');
      info.textContent = `${ev.lugarLabel || ''}`;
      info.style.fontSize = '0.85rem';
      info.style.color = '#475467';
      eventCell.appendChild(info);

      if (ev.boleteria) {
        const ticket = document.createElement('div');
        ticket.textContent = `Boletería: ${ev.boleteria}`;
        ticket.style.marginTop = '6px';
        ticket.style.fontSize = '0.85rem';
        ticket.style.color = '#475467';
        eventCell.appendChild(ticket);
      }

      row.appendChild(eventCell);

      const createTextCell = (value) => {
        const cell = document.createElement('td');
        cell.textContent = value || '—';
        cell.style.border = '1px solid #e2e8f0';
        cell.style.padding = '8px';
        cell.style.verticalAlign = 'top';
        cell.style.whiteSpace = 'pre-wrap';
        return cell;
      };

      row.appendChild(createTextCell(ev.fechaLabel || ev.fechaISO || ''));
      row.appendChild(createTextCell(ev.horaLabel));
      row.appendChild(createTextCell(ev.lugarLabel));
      row.appendChild(createTextCell(ev.ciudad));
      row.appendChild(createTextCell(ev.pais));
      row.appendChild(createTextCell(ev.compania));

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    printable.appendChild(table);
  }

  document.body.appendChild(printable);

  const filenameDate = new Date().toISOString().split('T')[0];
  const options = {
    margin: 10,
    filename: `agenda-improworld-${filenameDate}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  try {
    await html2pdf().set(options).from(printable).save();
  } catch (err) {
    console.error('No fue posible generar el PDF de la agenda', err);
  } finally {
    downloadingAgendaPdf.value = false;
    removeContainer(printable);
  }
}

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const response = await fetch(WEBAPP_URL);
    if (!response.ok) {
      throw new Error(`No se pudo cargar la agenda (${response.status})`);
    }
    const data = await response.json();
    lista.value = Array.isArray(data) ? data.map(norm) : [];
    ultimaActualizacion.value = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' });
    applyDetectedCountry();
  } catch (err) {
    console.error('Error al cargar la agenda', err);
    error.value = 'No fue posible cargar los eventos. Intenta de nuevo más tarde.';
    lista.value = [];
  } finally {
    cargando.value = false;
  }
}

const vImgFallback = {
  mounted(el, binding) {
    mountImageWithFallback(el, binding.value);
  },
  updated(el, binding) {
    mountImageWithFallback(el, binding.value);
  },
};

onMounted(() => {
  cargar();
  detectCountry();
  if (flyerDialog.value) {
    flyerDialog.value.addEventListener('close', handleFlyerDialogClose);
  }
});

onBeforeUnmount(() => {
  if (flyerDialog.value) {
    flyerDialog.value.removeEventListener('close', handleFlyerDialogClose);
  }
});
</script>

