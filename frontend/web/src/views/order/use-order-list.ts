import { computed, ref } from 'vue'
import { orderApi, type ListOrdersQuery, type OrderListItem, type OrderStatus } from '@/api/order'
import { useTable } from '@/composables/useTable'
import { orderErrorMessage } from './order-presentation'

/** 使用契约API管理本页筛选、分页和取消；返回只读列表状态及操作。 / Manage local filters and cancellable pagination through the contract API. */
export function useOrderList(
  service: Pick<typeof orderApi, 'list'> = orderApi,
  initialStatus: OrderStatus | '' = '',
) {
  const status = ref<OrderStatus | ''>(initialStatus)
  /** 读取本页筛选并加载已验证数据；请求错误由useTable捕获。 / Read filters and load validated rows; useTable captures failures. */
  async function loadPage(query: { page: number; pageSize: number; signal: AbortSignal }) {
    const filters: ListOrdersQuery = { page: query.page, pageSize: query.pageSize }
    if (status.value) filters.status = status.value
    return service.list(filters, query.signal)
  }
  const table = useTable<OrderListItem>(loadPage)
  /** 返回可显示的列表错误；无副作用。 / Return a safe list error message, without effects. */
  const errorMessage = computed(function getListError() {
    return table.error.value === null ? '' : orderErrorMessage(table.error.value)
  })
  /** 改变筛选后回到第一页；返回加载是否成功。 / Reset pagination after filtering and return load success. */
  function filter(value: OrderStatus | ''): Promise<boolean> {
    status.value = value
    return table.reload(true)
  }
  return { ...table, status, errorMessage, filter }
}
