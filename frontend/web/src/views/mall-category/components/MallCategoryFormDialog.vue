<!--
  新增商城类目的弹窗。类目不能修改，所以只有新增。

  只负责显示和收集输入：表单数据通过 v-model:form 传入，其他状态通过 props 传入，
  操作通过事件通知页面。不调用接口，不使用 composables，不写业务规则。
  - 中英文名：使用通用组件 BilingualInput，两个都必填。
  - 排序：必填（契约 MallCategoryInput 要求），打开时已预填默认值，可以修改。
  - 提交：先用 ElForm 做本地校验，通过后发出 submit。
  - 服务器返回字段错误（serverErrorFields 变化）时，重新校验这些字段，让错误显示在输入框下面。
-->
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import BilingualInput from '@/components/BilingualInput.vue'
import {
  MALL_CATEGORY_NAME_EN_MAX_LENGTH,
  MALL_CATEGORY_NAME_ZH_MAX_LENGTH,
  type MallCategoryForm,
  type MallCategoryFormField,
} from '../model/mall-category-form'

const props = defineProps<{
  visible: boolean
  rules: FormRules<MallCategoryForm>
  submitting: boolean
  /** 显示在表单顶部的错误；没有时为 null。 */
  formError: string | null
  /** 有服务器错误的字段。 */
  serverErrorFields: readonly MallCategoryFormField[]
}>()

const emit = defineEmits<{
  close: []
  submit: []
}>()

const form = defineModel<MallCategoryForm>('form', { required: true })
const formRef = ref<FormInstance>()

/** 每次打开时清除上一次的校验结果。 */
watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    await nextTick()
    formRef.value?.clearValidate()
  },
)

/** 收到服务器的字段错误后，重新校验这些字段，错误显示在对应输入框下面。 */
watch(
  () => props.serverErrorFields,
  async (fields) => {
    if (fields.length === 0) return
    await nextTick()
    // 校验不通过时 validateField 会 reject，这正是想要的结果，不需要处理。
    await formRef.value?.validateField([...fields]).catch(() => undefined)
  },
)

/** 本地校验通过后通知页面提交。 */
async function onSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (valid) emit('submit')
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="添加类目"
    width="480px"
    :close-on-click-modal="false"
    :before-close="() => emit('close')"
  >
    <el-alert
      v-if="formError !== null"
      class="mall-category-form__error"
      type="error"
      :title="formError"
      :closable="false"
      show-icon
    />

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="类目名称" required>
        <BilingualInput
          v-model:zh="form.nameZh"
          v-model:en="form.nameEn"
          prop-zh="nameZh"
          prop-en="nameEn"
          :maxlength-zh="MALL_CATEGORY_NAME_ZH_MAX_LENGTH"
          :maxlength-en="MALL_CATEGORY_NAME_EN_MAX_LENGTH"
        />
      </el-form-item>

      <el-form-item label="排序" prop="sort" required>
        <el-input-number
          v-model="form.sort"
          :min="0"
          :step="1"
          :precision="0"
          :value-on-clear="null"
        />
        <div class="mall-category-form__hint">数字越小越靠前。类目添加后不能修改，只能删除。</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="submitting" @click="emit('close')">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.mall-category-form__error {
  margin-bottom: $space-md;
}

.mall-category-form__hint {
  width: 100%;
  font-size: $font-size-small;
  color: $text-secondary;
}
</style>
