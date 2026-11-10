/// <reference types="node" />
import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ElMessageBox, type MessageBoxData } from 'element-plus'
import { reportApi } from '@/api/report'
import { ApiError } from '@/api/http'
import ReportListView from './ReportListView.vue'
import { createReport, createReportPage, deferred } from './report-test-data'

/** 测试使用真实ElementPlus的CJS构建，避免导出互操作歧义。 / Use real ElementPlus CJS components to avoid test export interoperability ambiguity. */
vi.mock('element-plus', async function loadComponents() {
  const { createRequire } = await import('node:module')
  return createRequire(import.meta.url)('element-plus') as typeof import('element-plus')
})
/** 按库的交叉类型构造确认结果；业务只等待确认而不读取载荷。 / Build the library intersection result; business code only awaits confirmation. */
function confirmedDialogResult(): MessageBoxData {
  return Object.assign('confirm' as const, { value: '', action: 'confirm' as const })
}
const wrappers: VueWrapper[] = []
/** 挂载真实页面，记录清理责任；合成接口间谍避免真实网络。 / Mount the real page and track cleanup with synthetic API spies. */
function render() {
  const list = vi.spyOn(reportApi, 'list').mockResolvedValue(createReportPage())
  const get = vi.spyOn(reportApi, 'get').mockResolvedValue(createReport())
  const wrapper = mount(ReportListView)
  wrappers.push(wrapper)
  return { wrapper, list, get }
}
/** 按可见文字点击按钮；缺失时明确失败，不直接调用业务函数。 / Click a visible button label and fail if absent without invoking business methods directly. */
async function click(wrapper: VueWrapper, text: string): Promise<void> {
  const button = wrapper.findAll('button').find(
    /** 匹配指定可见文字，无副作用。 / Match the visible label without effects. */
    function matches(candidate) {
      return candidate.text() === text
    },
  )
  expect(button).toBeDefined()
  await button!.trigger('click')
  await flushPromises()
}
/** 卸载页面与还原间谍；防止请求和DOM泄漏。 / Unmount views and restore spies to prevent request and DOM leaks. */
afterEach(function cleanup() {
  for (const wrapper of wrappers) wrapper.unmount()
  wrappers.length = 0
  vi.restoreAllMocks()
})

/** 默认只看open，读取处理投影后展示目标、时间和准确帖子状态，仅显式导航。 / Default to open, read current review data, display target/time/status, and navigate only explicitly. */
it('renders the open list, reads selected detail and emits listing navigation', async function testNavigation() {
  const { wrapper, list, get } = render()
  await flushPromises()
  expect(list.mock.calls[0]?.[0]).toEqual({ page: 1, pageSize: 20, status: 'open' })
  expect(wrapper.text()).toContain('虚构演示帖子')
  expect(wrapper.text()).toContain('虚构举报用户')
  expect(wrapper.text()).toContain('2026-11-01 00:05:00')
  expect(wrapper.emitted('openListing')).toBeUndefined()
  await click(wrapper, '查看与处理')
  expect(get).toHaveBeenCalledWith('9000000000000000030', expect.any(AbortSignal))
  expect(wrapper.text()).toContain('整条帖子')
  expect(wrapper.text()).toContain('已有下架原因：—')
  await click(wrapper, '查看关联帖子')
  expect(wrapper.emitted('openListing')).toEqual([['9000000000000000031']])
})

/** 真实下拉交互选中全部后保留文案，且API省略status而不发送UI占位值。 / Real select interaction retains the all-status label and omits the API filter instead of sending the UI sentinel. */
it('keeps the all-status label selected after a real option click', async function testAllStatusSelection() {
  const { wrapper, list } = render()
  await flushPromises()
  await wrapper.find('.filters .el-select__wrapper').trigger('click')
  const all = wrapper.findAllComponents({ name: 'ElOption' }).find(
    /** 按真实选项标签定位，不直接触发组件update事件。 / Locate the real option label without directly emitting an update event. */
    function allOption(option) {
      return option.props('label') === '全部状态'
    },
  )
  expect(all).toBeDefined()
  await all!.trigger('click')
  await flushPromises()
  expect(list.mock.lastCall?.[0]).toEqual({ page: 1, pageSize: 20 })
  expect(wrapper.find('.filters .el-select__placeholder').text()).toBe('全部状态')
  await wrapper.find('.filters .el-select__wrapper').trigger('click')
  const handled = wrapper.findAllComponents({ name: 'ElOption' }).find(
    /** 在全部之后选择具体状态，确认双向显示与查询仍一致。 / Select a concrete state after all to verify consistent labels and queries. */
    function handledOption(option) {
      return option.props('label') === '已处理'
    },
  )
  await handled!.trigger('click')
  await flushPromises()
  expect(list.mock.lastCall?.[0]).toEqual({ page: 1, pageSize: 20, status: 'handled' })
  expect(wrapper.find('.filters .el-select__placeholder').text()).toBe('已处理')
})
/** 下架前要求原因及确认，成功后显示已处理并撤下写入口。 / Require reason and confirmation before takedown and remove actions after confirmed handling. */
it('confirms a valid whole-post takedown using the read version', async function testTakedown() {
  const { wrapper } = render()
  await flushPromises()
  await click(wrapper, '查看与处理')
  const action = vi.spyOn(reportApi, 'takedown').mockResolvedValue(
    createReport({
      status: 'handled',
      version: 1,
      handledBy: 'mock-admin',
      handledAt: '2026-11-01T00:06:00Z',
    }),
  )
  const confirm = vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(confirmedDialogResult())
  await click(wrapper, '强制下架整条帖子')
  expect(action).not.toHaveBeenCalled()
  expect(confirm).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('不能全为空白')
  await wrapper.find('textarea').setValue('虚构审核原因')
  await click(wrapper, '强制下架整条帖子')
  expect(confirm.mock.calls[0]?.[0]).toContain('整条帖子')
  expect(action).toHaveBeenCalledWith(
    '9000000000000000030',
    {
      version: 0,
      expectedStatus: 'open',
      expectedListingStatus: 'on_sale',
      reason: '虚构审核原因',
    },
    expect.any(AbortSignal),
  )
  expect(wrapper.text()).toContain('已处理')
  expect(wrapper.text()).toContain('不能重复提交')
  expect(wrapper.find('textarea').exists()).toBe(false)
})
/** 非在售只有关闭分支，正文已删除时不泄漏内容，handled不能误写成新下架。 / Off-sale data exposes close-only handling; deleted comments reveal no content and handled does not imply a new takedown. */
it('shows deleted comments and closes off-sale reports without a reason', async function testCloseOnly() {
  const { wrapper, get } = render()
  const record = createReport()
  record.listing.status = 'sold'
  record.listing.removeReason = '原原因'
  record.comment = { id: '4', content: '', deleted: true }
  get.mockResolvedValue(record)
  await flushPromises()
  await click(wrapper, '查看与处理')
  expect(wrapper.text()).toContain('评论已删除，正文不再展示')
  expect(wrapper.text()).toContain('原原因')
  expect(wrapper.find('textarea').exists()).toBe(false)
  const action = vi
    .spyOn(reportApi, 'takedown')
    .mockResolvedValue({ ...record, status: 'handled', version: 1 })
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(confirmedDialogResult())
  await click(wrapper, '仅关闭举报')
  expect(action.mock.calls[0]?.[1]).toEqual({
    version: 0,
    expectedStatus: 'open',
    expectedListingStatus: 'sold',
  })
  expect(wrapper.text()).toContain('举报已处理，保留帖子原状态与原因')
  expect(wrapper.text()).toContain('已出')
})
/** 取消使用中性反馈，没有POST；处理忙碌时禁止刷新、返回与导航。 / Cancellation is neutral with no POST; busy reviews disable refresh, back and navigation. */
it('keeps confirmation busy and cancellation neutral', async function testCancel() {
  const { wrapper } = render()
  await flushPromises()
  await click(wrapper, '查看与处理')
  const prompt = deferred<never>()
  vi.spyOn(ElMessageBox, 'confirm').mockReturnValue(prompt.promise)
  const ignore = vi.spyOn(reportApi, 'ignore')
  await click(wrapper, '忽略举报')
  expect(
    wrapper
      .findAll('button')
      .filter(
        /** 检查处理区上下文按钮已禁用。 / Match context buttons expected to be disabled. */
        function contextButton(button) {
          return ['返回举报列表', '刷新处理资料', '查看关联帖子', '刷新列表'].includes(
            button.text(),
          )
        },
      )
      .every(
        /** 返回原生禁用状态，无DOM修改。 / Read native disabled state without mutation. */
        function isDisabled(button) {
          return button.attributes('disabled') !== undefined
        },
      ),
  ).toBe(true)
  prompt.reject('cancel')
  await flushPromises()
  expect(ignore).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('已取消操作，未提交')
})
/** 读取失败显示错误和重试，不展示假空态；重试成功后才显示列表。 / Failed reads show errors/retry instead of a false empty state, then render rows on recovery. */
it('distinguishes load failures and valid empty data', async function testEmptyAndFailure() {
  const { wrapper, list } = render()
  list.mockRejectedValueOnce(new ApiError('network'))
  await flushPromises()
  await click(wrapper, '刷新列表')
  expect(wrapper.text()).toContain('网络连接失败')
  expect(wrapper.text()).not.toContain('当前筛选下没有举报')
  list.mockResolvedValueOnce(createReportPage([]))
  await click(wrapper, '重试')
  expect(wrapper.text()).toContain('当前筛选下没有举报')
})
/** 处理权限失效后撤下详情和入口，不能继续展示旧帖子资料。 / Revoke selected data and actions after authorization failure without stale listing disclosure. */
it.each([401, 403])('withdraws stale data after action %s', async function testAccess(status) {
  const { wrapper } = render()
  await flushPromises()
  await click(wrapper, '查看与处理')
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(confirmedDialogResult())
  vi.spyOn(reportApi, 'ignore').mockRejectedValue(
    new ApiError('business', status, status === 401 ? 'NEED_LOGIN' : 'FORBIDDEN'),
  )
  await click(wrapper, '忽略举报')
  expect(wrapper.text()).not.toContain('虚构演示帖子')
  expect(wrapper.text()).not.toContain('查看关联帖子')
  expect(wrapper.find('textarea').exists()).toBe(false)
})
/** 显示内容以文本转义，活动评论与历史处理者空值保持合法。 / Escape content as text and preserve active comments plus nullable historical handlers. */
it('escapes report text and retains nullable historical metadata', async function testEscaping() {
  const { wrapper, get } = render()
  const record = createReport({
    status: 'handled',
    extra: '<script>private()</script>',
    handledBy: null,
    handledAt: null,
  })
  record.listing.title = '<img src=x onerror=alert(1)>'
  record.comment = { id: '4', content: '<b>虚构评论</b>', deleted: false }
  get.mockResolvedValue(record)
  await flushPromises()
  await click(wrapper, '查看与处理')
  expect(wrapper.text()).toContain('<script>private()</script>')
  expect(wrapper.text()).toContain('<b>虚构评论</b>')
  expect(wrapper.find('script').exists()).toBe(false)
  expect(wrapper.text()).toContain('不能重复提交')
  expect(wrapper.text()).not.toContain('仅关闭举报')
})
