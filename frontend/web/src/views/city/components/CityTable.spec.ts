/**
 * CityTable 的测试：三种状态的显示，以及每个操作发出的事件。
 *
 * 其他模块照着写时：组件只通过 props 和事件与页面交互，测试也只检查这两样，
 * 不模拟接口，不检查 composables。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ElementPlus, { ElPopconfirm } from 'element-plus'
import type { City } from '@/api/city'
import CityTable from './CityTable.vue'

const sydney: City = {
  id: '1854239876543209472',
  nameZh: '悉尼',
  nameEn: 'Sydney',
  fulfillment: 'local',
  state: 'NSW',
  timezone: 'Australia/Sydney',
  sort: 1,
}
const canberra: City = {
  ...sydney,
  id: '1854239876543209473',
  nameZh: '堪培拉',
  nameEn: 'Canberra',
  fulfillment: 'post',
  state: 'ACT',
  sort: 2,
}

const wrappers: VueWrapper[] = []
afterEach(() => {
  for (const wrapper of wrappers) wrapper.unmount()
  wrappers.length = 0
})

/** 挂载表格，等待 ElTable 完成首次渲染。 */
async function mountTable(props: Partial<InstanceType<typeof CityTable>['$props']> = {}) {
  const wrapper = mount(CityTable, {
    props: {
      cities: [sydney, canberra],
      loading: false,
      errorMessage: null,
      empty: false,
      togglingId: null,
      ...props,
    },
    global: { plugins: [ElementPlus] },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('显示', () => {
  it('每行显示州的中文名称、配送方式和切换按钮', async () => {
    const text = (await mountTable()).text()
    expect(text).toContain('新南威尔士州（NSW）')
    expect(text).toContain('澳大利亚首都领地（ACT）')
    expect(text).toContain('线下配送')
    expect(text).toContain('快递')
    expect(text).toContain('改成快递')
    expect(text).toContain('改成线下配送')
  })

  it('没有删除按钮', async () => {
    expect((await mountTable()).text()).not.toContain('删除')
  })

  it('空数据时显示空状态', async () => {
    const wrapper = await mountTable({ cities: [], empty: true })
    expect(wrapper.text()).toContain('还没有城市')
  })

  it('加载失败时显示错误和重试按钮，不显示空状态', async () => {
    const wrapper = await mountTable({ cities: [], errorMessage: '网络连接失败，请检查网络' })
    expect(wrapper.text()).toContain('城市列表加载失败：网络连接失败，请检查网络')
    expect(wrapper.text()).not.toContain('还没有城市')
    const retry = wrapper.findAll('button').find((button) => button.text() === '重试')!
    await retry.trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('没有错误时不显示重试按钮', async () => {
    expect((await mountTable()).text()).not.toContain('重试')
  })
})

describe('操作', () => {
  it('点击编辑发出 edit，带上这一行的城市', async () => {
    const wrapper = await mountTable()
    const edit = wrapper.findAll('button').filter((button) => button.text() === '编辑')
    await edit[1]!.trigger('click')
    expect(wrapper.emitted('edit')).toEqual([[canberra]])
  })

  it('确认切换后发出 toggle-fulfillment', async () => {
    const wrapper = await mountTable()
    wrapper.findAllComponents(ElPopconfirm)[0]!.vm.$emit('confirm')
    expect(wrapper.emitted('toggle-fulfillment')).toEqual([[sydney]])
  })

  it('切换过程中，其他行的切换按钮不可用', async () => {
    const wrapper = await mountTable({ togglingId: sydney.id })
    const buttons = wrapper.findAll('button').filter((button) => button.text().startsWith('改成'))
    expect(buttons[1]!.attributes('disabled')).toBeDefined()
  })
})
