import { describe, expect, it } from 'vitest'
import { findActiveMenuPath, MENU_GROUPS } from './menu'

describe('findActiveMenuPath', () => {
  it.each([
    ['/', '/'],
    ['/orders', '/orders'],
    ['/orders/9000000000000000010', '/orders'],
    ['/refunds/1', '/refunds'],
    ['/products/new', '/products'],
    ['/products/1/edit', '/products'],
    ['/listings/1', '/listings'],
    ['/mall-categories', '/mall-categories'],
  ])('%s 高亮 %s', (current, expected) => {
    expect(findActiveMenuPath(current)).toBe(expected)
  })

  it('前缀相同但不是子路径时不高亮', () => {
    expect(findActiveMenuPath('/orders-archive')).toBe('')
  })

  it('不在导航中的路径返回空字符串', () => {
    expect(findActiveMenuPath('/login')).toBe('')
  })
})

describe('MENU_GROUPS', () => {
  it('导航路径不重复', () => {
    const paths = MENU_GROUPS.flatMap((group) => group.items.map((item) => item.path))
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('「账号」分组下有修改密码入口（原型：账号 › 修改密码）', () => {
    const account = MENU_GROUPS.find((group) => group.title === '账号')
    expect(account?.items).toEqual([{ path: '/change-password', label: '修改密码' }])
  })
})
