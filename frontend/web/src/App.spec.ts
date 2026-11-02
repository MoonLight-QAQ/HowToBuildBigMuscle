import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '@/App.vue'

// 冒烟测试：确认根组件能正常挂载
describe('App', () => {
  it('显示管理后台标题', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('拾澳管理后台')
  })
})
