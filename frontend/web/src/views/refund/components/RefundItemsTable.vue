<script setup lang="ts">
import { ElTable, ElTableColumn } from 'element-plus'
import type { Refund } from '@/api/refund'
import { displayMoney } from '@/utils/money'
defineProps<{ items: ReadonlyArray<Readonly<Refund['items'][number]>> }>()
</script>

<template>
  <ElTable :data="[...items]" row-key="orderItemId" aria-label="申请退款商品">
    <ElTableColumn prop="nameZh" label="商品快照名称" min-width="200" />
    <ElTableColumn prop="qty" label="申请数量" min-width="100" align="right" />
    <ElTableColumn label="快照单价" min-width="120" align="right"
      ><template #default="{ row }">{{ displayMoney(row.priceCents) }}</template></ElTableColumn
    >
    <ElTableColumn label="商品退款金额" min-width="140" align="right"
      ><template #default="{ row }">{{ displayMoney(row.amountCents) }}</template></ElTableColumn
    >
  </ElTable>
</template>
