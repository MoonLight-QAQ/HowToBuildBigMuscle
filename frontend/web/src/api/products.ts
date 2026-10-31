import { getData } from '@/api/http'
import { formatMinorAmount } from '@/api/presentation'
import { productListSchema } from '@/api/schemas'
import type { Product, RequestOptions } from '@/types/api'

const STATUS_LABEL: Record<Product['status'], string> = {
  on_sale: '在售',
  out_of_stock: '缺货',
  off_shelf: '已下架',
}

/**
 * toProductPreview adds display text and preserves server-provided stock values.
 * 中文：补充展示文字并原样保留服务端可售库存，浏览器不做库存减法。
 * @param product Validated generated-contract product / 经校验的生成契约商品。
 * @returns Display-ready product / 可直接展示的商品；无副作用。
 */
export function toProductPreview(product: Product) {
  return {
    ...product,
    priceText: formatMinorAmount(product.priceMinor, product.currency),
    statusLabel: STATUS_LABEL[product.status],
  }
}

export type ProductPreview = ReturnType<typeof toProductPreview>

/**
 * listProducts loads a validated read-only product preview.
 * 中文：读取已校验的只读商品列表，字段来自生成契约，展示字段由数据层补充。
 * @param options Cancellation and mock scenario / 取消与Mock场景。
 * @returns Product list with display-ready items / 可直接展示的商品列表。
 * Performs one GET and throws normalized ApiError on failure / 执行一次GET，失败抛统一错误。
 */
export async function listProducts(options?: RequestOptions) {
  const data = await getData('/api/admin/products', productListSchema, options)
  return { ...data, items: data.items.map(toProductPreview) }
}

export type ProductListPreview = Awaited<ReturnType<typeof listProducts>>
