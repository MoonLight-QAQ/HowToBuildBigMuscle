import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'

/** 登录页路径。登录页本身由 W-03 在路由表中添加。 */
export const LOGIN_PATH = '/login'

/** 登录后默认进入的页面 */
export const HOME_PATH = '/'

/**
 * 从路由的 query.redirect 中取出登录后要回到的路径。
 * 只接受站内路径（以单个 / 开头、不含反斜杠），防止被构造成跳到外部网站的链接。
 * 浏览器会把反斜杠当作 /，例如 /\evil.example.com 会被解析成协议相对地址。
 */
export function getRedirectPath(redirect: unknown): string {
  if (typeof redirect !== 'string') return HOME_PATH
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return HOME_PATH
  if (redirect.includes('\\')) return HOME_PATH
  if (redirect === LOGIN_PATH || redirect.startsWith(`${LOGIN_PATH}?`)) return HOME_PATH
  return redirect
}

/**
 * 根据登录状态决定本次导航是否放行。
 * 返回 true 表示放行，否则返回要跳转到的位置。
 */
export function resolveNavigation(
  to: Pick<RouteLocationNormalized, 'path' | 'fullPath' | 'meta' | 'query'>,
  isLoggedIn: boolean,
): true | RouteLocationRaw {
  // 已登录时再打开登录页，直接回到原本要去的页面
  if (to.path === LOGIN_PATH) {
    return isLoggedIn ? getRedirectPath(to.query.redirect) : true
  }

  if (to.meta.public) return true

  if (!isLoggedIn) {
    return { path: LOGIN_PATH, query: { redirect: to.fullPath } }
  }

  return true
}

/**
 * 给路由注册登录守卫。
 * isLoggedIn 由调用方提供（登录状态的 store），守卫本身不依赖 store，便于测试。
 */
export function setupAuthGuard(router: Router, isLoggedIn: () => boolean): void {
  router.beforeEach((to) => resolveNavigation(to, isLoggedIn()))
}
