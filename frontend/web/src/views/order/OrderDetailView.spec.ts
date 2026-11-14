/// <reference types="node" />
import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ElMessageBox, type MessageBoxData } from 'element-plus'
import { orderApi } from '@/api/order'
import { ApiError } from '@/api/http'
import { ERROR_CODE } from '@/constants/error-code'
import OrderDetailView from './OrderDetailView.vue'
import { createOrder } from './order-test-data'

/** 保留真实组件，仅选用CJS入口解决测试互操作问题。 / Preserve real components while choosing the CJS entry for test interop. */
vi.mock('element-plus', async function loadRealComponents() {
  const { createRequire } = await import('node:module')
  return createRequire(import.meta.url)('element-plus') as typeof import('element-plus')
})
const wrappers: VueWrapper[] = []
/** 按组件库交叉类型构造确认结果；数据层仅等待完成，不读取该结果。 / Build the library's intersection-typed confirmation result; the data layer only awaits completion. */
function confirmedDialogResult(): MessageBoxData {
  return Object.assign('confirm' as const, { value: '', action: 'confirm' as const })
}
/** 清理组件、弹窗和间谍；避免遗留收货资料。 / Clean up components, dialogs and spies without retaining recipient data. */
afterEach(function cleanupComponents() {
  for (const wrapper of wrappers) wrapper.unmount()
  wrappers.length = 0
  ElMessageBox.close()
  vi.restoreAllMocks()
})

/** 真实详情渲染授权快照、商品及只读退款导航，并发出返回事件。 / Render authorized snapshots and read-only refund navigation and emit back. */
it('renders full authorized detail and emits refund/back integration events', async function testDetailNavigation() {
  vi.spyOn(orderApi, 'get').mockResolvedValue(
    createOrder({
      refunds: [{ id: '9000000000000000021', refundNo: 'MOCK-REFUND-001', status: 'open' }],
    }),
  )
  const wrapper = mount(OrderDetailView, { props: { orderId: '9000000000000000010' } })
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.text()).toContain('0491 570 006')
  expect(wrapper.text()).toContain('演示大区')
  expect(wrapper.text()).toContain('Example Suburb')
  expect(wrapper.text()).toContain('NSW / 2000')
  expect(wrapper.text()).toContain('快照商品')
  expect(wrapper.text()).toContain('A$ 84.00')
  expect(wrapper.text()).toContain('2026-11-02 18:00:00')
  for (const button of wrapper.findAll('button')) {
    if (button.text() === '查看退款' || button.text() === '返回订单列表')
      await button.trigger('click')
  }
  expect(wrapper.emitted('openRefund')).toEqual([['9000000000000000021']])
  expect(wrapper.emitted('back')).toEqual([[]])
  expect(wrapper.text()).not.toContain('同意退款')
})

/** 快递使用寄出操作且不显示线下日期和时段；真实点击经过确认后写入。 / Postal detail omits local slots and submits only after confirmed button interaction. */
it('shows postal-specific actions and requires confirmation before a write', async function testPostalAction() {
  const order = createOrder({
    fulfillment: 'post',
    deliveryDate: null,
    slotNameZh: null,
    slotStartAt: null,
    slotEndAt: null,
  })
  order.address = { ...order.address, zoneNameZh: null, postcode: '6000', state: 'WA' }
  vi.spyOn(orderApi, 'get').mockResolvedValue(order)
  const write = vi
    .spyOn(orderApi, 'startDelivery')
    .mockResolvedValue({ ...order, status: 'delivering', version: 4 })
  const confirm = vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(confirmedDialogResult())
  const wrapper = mount(OrderDetailView, { props: { orderId: order.id } })
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.text()).toMatch(/配送大区\s*—/)
  expect(wrapper.text()).toContain('WA / 6000')
  expect(wrapper.text()).not.toContain('配送日期')
  expect(wrapper.text()).not.toContain('配送时间窗口')
  for (const button of wrapper.findAll('button'))
    if (button.text() === '标记已寄出') await button.trigger('click')
  await flushPromises()
  expect(confirm).toHaveBeenCalledTimes(1)
  expect(write).toHaveBeenCalledTimes(1)
  expect(wrapper.text()).toContain('订单状态已更新。')
})

/** 禁止读取详情时不渲染电话、地址或配送操作。 / Denied detail never renders phone, address or fulfillment actions. */
it('hides recipient information and operations on forbidden detail', async function testForbiddenDetail() {
  vi.spyOn(orderApi, 'get').mockRejectedValue(
    new ApiError('business', 403, ERROR_CODE.FORBIDDEN.code),
  )
  const wrapper = mount(OrderDetailView, { props: { orderId: '9000000000000000010' } })
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.text()).toContain(ERROR_CODE.FORBIDDEN.message)
  expect(wrapper.text()).not.toContain('收货电话')
  expect(wrapper.text()).not.toContain('0491 570 006')
  expect(wrapper.text()).not.toContain('配送大区')
  expect(wrapper.text()).not.toContain('Example Suburb')
  expect(wrapper.text()).not.toContain('NSW / 2000')
  expect(wrapper.text()).not.toContain('开始配送')
})

/** 写入结果不确定且复读失败时，页面保留关键反馈并移除旧PII与按钮。 / Preserve uncertainty feedback and remove stale PII/actions when reconciliation fails. */
it('shows uncertain-outcome feedback when the follow-up read also fails', async function testFailedReconciliationFeedback() {
  vi.spyOn(orderApi, 'get')
    .mockResolvedValueOnce(createOrder())
    .mockRejectedValueOnce(new ApiError('network'))
  vi.spyOn(orderApi, 'arrive').mockRejectedValueOnce(new ApiError('timeout'))
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(confirmedDialogResult())
  const wrapper = mount(OrderDetailView, { props: { orderId: '9000000000000000010' } })
  wrappers.push(wrapper)
  await flushPromises()
  for (const button of wrapper.findAll('button')) {
    if (button.text() === '直接标记已送达') await button.trigger('click')
  }
  await flushPromises()
  expect(wrapper.text()).toContain('操作结果尚未确认')
  expect(wrapper.text()).not.toContain('0491 570 006')
  expect(wrapper.text()).not.toContain('开始配送')
  expect(wrapper.text()).not.toContain('订单状态已更新')
})

/** 默认确认适配器把取消识别为中性结果，不提交写入。 / The default dialog adapter treats cancellation neutrally and sends no mutation. */
it('shows neutral cancellation feedback from the default confirmation adapter', async function testDefaultCancellation() {
  vi.spyOn(orderApi, 'get').mockResolvedValue(createOrder())
  const write = vi.spyOn(orderApi, 'arrive')
  vi.spyOn(ElMessageBox, 'confirm').mockRejectedValueOnce('cancel')
  const wrapper = mount(OrderDetailView, { props: { orderId: '9000000000000000010' } })
  wrappers.push(wrapper)
  await flushPromises()
  for (const button of wrapper.findAll('button')) {
    if (button.text() === '直接标记已送达') await button.trigger('click')
  }
  await flushPromises()
  expect(write).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('已取消本次操作，订单未变更。')
  expect(wrapper.text()).not.toContain('订单状态已更新')
})
