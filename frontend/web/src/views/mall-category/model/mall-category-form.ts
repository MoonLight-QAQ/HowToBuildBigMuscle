/**
 * 商城类目的数据模型：表单默认值、表单转请求体、校验规则、删除相关的判断和文案。
 *
 * 这里只放纯函数和常量：不依赖 Vue，不调用接口，不读写页面状态，所以可以直接写单元测试。
 * 页面上的业务规则（默认排序、有在售商品时不能删除、删除失败的提示等）都集中在这里，
 * composables 和组件只调用这些函数，不自己判断。
 *
 * 与城市模块的区别：
 * - 类目只能新增和删除，不能修改（见契约 MallCategory），所以没有编辑表单和修改请求体。
 * - 删除失败时 CATEGORY_IN_USE、NOT_FOUND 使用本模块的文案（deleteErrorMessage），
 *   不使用 src/constants/error-code.ts 中的通用文案。
 */
import type { FormItemRule, FormRules } from 'element-plus'
import type { MallCategory, MallCategoryInput } from '@/api/mall-category'
import { isErrorCode } from '@/api/http'
import { ERROR_CODE } from '@/constants/error-code'
import { toErrorMessage } from './error-message'

/** 商城类目表单。sort 清空后为 null。 */
export interface MallCategoryForm {
  nameZh: string
  nameEn: string
  sort: number | null
}

/** 中文名、英文名的最大长度，与契约 MallCategory.nameZh、MallCategory.nameEn 的 maxLength 一致。 */
export const MALL_CATEGORY_NAME_ZH_MAX_LENGTH = 20
export const MALL_CATEGORY_NAME_EN_MAX_LENGTH = 40

/**
 * 新增类目时的默认排序：现有类目中最大的 sort 加 1，没有类目时为 1。
 * 参数：现有类目列表。返回：整数。
 */
export function nextMallCategorySort(categories: readonly Pick<MallCategory, 'sort'>[]): number {
  if (categories.length === 0) return 1
  return Math.max(...categories.map((category) => category.sort)) + 1
}

/**
 * 新增表单的默认值。
 * 参数：现有类目列表，用来计算默认排序。返回：新的表单对象。
 */
export function createDefaultMallCategoryForm(
  categories: readonly Pick<MallCategory, 'sort'>[],
): MallCategoryForm {
  return { nameZh: '', nameEn: '', sort: nextMallCategorySort(categories) }
}

/**
 * 表单转为新增请求体。名称去掉首尾空格。契约要求 sort 必填，所以总是包含 sort。
 * 参数：已通过校验的表单。返回：MallCategoryInput。
 * 排序没有填写或不是整数时抛出 TypeError：说明调用方没有先校验表单。
 */
export function formToCreateInput(form: MallCategoryForm): MallCategoryInput {
  if (form.sort === null || !Number.isSafeInteger(form.sort)) {
    throw new TypeError('mall-category-form-sort-missing')
  }
  return { nameZh: form.nameZh.trim(), nameEn: form.nameEn.trim(), sort: form.sort }
}

/**
 * 检查名称。去掉首尾空格后不能为空，长度不能超过上限（按字符计算，与契约 maxLength 一致）。
 * 参数：输入值、字段中文名、最大长度。返回：错误提示；没有错误时为 null。
 */
export function checkMallCategoryName(
  value: unknown,
  label: string,
  maxLength: number,
): string | null {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') return `请填写${label}`
  if ([...text].length > maxLength) return `${label}不能超过 ${maxLength} 个字符`
  return null
}

/**
 * 检查排序。必填，必须是不小于 0 的整数。
 * 契约只要求整数；不小于 0 是前端的要求，服务器不校验下限。
 * 参数：输入值。返回：错误提示；没有错误时为 null。
 */
export function checkMallCategorySort(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return '请填写排序'
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return '排序必须是整数'
  return value < 0 ? '排序不能小于 0' : null
}

/** 表单中可能出现校验错误的字段。 */
export type MallCategoryFormField = keyof MallCategoryForm

/**
 * 查询服务器返回的字段错误（VALIDATION_FAILED 的 details）。
 * 参数：字段名、字段当前的值。返回：错误提示；没有错误，或店员已经改过这个字段时为 null。
 */
export type ServerFieldErrorLookup = (field: MallCategoryFormField, value: unknown) => string | null

/**
 * 把 checkXxx 函数包装成 Element Plus 的校验规则。
 * 先做本地检查；本地检查通过后，再看服务器是否对这个字段返回过错误，
 * 这样服务器的字段错误也显示在对应输入框下面，店员修改后自动消失。
 * 参数：字段名、检查函数、服务器字段错误的查询函数。返回：一条规则，在输入和失去焦点时触发。
 */
function ruleOf(
  field: MallCategoryFormField,
  check: (value: unknown) => string | null,
  serverError: ServerFieldErrorLookup,
): FormItemRule {
  return {
    trigger: ['blur', 'change'],
    validator(_rule, value, callback) {
      const message = check(value) ?? serverError(field, value)
      callback(message === null ? undefined : new Error(message))
    },
  }
}

/**
 * 商城类目表单的校验规则。
 * 参数：可选的服务器字段错误查询函数。返回：交给 ElForm 的 rules。
 */
export function createMallCategoryFormRules(
  serverError: ServerFieldErrorLookup = () => null,
): FormRules<MallCategoryForm> {
  return {
    nameZh: [
      ruleOf(
        'nameZh',
        (value) => checkMallCategoryName(value, '中文名', MALL_CATEGORY_NAME_ZH_MAX_LENGTH),
        serverError,
      ),
    ],
    nameEn: [
      ruleOf(
        'nameEn',
        (value) => checkMallCategoryName(value, '英文名', MALL_CATEGORY_NAME_EN_MAX_LENGTH),
        serverError,
      ),
    ],
    sort: [ruleOf('sort', checkMallCategorySort, serverError)],
  }
}

/**
 * 是否可以删除：类目下没有已上架的商品（inUseCount 为 0）。
 * 只用来决定按钮是否置灰；服务器删除时会重新统计，见契约 deleteMallCategory。
 * 参数：类目。返回：布尔值。
 */
export function canDelete(category: Pick<MallCategory, 'inUseCount'>): boolean {
  return category.inUseCount === 0
}

/**
 * 删除按钮置灰时，鼠标悬停显示的原因。
 * 参数：类目。返回：原因；可以删除时为 null。
 */
export function deleteBlockedReason(category: Pick<MallCategory, 'inUseCount'>): string | null {
  return canDelete(category) ? null : `该类目下还有 ${category.inUseCount} 件已上架的商品，不能删除`
}

/**
 * 删除前二次确认的文案。
 * 参数：类目。返回：确认文案。
 */
export function deleteConfirmMessage(category: Pick<MallCategory, 'nameZh'>): string {
  return `确定删除类目『${category.nameZh}』吗？删除后不能恢复。`
}

/**
 * 新增类目成功后的提示。
 * 参数：新增的类目。返回：提示文案。
 */
export function mallCategoryCreatedMessage(category: Pick<MallCategory, 'nameZh'>): string {
  return `已添加类目『${category.nameZh}』`
}

/**
 * 删除失败时的提示。
 * CATEGORY_IN_USE、NOT_FOUND 使用本模块的文案；其他错误使用通用文案（toErrorMessage）。
 * 参数：捕获到的错误。返回：中文文案。
 */
export function deleteErrorMessage(error: unknown): string {
  if (isErrorCode(error, ERROR_CODE.CATEGORY_IN_USE)) return '该类目下已有上架商品，不能删除'
  if (isErrorCode(error, ERROR_CODE.NOT_FOUND)) return '该类目已被删除'
  return toErrorMessage(error)
}

/**
 * 删除失败后是否需要重新加载列表。
 * CATEGORY_IN_USE、NOT_FOUND 说明页面上的数据已经过时，需要重新加载；其他错误（网络、服务器错误等）不重新加载。
 * 参数：捕获到的错误。返回：布尔值。
 */
export function shouldReloadAfterDeleteError(error: unknown): boolean {
  return isErrorCode(error, ERROR_CODE.CATEGORY_IN_USE) || isErrorCode(error, ERROR_CODE.NOT_FOUND)
}
