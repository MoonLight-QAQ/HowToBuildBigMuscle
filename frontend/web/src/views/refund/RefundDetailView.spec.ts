/// <reference types="node" />
import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ElMessageBox, type MessageBoxData } from 'element-plus'
import { refundApi } from '@/api/refund'
import { ApiError } from '@/api/http'
import { ERROR_CODE } from '@/constants/error-code'
import RefundDetailView from './RefundDetailView.vue'
import { approvedRefund, createRefund } from './refund-test-data'

/** 保留真实组件，使用CJS入口解决导出互操作歧义。 / Preserve real component behavior using the CJS entry for export interop. */
vi.mock('element-plus', async function loadRealComponents() {
  const { createRequire } = await import('node:module')
  return createRequire(import.meta.url)('element-plus') as typeof import('element-plus')
})
const wrappers: VueWrapper[] = []
/** 按库的交叉类型构造确认结果；模块只等待确认，不读取其载荷。 / Build the library's intersection-typed confirmation result; the module only awaits confirmation. */
function confirmedDialogResult(): MessageBoxData {
  return Object.assign('confirm' as const, { value: '', action: 'confirm' as const })
}
/** 卸载组件、关闭弹窗和还原间谍。 / Unmount components, close dialogs and restore spies. */
afterEach(function cleanupComponents() {
  for (const wrapper of wrappers) wrapper.unmount()
  wrappers.length = 0
  ElMessageBox.close()
  vi.restoreAllMocks()
})

/** 展示申请快照和明确UTC，导航只发送关联ID且不猜整单或当前订单状态。 / Show request snapshots and explicit UTC, emitting related IDs without inferred order state or coverage. */
it('renders refund details and emits order/back integration events', async function testDetailNavigation() {
  vi.spyOn(refundApi, 'get').mockResolvedValue(createRefund())
  const wrapper = mount(RefundDetailView, { props: { refundId: '9000000000000000020' } })
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.text()).toContain('送达有问题')
  expect(wrapper.text()).toContain('虚构退款说明')
  expect(wrapper.text()).toContain('申请数量')
  expect(wrapper.text()).toContain('快照商品')
  expect(wrapper.text()).toContain('A$ 39.00')
  expect(wrapper.text()).toContain('A$ 0.00')
  expect(wrapper.text()).toContain('申请时间（UTC）')
  expect(wrapper.text()).toContain('2026-11-01 00:05:00')
  expect(wrapper.text()).toContain('未发起')
  expect(wrapper.text()).not.toContain('订单现在是')
  expect(wrapper.text()).not.toContain('全部未退商品')
  expect(wrapper.find('input').exists()).toBe(false)
  for (const button of wrapper.findAll('button'))
    if (button.text() === 'MOCK-ORDER-001' || button.text() === '返回退款列表')
      await button.trigger('click')
  expect(wrapper.emitted('openOrder')).toEqual([['9000000000000000010']])
  expect(wrapper.emitted('back')).toEqual([[]])
})

/** 宿主明确传入时区时才转换，默认UTC不会按本机时区猜测。 / Convert time only when the host explicitly supplies a zone rather than guessing from the machine. */
it('uses an explicitly supplied display timezone', async function testHostTimezone() {
  vi.spyOn(refundApi, 'get').mockResolvedValue(createRefund())
  const wrapper = mount(RefundDetailView, {
    props: { refundId: '9000000000000000020', timezone: 'Australia/Perth' },
  })
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.text()).toContain('申请时间（Australia/Perth）')
  expect(wrapper.text()).toContain('2026-11-01 08:05:00')
})

/** 真实同意按钮经过确认，更新审核结果但保留独立pending渠道进度。 / Confirm the real approve action and update review while provider progress remains pending. */
it('confirms approval and keeps provider progress separate', async function testApprove() {
  vi.spyOn(refundApi, 'get').mockResolvedValue(createRefund())
  const approve = vi.spyOn(refundApi, 'approve').mockResolvedValue(approvedRefund())
  const confirm = vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(confirmedDialogResult())
  const wrapper = mount(RefundDetailView, { props: { refundId: '9000000000000000020' } })
  wrappers.push(wrapper)
  await flushPromises()
  for (const button of wrapper.findAll('button'))
    if (button.text() === '同意退款') await button.trigger('click')
  await flushPromises()
  expect(confirm).toHaveBeenCalledTimes(1)
  expect(approve).toHaveBeenCalledWith(
    '9000000000000000020',
    { version: 3, expectedStatus: 'open' },
    expect.any(AbortSignal),
  )
  expect(wrapper.text()).toContain('审核已同意，请继续核对渠道退款进度。')
  expect(wrapper.text()).toContain('退款处理中')
  expect(wrapper.text()).not.toContain('退款成功（渠道确认）')
  for (const button of wrapper.findAll('button')) {
    expect(button.text()).not.toBe('同意退款')
    expect(button.text()).not.toBe('拒绝')
  }
})

/** 自动同意不再给审核按钮，待确认渠道不会显示未发起。 / Auto-approved detail has no rereview actions and unknown provider progress is not shown as not-started. */
it('hides review buttons for auto-approved refunds and displays unknown progress', async function testAutoApproved() {
  vi.spyOn(refundApi, 'get').mockResolvedValue(
    approvedRefund({ autoApproved: true, reviewedBy: null, providerRefundStatus: null }),
  )
  const wrapper = mount(RefundDetailView, { props: { refundId: '9000000000000000020' } })
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.text()).toContain('已自动同意')
  expect(wrapper.text()).toContain('待确认')
  expect(wrapper.text()).not.toContain('未发起')
  for (const button of wrapper.findAll('button')) {
    expect(button.text()).not.toBe('同意退款')
    expect(button.text()).not.toBe('拒绝')
  }
})

/** 默认弹窗取消被识别为中性结果，不调用拒绝接口。 / Default-dialog cancellation is neutral and never calls the reject endpoint. */
it('treats dialog cancellation neutrally', async function testDefaultCancellation() {
  vi.spyOn(refundApi, 'get').mockResolvedValue(createRefund())
  const reject = vi.spyOn(refundApi, 'reject')
  vi.spyOn(ElMessageBox, 'confirm').mockRejectedValueOnce('cancel')
  const wrapper = mount(RefundDetailView, { props: { refundId: '9000000000000000020' } })
  wrappers.push(wrapper)
  await flushPromises()
  for (const button of wrapper.findAll('button'))
    if (button.text() === '拒绝') await button.trigger('click')
  await flushPromises()
  expect(reject).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('已取消本次操作，未提交审核。')
})

/** 不确定写结果复读失败时仍显示未确认提示，移除旧详情和审核入口。 / Preserve uncertainty feedback and remove stale detail/actions when reconciliation also fails. */
it('preserves uncertain-outcome feedback after a failed reconciliation read', async function testUncertainFeedback() {
  vi.spyOn(refundApi, 'get')
    .mockResolvedValueOnce(createRefund())
    .mockRejectedValueOnce(new ApiError('network'))
  const approve = vi.spyOn(refundApi, 'approve').mockRejectedValueOnce(new ApiError('timeout'))
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(confirmedDialogResult())
  const wrapper = mount(RefundDetailView, { props: { refundId: '9000000000000000020' } })
  wrappers.push(wrapper)
  await flushPromises()
  for (const button of wrapper.findAll('button'))
    if (button.text() === '同意退款') await button.trigger('click')
  await flushPromises()
  expect(approve).toHaveBeenCalledTimes(1)
  expect(wrapper.text()).toContain('操作结果尚未确认')
  expect(wrapper.text()).not.toContain('虚构退款说明')
  expect(wrapper.text()).not.toContain('审核已同意，请继续核对渠道退款进度。')
  for (const button of wrapper.findAll('button')) expect(button.text()).not.toBe('同意退款')
})

/** 权限不足时页面隐藏此前可见的退款详情与操作。 / Denied access hides refund detail and review operations. */
it('hides detail on forbidden reads', async function testForbiddenRead() {
  vi.spyOn(refundApi, 'get').mockRejectedValue(
    new ApiError('business', 403, ERROR_CODE.FORBIDDEN.code),
  )
  const wrapper = mount(RefundDetailView, { props: { refundId: '9000000000000000020' } })
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.text()).toContain(ERROR_CODE.FORBIDDEN.message)
  expect(wrapper.text()).not.toContain('虚构退款说明')
  expect(wrapper.text()).not.toContain('同意退款')
})
