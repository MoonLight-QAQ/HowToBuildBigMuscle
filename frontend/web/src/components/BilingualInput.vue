<script setup lang="ts">
import { useId } from 'vue'
import { ElFormItem, ElInput } from 'element-plus'

withDefaults(
  defineProps<{
    disabled?: boolean
    maxlengthZh?: number
    maxlengthEn?: number
    required?: boolean
    propZh?: string
    propEn?: string
  }>(),
  { disabled: false, required: true },
)
// 父模型均初始化为空串，避免默认值不同步；保留输入供外层校验。 / Initialize both parent models to ''; preserve input.
const zh = defineModel<string>('zh', { default: '' })
const en = defineModel<string>('en', { default: '' })
const id = useId()
</script>

<template>
  <div class="bilingual-input">
    <ElFormItem
      :prop="propZh"
      label="中文"
      :for="`${id}-zh`"
      label-position="top"
      :required="required"
    >
      <ElInput
        :id="`${id}-zh`"
        v-model="zh"
        :disabled="disabled"
        :maxlength="maxlengthZh"
        :required="required"
        :aria-required="required"
      />
    </ElFormItem>
    <ElFormItem
      :prop="propEn"
      label="英文"
      :for="`${id}-en`"
      label-position="top"
      :required="required"
    >
      <ElInput
        :id="`${id}-en`"
        v-model="en"
        :disabled="disabled"
        :maxlength="maxlengthEn"
        :required="required"
        :aria-required="required"
      />
    </ElFormItem>
  </div>
</template>

<style scoped lang="scss">
.bilingual-input {
  display: grid;
  gap: $space-sm;
}
</style>
