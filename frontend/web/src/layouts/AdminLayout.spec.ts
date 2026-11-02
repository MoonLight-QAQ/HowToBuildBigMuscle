import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminLayout from './AdminLayout.vue'
import { MENU_GROUPS } from './menu'

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: AdminLayout,
        children: [{ path: 'orders/:id', component: { render: () => h('p', '订单详情页面') } }],
      },
    ],
  })
  await router.push(path)
  await router.isReady()
  return mount(AdminLayout, { global: { plugins: [router, ElementPlus] } })
}

describe('AdminLayout', () => {
  it('显示所有导航分组和导航项', async () => {
    const wrapper = await mountAt('/')
    for (const group of MENU_GROUPS) {
      expect(wrapper.text()).toContain(group.title)
      for (const item of group.items) expect(wrapper.text()).toContain(item.label)
    }
  })

  it('在内容区渲染子路由页面，并高亮所属导航', async () => {
    const wrapper = await mountAt('/orders/9000000000000000010')
    expect(wrapper.find('.admin-layout__main').text()).toContain('订单详情页面')
    expect(wrapper.find('.el-menu-item.is-active').text()).toBe('订单')
  })
})
