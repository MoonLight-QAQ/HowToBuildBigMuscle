import { effectScope, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useDraft } from './useDraft'

/** draftSuite covers persistence and isolation / 中文：验证草稿持久化和隔离；无参数、无返回，注册测试。 */
function draftSuite(): void {
  /** preservesAcrossNavigation edits and remounts one module / 中文：编辑后模拟重入模块；无参数、无返回，写测试存储。 */
  async function preservesAcrossNavigation(): Promise<void> {
    const firstScope = effectScope()
    const first = firstScope.run(createProductsDraft)!
    first.draft.note = '等待接口字段确认'
    await nextTick()
    firstScope.stop()
    expect(sessionStorage.getItem('shiao:admin:rn-setup-01:test-products')).toBe('等待接口字段确认')
    const secondScope = effectScope()
    const second = secondScope.run(createProductsDraft)!
    expect(second.draft.note).toBe('等待接口字段确认')
    second.resetDraft()
    expect(sessionStorage.getItem('shiao:admin:rn-setup-01:test-products')).toBeNull()
    secondScope.stop()
  }
  /** createProductsDraft supplies a named scope initializer / 中文：初始化商品测试草稿；无参数，返回草稿状态。 */
  function createProductsDraft() {
    return useDraft('test-products')
  }
  /** restoresSavedSession reads storage like a fresh module load / 中文：从既有会话文本恢复；无参数、无返回，写测试存储。 */
  function restoresSavedSession(): void {
    sessionStorage.setItem('shiao:admin:rn-setup-01:test-city', '刷新前备注')
    const scope = effectScope()
    const restored = scope.run(createCityDraft)!
    expect(restored.draft.note).toBe('刷新前备注')
    expect(restored.storageAvailable.value).toBe(true)
    restored.resetDraft()
    scope.stop()
  }
  /** createCityDraft initializes an independent city note / 中文：初始化独立城市草稿；无参数，返回状态。 */
  function createCityDraft() {
    return useDraft('test-city')
  }
  /** failsStorage simulates browser storage denial / 中文：模拟浏览器拒绝存储；无参数、无返回，抛出安全异常。 */
  function failsStorage(): never {
    throw new DOMException('Storage denied', 'SecurityError')
  }
  /** createDeniedDraft initializes a blocked-storage note / 中文：创建存储被禁用的草稿；无参数，返回状态。 */
  function createDeniedDraft() {
    return useDraft('test-denied')
  }
  /** keepsMemoryFallback covers denied reads, writes and removal / 中文：验证存储读写清理均被拒绝时的内存降级；无参数、无返回，修改测试替身。 */
  function keepsMemoryFallback(): void {
    vi.spyOn(sessionStorage, 'getItem').mockImplementation(failsStorage)
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(failsStorage)
    vi.spyOn(sessionStorage, 'removeItem').mockImplementation(failsStorage)
    const scope = effectScope()
    const state = scope.run(createDeniedDraft)!
    expect(state.storageAvailable.value).toBe(false)
    state.draft.note = '仍可编辑'
    expect(state.draft.note).toBe('仍可编辑')
    expect(state.storageAvailable.value).toBe(false)
    scope.stop()
    const nextScope = effectScope()
    const remounted = nextScope.run(createDeniedDraft)!
    expect(remounted.draft.note).toBe('仍可编辑')
    remounted.resetDraft()
    expect(remounted.draft.note).toBe('')
    expect(remounted.storageAvailable.value).toBe(false)
    nextScope.stop()
  }
  it(
    'preserves notes across route remounts and explicitly resets storage',
    preservesAcrossNavigation,
  )
  it('restores existing session text without mixing module notes', restoresSavedSession)
  it(
    'keeps an editable in-memory fallback when reads, writes and removal are denied',
    keepsMemoryFallback,
  )
}

describe('useDraft', draftSuite)
