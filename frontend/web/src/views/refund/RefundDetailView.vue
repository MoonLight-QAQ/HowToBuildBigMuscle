<script setup lang="ts">
import {
  ElAlert,
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElSkeleton,
  ElTag,
} from 'element-plus'
import { REFUND_COPY, REFUND_REASON, REFUND_STATUS } from '@/constants/refund'
import { displayMoney } from '@/utils/money'
import { displayDateTime } from '@/utils/date'
import { canReviewRefund, refundProviderProgress, refundReviewHint } from './refund-presentation'
import { useRefundDetail } from './use-refund-detail'
import RefundItemsTable from './components/RefundItemsTable.vue'

const props = withDefaults(defineProps<{ refundId: string; timezone?: string }>(), {
  timezone: 'UTC',
})
const emit = defineEmits<{ back: []; openOrder: [id: string] }>()
/** 读取宿主退款ID，供数据层响应切单；无副作用。 / Read the host refund ID for reactive data loading without effects. */
function getRefundId(): string {
  return props.refundId
}
const {
  refund,
  loading,
  loadErrorMessage,
  actionErrorMessage,
  actionMessage,
  actionMessageType,
  actionBusy,
  reload,
  approve,
  reject,
} = useRefundDetail(getRefundId)
/** 请求返回列表；宿主负责正式路由接入。 / Ask the host to return to the list through its navigation integration. */
function back(): void {
  emit('back')
}
/** 仅传递关联订单ID，不读取订单联系人或推断订单状态。 / Emit the related order ID without reading contacts or inferring order state. */
function openOrder(id: string): void {
  emit('openOrder', id)
}
</script>

<template>
  <section class="refund-detail" aria-labelledby="refund-detail-title">
    <div class="page-heading">
      <div class="heading-title">
        <ElButton @click="back">返回退款列表</ElButton>
        <h1 id="refund-detail-title">退款单详情</h1>
      </div>
      <ElButton :disabled="loading || actionBusy" @click="reload">刷新</ElButton>
    </div>
    <ElAlert
      v-if="actionErrorMessage && actionErrorMessage !== loadErrorMessage"
      :title="actionErrorMessage"
      type="error"
      :closable="false"
      show-icon
      role="alert"
    />
    <ElAlert
      v-if="actionMessage"
      :title="actionMessage"
      :type="actionMessageType"
      :closable="false"
      show-icon
      role="status"
    />
    <ElCard v-if="loading" shadow="never" role="status" aria-live="polite"
      ><p>正在加载退款单…</p>
      <ElSkeleton :rows="8" animated
    /></ElCard>
    <ElCard v-else-if="loadErrorMessage" shadow="never" role="alert"
      ><ElAlert :title="loadErrorMessage" type="error" :closable="false" show-icon /><ElButton
        class="retry"
        @click="reload"
        >重试</ElButton
      ></ElCard
    >
    <template v-else-if="refund">
      <ElCard shadow="never">
        <template #header
          ><div class="section-heading">
            <h2>{{ refund.refundNo }}</h2>
            <ElTag :type="REFUND_STATUS[refund.status].type">{{
              REFUND_STATUS[refund.status].label
            }}</ElTag>
          </div></template
        >
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="关联订单"
            ><ElButton link type="primary" @click="openOrder(refund.orderId)">{{
              refund.orderNo
            }}</ElButton></ElDescriptionsItem
          >
          <ElDescriptionsItem label="申请用户">{{ refund.user.nickname }}</ElDescriptionsItem>
          <ElDescriptionsItem label="退款原因">{{
            REFUND_REASON[refund.reason]
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="补充说明">{{ refund.extra || '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem :label="`申请时间（${timezone}）`">{{
            displayDateTime(refund.createdAt, timezone)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="审核人">{{ refund.reviewedBy ?? '—' }}</ElDescriptionsItem>
          <ElDescriptionsItem :label="`审核时间（${timezone}）`" :span="2">{{
            displayDateTime(refund.reviewedAt, timezone)
          }}</ElDescriptionsItem>
        </ElDescriptions>
        <p>{{ refundReviewHint(refund) }}</p>
        <div v-if="canReviewRefund(refund)" class="actions">
          <ElButton type="primary" :loading="actionBusy" :disabled="actionBusy" @click="approve"
            >同意退款</ElButton
          ><ElButton type="danger" :loading="actionBusy" :disabled="actionBusy" @click="reject"
            >拒绝</ElButton
          >
        </div>
      </ElCard>
      <ElCard shadow="never">
        <template #header><h2>申请退款商品与金额</h2></template>
        <RefundItemsTable :items="refund.items" />
        <ElDescriptions class="amounts" :column="3" border>
          <ElDescriptionsItem label="商品退款金额">{{
            displayMoney(refund.goodsAmountCents)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="运费退款金额">{{
            displayMoney(refund.shippingRefundCents)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="退款合计">{{
            displayMoney(refund.totalAmountCents)
          }}</ElDescriptionsItem>
        </ElDescriptions>
        <p>{{ REFUND_COPY.inventory }}</p>
      </ElCard>
      <ElCard shadow="never">
        <template #header><h2>渠道退款进度</h2></template>
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="渠道标识">{{
            refund.provider ?? '未指定'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="渠道退款对象">{{
            refund.providerRefundId ?? '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="独立进度" :span="2"
            ><ElTag :type="refundProviderProgress(refund).type">{{
              refundProviderProgress(refund).label
            }}</ElTag></ElDescriptionsItem
          >
        </ElDescriptions>
        <p>{{ refundProviderProgress(refund).description }}</p>
      </ElCard>
    </template>
  </section>
</template>

<style scoped lang="scss">
.refund-detail {
  display: grid;
  gap: $space-lg;
}
.page-heading,
.heading-title,
.section-heading {
  display: flex;
  align-items: center;
  gap: $space-md;
}
.page-heading {
  justify-content: space-between;
}
.section-heading {
  flex-wrap: wrap;
}
h1 {
  margin: 0;
  font-size: $font-size-title;
}
h2 {
  margin: 0;
  font-size: $font-size-large;
}
p {
  color: $text-secondary;
  margin: $space-md 0 0;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: $space-sm;
  margin-top: $space-lg;
}
.amounts,
.retry {
  margin-top: $space-lg;
}
</style>
