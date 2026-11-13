<!--
  新增、编辑城市的弹窗。

  只负责显示和收集输入：表单数据通过 v-model:form 传入，其他状态通过 props 传入，
  操作通过事件通知页面。不调用接口，不使用 composables，不写业务规则。
  - 中英文名：使用通用组件 BilingualInput，两个都必填。
  - 所属州：新增时必选；编辑时显示但只读。选择州时发出 select-state，由页面按规则预填时区，
    这里不直接修改 state。
  - 提交：先用 ElForm 做本地校验，通过后发出 submit。
  - 服务器返回字段错误（serverErrorFields 变化）时，重新校验这些字段，让错误显示在输入框下面。

  其他模块照着写时要改的地方：
  - 表单项换成本模块的字段；双语字段一律用 BilingualInput。
  - 有联动的字段（如本组件的州 → 时区）用事件交给页面处理，组件只负责显示。
  - 枚举选项从 src/constants/ 中取，长度上限从 model 中取。
-->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { AustralianState } from '@/api/city'
import BilingualInput from '@/components/BilingualInput.vue'
import { AUSTRALIAN_STATE_OPTIONS } from '@/constants/australian-state'
import { FULFILLMENT_OPTIONS } from '@/constants/fulfillment'
import {
  CITY_NAME_EN_MAX_LENGTH,
  CITY_NAME_ZH_MAX_LENGTH,
  TIMEZONE_OPTIONS,
  type CityForm,
  type CityFormField,
  type CityFormMode,
} from '../model/city-form'

const props = defineProps<{
  visible: boolean
  mode: CityFormMode
  rules: FormRules<CityForm>
  submitting: boolean
  /** 显示在表单顶部的错误；没有时为 null。 */
  formError: string | null
  /** 有服务器错误的字段。 */
  serverErrorFields: readonly CityFormField[]
}>()

const emit = defineEmits<{
  close: []
  submit: []
  'select-state': [state: AustralianState]
}>()

const form = defineModel<CityForm>('form', { required: true })
const formRef = ref<FormInstance>()
const title = computed(() => (props.mode === 'create' ? '添加城市' : '编辑城市'))

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
    :title="title"
    width="520px"
    :close-on-click-modal="false"
    :before-close="() => emit('close')"
  >
    <el-alert
      v-if="formError !== null"
      class="city-form__error"
      type="error"
      :title="formError"
      :closable="false"
      show-icon
    />

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="城市名称" required>
        <BilingualInput
          v-model:zh="form.nameZh"
          v-model:en="form.nameEn"
          prop-zh="nameZh"
          prop-en="nameEn"
          :maxlength-zh="CITY_NAME_ZH_MAX_LENGTH"
          :maxlength-en="CITY_NAME_EN_MAX_LENGTH"
        />
      </el-form-item>

      <el-form-item label="所属州" prop="state" :required="mode === 'create'">
        <el-select
          :model-value="form.state"
          :disabled="mode === 'edit'"
          placeholder="请选择所属州"
          @update:model-value="(state: AustralianState) => emit('select-state', state)"
        >
          <el-option
            v-for="option in AUSTRALIAN_STATE_OPTIONS"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          />
        </el-select>
        <div v-if="mode === 'edit'" class="city-form__hint">州创建后不能修改。</div>
      </el-form-item>

      <el-form-item label="时区" prop="timezone" required>
        <el-select v-model="form.timezone" filterable placeholder="选择州后自动预填，可以修改">
          <el-option v-for="timezone in TIMEZONE_OPTIONS" :key="timezone" :value="timezone" />
        </el-select>
      </el-form-item>

      <el-form-item label="配送方式" prop="fulfillment" required>
        <el-radio-group v-model="form.fulfillment">
          <el-radio v-for="option in FULFILLMENT_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="排序" prop="sort" required>
        <el-input-number v-model="form.sort" :step="1" :precision="0" :value-on-clear="null" />
        <div class="city-form__hint">数字越小越靠前。</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="submitting" @click="emit('close')">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.city-form__error {
  margin-bottom: $space-md;
}

.city-form__hint {
  width: 100%;
  font-size: $font-size-small;
  color: $text-secondary;
}
</style>
