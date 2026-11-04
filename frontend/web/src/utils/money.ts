/** 将元字符串转换为安全整数分，不进行浮点运算。 / Parse decimal dollars without floating-point arithmetic.
 * 参数/Params: 无空白、最多两位小数的十进制元 / Decimal dollars, at most two fractional digits.
 * 返回/Returns: 整数分；格式或范围非法时抛 RangeError，无副作用 / Safe cents or RangeError; no effects.
 */
export function parseAmountToCents(amount: string): number {
  if (typeof amount !== 'string' || !/^-?\d+(?:\.\d{1,2})?$/.test(amount)) {
    throw new RangeError('金额必须是最多两位小数的十进制字符串')
  }
  const [whole = '0', fraction = ''] = amount.replace('-', '').split('.')
  const cents =
    (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))) * (amount.startsWith('-') ? -1n : 1n)
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError('金额超过安全整数分范围')
  }
  return Number(cents)
}

/** 将整数分显示为固定两位元，不舍入。 / Format integer cents as exact two-decimal dollars.
 * 参数/Params: 安全整数分。返回/Returns: 元字符串；非法分值抛 RangeError，无副作用 / Exact text or RangeError.
 */
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new RangeError('金额必须是安全整数分')
  const value = BigInt(cents)
  const absolute = value < 0n ? -value : value
  return `${value < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}

/** 显示明确的澳元金额。 / Display an explicit Australian-dollar amount.
 * 参数/Params: 安全整数分。返回/Returns: A$金额文本；非法值抛 RangeError，无副作用 / A$ text or RangeError.
 */
export function formatMoney(cents: number): string {
  return `A$ ${formatCents(cents)}`
}

/** 安全显示澳元，单个非法值不打断页面渲染。 / Display AUD without breaking rendering on invalid data.
 * 参数/Params: 未知分值 / Unknown cents. 返回/Returns: 澳元文本或“—”；无日志及副作用 / AUD text or placeholder; no logging/effects.
 */
export function displayMoney(cents: unknown): string {
  if (typeof cents !== 'number') return '—'
  try {
    return formatMoney(cents)
  } catch {
    return '—'
  }
}
