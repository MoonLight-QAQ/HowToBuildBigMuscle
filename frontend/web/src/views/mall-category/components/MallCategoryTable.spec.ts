/**
 * MallCategoryTable 的测试：三种状态的显示、删除按钮的置灰和提示、二次确认后才发出 delete、删除中的状态。
 * 组件只通过 props 和事件与页面交互，测试也只检查这两样，不模拟接口，不检查 composables。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ElementPlus, { ElPopconfirm, ElTooltip } from 'element-plus'
import type { MallCategory } from '@/api/mall-category'
import MallCategoryTable from './MallCategoryTable.vue'

const fresh: MallCategory = {
  id: '1854239876543209540',
  nameZh: '生鲜',
  nameEn: 'Fresh',
  sort: 10,
  inUseCount: 3,
}
const household: MallCategory = {
  id: '1854239876543209543',
  nameZh: '日用品',
  nameEn: 'Household',
  sort: 40,
  inUseCount: 0,
}
const frozen: MallCategory = {
  id: '1854239876543209544',
  nameZh: '冷冻食品',
  nameEn: 'Frozen',
  sort: 50,
  inUseCount: 0,
}

const wrappers: VueWrapper[] = []
afterEach(() => {
  for (const wrapper of wrappers) wrapper.unmount()
  wrappers.length = 0
})

/** 挂载表格，等待 ElTable 完成首次渲染。 */
async function mountTable(props: Partial<InstanceType<typeof MallCategoryTable>['$props']> = {}) {
  const wrapper = mount(MallCategoryTable, {
    props: {
      categories: [fresh, household, frozen],
      loading: false,
      errorMessage: null,
      empty: false,
      deletingId: null,
      ...props,
    },
    global: { plugins: [ElementPlus] },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

/** 找出全部「删除」按钮，顺序与行一致。 */
function deleteButtons(wrapper: VueWrapper) {
  return wrapper.findAll('button').filter((button) => button.text() === '删除')
}

describe('显示', () => {
  it('显示中英文名、排序和在用商品数，没有编辑按钮', async () => {
    const wrapper = await mountTable()
    const text = wrapper.text()
    expect(text).toContain('在用商品数')
    expect(text).toContain('生鲜')
    expect(text).toContain('Household')
    expect(text).not.toContain('编辑')
    const firstRow = wrapper.findAll('.el-table__body tr')[0]!
    expect(firstRow.text()).toContain('10')
    expect(firstRow.text()).toContain('3')
  })

  it('空数据时显示空状态', async () => {
    const wrapper = await mountTable({ categories: [], empty: true })
    expect(wrapper.text()).toContain('还没有商城类目')
  })

  it('加载失败时显示错误和重试按钮，不显示空状态', async () => {
    const wrapper = await mountTable({ categories: [], errorMessage: '网络连接失败，请检查网络' })
    expect(wrapper.text()).toContain('商城类目加载失败：网络连接失败，请检查网络')
    expect(wrapper.text()).not.toContain('还没有商城类目')
    const retry = wrapper.findAll('button').find((button) => button.text() === '重试')!
    await retry.trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('没有错误时不显示重试按钮', async () => {
    expect((await mountTable()).text()).not.toContain('重试')
  })
})

describe('删除按钮', () => {
  it('inUseCount 大于 0 时置灰，悬停提示原因，没有二次确认', async () => {
    const wrapper = await mountTable()
    expect(deleteButtons(wrapper)[0]!.attributes('disabled')).toBeDefined()
    const tooltips = wrapper
      .findAllComponents(ElTooltip)
      .filter((tooltip) => String(tooltip.props('content')).includes('已上架'))
    expect(tooltips).toHaveLength(1)
    expect(tooltips[0]!.props('content')).toBe('该类目下还有 3 件已上架的商品，不能删除')
    // 只有两行可以删除的类目有二次确认。
    expect(wrapper.findAllComponents(ElPopconfirm)).toHaveLength(2)
  })

  it('inUseCount 为 0 时可以点击，二次确认的文案带类目名称', async () => {
    const wrapper = await mountTable()
    expect(deleteButtons(wrapper)[1]!.attributes('disabled')).toBeUndefined()
    expect(wrapper.findAllComponents(ElPopconfirm)[0]!.props('title')).toBe(
      '确定删除类目『日用品』吗？删除后不能恢复。',
    )
  })

  it('确认后发出 delete，带上这一行的类目', async () => {
    const wrapper = await mountTable()
    wrapper.findAllComponents(ElPopconfirm)[1]!.vm.$emit('confirm')
    expect(wrapper.emitted('delete')).toEqual([[frozen]])
  })

  it('点击删除只打开确认，取消后不发出 delete', async () => {
    const wrapper = await mountTable()
    await deleteButtons(wrapper)[1]!.trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
    wrapper.findAllComponents(ElPopconfirm)[0]!.vm.$emit('cancel')
    expect(wrapper.emitted('delete')).toBeUndefined()
  })

  it('删除中：该行按钮显示加载中，其他行的删除按钮不可用', async () => {
    const wrapper = await mountTable({ deletingId: household.id })
    const buttons = deleteButtons(wrapper)
    expect(buttons[1]!.classes()).toContain('is-loading')
    expect(buttons[2]!.attributes('disabled')).toBeDefined()
    expect(buttons[2]!.classes()).not.toContain('is-loading')
  })
})
