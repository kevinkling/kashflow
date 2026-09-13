import { createRouter, createWebHistory } from 'vue-router'

// 5 rutas, paridad con public/js/core/nav.js. 404 -> Inicio (el index.js viejo no
// tenia rutas reales; con Vue Router en history mode el servidor necesita el fallback
// SPA de la Fase 11 para que refrescar /movimientos, etc. no rompa).
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'inicio',
      component: () => import('@/views/InicioView.vue'),
    },
    {
      path: '/movimientos',
      name: 'movimientos',
      component: () => import('@/views/MovimientosView.vue'),
    },
    {
      path: '/obligaciones',
      name: 'obligaciones',
      component: () => import('@/views/ObligacionesView.vue'),
    },
    {
      path: '/simulador',
      name: 'simulador',
      component: () => import('@/views/SimuladorView.vue'),
    },
    {
      path: '/cuentas',
      name: 'cuentas',
      component: () => import('@/views/CuentasView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'inicio' },
    },
  ],
})

export default router
