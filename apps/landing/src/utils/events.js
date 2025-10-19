const WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbwoCLUfEiRjnmzumQ-Qs82vLUMpfTWHuemY8W6NODHVhGskbdQQHh-rIHKJUpS0cPCSxQ/exec';

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA4MDAgNDUwJz4KPHJlY3QgZmlsbD0nI2VkZTlmZScgd2lkdGg9JzgwMCcgaGVpZ2h0PSc0NTAnLz4KPHRleHQgeD0nNTAlJyB5PSc1MCUnIGZpbGw9JyM3YzNhZWQnIGZvbnQtZmFtaWx5PSdJbnRlciwgQXJpYWwsIHNhbnMtc2VyaWYnIGZvbnQtc2l6ZT0nNDgnIHRleHQtYW5jaG9yPSdtaWRkbGUnIGRvbWluYW50LWJhc2VsaW5lPSdtaWRkbGUnPlNpbiBpbWFnZW48L3RleHQ+Cjwvc3ZnPg==';

function val(x) {
  return x === undefined || x === null ? '' : String(x).trim();
}

function normalizeText(t) {
  return t ? t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
}

function formatIsoDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  return d.toISOString().split('T')[0];
}

const monthFormatterCache = new Map();

function formatWithCapitalizedMonth(date, options) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }
  const key = JSON.stringify(
    Object.keys(options || {})
      .sort()
      .map((prop) => [prop, options[prop]])
  );
  let formatter = monthFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('es-ES', options);
    monthFormatterCache.set(key, formatter);
  }
  return formatter
    .formatToParts(date)
    .map((part) => {
      if (part.type === 'month') {
        return part.value ? part.value.charAt(0).toUpperCase() + part.value.slice(1) : part.value;
      }
      return part.value;
    })
    .join('');
}

function createFallbackId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (_err) {
    // ignore
  }
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseHora(value) {
  if (!value) return { label: 'Horario por confirmar', minutes: Number.POSITIVE_INFINITY };
  const clean = String(value).trim();
  const match = clean.match(/(\d{1,2})(?::(\d{2}))?/);
  if (!match) {
    return { label: clean, minutes: Number.POSITIVE_INFINITY };
  }
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2] ?? '0', 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return { label: clean, minutes: Number.POSITIVE_INFINITY };
  }
  const label = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return { label, minutes: hours * 60 + minutes };
}

function extractDriveId(u) {
  if (!u) return '';
  let match;
  if ((match = String(u).match(/[?&]id=([-\w]+)/))) return match[1];
  if ((match = String(u).match(/\/d\/([-\w]+)/))) return match[1];
  return '';
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
  if (!value) return { sources: [], alt: '' };
  if (Array.isArray(value)) return { sources: value, alt: '' };
  if (typeof value === 'string') return { sources: [value], alt: '' };
  if (typeof value === 'object') {
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
  return { sources: [], alt: '' };
}

function createImgWithFallback(config) {
  const { sources, alt } = config;
  const candidates = Array.isArray(sources) ? sources : [];
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
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

  img.addEventListener('error', tryNext);
  img.addEventListener('load', () => {
    img.onerror = null;
  });

  tryNext();
  return img;
}

function mountImageWithFallback(el, value) {
  const config = resolveImageConfig(value);
  el.innerHTML = '';
  el.appendChild(createImgWithFallback(config));
}

function norm(ev) {
  const id = val(ev.Id) || val(ev.ID) || createFallbackId();
  const nombre = val(ev.NombreFormato) || val(ev['Nombre de la Obra']) || 'Evento sin nombre';
  const formato =
    val(ev.Formato) ||
    val(ev.FormatoObra) ||
    val(ev['Formato de la Obra']) ||
    val(ev.TipoFormato) ||
    '';
  const fechaRaw = ev.FechaFuncion || ev.fecha || ev.fechaRaw || '';
  const fechaISO = formatIsoDate(fechaRaw);
  let fechaLabel = '';
  let fechaTime = null;
  if (fechaRaw) {
    const d = new Date(fechaRaw);
    if (!Number.isNaN(d.getTime())) {
      fechaLabel = formatWithCapitalizedMonth(d, { day: 'numeric', month: 'short', year: 'numeric' });
      const local = new Date(d);
      local.setHours(0, 0, 0, 0);
      fechaTime = local.getTime();
    }
  }
  const horaTexto = val(ev.HoraFuncionTexto) || val(ev.HoraFuncion);
  const horaInfo = parseHora(horaTexto);
  const pais = val(ev.Pais) || val(ev['País']);
  const ciudad = val(ev.Ciudad);
  const lugar = val(ev.Lugar);
  const compania = val(ev.Compania) || val(ev['Compañía']);
  const descripcion = val(ev.Descripcion) || val(ev.Descripción) || '';
  const imageCandidates = buildImageCandidates(ev);
  const promoCandidates = driveImageCandidates(val(ev.PiezaPromocional));
  const piezaCands = promoCandidates.length ? promoCandidates : imageCandidates;
  const boleteria =
    val(ev.Boleteria) ||
    val(ev.LinkBoleteria) ||
    val(ev['Link Boleteria']) ||
    val(ev['Link boletos']) ||
    '';
  const estado = val(ev.Estado) || 'Publicado';

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
    ].join(' ')
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
    ciudadLabel: ciudad || pais || '',
    lugar,
    lugarLabel: lugar || 'Ubicación por confirmar',
    compania,
    boleteria,
    descripcion,
    estado,
    flyerUrl: imageCandidates[0] || '',
    imageCandidates,
    piezaCands,
    searchText,
  };
}

export {
  WEBAPP_URL,
  PLACEHOLDER_IMAGE,
  norm,
  mountImageWithFallback,
  formatIsoDate,
  formatWithCapitalizedMonth,
  normalizeText,
  val,
};
