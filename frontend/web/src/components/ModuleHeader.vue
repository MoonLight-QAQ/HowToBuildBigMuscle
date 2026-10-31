<script setup lang="ts">
defineProps<{ title: string; description: string }>()
</script>

<template>
  <div class="module-header">
    <div>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div class="module-header-actions"><slot /></div>
  </div>
</template>
