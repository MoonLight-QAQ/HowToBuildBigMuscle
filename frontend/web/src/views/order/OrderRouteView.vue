<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { OrderStatus } from '@/api/order'
import { ORDER_FILTERS } from '@/constants/order'
import OrderDetailView from './OrderDetailView.vue'
import OrderListView from './OrderListView.vue'

const route = useRoute()
const router = useRouter()

/** 仅接受契约支持的单个筛选值；缺失或无效时显示全部。 / Select a single supported status or show all for absent or invalid input. */
function readStatus(): OrderStatus | '' {
  return ORDER_FILTERS.find(({ value }) => value === route.query.status)?.value ?? ''
}
const status = computed(readStatus)

/** 从详情路由读取字符串订单 ID；列表路由没有 ID。 / Read the string order ID from the detail route, or null on the list. */
function readOrderId(): string | null {
  return typeof route.params.id === 'string' ? route.params.id : null
}
const orderId = computed(readOrderId)

/** 同步列表筛选到 URL；空筛选省略参数。 / Persist the list filter in the URL, omitting it when empty. */
function changeStatus(value: OrderStatus | ''): void {
  void router.replace({ name: 'OrderList', query: { ...route.query, status: value || undefined } })
}

/** 打开指定订单，保留列表筛选以便返回。 / Open the requested order and carry the list filter back. */
function openOrder(id: string): void {
  void router.push({
    name: 'OrderDetail',
    params: { id },
    query: { status: status.value || undefined },
  })
}

/** 返回订单列表并恢复已验证的筛选。 / Return to orders with the validated filter. */
function backToList(): void {
  void router.push({ name: 'OrderList', query: { status: status.value || undefined } })
}
</script>

<template>
  <!-- 退款详情由 W-11 接入；订单详情保留 openRefund 事件。 -->
  <OrderDetailView
    v-if="orderId !== null"
    :order-id="orderId"
    :refund-link-available="false"
    @back="backToList"
  />
  <OrderListView
    v-else
    :initial-status="status"
    @status-change="changeStatus"
    @open-order="openOrder"
  />
</template>
