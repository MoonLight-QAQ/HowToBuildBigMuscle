<script setup lang="ts">
import { getDelivery } from '@/api/delivery'
import DraftNote from '@/components/DraftNote.vue'
import ModuleHeader from '@/components/ModuleHeader.vue'
import PreviewScenario from '@/components/PreviewScenario.vue'
import ResourceState from '@/components/ResourceState.vue'
import { useDraft } from '@/composables/useDraft'
import { useResource } from '@/composables/useResource'

const { data, status, error, scenario, load } = useResource(getDelivery, 'delivery')
const { draft, resetDraft, storageAvailable } = useDraft('delivery')
</script>

<template>
  <div>
    <ModuleHeader
      title="配送"
      description="查看费用、可送区和送达时段。本次为只读预览，配置保存将在后续任务提供。"
    >
      <ElButton :loading="status === 'loading'" @click="load">刷新数据</ElButton>
    </ModuleHeader>
    <PreviewScenario v-model="scenario" />
    <ResourceState :status="status" :error="error" @retry="load">
      <div v-if="data" class="delivery-preview">
        <dl class="delivery-fees">
          <div>
            <dt>线下配送费（元）</dt>
            <dd>{{ data.localFeeText }}</dd>
          </div>
          <div>
            <dt>快递邮费（元）</dt>
            <dd>{{ data.postFeeText }}</dd>
          </div>
          <div>
            <dt>快递包邮门槛（元）</dt>
            <dd>{{ data.freePostThresholdText }}</dd>
          </div>
        </dl>
        <section class="delivery-section">
          <h2>线下可送区</h2>
          <div class="table-scroll">
            <ElTable :data="data.areas" row-key="id" class="preview-table">
              <ElTableColumn prop="cityNameZh" label="城市" min-width="160" />
              <ElTableColumn prop="name" label="区" min-width="240" />
              <ElTableColumn prop="availabilityLabel" label="配送范围" min-width="140" />
            </ElTable>
          </div>
        </section>
        <section class="delivery-section">
          <h2>送达时段</h2>
          <div class="table-scroll">
            <ElTable :data="data.timeSlots" row-key="id" class="preview-table">
              <ElTableColumn prop="name" label="时段名称" min-width="160" />
              <ElTableColumn prop="rangeText" label="钟点" min-width="240" />
              <ElTableColumn prop="statusLabel" label="状态" min-width="140" />
            </ElTable>
          </div>
        </section>
      </div>
    </ResourceState>
    <DraftNote v-model="draft.note" :storage-available="storageAvailable" @reset="resetDraft" />
  </div>
</template>
