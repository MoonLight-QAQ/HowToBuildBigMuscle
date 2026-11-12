import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError, http } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import App from '@/App.vue'
import AdminLayout from './AdminLayout.vue'
import { MENU_GROUPS } from './menu'

async function mountAt(path: string) {
  const page = (text: string) => ({ render: () => h('p', text) })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: page('登录页面') },
      {
        path: '/',
        component: AdminLayout,
        children: [{ path: 'orders/:id', component: page('订单详情页面') }],
      },
    ],
  })
  await router.push(path)
  await router.isReady()
  // 挂载 App，让 AdminLayout 由路由渲染，与真实应用一致
  const wrapper = mount(App, { global: { plugins: [router, ElementPlus] } })
  return { router, wrapper }
}

beforeEach(() => {
  setActivePinia(createPinia())
  useAuthStore().setSession({
    expiresAt: '2099-01-01T00:00:00Z',
    admin: { id: '9000000000000000001', account: 'staff', mustChangePassword: false },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** 点击「退出登录」并等待跳转完成 */
async function clickLogout(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper']) {
  const logoutButton = wrapper.findAll('button').find((button) => button.text() === '退出登录')
  expect(logoutButton).toBeDefined()
  await logoutButton?.trigger('click')
  await flushPromises()
}

describe('AdminLayout', () => {
  it('显示所有导航分组和导航项', async () => {
    const { wrapper } = await mountAt('/')
    for (const group of MENU_GROUPS) {
      expect(wrapper.text()).toContain(group.title)
      for (const item of group.items) expect(wrapper.text()).toContain(item.label)
    }
  })

  it('布局只渲染一次', async () => {
    const { wrapper } = await mountAt('/')
    expect(wrapper.findAll('.admin-layout')).toHaveLength(1)
  })

  it('在内容区渲染子路由页面，并高亮所属导航', async () => {
    const { wrapper } = await mountAt('/orders/9000000000000000010')
    expect(wrapper.find('.admin-layout__main').text()).toContain('订单详情页面')
    expect(wrapper.find('.el-menu-item.is-active').text()).toBe('订单')
  })

  it('顶栏显示当前管理员账号', async () => {
    const { wrapper } = await mountAt('/')
    expect(wrapper.find('.admin-layout__account').text()).toBe('staff')
  })

  it('退出登录时调用 /logout，清除登录状态并跳到登录页', async () => {
    const request = vi.spyOn(http, 'request').mockResolvedValue(undefined)
    const { router, wrapper } = await mountAt('/')

    await clickLogout(wrapper)

    expect(request).toHaveBeenCalledWith('/logout', expect.objectContaining({ method: 'POST' }))
    expect(useAuthStore().admin).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('/logout 失败时仍清除登录状态并跳到登录页', async () => {
    vi.spyOn(http, 'request').mockRejectedValue(new ApiError('network'))
    const { router, wrapper } = await mountAt('/')

    await clickLogout(wrapper)

    expect(useAuthStore().admin).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
