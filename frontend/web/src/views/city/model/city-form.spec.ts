/**
 * city-form.ts 的单元测试。每个导出的函数都有测试，重点是：
 * - 修改请求体不包含 state
 * - 每个州预填的时区
 *
 * 其他模块照着写时：按 model 中的函数逐个写测试；契约规定「不能修改」的字段，
 * 要用 not.toHaveProperty 断言修改请求体中没有它。
 */
import { describe, expect, it } from 'vitest'
import type { FormItemRule } from 'element-plus'
import type { AustralianState, City } from '@/api/city'
import {
  checkCityName,
  checkCitySort,
  checkCityState,
  checkCityTimezone,
  cityToForm,
  createCityFormRules,
  createDefaultCityForm,
  formToCreateInput,
  formToUpdateInput,
  fulfillmentChangedMessage,
  nextCitySort,
  prefillTimezone,
  STATE_DEFAULT_TIMEZONE,
  TIMEZONE_OPTIONS,
  toggleFulfillmentInput,
  type CityForm,
} from './city-form'

const sydney: City = {
  id: '1854239876543209472',
  nameZh: '悉尼',
  nameEn: 'Sydney',
  fulfillment: 'local',
  state: 'NSW',
  timezone: 'Australia/Sydney',
  sort: 1,
}

const canberra: City = {
  id: '1854239876543209473',
  nameZh: '堪培拉',
  nameEn: 'Canberra',
  fulfillment: 'post',
  state: 'ACT',
  timezone: 'Australia/Sydney',
  sort: 5,
}

/** 一份填写完整的新增表单。 */
function filledForm(overrides: Partial<CityForm> = {}): CityForm {
  return {
    nameZh: '布里斯班',
    nameEn: 'Brisbane',
    fulfillment: 'post',
    state: 'QLD',
    timezone: 'Australia/Brisbane',
    sort: 3,
    ...overrides,
  }
}

describe('nextCitySort', () => {
  it('没有城市时为 1', () => {
    expect(nextCitySort([])).toBe(1)
  })

  it('取现有最大的 sort 加 1，与列表顺序无关', () => {
    expect(nextCitySort([{ sort: 5 }, { sort: 1 }, { sort: 3 }])).toBe(6)
  })

  it('sort 为负数时同样取最大值加 1', () => {
    expect(nextCitySort([{ sort: -3 }, { sort: -1 }])).toBe(0)
  })
})

describe('createDefaultCityForm', () => {
  it('配送方式默认为快递，州和时区为空，名称为空串', () => {
    expect(createDefaultCityForm([])).toEqual({
      nameZh: '',
      nameEn: '',
      fulfillment: 'post',
      state: null,
      timezone: '',
      sort: 1,
    })
  })

  it('排序默认为现有最大值加 1', () => {
    expect(createDefaultCityForm([sydney, canberra]).sort).toBe(6)
  })

  it('每次返回新对象，修改一份不影响下一份', () => {
    const first = createDefaultCityForm([])
    first.nameZh = '已修改'
    expect(createDefaultCityForm([]).nameZh).toBe('')
  })
})

describe('cityToForm', () => {
  it('逐个字段对应，不包含 id', () => {
    const form = cityToForm(sydney)
    expect(form).toEqual({
      nameZh: '悉尼',
      nameEn: 'Sydney',
      fulfillment: 'local',
      state: 'NSW',
      timezone: 'Australia/Sydney',
      sort: 1,
    })
    expect(form).not.toHaveProperty('id')
  })
})

describe('STATE_DEFAULT_TIMEZONE 与 prefillTimezone', () => {
  it.each<[AustralianState, string]>([
    ['NSW', 'Australia/Sydney'],
    ['VIC', 'Australia/Melbourne'],
    ['QLD', 'Australia/Brisbane'],
    ['WA', 'Australia/Perth'],
    ['SA', 'Australia/Adelaide'],
    ['TAS', 'Australia/Hobart'],
    ['ACT', 'Australia/Sydney'],
    ['NT', 'Australia/Darwin'],
  ])('%s 预填 %s', (state, timezone) => {
    expect(STATE_DEFAULT_TIMEZONE[state]).toBe(timezone)
    expect(prefillTimezone('', null, state)).toBe(timezone)
  })

  it('覆盖全部 8 个州', () => {
    expect(Object.keys(STATE_DEFAULT_TIMEZONE)).toHaveLength(8)
  })

  it('每个预填时区都在下拉选项中', () => {
    for (const timezone of Object.values(STATE_DEFAULT_TIMEZONE)) {
      expect(TIMEZONE_OPTIONS).toContain(timezone)
    }
  })

  it('时区仍是上一个州的预填值时，换成新州的预填值', () => {
    expect(prefillTimezone('Australia/Sydney', 'NSW', 'VIC')).toBe('Australia/Melbourne')
  })

  it('时区只有空格时视为没填，换成新州的预填值', () => {
    expect(prefillTimezone('  ', 'NSW', 'QLD')).toBe('Australia/Brisbane')
  })

  it('店员手动改过的时区保持不变', () => {
    expect(prefillTimezone('Australia/Broken_Hill', 'NSW', 'SA')).toBe('Australia/Broken_Hill')
  })

  it('没有选过州但已填写时区时，保持不变', () => {
    expect(prefillTimezone('Australia/Lord_Howe', null, 'NSW')).toBe('Australia/Lord_Howe')
  })
})

describe('formToCreateInput', () => {
  it('转为新增请求体，包含 state', () => {
    expect(formToCreateInput(filledForm())).toEqual({
      nameZh: '布里斯班',
      nameEn: 'Brisbane',
      fulfillment: 'post',
      state: 'QLD',
      timezone: 'Australia/Brisbane',
      sort: 3,
    })
  })

  it('名称和时区去掉首尾空格', () => {
    const input = formToCreateInput(
      filledForm({ nameZh: ' 布里斯班 ', nameEn: ' Brisbane ', timezone: ' Australia/Brisbane ' }),
    )
    expect(input.nameZh).toBe('布里斯班')
    expect(input.nameEn).toBe('Brisbane')
    expect(input.timezone).toBe('Australia/Brisbane')
  })

  it('没有选州时抛错', () => {
    expect(() => formToCreateInput(filledForm({ state: null }))).toThrow(TypeError)
  })

  it('没有填排序时抛错', () => {
    expect(() => formToCreateInput(filledForm({ sort: null }))).toThrow(TypeError)
  })
})

describe('formToUpdateInput', () => {
  it('修改请求体不包含 state', () => {
    const input = formToUpdateInput(cityToForm(sydney))
    expect(input).not.toHaveProperty('state')
  })

  it('只包含契约 CityUpdateInput 的字段', () => {
    expect(Object.keys(formToUpdateInput(cityToForm(sydney))).sort()).toEqual(
      ['fulfillment', 'nameEn', 'nameZh', 'sort', 'timezone'].sort(),
    )
  })

  it('名称和时区去掉首尾空格', () => {
    const input = formToUpdateInput(filledForm({ nameZh: ' 悉尼 ', nameEn: 'Sydney ' }))
    expect(input.nameZh).toBe('悉尼')
    expect(input.nameEn).toBe('Sydney')
  })

  it('没有填排序时抛错', () => {
    expect(() => formToUpdateInput(filledForm({ sort: null }))).toThrow(TypeError)
  })
})

describe('toggleFulfillmentInput', () => {
  it('线下改为快递，其他字段沿用原值', () => {
    expect(toggleFulfillmentInput(sydney)).toEqual({
      nameZh: '悉尼',
      nameEn: 'Sydney',
      fulfillment: 'post',
      timezone: 'Australia/Sydney',
      sort: 1,
    })
  })

  it('快递改为线下', () => {
    expect(toggleFulfillmentInput(canberra).fulfillment).toBe('local')
  })

  it('不包含 state 和 id', () => {
    const input = toggleFulfillmentInput(sydney)
    expect(input).not.toHaveProperty('state')
    expect(input).not.toHaveProperty('id')
  })
})

describe('checkCityName', () => {
  it.each([
    ['', '请填写中文名'],
    ['   ', '请填写中文名'],
    [undefined, '请填写中文名'],
    ['悉尼', null],
    ['一'.repeat(20), null],
    ['一'.repeat(21), '中文名不能超过 20 个字符'],
    [` ${'一'.repeat(20)} `, null],
  ])('中文名 %j → %j', (value, expected) => {
    expect(checkCityName(value, '中文名', 20)).toBe(expected)
  })

  it('按字符计算长度，一个 emoji 算一个字符', () => {
    expect(checkCityName('😀'.repeat(20), '中文名', 20)).toBeNull()
  })
})

describe('checkCityState', () => {
  it.each([
    ['NSW', null],
    ['NT', null],
    [null, '请选择所属州'],
    ['', '请选择所属州'],
    ['nsw', '请选择所属州'],
    ['toString', '请选择所属州'],
  ])('%j → %j', (value, expected) => {
    expect(checkCityState(value)).toBe(expected)
  })
})

describe('checkCityTimezone', () => {
  it.each([
    ['Australia/Sydney', null],
    ['', '请选择时区'],
    ['  ', '请选择时区'],
    [null, '请选择时区'],
  ])('%j → %j', (value, expected) => {
    expect(checkCityTimezone(value)).toBe(expected)
  })
})

describe('checkCitySort', () => {
  it.each([
    [1, null],
    [0, null],
    [-2, null],
    [null, '请填写排序'],
    [undefined, '请填写排序'],
    ['', '请填写排序'],
    [1.5, '排序必须是整数'],
    ['1', '排序必须是整数'],
    [Number.NaN, '排序必须是整数'],
  ])('%j → %j', (value, expected) => {
    expect(checkCitySort(value)).toBe(expected)
  })
})

describe('createCityFormRules', () => {
  /** 直接调用规则的 validator，返回错误信息；通过时返回 null。 */
  function runRule(rules: unknown, value: unknown): string | null {
    const [rule] = rules as FormItemRule[]
    let result: string | null = null
    rule!.validator!(
      {} as never,
      value,
      (error?: string | Error) => {
        result = error instanceof Error ? error.message : (error ?? null)
      },
      {},
      {},
    )
    return result
  }

  it('新增时校验州', () => {
    const rules = createCityFormRules('create')
    expect(runRule(rules.state, null)).toBe('请选择所属州')
    expect(runRule(rules.state, 'VIC')).toBeNull()
  })

  it('编辑时不校验州', () => {
    expect(createCityFormRules('edit')).not.toHaveProperty('state')
  })

  it('名称的长度上限与契约一致：中文 20、英文 40', () => {
    const rules = createCityFormRules('create')
    expect(runRule(rules.nameZh, '一'.repeat(21))).toBe('中文名不能超过 20 个字符')
    expect(runRule(rules.nameEn, 'a'.repeat(40))).toBeNull()
    expect(runRule(rules.nameEn, 'a'.repeat(41))).toBe('英文名不能超过 40 个字符')
  })

  it('时区和排序必填', () => {
    const rules = createCityFormRules('edit')
    expect(runRule(rules.timezone, '')).toBe('请选择时区')
    expect(runRule(rules.sort, null)).toBe('请填写排序')
  })

  it('本地检查通过后，显示服务器返回的字段错误', () => {
    const rules = createCityFormRules('edit', (field, value) =>
      field === 'timezone' && value === 'Australia/Nowhere' ? '必须是有效的 IANA 时区名' : null,
    )
    expect(runRule(rules.timezone, 'Australia/Nowhere')).toBe('必须是有效的 IANA 时区名')
    expect(runRule(rules.timezone, 'Australia/Sydney')).toBeNull()
  })

  it('本地检查不通过时，优先显示本地的提示', () => {
    const rules = createCityFormRules('edit', () => '服务器错误')
    expect(runRule(rules.nameZh, '')).toBe('请填写中文名')
  })

  it('fulfillment 本地不校验，只显示服务器错误', () => {
    expect(runRule(createCityFormRules('edit').fulfillment, 'post')).toBeNull()
    expect(runRule(createCityFormRules('edit', () => '无效').fulfillment, 'x')).toBe('无效')
  })
})

describe('fulfillmentChangedMessage', () => {
  it('改为线下时，提醒去配送页确认可送的区', () => {
    expect(fulfillmentChangedMessage({ nameZh: '悉尼', fulfillment: 'local' })).toContain(
      '请到配送页确认可送的区',
    )
  })

  it('改为快递时，说明全市可下单', () => {
    expect(fulfillmentChangedMessage({ nameZh: '堪培拉', fulfillment: 'post' })).toContain(
      '全市可下单',
    )
  })
})
