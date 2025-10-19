// Extracted from index.html inline scripts (Agenda landing page)

(function () {
      const button = document.getElementById('suggestionButton');
      const dialog = document.getElementById('suggestionDialog');
      const textarea = document.getElementById('suggestionTextarea');
      const hiddenInput = document.getElementById('suggestionHidden');
      const fbzxInput = document.getElementById('suggestionFbzx');
      const status = document.getElementById('suggestionStatus');
      const cancelButton = document.getElementById('suggestionCancel');
      const form = document.getElementById('suggestionForm');
      const counter = document.getElementById('suggestionCounter');
      const iframe = document.getElementById('suggestionFrame');
      const honeypot = document.getElementById('suggestionHoneypot');
      const infoButton = document.getElementById('suggestionInfoButton');
      const infoContainer = document.getElementById('suggestionInfo');
      let awaitingResponse = false;
      let timeoutId = null;
      let closeId = null;

      if (!button || !dialog) {
        return;
      }

      const generateFbzx = () => {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
          return window.crypto.randomUUID();
        }
        return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      };

      const refreshFbzx = () => {
        if (fbzxInput) {
          fbzxInput.value = generateFbzx();
        }
      };

      const resetStatus = () => {
        status.textContent = '';
        status.className = 'suggestion-status';
      };

      const updateCounter = () => {
        const length = textarea.value.length;
        counter.textContent = `${length} / 200`;
        hiddenInput.value = textarea.value;
      };

      const hideInfo = (immediate = false) => {
        if (!infoContainer) {
          return;
        }
        const removeHidden = () => {
          infoContainer.setAttribute('hidden', '');
          infoContainer.removeEventListener('transitionend', removeHidden);
        };
        infoContainer.classList.remove('is-visible');
        if (immediate) {
          removeHidden();
          return;
        }
        if (window.getComputedStyle(infoContainer).transitionDuration === '0s') {
          removeHidden();
          return;
        }
        infoContainer.addEventListener('transitionend', removeHidden, { once: true });
      };

      const showInfo = () => {
        if (!infoContainer) {
          return;
        }
        infoContainer.removeAttribute('hidden');
        requestAnimationFrame(() => {
          infoContainer.classList.add('is-visible');
        });
      };

      if (infoButton && infoContainer) {
        infoButton.addEventListener('click', () => {
          const expanded = infoButton.getAttribute('aria-expanded') === 'true';
          if (expanded) {
            infoButton.setAttribute('aria-expanded', 'false');
            hideInfo();
          } else {
            infoButton.setAttribute('aria-expanded', 'true');
            showInfo();
          }
        });
      }

      const resetTimers = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (closeId) {
          clearTimeout(closeId);
          closeId = null;
        }
      };

      button.addEventListener('click', () => {
        form.reset();
        resetStatus();
        resetTimers();
        awaitingResponse = false;
        hiddenInput.value = '';
        refreshFbzx();
        dialog.showModal();
        requestAnimationFrame(() => textarea.focus());
        updateCounter();
        if (infoButton) {
          infoButton.setAttribute('aria-expanded', 'false');
        }
        hideInfo(true);
      });

      cancelButton.addEventListener('click', () => {
        dialog.close();
      });

      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        dialog.close();
      });

      dialog.addEventListener('close', () => {
        awaitingResponse = false;
        resetTimers();
        resetStatus();
        form.reset();
        hiddenInput.value = '';
        if (fbzxInput) {
          fbzxInput.value = '';
        }
        updateCounter();
        button.focus();
      });

      textarea.addEventListener('input', updateCounter);

      form.addEventListener('submit', (event) => {
        if (honeypot.value) {
          event.preventDefault();
          return;
        }
        refreshFbzx();
        updateCounter();
        awaitingResponse = true;
        resetStatus();
        status.textContent = 'Enviando…';
        timeoutId = setTimeout(() => {
          if (awaitingResponse) {
            awaitingResponse = false;
            status.textContent = 'No pudimos enviar tu sugerencia. Inténtalo de nuevo.';
            status.className = 'suggestion-status suggestion-status--error';
          }
          timeoutId = null;
        }, 8000);
      });

      iframe.addEventListener('load', () => {
        if (!awaitingResponse) {
          return;
        }
        awaitingResponse = false;
        resetTimers();
        status.textContent = '¡Gracias! Recibimos tu sugerencia.';
        status.className = 'suggestion-status suggestion-status--success';
        closeId = setTimeout(() => {
          dialog.close();
        }, 2000);
      });
    })();

const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwoCLUfEiRjnmzumQ-Qs82vLUMpfTWHuemY8W6NODHVhGskbdQQHh-rIHKJUpS0cPCSxQ/exec";
  const PLACEHOLDER_IMAGE =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA4MDAgNDUwJz4KPHJlY3QgZmlsbD0nI2VkZTlmZScgd2lkdGg9JzgwMCcgaGVpZ2h0PSc0NTAnLz4KPHRleHQgeD0nNTAlJyB5PSc1MCUnIGZpbGw9JyM3YzNhZWQnIGZvbnQtZmFtaWx5PSdJbnRlciwgQXJpYWwsIHNhbnMtc2VyaWYnIGZvbnQtc2l6ZT0nNDgnIHRleHQtYW5jaG9yPSdtaWRkbGUnIGRvbWluYW50LWJhc2VsaW5lPSdtaWRkbGUnPlNpbiBpbWFnZW48L3RleHQ+Cjwvc3ZnPg==";

  function val(x) {
    return x === undefined || x === null ? "" : String(x).trim();
  }

  function normalizeText(t) {
    return t ? t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
  }

  function formatIsoDate(v) {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d)) return "";
    return d.toISOString().split("T")[0];
  }

  const monthFormatterCache = new Map();

  function formatWithCapitalizedMonth(date, options) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "";
    }
    const key = JSON.stringify(
      Object.keys(options || {})
        .sort()
        .map((prop) => [prop, options[prop]])
    );
    let formatter = monthFormatterCache.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat("es-ES", options);
      monthFormatterCache.set(key, formatter);
    }
    return formatter
      .formatToParts(date)
      .map((part) => {
        if (part.type === "month") {
          return part.value ? part.value.charAt(0).toUpperCase() + part.value.slice(1) : part.value;
        }
        return part.value;
      })
      .join("");
  }

  function createFallbackId() {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
    } catch (_) {
      // ignore
    }
    return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function parseHora(value) {
    if (!value) return { label: "Horario por confirmar", minutes: Number.POSITIVE_INFINITY };
    const clean = String(value).trim();
    const match = clean.match(/(\d{1,2})(?::(\d{2}))?/);
    if (!match) {
      return { label: clean, minutes: Number.POSITIVE_INFINITY };
    }
    const hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2] ?? "0", 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return { label: clean, minutes: Number.POSITIVE_INFINITY };
    }
    const label = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    return { label, minutes: hours * 60 + minutes };
  }

  function extractDriveId(u) {
    if (!u) return "";
    let match;
    if ((match = String(u).match(/[?&]id=([-\w]+)/))) return match[1];
    if ((match = String(u).match(/\/d\/([-\w]+)/))) return match[1];
    return "";
  }

  function driveImageCandidates(u) {
    const id = extractDriveId(u);
    if (!id) {
      return u ? [u] : [];
    }
    return [
      `https://drive.google.com/uc?export=view&id=${id}`,
      `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
      `https://lh3.googleusercontent.com/d/${id}=w1200`,
    ];
  }

  function uniqueNonEmpty(list) {
    const set = new Set();
    const result = [];
    for (const item of list) {
      const value = val(item);
      if (!value || set.has(value)) continue;
      set.add(value);
      result.push(value);
    }
    return result;
  }

  function buildImageCandidates(ev) {
    const directFlyers = [
      ev.FlyerURL,
      ev.Flyer,
      ev.FlyerWeb,
      ev.Poster,
      ev.Imagen,
      ev.ImagenFlyer,
      ev.ImagenEvento,
      ev.ImagenDestacada,
    ];
    const promotional = [
      ...driveImageCandidates(val(ev.PiezaPromocional)),
      ...driveImageCandidates(val(ev.PiezaPromo)),
      ...driveImageCandidates(val(ev.ImagenPromocional)),
    ];
    return uniqueNonEmpty([...promotional, ...directFlyers]);
  }

  function resolveImageConfig(value) {
    if (!value) return { sources: [], alt: "" };
    if (Array.isArray(value)) return { sources: value, alt: "" };
    if (typeof value === "string") return { sources: [value], alt: "" };
    if (typeof value === "object") {
      const src = Array.isArray(value.sources)
        ? value.sources
        : Array.isArray(value.candidates)
        ? value.candidates
        : [];
      return {
        sources: src,
        alt: val(value.alt || value.altText),
      };
    }
    return { sources: [], alt: "" };
  }

  function createImgWithFallback(config) {
    const { sources, alt } = config;
    const candidates = Array.isArray(sources) ? sources : [];
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    if (alt) img.alt = alt;
    let index = 0;

    const tryNext = () => {
      if (index >= candidates.length) {
        img.onerror = null;
        img.src = PLACEHOLDER_IMAGE;
        return;
      }
      img.src = candidates[index];
      index += 1;
    };

    img.addEventListener("error", tryNext);
    img.addEventListener("load", () => {
      img.onerror = null;
    });

    tryNext();
    return img;
  }

  function mountImageWithFallback(el, value) {
    const config = resolveImageConfig(value);
    el.innerHTML = "";
    el.appendChild(createImgWithFallback(config));
  }

  function norm(ev) {
    const id = val(ev.Id) || val(ev.ID) || createFallbackId();
    const nombre = val(ev.NombreFormato) || val(ev["Nombre de la Obra"]) || "Evento sin nombre";
    const formato =
      val(ev.Formato) ||
      val(ev.FormatoObra) ||
      val(ev["Formato de la Obra"]) ||
      val(ev.TipoFormato) ||
      "";
    const fechaRaw = ev.FechaFuncion || ev.fecha || ev.fechaRaw || "";
    const fechaISO = formatIsoDate(fechaRaw);
    let fechaLabel = "";
    let fechaTime = null;
    if (fechaRaw) {
      const d = new Date(fechaRaw);
      if (!Number.isNaN(d.getTime())) {
        fechaLabel = formatWithCapitalizedMonth(d, { day: "numeric", month: "short", year: "numeric" });
        const local = new Date(d);
        local.setHours(0, 0, 0, 0);
        fechaTime = local.getTime();
      }
    }
    const horaTexto = val(ev.HoraFuncionTexto) || val(ev.HoraFuncion);
    const horaInfo = parseHora(horaTexto);
    const pais = val(ev.Pais) || val(ev["País"]);
    const ciudad = val(ev.Ciudad);
    const lugar = val(ev.Lugar);
    const compania = val(ev.Compania) || val(ev["Compañía"]);
    const descripcion = val(ev.Descripcion) || val(ev.Descripción) || "";
    const imageCandidates = buildImageCandidates(ev);
    const promoCandidates = driveImageCandidates(val(ev.PiezaPromocional));
    const piezaCands = promoCandidates.length ? promoCandidates : imageCandidates;
    const boleteria =
      val(ev.Boleteria) ||
      val(ev.LinkBoleteria) ||
      val(ev["Link Boleteria"]) ||
      val(ev["Link boletos"]) ||
      "";
    const estado = val(ev.Estado) || "Publicado";

    const searchText = normalizeText(
      [
        nombre,
        formato,
        fechaLabel,
        horaTexto,
        pais,
        ciudad,
        lugar,
        compania,
        val(ev.Director),
        val(ev.Sinopsis),
        descripcion,
      ].join(" ")
    );

    return {
      id,
      nombre,
      formato,
      fechaRaw,
      fechaISO,
      fechaLabel,
      fechaTime,
      hora: horaTexto,
      horaLabel: horaInfo.label,
      horaValue: horaInfo.minutes,
      pais,
      ciudad,
      ciudadLabel: ciudad || pais || "",
      lugar,
      lugarLabel: lugar || "Ubicación por confirmar",
      compania,
      boleteria,
      descripcion,
      estado,
      flyerUrl: imageCandidates[0] || "",
      imageCandidates,
      piezaCands,
      searchText,
    };
  }

  const vueExports = window.Vue ?? {};
  const { createApp, ref, reactive, computed, onMounted, watch, onBeforeUnmount } = vueExports;
  if (!createApp) {
    console.error('Vue global build is required for the landing calendar.');
  } else {
    createApp({
      setup() {
        const cargando = ref(true);
        const error = ref("");
        const lista = ref([]);
        const hoy = new Date();
        const hoyISO = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().split("T")[0];
        const hoySinHora = new Date(hoy.getTime());
        hoySinHora.setHours(0, 0, 0, 0);
        const hoyTimestamp = hoySinHora.getTime();
        const mesActual = ref(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
        const ultimaActualizacion = ref(new Date().toLocaleDateString("es-ES", { dateStyle: "long" }));
        const vista = ref("month");

        const filters = reactive({
          search: "",
          pais: "",
          ciudad: "",
          compania: "",
          fecha: hoyISO,
        });
        const filtersExpanded = ref(false);
        const downloadingAgendaPdf = ref(false);
        const detectedCountry = ref("");
        const flyerDialog = ref(null);
        const flyerDialogData = reactive({ title: "", alt: "", meta: "", candidates: [] });
        let lastFlyerTrigger = null;

        const resetFlyerDialog = () => {
          flyerDialogData.title = "";
          flyerDialogData.alt = "";
          flyerDialogData.meta = "";
          flyerDialogData.candidates = [];
        };

        const handleFlyerDialogClose = () => {
          resetFlyerDialog();
          if (lastFlyerTrigger && typeof lastFlyerTrigger.focus === "function") {
            lastFlyerTrigger.focus();
          }
          lastFlyerTrigger = null;
        };

        const closeFlyer = () => {
          const dialogEl = flyerDialog.value;
          if (!dialogEl) return;
          if (typeof dialogEl.close === "function" && dialogEl.open) {
            dialogEl.close();
          } else {
            dialogEl.removeAttribute("open");
            handleFlyerDialogClose();
          }
        };

        const openFlyer = (evento, nativeEvent) => {
          if (!evento || !Array.isArray(evento.imageCandidates) || !evento.imageCandidates.length) {
            return;
          }
          const name = evento.nombre && String(evento.nombre).trim() ? String(evento.nombre).trim() : "Evento sin nombre";
          flyerDialogData.title = name;
          flyerDialogData.alt = `Flyer del evento ${name}`;
          const details = [evento.fechaLabel, evento.horaLabel, evento.lugarLabel]
            .map((part) => (part ? String(part).trim() : ""))
            .filter(Boolean);
          flyerDialogData.meta = details.join(" · ");
          flyerDialogData.candidates = evento.imageCandidates.slice(0, 8);
          const dialogEl = flyerDialog.value;
          if (!dialogEl) {
            return;
          }
          lastFlyerTrigger =
            nativeEvent && nativeEvent.currentTarget instanceof HTMLElement ? nativeEvent.currentTarget : null;
          if (typeof dialogEl.showModal === "function") {
            dialogEl.showModal();
          } else {
            dialogEl.setAttribute("open", "");
          }
        };

        const eventosPublicados = computed(() => lista.value.filter((ev) => ev.estado !== "Despublicado"));

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
            events.sort((a, b) => a.horaValue - b.horaValue || a.nombre.localeCompare(b.nombre, "es"));
          }
          return map;
        });

        const totalEventos = computed(() => eventosPublicados.value.length);

        const dias = computed(() => {
          const base = new Date(mesActual.value.getTime());
          base.setDate(1);
          const offset = (base.getDay() + 6) % 7; // Monday as first day
          const inicio = new Date(base.getTime());
          inicio.setDate(inicio.getDate() - offset);
          const celdas = [];
          for (let i = 0; i < 42; i += 1) {
            const d = new Date(inicio.getTime());
            d.setDate(inicio.getDate() + i);
            const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
            const fechaLocal = new Date(`${iso}T00:00:00`);
            const weekdayLongRaw = fechaLocal.toLocaleDateString("es-ES", { weekday: "long" });
            const weekdayShortRaw = fechaLocal.toLocaleDateString("es-ES", { weekday: "short" });
            const monthLabel = formatWithCapitalizedMonth(fechaLocal, { day: "numeric", month: "long" });
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

      const mesActualLabel = computed(() =>
        formatWithCapitalizedMonth(mesActual.value, { month: "long", year: "numeric" })
      );

      const mesActualCorto = computed(() =>
        formatWithCapitalizedMonth(mesActual.value, { month: "short", year: "numeric" })
      );

      function cambiarMes(delta) {
        const nuevo = new Date(mesActual.value.getTime());
        nuevo.setMonth(nuevo.getMonth() + delta, 1);
        mesActual.value = nuevo;
      }

      function fechaLarga(iso) {
        const fecha = new Date(`${iso}T00:00:00`);
        const baseRaw = formatWithCapitalizedMonth(fecha, {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        return baseRaw.charAt(0).toUpperCase() + baseRaw.slice(1);
      }

      function diaSemanaCorta(iso) {
        const fecha = new Date(`${iso}T00:00:00`);
        const raw = fecha.toLocaleDateString("es-ES", { weekday: "short" });
        return raw.charAt(0).toUpperCase() + raw.slice(1);
      }

      function descripcionFila(day) {
        const base = fechaLarga(day.iso);
        if (!day.eventos.length) {
          return `${base}. Sin eventos.`;
        }
        const cantidad = day.eventos.length === 1 ? "Un evento" : `${day.eventos.length} eventos`;
        return `${base}. ${cantidad}.`;
      }

      const toggleFilters = () => {
        filtersExpanded.value = !filtersExpanded.value;
      };

      const filtersToggleLabel = computed(() =>
        filtersExpanded.value ? "Ocultar filtros" : "Mostrar filtros"
      );

      const optionFromMap = (items) => {
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
          .sort((a, b) => a.label.localeCompare(b.label, "es"));
      };

      const paisOptions = computed(() => optionFromMap(eventosPublicados.value.map((ev) => ev.pais)));
      const ciudadOptions = computed(() => optionFromMap(eventosPublicados.value.map((ev) => ev.ciudad)));
      const companiaOptions = computed(() => optionFromMap(eventosPublicados.value.map((ev) => ev.compania)));

      const activeFilters = computed(() => {
        const chips = [];
        if (filters.pais) {
          const found = paisOptions.value.find((opt) => opt.value === filters.pais);
          chips.push({ key: "pais", label: "País", value: found ? found.label : filters.pais });
        }
        if (filters.ciudad) {
          const found = ciudadOptions.value.find((opt) => opt.value === filters.ciudad);
          chips.push({ key: "ciudad", label: "Ciudad", value: found ? found.label : filters.ciudad });
        }
        if (filters.compania) {
          const found = companiaOptions.value.find((opt) => opt.value === filters.compania);
          chips.push({ key: "compania", label: "Compañía", value: found ? found.label : filters.compania });
        }
        if (filters.fecha) {
          const formatted = new Date(`${filters.fecha}T00:00:00`).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          chips.push({ key: "fecha", label: "Desde", value: formatted });
        }
        if (filters.search) {
          chips.push({ key: "search", label: "Búsqueda", value: filters.search });
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
            const isPastEvent = typeof ev.fechaTime === "number" && ev.fechaTime < todayTime;
            const okPast = !isPastEvent || (f && ev.fechaISO === f);
            return okPast;
          })
          .sort((a, b) => {
            const timeA = typeof a.fechaTime === "number" ? a.fechaTime : Number.POSITIVE_INFINITY;
            const timeB = typeof b.fechaTime === "number" ? b.fechaTime : Number.POSITIVE_INFINITY;
            if (timeA !== timeB) return timeA - timeB;
            if (a.horaValue !== b.horaValue) return a.horaValue - b.horaValue;
            return a.nombre.localeCompare(b.nombre, "es");
          });
      });

      const agendaResultsLabel = computed(() => {
        if (cargando.value) return "Cargando…";
        const count = agendaEventosFiltrados.value.length;
        return `${count} ${count === 1 ? "resultado" : "resultados"}`;
      });

      const totalEventosAgenda = totalEventos;
      const totalPaisesAgenda = computed(
        () => new Set(eventosPublicados.value.map((ev) => ev.pais).filter(Boolean)).size
      );
      const eventosMesAgenda = computed(() => {
        if (!eventosPublicados.value.length) return 0;
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        return eventosPublicados.value.filter((ev) => {
          if (!ev.fechaRaw) return false;
          const d = new Date(ev.fechaRaw);
          if (Number.isNaN(d.getTime())) return false;
          return d.getMonth() === month && d.getFullYear() === year;
        }).length;
      });

      const removeFilter = (key) => {
        if (Object.prototype.hasOwnProperty.call(filters, key)) {
          filters[key] = "";
        }
      };

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
          const response = await fetch("https://ipapi.co/json/");
          if (!response.ok) return;
          const data = await response.json();
          detectedCountry.value = data.country_name || data.country || "";
          applyDetectedCountry();
        } catch (err) {
          console.warn("No se pudo determinar el país del visitante", err);
        }
      };

      watch(paisOptions, applyDetectedCountry);

      const downloadAgendaPdf = async () => {
        if (typeof window === "undefined") return;
        if (typeof html2pdf === "undefined") {
          console.error("La librería html2pdf no está disponible en este navegador.");
          return;
        }
        if (downloadingAgendaPdf.value) return;
        downloadingAgendaPdf.value = true;

        const removeContainer = (container) => {
          if (container && container.parentNode) {
            container.parentNode.removeChild(container);
          }
        };

        const printable = document.createElement("div");
        printable.style.position = "fixed";
        printable.style.left = "-9999px";
        printable.style.top = "0";
        printable.style.width = "210mm";
        printable.style.maxWidth = "100%";
        printable.style.padding = "24px";
        printable.style.backgroundColor = "#ffffff";
        printable.style.color = "#101828";
        printable.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        printable.style.lineHeight = "1.4";

        const title = document.createElement("h1");
        title.textContent = "Agenda ImproWorld";
        title.style.textAlign = "center";
        title.style.margin = "0 0 6px";
        printable.appendChild(title);

        const generatedAt = document.createElement("p");
        generatedAt.textContent = `Generado el ${new Date().toLocaleDateString("es-ES", { dateStyle: "full" })}`;
        generatedAt.style.textAlign = "center";
        generatedAt.style.margin = "0 0 18px";
        generatedAt.style.color = "#475467";
        printable.appendChild(generatedAt);

        const totals = document.createElement("p");
        totals.textContent = `Mostrando ${agendaEventosFiltrados.value.length} de ${eventosPublicados.value.length} eventos disponibles.`;
        totals.style.margin = "0 0 12px";
        printable.appendChild(totals);

        const filtersParagraph = document.createElement("p");
        filtersParagraph.style.margin = "0 0 20px";
        filtersParagraph.textContent = activeFilters.value.length
          ? `Filtros aplicados: ${activeFilters.value.map((chip) => `${chip.label}: ${chip.value}`).join(", ")}`
          : "Filtros aplicados: ninguno";
        printable.appendChild(filtersParagraph);

        const events = agendaEventosFiltrados.value;

        if (!events.length) {
          const empty = document.createElement("p");
          empty.textContent = "No hay eventos disponibles con los filtros seleccionados.";
          empty.style.marginTop = "24px";
          printable.appendChild(empty);
        } else {
          const table = document.createElement("table");
          table.style.width = "100%";
          table.style.borderCollapse = "collapse";
          table.style.fontSize = "11pt";

          const thead = document.createElement("thead");
          const headerRow = document.createElement("tr");
          const headers = ["Evento", "Fecha", "Hora", "Lugar", "Ciudad", "País", "Compañía"];
          headers.forEach((label) => {
            const th = document.createElement("th");
            th.textContent = label;
            th.style.border = "1px solid #e2e8f0";
            th.style.padding = "8px";
            th.style.backgroundColor = "#f8fafc";
            th.style.color = "#344054";
            th.style.textAlign = "left";
            th.style.fontWeight = "600";
            headerRow.appendChild(th);
          });
          thead.appendChild(headerRow);
          table.appendChild(thead);

          const tbody = document.createElement("tbody");

          events.forEach((ev) => {
            const row = document.createElement("tr");

            const eventCell = document.createElement("td");
            eventCell.style.border = "1px solid #e2e8f0";
            eventCell.style.padding = "10px";
            eventCell.style.verticalAlign = "top";

            const name = document.createElement("div");
            name.textContent = ev.nombre;
            name.style.fontWeight = "600";
            name.style.marginBottom = "4px";
            eventCell.appendChild(name);

            const info = document.createElement("div");
            info.textContent = `${ev.lugarLabel || ""}`;
            info.style.fontSize = "0.85rem";
            info.style.color = "#475467";
            eventCell.appendChild(info);

            if (ev.boleteria) {
              const ticket = document.createElement("div");
              ticket.textContent = `Boletería: ${ev.boleteria}`;
              ticket.style.marginTop = "6px";
              ticket.style.fontSize = "0.85rem";
              ticket.style.color = "#475467";
              eventCell.appendChild(ticket);
            }

            row.appendChild(eventCell);

            const createTextCell = (value) => {
              const cell = document.createElement("td");
              cell.textContent = value || "—";
              cell.style.border = "1px solid #e2e8f0";
              cell.style.padding = "8px";
              cell.style.verticalAlign = "top";
              cell.style.whiteSpace = "pre-wrap";
              return cell;
            };

            row.appendChild(createTextCell(ev.fechaLabel || ev.fechaISO || ""));
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

        const filenameDate = new Date().toISOString().split("T")[0];
        const options = {
          margin: 10,
          filename: `agenda-improworld-${filenameDate}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        };

        try {
          await html2pdf().set(options).from(printable).save();
        } catch (err) {
          console.error("No fue posible generar el PDF de la agenda", err);
        } finally {
          downloadingAgendaPdf.value = false;
          removeContainer(printable);
        }
      };

      async function cargar() {
        cargando.value = true;
        error.value = "";
        try {
          const response = await fetch(WEBAPP_URL);
          if (!response.ok) {
            throw new Error(`No se pudo cargar la agenda (${response.status})`);
          }
          const data = await response.json();
          lista.value = Array.isArray(data) ? data.map(norm) : [];
          ultimaActualizacion.value = new Date().toLocaleDateString("es-ES", { dateStyle: "long" });
          applyDetectedCountry();
        } catch (err) {
          console.error("Error al cargar la agenda", err);
          error.value = "No fue posible cargar los eventos. Intenta de nuevo más tarde.";
          lista.value = [];
        } finally {
          cargando.value = false;
        }
      }

      onMounted(() => {
        cargar();
        detectCountry();
        if (flyerDialog.value) {
          flyerDialog.value.addEventListener("close", handleFlyerDialogClose);
        }
      });

      onBeforeUnmount(() => {
        if (flyerDialog.value) {
          flyerDialog.value.removeEventListener("close", handleFlyerDialogClose);
        }
      });

      return {
        cargando,
        error,
        cambiarMes,
        mesActualLabel,
        mesActualCorto,
        totalEventos,
        ultimaActualizacion,
        vista,
        diasDelMes,
        filters,
        filtersExpanded,
        toggleFilters,
        filtersToggleLabel,
        paisOptions,
        ciudadOptions,
        companiaOptions,
        activeFilters,
        agendaResultsLabel,
        agendaEventosFiltrados,
        totalEventosAgenda,
        totalPaisesAgenda,
        eventosMesAgenda,
        removeFilter,
        downloadAgendaPdf,
        downloadingAgendaPdf,
        hoyISO,
        fechaLarga,
        diaSemanaCorta,
        descripcionFila,
        openFlyer,
        closeFlyer,
        flyerDialogData,
        flyerDialog,
      };
    }
  })
      .directive("img-fallback", {
      mounted(el, binding) {
        mountImageWithFallback(el, binding.value);
      },
      updated(el, binding) {
        mountImageWithFallback(el, binding.value);
      },
    })
      .mount("#app");
  }
}
})();
