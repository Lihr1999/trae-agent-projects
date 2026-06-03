import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/command'
  },
  {
    path: '/command',
    name: 'CommandCenter',
    component: () => import('@/views/CommandCenter.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/report',
    name: 'DrillReport',
    component: () => import('@/views/DrillReport.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('access_token')
  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && token) {
    next({ name: 'CommandCenter' })
  } else {
    next()
  }
})

export default router
