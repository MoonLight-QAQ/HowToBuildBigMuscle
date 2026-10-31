<script setup lang="ts">
import type { ApiError } from '@/api/http'

defineProps<{
  status: 'loading' | 'success' | 'empty' | 'error'
  error: ApiError | null
}>()
const emit = defineEmits<{ retry: [] }>()

/**
 * Retry requests another load through the parent data layer.
 * 中文：通知父级重新加载；参数：无；返回：无；副作用：发出 retry 事件，不直接发请求。
 * Parameters: none. Returns: void. Effect: emits retry without making a request.
 */
function retry(): void {
  emit('retry')
}
</script>

<template>
  <section class="resource-content" :aria-busy="status === 'loading'">
    <div v-if="status === 'loading'" class="resource-loading" role="status">
      <span class="visually-hidden">正在加载数据</span>
      <ElSkeleton :rows="5" animated />
    </div>
    <div v-else-if="status === 'error'" class="resource-error" role="alert">
      <ElAlert
        title="数据暂时无法显示"
        :description="error?.message ?? '加载失败，请重新加载。'"
        type="error"
        :closable="false"
        show-icon
      />
      <ElButton @click="retry">重新加载</ElButton>
    </div>
    <ElEmpty v-else-if="status === 'empty'" description="暂无数据">
      <ElButton @click="retry">重新加载</ElButton>
    </ElEmpty>
    <slot v-else />
  </section>
</template>
