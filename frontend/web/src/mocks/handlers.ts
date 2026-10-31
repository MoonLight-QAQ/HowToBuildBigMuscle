import { productHandlers } from '@/mocks/products/handlers'
import { mallCategoryHandlers } from '@/mocks/mall-categories/handlers'
import { deliveryHandlers } from '@/mocks/delivery/handlers'
import { cityHandlers } from '@/mocks/cities/handlers'

export const handlers = [
  ...productHandlers,
  ...mallCategoryHandlers,
  ...deliveryHandlers,
  ...cityHandlers,
]
