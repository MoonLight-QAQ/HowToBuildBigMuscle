import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  ElAlert,
  ElButton,
  ElEmpty,
  ElInput,
  ElOption,
  ElResult,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/index.scss'
import App from './App.vue'
import { router } from './router'

/**
 * bootstrap starts optional local mocks before mounting the admin preview.
 * 中文：先启动显式开启的本地模拟接口，再挂载管理端；生产构建默认关闭模拟。
 * @returns Resolves after mounting / 挂载结束的Promise。
 * Throws if worker or mounting fails; no real authentication is created / 启动失败时抛错，不创建真实登录。
 */
async function bootstrap(): Promise<void> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { startMocking } = await import('./mocks/browser')
    await startMocking()
  }
  const app = createApp(App).use(createPinia()).use(router)
  const components = [
    ElAlert,
    ElButton,
    ElEmpty,
    ElInput,
    ElOption,
    ElResult,
    ElSelect,
    ElSkeleton,
    ElTable,
    ElTableColumn,
    ElTag,
  ]
  for (const component of components) app.use(component)
  app.mount('#app')
}

/**
 * showStartupError displays a safe recovery message if the app cannot start.
 * 中文：启动失败时展示不含内部异常细节的恢复提示。
 * @returns Nothing / 无返回值。
 * Writes text to the root node / 向根节点写入提示。
 */
function showStartupError(): void {
  const root = document.getElementById('app')
  if (root) root.textContent = '管理端未能启动，请刷新页面；仍失败时请检查本地开发服务。'
}

void bootstrap().catch(showStartupError)
