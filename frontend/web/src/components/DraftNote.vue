<script setup lang="ts">
defineProps<{ storageAvailable: boolean }>()
const note = defineModel<string>({ required: true })
const emit = defineEmits<{ reset: [] }>()

/**
 * ResetNote asks the parent to clear the integration note.
 * 中文：请求清空联调备注；参数：无；返回：无；副作用：发出 reset 事件，不修改业务数据。
 * Parameters: none. Returns: void. Effect: emits reset without changing business data.
 */
function resetNote(): void {
  emit('reset')
}
</script>

<template>
  <section class="draft-note" aria-label="联调备注草稿">
    <div class="draft-note-heading">
      <label for="integration-note">联调备注草稿</label>
      <ElButton text :disabled="note.length === 0" @click="resetNote">清空备注</ElButton>
    </div>
    <p v-if="storageAvailable" class="secondary-copy">
      仅本次浏览器会话，切换模块后保留。不会提交业务数据。
    </p>
    <p v-else class="secondary-copy" role="status">
      浏览器会话存储不可用，备注暂存在当前页面进程中。不会提交业务数据。
    </p>
    <ElInput
      id="integration-note"
      v-model="note"
      type="textarea"
      :rows="3"
      :maxlength="1000"
      show-word-limit
      placeholder="记录需要对齐的字段或页面反馈"
      aria-label="联调备注草稿，仅本次浏览器会话"
    />
  </section>
</template>
