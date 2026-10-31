<script setup lang="ts">
import { MOCK_SCENARIOS } from '@/constants/display'
import type { MockScenario } from '@/types/api'

const scenario = defineModel<MockScenario>({ required: true })
const mockEnabled = import.meta.env.VITE_USE_MOCK === 'true'
</script>

<template>
  <div v-if="mockEnabled" class="preview-scenario">
    <span class="preview-scenario-label">预览场景</span>
    <ElSelect v-model="scenario" aria-label="选择预览场景" class="scenario-select">
      <ElOption
        v-for="item in MOCK_SCENARIOS"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      />
    </ElSelect>
    <span class="secondary-copy">用于检查加载与错误反馈</span>
  </div>
</template>
