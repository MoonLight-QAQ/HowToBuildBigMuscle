/// <reference types="node" />
/**
 * MallCategoryFormDialog 的测试：本地校验通过后才发出 submit、取消、表单顶部的错误、服务器的字段错误。
 * 组件只通过 props 和事件与页面交互，测试也只检查这两样。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import {
  createDefaultMallCategoryForm,
  createMallCategoryFormRules,
  type MallCategoryForm,
} from '../model/mall-category-form'
import MallCategoryFormDialog from './MallCategoryFormDialog.vue'

// 与城市的 CityFormDialog.spec.ts 相同：用 element-plus 的 CJS 构建，避免 Node 的 ESM/CJS 互操作问题，
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

/** 一份填写完整的表单。 */
function filledForm(): MallCategoryForm {
  return { nameZh: '节日礼品', nameEn: 'Festive Gifts', sort: 60 }
}

/** 挂载弹窗，等待 ElDialog 打开并渲染内容。 */
async function mountDialog(form: MallCategoryForm) {
  const wrapper = mount(MallCategoryFormDialog, {
    props: {
      visible: true,
      form,
      rules: createMallCategoryFormRules(),
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

describe('提交', () => {
  it('标题为「添加类目」，有中英文名和排序', async () => {
    const wrapper = await mountDialog(createDefaultMallCategoryForm([]))
    const text = wrapper.text()
    expect(text).toContain('添加类目')
    expect(text).toContain('中文')
    expect(text).toContain('英文')
    expect(text).toContain('排序')
  })

  it('没有填写名称时不发出 submit，并显示校验提示', async () => {
    const wrapper = await mountDialog(createDefaultMallCategoryForm([]))
    await clickSave(wrapper)
    expect(wrapper.emitted('submit')).toBeUndefined()
    // ElFormItem 的错误提示是防抖显示的，要等待。
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('请填写中文名')
      expect(wrapper.text()).toContain('请填写英文名')
    })
  })

  it('名称只有空格时视为未填，不发出 submit', async () => {
    const wrapper = await mountDialog({ ...filledForm(), nameZh: '   ' })
    await clickSave(wrapper)
    expect(wrapper.emitted('submit')).toBeUndefined()
    await vi.waitFor(() => expect(wrapper.text()).toContain('请填写中文名'))
  })

  it('排序清空后不发出 submit', async () => {
    const wrapper = await mountDialog({ ...filledForm(), sort: null })
    await clickSave(wrapper)
    expect(wrapper.emitted('submit')).toBeUndefined()
    await vi.waitFor(() => expect(wrapper.text()).toContain('请填写排序'))
  })

  it('填写完整后发出 submit', async () => {
    const wrapper = await mountDialog(filledForm())
    await clickSave(wrapper)
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('点击取消发出 close', async () => {
    const wrapper = await mountDialog(filledForm())
    const cancel = wrapper.findAll('button').find((button) => button.text() === '取消')!
    await cancel.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('显示表单顶部的错误', async () => {
    const wrapper = await mountDialog(filledForm())
    await wrapper.setProps({ formError: '名称已存在' })
    expect(wrapper.text()).toContain('名称已存在')
  })

  it('收到服务器的字段错误后，错误显示在对应输入框下面', async () => {
    const form = filledForm()
    const wrapper = await mountDialog(form)
    await wrapper.setProps({
      rules: createMallCategoryFormRules((field, value) =>
        field === 'nameEn' && value === form.nameEn ? '不能超过 40 个字符' : null,
      ),
      serverErrorFields: ['nameEn'],
    })
    await vi.waitFor(() => expect(wrapper.text()).toContain('不能超过 40 个字符'))
  })
})
