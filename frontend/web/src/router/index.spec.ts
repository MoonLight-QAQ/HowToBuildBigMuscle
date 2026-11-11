import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { HOME_PATH, LOGIN_PATH, setupAuthGuard } from './guard'
import { routes } from './index'

/** 超过这个次数仍在重定向，就认为陷入了循环 */
const MAX_REDIRECTS = 10

/** 用真实的路由表和登录守卫创建路由 */
function createAppRouter(isLoggedIn: boolean) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  // 先注册计数守卫：出现循环重定向时中止导航，让测试失败而不是卡住
  let count = 0
  router.beforeEach(() => {
    count += 1
    return count <= MAX_REDIRECTS
  })
  setupAuthGuard(router, () => isLoggedIn)
  return router
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('routes', () => {
  it('未登录访问首页，导航能结束并停在登录页', async () => {
    // W-03 之前路由表里没有登录页，vue-router 会警告找不到匹配
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const router = createAppRouter(false)

    await router.push(HOME_PATH)

    expect(router.currentRoute.value.path).toBe(LOGIN_PATH)
    expect(router.currentRoute.value.query.redirect).toBe(HOME_PATH)
  })

  it('已登录访问首页，直接放行', async () => {
    const router = createAppRouter(true)

    await router.push(HOME_PATH)

    expect(router.currentRoute.value.path).toBe(HOME_PATH)
  })
})
