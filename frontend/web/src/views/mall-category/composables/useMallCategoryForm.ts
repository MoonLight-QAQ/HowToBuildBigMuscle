/**
 * 新增商城类目弹窗的状态：打开和关闭、表单数据、提交和错误处理。
 *
 * 职责：
 * - 打开时用 model/mall-category-form.ts 生成表单初始值（排序默认为现有最大值加 1）。
 * - 提交：调用 createMallCategory。成功后提示、关闭弹窗，并通知页面重新加载列表。
 * - 错误处理：
 *   - VALIDATION_FAILED：details 中属于表单的字段，显示在对应输入框下面（通过校验规则，见 model 的
 *     createMallCategoryFormRules）；不属于表单的字段，显示在表单顶部。
 *   - NAME_DUPLICATED 等其他错误：文案取自 ApiError.message（来自 src/constants/error-code.ts），
 *     显示在表单顶部，弹窗保持打开，店员修改后可以再次提交。
 *
 * 类目不能修改，所以只有新增，没有编辑模式。
 * 表单的本地校验由组件中的 ElForm 完成，校验通过后才调用 submit()。
 */
import { computed, readonly, ref, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'
import { createMallCategory, type MallCategory } from '@/api/mall-category'
import { isErrorCode } from '@/api/http'
import { ERROR_CODE } from '@/constants/error-code'
import {
  createDefaultMallCategoryForm,
  createMallCategoryFormRules,
  formToCreateInput,
  mallCategoryCreatedMessage,
  type MallCategoryForm,
  type MallCategoryFormField,
} from '../model/mall-category-form'
import { toErrorMessage } from '../model/error-message'

/** 服务器返回的字段错误，以及提交时该字段的值。字段的值改变后，这条错误不再显示。 */
interface ServerFieldError {
  message: string
  value: unknown
}

const FORM_FIELDS: readonly MallCategoryFormField[] = ['nameZh', 'nameEn', 'sort']

/** 判断 details 中的字段是否属于表单。 */
function isFormField(field: string): field is MallCategoryFormField {
  return (FORM_FIELDS as readonly string[]).includes(field)
}

export interface UseMallCategoryFormOptions {
  /** 新增成功后调用，页面在这里重新加载列表。 */
  onSaved: () => unknown
}

export function useMallCategoryForm(options: UseMallCategoryFormOptions) {
  const visible = ref(false)
  const form = ref<MallCategoryForm>(createDefaultMallCategoryForm([]))
  const submitting = ref(false)
  /** 显示在表单顶部的错误；没有时为 null。 */
  const formError = ref<string | null>(null)
  const serverFieldErrors = shallowRef<Partial<Record<MallCategoryFormField, ServerFieldError>>>({})

  /** 查询服务器返回的字段错误。字段的值已经改过时，不再显示这条错误。 */
  function lookupServerError(field: MallCategoryFormField, value: unknown): string | null {
    const error = serverFieldErrors.value[field]
    return error !== undefined && Object.is(error.value, value) ? error.message : null
  }

  const rules = computed(() => createMallCategoryFormRules(lookupServerError))
  /** 有服务器错误的字段。组件收到后重新校验这些字段，让错误显示在输入框下面。 */
  const serverErrorFields = computed(
    () => Object.keys(serverFieldErrors.value) as MallCategoryFormField[],
  )

  /** 清除上一次提交留下的错误。 */
  function clearErrors(): void {
    formError.value = null
    serverFieldErrors.value = {}
  }

  /**
   * 打开新增弹窗。
   * 参数：现有类目列表，用来计算默认排序。
   */
  function openCreate(categories: readonly MallCategory[]): void {
    form.value = createDefaultMallCategoryForm(categories)
    clearErrors()
    visible.value = true
  }

  /** 关闭弹窗。提交过程中不能关闭。 */
  function close(): void {
    if (submitting.value) return
    visible.value = false
  }

  /** 把 VALIDATION_FAILED 的 details 分到表单字段和表单顶部。 */
  function applyValidationDetails(details: readonly { field: string; message: string }[]): void {
    const fieldErrors: Partial<Record<MallCategoryFormField, ServerFieldError>> = {}
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
   * 返回：是否新增成功。重复点击时，第二次直接返回 false。
   */
  async function submit(): Promise<boolean> {
    if (submitting.value) return false
    submitting.value = true
    clearErrors()
    try {
      const created = await createMallCategory(formToCreateInput(form.value))
      ElMessage.success(mallCategoryCreatedMessage(created))
      visible.value = false
      await options.onSaved()
      return true
    } catch (cause) {
      if (isErrorCode(cause, ERROR_CODE.VALIDATION_FAILED)) {
        applyValidationDetails(cause.details)
      } else {
        formError.value = toErrorMessage(cause)
      }
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    visible: readonly(visible),
    form,
    rules,
    submitting: readonly(submitting),
    formError: readonly(formError),
    serverErrorFields,
    openCreate,
    close,
    submit,
  }
}
