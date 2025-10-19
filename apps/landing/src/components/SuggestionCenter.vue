<template>
  <div class="suggestion-center">
    <div class="suggestion-trigger">
      <button type="button" class="suggestion-button" @click="openDialog" ref="triggerRef">
        Tengo una idea!!!
      </button>
      <button
        type="button"
        class="suggestion-info-button"
        :aria-expanded="infoVisible"
        aria-controls="suggestion-info"
        aria-label="¿Cómo usamos tus ideas?"
        @click="toggleInfo"
      >?</button>
    </div>
    <div
      id="suggestion-info"
      class="suggestion-info"
      :class="{ 'is-visible': infoVisible }"
      v-show="infoVisible"
      :hidden="!infoVisible"
    >
      ¿Un problema en la impro que te gustaría resolver? Cuéntanoslo — podríamos convertirlo en una solución abierta para todos.
      Leemos las ideas/problemas y ejecutamos/resolvemos las más pedidas.
    </div>
    <dialog
      ref="dialogRef"
      class="suggestion-dialog"
      aria-labelledby="suggestionDialogTitle"
      @close="handleDialogClose"
      @cancel.prevent="closeDialog"
    >
      <form
        class="suggestion-dialog__inner"
        method="POST"
        action="https://docs.google.com/forms/d/e/1FAIpQLScCdkRzlzCz5LYI-UWOafbBLKZJ5oHd4Ah32JTmB8_TfV5PJg/formResponse"
        target="suggestionFrame"
        @submit="handleSubmit"
      >
        <h2 id="suggestionDialogTitle">Envía tu sugerencia</h2>
        <p>Cuéntanos qué te gustaría mejorar o agregar.</p>
        <label class="visually-hidden" for="suggestionTextarea">Tu sugerencia</label>
        <textarea
          id="suggestionTextarea"
          name="sugerencia-visible"
          maxlength="200"
          placeholder="Ej.: Agregar modo oscuro, filtrar por categoría..."
          required
          aria-describedby="suggestionCounter"
          v-model="suggestion"
          ref="textareaRef"
          @input="updateCounter"
        ></textarea>
        <input type="hidden" name="entry.1381094280" :value="suggestion" />
        <input type="hidden" name="fvv" value="1" />
        <input type="hidden" name="draftResponse" value="[]" />
        <input type="hidden" name="pageHistory" value="0" />
        <input type="hidden" name="fbzx" :value="fbzx" />
        <label class="visually-hidden" for="suggestionHoneypot">Deja este campo vacío</label>
        <input
          type="text"
          id="suggestionHoneypot"
          name="entry.999999999"
          tabindex="-1"
          autocomplete="off"
          class="visually-hidden"
          v-model="honeypot"
        />
        <div class="suggestion-counter" id="suggestionCounter">{{ counterLabel }}</div>
        <div class="suggestion-status" :class="statusClass" role="status" aria-live="polite">
          {{ statusMessage }}
        </div>
        <div class="suggestion-dialog__actions">
          <button type="button" class="cancel-button" @click="closeDialog">Cancelar</button>
          <input type="submit" value="Enviar" class="submit-button" />
        </div>
      </form>
    </dialog>
    <iframe
      title="Envío de sugerencias"
      name="suggestionFrame"
      id="suggestionFrame"
      class="visually-hidden"
      ref="iframeRef"
    ></iframe>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';

const dialogRef = ref(null);
const textareaRef = ref(null);
const iframeRef = ref(null);
const triggerRef = ref(null);
const suggestion = ref('');
const honeypot = ref('');
const fbzx = ref('');
const statusMessage = ref('');
const statusType = ref('idle');
const infoVisible = ref(false);
let awaitingResponse = false;
let timeoutId = null;
let closeId = null;

const counterLabel = computed(() => `${suggestion.value.length} / 200`);

const statusClass = computed(() => {
  if (statusType.value === 'success') {
    return 'suggestion-status suggestion-status--success';
  }
  if (statusType.value === 'error') {
    return 'suggestion-status suggestion-status--error';
  }
  return 'suggestion-status';
});

function resetTimers() {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  if (closeId) {
    clearTimeout(closeId);
    closeId = null;
  }
}

function generateFbzx() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function refreshFbzx() {
  fbzx.value = generateFbzx();
}

function resetStatus() {
  statusMessage.value = '';
  statusType.value = 'idle';
}

function updateCounter() {
  if (suggestion.value.length > 200) {
    suggestion.value = suggestion.value.slice(0, 200);
  }
}

function toggleInfo() {
  infoVisible.value = !infoVisible.value;
}

function hideInfo() {
  infoVisible.value = false;
}

function openDialog() {
  const dialog = dialogRef.value;
  if (!dialog) return;
  suggestion.value = '';
  honeypot.value = '';
  resetStatus();
  resetTimers();
  awaitingResponse = false;
  refreshFbzx();
  hideInfo();
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
  requestAnimationFrame(() => {
    textareaRef.value?.focus();
  });
}

function closeDialog() {
  const dialog = dialogRef.value;
  if (!dialog) return;
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
    handleDialogClose();
  }
}

function handleDialogClose() {
  awaitingResponse = false;
  resetTimers();
  resetStatus();
  suggestion.value = '';
  honeypot.value = '';
  fbzx.value = '';
  triggerRef.value?.focus();
}

function handleSubmit(event) {
  if (honeypot.value) {
    event.preventDefault();
    return;
  }
  refreshFbzx();
  updateCounter();
  awaitingResponse = true;
  resetStatus();
  statusMessage.value = 'Enviando…';
  timeoutId = setTimeout(() => {
    if (awaitingResponse) {
      awaitingResponse = false;
      statusMessage.value = 'No pudimos enviar tu sugerencia. Inténtalo de nuevo.';
      statusType.value = 'error';
    }
    timeoutId = null;
  }, 8000);
}

function handleIframeLoad() {
  if (!awaitingResponse) {
    return;
  }
  awaitingResponse = false;
  resetTimers();
  statusMessage.value = '¡Gracias! Recibimos tu sugerencia.';
  statusType.value = 'success';
  closeId = setTimeout(() => {
    closeDialog();
  }, 2000);
}

onMounted(() => {
  refreshFbzx();
  if (iframeRef.value) {
    iframeRef.value.addEventListener('load', handleIframeLoad);
  }
});

onBeforeUnmount(() => {
  if (iframeRef.value) {
    iframeRef.value.removeEventListener('load', handleIframeLoad);
  }
  resetTimers();
});
</script>
