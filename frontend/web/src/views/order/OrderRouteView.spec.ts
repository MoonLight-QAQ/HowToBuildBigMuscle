import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { setupAuthGuard, type SessionState } from '@/router/guard'
import OrderRouteView from './OrderRouteView.vue'
import OrderListView from './OrderListView.vue'
import OrderDetailView from './OrderDetailView.vue'

const orderId = '9000000000000000010'
const wrappers: VueWrapper[] = []

/** 使用正式路由和守卫，安装仅供测试的登录与改密落地页。 / Use the real route table and guard with test-only auth destinations. */
function createOrderRouter(session: SessionState) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  const placeholder = defineComponent({ template: '<div />' })
  router.addRoute({ path: '/login', component: placeholder })
  router.addRoute({ path: '/change-password', component: placeholder })
  /** 返回用例的会话状态，不访问真实账号。 / Return the test session without accessing a real account. */
  function getSession(): SessionState {
    return session
  }
  setupAuthGuard(router, getSession)
  return router
}

/** 卸载已挂载的路由宿主并恢复间谍。 / Unmount route hosts and restore test spies. */
afterEach(function cleanup() {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.restoreAllMocks()
})

/** 验证正式深链接使用后台布局，并覆盖筛选、详情与返回导航。 / Exercise the real deep link, layout match, selection and return navigation. */
it('preserves order filters across list and detail navigation', async function testOrderLinks() {
  const router = createOrderRouter({ isLoggedIn: true, mustChangePassword: false })
  await router.push('/orders?status=pending')
  expect(router.currentRoute.value.name).toBe('OrderList')
  expect(router.currentRoute.value.matched.map(({ path }) => path)).toEqual(['/', '/orders'])
  const wrapper = mount(OrderRouteView, {
    global: { plugins: [router], stubs: { OrderListView: true, OrderDetailView: true } },
  })
  wrappers.push(wrapper)
  const list = wrapper.getComponent(OrderListView)
  expect(list.props('initialStatus')).toBe('pending')
  list.vm.$emit('statusChange', 'delivering')
  await flushPromises()
  expect(router.currentRoute.value.fullPath).toBe('/orders?status=delivering')
  list.vm.$emit('openOrder', orderId)
  await flushPromises()
  expect(router.currentRoute.value.fullPath).toBe(`/orders/${orderId}?status=delivering`)
  expect(router.currentRoute.value.name).toBe('OrderDetail')
  const detail = wrapper.getComponent(OrderDetailView)
  expect(detail.props()).toMatchObject({ orderId, refundLinkAvailable: false })
  detail.vm.$emit('back')
  await flushPromises()
  expect(router.currentRoute.value.fullPath).toBe('/orders?status=delivering')
  expect(wrapper.getComponent(OrderListView).props('initialStatus')).toBe('delivering')
  await router.push('/orders?status=pending&status=done')
  expect(wrapper.getComponent(OrderListView).props('initialStatus')).toBe('')
})

/** 未登录时保留原订单路径，须改密时先停在改密入口。 / Preserve the original order deep link when signed out and require password change first. */
it('protects order routes using the shared session guard', async function testOrderGuard() {
  const path = `/orders/${orderId}?status=pending`
  const signedOut = createOrderRouter({ isLoggedIn: false, mustChangePassword: false })
  await signedOut.push(path)
  expect(signedOut.currentRoute.value).toMatchObject({
    path: '/login',
    query: { redirect: path },
  })
  const passwordChange = createOrderRouter({ isLoggedIn: true, mustChangePassword: true })
  await passwordChange.push('/orders')
  expect(passwordChange.currentRoute.value.path).toBe('/change-password')
})
