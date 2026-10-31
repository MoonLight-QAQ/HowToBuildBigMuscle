import { reactive, ref, watch } from 'vue'

const drafts = new Map<string, { note: string }>()
const prefix = 'shiao:admin:rn-setup-01:'

/**
 * useDraft keeps an integration note per module for this browser session.
 * 中文：按模块保留联调备注，跨路由与刷新恢复，不向服务器提交。
 * @param key Stable module name / 稳定的模块名。
 * @returns Editable note, reset action and storage status / 可编辑备注、清空方法与存储状态。
 * Storage denial falls back to memory / 存储被禁用时仅在内存保留。
 */
export function useDraft(key: string) {
  const storageAvailable = ref(true)
  const storageKey = `${prefix}${key}`
  let initialNote = ''
  try {
    initialNote = sessionStorage.getItem(storageKey) ?? ''
  } catch {
    storageAvailable.value = false
  }
  let draft = drafts.get(key)
  if (!draft) {
    draft = reactive({ note: initialNote })
    drafts.set(key, draft)
  }
  const currentDraft = draft

  /**
   * persistNote writes the current note to session storage.
   * 中文：将当前备注写入会话存储，失败时保留内存草稿并显示状态。
   * @param note Current text / 当前文本。
   * @returns Nothing / 无返回值。
   */
  function persistNote(note: string): void {
    try {
      if (note) sessionStorage.setItem(storageKey, note)
      else sessionStorage.removeItem(storageKey)
      storageAvailable.value = true
    } catch {
      storageAvailable.value = false
    }
  }

  /**
   * readNote supplies the watch source without exposing the stored object.
   * 中文：向监听器提供备注字段，不改变状态。
   * @returns Current note / 当前备注。
   */
  function readNote(): string {
    return currentDraft.note
  }

  /**
   * resetDraft clears only this module's integration note.
   * 中文：只清空本模块的联调备注及对应会话存储。
   * @returns Nothing / 无返回值。
   */
  function resetDraft(): void {
    currentDraft.note = ''
    persistNote('')
  }

  watch(readNote, persistNote, { flush: 'sync' })
  return { draft: currentDraft, resetDraft, storageAvailable }
}
