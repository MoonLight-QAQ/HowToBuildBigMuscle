<script setup lang="ts">
import {
  ElAlert,
  ElButton,
  ElCard,
  ElDescriptions,
  ElDescriptionsItem,
  ElEmpty,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
import {
  ORDER_COMPLETED_BY,
  ORDER_FULFILLMENT,
  ORDER_REFUND_STATUS,
  ORDER_STATUS,
} from '@/constants/order'
import { displayMoney } from '@/utils/money'
import type { Order } from '@/api/order'
import { displayDateTime, displayLocalDate } from '@/utils/date'
import {
  arriveLabel,
  canMarkArrived,
  canStartDelivery,
  deliveryWindow,
  startDeliveryLabel,
} from './order-presentation'
import { useOrderDetail } from './use-order-detail'
import OrderItemsTable from './components/OrderItemsTable.vue'

const props = withDefaults(defineProps<{ orderId: string; refundLinkAvailable?: boolean }>(), {
  refundLinkAvailable: true,
})
const emit = defineEmits<{ back: []; openRefund: [id: string] }>()
/** 提供响应式订单ID；读取本身无副作用。 / Supply the reactive order ID without effects. */
function getOrderId(): string {
  return props.orderId
}
const {
  order,
  loading,
  loadErrorMessage,
  actionErrorMessage,
  actionMessage,
  actionMessageType,
  actionBusy,
  reload,
  startDelivery,
  arrive,
} = useOrderDetail(getOrderId)
/** 请求宿主返回列表；无业务状态写入。 / Ask the host to return to the list without a business mutation. */
function back(): void {
  emit('back')
}
/** 将退款记录ID交给退款模块；本页不审批退款。 / Hand the refund ID to its module without reviewing it here. */
function openRefund(id: string): void {
  emit('openRefund', id)
}
</script>

<template>
  <section class="order-detail" aria-labelledby="order-detail-title">
    <div class="page-heading">
      <div class="heading-title">
        <ElButton @click="back">返回订单列表</ElButton>
        <h1 id="order-detail-title">订单详情</h1>
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
      ><p>正在加载订单详情…</p>
      <ElSkeleton :rows="8" animated
    /></ElCard>
    <ElCard v-else-if="loadErrorMessage" shadow="never" class="state-panel" role="alert">
      <ElAlert :title="loadErrorMessage" type="error" :closable="false" show-icon />
      <ElButton class="retry" @click="reload">重试</ElButton>
    </ElCard>
    <template v-else-if="order">
      <ElCard shadow="never">
        <template #header
          ><div class="section-heading">
            <h2>{{ order.orderNo }}</h2>
            <ElTag :type="ORDER_STATUS[order.status].type">{{
              ORDER_STATUS[order.status].label
            }}</ElTag>
          </div></template
        >
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="用户">{{ order.user.nickname }}</ElDescriptionsItem>
          <ElDescriptionsItem label="配送方式">{{
            ORDER_FULFILLMENT[order.fulfillment]
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="收货人">{{ order.contactName }}</ElDescriptionsItem>
          <ElDescriptionsItem label="收货电话">{{ order.contactPhone }}</ElDescriptionsItem>
          <ElDescriptionsItem label="收货地址" :span="2">{{
            order.address.formatted
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="街道">{{ order.address.street }}</ElDescriptionsItem>
          <ElDescriptionsItem label="配送大区">{{
            order.address.zoneNameZh ?? '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="街区">{{ order.address.suburb }}</ElDescriptionsItem>
          <ElDescriptionsItem label="州 / 邮编"
            >{{ order.address.state }} / {{ order.address.postcode }}</ElDescriptionsItem
          >
          <ElDescriptionsItem label="城市快照">{{ order.cityNameZh }}</ElDescriptionsItem>
          <ElDescriptionsItem label="显示时区">{{ order.timezone }}</ElDescriptionsItem>
          <template v-if="order.fulfillment === 'local'">
            <ElDescriptionsItem label="配送日期">{{
              displayLocalDate(order.deliveryDate)
            }}</ElDescriptionsItem>
            <ElDescriptionsItem label="配送时段">{{ order.slotNameZh ?? '—' }}</ElDescriptionsItem>
            <ElDescriptionsItem label="配送时间窗口" :span="2">{{
              deliveryWindow(order)
            }}</ElDescriptionsItem>
          </template>
          <ElDescriptionsItem label="用户备注" :span="2">{{
            order.remark || '—'
          }}</ElDescriptionsItem>
        </ElDescriptions>
        <div v-if="canStartDelivery(order.status) || canMarkArrived(order.status)" class="actions">
          <ElButton
            v-if="canStartDelivery(order.status)"
            type="primary"
            :loading="actionBusy"
            :disabled="actionBusy"
            @click="startDelivery"
            >{{ startDeliveryLabel(order.fulfillment) }}</ElButton
          >
          <ElButton
            v-if="canMarkArrived(order.status)"
            type="success"
            :loading="actionBusy"
            :disabled="actionBusy"
            @click="arrive"
            >{{ arriveLabel(order.status) }}</ElButton
          >
        </div>
      </ElCard>
      <ElCard shadow="never">
        <template #header><h2>商品与金额快照</h2></template>
        <OrderItemsTable :items="order.items" />
        <ElDescriptions class="amounts" :column="3" border>
          <ElDescriptionsItem label="商品金额">{{
            displayMoney(order.goodsAmountCents)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="运费">{{
            displayMoney(order.shippingFeeCents)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="实付金额">{{
            displayMoney(order.actualAmountCents)
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>
      <ElCard shadow="never">
        <template #header><h2>订单时间</h2></template>
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="下单时间">{{
            displayDateTime(order.createdAt, order.timezone)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="支付截止时间">{{
            displayDateTime(order.payExpireAt, order.timezone)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="支付时间">{{
            displayDateTime(order.paidAt, order.timezone)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="完成时间">{{
            displayDateTime(order.completedAt, order.timezone)
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="完成方式">{{
            order.completedBy ? ORDER_COMPLETED_BY[order.completedBy] : '—'
          }}</ElDescriptionsItem>
          <ElDescriptionsItem label="取消时间">{{
            displayDateTime(order.cancelledAt, order.timezone)
          }}</ElDescriptionsItem>
        </ElDescriptions>
      </ElCard>
      <ElCard shadow="never">
        <template #header><h2>退款记录</h2></template>
        <ElEmpty v-if="order.refunds.length === 0" description="暂无退款记录" />
        <ElTable v-else :data="[...order.refunds]" row-key="id" aria-label="订单退款记录">
          <ElTableColumn prop="refundNo" label="退款单号" min-width="180" />
          <ElTableColumn label="审核状态" min-width="120"
            ><template #default="{ row }">{{
              ORDER_REFUND_STATUS[(row as Order['refunds'][number]).status]
            }}</template></ElTableColumn
          >
          <ElTableColumn label="操作" width="110"
            ><template #default="{ row }"
              ><ElButton v-if="refundLinkAvailable" link type="primary" @click="openRefund(row.id)"
                >查看退款</ElButton
              ><span v-else>退款详情待接入</span></template
            ></ElTableColumn
          >
        </ElTable>
      </ElCard>
    </template>
  </section>
</template>

<style scoped lang="scss">
.order-detail {
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
  margin-top: 0;
  color: $text-secondary;
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
