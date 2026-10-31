<script setup lang="ts">
import { listMallCategories } from '@/api/mall-categories'
import DraftNote from '@/components/DraftNote.vue'
import ModuleHeader from '@/components/ModuleHeader.vue'
import PreviewScenario from '@/components/PreviewScenario.vue'
import ResourceState from '@/components/ResourceState.vue'
import { useDraft } from '@/composables/useDraft'
import { useResource } from '@/composables/useResource'

const { data, status, error, scenario, load } = useResource(listMallCategories, 'mall-categories')
const { draft, resetDraft, storageAvailable } = useDraft('mall-categories')
</script>

<template>
  <div>
    <ModuleHeader
      title="商城类目"
      description="查看商城使用的类目。本次为只读预览，添加和删除将在后续任务提供。"
    >
      <ElButton :loading="status === 'loading'" @click="load">刷新数据</ElButton>
    </ModuleHeader>
    <PreviewScenario v-model="scenario" />
    <ResourceState :status="status" :error="error" @retry="load">
      <div class="table-scroll">
        <ElTable :data="data?.items ?? []" row-key="id" class="preview-table">
          <ElTableColumn prop="name" label="类目名称" min-width="240" />
          <ElTableColumn prop="id" label="类目标识" min-width="240" />
        </ElTable>
      </div>
      <p class="table-footer">共 {{ data?.total }} 个商城类目</p>
    </ResourceState>
    <DraftNote v-model="draft.note" :storage-available="storageAvailable" @reset="resetDraft" />
  </div>
</template>
