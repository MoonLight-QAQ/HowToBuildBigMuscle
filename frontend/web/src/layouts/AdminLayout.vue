<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { NAVIGATION_ITEMS } from '@/constants/display'

const route = useRoute()
const navigationOpen = ref(false)
const previewLabel =
  import.meta.env.VITE_USE_MOCK === 'true'
    ? '本地前端预览 · 模拟数据'
    : '本地前端预览 · HTTP对接模式（未验证）'

/**
 * ToggleNavigation changes mobile navigation visibility.
 * 中文：切换手机端导航；参数：无；返回：无；副作用：更新导航的展开状态。
 * Parameters: none. Returns: void. Effect: updates local navigation state.
 */
function toggleNavigation(): void {
  navigationOpen.value = !navigationOpen.value
}

/**
 * CloseNavigation dismisses the mobile navigation.
 * 中文：收起手机端导航；参数：无；返回：无；副作用：关闭导航遮罩。
 * Parameters: none. Returns: void. Effect: closes local navigation state.
 */
function closeNavigation(): void {
  navigationOpen.value = false
}
</script>

<template>
  <div class="admin-shell">
    <a class="skip-link" href="#main-content">跳到页面内容</a>
    <button
      v-if="navigationOpen"
      class="navigation-backdrop"
      type="button"
      aria-label="关闭导航"
      @click="closeNavigation"
    />
    <aside
      id="admin-navigation"
      class="admin-sidebar"
      :class="{ 'is-open': navigationOpen }"
      @keydown.esc="closeNavigation"
    >
      <div class="admin-brand">拾澳<span>管理后台</span></div>
      <div class="sidebar-section-label">商城管理</div>
      <nav aria-label="商城模块导航" class="module-navigation">
        <RouterLink
          v-for="item in NAVIGATION_ITEMS"
          :key="item.path"
          :to="item.path"
          class="module-navigation-link"
          :aria-current="route.path === item.path ? 'page' : undefined"
          @click="closeNavigation"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
      <p class="sidebar-caption">四模块基础预览<br />编辑功能将在后续任务提供</p>
    </aside>
    <div class="admin-body">
      <header class="admin-topbar">
        <div class="topbar-location">
          <ElButton
            class="mobile-navigation-button"
            :aria-expanded="navigationOpen"
            aria-controls="admin-navigation"
            @click="toggleNavigation"
          >
            {{ navigationOpen ? '收起导航' : '展开导航' }}
          </ElButton>
          <span class="topbar-title">拾澳管理后台</span>
        </div>
        <ElTag type="info" effect="plain" class="preview-mode">{{ previewLabel }}</ElTag>
      </header>
      <main id="main-content" class="admin-main" tabindex="-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
