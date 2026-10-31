<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <ElResult
    icon="info"
    title="此页面不在本次预览范围"
    sub-title="本次只预览商品、商城类目、配送和城市。"
  >
    <template #extra>
      <RouterLink to="/products" class="return-link">返回商品</RouterLink>
    </template>
  </ElResult>
</template>
