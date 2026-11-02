import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题，显示在浏览器标签上 */
    title?: string
    /** 为 true 时不需要登录。登录页不用标记，守卫已单独处理 */
    public?: boolean
  }
}

const APP_TITLE = '拾澳管理后台'

/**
 * 路由表。路径和模块的对应关系见 frontend/web/AGENTS.md 的「页面与路由」一节。
 * 各模块只添加属于自己的路由，页面组件一律懒加载：() => import('@/views/<模块>/<名称>View.vue')
 */
export const routes: RouteRecordRaw[] = [
  // ===== 不使用后台布局的页面 =====
  // W-03 在这里添加登录页：{ path: '/login', name: 'Login', component: ..., meta: { title: '登录' } }

  // ===== 需要登录、使用后台布局的页面 =====
  {
    path: '/',
    component: AdminLayout,
    children: [
      // 各模块在这里添加自己的路由，path 不以 / 开头，例如：
      // { path: 'cities', name: 'CityList', component: () => import('@/views/city/CityListView.vue'), meta: { title: '城市' } }
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// TODO(W-01c)：登录状态的 store 完成后，在这里注册登录守卫：
//   setupAuthGuard(router, () => useAuthStore().isLoggedIn)

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - ${APP_TITLE}` : APP_TITLE
})

export default router
