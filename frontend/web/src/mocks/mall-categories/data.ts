import type { MallCategoryListData } from '@/types/api'

// Synthetic preview records only. / 仅供演示的合成记录，不含真实用户或运营数据。
export const sampleMallCategories: MallCategoryListData = {
  items: [
    { id: 'demo-category-001', name: '示例类目 · 日用' },
    { id: 'demo-category-002', name: '示例类目 · 收纳' },
  ],
  total: 2,
}

export const emptyMallCategories: MallCategoryListData = { items: [], total: 0 }
