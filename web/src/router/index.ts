import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
    },
    {
      path: '/instances',
      name: 'instances',
      component: () => import('@/views/InstanceManager.vue'),
    },
  ],
})

export default router
