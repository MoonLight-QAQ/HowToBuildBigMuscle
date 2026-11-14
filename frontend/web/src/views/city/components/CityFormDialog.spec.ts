/// <reference types="node" />
/**
 * CityFormDialog 的测试：新增和编辑时州的显示、选择州发出的事件、本地校验通过后才发出 submit。
 *
 * 其他模块照着写时：组件只通过 props 和事件与页面交互，测试也只检查这两样。
 * 需要真实运行 ElForm 校验时，照本文件和 BilingualInput.spec.ts 用 CJS 版的 element-plus。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { ElSelect } from 'element-plus'
import {
  createCityFormRules,
  createDefaultCityForm,
  cityToForm,
  type CityForm,
  type CityFormMode,
} from '../model/city-form'
import CityFormDialog from './CityFormDialog.vue'

// 与 BilingualInput.spec.ts 相同：用 element-plus 的 CJS 构建，避免 Node 的 ESM/CJS 互操作问题，
// 校验逻辑仍是真实的。
vi.mock('element-plus', async function loadRealElementPlusCjs() {
  const { createRequire } = await import('node:module')
  return createRequire(import.meta.url)('element-plus') as typeof import('element-plus')
})

const { default: ElementPlus } = await import('element-plus')

const wrappers: VueWrapper[] = []
afterEach(() => {
  for (const wrapper of wrappers) wrapper.unmount()
  wrappers.length = 0
})

const sydney = {
  id: '1854239876543209472',
  nameZh: '悉尼',
  nameEn: 'Sydney',
  fulfillment: 'local',
  state: 'NSW',
  timezone: 'Australia/Sydney',
  sort: 1,
} as const

/** 挂载弹窗，等待 ElDialog 打开并渲染内容。 */
async function mountDialog(mode: CityFormMode, form: CityForm) {
  const wrapper = mount(CityFormDialog, {
    props: {
      visible: true,
      mode,
      form,
      rules: createCityFormRules(mode),
      submitting: false,
      formError: null,
      serverErrorFields: [],
    },
    global: { plugins: [ElementPlus] },
    attachTo: document.body,
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

/** 点击「保存」，等待校验完成。 */
async function clickSave(wrapper: VueWrapper) {
  const save = wrapper.findAll('button').find((button) => button.text() === '保存')!
  await save.trigger('click')
  await flushPromises()
}

describe('所属州', () => {
  it('新增时可以选择；选择后只发出 select-state，不直接修改表单', async () => {
    const form = createDefaultCityForm([])
    const wrapper = await mountDialog('create', form)
    const select = wrapper.findAllComponents(ElSelect)[0]!
    expect(select.props('disabled')).toBe(false)
    select.vm.$emit('update:modelValue', 'VIC')
    expect(wrapper.emitted('select-state')).toEqual([['VIC']])
    expect(form.state).toBeNull()
  })

  it('编辑时显示但只读，并说明不能修改', async () => {
    const wrapper = await mountDialog('edit', cityToForm({ ...sydney }))
    const select = wrapper.findAllComponents(ElSelect)[0]!
    expect(select.props('disabled')).toBe(true)
    expect(select.props('modelValue')).toBe('NSW')
    expect(wrapper.text()).toContain('州创建后不能修改')
  })
})

describe('提交', () => {
  it('标题按模式区分', async () => {
    expect((await mountDialog('create', createDefaultCityForm([]))).text()).toContain('添加城市')
    expect((await mountDialog('edit', cityToForm({ ...sydney }))).text()).toContain('编辑城市')
  })

  it('新增时没有填写名称和州，不发出 submit，并显示校验提示', async () => {
    const wrapper = await mountDialog('create', createDefaultCityForm([]))
    await clickSave(wrapper)
    expect(wrapper.emitted('submit')).toBeUndefined()
    // ElFormItem 的错误提示是防抖显示的，要等待。
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('请填写中文名')
      expect(wrapper.text()).toContain('请选择所属州')
    })
  })

  it('填写完整后发出 submit', async () => {
    const wrapper = await mountDialog('edit', cityToForm({ ...sydney }))
    await clickSave(wrapper)
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('点击取消发出 close', async () => {
    const wrapper = await mountDialog('edit', cityToForm({ ...sydney }))
    const cancel = wrapper.findAll('button').find((button) => button.text() === '取消')!
    await cancel.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('显示表单顶部的错误', async () => {
    const wrapper = await mountDialog('edit', cityToForm({ ...sydney }))
    await wrapper.setProps({ formError: '名称已存在' })
    expect(wrapper.text()).toContain('名称已存在')
  })

  it('收到服务器的字段错误后，错误显示在对应输入框下面', async () => {
    const form = cityToForm({ ...sydney })
    const wrapper = await mountDialog('edit', form)
    await wrapper.setProps({
      rules: createCityFormRules('edit', (field, value) =>
        field === 'timezone' && value === form.timezone ? '必须是有效的 IANA 时区名' : null,
      ),
      serverErrorFields: ['timezone'],
    })
    await vi.waitFor(() => expect(wrapper.text()).toContain('必须是有效的 IANA 时区名'))
  })
})
