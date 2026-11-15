import { afterEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ElementPlus, { ElMessage } from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ApiError, http } from '@/api/http'
import { LOGOUT_UNCONFIRMED_MESSAGE } from '@/constants/error-code'
import { CHANGE_PASSWORD_PATH, HOME_PATH, LOGIN_PATH } from '@/router/guard'
import { useAuthStore } from '@/stores/auth'
import ChangePasswordView from './ChangePasswordView.vue'

/** 以指定账号状态打开改密码页 */
async function mountPage(mustChangePassword: boolean) {
  setActivePinia(createPinia())
  useAuthStore().setSession({
    expiresAt: '2099-01-01T00:00:00Z',
    admin: { id: '9000000000000000002', account: 'newbie', mustChangePassword },
  })
  const page = (text: string) => ({ render: () => h('p', text) })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: LOGIN_PATH, component: page('登录页面') },
      { path: HOME_PATH, component: page('后台首页') },
      { path: CHANGE_PASSWORD_PATH, component: ChangePasswordView },
    ],
  })
  await router.push(CHANGE_PASSWORD_PATH)
  await router.isReady()
  const wrapper = mount(ChangePasswordView, { global: { plugins: [router, ElementPlus] } })
  return { router, wrapper }
}

function findButton(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('button').find((button) => button.text() === text)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ChangePasswordView', () => {
  it('首次登录显示「退出登录」，不显示「返回后台」', async () => {
    const { wrapper } = await mountPage(true)
    expect(findButton(wrapper, '退出登录')).toBeDefined()
    expect(findButton(wrapper, '返回后台')).toBeUndefined()
  })

  it('平时修改显示「返回后台」，不显示「退出登录」', async () => {
    const { wrapper } = await mountPage(false)
    expect(findButton(wrapper, '返回后台')).toBeDefined()
    expect(findButton(wrapper, '退出登录')).toBeUndefined()
  })

  it('退出成功后清除登录状态并回到登录页', async () => {
    const request = vi.spyOn(http, 'request').mockResolvedValue(undefined)
    const { router, wrapper } = await mountPage(true)

    await findButton(wrapper, '退出登录')!.trigger('click')
    await flushPromises()

    expect(request).toHaveBeenCalledWith('/logout', expect.objectContaining({ method: 'POST' }))
    expect(useAuthStore().admin).toBeNull()
    expect(router.currentRoute.value.path).toBe(LOGIN_PATH)
  })

  it('不能确认已退出时留在本页、保留账号，并提示重试', async () => {
    vi.spyOn(http, 'request').mockRejectedValue(new ApiError('network'))
    const showError = vi.spyOn(ElMessage, 'error').mockImplementation(() => ({ close: () => {} }))
    const { router, wrapper } = await mountPage(true)

    await findButton(wrapper, '退出登录')!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe(CHANGE_PASSWORD_PATH)
    expect(useAuthStore().admin?.account).toBe('newbie')
    expect(showError).toHaveBeenCalledWith(LOGOUT_UNCONFIRMED_MESSAGE)
  })

  it('请求进行中再点「退出登录」不会重复发请求', async () => {
    const request = vi.spyOn(http, 'request').mockImplementation(() => new Promise(() => {}))
    const { wrapper } = await mountPage(true)
    const button = findButton(wrapper, '退出登录')!

    await button.trigger('click')
    await button.trigger('click')

    expect(request).toHaveBeenCalledTimes(1)
  })
})

/** 填一份能通过表单校验的改密码表单 */
async function fillForm(wrapper: VueWrapper) {
  const [oldPassword, newPassword, again] = wrapper.findAll('input[type="password"]')
  await oldPassword!.setValue('pickaus-init-0001')
  await newPassword!.setValue('pickaus-new-pass-2026')
  await again!.setValue('pickaus-new-pass-2026')
}

/** 提交改密码表单，等到请求发出 */
async function submitForm(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

function calledPaths(request: { mock: { calls: unknown[][] } }) {
  return request.mock.calls.map(([path]) => path)
}

describe('ChangePasswordView 改密与退出互斥', () => {
  it('改密请求进行中，「退出登录」被禁用，点击也不发 /logout', async () => {
    const request = vi.spyOn(http, 'request').mockImplementation(() => new Promise(() => {}))
    const { wrapper } = await mountPage(true)
    await fillForm(wrapper)
    await submitForm(wrapper)
    expect(calledPaths(request)).toEqual(['/password'])

    const button = findButton(wrapper, '退出登录')!
    expect(button.attributes('disabled')).toBeDefined()
    await button.trigger('click')
    await flushPromises()

    expect(calledPaths(request)).toEqual(['/password'])
  })

  it('退出请求进行中，「改密码」被禁用，提交也不发 /password', async () => {
    const request = vi.spyOn(http, 'request').mockImplementation(() => new Promise(() => {}))
    const { wrapper } = await mountPage(true)
    await fillForm(wrapper)

    await findButton(wrapper, '退出登录')!.trigger('click')
    await flushPromises()
    expect(findButton(wrapper, '改密码')!.attributes('disabled')).toBeDefined()
    await submitForm(wrapper)

    expect(calledPaths(request)).toEqual(['/logout'])
  })

  it('旧会话的改密成功结果不清除新会话、不跳转、不提示', async () => {
    let resolveRequest!: (value: unknown) => void
    vi.spyOn(http, 'request').mockImplementation(
      () => new Promise((resolve) => (resolveRequest = resolve)),
    )
    const showSuccess = vi
      .spyOn(ElMessage, 'success')
      .mockImplementation(() => ({ close: () => {} }))
    const { router, wrapper } = await mountPage(true)
    await fillForm(wrapper)
    await submitForm(wrapper)

    // 请求在途时会话被替换（如登录失效后重新登录了另一个账号）
    useAuthStore().setSession({
      expiresAt: '2099-01-01T00:00:00Z',
      admin: { id: '9000000000000000001', account: 'staff', mustChangePassword: false },
    })
    resolveRequest(undefined)
    await flushPromises()

    expect(useAuthStore().admin?.account).toBe('staff')
    expect(router.currentRoute.value.path).toBe(CHANGE_PASSWORD_PATH)
    expect(showSuccess).not.toHaveBeenCalled()
  })

  it('旧会话的改密失败结果不提示', async () => {
    let rejectRequest!: (reason: unknown) => void
    vi.spyOn(http, 'request').mockImplementation(
      () => new Promise((_resolve, reject) => (rejectRequest = reject)),
    )
    const showError = vi.spyOn(ElMessage, 'error').mockImplementation(() => ({ close: () => {} }))
    const { wrapper } = await mountPage(true)
    await fillForm(wrapper)
    await submitForm(wrapper)

    useAuthStore().clear()
    rejectRequest(new ApiError('network'))
    await flushPromises()

    expect(showError).not.toHaveBeenCalled()
  })

  it('旧会话的退出结果不能确认时不提示', async () => {
    let rejectRequest!: (reason: unknown) => void
    vi.spyOn(http, 'request').mockImplementation(
      () => new Promise((_resolve, reject) => (rejectRequest = reject)),
    )
    const showError = vi.spyOn(ElMessage, 'error').mockImplementation(() => ({ close: () => {} }))
    const { wrapper } = await mountPage(true)

    await findButton(wrapper, '退出登录')!.trigger('click')
    await flushPromises()
    useAuthStore().clear()
    rejectRequest(new ApiError('network'))
    await flushPromises()

    expect(showError).not.toHaveBeenCalled()
  })
})
