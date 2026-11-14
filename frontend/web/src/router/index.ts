import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { setupAuthGuard } from './guard'

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

      // 城市（W-02）
      {
        path: 'cities',
        name: 'CityList',
        component: () => import('@/views/city/CityListView.vue'),
        meta: { title: '城市' },
      },
    ],
  },

  // TODO(W-03)：添加登录页后再加兜底路由 { path: '/:pathMatch(.*)*', redirect: HOME_PATH }。
  // 兜底路由优先级最低，只匹配其他路由都匹配不到的路径，放在哪里都可以。
  // 不能在登录页之前加：否则 /login 会被它重定向到 /，再被守卫重定向回 /login，陷入循环。
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 守卫在每次导航时才读取 store，此时 main.ts 已安装 Pinia；登录状态确认（/me 返回）之前不做判断
setupAuthGuard(router, () => useAuthStore().getSessionState())

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - ${APP_TITLE}` : APP_TITLE
})

export default router
