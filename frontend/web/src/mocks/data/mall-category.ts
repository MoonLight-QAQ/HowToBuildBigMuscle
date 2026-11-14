/**
 * 商城类目的模拟数据：模拟接口启动时数据库中已有的类目。
 *
 * 数据使用生成的类型声明，契约改动后，类型检查会指出这里需要同步修改的地方。
 * 这里的数据只读，模拟接口启动时复制一份再修改（见 src/mocks/handlers/mall-category.ts）。
 *
 * 覆盖页面上的两种状态：有已上架商品、不能删除的类目（inUseCount 大于 0），
 * 和可以删除的类目（inUseCount 为 0）。
 */
import type { MallCategory } from '@/api/mall-category'

/** 五个类目：前三个有已上架的商品，不能删除；后两个可以删除。 */
export const mallCategoryRecords: readonly MallCategory[] = [
  { id: '1854239876543209540', nameZh: '生鲜', nameEn: 'Fresh', sort: 10, inUseCount: 3 },
  { id: '1854239876543209541', nameZh: '零食', nameEn: 'Snacks', sort: 20, inUseCount: 5 },
  { id: '1854239876543209542', nameZh: '饮料', nameEn: 'Drinks', sort: 30, inUseCount: 1 },
  { id: '1854239876543209543', nameZh: '日用品', nameEn: 'Household', sort: 40, inUseCount: 0 },
  { id: '1854239876543209544', nameZh: '冷冻食品', nameEn: 'Frozen', sort: 50, inUseCount: 0 },
]
