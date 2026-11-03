<script setup lang="ts">
import { useId } from 'vue'
import { ElInput } from 'element-plus'

withDefaults(defineProps<{ disabled?: boolean; maxlength?: number; required?: boolean }>(), {
  disabled: false,
  required: true,
})
// 父模型均初始化为空串，避免默认值不同步；保留输入供外层校验。 / Initialize both parent models to ''; preserve input.
const zh = defineModel<string>('zh', { default: '' })
const en = defineModel<string>('en', { default: '' })
const id = useId()
</script>

<template>
  <div class="bilingual-input">
    <div class="bilingual-input__field">
      <label :for="`${id}-zh`">中文</label>
      <ElInput
        :id="`${id}-zh`"
        v-model="zh"
        :disabled="disabled"
        :maxlength="maxlength"
        :required="required"
        :aria-required="required"
      />
    </div>
    <div class="bilingual-input__field">
      <label :for="`${id}-en`">英文</label>
      <ElInput
        :id="`${id}-en`"
        v-model="en"
        :disabled="disabled"
        :maxlength="maxlength"
        :required="required"
        :aria-required="required"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.bilingual-input,
.bilingual-input__field {
  display: grid;
  gap: $space-sm;
}
</style>
