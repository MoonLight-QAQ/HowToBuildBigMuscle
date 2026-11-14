<script setup lang="ts">
import { onMounted, watch } from 'vue'
import {
  ElAlert,
  ElButton,
  ElCard,
  ElEmpty,
  ElOption,
  ElPagination,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
import { ORDER_FILTERS, ORDER_FULFILLMENT, ORDER_STATUS } from '@/constants/order'
import type { OrderListItem, OrderStatus } from '@/api/order'
import { displayMoney } from '@/utils/money'
import { displayDateTime } from '@/utils/date'
import { deliveryWindow } from './order-presentation'
import { useOrderList } from './use-order-list'

const props = withDefaults(defineProps<{ initialStatus?: OrderStatus | '' }>(), {
  initialStatus: '',
})
const emit = defineEmits<{ openOrder: [id: string]; statusChange: [status: OrderStatus | ''] }>()
const {
  items,
  total,
  page,
  pageSize,
  loading,
  errorMessage,
  empty,
  status,
  filter,
  load,
  reload,
  setPage,
  setPageSize,
} = useOrderList(undefined, props.initialStatus)

/** 将已选状态交给数据层，并重置分页；返回加载结果。 / Apply the selected status in the data layer and reset pagination. */
function applyFilter(): Promise<boolean> {
  emit('statusChange', status.value)
  return filter(status.value)
}
/** 响应站内导航和浏览器历史的筛选变化；相同值不重复加载。 / Apply navigation or history filters without reloading an unchanged selection. */
function applyRouteStatus(nextStatus: OrderStatus | ''): void {
  if (nextStatus !== status.value) void filter(nextStatus)
}
watch(() => props.initialStatus, applyRouteStatus)
/** 请求宿主打开订单详情；仅发送字符串ID，无写操作。 / Ask the host to open order detail using a string ID, without writes. */
function openOrder(id: string): void {
  emit('openOrder', id)
}
/** 重试当前筛选和页码；返回加载结果。 / Retry the current filter and page, returning load success. */
function retry(): Promise<boolean> {
  return reload()
}
onMounted(load)
</script>

<template>
  <section class="order-list" aria-labelledby="order-list-title">
    <div class="page-heading">
      <div>
        <h1 id="order-list-title">订单</h1>
        <p>查看订单快照、配送安排与处理状态。</p>
      </div>
      <ElButton :disabled="loading" @click="retry">刷新</ElButton>
    </div>
    <ElCard shadow="never">
      <div class="filters">
        <label id="order-status-label" for="order-status">订单状态</label>
        <ElSelect
          id="order-status"
          v-model="status"
          placeholder="全部状态"
          aria-labelledby="order-status-label"
          @change="applyFilter"
        >
          <ElOption
            v-for="option in ORDER_FILTERS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
      </div>
      <div v-if="loading" role="status" aria-live="polite" class="state-panel">
        <p>正在加载订单…</p>
        <ElSkeleton :rows="5" animated />
      </div>
      <div v-else-if="errorMessage" class="state-panel" role="alert">
        <ElAlert :title="errorMessage" type="error" :closable="false" show-icon />
        <ElButton @click="retry">重试</ElButton>
      </div>
      <ElEmpty v-else-if="empty" description="当前筛选下暂无订单" />
      <ElTable v-else :data="[...items]" row-key="id" aria-label="订单列表">
        <ElTableColumn prop="orderNo" label="订单号" min-width="180" />
        <ElTableColumn label="状态" min-width="100">
          <template #default="{ row }"
            ><ElTag :type="ORDER_STATUS[(row as OrderListItem).status].type">{{
              ORDER_STATUS[(row as OrderListItem).status].label
            }}</ElTag></template
          >
        </ElTableColumn>
        <ElTableColumn label="配送方式" min-width="110">
          <template #default="{ row }">{{
            ORDER_FULFILLMENT[(row as OrderListItem).fulfillment]
          }}</template>
        </ElTableColumn>
        <ElTableColumn label="用户" min-width="110">
          <template #default="{ row }">{{ row.user.nickname }}</template>
        </ElTableColumn>
        <ElTableColumn label="配送城市 / 时段" min-width="250">
          <template #default="{ row }">
            <div>{{ row.cityNameZh }}</div>
            <div class="secondary">{{ deliveryWindow(row as OrderListItem) }}</div>
            <div class="secondary">{{ row.timezone }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="itemsSummary" label="商品摘要" min-width="180" />
        <ElTableColumn label="实付金额" min-width="120" align="right">
          <template #default="{ row }">{{ displayMoney(row.actualAmountCents) }}</template>
        </ElTableColumn>
        <ElTableColumn label="下单时间" min-width="180">
          <template #default="{ row }">{{ displayDateTime(row.createdAt, row.timezone) }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }"
            ><ElButton link type="primary" @click="openOrder(row.id)">查看详情</ElButton></template
          >
        </ElTableColumn>
      </ElTable>
      <ElPagination
        v-if="!loading && !errorMessage && !empty"
        class="pagination"
        background
        layout="total, sizes, prev, pager, next"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        @current-change="setPage"
        @size-change="setPageSize"
      />
    </ElCard>
  </section>
</template>

<style scoped lang="scss">
.order-list {
  display: grid;
  gap: $space-lg;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-md;
}
h1 {
  margin: 0;
  font-size: $font-size-title;
}
p {
  margin: $space-sm 0 0;
  color: $text-secondary;
}
.filters {
  display: flex;
  align-items: center;
  gap: $space-md;
  margin-bottom: $space-lg;
}
.filters .el-select {
  flex: 0 1 $space-xl * 10;
}
.state-panel {
  display: grid;
  gap: $space-md;
  padding: $space-xl 0;
}
.secondary {
  color: $text-secondary;
  font-size: $font-size-small;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: $space-lg;
  overflow-x: auto;
}
</style>
