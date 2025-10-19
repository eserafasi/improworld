<template>
  <header class="site-header">
    <div class="site-header__inner">
      <RouterLink to="/" class="brand" aria-label="Impro.world · inicio" @click="handleNavigate">
        <span class="brand__mark" aria-hidden="true">impro</span>
        <span class="brand__divider" aria-hidden="true">·</span>
        <span class="brand__name">world</span>
      </RouterLink>

      <button
        ref="toggleRef"
        type="button"
        class="menu-toggle"
        :aria-expanded="String(isMenuOpen)"
        :aria-controls="navigationId"
        :aria-label="isMenuOpen ? 'Cerrar menú' : 'Abrir menú'"
        @click="toggleMenu"
        @keydown.down.prevent="openMenuWithFocus"
      >
        <span class="menu-toggle__label">Menú</span>
        <span class="menu-toggle__icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      <transition name="navbar-slide">
        <nav
          v-show="isDesktop || isMenuOpen"
          :id="navigationId"
          class="primary-nav"
          :class="{ 'is-open': isMenuOpen }"
          :aria-hidden="ariaHidden"
        >
          <ul class="primary-nav__list" role="menubar">
            <li v-for="(item, index) in navigation" :key="item.title" role="none" class="primary-nav__item">
              <RouterLink
                v-if="!item.external"
                :to="item.route"
                custom
                v-slot="{ href, navigate }"
              >
                <a
                  :href="href"
                  role="menuitem"
                  class="primary-nav__link"
                  :class="{ 'is-active': isRouteActive(item.route) }"
                  @click="(event) => handleInternalNavigate(event, navigate)"
                  @keydown="(event) => handleItemKeydown(event, index)"
                  :ref="(el) => setItemRef(el, index)"
                >
                  {{ item.title }}
                </a>
              </RouterLink>
              <a
                v-else
                :href="item.route"
                class="primary-nav__link"
                role="menuitem"
                target="_blank"
                rel="noreferrer noopener"
                @click="handleNavigate"
                @keydown="(event) => handleItemKeydown(event, index)"
                :ref="(el) => setItemRef(el, index)"
              >
                {{ item.title }}
                <span class="primary-nav__external" aria-hidden="true">↗</span>
              </a>
            </li>
          </ul>
        </nav>
      </transition>
    </div>
  </header>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import navigation from '@/nav.config.js';

const navigationId = 'primary-navigation';
const isMenuOpen = ref(false);
const isDesktop = ref(false);
const toggleRef = ref(null);
const itemRefs = ref([]);
const route = useRoute();
let mediaQuery;

function setItemRef(el, index) {
  itemRefs.value[index] = el ?? null;
}

function focusItem(startIndex, step = 1) {
  const items = itemRefs.value;
  const total = items.length;
  if (!total) return;

  let idx = (startIndex + total) % total;
  for (let attempt = 0; attempt < total; attempt += 1) {
    const element = items[idx];
    if (element) {
      element.focus();
      return;
    }
    idx = (idx + step + total) % total;
  }
}

function updateIsDesktop(matches) {
  isDesktop.value = matches;
  if (matches) {
    isMenuOpen.value = false;
  }
}

function handleMediaChange(event) {
  updateIsDesktop(event.matches);
}

function setupMediaQuery() {
  if (typeof window === 'undefined') return;
  mediaQuery = window.matchMedia('(min-width: 960px)');
  updateIsDesktop(mediaQuery.matches);
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleMediaChange);
  } else {
    mediaQuery.addListener(handleMediaChange);
  }
}

function cleanupMediaQuery() {
  if (!mediaQuery) return;
  if (typeof mediaQuery.removeEventListener === 'function') {
    mediaQuery.removeEventListener('change', handleMediaChange);
  } else {
    mediaQuery.removeListener(handleMediaChange);
  }
}

function toggleMenu() {
  if (isDesktop.value) return;
  isMenuOpen.value = !isMenuOpen.value;
  if (isMenuOpen.value) {
    focusFirstItem();
  }
}

function openMenuWithFocus() {
  if (isDesktop.value) return;
  if (!isMenuOpen.value) {
    isMenuOpen.value = true;
  }
  focusFirstItem();
}

function closeMenu(shouldFocusToggle = true) {
  if (!isMenuOpen.value) return;
  isMenuOpen.value = false;
  if (shouldFocusToggle) {
    nextTick(() => {
      toggleRef.value?.focus();
    });
  }
}

function handleInternalNavigate(event, navigate) {
  navigate(event);
  handleNavigate();
}

function handleNavigate() {
  if (!isDesktop.value) {
    closeMenu(false);
  }
}

function focusFirstItem() {
  nextTick(() => {
    focusItem(0, 1);
  });
}

function handleDocumentKeydown(event) {
  if (event.key === 'Escape' && isMenuOpen.value) {
    event.preventDefault();
    closeMenu(true);
  }
}

function handleItemKeydown(event, index) {
  const total = itemRefs.value.length;
  if (!total) return;

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault();
    focusItem(index + 1, 1);
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault();
    focusItem(index - 1, -1);
  } else if (event.key === 'Home') {
    event.preventDefault();
    focusItem(0, 1);
  } else if (event.key === 'End') {
    event.preventDefault();
    focusItem(total - 1, -1);
  } else if (event.key === 'Escape') {
    closeMenu(true);
  }
}

function isRouteActive(path) {
  return route.path === path;
}

const ariaHidden = computed(() => {
  if (isDesktop.value) {
    return 'false';
  }
  return String(!isMenuOpen.value);
});

onMounted(() => {
  setupMediaQuery();
  document.addEventListener('keydown', handleDocumentKeydown);
});

onBeforeUnmount(() => {
  cleanupMediaQuery();
  document.removeEventListener('keydown', handleDocumentKeydown);
});

watch(
  () => route.fullPath,
  () => {
    if (!isDesktop.value) {
      closeMenu(false);
    }
  },
);
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
  width: 100%;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(124, 58, 237, 0.1);
}

.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 auto;
  max-width: 1120px;
  padding: 14px 20px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: 0.04em;
  color: #4c1d95;
  text-decoration: none;
  text-transform: uppercase;
}

.brand__mark {
  background: linear-gradient(120deg, #7c3aed, #4338ca);
  -webkit-background-clip: text;
  color: transparent;
}

.brand__divider {
  color: rgba(76, 29, 149, 0.6);
  font-weight: 400;
}

.brand__name {
  color: #1f2937;
  font-weight: 600;
}

.menu-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(124, 58, 237, 0.24);
  background: rgba(255, 255, 255, 0.82);
  color: #4c1d95;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-toggle:focus-visible {
  outline: 3px solid rgba(124, 58, 237, 0.35);
  outline-offset: 2px;
}

.menu-toggle:hover {
  background: rgba(124, 58, 237, 0.08);
}

.menu-toggle__icon {
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
}

.menu-toggle__icon span {
  display: block;
  width: 18px;
  height: 2px;
  background: currentColor;
  border-radius: 999px;
}

.menu-toggle__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.primary-nav {
  position: fixed;
  inset: 72px 20px auto;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  box-shadow: 0 24px 50px rgba(76, 29, 149, 0.15);
  padding: 18px;
  transform-origin: top right;
}

.primary-nav__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.primary-nav__item {
  display: flex;
}

.primary-nav__link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  color: rgba(30, 41, 59, 0.85);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.primary-nav__link:hover,
.primary-nav__link:focus-visible {
  background: rgba(124, 58, 237, 0.1);
  color: #4c1d95;
  outline: none;
}

.primary-nav__link.is-active {
  color: #4c1d95;
}

.primary-nav__link.is-active::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 6px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, #7c3aed, #4338ca);
}

.primary-nav__external {
  font-size: 0.8rem;
  opacity: 0.7;
}

.navbar-slide-enter-active,
.navbar-slide-leave-active {
  transition: opacity 0.18s ease, transform 0.2s ease;
}

.navbar-slide-enter-from,
.navbar-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}

@media (min-width: 960px) {
  .menu-toggle {
    display: none;
  }

  .primary-nav {
    position: static;
    display: block;
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    transform: none !important;
  }

  .primary-nav__list {
    flex-direction: row;
    gap: 6px;
  }

  .primary-nav__link {
    padding: 10px 16px;
  }

  .primary-nav__link.is-active::after {
    bottom: -4px;
  }
}
</style>
