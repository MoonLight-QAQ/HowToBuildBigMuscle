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

// TODO(W-01b)：在挂载之前启动 MSW 模拟接口，保证第一个请求发出前模拟服务已就绪。
// 必须用动态 import，生产构建中 VITE_USE_MOCK 为 'false'，MSW 不会被打包进去。
//   if (import.meta.env.VITE_USE_MOCK === 'true') {
//     const { worker } = await import('@/mocks/browser')
//     await worker.start({ onUnhandledRequest: 'bypass' })
//   }

app.mount('#app')
