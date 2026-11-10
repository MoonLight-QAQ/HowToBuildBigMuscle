import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { refundApi, type ListRefundsQuery, type Refund, type RefundStatus } from '@/api/refund'
import { useTable } from '@/composables/useTable'
import { refundErrorMessage } from './refund-presentation'

/** 管理本页筛选、分页和取消；宿主可通过initialStatus传入待审入口。 / Manage local filters and cancellation with an optional host-provided initial status. */
export function useRefundList(
  initialStatus?: MaybeRefOrGetter<RefundStatus | undefined>,
  service: Pick<typeof refundApi, 'list'> = refundApi,
) {
  const status = ref<RefundStatus | ''>(toValue(initialStatus) ?? '')
  /** 读取当前筛选并调用生成类型接口；错误由useTable统一捕获。 / Load contract-typed rows for current filters; useTable captures failures. */
  async function loadPage(query: { page: number; pageSize: number; signal: AbortSignal }) {
    const filters: ListRefundsQuery = { page: query.page, pageSize: query.pageSize }
    if (status.value) filters.status = status.value
    return service.list(filters, query.signal)
  }
  const table = useTable<Refund>(loadPage)
  /** 将列表错误转为安全文案，无副作用。 / Present a safe list error without effects. */
  const errorMessage = computed(function listErrorMessage() {
    return table.error.value === null ? '' : refundErrorMessage(table.error.value)
  })
  /** 选择状态并回到第一页；返回是否加载成功。 / Select status, reset to page one and return load success. */
  function filter(value: RefundStatus | ''): Promise<boolean> {
    status.value = value
    return table.reload(true)
  }
  /** 读取宿主筛选，供响应式入口变化追踪；无副作用。 / Read the host status for reactive tracking without effects. */
  function hostStatus(): RefundStatus | undefined {
    return toValue(initialStatus)
  }
  /** 宿主切换待审入口时重置本页筛选和分页。 / Reset page filters when the host changes its entry status. */
  function updateHostStatus(value: RefundStatus | undefined): void {
    void filter(value ?? '')
  }
  watch(hostStatus, updateHostStatus)
  return { ...table, status, errorMessage, filter }
}
