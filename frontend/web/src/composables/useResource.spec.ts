import { defineComponent, h, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/http'
import type { RequestOptions } from '@/types/api'
import { isEmptyResource, useResource } from './useResource'

/**
 * deferred exposes manual settlement for a deterministic request-order test.
 * 中文：提供可手动完成的Promise以验证请求乱序，不调用网络。
 * @returns Promise and resolver / Promise及完成方法。
 */
function deferred<T>() {
  let resolve!: (value: T) => void
  /** capture stores the Promise resolver / 中文：记录Promise完成方法；参数为resolve函数，无返回或外部副作用。 */
  function capture(resolvePromise: (value: T) => void): void {
    resolve = resolvePromise
  }
  const promise = new Promise<T>(capture)
  return { promise, resolve }
}

/** resourceSuite registers lifecycle tests / 中文：注册资源生命周期测试；无参数、无返回。 */
function resourceSuite(): void {
  /** detectsEmpty checks absent resources without treating zero as empty / 中文：验证空态和真实零值；无参数、无返回。 */
  function detectsEmpty(): void {
    expect(isEmptyResource(null)).toBe(true)
    expect(isEmptyResource({ items: [], total: 0 })).toBe(true)
    expect(isEmptyResource([])).toBe(true)
    expect(isEmptyResource({ feeMinor: 0 })).toBe(false)
    expect(isEmptyResource(0)).toBe(false)
  }

  /** ignoresStaleResponse ensures superseded data cannot overwrite current data / 中文：验证旧结果不能回写；无参数、无返回，挂载测试组件。 */
  async function ignoresStaleResponse(): Promise<void> {
    const first = deferred<{ items: string[] }>()
    const second = deferred<{ items: string[] }>()
    let calls = 0
    let firstSignal: AbortSignal | undefined
    let resource!: ReturnType<typeof useResource<{ items: string[] }>>
    /** read returns controlled requests / 中文：返回可控读取结果；参数为请求选项，返回对应Promise，记录取消信号。 */
    function read(options?: RequestOptions): Promise<{ items: string[] }> {
      calls += 1
      if (calls === 1) firstSignal = options?.signal
      return calls === 1 ? first.promise : second.promise
    }
    /** setup creates a scoped resource / 中文：创建组件资源；无参数，返回渲染方法，注册生命周期。 */
    function setup() {
      resource = useResource(read, 'stale-test')
      return render
    }
    /** render supplies minimal DOM / 中文：输出测试节点；无参数，返回虚拟节点。 */
    function render() {
      return h('div')
    }
    const wrapper = mount(defineComponent({ setup }))
    expect(resource.status.value).toBe('loading')
    const reload = resource.load()
    expect(firstSignal?.aborted).toBe(true)
    second.resolve({ items: ['new'] })
    await reload
    first.resolve({ items: ['old'] })
    await flushPromises()
    expect(resource.data.value).toEqual({ items: ['new'] })
    expect(resource.status.value).toBe('success')
    wrapper.unmount()
  }

  /** handlesErrorsAndRecovery exercises visible error, empty state and disposal / 中文：验证失败、恢复与销毁取消；无参数、无返回，挂载组件。 */
  async function handlesErrorsAndRecovery(): Promise<void> {
    let resource!: ReturnType<typeof useResource<{ items: string[] }>>
    let activeSignal: AbortSignal | undefined
    /** read follows the chosen scenario / 中文：按测试场景读取；参数为请求选项，返回数据或抛权限错误，记录信号。 */
    async function read(options?: RequestOptions): Promise<{ items: string[] }> {
      activeSignal = options?.signal
      if (options?.scenario === 'forbidden') throw new ApiError('FORBIDDEN', '无权访问', 403)
      return { items: [] }
    }
    /** setup initializes resource state / 中文：初始化测试资源；无参数，返回渲染方法。 */
    function setup() {
      resource = useResource(read, 'error-test')
      return render
    }
    /** render supplies a host / 中文：输出宿主节点；无参数，返回虚拟节点。 */
    function render() {
      return h('div')
    }
    const wrapper = mount(defineComponent({ setup }))
    await flushPromises()
    expect(resource.status.value).toBe('empty')
    resource.scenario.value = 'forbidden'
    await nextTick()
    await flushPromises()
    expect(resource.status.value).toBe('error')
    expect(resource.error.value?.code).toBe('FORBIDDEN')
    resource.scenario.value = 'success'
    await nextTick()
    await flushPromises()
    expect(resource.error.value).toBeNull()
    expect(resource.status.value).toBe('empty')
    wrapper.unmount()
    expect(activeSignal?.aborted).toBe(true)
  }
  it('detects empty collections and preserves legitimate zero values', detectsEmpty)
  it('cancels old reads and ignores out-of-order results', ignoresStaleResponse)
  it('recovers from errors and cancels reads on disposal', handlesErrorsAndRecovery)
}

describe('useResource', resourceSuite)
