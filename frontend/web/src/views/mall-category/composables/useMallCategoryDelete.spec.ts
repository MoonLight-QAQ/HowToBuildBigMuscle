/**
 * useMallCategoryDelete 的测试。用 vi.mock 模拟 api/mall-category.ts 的返回值，不发真实请求。
 * 覆盖成功、CATEGORY_IN_USE、NOT_FOUND 三种情况都重新加载，其他错误不重新加载，以及 deletingId 的变化。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage } from 'element-plus'
import type { MallCategory } from '@/api/mall-category'
import { deleteMallCategory } from '@/api/mall-category'
import { ApiError } from '@/api/http'
import { useMallCategoryDelete } from './useMallCategoryDelete'

vi.mock('@/api/mall-category', () => ({ deleteMallCategory: vi.fn() }))

const mockedDelete = vi.mocked(deleteMallCategory)

const household: MallCategory = {
  id: '1854239876543209543',
  nameZh: '日用品',
  nameEn: 'Household',
  sort: 40,
  inUseCount: 0,
}
const frozen: MallCategory = {
  id: '1854239876543209544',
  nameZh: '冷冻食品',
  nameEn: 'Frozen',
  sort: 50,
  inUseCount: 0,
}

let success: ReturnType<typeof vi.spyOn>
let failure: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.resetAllMocks()
  success = vi.spyOn(ElMessage, 'success').mockImplementation(() => ({ close: () => {} }))
  failure = vi.spyOn(ElMessage, 'error').mockImplementation(() => ({ close: () => {} }))
})

afterEach(() => vi.restoreAllMocks())

/** 创建删除状态，并记录 onChanged 被调用的次数。 */
function createDelete() {
  const onChanged = vi.fn()
  return { onChanged, del: useMallCategoryDelete({ onChanged }) }
}

describe('删除', () => {
  it('成功：按 id 调用删除接口，提示「已删除」并重新加载', async () => {
    mockedDelete.mockResolvedValue(undefined)
    const { del, onChanged } = createDelete()
    await expect(del.remove(household)).resolves.toBe(true)
    expect(mockedDelete).toHaveBeenCalledWith(household.id)
    expect(success).toHaveBeenCalledWith('已删除')
    expect(failure).not.toHaveBeenCalled()
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('CATEGORY_IN_USE：提示「该类目下已有上架商品，不能删除」并重新加载', async () => {
    mockedDelete.mockRejectedValue(new ApiError('business', 409, 'CATEGORY_IN_USE'))
    const { del, onChanged } = createDelete()
    await expect(del.remove(household)).resolves.toBe(false)
    expect(failure).toHaveBeenCalledWith('该类目下已有上架商品，不能删除')
    expect(success).not.toHaveBeenCalled()
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('NOT_FOUND：提示「该类目已被删除」并重新加载', async () => {
    mockedDelete.mockRejectedValue(new ApiError('business', 404, 'NOT_FOUND'))
    const { del, onChanged } = createDelete()
    await expect(del.remove(household)).resolves.toBe(false)
    expect(failure).toHaveBeenCalledWith('该类目已被删除')
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('网络错误：提示通用文案，不重新加载', async () => {
    mockedDelete.mockRejectedValue(new ApiError('network'))
    const { del, onChanged } = createDelete()
    await expect(del.remove(household)).resolves.toBe(false)
    expect(failure).toHaveBeenCalledWith('网络连接失败，请检查网络')
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('其他业务错误（FORBIDDEN）：提示 constants 中的文案，不重新加载', async () => {
    mockedDelete.mockRejectedValue(new ApiError('business', 403, 'FORBIDDEN'))
    const { del, onChanged } = createDelete()
    await del.remove(household)
    expect(failure).toHaveBeenCalledWith('没有权限执行此操作')
    expect(onChanged).not.toHaveBeenCalled()
  })
})

describe('deletingId', () => {
  it('开始时为 null', () => {
    expect(createDelete().del.deletingId.value).toBeNull()
  })

  it('删除过程中为该类目的 id，重新加载完成后恢复为 null', async () => {
    let resolveDelete!: () => void
    mockedDelete.mockReturnValue(new Promise<void>((res) => (resolveDelete = res)))
    let resolveReload!: () => void
    const onChanged = vi.fn(() => new Promise<void>((res) => (resolveReload = res)))
    const del = useMallCategoryDelete({ onChanged })

    const removing = del.remove(household)
    expect(del.deletingId.value).toBe(household.id)
    resolveDelete()
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled())
    // 重新加载期间按钮仍显示加载中，避免旧数据上的按钮被再次点击。
    expect(del.deletingId.value).toBe(household.id)
    resolveReload()
    await removing
    expect(del.deletingId.value).toBeNull()
  })

  it('失败后恢复为 null', async () => {
    mockedDelete.mockRejectedValue(new ApiError('business', 409, 'CATEGORY_IN_USE'))
    const { del } = createDelete()
    await del.remove(household)
    expect(del.deletingId.value).toBeNull()
  })

  it('删除过程中再删除另一个类目，直接返回 false，不发请求', async () => {
    let resolveDelete!: () => void
    mockedDelete.mockReturnValue(new Promise<void>((res) => (resolveDelete = res)))
    const { del } = createDelete()
    const first = del.remove(household)
    await expect(del.remove(frozen)).resolves.toBe(false)
    expect(del.deletingId.value).toBe(household.id)
    resolveDelete()
    await first
    expect(mockedDelete).toHaveBeenCalledTimes(1)
  })
})
