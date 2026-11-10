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
import { refundApi, type Refund, type ReviewRefundInput } from '@/api/refund'
import { ERROR_CODE } from '@/constants/error-code'
import { REFUND_COPY } from '@/constants/refund'
import { canReviewRefund, refundErrorMessage } from './refund-presentation'

type RefundService = Pick<typeof refundApi, 'get' | 'approve' | 'reject'>
export type RefundConfirmation = { confirm(message: string): Promise<boolean> }

/** 显示确认框，取消与关闭返回false，其余异常继续抛出。 / Show confirmation; cancel/close return false while unexpected errors propagate. */
async function confirmRefundReview(message: string): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, '确认退款审核', {
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

/** 管理退款详情与确认审核；切单/卸载使旧读写失效，失败不宣称渠道成功。 / Manage refund detail and confirmed review with lifecycle isolation and no inferred provider success. */
export function useRefundDetail(
  refundId: MaybeRefOrGetter<string>,
  service: RefundService = refundApi,
  confirmation: RefundConfirmation = { confirm: confirmRefundReview },
) {
  const refund = shallowRef<Refund | null>(null)
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

  /** 废弃当前读写及确认结果，并取消请求；无返回值。 / Invalidate current reads, writes and confirmations and abort requests. */
  function invalidate(): void {
    epoch += 1
    readController?.abort()
    writeController?.abort()
    readController = undefined
    writeController = undefined
    loading.value = false
    actionBusy.value = false
  }
  /** 判断响应是否仍属于当前退款单；无副作用。 / Check response ownership for the current refund without effects. */
  function isCurrent(request: number, id: string): boolean {
    return !disposed && request === epoch && id === toValue(refundId)
  }
  /** 重新读取前清除旧详情；失败不保留旧资料，返回是否成功。 / Clear stale detail before rereading and return success without retaining data after failure. */
  async function load(clearAction = true): Promise<boolean> {
    if (disposed) return false
    invalidate()
    const request = epoch
    const id = toValue(refundId)
    const controller = new AbortController()
    readController = controller
    refund.value = null
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
      refund.value = result
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
  /** 确认后提交保存版本与open旧状态；冲突/未知结果只读恢复，不重试审核。 / Confirm saved version/open state; recover conflicts or uncertain outcomes using reads only. */
  async function review(action: 'approve' | 'reject'): Promise<boolean> {
    const snapshot = refund.value
    if (
      disposed ||
      loading.value ||
      actionBusy.value ||
      snapshot === null ||
      !canReviewRefund(snapshot)
    )
      return false
    const request = epoch
    const id = toValue(refundId)
    const controller = new AbortController()
    writeController = controller
    actionBusy.value = true
    actionError.value = null
    uncertainOutcome.value = false
    actionMessage.value = ''
    try {
      const confirmed = await confirmation.confirm(
        action === 'approve' ? REFUND_COPY.approveConfirm : REFUND_COPY.rejectConfirm,
      )
      if (!isCurrent(request, id) || controller.signal.aborted) return false
      if (!confirmed) {
        actionMessage.value = REFUND_COPY.canceled
        return false
      }
      const input: ReviewRefundInput = { version: snapshot.version, expectedStatus: 'open' }
      const result =
        action === 'approve'
          ? await service.approve(id, input, controller.signal)
          : await service.reject(id, input, controller.signal)
      if (!isCurrent(request, id) || controller.signal.aborted) return false
      refund.value = result
      actionMessage.value = action === 'approve' ? REFUND_COPY.approved : REFUND_COPY.rejected
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
        refund.value = null
        loadError.value = cause
      } else if (
        cause instanceof ApiError &&
        (cause.status === 409 ||
          cause.code === ERROR_CODE.VERSION_CONFLICT.code ||
          cause.code === ERROR_CODE.INVALID_STATUS.code)
      )
        await load(false)
      else if (
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
  /** 请求同意待审单，返回审核是否成功；不会据此设置渠道状态。 / Approve an open review and return success without setting provider state. */
  function approve(): Promise<boolean> {
    return review('approve')
  }
  /** 请求拒绝待审单，返回审核是否成功；不推断订单当前状态。 / Reject an open review and return success without inferring current order status. */
  function reject(): Promise<boolean> {
    return review('reject')
  }
  /** 刷新当前详情并清除上次操作提示；返回读取结果。 / Reload detail, clearing old action feedback and returning read success. */
  function reload(): Promise<boolean> {
    return load()
  }
  /** 将读取错误转换为安全文案，无副作用。 / Return a safe read error without effects. */
  const loadErrorMessage = computed(function getLoadError() {
    return loadError.value === null ? '' : refundErrorMessage(loadError.value)
  })
  /** 未知写结果的关键提示即使复读失败也保留。 / Keep uncertainty feedback even if reconciliation fails. */
  const actionErrorMessage = computed(function getActionError() {
    if (actionError.value === null) return ''
    return uncertainOutcome.value
      ? `${refundErrorMessage(actionError.value)}；${REFUND_COPY.uncertain}`
      : refundErrorMessage(actionError.value)
  })
  /** 仅服务端确认审核完成使用成功色，取消为中性提示。 / Use success tone only after confirmed review and neutral tone after cancellation. */
  const actionMessageType = computed(function getMessageType() {
    return actionMessage.value === REFUND_COPY.canceled ? 'info' : 'success'
  })
  /** 读取响应式退款ID，无副作用。 / Read the reactive refund ID without effects. */
  function currentId(): string {
    return toValue(refundId)
  }
  /** 切换退款单后立即读取并废弃旧操作。 / Reload and invalidate old operations when the refund changes. */
  function onRefundChanged(): void {
    void load()
  }
  const stopWatch = watch(currentId, onRefundChanged, { immediate: true, flush: 'sync' })
  /** 卸载时停止追踪、取消请求并清除详情。 / Stop tracking, cancel requests and clear detail on disposal. */
  function dispose(): void {
    disposed = true
    stopWatch()
    invalidate()
    refund.value = null
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return {
    refund: readonly(refund),
    loading: readonly(loading),
    loadErrorMessage,
    actionErrorMessage,
    actionMessage: readonly(actionMessage),
    actionMessageType,
    actionBusy: readonly(actionBusy),
    reload,
    approve,
    reject,
  }
}
