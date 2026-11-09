import {
  computed,
  getCurrentScope,
  onScopeDispose,
  readonly,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { ElMessageBox } from 'element-plus'
import { ApiError } from '@/api/http'
import { orderApi, type Order } from '@/api/order'
import { ERROR_CODE } from '@/constants/error-code'
import { ORDER_ACTION_COPY } from '@/constants/order'
import { canMarkArrived, canStartDelivery, orderErrorMessage } from './order-presentation'

type OrderService = Pick<typeof orderApi, 'get' | 'startDelivery' | 'arrive'>
export type OrderConfirmation = { confirm(message: string): Promise<boolean> }

/** 显示默认确认框；取消或关闭返回false，其他失败继续抛出。 / Show confirmation; cancellation returns false and unexpected failures propagate. */
async function confirmOrderAction(message: string): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, '确认订单操作', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true,
    })
    return true
  } catch (cause) {
    if (cause === 'cancel' || cause === 'close') return false
    throw cause
  }
}

/** 管理授权订单详情及确认写入；隔离切单、刷新和卸载后的迟到响应。 / Manage authorized detail and confirmed writes, isolating stale responses. */
export function useOrderDetail(
  orderId: MaybeRefOrGetter<string>,
  service: OrderService = orderApi,
  confirmation: OrderConfirmation = { confirm: confirmOrderAction },
) {
  const order = shallowRef<Order | null>(null)
  const loading = ref(false)
  const loadError = shallowRef<unknown>(null)
  const actionError = shallowRef<unknown>(null)
  const uncertainOutcome = ref(false)
  const actionMessage = ref('')
  const actionBusy = ref(false)
  let epoch = 0
  let disposed = false
  let readController: AbortController | undefined
  let writeController: AbortController | undefined

  /** 废弃当前读写和确认结果；无返回值，清除忙碌状态。 / Invalidate pending reads, writes and confirmations and clear busy flags. */
  function invalidate(): void {
    epoch += 1
    readController?.abort()
    writeController?.abort()
    readController = undefined
    writeController = undefined
    loading.value = false
    actionBusy.value = false
  }
  /** 判断结果仍属于当前页面；无副作用。 / Check whether a result still belongs to this page, without effects. */
  function isCurrent(request: number, id: string): boolean {
    return !disposed && request === epoch && id === toValue(orderId)
  }
  /** 重新读取并立即清除旧收货资料；失败保留安全错误，不展示旧PII。 / Reload after clearing recipient data; failed loads never retain old PII. */
  async function load(clearAction = true): Promise<boolean> {
    if (disposed) return false
    invalidate()
    const request = epoch
    const id = toValue(orderId)
    const controller = new AbortController()
    readController = controller
    order.value = null
    loadError.value = null
    actionMessage.value = ''
    if (clearAction) {
      actionError.value = null
      uncertainOutcome.value = false
    }
    loading.value = true
    try {
      if (!id) throw new ApiError('business', 404, ERROR_CODE.NOT_FOUND.code)
      const result = await service.get(id, controller.signal)
      if (!isCurrent(request, id) || controller.signal.aborted) return false
      order.value = result
      return true
    } catch (cause) {
      if (isCurrent(request, id) && !controller.signal.aborted) loadError.value = cause
      return false
    } finally {
      if (isCurrent(request, id)) {
        loading.value = false
        readController = undefined
      }
    }
  }
  /** 确认后提交保存的版本和旧状态；失败不产生成功提示，冲突刷新。 / Confirm and submit saved version/status; errors never claim success and conflicts reload. */
  async function mutate(action: 'start' | 'arrive'): Promise<boolean> {
    const snapshot = order.value
    if (disposed || loading.value || actionBusy.value || snapshot === null) return false
    if (action === 'start' ? !canStartDelivery(snapshot.status) : !canMarkArrived(snapshot.status))
      return false
    const request = epoch
    const id = toValue(orderId)
    const controller = new AbortController()
    writeController = controller
    actionBusy.value = true
    actionError.value = null
    uncertainOutcome.value = false
    actionMessage.value = ''
    try {
      const message =
        action === 'arrive'
          ? ORDER_ACTION_COPY.arriveConfirm
          : snapshot.fulfillment === 'post'
            ? ORDER_ACTION_COPY.startPostConfirm
            : ORDER_ACTION_COPY.startLocalConfirm
      const confirmed = await confirmation.confirm(message)
      if (!isCurrent(request, id) || controller.signal.aborted) return false
      if (!confirmed) {
        actionMessage.value = ORDER_ACTION_COPY.canceled
        return false
      }
      let result: Order
      if (action === 'start' && snapshot.status === 'pending') {
        result = await service.startDelivery(
          id,
          { version: snapshot.version, expectedStatus: snapshot.status },
          controller.signal,
        )
      } else if (
        action === 'arrive' &&
        (snapshot.status === 'pending' || snapshot.status === 'delivering')
      ) {
        result = await service.arrive(
          id,
          { version: snapshot.version, expectedStatus: snapshot.status },
          controller.signal,
        )
      } else return false
      if (!isCurrent(request, id) || controller.signal.aborted) return false
      order.value = result
      actionMessage.value = ORDER_ACTION_COPY.success
      return true
    } catch (cause) {
      if (!isCurrent(request, id) || controller.signal.aborted) return false
      actionError.value = cause
      if (
        cause instanceof ApiError &&
        (cause.status === 401 ||
          cause.status === 403 ||
          cause.code === ERROR_CODE.NEED_LOGIN.code ||
          cause.code === ERROR_CODE.FORBIDDEN.code)
      ) {
        order.value = null
        loadError.value = cause
      } else if (
        cause instanceof ApiError &&
        (cause.status === 409 ||
          cause.code === ERROR_CODE.VERSION_CONFLICT.code ||
          cause.code === ERROR_CODE.INVALID_STATUS.code)
      ) {
        await load(false)
      } else if (
        cause instanceof ApiError &&
        (cause.kind === 'network' ||
          cause.kind === 'timeout' ||
          cause.kind === 'protocol' ||
          (cause.status !== null && cause.status >= 500))
      ) {
        uncertainOutcome.value = true
        await load(false)
      }
      return false
    } finally {
      if (isCurrent(request, id)) {
        actionBusy.value = false
        writeController = undefined
      }
    }
  }
  /** 请求开始配送；返回服务端确认结果，取消返回false。 / Request delivery start and return confirmed success, or false after cancellation. */
  function startDelivery(): Promise<boolean> {
    return mutate('start')
  }
  /** 请求确认送达；返回服务端确认结果，取消返回false。 / Request arrival and return confirmed success, or false after cancellation. */
  function arrive(): Promise<boolean> {
    return mutate('arrive')
  }
  /** 对外刷新入口；返回加载结果并清除上次操作反馈。 / Reload and clear previous action feedback, returning load success. */
  function reload(): Promise<boolean> {
    return load()
  }
  /** 将读取错误转为安全文案；无副作用。 / Present a safe read error, without effects. */
  const loadErrorMessage = computed(function getLoadError() {
    return loadError.value === null ? '' : orderErrorMessage(loadError.value)
  })
  /** 将操作错误转为安全文案；无副作用。 / Present a safe mutation error, without effects. */
  const actionErrorMessage = computed(function getActionError() {
    if (actionError.value === null) return ''
    return uncertainOutcome.value
      ? `${orderErrorMessage(actionError.value)}；${ORDER_ACTION_COPY.uncertain}`
      : orderErrorMessage(actionError.value)
  })
  /** 标识成功或取消反馈；仅服务端成功使用success色。 / Use success tone only after server-confirmed writes. */
  const actionMessageType = computed(function getMessageType() {
    return actionMessage.value === ORDER_ACTION_COPY.success ? 'success' : 'info'
  })
  /** 切换订单立即失效旧操作并加载新详情。 / Invalidate old work and load detail when the order changes. */
  function onOrderChanged(): void {
    void load()
  }
  /** 读取当前订单ID供watch跟踪；无副作用。 / Read the current order ID for watch tracking, without effects. */
  function currentId(): string {
    return toValue(orderId)
  }
  const stopWatch = watch(currentId, onOrderChanged, { immediate: true, flush: 'sync' })
  /** 卸载后停止侦听并废弃所有结果；清除收货资料。 / Stop watching, invalidate results and clear recipient data on disposal. */
  function dispose(): void {
    disposed = true
    stopWatch()
    invalidate()
    order.value = null
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return {
    order: readonly(order),
    loading: readonly(loading),
    loadErrorMessage,
    actionErrorMessage,
    actionMessage: readonly(actionMessage),
    actionMessageType,
    actionBusy: readonly(actionBusy),
    reload,
    startDelivery,
    arrive,
  }
}
