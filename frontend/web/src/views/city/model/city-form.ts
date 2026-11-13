/**
 * 城市表单的数据模型：表单默认值、表单与接口数据的互相转换、校验规则。
 *
 * 这里只放纯函数和常量：不依赖 Vue，不调用接口，不读写页面状态，所以可以直接写单元测试。
 * 页面上的业务规则（新增时配送方式默认为快递、修改时不提交州、选择州后预填时区等）都集中在这里，
 * composables 和组件只调用这些函数，不自己判断。
 *
 * 其他模块照着写时要改的地方：
 * - 表单类型 XxxForm：字段与契约的 XxxCreateInput 对应。表单中「还没选」的字段用 null 表示，
 *   提交前由转换函数确认已经填写。
 * - createDefaultXxxForm / xxxToForm / formToCreateInput / formToUpdateInput：按本模块的字段改写。
 *   修改请求体只包含契约 XxxUpdateInput 中的字段，创建后不能修改的字段不要放进去。
 * - createXxxFormRules：校验规则与契约的 minLength、maxLength、required 保持一致。
 *   校验逻辑写成 checkXxx 纯函数，规则只负责调用它，便于测试。
 * - 本模块特有的规则（如本文件的州与时区）换成本模块自己的规则。
 */
import type { FormItemRule, FormRules } from 'element-plus'
import type {
  AustralianState,
  City,
  CityCreateInput,
  CityUpdateInput,
  Fulfillment,
} from '@/api/city'

/** 表单模式：新增时可以选州；编辑时州只读，也不校验。 */
export type CityFormMode = 'create' | 'edit'

/** 城市表单。state 和 sort 在新增时可能还没有填写，用 null 表示。 */
export interface CityForm {
  nameZh: string
  nameEn: string
  fulfillment: Fulfillment
  state: AustralianState | null
  timezone: string
  sort: number | null
}

/** 中文名、英文名的最大长度，与契约 City.nameZh、City.nameEn 的 maxLength 一致。 */
export const CITY_NAME_ZH_MAX_LENGTH = 20
export const CITY_NAME_EN_MAX_LENGTH = 40

/** 新增城市时的默认配送方式：快递。见 PRD 第 11 节「添加城市时默认快递」。 */
export const DEFAULT_FULFILLMENT: Fulfillment = 'post'

/**
 * 新增城市时，按州预填的时区。见字段清单「City 城市」。
 * 州不能唯一确定时区（如 NSW 的 Broken Hill 用阿德莱德时间），所以只用来预填，店员可以修改。
 * 类型为 Record<AustralianState, string>：契约增加州时，类型检查会提示这里补上。
 */
export const STATE_DEFAULT_TIMEZONE: Readonly<Record<AustralianState, string>> = {
  NSW: 'Australia/Sydney',
  VIC: 'Australia/Melbourne',
  QLD: 'Australia/Brisbane',
  WA: 'Australia/Perth',
  SA: 'Australia/Adelaide',
  TAS: 'Australia/Hobart',
  ACT: 'Australia/Sydney',
  NT: 'Australia/Darwin',
}

/**
 * 时区下拉框的选项：各州预填的时区，加上州内与州首府不同的几个时区。
 * 编辑已有城市时，如果它的时区不在这里，表单仍保留原值，不会被清空。
 */
export const TIMEZONE_OPTIONS: readonly string[] = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Hobart',
  'Australia/Darwin',
  'Australia/Broken_Hill',
  'Australia/Lord_Howe',
  'Australia/Eucla',
]

/**
 * 新增城市时的默认排序：现有城市中最大的 sort 加 1，没有城市时为 1。
 * 参数：现有城市列表。返回：整数。
 */
export function nextCitySort(cities: readonly Pick<City, 'sort'>[]): number {
  if (cities.length === 0) return 1
  return Math.max(...cities.map((city) => city.sort)) + 1
}

/**
 * 新增表单的默认值。
 * 参数：现有城市列表，用来计算默认排序。返回：新的表单对象。
 */
export function createDefaultCityForm(cities: readonly Pick<City, 'sort'>[]): CityForm {
  return {
    nameZh: '',
    nameEn: '',
    fulfillment: DEFAULT_FULFILLMENT,
    state: null,
    timezone: '',
    sort: nextCitySort(cities),
  }
}

/**
 * 把已有城市转为编辑表单。
 * 参数：接口返回的城市。返回：新的表单对象，不引用原对象。
 */
export function cityToForm(city: City): CityForm {
  return {
    nameZh: city.nameZh,
    nameEn: city.nameEn,
    fulfillment: city.fulfillment,
    state: city.state,
    timezone: city.timezone,
    sort: city.sort,
  }
}

/**
 * 选择州之后，计算时区输入框应该显示的值。
 * 规则：时区为空，或者仍是上一个州的预填值（店员没有改过）时，换成新州的预填值；
 * 店员手动改过的时区保持不变。
 * 参数：当前时区、上一个州（没有选过时为 null）、新选的州。返回：时区。
 */
export function prefillTimezone(
  currentTimezone: string,
  previousState: AustralianState | null,
  nextState: AustralianState,
): string {
  const untouched =
    currentTimezone.trim() === '' ||
    (previousState !== null && currentTimezone === STATE_DEFAULT_TIMEZONE[previousState])
  return untouched ? STATE_DEFAULT_TIMEZONE[nextState] : currentTimezone
}

/**
 * 确认排序已经填写。表单校验通过后不会出现 null，这里是防止跳过校验直接提交。
 * 参数：表单中的排序。返回：整数。失败时抛出 TypeError。
 */
function requireSort(sort: number | null): number {
  if (sort === null || !Number.isSafeInteger(sort)) throw new TypeError('city-form-sort-missing')
  return sort
}

/**
 * 表单转为新增请求体。名称去掉首尾空格。
 * 参数：已通过校验的表单。返回：CityCreateInput。
 * 州或排序没有填写时抛出 TypeError：说明调用方没有先校验表单。
 */
export function formToCreateInput(form: CityForm): CityCreateInput {
  if (form.state === null) throw new TypeError('city-form-state-missing')
  return {
    nameZh: form.nameZh.trim(),
    nameEn: form.nameEn.trim(),
    fulfillment: form.fulfillment,
    state: form.state,
    timezone: form.timezone.trim(),
    sort: requireSort(form.sort),
  }
}

/**
 * 表单转为修改请求体。名称去掉首尾空格。
 * **不包含 state**：州创建后不能修改，契约规定请求中出现 state 时返回 VALIDATION_FAILED。
 * 参数：已通过校验的表单。返回：CityUpdateInput。排序没有填写时抛出 TypeError。
 */
export function formToUpdateInput(form: CityForm): CityUpdateInput {
  return {
    nameZh: form.nameZh.trim(),
    nameEn: form.nameEn.trim(),
    fulfillment: form.fulfillment,
    timezone: form.timezone.trim(),
    sort: requireSort(form.sort),
  }
}

/**
 * 列表中直接切换配送方式（线下 ↔ 快递）时的修改请求体。
 * 修改接口要求带上全部可编辑字段，所以其他字段沿用这一行城市的当前值。不包含 state。
 * 参数：列表中的城市。返回：CityUpdateInput。
 */
export function toggleFulfillmentInput(city: City): CityUpdateInput {
  return {
    nameZh: city.nameZh,
    nameEn: city.nameEn,
    fulfillment: city.fulfillment === 'local' ? 'post' : 'local',
    timezone: city.timezone,
    sort: city.sort,
  }
}

/**
 * 检查名称。去掉首尾空格后不能为空，长度不能超过上限（按字符计算，与契约 maxLength 一致）。
 * 参数：输入值、字段中文名、最大长度。返回：错误提示；没有错误时为 null。
 */
export function checkCityName(value: unknown, label: string, maxLength: number): string | null {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text === '') return `请填写${label}`
  if ([...text].length > maxLength) return `${label}不能超过 ${maxLength} 个字符`
  return null
}

/**
 * 检查州。参数：输入值。返回：错误提示；没有错误时为 null。
 */
export function checkCityState(value: unknown): string | null {
  return typeof value === 'string' && Object.hasOwn(STATE_DEFAULT_TIMEZONE, value)
    ? null
    : '请选择所属州'
}

/**
 * 检查时区。只检查是否填写；是否为有效的 IANA 时区名由服务器判断，不通过时返回 VALIDATION_FAILED。
 * 参数：输入值。返回：错误提示；没有错误时为 null。
 */
export function checkCityTimezone(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? null : '请选择时区'
}

/**
 * 检查排序。必须是整数。参数：输入值。返回：错误提示；没有错误时为 null。
 */
export function checkCitySort(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return '请填写排序'
  return typeof value === 'number' && Number.isSafeInteger(value) ? null : '排序必须是整数'
}

/** 表单中可能出现校验错误的字段。 */
export type CityFormField = keyof CityForm

/**
 * 查询服务器返回的字段错误（VALIDATION_FAILED 的 details）。
 * 参数：字段名、字段当前的值。返回：错误提示；没有错误，或店员已经改过这个字段时为 null。
 */
export type ServerFieldErrorLookup = (field: CityFormField, value: unknown) => string | null

/**
 * 把 checkXxx 函数包装成 Element Plus 的校验规则。
 * 先做本地检查；本地检查通过后，再看服务器是否对这个字段返回过错误。
 * 这样服务器的字段错误也显示在对应输入框下面，店员修改后自动消失。
 * 参数：字段名、检查函数、服务器字段错误的查询函数。返回：一条规则，在输入和失去焦点时触发。
 */
function ruleOf(
  field: CityFormField,
  check: (value: unknown) => string | null,
  serverError: ServerFieldErrorLookup,
): FormItemRule {
  return {
    trigger: ['blur', 'change'],
    validator(_rule, value, callback) {
      const message = check(value) ?? serverError(field, value)
      callback(message === null ? undefined : new Error(message))
    },
  }
}

/**
 * 城市表单的校验规则。
 * 参数：表单模式（编辑时州只读，不校验）；可选的服务器字段错误查询函数。
 * 返回：交给 ElForm 的 rules。
 */
export function createCityFormRules(
  mode: CityFormMode,
  serverError: ServerFieldErrorLookup = () => null,
): FormRules<CityForm> {
  const rules: FormRules<CityForm> = {
    nameZh: [
      ruleOf(
        'nameZh',
        (value) => checkCityName(value, '中文名', CITY_NAME_ZH_MAX_LENGTH),
        serverError,
      ),
    ],
    nameEn: [
      ruleOf(
        'nameEn',
        (value) => checkCityName(value, '英文名', CITY_NAME_EN_MAX_LENGTH),
        serverError,
      ),
    ],
    fulfillment: [ruleOf('fulfillment', () => null, serverError)],
    timezone: [ruleOf('timezone', checkCityTimezone, serverError)],
    sort: [ruleOf('sort', checkCitySort, serverError)],
  }
  if (mode === 'create') rules.state = [ruleOf('state', checkCityState, serverError)]
  return rules
}

/**
 * 切换配送方式成功后的提示。
 * 改成线下后，城市模块看不到配送大区，只能提醒店员去配送页确认可送的区（见 PRD 第 10、11 节）。
 * 参数：切换后的配送方式。返回：提示文案。
 */
export function fulfillmentChangedMessage(city: Pick<City, 'nameZh' | 'fulfillment'>): string {
  return city.fulfillment === 'local'
    ? `${city.nameZh}已改为线下配送。请到配送页确认可送的区，没有可送的区时新订单不能付款。`
    : `${city.nameZh}已改为快递。全市可下单，满包邮门槛免邮费。`
}
