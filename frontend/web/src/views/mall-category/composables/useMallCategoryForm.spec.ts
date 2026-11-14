/**
 * useMallCategoryForm 的测试。用 vi.mock 模拟 api/mall-category.ts 的返回值，不发真实请求。
 * 覆盖打开时的初始值、提交成功后关闭并重新加载、NAME_DUPLICATED，
 * 以及 VALIDATION_FAILED 的 details 映射到字段。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage, type FormItemRule } from 'element-plus'
import type { MallCategory } from '@/api/mall-category'
import { createMallCategory } from '@/api/mall-category'
import { ApiError } from '@/api/http'
import { useMallCategoryForm } from './useMallCategoryForm'

vi.mock('@/api/mall-category', () => ({ createMallCategory: vi.fn() }))

const mockedCreate = vi.mocked(createMallCategory)

const fresh: MallCategory = {
  id: '1854239876543209540',
  nameZh: '生鲜',
  nameEn: 'Fresh',
  sort: 10,
  inUseCount: 3,
}
const gifts: MallCategory = {
  id: '1854239876543209545',
  nameZh: '节日礼品',
  nameEn: 'Festive Gifts',
  sort: 11,
  inUseCount: 0,
}

let success: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.resetAllMocks()
  success = vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }))
})

afterEach(() => vi.restoreAllMocks())

/** 创建表单，并记录 onSaved 被调用的次数。 */
function createForm() {
  const onSaved = vi.fn()
  return { onSaved, form: useMallCategoryForm({ onSaved }) }
}

/** 打开新增弹窗并填写名称（排序用默认值）。 */
function fillCreate(form: ReturnType<typeof useMallCategoryForm>) {
  form.openCreate([fresh])
  form.form.value.nameZh = ' 节日礼品 '
  form.form.value.nameEn = 'Festive Gifts'
}

/** 直接调用某个字段的校验规则，返回错误信息；通过时返回 null。 */
function runRule(form: ReturnType<typeof useMallCategoryForm>, field: string, value: unknown) {
  const [rule] = form.rules.value[field as 'nameZh'] as FormItemRule[]
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

describe('打开弹窗', () => {
  it('名称为空，排序为现有最大值加 1', () => {
    const { form } = createForm()
    form.openCreate([fresh, { ...fresh, id: '2', sort: 30 }])
    expect(form.visible.value).toBe(true)
    expect(form.form.value).toEqual({ nameZh: '', nameEn: '', sort: 31 })
  })

  it('没有类目时排序为 1', () => {
    const { form } = createForm()
    form.openCreate([])
    expect(form.form.value.sort).toBe(1)
  })

  it('重新打开时清除上一次的错误和输入', async () => {
    mockedCreate.mockRejectedValue(new ApiError('business', 409, 'NAME_DUPLICATED'))
    const { form } = createForm()
    fillCreate(form)
    await form.submit()
    expect(form.formError.value).not.toBeNull()
    form.close()
    form.openCreate([fresh])
    expect(form.formError.value).toBeNull()
    expect(form.form.value.nameZh).toBe('')
  })
})

describe('提交', () => {
  it('成功：提交去掉首尾空格的请求体，提示，关闭弹窗并重新加载', async () => {
    mockedCreate.mockResolvedValue(gifts)
    const { form, onSaved } = createForm()
    fillCreate(form)
    await expect(form.submit()).resolves.toBe(true)
    expect(mockedCreate).toHaveBeenCalledWith({
      nameZh: '节日礼品',
      nameEn: 'Festive Gifts',
      sort: 11,
    })
    expect(success).toHaveBeenCalledWith('已添加类目『节日礼品』')
    expect(form.visible.value).toBe(false)
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('NAME_DUPLICATED：显示 constants 中的文案，弹窗保持打开，不重新加载', async () => {
    mockedCreate.mockRejectedValue(new ApiError('business', 409, 'NAME_DUPLICATED'))
    const { form, onSaved } = createForm()
    fillCreate(form)
    await expect(form.submit()).resolves.toBe(false)
    expect(form.formError.value).toBe('名称已存在')
    expect(form.visible.value).toBe(true)
    expect(onSaved).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
  })

  it('VALIDATION_FAILED：details 映射到对应字段，字段改过后错误消失', async () => {
    mockedCreate.mockRejectedValue(
      new ApiError('business', 400, 'VALIDATION_FAILED', [
        { field: 'nameEn', message: '不能超过 40 个字符' },
        { field: 'sort', message: '必须是整数' },
      ]),
    )
    const { form, onSaved } = createForm()
    fillCreate(form)
    await expect(form.submit()).resolves.toBe(false)
    expect(form.serverErrorFields.value).toEqual(['nameEn', 'sort'])
    expect(runRule(form, 'nameEn', 'Festive Gifts')).toBe('不能超过 40 个字符')
    expect(runRule(form, 'nameEn', 'Gifts')).toBeNull()
    expect(runRule(form, 'sort', 11)).toBe('必须是整数')
    expect(runRule(form, 'sort', 12)).toBeNull()
    expect(runRule(form, 'nameZh', ' 节日礼品 ')).toBeNull()
    expect(form.formError.value).toBe('参数校验失败，请检查输入')
    expect(form.visible.value).toBe(true)
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('VALIDATION_FAILED：不属于表单的字段显示在表单顶部', async () => {
    mockedCreate.mockRejectedValue(
      new ApiError('business', 400, 'VALIDATION_FAILED', [
        { field: 'inUseCount', message: '不是可用的字段' },
      ]),
    )
    const { form } = createForm()
    fillCreate(form)
    await form.submit()
    expect(form.serverErrorFields.value).toEqual([])
    expect(form.formError.value).toBe('参数校验失败，请检查输入；inUseCount：不是可用的字段')
  })

  it('网络错误：显示通用文案', async () => {
    mockedCreate.mockRejectedValue(new ApiError('network'))
    const { form } = createForm()
    fillCreate(form)
    await form.submit()
    expect(form.formError.value).toBe('网络连接失败，请检查网络')
  })

  it('提交过程中不能重复提交，也不能关闭弹窗', async () => {
    let resolve!: (category: MallCategory) => void
    mockedCreate.mockReturnValue(new Promise((res) => (resolve = res)))
    const { form } = createForm()
    fillCreate(form)
    const first = form.submit()
    expect(form.submitting.value).toBe(true)
    await expect(form.submit()).resolves.toBe(false)
    form.close()
    expect(form.visible.value).toBe(true)
    resolve(gifts)
    await first
    expect(mockedCreate).toHaveBeenCalledTimes(1)
    expect(form.submitting.value).toBe(false)
  })

  it('再次提交时清除上一次的错误', async () => {
    mockedCreate
      .mockRejectedValueOnce(new ApiError('business', 409, 'NAME_DUPLICATED'))
      .mockResolvedValueOnce(gifts)
    const { form } = createForm()
    fillCreate(form)
    await form.submit()
    await form.submit()
    expect(form.formError.value).toBeNull()
  })
})
