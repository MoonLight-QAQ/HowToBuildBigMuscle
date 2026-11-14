<script setup lang="ts">
import { ElTable, ElTableColumn } from 'element-plus'
import type { Order } from '@/api/order'
import { displayMoney } from '@/utils/money'

defineProps<{ items: ReadonlyArray<Readonly<Order['items'][number]>> }>()
</script>

<template>
  <ElTable :data="[...items]" row-key="id" aria-label="订单商品快照">
    <ElTableColumn label="商品" min-width="220">
      <template #default="{ row }"
        ><div>{{ row.nameZh }}</div>
        <div class="secondary">{{ row.nameEn }}</div></template
      >
    </ElTableColumn>
    <ElTableColumn label="单价" min-width="120" align="right">
      <template #default="{ row }">{{ displayMoney(row.priceCents) }}</template>
    </ElTableColumn>
    <ElTableColumn prop="qty" label="购买数量" min-width="100" align="right" />
    <ElTableColumn prop="refundedQty" label="已退款数量" min-width="110" align="right" />
  </ElTable>
</template>

<style scoped lang="scss">
.secondary {
  color: $text-secondary;
  font-size: $font-size-small;
}
</style>
