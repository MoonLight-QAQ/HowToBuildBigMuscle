<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <!-- 页面布局由 src/layouts/ 提供，登录页等不使用布局的页面直接渲染 -->
  <RouterView />
</template>
