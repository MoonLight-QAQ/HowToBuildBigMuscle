import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from '@/App.vue'
import router from '@/router'
import { http } from '@/api/http'
import { createAuthAdapter, useAuthStore } from '@/stores/auth'

// 样式顺序：先 Element Plus，再项目全局样式，以便后者覆盖前者
import 'element-plus/dist/index.css'
import '@/styles/index.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus, { locale: zhCn })

// 收到 NEED_LOGIN 时清除登录状态并跳到登录页；收到 PASSWORD_CHANGE_REQUIRED 时跳到改密码页
http.setAuth(createAuthAdapter(router))

/** 等待开发模拟服务就绪、确认登录状态后挂载。 / Wait for mocking and the /me check before mounting.
 * 参数/Params: 无。返回/Returns: Promise<void>；模拟启动失败时拒绝并阻止挂载 / Reject on mock startup failure.
 * 副作用/Effects: 开发时注册worker，请求 /me，随后安装路由并挂载应用 / Register a dev worker, call /me, mount.
 */
async function bootstrap(): Promise<void> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    const { startMocking } = await import('@/mocks/browser')
    await startMocking()
  }
  // /me 要在模拟服务就绪后再请求；失败时按未登录处理，不会拒绝
  await useAuthStore(pinia).confirm()
  // 安装路由会触发首次导航，放在确认登录状态之后
  app.use(router)
  app.mount('#app')
}

void bootstrap()
