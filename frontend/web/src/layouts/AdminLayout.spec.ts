import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElMessage } from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError, http } from '@/api/http'
import { LOGOUT_UNCONFIRMED_MESSAGE } from '@/constants/error-code'
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

  it('/logout 返回 NEED_LOGIN 时会话本来就已失效，同样跳到登录页', async () => {
    vi.spyOn(http, 'request').mockRejectedValue(new ApiError('business', 401, 'NEED_LOGIN'))
    const { router, wrapper } = await mountAt('/')

    await clickLogout(wrapper)

    expect(useAuthStore().admin).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it.each([
    ['网络错误', () => new ApiError('network')],
    ['5xx', () => new ApiError('business', 500, 'INTERNAL_ERROR')],
  ])('/logout %s时不显示为退出成功：留在当前页、保留账号，并提示重试', async (_name, error) => {
    vi.spyOn(http, 'request').mockRejectedValue(error())
    const showError = vi.spyOn(ElMessage, 'error').mockImplementation(() => ({ close: () => {} }))
    const { router, wrapper } = await mountAt('/orders/9000000000000000010')

    await clickLogout(wrapper)

    expect(router.currentRoute.value.path).toBe('/orders/9000000000000000010')
    expect(useAuthStore().admin?.account).toBe('staff')
    expect(wrapper.find('.admin-layout__account').text()).toBe('staff')
    expect(showError).toHaveBeenCalledWith(LOGOUT_UNCONFIRMED_MESSAGE)
  })

  it('退出失败后可以再点一次重试，成功后跳到登录页', async () => {
    const request = vi
      .spyOn(http, 'request')
      .mockRejectedValueOnce(new ApiError('network'))
      .mockResolvedValueOnce(undefined)
    vi.spyOn(ElMessage, 'error').mockImplementation(() => ({ close: () => {} }))
    const { router, wrapper } = await mountAt('/')

    await clickLogout(wrapper)
    expect(router.currentRoute.value.path).toBe('/')

    await clickLogout(wrapper)
    expect(request).toHaveBeenCalledTimes(2)
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('请求进行中再点「退出登录」不会重复发请求', async () => {
    let finish: () => void = () => {}
    const request = vi.spyOn(http, 'request').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve(undefined)
        }),
    )
    const { router, wrapper } = await mountAt('/')
    const logoutButton = wrapper.findAll('button').find((button) => button.text() === '退出登录')

    await logoutButton?.trigger('click')
    await logoutButton?.trigger('click')
    expect(request).toHaveBeenCalledTimes(1)

    finish()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
