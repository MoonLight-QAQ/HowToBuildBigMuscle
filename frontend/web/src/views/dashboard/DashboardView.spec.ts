/// <reference types="node" />
import { afterEach, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { dashboardApi } from '@/api/dashboard'
import { ApiError } from '@/api/http'
import DashboardView from './DashboardView.vue'
import { createSummary, deferredSummary } from './dashboard-test-data'

/** 使用真实ElementPlus的CJS构建，避免测试导出互操作歧义。
 * / Use real ElementPlus CJS components to avoid test export interoperability ambiguity.
 */
vi.mock('element-plus', async function loadRealComponents() {
  const { createRequire } = await import('node:module')
  return createRequire(import.meta.url)('element-plus') as typeof import('element-plus')
})
const wrappers: VueWrapper[] = []
/** 挂载实际概览组件并记录卸载责任；无输入，不伪造公共组件。
 * / Mount the real dashboard and track cleanup, without replacing shared components.
 */
function render() {
  const wrapper = mount(DashboardView)
  wrappers.push(wrapper)
  return wrapper
}
/** 点击具有指定文本的真实按钮；输入组件和文本，无直接业务请求。
 * / Click a real button by visible text without issuing business requests directly.
 */
async function clickButton(wrapper: VueWrapper, text: string): Promise<void> {
  const button = wrapper.findAll('button').find(
    /** 按显示文本匹配按钮；无副作用。 / Match the displayed button text without effects. */
    function matches(candidate) {
      return candidate.text() === text
    },
  )
  expect(button).toBeDefined()
  await button!.trigger('click')
}
/** 卸载组件并还原间谍，避免异步读取泄漏。
 * / Unmount components and restore spies to avoid asynchronous read leakage.
 */
afterEach(function cleanup() {
  for (const wrapper of wrappers) wrapper.unmount()
  wrappers.length = 0
  vi.restoreAllMocks()
})

/** 四个待办只发出带筛选的导航事件，配送只跳转；展示服务端金额和区域。
 * / Task cards emit filtered navigation only; delivery navigates and renders server money and areas.
 */
it('renders workload and delivery scopes and emits filtered navigation only', async function testNavigation() {
  const get = vi.spyOn(dashboardApi, 'get').mockResolvedValue(createSummary())
  const wrapper = render()
  await flushPromises()
  expect(get).toHaveBeenCalledTimes(1)
  const cards = wrapper.findAll('button.task')
  expect(
    cards.map(
      /** 提取可访问名称；无DOM修改。 / Read accessible names without changing the DOM. */
      function accessibleName(card) {
        return card.attributes('aria-label')
      },
    ),
  ).toEqual([
    '待配送 3，查看待配送',
    '配送中 2，查看配送中',
    '退款待审 1，查看退款待审',
    '举报待处理 4，查看举报待处理',
  ])
  for (const card of cards) await card.trigger('click')
  await clickButton(wrapper, '去改配送')
  expect(wrapper.emitted('openOrders')).toEqual([['pending'], ['delivering']])
  expect(wrapper.emitted('openRefunds')).toEqual([['open']])
  expect(wrapper.emitted('openReports')).toEqual([['open']])
  expect(wrapper.emitted('openDelivery')).toEqual([[]])
  expect(get).toHaveBeenCalledTimes(1)
  expect(wrapper.text()).toContain('全店默认线下配送费 A$ 6.00，配送大区可单独设置运费')
  expect(wrapper.text()).toContain('A$ 8.00')
  expect(wrapper.text()).toContain('商品金额满 A$ 50.00 包邮，仅适用于快递')
  expect(wrapper.text()).toContain('演示线下城市： 可送大区 演示可送大区')
  expect(wrapper.text()).toContain('演示快递城市')
  expect(wrapper.text()).not.toContain('暂无可送配送大区')
  expect(
    wrapper
      .findAll('button')
      .map(
        /** 收集按钮文本以排除业务写入口；无副作用。 / Collect button labels to exclude business write actions. */
        function text(button) {
          return button.text()
        },
      )
      .join(' '),
  ).not.toMatch(/开始配送|同意退款|拒绝退款|标记已送达/)
  expect(wrapper.text()).not.toMatch(/今天|UTC|Australia\/Sydney/)
})

/** 首次加载不显示假计数，加载完成后的零计数仍可导航，并明确空城市。
 * / Initial loading has no fake counts; genuine zeros remain navigable and empty cities are explicit.
 */
it('separates loading from valid zero counts and empty cities', async function testZeroState() {
  const pending = deferredSummary()
  vi.spyOn(dashboardApi, 'get').mockReturnValue(pending.promise)
  const wrapper = render()
  await nextTick()
  expect(wrapper.find('[role="status"]').exists()).toBe(true)
  expect(wrapper.findAll('button.task')).toHaveLength(0)
  pending.resolve(
    createSummary({
      pendingOrderCount: 0,
      deliveringOrderCount: 0,
      openRefundCount: 0,
      openReportCount: 0,
      cities: [],
      localFeeCents: 0,
      postFeeCents: 0,
      freeShippingThresholdCents: 0,
    }),
  )
  await flushPromises()
  expect(wrapper.findAll('button.task')).toHaveLength(4)
  expect(wrapper.text()).toContain('暂无城市配送概况')
  expect(wrapper.text()).toContain('A$ 0.00')
  await wrapper.find('button.task').trigger('click')
  expect(wrapper.emitted('openOrders')).toEqual([['pending']])
})

/** 普通读取失败显示安全错误和重试，不把失败当成零或空配送。
 * / Failed reads show a safe error and retry instead of zero workload or empty delivery data.
 */
it('shows an error without counters and retries the read', async function testRetry() {
  const get = vi
    .spyOn(dashboardApi, 'get')
    .mockRejectedValueOnce(new ApiError('network'))
    .mockResolvedValueOnce(createSummary())
  const wrapper = render()
  await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  expect(wrapper.findAll('button.task')).toHaveLength(0)
  expect(wrapper.text()).not.toContain('暂无城市配送概况')
  await clickButton(wrapper, '重试')
  await flushPromises()
  expect(get).toHaveBeenCalledTimes(2)
  expect(wrapper.findAll('button.task')).toHaveLength(4)
})

/** 刷新期间撤下旧入口，权限失效后不保留城市和待办。
 * / Refresh withdraws stale navigation; authorization failure keeps cities and counters cleared.
 */
it.each([
  { status: 401, code: 'NEED_LOGIN' },
  { status: 403, code: 'FORBIDDEN' },
])(
  'clears stale visible data and navigation on $status',
  async function testRevokedAccess({ status, code }) {
    const pending = deferredSummary()
    vi.spyOn(dashboardApi, 'get')
      .mockResolvedValueOnce(createSummary())
      .mockReturnValueOnce(pending.promise)
    const wrapper = render()
    await flushPromises()
    await clickButton(wrapper, '刷新')
    expect(wrapper.findAll('button.task')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('演示线下城市')
    pending.reject(new ApiError('business', status, code))
    await flushPromises()
    expect(wrapper.findAll('button.task')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('去改配送')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  },
)

/** 没有可送区单独提示；城市和区名以文本转义，不能执行HTML。
 * / Show missing deliverable areas explicitly and escape city/district content as plain text.
 */
it('escapes names and shows an explicit local area gap', async function testEscaping() {
  vi.spyOn(dashboardApi, 'get').mockResolvedValue(
    createSummary({
      cities: [
        {
          id: '1',
          nameZh: '<img src=x onerror=alert(1)>',
          fulfillment: 'local',
          deliverableZoneNamesZh: [],
        },
        {
          id: '2',
          nameZh: '另一个城市',
          fulfillment: 'local',
          deliverableZoneNamesZh: ['<script>alert(1)</script>'],
        },
      ],
    }),
  )
  const wrapper = render()
  await flushPromises()
  expect(wrapper.text()).toContain('暂无可送配送大区')
  expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
  expect(wrapper.text()).toContain('<script>alert(1)</script>')
  expect(wrapper.find('img').exists()).toBe(false)
  expect(wrapper.find('script').exists()).toBe(false)
  expect(wrapper.text()).toContain('暂无快递城市')
})
