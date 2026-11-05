import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import {
  displayClockTime,
  displayDateTime,
  displayLocalDate,
  formatClockTime,
  formatDateTime,
  formatLocalDate,
} from './date'

/** 中文：按真实城市时区处理冬夏令时和跨日。 English: Apply city zones, DST transitions and day rollover. */
it.each([
  ['2026-01-01T00:00:00Z', 'Australia/Sydney', '2026-01-01 11:00:00'],
  ['2026-07-01T00:00:00Z', 'Australia/Sydney', '2026-07-01 10:00:00'],
  ['2026-01-01T00:00:00Z', 'Australia/Perth', '2026-01-01 08:00:00'],
  ['2026-11-01T15:00:00Z', 'Australia/Sydney', '2026-11-02 02:00:00'],
  ['2026-11-01T13:00:00Z', 'Australia/Sydney', '2026-11-02 00:00:00'],
  ['2026-10-03T15:59:59Z', 'Australia/Sydney', '2026-10-04 01:59:59'],
  ['2026-10-03T16:00:00Z', 'Australia/Sydney', '2026-10-04 03:00:00'],
  ['2026-04-04T15:59:59Z', 'Australia/Sydney', '2026-04-05 02:59:59'],
  ['2026-04-04T16:00:00Z', 'Australia/Sydney', '2026-04-05 02:00:00'],
  ['2026-11-01T03:30:00.123456Z', 'UTC', '2026-11-01 03:30:00'],
  ['0001-01-01T00:00:00Z', 'UTC', '0001-01-01 00:00:00'],
])('时间点 %s 在 %s 正确显示', function testCityTime(utc, zone, expected) {
  expect(formatDateTime(utc, zone)).toBe(expected)
})

/** 中文：拒绝非法或非UTC时间点，不能悄悄滚动日期。 English: Reject invalid or non-UTC timestamps. */
it.each([
  '',
  '2026-11-01',
  '2026-11-01T03:30:00',
  '2026-11-01T03:30:00+00:00',
  '2026-02-30T03:30:00Z',
  '2026-13-01T00:00:00Z',
  '2026-11-01T24:00:00Z',
  '2026-11-01T00:60:00Z',
  '2026-11-01T00:00:60Z',
])('拒绝非法时间点 %j', function testInvalidInstant(value) {
  expect(() => formatDateTime(value, 'Australia/Sydney')).toThrow(RangeError)
})

/** 中文：必须显式传城市时区，不能依赖本机或固定偏移。 English: Reject absent, invalid and numeric-offset zones. */
it.each(['', 'Invalid/City', '+11:00', '-0800'])('拒绝非法时区 %j', function testInvalidZone(zone) {
  expect(() => formatDateTime('2026-11-01T00:00:00Z', zone)).toThrow(RangeError)
})

/** 中文：超出四位公历年的边界应拒绝，不能误显示纪元。 English: Reject dates outside four-digit AD output. */
it.each([
  ['0000-01-01T00:00:00Z', 'UTC'],
  ['0001-01-01T00:00:00Z', 'America/Los_Angeles'],
  ['9999-12-31T23:00:00Z', 'Australia/Sydney'],
])('拒绝越界公历时间 %s / %s', function testYearRange(utc, zone) {
  expect(() => formatDateTime(utc, zone)).toThrow(RangeError)
})

/** 中文：有效当地日期保持原日，不附加时区。 English: Preserve valid local calendar dates without zone shifts. */
it.each(['2026-11-02', '2024-02-29', '2000-02-29'])(
  '当地日期 %s 不转UTC',
  function testLocalDate(value) {
    expect(formatLocalDate(value)).toBe(value)
  },
)

/** 中文：拒绝不存在的当地日期和不规范格式。 English: Reject nonexistent or malformed local dates. */
it.each(['2026-02-29', '2026-02-30', '1900-02-29', '2026-04-31', '2026-1-01', '2026-11-02Z', ''])(
  '拒绝当地日期 %j',
  function testInvalidLocalDate(value) {
    expect(() => formatLocalDate(value)).toThrow(RangeError)
  },
)

/** 中文：钟点只验证24小时格式，保留前导零。 English: Preserve valid 24-hour clock text including leading zeros. */
it.each(['00:00', '08:00', '23:59'])('保留当地钟点 %s', function testClock(value) {
  expect(formatClockTime(value)).toBe(value)
})

/** 中文：拒绝越界与非标准钟点。 English: Reject out-of-range or noncanonical clock values. */
it.each(['24:00', '12:60', '8:00', '08:00:00', '', ' 08:00'])(
  '拒绝钟点 %j',
  function testInvalidClock(value) {
    expect(() => formatClockTime(value)).toThrow(RangeError)
  },
)

/** 中文：缺失和不合法的时间点或时区不会传出渲染异常。 English: Missing/invalid instants or zones never escape as render errors. */
it.each([
  [null, 'Australia/Sydney'],
  [undefined, 'Australia/Sydney'],
  ['2026-02-30T00:00:00Z', 'Australia/Sydney'],
  ['2026-11-01T00:00:00Z', null],
  ['2026-11-01T00:00:00Z', 'Invalid/City'],
  ['2026-11-01T00:00:00', 'Australia/Sydney'],
])('安全显示拒绝非法时间 %j / %j', function testSafeInstantPlaceholder(value, zone) {
  expect(displayDateTime(value, zone)).toBe('—')
})

/** 中文：安全显示仍按指定城市处理夏令时。 English: Safe display retains the requested city zone and DST. */
it('安全时间显示不依赖本机时区', function testSafeCityTime() {
  expect(displayDateTime('2026-11-01T15:00:00Z', 'Australia/Sydney')).toBe('2026-11-02 02:00:00')
})

/** 中文：当地日期和钟点的非法资料以占位区分，不伪造零时。 English: Invalid local values use a placeholder, never invented midnight. */
it.each([null, undefined, '', false, {}, 0])(
  '安全当地显示区分缺失值 %j',
  function testSafeLocalPlaceholder(value) {
    expect(displayLocalDate(value)).toBe('—')
    expect(displayClockTime(value)).toBe('—')
  },
)

/** 中文：合法当地文本保持契约格式，非法文本不抛出。 English: Preserve canonical local text and safely reject malformed text. */
it('安全当地显示保持原日期与24小时钟点', function testSafeLocalValue() {
  expect(displayLocalDate('2026-11-02')).toBe('2026-11-02')
  expect(displayClockTime('00:00')).toBe('00:00')
  expect(displayLocalDate('2026-02-30')).toBe('—')
  expect(displayClockTime('24:00')).toBe('—')
})

/** 中文：真实Vue组件内错误时间单元格不影响其他行。 English: Bad time cells do not abort a real Vue component render. */
it('时间单元格异常不造成整页渲染失败', function testDateRenderIsolation() {
  const DateCells = defineComponent({
    /** 中文：返回混合有效性测试单元格，无参数及外部副作用。 English: Return mixed-validity fixture cells without effects. */
    render() {
      return h('div', [
        h('span', { 'data-cell': 'invalid' }, displayDateTime('invalid', 'Australia/Sydney')),
        h(
          'span',
          { 'data-cell': 'valid' },
          displayDateTime('2026-11-01T00:00:00Z', 'Australia/Sydney'),
        ),
        h('span', { 'data-cell': 'date' }, displayLocalDate('2026-11-02')),
        h('span', { 'data-cell': 'clock' }, displayClockTime('08:00')),
      ])
    },
  })
  const view = mount(DateCells)
  expect(view.get('[data-cell="invalid"]').text()).toBe('—')
  expect(view.get('[data-cell="valid"]').text()).toBe('2026-11-01 11:00:00')
  expect(view.get('[data-cell="date"]').text()).toBe('2026-11-02')
  expect(view.get('[data-cell="clock"]').text()).toBe('08:00')
  view.unmount()
})
