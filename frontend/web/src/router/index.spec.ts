import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { routes } from './index'

/**
 * routeSuite registers navigation and preview-scope checks.
 * 中文：注册导航与预览范围测试；参数：无；返回：无；副作用：注册测试用例。
 * Parameters: none. Returns: void. Effect: registers tests.
 */
function routeSuite(): void {
  /**
   * navigatesWithinScope resolves all four pages and rejects partner routes as out of scope.
   * 中文：验证四页与默认跳转，伙伴路径只显示范围外提示；参数：无；返回：测试完成Promise；副作用：改变内存路由。
   * Parameters: none. Returns: a test-completion promise. Effect: changes memory history.
   */
  async function navigatesWithinScope(): Promise<void> {
    const router = createRouter({ history: createMemoryHistory(), routes })
    const expectedRoutes = [
      { path: '/', name: 'ProductList' },
      { path: '/products', name: 'ProductList' },
      { path: '/mall-categories', name: 'MallCategoryList' },
      { path: '/delivery', name: 'DeliverySettings' },
      { path: '/cities', name: 'CityList' },
      { path: '/orders', name: 'OutOfScope' },
      { path: '/login', name: 'OutOfScope' },
      { path: '/not-a-preview-page', name: 'OutOfScope' },
    ]
    for (const expected of expectedRoutes) {
      await router.push(expected.path)
      expect(router.currentRoute.value.name).toBe(expected.name)
    }
  }

  /**
   * keepsPageModulesLazy prevents accidental eager loading of all preview pages.
   * 中文：验证页面按需加载；参数：无；返回：无；副作用：无，不触发页面加载函数。
   * Parameters: none. Returns: void. Effects: none; loaders are not invoked.
   */
  function keepsPageModulesLazy(): void {
    const children = routes[0]?.children ?? []
    let lazyPages = 0
    for (const route of children) {
      if (route.redirect) continue
      expect(typeof route.component).toBe('function')
      lazyPages += 1
    }
    expect(lazyPages).toBe(5)
  }

  it('keeps navigation within the four-module preview', navigatesWithinScope)
  it('loads page modules lazily', keepsPageModulesLazy)
}

describe('preview routes', routeSuite)
