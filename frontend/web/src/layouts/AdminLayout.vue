<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { findActiveMenuPath, MENU_GROUPS } from './menu'

const route = useRoute()
const activeMenuPath = computed(() => findActiveMenuPath(route.path))
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
      <!-- TODO(W-01c)：登录状态的 store 完成后，在这里加顶栏：当前管理员账号、退出登录 -->
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

.admin-layout__main {
  padding: $space-lg;
}
</style>
