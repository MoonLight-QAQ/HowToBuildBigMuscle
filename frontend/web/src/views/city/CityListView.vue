<script setup lang="ts">
import { listCities } from '@/api/cities'
import DraftNote from '@/components/DraftNote.vue'
import ModuleHeader from '@/components/ModuleHeader.vue'
import PreviewScenario from '@/components/PreviewScenario.vue'
import ResourceState from '@/components/ResourceState.vue'
import { useDraft } from '@/composables/useDraft'
import { useResource } from '@/composables/useResource'

const { data, status, error, scenario, load } = useResource(listCities, 'cities')
const { draft, resetDraft, storageAvailable } = useDraft('cities')
</script>

<template>
  <div>
    <ModuleHeader
      title="城市"
      description="查看城市与配送方式。本次为只读预览，添加和方式切换将在后续任务提供。"
    >
      <ElButton :loading="status === 'loading'" @click="load">刷新数据</ElButton>
    </ModuleHeader>
    <PreviewScenario v-model="scenario" />
    <ResourceState :status="status" :error="error" @retry="load">
      <div class="table-scroll">
        <ElTable :data="data?.items ?? []" row-key="id" class="preview-table">
          <ElTableColumn prop="nameZh" label="城市中文名" min-width="180" />
          <ElTableColumn prop="nameEn" label="城市英文名" min-width="220" />
          <ElTableColumn prop="fulfillmentLabel" label="配送方式" min-width="150" />
        </ElTable>
      </div>
      <p class="table-footer">共 {{ data?.total }} 座城市</p>
    </ResourceState>
    <DraftNote v-model="draft.note" :storage-available="storageAvailable" @reset="resetDraft" />
  </div>
</template>
