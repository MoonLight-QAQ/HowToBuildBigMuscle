import {
  computed,
  onScopeDispose,
  readonly,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { ElMessageBox } from 'element-plus'
import { reportApi, type ListReportsQuery, type Report, type ReportStatus } from '@/api/report'
import { ApiError } from '@/api/http'
import { useTable } from '@/composables/useTable'
import { REPORT_COPY } from '@/constants/report'
import {
  canHandleReport,
  reportErrorMessage,
  takeDownInput,
  validRemovalReason,
} from './report-presentation'

type ReportService = typeof reportApi
export type ReportConfirmation = { confirm(message: string): Promise<boolean> }

/** 显示明确确认框；取消/关闭返回false，其余异常向上传递。 / Confirm explicitly; cancellation/close return false and unexpected failures propagate. */
async function confirmReport(message: string): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, '确认举报处理', {
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

/** 管理本页列表与处理生命周期；返回本地状态和操作，不创建跨页store或路由。 / Manage local list/review state and lifecycles without a global store or router. */
export function useReportPage(
  initialStatus?: MaybeRefOrGetter<ReportStatus | undefined>,
  service: ReportService = reportApi,
  confirmation: ReportConfirmation = { confirm: confirmReport },
) {
  const status = ref<ReportStatus | ''>(toValue(initialStatus) ?? 'open')
  const selectedId = ref(''),
    report = shallowRef<Report | null>(null),
    reason = ref('')
  const detailLoading = ref(false),
    busy = ref(false),
    detailError = shallowRef<unknown>(null)
  const actionError = ref(''),
    actionMessage = ref(''),
    uncertain = ref(false),
    accessError = shallowRef<unknown>(null)
  let selectionEpoch = 0,
    readSequence = 0,
    disposed = false
  let readController: AbortController | undefined, writeController: AbortController | undefined
  /** 判断权限失效错误；无副作用。 / Identify session/permission errors without effects. */
  function isAccessError(cause: unknown): boolean {
    return (
      cause instanceof ApiError &&
      (cause.status === 401 ||
        cause.status === 403 ||
        cause.code === 'NEED_LOGIN' ||
        cause.code === 'FORBIDDEN')
    )
  }
  /** 清空选择并使旧请求和确认失效；无服务器写入。 / Clear selection and invalidate prior reads/writes/confirmations without server writes. */
  function clearSelection(): void {
    selectionEpoch += 1
    readSequence += 1
    readController?.abort()
    writeController?.abort()
    selectedId.value = ''
    report.value = null
    reason.value = ''
    detailLoading.value = false
    busy.value = false
    detailError.value = null
    actionError.value = ''
    actionMessage.value = ''
    uncertain.value = false
  }
  /** 读取当前筛选页面；鉴权失败清空处理投影，再交公共表格管理错误。 / Load filtered rows, clearing selected projections on access failure before table error handling. */
  async function loadPage(query: { page: number; pageSize: number; signal: AbortSignal }) {
    const filters: ListReportsQuery = { page: query.page, pageSize: query.pageSize }
    if (status.value) filters.status = status.value
    try {
      return await service.list(filters, query.signal)
    } catch (cause) {
      if (!query.signal.aborted && isAccessError(cause)) {
        clearSelection()
        accessError.value = cause
      }
      throw cause
    }
  }
  const table = useTable<Report>(loadPage)
  /** 检查处理响应是否仍属于当前选择；无副作用。 / Check ownership of a review response without effects. */
  function current(epoch: number, id: string): boolean {
    return !disposed && epoch === selectionEpoch && id === selectedId.value
  }
  /** 只读获取最新处理投影；清旧数据并隔离迟到响应，返回成功与否。 / Read the latest review projection, clearing stale data and isolating late responses. */
  async function readSelected(clearAction = true): Promise<boolean> {
    const id = selectedId.value,
      epoch = selectionEpoch,
      sequence = ++readSequence
    readController?.abort()
    const controller = new AbortController()
    readController = controller
    report.value = null
    reason.value = ''
    detailError.value = null
    detailLoading.value = true
    if (clearAction) {
      actionError.value = ''
      actionMessage.value = ''
      uncertain.value = false
    }
    try {
      const result = await service.get(id, controller.signal)
      if (!current(epoch, id) || sequence !== readSequence || controller.signal.aborted)
        return false
      report.value = result
      return true
    } catch (cause) {
      if (current(epoch, id) && sequence === readSequence && !controller.signal.aborted) {
        detailError.value = cause
        if (isAccessError(cause)) accessError.value = cause
      }
      return false
    } finally {
      if (current(epoch, id) && sequence === readSequence) detailLoading.value = false
    }
  }
  /** 选择举报并读取当前投影；确认和写入期间禁止切换。 / Select a report and read it, refusing changes during confirmation or writes. */
  async function select(id: string): Promise<boolean> {
    if (disposed || busy.value || table.loading.value || accessError.value) return false
    clearSelection()
    selectedId.value = id
    return readSelected()
  }
  /** 关闭本地处理区；忙碌时保留确认上下文，无返回值。 / Close local review context unless busy, without a result. */
  function close(): void {
    if (!busy.value) clearSelection()
  }
  /** 手动刷新最新详情；写入期间不覆盖确认快照。 / Refresh detail without replacing a busy confirmation snapshot. */
  function refreshDetail(): Promise<boolean> {
    if (busy.value) return Promise.resolve(false)
    return accessError.value ? reload() : readSelected()
  }
  /** 刷新列表并清选择；由公共表格处理分页和取消，返回加载结果。 / Reload rows and clear selection using shared pagination/cancellation. */
  function reload(reset = false): Promise<boolean> {
    if (busy.value || disposed) return Promise.resolve(false)
    clearSelection()
    accessError.value = null
    return table.reload(reset)
  }
  /** 更新状态筛选并回第一页；忙碌时拒绝。 / Change the status filter and reset to page one unless busy. */
  function filter(value: ReportStatus | '' | 'all'): Promise<boolean> {
    if (busy.value) return Promise.resolve(false)
    status.value = value === 'all' ? '' : value
    return reload(true)
  }
  /** 切页时清除旧处理区；忙碌时拒绝，无写入。 / Clear selection before pagination unless busy, with no writes. */
  function setPage(value: number): Promise<boolean> {
    if (busy.value) return Promise.resolve(false)
    clearSelection()
    return table.setPage(value)
  }
  /** 修改分页大小并清选择；参数由公共表格校验。 / Clear selection and update validated shared page size unless busy. */
  function setPageSize(value: number): Promise<boolean> {
    if (busy.value) return Promise.resolve(false)
    clearSelection()
    return table.setPageSize(value)
  }
  /** 确认后处理当前举报；冲突/未知结果最多只读恢复一次，不重发POST。 / Confirm then handle the current report; recover conflicts/uncertainty with one read, never a POST retry. */
  async function handle(action: 'ignore' | 'takedown'): Promise<boolean> {
    const snapshot = report.value
    if (disposed || busy.value || detailLoading.value || !snapshot || !canHandleReport(snapshot))
      return false
    const removal = snapshot.listing.status === 'on_sale'
    if (action === 'takedown' && removal && !validRemovalReason(reason.value)) {
      actionError.value = REPORT_COPY.reasonInvalid
      return false
    }
    const text = reason.value,
      epoch = selectionEpoch,
      id = selectedId.value
    const controller = new AbortController()
    writeController = controller
    busy.value = true
    actionError.value = ''
    actionMessage.value = ''
    uncertain.value = false
    try {
      const confirmed = await confirmation.confirm(
        action === 'ignore'
          ? REPORT_COPY.ignoreConfirm
          : removal
            ? REPORT_COPY.takedownConfirm
            : REPORT_COPY.closeConfirm,
      )
      if (!current(epoch, id) || controller.signal.aborted) return false
      if (!confirmed) {
        actionMessage.value = REPORT_COPY.canceled
        return false
      }
      const result =
        action === 'ignore'
          ? await service.ignore(
              id,
              { version: snapshot.version, expectedStatus: 'open' },
              controller.signal,
            )
          : await service.takedown(id, takeDownInput(snapshot, text), controller.signal)
      if (!current(epoch, id) || controller.signal.aborted) return false
      report.value = result
      reason.value = ''
      actionMessage.value =
        action === 'ignore'
          ? REPORT_COPY.ignored
          : removal
            ? REPORT_COPY.removed
            : REPORT_COPY.closed
      await table.reload()
      return true
    } catch (cause) {
      if (!current(epoch, id) || controller.signal.aborted) return false
      actionError.value = reportErrorMessage(cause)
      if (isAccessError(cause)) {
        accessError.value = cause
        report.value = null
        detailError.value = cause
      } else if (
        cause instanceof ApiError &&
        (cause.status === 409 ||
          cause.code === 'VERSION_CONFLICT' ||
          cause.code === 'INVALID_STATUS')
      )
        await readSelected(false)
      else if (
        cause instanceof ApiError &&
        (cause.kind === 'network' ||
          cause.kind === 'timeout' ||
          cause.kind === 'protocol' ||
          (cause.status !== null && cause.status >= 500))
      ) {
        uncertain.value = true
        await readSelected(false)
      }
      return false
    } finally {
      if (current(epoch, id)) {
        busy.value = false
        writeController = undefined
      }
    }
  }
  /** 忽略待处理举报，不修改帖子。 / Ignore an open report without modifying the listing. */
  function ignore(): Promise<boolean> {
    return handle('ignore')
  }
  /** 按当前帖子状态下架或仅关闭举报。 / Takedown or only close a report according to the current listing state. */
  function takedown(): Promise<boolean> {
    return handle('takedown')
  }
  /** 读取宿主状态，无副作用。 / Read the host status without effects. */
  function hostStatus(): ReportStatus | undefined {
    return toValue(initialStatus)
  }
  /** 宿主入口变化废弃旧上下文，即使已有确认也不沿用。 / Invalidate the old context on a host filter change, including pending confirmation. */
  function updateHost(value: ReportStatus | undefined): void {
    clearSelection()
    status.value = value ?? 'open'
    accessError.value = null
    void table.reload(true)
  }
  watch(hostStatus, updateHost)
  /** 卸载后取消全部请求并清空选择；不创建新操作。 / Cancel all work and clear selection on disposal without starting operations. */
  function dispose(): void {
    disposed = true
    clearSelection()
    table.cancel()
  }
  onScopeDispose(dispose)
  /** 只显示成功且仍获授权的列表，不暴露公共表格保留的旧快照。 / Expose rows only when successful and authorized, hiding retained table snapshots. */
  const items = computed(function visibleRows() {
    return table.loading.value || table.error.value || accessError.value
      ? []
      : [...table.items.value]
  })
  /** 将列表错误映射为公共安全文案。 / Map list errors to shared safe text. */
  const errorMessage = computed(function listError() {
    const cause = accessError.value ?? table.error.value
    return cause ? reportErrorMessage(cause) : ''
  })
  /** 显示详情安全错误。 / Present a safe detail error. */
  const detailErrorMessage = computed(function detailFailure() {
    return detailError.value ? reportErrorMessage(detailError.value) : ''
  })
  /** 未知写结果即使复读失败仍保留明确提示。 / Preserve unknown-write feedback even if reconciliation fails. */
  const actionErrorMessage = computed(function actionFailure() {
    return uncertain.value ? `${actionError.value}；${REPORT_COPY.uncertain}` : actionError.value
  })
  return {
    items,
    status,
    page: table.page,
    pageSize: table.pageSize,
    total: table.total,
    loading: table.loading,
    empty: table.empty,
    errorMessage,
    selectedId: readonly(selectedId),
    report: readonly(report),
    reason,
    busy: readonly(busy),
    detailLoading: readonly(detailLoading),
    detailErrorMessage,
    actionErrorMessage,
    actionMessage: readonly(actionMessage),
    select,
    close,
    refreshDetail,
    reload,
    filter,
    setPage,
    setPageSize,
    ignore,
    takedown,
  }
}
