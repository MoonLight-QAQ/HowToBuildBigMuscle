import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import { h } from 'vue'
import {
  CHANGE_PASSWORD_PATH,
  getRedirectPath,
  HOME_PATH,
  isChangePasswordPath,
  isLoginPath,
  LOGIN_PATH,
  resolveNavigation,
  setupAuthGuard,
  type SessionState,
} from './guard'

type Target = Pick<RouteLocationNormalized, 'path' | 'fullPath' | 'meta' | 'query'>

const LOGGED_IN: SessionState = { isLoggedIn: true, mustChangePassword: false }
const LOGGED_OUT: SessionState = { isLoggedIn: false, mustChangePassword: false }
const MUST_CHANGE: SessionState = { isLoggedIn: true, mustChangePassword: true }

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
    expect(resolveNavigation(target('/orders/123?tab=items'), LOGGED_OUT)).toEqual({
      path: LOGIN_PATH,
      query: { redirect: '/orders/123?tab=items' },
    })
  })

  it('已登录访问需要登录的页面，放行', () => {
    expect(resolveNavigation(target('/orders'), LOGGED_IN)).toBe(true)
  })

  it('未登录访问登录页，放行', () => {
    expect(resolveNavigation(target(LOGIN_PATH), LOGGED_OUT)).toBe(true)
  })

  it('已登录访问登录页，跳回 redirect 指定的页面', () => {
    expect(resolveNavigation(target(`${LOGIN_PATH}?redirect=%2Fcities`), LOGGED_IN)).toBe('/cities')
  })

  it.each([`${LOGIN_PATH}/`, '/Login'])('未登录访问 %s，视为登录页并放行', (path) => {
    expect(resolveNavigation(target(path), LOGGED_OUT)).toBe(true)
  })

  it.each([`${LOGIN_PATH}/`, '/Login'])('已登录访问 %s，视为登录页并回到首页', (path) => {
    expect(resolveNavigation(target(path), LOGGED_IN)).toBe(HOME_PATH)
  })

  it('已登录访问登录页且没有 redirect，回到首页', () => {
    expect(resolveNavigation(target(LOGIN_PATH), LOGGED_IN)).toBe(HOME_PATH)
  })

  it('标记为 public 的页面，未登录也放行', () => {
    expect(resolveNavigation(target('/public-page', { public: true }), LOGGED_OUT)).toBe(true)
  })

  describe('须先改密码', () => {
    it.each(['/', '/orders/123', '/cities?page=2'])('访问 %s 时跳到改密码页', (path) => {
      expect(resolveNavigation(target(path), MUST_CHANGE)).toBe(CHANGE_PASSWORD_PATH)
    })

    it.each([CHANGE_PASSWORD_PATH, `${CHANGE_PASSWORD_PATH}/`, '/Change-Password'])(
      '访问改密码页 %s 时放行',
      (path) => {
        expect(resolveNavigation(target(path), MUST_CHANGE)).toBe(true)
      },
    )

    it('访问登录页时不转到改密码页，按已登录处理', () => {
      expect(resolveNavigation(target(LOGIN_PATH), MUST_CHANGE)).toBe(HOME_PATH)
    })

    it('不须改密码时也可以访问改密码页', () => {
      expect(resolveNavigation(target(CHANGE_PASSWORD_PATH), LOGGED_IN)).toBe(true)
    })

    it('未登录访问改密码页，跳到登录页', () => {
      expect(resolveNavigation(target(CHANGE_PASSWORD_PATH), LOGGED_OUT)).toEqual({
        path: LOGIN_PATH,
        query: { redirect: CHANGE_PASSWORD_PATH },
      })
    })
  })
})

describe('isChangePasswordPath', () => {
  it.each([CHANGE_PASSWORD_PATH, `${CHANGE_PASSWORD_PATH}/`, '/CHANGE-PASSWORD'])(
    '%s 是改密码页',
    (path) => {
      expect(isChangePasswordPath(path)).toBe(true)
    },
  )

  it.each(['/', '/change-password-help', '/login'])('%s 不是改密码页', (path) => {
    expect(isChangePasswordPath(path)).toBe(false)
  })
})

describe('setupAuthGuard', () => {
  it('登录状态确认之前，导航一直等待，不提前跳转', async () => {
    const page = { render: () => h('p') }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: page },
        { path: LOGIN_PATH, component: page },
      ],
    })
    let resolveSession: (state: SessionState) => void = () => {}
    const sessionReady = new Promise<SessionState>((resolve) => {
      resolveSession = resolve
    })
    let calls = 0
    setupAuthGuard(router, () => {
      calls += 1
      return sessionReady
    })

    let settled = false
    const navigation = router.push(HOME_PATH).then(() => {
      settled = true
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(calls).toBe(1)
    expect(settled).toBe(false)

    resolveSession(LOGGED_IN)
    await navigation
    expect(router.currentRoute.value.path).toBe(HOME_PATH)
  })
})
