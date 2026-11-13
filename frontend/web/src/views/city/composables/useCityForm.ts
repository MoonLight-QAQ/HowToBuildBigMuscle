/**
 * 新增、编辑城市弹窗的状态：打开和关闭、表单数据、提交和错误处理。
 *
 * 职责：
 * - 打开新增或编辑时，用 model/city-form.ts 生成表单初始值。
 * - 选择州时，按 model 的规则预填时区。
 * - 提交：新增时调用 createCity，编辑时调用 updateCity（请求体不包含 state）。
 *   成功后关闭弹窗，并通知页面重新加载列表。
 * - 错误处理：
 *   - VALIDATION_FAILED：details 中属于表单的字段，显示在对应输入框下面（通过校验规则，见 model 的
 *     createCityFormRules）；不属于表单的字段，显示在表单顶部。
 *   - NAME_DUPLICATED 等其他业务错误：文案取自 ApiError.message（来自 src/constants/error-code.ts），
 *     显示在表单顶部，弹窗保持打开，店员修改后可以再次提交。
 *   - NOT_FOUND（编辑的城市已不存在）：除了提示，还通知页面重新加载列表。
 *
 * 表单的本地校验由组件中的 ElForm 完成，校验通过后才调用 submit()。
 *
 * 其他模块照着写时要改的地方：
 * - 换成本模块的 model 函数和接口函数。
 * - 本模块特有的联动（如本文件的 selectState 预填时区）换成本模块的。
 * - 需要特殊处理的错误码（如本文件的 NOT_FOUND）按契约中写明的错误码调整。
 */
import { computed, readonly, ref, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'
import { createCity, updateCity, type AustralianState, type City } from '@/api/city'
import { isErrorCode } from '@/api/http'
import { ERROR_CODE } from '@/constants/error-code'
import {
  cityToForm,
  createCityFormRules,
  createDefaultCityForm,
  formToCreateInput,
  formToUpdateInput,
  prefillTimezone,
  type CityForm,
  type CityFormField,
  type CityFormMode,
} from '../model/city-form'
import { toErrorMessage } from './useCityList'

/** 服务器返回的字段错误，以及提交时该字段的值。字段的值改变后，这条错误不再显示。 */
interface ServerFieldError {
  message: string
  value: unknown
}

const FORM_FIELDS: readonly CityFormField[] = [
  'nameZh',
  'nameEn',
  'fulfillment',
  'state',
  'timezone',
  'sort',
]

/** 判断 details 中的字段是否属于表单。 */
function isFormField(field: string): field is CityFormField {
  return (FORM_FIELDS as readonly string[]).includes(field)
}

export interface UseCityFormOptions {
  /** 保存成功、或发现城市已不存在时调用，页面在这里重新加载列表。 */
  onSaved: () => unknown
}

export function useCityForm(options: UseCityFormOptions) {
  const visible = ref(false)
  const mode = ref<CityFormMode>('create')
  /** 编辑中的城市 id；新增时为 null。 */
  const editingId = ref<string | null>(null)
  const form = ref<CityForm>(createDefaultCityForm([]))
  const submitting = ref(false)
  /** 显示在表单顶部的错误；没有时为 null。 */
  const formError = ref<string | null>(null)
  const serverFieldErrors = shallowRef<Partial<Record<CityFormField, ServerFieldError>>>({})

  /** 查询服务器返回的字段错误。字段的值已经改过时，不再显示这条错误。 */
  function lookupServerError(field: CityFormField, value: unknown): string | null {
    const error = serverFieldErrors.value[field]
    return error !== undefined && Object.is(error.value, value) ? error.message : null
  }

  const rules = computed(() => createCityFormRules(mode.value, lookupServerError))
  /** 有服务器错误的字段。组件收到后重新校验这些字段，让错误显示在输入框下面。 */
  const serverErrorFields = computed(() => Object.keys(serverFieldErrors.value) as CityFormField[])

  /** 清除上一次提交留下的错误。 */
  function clearErrors(): void {
    formError.value = null
    serverFieldErrors.value = {}
  }

  /**
   * 打开新增弹窗。
   * 参数：现有城市列表，用来计算默认排序。
   */
  function openCreate(cities: readonly City[]): void {
    mode.value = 'create'
    editingId.value = null
    form.value = createDefaultCityForm(cities)
    clearErrors()
    visible.value = true
  }

  /**
   * 打开编辑弹窗。
   * 参数：要编辑的城市。
   */
  function openEdit(city: City): void {
    mode.value = 'edit'
    editingId.value = city.id
    form.value = cityToForm(city)
    clearErrors()
    visible.value = true
  }

  /** 关闭弹窗。提交过程中不能关闭。 */
  function close(): void {
    if (submitting.value) return
    visible.value = false
  }

  /**
   * 选择州，并按规则预填时区。只在新增时有效：编辑时州只读。
   * 参数：新选的州。
   */
  function selectState(state: AustralianState): void {
    if (mode.value !== 'create') return
    form.value.timezone = prefillTimezone(form.value.timezone, form.value.state, state)
    form.value.state = state
  }

  /** 把 VALIDATION_FAILED 的 details 分到表单字段和表单顶部。 */
  function applyValidationDetails(details: readonly { field: string; message: string }[]): void {
    const fieldErrors: Partial<Record<CityFormField, ServerFieldError>> = {}
    const others: string[] = []
    for (const detail of details) {
      if (isFormField(detail.field)) {
        fieldErrors[detail.field] = { message: detail.message, value: form.value[detail.field] }
      } else {
        others.push(`${detail.field}：${detail.message}`)
      }
    }
    serverFieldErrors.value = fieldErrors
    formError.value = [ERROR_CODE.VALIDATION_FAILED.message, ...others].join('；')
  }

  /**
   * 提交表单。调用前组件应先完成本地校验。
   * 返回：是否保存成功。重复点击时，第二次直接返回 false。
   */
  async function submit(): Promise<boolean> {
    if (submitting.value) return false
    submitting.value = true
    clearErrors()
    try {
      if (mode.value === 'create') {
        await createCity(formToCreateInput(form.value))
        ElMessage.success('城市已添加')
      } else {
        await updateCity(editingId.value!, formToUpdateInput(form.value))
        ElMessage.success('城市已保存')
      }
      visible.value = false
      await options.onSaved()
      return true
    } catch (cause) {
      if (isErrorCode(cause, ERROR_CODE.VALIDATION_FAILED)) {
        applyValidationDetails(cause.details)
      } else {
        formError.value = toErrorMessage(cause)
        if (isErrorCode(cause, ERROR_CODE.NOT_FOUND)) await options.onSaved()
      }
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    visible: readonly(visible),
    mode: readonly(mode),
    form,
    rules,
    submitting: readonly(submitting),
    formError: readonly(formError),
    serverErrorFields,
    openCreate,
    openEdit,
    close,
    selectState,
    submit,
  }
}
