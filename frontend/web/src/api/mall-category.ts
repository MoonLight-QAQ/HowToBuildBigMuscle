/**
 * 商城类目模块的接口函数与类型。
 *
 * 作用：
 * - 导出本模块用到的契约类型别名。类型一律取自 src/api/generated/，不手写与契约重复的类型。
 * - 导出调用接口的函数和返回数据的解析函数（写法见 src/api/city.ts）。
 *
 * 商城类目只能新增和删除，不能修改，所以没有修改接口。
 */
import type { components } from '@/api/generated/admin'

export type MallCategory = components['schemas']['MallCategory']
export type MallCategoryInput = components['schemas']['MallCategoryInput']
