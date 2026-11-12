<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { LOGIN_PATH } from '@/router/guard'
import { useAuthStore } from '@/stores/auth'
import { findActiveMenuPath, MENU_GROUPS } from './menu'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const activeMenuPath = computed(() => findActiveMenuPath(route.path))

// 调用 /logout 作废通行证；无论成功还是失败，本地登录状态都已清除，直接跳到登录页
async function logout(): Promise<void> {
  await authStore.logout()
  await router.replace(LOGIN_PATH)
}
</script>

<template>
  <el-container class="admin-layout">
    <el-aside class="admin-layout__aside" width="200px">
      <div class="admin-layout__brand">拾澳管理后台</div>
      <el-menu :default-active="activeMenuPath" router>
        <el-menu-item-group v-for="group in MENU_GROUPS" :key="group.title" :title="group.title">
          <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
            {{ item.label }}
          </el-menu-item>
        </el-menu-item-group>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="admin-layout__header">
        <span class="admin-layout__account">{{ authStore.admin?.account }}</span>
        <el-button link type="primary" @click="logout">退出登录</el-button>
      </el-header>
      <el-main class="admin-layout__main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.admin-layout {
  height: 100%;
}

.admin-layout__aside {
  overflow-y: auto;
  background-color: $bg-base;
}

.admin-layout__brand {
  padding: $space-md $space-lg;
  font-size: $font-size-large;
  font-weight: 600;
  color: $text-primary;
}

.admin-layout__header {
  display: flex;
  gap: $space-md;
  align-items: center;
  justify-content: flex-end;
  background-color: $bg-base;
  border-bottom: 1px solid $border-color-light;
}

.admin-layout__account {
  color: $text-regular;
}

.admin-layout__main {
  padding: $space-lg;
}
</style>
