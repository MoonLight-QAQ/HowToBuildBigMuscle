import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from '@/App.vue'

// 样式顺序：先 Element Plus，再项目全局样式，以便后者覆盖前者
import 'element-plus/dist/index.css'
import '@/styles/index.scss'

const app = createApp(App)

app.use(createPinia())
// TODO(W-01c)：在这里注册路由。
//   import router from '@/router'
//   app.use(router)
app.use(ElementPlus, { locale: zhCn })

/** 等待开发模拟服务就绪后挂载。 / Wait for development mocking before mounting.
 * 参数/Params: 无。返回/Returns: Promise<void>；模拟启动失败时拒绝并阻止挂载 / Reject on mock startup failure.
 * 副作用/Effects: 开发时注册worker，随后挂载应用 / Register a dev worker, then mount the app.
 */
async function bootstrap(): Promise<void> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    const { startMocking } = await import('@/mocks/browser')
    await startMocking()
  }
  app.mount('#app')
}

void bootstrap()
