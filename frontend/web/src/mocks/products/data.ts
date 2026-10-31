import type { ProductListData } from '@/types/api'

// Synthetic preview records only. / 仅供演示的合成记录，不含真实用户或运营数据。
export const sampleProducts: ProductListData = {
  items: [
    {
      id: 'demo-product-001',
      name: '示例商品 · 清洁布',
      categoryId: 'demo-category-001',
      categoryName: '示例类目 · 日用',
      imageUrl: null,
      priceMinor: 3900,
      currency: null,
      bookStock: 12,
      lockedStock: 3,
      availableStock: 9,
      status: 'on_sale',
    },
    {
      id: 'demo-product-002',
      name: '示例商品 · 储物盒',
      categoryId: 'demo-category-001',
      categoryName: '示例类目 · 日用',
      imageUrl: null,
      priceMinor: 2500,
      currency: null,
      bookStock: 0,
      lockedStock: 0,
      availableStock: 0,
      status: 'out_of_stock',
    },
    {
      id: 'demo-product-003',
      name: '示例商品 · 收纳袋',
      categoryId: 'demo-category-002',
      categoryName: '示例类目 · 收纳',
      imageUrl: null,
      priceMinor: 1800,
      currency: null,
      bookStock: 4,
      lockedStock: 0,
      availableStock: 4,
      status: 'off_shelf',
    },
  ],
  total: 3,
}

export const emptyProducts: ProductListData = { items: [], total: 0 }
