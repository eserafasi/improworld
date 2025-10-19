<template>
  <section class="filters-card" :class="{ 'is-collapsed': !filtersExpanded }">
    <header class="filters-card__header">
      <h2 class="filters-card__title"><span>🎟️</span> Filtrar agenda</h2>
      <div class="filters-card__meta">
        <div class="filter-summary">
          <span v-if="showCount" class="filter-summary__count">{{ showCount }}</span>
          <template v-for="chip in activeFilters" :key="chip.key">
            <span class="chip">
              {{ chip.label }}: {{ chip.value }}
              <button type="button" @click="$emit('remove', chip.key)" aria-label="Quitar filtro">&times;</button>
            </span>
          </template>
        </div>
        <button
          type="button"
          class="filters-toggle"
          @click="$emit('toggle')"
          :aria-expanded="filtersExpanded"
          aria-controls="filters-panel"
        >
          <span aria-hidden="true">▾</span>
          {{ filtersToggleLabel }}
        </button>
      </div>
    </header>
    <div class="filters" id="filters-panel" :aria-hidden="!filtersExpanded">
      <label for="fPais">
        País
        <select id="fPais" v-model="filters.pais">
          <option value="">Todos los países</option>
          <option v-for="opt in paisOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <label for="fCiudad">
        Ciudad
        <select id="fCiudad" v-model="filters.ciudad">
          <option value="">Todas las ciudades</option>
          <option v-for="opt in ciudadOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <label for="fCompania">
        Compañía
        <select id="fCompania" v-model="filters.compania">
          <option value="">Todas las compañías</option>
          <option v-for="opt in companiaOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <label for="fFecha">
        Fecha desde
        <input id="fFecha" type="date" v-model="filters.fecha" :min="minDate" />
      </label>
      <label for="fSearch">
        Búsqueda
        <input
          id="fSearch"
          type="text"
          v-model="filters.search"
          placeholder="Buscar por título, lugar o compañía"
        />
      </label>
    </div>
  </section>
</template>

<script setup>
defineProps({
  filters: { type: Object, required: true },
  filtersExpanded: { type: Boolean, required: true },
  filtersToggleLabel: { type: String, required: true },
  paisOptions: { type: Array, required: true },
  ciudadOptions: { type: Array, required: true },
  companiaOptions: { type: Array, required: true },
  activeFilters: { type: Array, required: true },
  showCount: { type: String, default: '' },
  minDate: { type: String, default: '' },
});

defineEmits(['toggle', 'remove']);
</script>
