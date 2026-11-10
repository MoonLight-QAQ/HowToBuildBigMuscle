/// <reference types="node" />
import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { ElSelect } from 'element-plus'
import { refundApi } from '@/api/refund'
import { ApiError } from '@/api/http'
import RefundListView from './RefundListView.vue'
import { approvedRefund, createRefund } from './refund-test-data'

/** 使用真实ElementPlus组件的CJS构建，避免测试导出互操作歧义。 / Use real ElementPlus CJS components to avoid test export interop ambiguity. */
vi.mock('element-plus', async function loadRealComponents() {
  const { createRequire } = await import('node:module')
  return createRequire(import.meta.url)('element-plus') as typeof import('element-plus')
})
const wrappers: VueWrapper[] = []
/** 卸载组件和还原服务间谍，避免测试间泄漏。 / Unmount components and restore service spies between tests. */
afterEach(function cleanupComponents() {
  for (const wrapper of wrappers) wrapper.unmount()
  wrappers.length = 0
  vi.restoreAllMocks()
})

/** 真实列表渲染审核与独立渠道标签、快照金额、UTC及详情导航。 / Render independent review/provider labels, snapshot money, UTC and detail navigation in the real table. */
it('renders independent statuses and emits detail navigation with the string ID', async function testListNavigation() {
  vi.spyOn(refundApi, 'list').mockResolvedValue({
    items: [approvedRefund()],
    total: 1,
    page: 1,
    pageSize: 20,
  })
  const wrapper = mount(RefundListView)
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.text()).toContain('MOCK-REFUND-001')
  expect(wrapper.text()).toContain('MOCK-ORDER-001')
  expect(wrapper.text()).toContain('已同意')
  expect(wrapper.text()).toContain('退款处理中')
  expect(wrapper.text()).not.toContain('退款成功（渠道确认）')
  expect(wrapper.text()).toContain('A$ 39.00')
  expect(wrapper.text()).toContain('快照商品 × 1')
  expect(wrapper.text()).toContain('时间显示：UTC')
  expect(wrapper.text()).toContain('2026-11-01 00:05:00')
  for (const button of wrapper.findAll('button')) {
    expect(button.text()).not.toBe('同意退款')
    expect(button.text()).not.toBe('拒绝')
    if (button.text() === '查看详情') await button.trigger('click')
  }
  expect(wrapper.emitted('openRefund')).toEqual([['9000000000000000020']])
})

/** 待审入口通过prop建立筛选，真实选择器可以返回全部。 / A prop establishes the pending entry and the real select can return to all statuses. */
it('supports the pending entry prop and resets the real select to all statuses', async function testPendingEntry() {
  const list = vi
    .spyOn(refundApi, 'list')
    .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
  const wrapper = mount(RefundListView, { props: { initialStatus: 'open' } })
  wrappers.push(wrapper)
  await flushPromises()
  expect(list.mock.lastCall?.[0]).toEqual({ page: 1, pageSize: 20, status: 'open' })
  const select = wrapper.findComponent(ElSelect)
  select.vm.$emit('update:modelValue', '')
  select.vm.$emit('change', '')
  await flushPromises()
  expect(list.mock.lastCall?.[0]).toEqual({ page: 1, pageSize: 20 })
  expect(wrapper.text()).toContain('当前筛选下暂无退款单')
})

/** 真实错误态提供重试，恢复后展示数据。 / The real error state supports retry and displays recovered rows. */
it('shows a retryable read error', async function testRetry() {
  const list = vi
    .spyOn(refundApi, 'list')
    .mockRejectedValueOnce(new ApiError('network'))
    .mockResolvedValueOnce({ items: [createRefund()], total: 1, page: 1, pageSize: 20 })
  const wrapper = mount(RefundListView)
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  for (const button of wrapper.findAll('button'))
    if (button.text() === '重试') await button.trigger('click')
  await flushPromises()
  expect(list).toHaveBeenCalledTimes(2)
  expect(wrapper.text()).toContain('MOCK-REFUND-001')
})
