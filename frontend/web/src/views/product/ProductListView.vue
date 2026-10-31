<script setup lang="ts">
import { listProducts } from '@/api/products'
import DraftNote from '@/components/DraftNote.vue'
import ModuleHeader from '@/components/ModuleHeader.vue'
import PreviewScenario from '@/components/PreviewScenario.vue'
import ResourceState from '@/components/ResourceState.vue'
import { useDraft } from '@/composables/useDraft'
import { useResource } from '@/composables/useResource'

const { data, status, error, scenario, load } = useResource(listProducts, 'products')
const { draft, resetDraft, storageAvailable } = useDraft('products')
</script>

<template>
  <div>
    <ModuleHeader
      title="商品"
      description="查看商品资料与接口提供的库存结果。本次为只读预览，新增和编辑将在后续任务提供。"
    >
      <ElButton :loading="status === 'loading'" @click="load">刷新数据</ElButton>
    </ModuleHeader>
    <PreviewScenario v-model="scenario" />
    <ResourceState :status="status" :error="error" @retry="load">
      <div class="table-scroll">
        <ElTable :data="data?.items ?? []" row-key="id" class="preview-table product-table">
          <ElTableColumn prop="name" label="商品名称" min-width="190" />
          <ElTableColumn prop="categoryName" label="商城类目" min-width="120" />
          <ElTableColumn prop="priceText" label="价格（元）" min-width="210" align="right" />
          <ElTableColumn prop="bookStock" label="账面库存" width="100" align="right" />
          <ElTableColumn prop="lockedStock" label="锁定库存" width="100" align="right" />
          <ElTableColumn prop="availableStock" label="可售库存" width="100" align="right" />
          <ElTableColumn prop="statusLabel" label="状态" min-width="100" />
        </ElTable>
      </div>
      <p class="table-footer">共 {{ data?.total }} 条商品 · 库存按接口结果展示</p>
    </ResourceState>
    <DraftNote v-model="draft.note" :storage-available="storageAvailable" @reset="resetDraft" />
  </div>
</template>
