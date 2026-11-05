/// <reference types="node" />
import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { ElForm, type FormInstance } from 'element-plus'
import { mount, type VueWrapper } from '@vue/test-utils'
import BilingualInput from './BilingualInput.vue'

/** 中文：选择包自身真实CJS构建，避免Node的ESM/CJS默认导出歧义；不替换校验逻辑。
 * English: Load the real CJS build to match Node interop, preserving actual form validation.
 */
vi.mock('element-plus', async function loadRealElementPlusCjs() {
  const { createRequire } = await import('node:module')
  return createRequire(import.meta.url)('element-plus') as typeof import('element-plus')
})

const wrappers: VueWrapper[] = []

/** 中文：卸载本组组件，释放表单订阅。 English: Unmount test components and release subscriptions. */
function cleanup(): void {
  for (const wrapper of wrappers) wrapper.unmount()
  wrappers.length = 0
}
afterEach(cleanup)

/** 中文：验证两个默认必填输入框具有可访问标签。 English: Check required native inputs and labels. */
it('默认渲染空白中英字段，并将标签连接到各自输入', async function testLabelsAndRequired() {
  const wrapper = mount(BilingualInput)
  wrappers.push(wrapper)
  await nextTick()
  const inputs = wrapper.findAll('input')
  expect(inputs).toHaveLength(2)
  const labels = wrapper.findAll('label')
  expect(labels.map((label) => label.text())).toEqual(['中文', '英文'])
  for (const [index, input] of inputs.entries()) {
    expect(input.element.value).toBe('')
    expect(input.element.required).toBe(true)
    expect(input.attributes('aria-required')).toBe('true')
    expect(labels[index]?.attributes('for')).toBe(input.attributes('id'))
  }
  expect(new Set(inputs.map((input) => input.attributes('id'))).size).toBe(2)
})

/** 中文：输入只更新对应模型且保留空格，父值更新同步显示。 English: Keep models independent and preserve text. */
it('分别发出中英模型更新，并响应外部值变化', async function testModelBinding() {
  const wrapper = mount(BilingualInput, { props: { zh: '悉尼', en: 'Sydney' } })
  wrappers.push(wrapper)
  const inputs = wrapper.findAll('input')
  await inputs[0]!.setValue(' 墨尔本 ')
  expect(wrapper.emitted('update:zh')).toEqual([[' 墨尔本 ']])
  expect(wrapper.emitted('update:en')).toBeUndefined()
  expect(inputs[1]!.element.value).toBe('Sydney')
  await inputs[1]!.setValue(' Melbourne ')
  expect(wrapper.emitted('update:en')).toEqual([[' Melbourne ']])
  await wrapper.setProps({ zh: '堪培拉', en: 'Canberra' })
  expect(inputs.map((input) => input.element.value)).toEqual(['堪培拉', 'Canberra'])
})

/** 中文：组件原样转交禁用、长度与可选字段配置。 English: Forward disabled, maxlength and required attributes. */
it('支持禁用、长度限制及取消必填', function testInputOptions() {
  const wrapper = mount(BilingualInput, {
    props: { disabled: true, maxlengthZh: 60, maxlengthEn: 120, required: false },
  })
  wrappers.push(wrapper)
  for (const [index, input] of wrapper.findAll('input').entries()) {
    expect(input.element.disabled).toBe(true)
    expect(input.element.maxLength).toBe(index === 0 ? 60 : 120)
    expect(input.element.required).toBe(false)
    expect(input.attributes('aria-required')).toBe('false')
  }
})

/** 中文：真实表单分别校验中英文并单独清除错误。 English: Validate and clear each field independently in ElForm. */
it('用 propZh/propEn 接入真实 ElForm，必填和长度错误分别校验', async function testFormIntegration() {
  const form = ref<FormInstance>()
  const model = reactive({ nameZh: '', nameEn: '' })
  const rules = {
    nameZh: [
      { required: true, message: '请填写中文', trigger: 'blur' },
      { max: 2, message: '中文最多两个字符', trigger: 'blur' },
    ],
    nameEn: [
      { required: true, message: '请填写英文', trigger: 'blur' },
      { max: 6, message: '英文最多六个字符', trigger: 'blur' },
    ],
  }
  /** 中文：同步中文模型，无返回；更新本测试表单。 English: Update the Chinese test field; returns void. */
  function updateZh(value: string): void {
    model.nameZh = value
  }
  /** 中文：同步英文模型，无返回；更新本测试表单。 English: Update the English test field; returns void. */
  function updateEn(value: string): void {
    model.nameEn = value
  }
  /** 中文：渲染受控双语字段，无外部副作用。 English: Render controlled bilingual form fields without external effects. */
  function renderFields() {
    return h(BilingualInput, {
      zh: model.nameZh,
      en: model.nameEn,
      'onUpdate:zh': updateZh,
      'onUpdate:en': updateEn,
      propZh: 'nameZh',
      propEn: 'nameEn',
      maxlengthZh: 2,
      maxlengthEn: 6,
    })
  }
  /** 中文：渲染真实 ElForm 并暴露校验实例。 English: Render a real ElForm and expose its validation instance. */
  function renderForm() {
    return h(ElForm, { ref: form, model, rules }, { default: renderFields })
  }
  const wrapper = mount(defineComponent({ render: renderForm }))
  wrappers.push(wrapper)
  await nextTick()
  expect(form.value!.fields).toHaveLength(2)
  expect(form.value!.fields.map((field) => field.prop)).toEqual(['nameZh', 'nameEn'])
  expect(form.value!.fields.map((field) => field.fieldValue)).toEqual(['', ''])
  expect(form.value!.fields.map((field) => field.required)).toEqual([true, true])
  await expect(form.value!.validate()).rejects.toHaveProperty('nameZh')
  const fields = wrapper.findAll('.el-form-item')
  /** 中文：等待真实表单的防抖错误显示。 English: Await the form's debounced required messages. */
  function expectRequiredErrors(): void {
    expect(fields[0]!.find('.el-form-item__error').text()).toBe('请填写中文')
    expect(fields[1]!.find('.el-form-item__error').text()).toBe('请填写英文')
  }
  await vi.waitFor(expectRequiredErrors)
  const inputs = wrapper.findAll('input')
  await inputs[0]!.setValue('悉尼')
  await inputs[0]!.trigger('blur')
  /** 中文：中文修正后只清除中文错误。 English: Clear only the corrected Chinese field. */
  function expectChineseCleared(): void {
    expect(fields[0]!.find('.el-form-item__error').exists()).toBe(false)
    expect(fields[1]!.find('.el-form-item__error').text()).toBe('请填写英文')
  }
  await vi.waitFor(expectChineseCleared)
  await inputs[1]!.setValue('SydneyX')
  await inputs[1]!.trigger('blur')
  /** 中文：英文使用独立长度规则。 English: Assert the independent English length rule. */
  function expectEnglishLengthError(): void {
    expect(fields[1]!.find('.el-form-item__error').text()).toBe('英文最多六个字符')
  }
  await vi.waitFor(expectEnglishLengthError)
  await inputs[1]!.setValue('Sydney')
  await inputs[1]!.trigger('blur')
  /** 中文：英文修正后清除剩余错误。 English: Clear the remaining error after valid English input. */
  function expectEnglishCleared(): void {
    expect(fields[1]!.find('.el-form-item__error').exists()).toBe(false)
  }
  await vi.waitFor(expectEnglishCleared)
  await expect(form.value!.validate()).resolves.toBe(true)
  expect(model).toEqual({ nameZh: '悉尼', nameEn: 'Sydney' })
  expect(form.value!.fields.map((field) => field.fieldValue)).toEqual(['悉尼', 'Sydney'])
  form.value!.resetFields()
  await nextTick()
  expect(model).toEqual({ nameZh: '', nameEn: '' })
  expect(inputs.map((input) => input.element.value)).toEqual(['', ''])
})

/** 中文：同一表单多个组件实例不能复用输入 ID。 English: Multiple instances in one app have unique IDs. */
it('多个实例的四个标签分别指向唯一输入', async function testMultipleInstances() {
  /** 中文：同一应用内渲染两个输入组件，无参数或外部副作用。 English: Render two sibling inputs. */
  function renderSiblings() {
    return h('form', [h(BilingualInput), h(BilingualInput)])
  }
  const wrapper = mount(defineComponent({ render: renderSiblings }))
  wrappers.push(wrapper)
  await nextTick()
  const ids = wrapper.findAll('input').map((input) => input.attributes('id'))
  expect(new Set(ids).size).toBe(4)
  expect(wrapper.findAll('label').map((label) => label.attributes('for'))).toEqual(ids)
})

/** 中文：输入法组合完成前不提交中间文本。 English: Defer model updates until IME composition ends. */
it('中文输入法组合阶段不发出中间值', async function testComposition() {
  const wrapper = mount(BilingualInput, { props: { zh: '', en: '' } })
  wrappers.push(wrapper)
  const input = wrapper.get('input')
  await input.trigger('compositionstart')
  input.element.value = '墨尔本'
  await input.trigger('input')
  expect(wrapper.emitted('update:zh')).toBeUndefined()
  await input.trigger('compositionend')
  await nextTick()
  expect(wrapper.emitted('update:zh')).toEqual([['墨尔本']])
  expect(wrapper.emitted('update:en')).toBeUndefined()
})
