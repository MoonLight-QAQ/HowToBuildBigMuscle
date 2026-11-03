import { afterEach, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import BilingualInput from './BilingualInput.vue'

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
    props: { disabled: true, maxlength: 30, required: false },
  })
  wrappers.push(wrapper)
  for (const input of wrapper.findAll('input')) {
    expect(input.element.disabled).toBe(true)
    expect(input.element.maxLength).toBe(30)
    expect(input.element.required).toBe(false)
    expect(input.attributes('aria-required')).toBe('false')
  }
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
