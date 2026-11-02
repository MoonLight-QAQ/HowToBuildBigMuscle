import { describe, expect, it } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { getRedirectPath, HOME_PATH, LOGIN_PATH, resolveNavigation } from './guard'

type Target = Pick<RouteLocationNormalized, 'path' | 'fullPath' | 'meta' | 'query'>

function target(fullPath: string, meta: Target['meta'] = {}): Target {
  const url = new URL(fullPath, 'http://localhost')
  return {
    path: url.pathname,
    fullPath,
    meta,
    query: Object.fromEntries(url.searchParams),
  }
}

describe('getRedirectPath', () => {
  it('接受站内路径，保留查询参数', () => {
    expect(getRedirectPath('/orders?status=pending')).toBe('/orders?status=pending')
  })

  it.each([
    ['不是字符串', undefined],
    ['数组', ['/orders']],
    ['外部网址', 'https://evil.example.com'],
    ['协议相对地址', '//evil.example.com'],
    ['相对路径', 'orders'],
    ['登录页本身', LOGIN_PATH],
    ['带参数的登录页', `${LOGIN_PATH}?redirect=/orders`],
  ])('%s时回到首页', (_name, redirect) => {
    expect(getRedirectPath(redirect)).toBe(HOME_PATH)
  })
})

describe('resolveNavigation', () => {
  it('未登录访问需要登录的页面，跳到登录页并记住原路径', () => {
    expect(resolveNavigation(target('/orders/123?tab=items'), false)).toEqual({
      path: LOGIN_PATH,
      query: { redirect: '/orders/123?tab=items' },
    })
  })

  it('已登录访问需要登录的页面，放行', () => {
    expect(resolveNavigation(target('/orders'), true)).toBe(true)
  })

  it('未登录访问登录页，放行', () => {
    expect(resolveNavigation(target(LOGIN_PATH), false)).toBe(true)
  })

  it('已登录访问登录页，跳回 redirect 指定的页面', () => {
    expect(resolveNavigation(target(`${LOGIN_PATH}?redirect=%2Fcities`), true)).toBe('/cities')
  })

  it('已登录访问登录页且没有 redirect，回到首页', () => {
    expect(resolveNavigation(target(LOGIN_PATH), true)).toBe(HOME_PATH)
  })

  it('标记为 public 的页面，未登录也放行', () => {
    expect(resolveNavigation(target('/public-page', { public: true }), false)).toBe(true)
  })
})
