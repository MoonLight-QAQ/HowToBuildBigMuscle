import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/http'
import ResourceState from './ResourceState.vue'

/**
 * resourceStateSuite registers resource feedback tests.
 * 中文：注册资源反馈测试；参数：无；返回：无；副作用：注册测试用例。
 * Parameters: none. Returns: void. Effect: registers tests.
 */
function resourceStateSuite(): void {
  /**
   * exposesLoadingState identifies loading to assistive technology and hides stale content.
   * 中文：验证可感知的加载状态并隐藏旧内容；参数：无；返回：无；副作用：挂载并销毁测试组件。
   * Parameters: none. Returns: void. Effect: mounts and unmounts a test component.
   */
  function exposesLoadingState(): void {
    const wrapper = mount(ResourceState, {
      props: { status: 'loading', error: null },
      slots: { default: '<p>原有商品</p>' },
      global: { plugins: [ElementPlus] },
    })
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.get('[role="status"]').text()).toContain('正在加载数据')
    expect(wrapper.text()).not.toContain('原有商品')
    wrapper.unmount()
  }

  /**
   * emitsRetryOnError shows the normalized message and delegates retry to the data layer.
   * 中文：验证错误文案和重试委托；参数：无；返回：测试完成Promise；副作用：点击测试组件按钮。
   * Parameters: none. Returns: a test-completion promise. Effect: triggers a test button.
   */
  async function emitsRetryOnError(): Promise<void> {
    const failure = new ApiError('FORBIDDEN', '没有查看此模块的权限。', 403)
    const wrapper = mount(ResourceState, {
      props: { status: 'error', error: failure },
      slots: { default: '<p>不应显示的旧数据</p>' },
      global: { plugins: [ElementPlus] },
    })
    expect(wrapper.get('[role="alert"]').text()).toContain(failure.message)
    expect(wrapper.text()).not.toContain('不应显示的旧数据')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
    expect(failure.code).toBe('FORBIDDEN')
    wrapper.unmount()
  }

  /**
   * distinguishesEmptyAndSuccess preserves zero-valued content only after success.
   * 中文：验证空态与成功切换，成功时保留真实零值；参数：无；返回：测试完成Promise；副作用：更新测试组件属性。
   * Parameters: none. Returns: a test-completion promise. Effect: updates test props.
   */
  async function distinguishesEmptyAndSuccess(): Promise<void> {
    const wrapper = mount(ResourceState, {
      props: { status: 'empty', error: null },
      slots: { default: '<p>可售库存 0</p>' },
      global: { plugins: [ElementPlus] },
    })
    expect(wrapper.text()).toContain('暂无数据')
    expect(wrapper.text()).not.toContain('可售库存 0')
    await wrapper.setProps({ status: 'success' })
    expect(wrapper.text()).not.toContain('暂无数据')
    expect(wrapper.text()).toContain('可售库存 0')
    expect(wrapper.find('button').exists()).toBe(false)
    wrapper.unmount()
  }

  it('announces loading and keeps stale data hidden', exposesLoadingState)
  it('shows normalized errors and emits retry', emitsRetryOnError)
  it('distinguishes empty feedback from successful zero values', distinguishesEmptyAndSuccess)
}

describe('ResourceState', resourceStateSuite)
