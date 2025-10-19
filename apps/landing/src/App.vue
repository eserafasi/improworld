<template>
  <div class="page" v-cloak>
    <Navbar />
    <SuggestionCenter />
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router';
import Navbar from '@/components/Navbar.vue';
import SuggestionCenter from '@/components/SuggestionCenter.vue';
</script>
