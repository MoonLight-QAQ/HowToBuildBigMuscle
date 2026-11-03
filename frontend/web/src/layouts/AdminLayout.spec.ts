import { beforeEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
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
  const wrapper = mount(AdminLayout, { global: { plugins: [router, ElementPlus] } })
  return { router, wrapper }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  useAuthStore().setSession({
    token: 'admin-token',
    expiresAt: '2099-01-01T00:00:00Z',
    admin: { id: '9000000000000000001', account: 'staff' },
  })
})

describe('AdminLayout', () => {
  it('显示所有导航分组和导航项', async () => {
    const { wrapper } = await mountAt('/')
    for (const group of MENU_GROUPS) {
      expect(wrapper.text()).toContain(group.title)
      for (const item of group.items) expect(wrapper.text()).toContain(item.label)
    }
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

  it('退出登录后清除登录信息并跳到登录页', async () => {
    const { router, wrapper } = await mountAt('/')
    const logoutButton = wrapper.findAll('button').find((button) => button.text() === '退出登录')

    expect(logoutButton).toBeDefined()
    await logoutButton?.trigger('click')
    await router.isReady()
    await new Promise((resolve) => setTimeout(resolve))

    expect(useAuthStore().token).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
