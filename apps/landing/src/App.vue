<template>
  <div class="page" v-cloak>
    <SuggestionCenter />
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router';
import SuggestionCenter from '@/components/SuggestionCenter.vue';
</script>
