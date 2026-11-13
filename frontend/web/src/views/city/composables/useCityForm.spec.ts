/**
 * useCityForm 的测试。用 vi.mock 模拟 api/city.ts 的返回值，不发真实请求。
 *
 * 其他模块照着写时：覆盖打开新增和编辑时的初始值、提交成功后重新加载、
 * 契约中列出的每个业务错误码的提示，以及 VALIDATION_FAILED 的 details 映射到字段。
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { ElMessage } from 'element-plus'
import type { City } from '@/api/city'
import { createCity, updateCity } from '@/api/city'
import { ApiError } from '@/api/http'
import type { FormItemRule } from 'element-plus'
import { useCityForm } from './useCityForm'

vi.mock('@/api/city', () => ({ createCity: vi.fn(), updateCity: vi.fn() }))

const mockedCreate = vi.mocked(createCity)
const mockedUpdate = vi.mocked(updateCity)

const sydney: City = {
  id: '1854239876543209472',
  nameZh: '悉尼',
  nameEn: 'Sydney',
  fulfillment: 'local',
  state: 'NSW',
  timezone: 'Australia/Sydney',
  sort: 1,
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
  return { onSaved, form: useCityForm({ onSaved }) }
}

/** 打开新增弹窗并填写完整。 */
function fillCreate(form: ReturnType<typeof useCityForm>) {
  form.openCreate([sydney])
  form.form.value.nameZh = '布里斯班'
  form.form.value.nameEn = 'Brisbane'
  form.selectState('QLD')
}

/** 直接调用某个字段的校验规则，返回错误信息；通过时返回 null。 */
function runRule(form: ReturnType<typeof useCityForm>, field: string, value: unknown) {
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
  it('新增：配送方式默认为快递，排序为最大值加 1', () => {
    const { form } = createForm()
    form.openCreate([sydney, { ...sydney, id: '2', sort: 7 }])
    expect(form.visible.value).toBe(true)
    expect(form.mode.value).toBe('create')
    expect(form.form.value).toMatchObject({ fulfillment: 'post', state: null, sort: 8 })
  })

  it('编辑：表单为城市的当前值', () => {
    const { form } = createForm()
    form.openEdit(sydney)
    expect(form.mode.value).toBe('edit')
    expect(form.form.value).toEqual({
      nameZh: '悉尼',
      nameEn: 'Sydney',
      fulfillment: 'local',
      state: 'NSW',
      timezone: 'Australia/Sydney',
      sort: 1,
    })
  })

  it('新增时校验州，编辑时不校验', () => {
    const { form } = createForm()
    form.openCreate([])
    expect(form.rules.value).toHaveProperty('state')
    form.openEdit(sydney)
    expect(form.rules.value).not.toHaveProperty('state')
  })

  it('重新打开时清除上一次的错误', async () => {
    mockedCreate.mockRejectedValue(new ApiError('business', 409, 'NAME_DUPLICATED'))
    const { form } = createForm()
    fillCreate(form)
    await form.submit()
    expect(form.formError.value).not.toBeNull()
    form.openEdit(sydney)
    expect(form.formError.value).toBeNull()
  })
})

describe('选择州', () => {
  it('新增时选择州后预填时区，换州时跟着换', () => {
    const { form } = createForm()
    form.openCreate([])
    form.selectState('VIC')
    expect(form.form.value).toMatchObject({ state: 'VIC', timezone: 'Australia/Melbourne' })
    form.selectState('WA')
    expect(form.form.value.timezone).toBe('Australia/Perth')
  })

  it('店员改过的时区，换州时不覆盖', () => {
    const { form } = createForm()
    form.openCreate([])
    form.selectState('NSW')
    form.form.value.timezone = 'Australia/Broken_Hill'
    form.selectState('SA')
    expect(form.form.value.timezone).toBe('Australia/Broken_Hill')
  })

  it('编辑时不能改州', () => {
    const { form } = createForm()
    form.openEdit(sydney)
    form.selectState('VIC')
    expect(form.form.value.state).toBe('NSW')
  })
})

describe('提交', () => {
  it('新增成功：提交新增请求体，关闭弹窗，提示并重新加载', async () => {
    mockedCreate.mockResolvedValue({ ...sydney, id: '9' })
    const { form, onSaved } = createForm()
    fillCreate(form)
    await expect(form.submit()).resolves.toBe(true)
    expect(mockedCreate).toHaveBeenCalledWith({
      nameZh: '布里斯班',
      nameEn: 'Brisbane',
      fulfillment: 'post',
      state: 'QLD',
      timezone: 'Australia/Brisbane',
      sort: 2,
    })
    expect(form.visible.value).toBe(false)
    expect(success).toHaveBeenCalledWith('城市已添加')
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('编辑成功：修改请求体不包含 state，并重新加载', async () => {
    mockedUpdate.mockResolvedValue(sydney)
    const { form, onSaved } = createForm()
    form.openEdit(sydney)
    form.form.value.fulfillment = 'post'
    await expect(form.submit()).resolves.toBe(true)
    const [id, input] = mockedUpdate.mock.calls[0]!
    expect(id).toBe(sydney.id)
    expect(input).not.toHaveProperty('state')
    expect(input.fulfillment).toBe('post')
    expect(success).toHaveBeenCalledWith('城市已保存')
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
  })

  it('VALIDATION_FAILED：details 映射到对应字段，字段改过后错误消失', async () => {
    mockedCreate.mockRejectedValue(
      new ApiError('business', 400, 'VALIDATION_FAILED', [
        { field: 'timezone', message: '必须是有效的 IANA 时区名' },
        { field: 'nameEn', message: '不能为空' },
      ]),
    )
    const { form } = createForm()
    fillCreate(form)
    form.form.value.timezone = 'Australia/Nowhere'
    await form.submit()
    expect(form.serverErrorFields.value).toEqual(['timezone', 'nameEn'])
    expect(runRule(form, 'timezone', 'Australia/Nowhere')).toBe('必须是有效的 IANA 时区名')
    expect(runRule(form, 'timezone', 'Australia/Brisbane')).toBeNull()
    expect(runRule(form, 'nameEn', 'Brisbane')).toBe('不能为空')
    expect(form.formError.value).toBe('参数校验失败，请检查输入')
  })

  it('VALIDATION_FAILED：不属于表单的字段显示在表单顶部', async () => {
    mockedUpdate.mockRejectedValue(
      new ApiError('business', 400, 'VALIDATION_FAILED', [
        { field: 'body', message: '请求体必须是对象' },
      ]),
    )
    const { form } = createForm()
    form.openEdit(sydney)
    await form.submit()
    expect(form.serverErrorFields.value).toEqual([])
    expect(form.formError.value).toBe('参数校验失败，请检查输入；body：请求体必须是对象')
  })

  it('NOT_FOUND：提示城市不存在，并重新加载列表', async () => {
    mockedUpdate.mockRejectedValue(new ApiError('business', 404, 'NOT_FOUND'))
    const { form, onSaved } = createForm()
    form.openEdit(sydney)
    await form.submit()
    expect(form.formError.value).toBe('数据不存在或已被删除')
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('网络错误：显示通用文案', async () => {
    mockedCreate.mockRejectedValue(new ApiError('network'))
    const { form } = createForm()
    fillCreate(form)
    await form.submit()
    expect(form.formError.value).toBe('网络连接失败，请检查网络')
  })

  it('提交过程中不能重复提交，也不能关闭弹窗', async () => {
    let resolve!: (city: City) => void
    mockedCreate.mockReturnValue(new Promise((res) => (resolve = res)))
    const { form } = createForm()
    fillCreate(form)
    const first = form.submit()
    expect(form.submitting.value).toBe(true)
    await expect(form.submit()).resolves.toBe(false)
    form.close()
    expect(form.visible.value).toBe(true)
    resolve(sydney)
    await first
    expect(mockedCreate).toHaveBeenCalledTimes(1)
    expect(form.submitting.value).toBe(false)
  })

  it('再次提交时清除上一次的错误', async () => {
    mockedCreate
      .mockRejectedValueOnce(new ApiError('business', 409, 'NAME_DUPLICATED'))
      .mockResolvedValueOnce(sydney)
    const { form } = createForm()
    fillCreate(form)
    await form.submit()
    await form.submit()
    expect(form.formError.value).toBeNull()
  })
})
