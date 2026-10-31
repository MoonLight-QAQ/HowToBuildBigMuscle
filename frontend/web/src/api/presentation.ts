/**
 * formatMinorAmount formats minor units without assuming an unconfirmed currency.
 * 中文：格式化整数分，币种未确认时明确标注，不擅自使用AUD或货币符号。
 * @param minor Amount in minor units / 以分计的金额。
 * @param currency Confirmed code or null / 已确认币种或空值。
 * @returns Display-ready text / 可直接显示的文本；无副作用。
 * @throws RangeError for negative or non-safe-integer input / 负值或非安全整数输入时报错。
 */
export function formatMinorAmount(minor: number, currency: string | null): string {
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new RangeError('Amount must be a nonnegative safe integer in minor units')
  }
  const digits = String(minor).padStart(3, '0')
  const amount = `${digits.slice(0, -2)}.${digits.slice(-2)}`
  return currency ? `${amount} ${currency}` : `${amount}（币种待确认）`
}
