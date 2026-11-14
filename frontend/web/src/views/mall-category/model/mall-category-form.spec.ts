/**
 * mall-category-form.ts 的单元测试。每个导出的函数都有测试，重点是：
 * - 只有空格的名称视为未填；排序为负数、小数时不通过
 * - inUseCount 为 0、1、多个时的删除判断和文案
 * - 删除失败时各错误码的文案，以及是否重新加载
 */
import { describe, expect, it } from 'vitest'
import type { FormItemRule } from 'element-plus'
import { ApiError } from '@/api/http'
import { CLIENT_ERROR_MESSAGES, ERROR_CODE } from '@/constants/error-code'
import {
  canDelete,
  checkMallCategoryName,
  checkMallCategorySort,
  createDefaultMallCategoryForm,
  createMallCategoryFormRules,
  deleteBlockedReason,
  deleteConfirmMessage,
  deleteErrorMessage,
  formToCreateInput,
  MALL_CATEGORY_NAME_EN_MAX_LENGTH,
  MALL_CATEGORY_NAME_ZH_MAX_LENGTH,
  mallCategoryCreatedMessage,
  nextMallCategorySort,
  shouldReloadAfterDeleteError,
  type MallCategoryForm,
} from './mall-category-form'

/** 一份填写完整的新增表单。 */
function filledForm(overrides: Partial<MallCategoryForm> = {}): MallCategoryForm {
  return { nameZh: '生鲜', nameEn: 'Fresh', sort: 10, ...overrides }
}

describe('名称长度上限', () => {
  it('与契约一致：中文 20、英文 40', () => {
    expect(MALL_CATEGORY_NAME_ZH_MAX_LENGTH).toBe(20)
    expect(MALL_CATEGORY_NAME_EN_MAX_LENGTH).toBe(40)
  })
})

describe('nextMallCategorySort', () => {
  it('没有类目时为 1', () => {
    expect(nextMallCategorySort([])).toBe(1)
  })

  it('取现有最大的 sort 加 1，与列表顺序无关', () => {
    expect(nextMallCategorySort([{ sort: 30 }, { sort: 50 }, { sort: 10 }])).toBe(51)
  })

  it('sort 为负数时同样取最大值加 1', () => {
    expect(nextMallCategorySort([{ sort: -5 }, { sort: -2 }])).toBe(-1)
  })
})

describe('createDefaultMallCategoryForm', () => {
  it('名称为空串，排序默认为现有最大值加 1', () => {
    expect(createDefaultMallCategoryForm([{ sort: 10 }, { sort: 20 }])).toEqual({
      nameZh: '',
      nameEn: '',
      sort: 21,
    })
  })

  it('没有类目时排序为 1', () => {
    expect(createDefaultMallCategoryForm([]).sort).toBe(1)
  })

  it('每次返回新对象，修改一份不影响下一份', () => {
    const first = createDefaultMallCategoryForm([])
    first.nameZh = '改过'
    expect(createDefaultMallCategoryForm([]).nameZh).toBe('')
  })
})

describe('formToCreateInput', () => {
  it('只包含契约 MallCategoryInput 的字段', () => {
    expect(formToCreateInput(filledForm())).toEqual({ nameZh: '生鲜', nameEn: 'Fresh', sort: 10 })
  })

  it('名称去掉首尾空格', () => {
    const input = formToCreateInput(filledForm({ nameZh: '  生鲜 ', nameEn: ' Fresh  ' }))
    expect(input.nameZh).toBe('生鲜')
    expect(input.nameEn).toBe('Fresh')
  })

  it('排序为 0 时照常传', () => {
    expect(formToCreateInput(filledForm({ sort: 0 })).sort).toBe(0)
  })

  it('没有填排序时抛错', () => {
    expect(() => formToCreateInput(filledForm({ sort: null }))).toThrow(TypeError)
  })

  it('排序不是整数时抛错', () => {
    expect(() => formToCreateInput(filledForm({ sort: 1.5 }))).toThrow(TypeError)
  })
})

describe('checkMallCategoryName', () => {
  it.each([
    ['', '请填写中文名'],
    ['   ', '请填写中文名'],
    ['\t\n', '请填写中文名'],
    [undefined, '请填写中文名'],
    [null, '请填写中文名'],
    ['生鲜', null],
    ['一'.repeat(20), null],
    ['一'.repeat(21), '中文名不能超过 20 个字符'],
    [` ${'一'.repeat(20)} `, null],
  ])('中文名 %j → %j', (value, expected) => {
    expect(checkMallCategoryName(value, '中文名', 20)).toBe(expected)
  })

  it.each([
    ['a'.repeat(40), null],
    ['a'.repeat(41), '英文名不能超过 40 个字符'],
  ])('英文名 %j → %j', (value, expected) => {
    expect(checkMallCategoryName(value, '英文名', 40)).toBe(expected)
  })

  it('按字符计算长度，一个 emoji 算一个字符', () => {
    expect(checkMallCategoryName('😀'.repeat(20), '中文名', 20)).toBeNull()
  })
})

describe('checkMallCategorySort', () => {
  it.each([
    [0, null],
    [1, null],
    [999, null],
    [null, '请填写排序'],
    [undefined, '请填写排序'],
    ['', '请填写排序'],
    [-1, '排序不能小于 0'],
    [1.5, '排序必须是整数'],
    [-0.5, '排序必须是整数'],
    ['1', '排序必须是整数'],
    [Number.NaN, '排序必须是整数'],
    [Number.POSITIVE_INFINITY, '排序必须是整数'],
  ])('%j → %j', (value, expected) => {
    expect(checkMallCategorySort(value)).toBe(expected)
  })
})

describe('createMallCategoryFormRules', () => {
  /** 直接调用规则的 validator，返回错误信息；通过时返回 null。 */
  function runRule(rules: unknown, value: unknown): string | null {
    const [rule] = rules as FormItemRule[]
    let result: string | null = null
    rule!.validator!(
      {} as never,
      value,
      (error?: string | Error) => {
        result = error instanceof Error ? error.message : (error ?? null)
      },
      {},
      {},
    )
    return result
  }

  it('只有中文名、英文名、排序三个字段', () => {
    expect(Object.keys(createMallCategoryFormRules()).sort()).toEqual(['nameEn', 'nameZh', 'sort'])
  })

  it('名称必填，长度上限与契约一致', () => {
    const rules = createMallCategoryFormRules()
    expect(runRule(rules.nameZh, '  ')).toBe('请填写中文名')
    expect(runRule(rules.nameZh, '一'.repeat(21))).toBe('中文名不能超过 20 个字符')
    expect(runRule(rules.nameEn, '')).toBe('请填写英文名')
    expect(runRule(rules.nameEn, 'a'.repeat(41))).toBe('英文名不能超过 40 个字符')
  })

  it('排序必填，须为不小于 0 的整数', () => {
    const rules = createMallCategoryFormRules()
    expect(runRule(rules.sort, null)).toBe('请填写排序')
    expect(runRule(rules.sort, -1)).toBe('排序不能小于 0')
    expect(runRule(rules.sort, 0)).toBeNull()
  })

  it('本地检查通过后，显示服务器返回的字段错误', () => {
    const rules = createMallCategoryFormRules((field, value) =>
      field === 'nameEn' && value === 'Fresh' ? '服务器：英文名无效' : null,
    )
    expect(runRule(rules.nameEn, 'Fresh')).toBe('服务器：英文名无效')
    expect(runRule(rules.nameEn, 'Snacks')).toBeNull()
  })

  it('本地检查不通过时，优先显示本地的提示', () => {
    const rules = createMallCategoryFormRules(() => '服务器错误')
    expect(runRule(rules.nameZh, '')).toBe('请填写中文名')
  })
})

describe('canDelete 与 deleteBlockedReason', () => {
  it('inUseCount 为 0 时可以删除，没有原因', () => {
    expect(canDelete({ inUseCount: 0 })).toBe(true)
    expect(deleteBlockedReason({ inUseCount: 0 })).toBeNull()
  })

  it('inUseCount 为 1 时不能删除', () => {
    expect(canDelete({ inUseCount: 1 })).toBe(false)
    expect(deleteBlockedReason({ inUseCount: 1 })).toBe('该类目下还有 1 件已上架的商品，不能删除')
  })

  it('inUseCount 为多个时不能删除，原因带上件数', () => {
    expect(canDelete({ inUseCount: 12 })).toBe(false)
    expect(deleteBlockedReason({ inUseCount: 12 })).toBe('该类目下还有 12 件已上架的商品，不能删除')
  })
})

describe('deleteConfirmMessage', () => {
  it('文案带类目中文名', () => {
    expect(deleteConfirmMessage({ nameZh: '日用品' })).toBe(
      '确定删除类目『日用品』吗？删除后不能恢复。',
    )
  })
})

describe('mallCategoryCreatedMessage', () => {
  it('文案带类目中文名', () => {
    expect(mallCategoryCreatedMessage({ nameZh: '节日礼品' })).toBe('已添加类目『节日礼品』')
  })
})

describe('deleteErrorMessage 与 shouldReloadAfterDeleteError', () => {
  const inUse = new ApiError('business', 409, ERROR_CODE.CATEGORY_IN_USE.code)
  const notFound = new ApiError('business', 404, ERROR_CODE.NOT_FOUND.code)
  const forbidden = new ApiError('business', 403, ERROR_CODE.FORBIDDEN.code)
  const network = new ApiError('network')

  it('CATEGORY_IN_USE：本模块的文案，需要重新加载', () => {
    expect(deleteErrorMessage(inUse)).toBe('该类目下已有上架商品，不能删除')
    expect(shouldReloadAfterDeleteError(inUse)).toBe(true)
  })

  it('NOT_FOUND：本模块的文案，需要重新加载', () => {
    expect(deleteErrorMessage(notFound)).toBe('该类目已被删除')
    expect(shouldReloadAfterDeleteError(notFound)).toBe(true)
  })

  it('其他业务错误：使用通用文案，不重新加载', () => {
    expect(deleteErrorMessage(forbidden)).toBe(forbidden.message)
    expect(shouldReloadAfterDeleteError(forbidden)).toBe(false)
  })

  it('网络错误：使用通用文案，不重新加载', () => {
    expect(deleteErrorMessage(network)).toBe(network.message)
    expect(shouldReloadAfterDeleteError(network)).toBe(false)
  })

  it('不是 ApiError：使用通用提示，不重新加载', () => {
    expect(deleteErrorMessage(new Error('boom'))).toBe(CLIENT_ERROR_MESSAGES.http)
    expect(shouldReloadAfterDeleteError(new Error('boom'))).toBe(false)
  })
})
