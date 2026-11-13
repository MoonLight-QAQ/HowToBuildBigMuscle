/**
 * 城市模块的接口函数与类型。
 *
 * 作用：
 * - 导出本模块用到的契约类型别名。类型一律取自 src/api/generated/，不手写与契约重复的类型。
 * - 导出调用接口的函数（阶段 2 补充），只负责发请求和校验返回数据的结构，不写业务判断。
 *
 * 其他模块照着写时要改的地方：
 * - 把 City 换成本模块的 schema 名称，只导出本模块真正用到的类型。
 * - 共用的枚举（如 AustralianState、Fulfillment）也在这里导出别名，模块内其他文件只从这里引入，
 *   不直接引用 generated。
 */
import type { components } from '@/api/generated/admin'

export type City = components['schemas']['City']
export type CityCreateInput = components['schemas']['CityCreateInput']
export type CityUpdateInput = components['schemas']['CityUpdateInput']
export type AustralianState = components['schemas']['AustralianState']
export type Fulfillment = components['schemas']['Fulfillment']
