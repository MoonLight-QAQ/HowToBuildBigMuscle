// 后台左侧导航。分组和顺序以原型 docs/prototype/admin 为准，路径见 frontend/web/AGENTS.md。
// TODO(W-12)：原型中「订单、退款、举报」带待处理数量角标，由概览任务 W-12 接入。

export interface MenuItem {
  path: string
  label: string
}

export interface MenuGroup {
  title: string
  items: MenuItem[]
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    title: '今天',
    items: [
      { path: '/', label: '概览' },
      { path: '/orders', label: '订单' },
      { path: '/refunds', label: '退款' },
      { path: '/reports', label: '举报' },
    ],
  },
  {
    title: '商城',
    items: [
      { path: '/products', label: '商品' },
      { path: '/mall-categories', label: '商城类目' },
      { path: '/delivery', label: '配送' },
      { path: '/cities', label: '城市' },
    ],
  },
  {
    title: '闲置',
    items: [
      { path: '/listings', label: '闲置浏览' },
      { path: '/flea-categories', label: '闲置类目' },
    ],
  },
]

/**
 * 根据当前路径找出应高亮的导航项。
 * 详情、新增、编辑等子页面高亮所属的列表，例如 /orders/123 高亮「订单」。
 * 找不到时返回空字符串。
 */
export function findActiveMenuPath(currentPath: string, groups: MenuGroup[] = MENU_GROUPS): string {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.path === '/') {
        if (currentPath === '/') return item.path
      } else if (currentPath === item.path || currentPath.startsWith(`${item.path}/`)) {
        return item.path
      }
    }
  }
  return ''
}
