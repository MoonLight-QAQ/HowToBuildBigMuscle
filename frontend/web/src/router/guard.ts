import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'

/** 登录页路径。登录页本身由 W-03 在路由表中添加。 */
export const LOGIN_PATH = '/login'

/** 改密码页路径。页面本身由 W-03 在路由表中添加。 */
export const CHANGE_PASSWORD_PATH = '/change-password'

/** 登录后默认进入的页面 */
export const HOME_PATH = '/'

/** 守卫判断所需的登录状态 */
export interface SessionState {
  isLoggedIn: boolean
  /** 为 true 时只能停留在改密码页（和登录页） */
  mustChangePassword: boolean
}

/**
 * 比较路径前先规范化。
 * Vue Router 默认不区分末尾斜杠和大小写，/login/、/Login 也会显示登录页，
 * 所以比较前先去掉末尾斜杠并转为小写，不能直接用 ===。
 */
function isSamePath(path: string, expected: string): boolean {
  return path.replace(/\/+$/, '').toLowerCase() === expected
}

/**
 * 判断一个路径是否是登录页。
 * 按路径而不是路由名判断：getRedirectPath 拿到的 redirect 只是字符串，没有对应的路由对象。
 */
export function isLoginPath(path: string): boolean {
  return isSamePath(path, LOGIN_PATH)
}

/** 判断一个路径是否是改密码页，规则同 isLoginPath */
export function isChangePasswordPath(path: string): boolean {
  return isSamePath(path, CHANGE_PASSWORD_PATH)
}

/**
 * 从路由的 query.redirect 中取出登录后要回到的路径。
 * 只接受站内路径（以单个 / 开头、不含反斜杠），防止被构造成跳到外部网站的链接。
 * 浏览器会把反斜杠当作 /，例如 /\evil.example.com 会被解析成协议相对地址。
 * 也不接受 . 和 .. 路径段（含编码形式 %2e）：它们会被解析掉，例如 /./login 实际是登录页，
 * 可以绕过下面的登录页判断，用层层嵌套的 redirect 让登录后连续跳转多次。
 */
export function getRedirectPath(redirect: unknown): string {
  if (typeof redirect !== 'string') return HOME_PATH
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return HOME_PATH
  if (redirect.includes('\\')) return HOME_PATH
  // 只检查路径部分，查询参数和锚点不影响
  const path = redirect.split(/[?#]/)[0] ?? ''
  if (hasDotSegment(path)) return HOME_PATH
  // 避免登录后又回到登录页
  if (isLoginPath(path)) return HOME_PATH
  return redirect
}

/** 路径中是否有 . 或 .. 路径段，%2e 视为 . */
function hasDotSegment(path: string): boolean {
  return path
    .toLowerCase()
    .replaceAll('%2e', '.')
    .split('/')
    .some((segment) => segment === '.' || segment === '..')
}

/**
 * 根据登录状态决定本次导航是否放行。
 * 返回 true 表示放行，否则返回要跳转到的位置。
 */
export function resolveNavigation(
  to: Pick<RouteLocationNormalized, 'path' | 'fullPath' | 'meta' | 'query'>,
  { isLoggedIn, mustChangePassword }: SessionState,
): true | RouteLocationRaw {
  // 已登录时再打开登录页，直接回到原本要去的页面（须改密码时，下一次导航再转到改密码页）
  if (isLoginPath(to.path)) {
    return isLoggedIn ? getRedirectPath(to.query.redirect) : true
  }

  if (to.meta.public) return true

  if (!isLoggedIn) {
    return { path: LOGIN_PATH, query: { redirect: to.fullPath } }
  }

  // 首次登录须先改密码：除改密码页外一律跳转过去
  if (mustChangePassword && !isChangePasswordPath(to.path)) {
    return CHANGE_PASSWORD_PATH
  }

  return true
}

/**
 * 给路由注册登录守卫。
 * getSession 由调用方提供（登录状态的 store），守卫本身不依赖 store，便于测试。
 * 刷新页面后要先请求 /me 才知道是否已登录，getSession 在确认之前不返回，守卫也就不会提前跳转。
 */
export function setupAuthGuard(
  router: Router,
  getSession: () => SessionState | Promise<SessionState>,
): void {
  router.beforeEach(async (to) => resolveNavigation(to, await getSession()))
}
