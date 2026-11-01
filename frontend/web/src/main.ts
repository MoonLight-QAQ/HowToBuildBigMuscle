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
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
