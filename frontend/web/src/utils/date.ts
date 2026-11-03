/** 校验城市当地日期，不按时区移动。 / Validate a city-local date without shifting its calendar day.
 * 参数/Params: YYYY-MM-DD。返回/Returns: 原日期；非法日期抛 RangeError，无副作用 / Same date or RangeError.
 */
export function formatLocalDate(value: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError('日期必须为 YYYY-MM-DD')
  }
  const date = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError('日期不存在')
  }
  return value
}

/** 校验当地24小时钟点，不将它转换成时间点。 / Validate a local clock without inventing an instant.
 * 参数/Params: HH:mm。返回/Returns: 原钟点；非法值抛 RangeError，无副作用 / Same clock or RangeError.
 */
export function formatClockTime(value: string): string {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new RangeError('钟点必须为24小时制 HH:mm')
  }
  return value
}

/** 按城市时区格式化 UTC 时间点，自动处理夏令时。 / Format a UTC instant in the city zone, including DST.
 * 参数/Params: Z结尾时间点和显式IANA时区 / UTC Z timestamp and explicit IANA zone.
 * 返回/Returns: 四位公历年 YYYY-MM-DD HH:mm:ss；非法/越界抛 RangeError，无副作用 / AD local text or RangeError.
 */
export function formatDateTime(utc: string, timeZone: string): string {
  if (typeof utc !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(utc)) {
    throw new RangeError('时间点必须为 Z 结尾的 UTC 时间')
  }
  const date = new Date(utc)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== utc.slice(0, 19)) {
    throw new RangeError('时间点不存在')
  }
  if (typeof timeZone !== 'string' || !timeZone || /^[+-]/.test(timeZone)) {
    throw new RangeError('必须指定城市 IANA 时区')
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    calendar: 'gregory',
    era: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values: Record<string, string> = {}
  for (const part of parts) values[part.type] = part.value
  const year = values.year ?? ''
  if (values.era !== 'AD' || !/^\d{1,4}$/.test(year))
    throw new RangeError('时间点超出四位公历年份范围')
  return `${year.padStart(4, '0')}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`
}
