import { createRouter, createWebHistory } from 'vue-router';
import CalendarPage from '@/components/CalendarPage.vue';

const routes = [
  {
    path: '/',
    name: 'calendar',
    component: CalendarPage,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
