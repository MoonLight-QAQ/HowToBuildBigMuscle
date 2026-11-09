/// <reference types="node" />
import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { orderApi } from '@/api/order'
import { ApiError } from '@/api/http'
import { ElSelect } from 'element-plus'
import OrderListView from './OrderListView.vue'
import { createOrder, projectOrder } from './order-test-data'

/** 使用ElementPlus真实CJS组件，避免默认导出互操作歧义，不替换组件逻辑。 / Use real CJS components to avoid interop ambiguity while preserving component behavior. */
vi.mock('element-plus', async function loadRealComponents() {
  const { createRequire } = await import('node:module')
  return createRequire(import.meta.url)('element-plus') as typeof import('element-plus')
})
const wrappers: VueWrapper[] = []
/** 卸载真实组件并还原服务间谍；避免跨例泄漏。 / Unmount real components and restore service spies between tests. */
afterEach(function cleanupComponents() {
  for (const wrapper of wrappers) wrapper.unmount()
  wrappers.length = 0
  vi.restoreAllMocks()
})

/** 渲染真实表格，显示快照金额/时区并发送详情导航事件，列表不提供写操作。 / Render snapshot money/time in the real table and emit detail navigation without list writes. */
it('renders order snapshots and emits openOrder with the original string ID', async function testListNavigation() {
  vi.spyOn(orderApi, 'list').mockResolvedValue({
    items: [projectOrder(createOrder())],
    total: 1,
    page: 1,
    pageSize: 20,
  })
  const wrapper = mount(OrderListView)
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.text()).toContain('MOCK-ORDER-001')
  expect(wrapper.text()).toContain('A$ 84.00')
  expect(wrapper.text()).toContain('2026-11-02 18:00:00')
  expect(wrapper.text()).not.toContain('0491 570 006')
  expect(wrapper.text()).not.toContain('开始配送')
  const buttons = wrapper.findAll('button')
  for (const button of buttons) if (button.text() === '查看详情') await button.trigger('click')
  expect(wrapper.emitted('openOrder')).toEqual([['9000000000000000010']])
})

/** 真实筛选组件将状态传到数据层，返回全部时移除筛选参数。 / The real select delegates status to data logic and removes it for all orders. */
it('filters through the real select and omits all-status query', async function testSelectFilter() {
  const list = vi
    .spyOn(orderApi, 'list')
    .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
  const wrapper = mount(OrderListView)
  wrappers.push(wrapper)
  await flushPromises()
  const select = wrapper.findComponent(ElSelect)
  select.vm.$emit('update:modelValue', 'done')
  select.vm.$emit('change', 'done')
  await flushPromises()
  expect(list.mock.lastCall?.[0]).toEqual({ page: 1, pageSize: 20, status: 'done' })
  select.vm.$emit('update:modelValue', '')
  select.vm.$emit('change', '')
  await flushPromises()
  expect(list.mock.lastCall?.[0]).toEqual({ page: 1, pageSize: 20 })
  expect(wrapper.text()).toContain('当前筛选下暂无订单')
})

/** 页面失败显示重试，重试成功后清除错误并呈现空态。 / Show retry after failure and clear the error after a successful empty response. */
it('shows an error and supports retry with real UI', async function testListRetry() {
  const list = vi
    .spyOn(orderApi, 'list')
    .mockRejectedValueOnce(new ApiError('network'))
    .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 })
  const wrapper = mount(OrderListView)
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  for (const button of wrapper.findAll('button'))
    if (button.text() === '重试') await button.trigger('click')
  await flushPromises()
  expect(list).toHaveBeenCalledTimes(2)
  expect(wrapper.text()).toContain('当前筛选下暂无订单')
})
