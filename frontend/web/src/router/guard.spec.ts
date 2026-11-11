import { describe, expect, it } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { getRedirectPath, HOME_PATH, isLoginPath, LOGIN_PATH, resolveNavigation } from './guard'

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

describe('isLoginPath', () => {
  it.each([LOGIN_PATH, `${LOGIN_PATH}/`, '/Login', '/LOGIN/'])('%s 是登录页', (path) => {
    expect(isLoginPath(path)).toBe(true)
  })

  it.each(['/', '/login-help', '/orders/login', '/loginx'])('%s 不是登录页', (path) => {
    expect(isLoginPath(path)).toBe(false)
  })
})

describe('getRedirectPath', () => {
  it('接受站内路径，保留查询参数', () => {
    expect(getRedirectPath('/orders?status=pending')).toBe('/orders?status=pending')
  })

  it.each(['/files/.hidden', '/a..b', '/orders/v1.2', '/orders?path=../x', '/orders#./top'])(
    '%s 中的点不是独立路径段，接受',
    (redirect) => {
      expect(getRedirectPath(redirect)).toBe(redirect)
    },
  )

  it.each([
    ['不是字符串', undefined],
    ['数组', ['/orders']],
    ['外部网址', 'https://evil.example.com'],
    ['协议相对地址', '//evil.example.com'],
    ['含反斜杠', '/\\evil.example.com'],
    ['相对路径', 'orders'],
    ['登录页本身', LOGIN_PATH],
    ['带参数的登录页', `${LOGIN_PATH}?redirect=/orders`],
    ['末尾带斜杠的登录页', `${LOGIN_PATH}/`],
    ['大小写不同的登录页', '/Login?redirect=/orders'],
    ['带锚点的登录页', `${LOGIN_PATH}#top`],
    ['含 . 路径段', '/./login'],
    ['含 .. 路径段', '/orders/../login?redirect=/orders'],
    ['末尾是 . 路径段', '/orders/.'],
    ['含编码的 . 路径段', '/%2e/login'],
    ['含编码的 .. 路径段', '/orders/%2E%2e/login'],
    ['含半编码的 .. 路径段', '/orders/.%2e/login'],
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

  it.each([`${LOGIN_PATH}/`, '/Login'])('未登录访问 %s，视为登录页并放行', (path) => {
    expect(resolveNavigation(target(path), false)).toBe(true)
  })

  it.each([`${LOGIN_PATH}/`, '/Login'])('已登录访问 %s，视为登录页并回到首页', (path) => {
    expect(resolveNavigation(target(path), true)).toBe(HOME_PATH)
  })

  it('已登录访问登录页且没有 redirect，回到首页', () => {
    expect(resolveNavigation(target(LOGIN_PATH), true)).toBe(HOME_PATH)
  })

  it('标记为 public 的页面，未登录也放行', () => {
    expect(resolveNavigation(target('/public-page', { public: true }), false)).toBe(true)
  })
})
