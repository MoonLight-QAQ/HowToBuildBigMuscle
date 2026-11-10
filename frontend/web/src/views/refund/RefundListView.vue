<script setup lang="ts">
import { onMounted } from 'vue'
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
import type { Refund, RefundStatus } from '@/api/refund'
import { REFUND_FILTERS, REFUND_STATUS } from '@/constants/refund'
import { displayMoney } from '@/utils/money'
import { displayDateTime } from '@/utils/date'
import { refundItemsSummary, refundProviderProgress } from './refund-presentation'
import { useRefundList } from './use-refund-list'

const props = withDefaults(defineProps<{ initialStatus?: RefundStatus; timezone?: string }>(), {
  timezone: 'UTC',
})
const emit = defineEmits<{ openRefund: [id: string] }>()
/** 读取宿主待审入口筛选；不访问路由或登录。 / Read the host entry filter without accessing routing or authentication. */
function getInitialStatus(): RefundStatus | undefined {
  return props.initialStatus
}
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
} = useRefundList(getInitialStatus)
/** 将选择交给数据层，重置分页并返回加载结果。 / Apply the selected filter through the data layer and reset pagination. */
function applyFilter(): Promise<boolean> {
  return filter(status.value)
}
/** 请求宿主打开退款详情；列表不提交审核。 / Ask the host to open refund detail without submitting a list review. */
function openRefund(id: string): void {
  emit('openRefund', id)
}
/** 重试当前筛选页，返回是否加载成功。 / Retry the current filtered page and return load success. */
function retry(): Promise<boolean> {
  return reload()
}
onMounted(load)
</script>

<template>
  <section class="refund-list" aria-labelledby="refund-list-title">
    <div class="page-heading">
      <div>
        <h1 id="refund-list-title">退款</h1>
        <p>分别核对审核状态与渠道退款进度。时间显示：{{ timezone }}</p>
      </div>
      <ElButton :disabled="loading" @click="retry">刷新</ElButton>
    </div>
    <ElCard shadow="never">
      <div class="filters">
        <label id="refund-status-label" for="refund-status">审核状态</label
        ><ElSelect
          id="refund-status"
          v-model="status"
          placeholder="全部状态"
          aria-labelledby="refund-status-label"
          @change="applyFilter"
          ><ElOption
            v-for="option in REFUND_FILTERS"
            :key="option.value"
            :label="option.label"
            :value="option.value"
        /></ElSelect>
      </div>
      <div v-if="loading" class="state-panel" role="status" aria-live="polite">
        <p>正在加载退款单…</p>
        <ElSkeleton :rows="5" animated />
      </div>
      <div v-else-if="errorMessage" class="state-panel" role="alert">
        <ElAlert :title="errorMessage" type="error" :closable="false" show-icon /><ElButton
          @click="retry"
          >重试</ElButton
        >
      </div>
      <ElEmpty v-else-if="empty" description="当前筛选下暂无退款单" />
      <ElTable v-else :data="[...items]" row-key="id" aria-label="退款单列表">
        <ElTableColumn prop="refundNo" label="退款单号" min-width="180" />
        <ElTableColumn prop="orderNo" label="订单号" min-width="180" />
        <ElTableColumn label="审核状态" min-width="110"
          ><template #default="{ row }"
            ><ElTag :type="REFUND_STATUS[(row as Refund).status].type">{{
              REFUND_STATUS[(row as Refund).status].label
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="渠道退款进度" min-width="180"
          ><template #default="{ row }"
            ><ElTag :type="refundProviderProgress(row as Refund).type">{{
              refundProviderProgress(row as Refund).label
            }}</ElTag></template
          ></ElTableColumn
        >
        <ElTableColumn label="用户" min-width="110"
          ><template #default="{ row }">{{ row.user.nickname }}</template></ElTableColumn
        >
        <ElTableColumn label="退款商品" min-width="200"
          ><template #default="{ row }">{{
            refundItemsSummary((row as Refund).items)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="退款合计" min-width="120" align="right"
          ><template #default="{ row }">{{
            displayMoney(row.totalAmountCents)
          }}</template></ElTableColumn
        >
        <ElTableColumn :label="`申请时间（${timezone}）`" min-width="190"
          ><template #default="{ row }">{{
            displayDateTime(row.createdAt, timezone)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="操作" width="100" fixed="right"
          ><template #default="{ row }"
            ><ElButton link type="primary" @click="openRefund(row.id)">查看详情</ElButton></template
          ></ElTableColumn
        >
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
.refund-list {
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
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: $space-lg;
  overflow-x: auto;
}
</style>
