import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { HOME_PATH } from './guard'
import { routes } from './index'

describe('routes', () => {
  it('不存在的路径回到首页', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/not-exist/deep')
    expect(router.currentRoute.value.path).toBe(HOME_PATH)
  })
})
