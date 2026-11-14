import type { components } from '@/api/generated/admin'

type Admin = components['schemas']['Admin']

/** 模拟的管理员账号：契约中的 Admin 字段，加上只存在于模拟服务端的密码 */
export interface MockAdminAccount {
  admin: Admin
  password: string
}

/**
 * 模拟账号。只用于本地开发，与真实环境无关。
 * - staff：普通账号，登录后直接进入后台
 * - newbie：首次登录的账号，登录后必须先改密码
 */
export const MOCK_ADMIN_ACCOUNTS: readonly MockAdminAccount[] = [
  {
    admin: { id: '9000000000000000001', account: 'staff', mustChangePassword: false },
    password: 'pickaus-staff-2026',
  },
  {
    admin: { id: '9000000000000000002', account: 'newbie', mustChangePassword: true },
    password: 'pickaus-init-0001',
  },
]

/** 新密码的最小长度（PRD 第 3 节） */
export const MIN_PASSWORD_LENGTH = 12

/** 模拟的常见密码表，新密码不区分大小写命中时返回 WEAK_PASSWORD */
export const COMMON_PASSWORDS: readonly string[] = [
  '123456789012',
  'password1234',
  'qwertyuiop12',
  '111111111111',
  'abcdefghijkl',
]

/**
 * 登录失败锁定：同一账号 15 分钟内失败 5 次就锁定 15 分钟（真实环境写在服务端配置里）。
 * 模拟的简化：PRD 和契约规定按「同一账号加同一 IP」计数，模拟接口拿不到 IP，只按账号计数。
 * 后端实现时以 PRD 和契约为准，不要照搬这里的规则。锁定时长 15 分钟也是模拟自定的，契约没有规定。
 */
export const LOGIN_LOCK = {
  maxFailures: 5,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
} as const

/** 通行证有效期，模拟 30 天 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * 模拟服务端状态在 sessionStorage 中的键名。
 * 刷新页面时 MSW 会重新启动，存在这里才能模拟「cookie 仍在、刷新后仍是登录状态」。
 * 除了会话，也存了账号和明文密码，是为了让改过的密码在刷新后仍然有效（否则会变回初始密码）。
 * 存的只有上面的模拟账号；模拟接口只在开发环境开启 VITE_USE_MOCK 时加载，正式环境不会写入。
 * 这只是模拟服务端的数据，前端业务代码不读取它。
 */
export const MOCK_AUTH_STORAGE_KEY = 'pickaus:mock:auth'
