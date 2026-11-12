<script setup lang="ts">
import { onMounted } from 'vue'
import { ElAlert, ElButton, ElCard, ElEmpty, ElSkeleton } from 'element-plus'
import {
  DASHBOARD_TASKS,
  DASHBOARD_FULFILLMENT,
  type DashboardCountKey,
} from '@/constants/dashboard'
import { formatMoney } from '@/utils/money'
import { useDashboard } from './use-dashboard'

const emit = defineEmits<{
  openOrders: [status: 'pending' | 'delivering']
  openRefunds: [status: 'open']
  openReports: [status: 'open']
  openDelivery: []
}>()
const { summary, loading, errorMessage, localCities, postCities, load } = useDashboard()
/** 将已加载待办入口交给宿主并保留状态筛选；无请求或状态写入。
 * / Send a loaded task entry to its host with its filter, without requests or business writes.
 */
function openTask(key: DashboardCountKey): void {
  if (!summary.value || loading.value) return
  switch (key) {
    case 'pendingOrderCount':
      emit('openOrders', 'pending')
      break
    case 'deliveringOrderCount':
      emit('openOrders', 'delivering')
      break
    case 'openRefundCount':
      emit('openRefunds', 'open')
      break
    case 'openReportCount':
      emit('openReports', 'open')
      break
  }
}
/** 请求宿主打开配送设置；仅已加载时导航，不在概览修改配置。
 * / Ask the host to open delivery settings only after loading, without changing configuration here.
 */
function openDelivery(): void {
  if (summary.value && !loading.value) emit('openDelivery')
}
onMounted(load)
</script>

<template>
  <section class="dashboard" aria-labelledby="dashboard-title">
    <div class="page-heading">
      <div>
        <h1 id="dashboard-title">概览</h1>
        <p>当前待办数量由服务器按状态统计。</p>
      </div>
      <ElButton :disabled="loading" @click="load">刷新</ElButton>
    </div>
    <div v-if="loading" class="state-panel" role="status" aria-live="polite">
      <p>正在加载概览…</p>
      <ElSkeleton :rows="5" animated />
    </div>
    <div v-else-if="errorMessage" class="state-panel" role="alert">
      <ElAlert :title="errorMessage" type="error" :closable="false" show-icon />
      <ElButton @click="load">重试</ElButton>
    </div>
    <template v-else-if="summary">
      <section class="tasks" aria-label="当前待办">
        <button
          v-for="task in DASHBOARD_TASKS"
          :key="task.key"
          type="button"
          class="task"
          :aria-label="`${task.label} ${summary[task.key]}，查看${task.label}`"
          @click="openTask(task.key)"
        >
          <strong>{{ summary[task.key] }}</strong
          ><span>{{ task.label }}</span
          ><small>{{ task.hint }}</small>
        </button>
      </section>
      <ElCard shadow="never" class="delivery">
        <template #header
          ><div class="page-heading">
            <h2>配送概况</h2>
            <ElButton @click="openDelivery">去改配送</ElButton>
          </div></template
        >
        <ElEmpty v-if="summary.cities.length === 0" description="暂无城市配送概况" />
        <section aria-labelledby="local-heading">
          <h3 id="local-heading">{{ DASHBOARD_FULFILLMENT.local }}</h3>
          <p>
            全店默认线下配送费 {{ formatMoney(summary.localFeeCents) }}，配送大区可单独设置运费。
          </p>
          <p v-if="localCities.length === 0">暂无线下配送城市</p>
          <ul v-else>
            <li v-for="(city, index) in localCities" :key="`${city.id}:${index}`">
              <strong>{{ city.nameZh }}</strong
              >：
              <template v-if="city.deliverableZoneNamesZh.length"
                >可送大区 {{ city.deliverableZoneNamesZh.join('、') }}</template
              >
              <template v-else>暂无可送配送大区</template>
            </li>
          </ul>
        </section>
        <section aria-labelledby="post-heading">
          <h3 id="post-heading">{{ DASHBOARD_FULFILLMENT.post }}</h3>
          <p>
            邮费 {{ formatMoney(summary.postFeeCents) }}；商品金额满
            {{ formatMoney(summary.freeShippingThresholdCents) }} 包邮，仅适用于快递。
          </p>
          <p v-if="postCities.length === 0">暂无快递城市</p>
          <ul v-else>
            <li v-for="(city, index) in postCities" :key="`${city.id}:${index}`">
              {{ city.nameZh }}
            </li>
          </ul>
        </section>
      </ElCard>
    </template>
  </section>
</template>

<style scoped lang="scss">
.dashboard {
  display: grid;
  gap: $space-lg;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: $space-md;
}
h1,
h2 {
  margin: 0;
  font-size: $font-size-title;
}
h3 {
  font-size: $font-size-medium;
}
p,
small {
  color: $text-secondary;
}
.tasks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, $space-xl * 9), 1fr));
  gap: $space-md;
}
.task {
  display: grid;
  justify-items: start;
  gap: $space-sm;
  padding: $space-xl;
  color: $text-primary;
  background: $bg-base;
  border: 1px solid $border-color;
  border-radius: $radius-base;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.task strong {
  font-size: $font-size-title;
  color: $color-primary;
}
.task:hover {
  border-color: $color-primary;
}
.task:focus-visible {
  outline: $space-xs solid $color-primary;
  outline-offset: $space-xs;
}
.state-panel {
  display: grid;
  justify-items: start;
  gap: $space-md;
  padding-block: $space-xl;
}
.delivery section + section {
  margin-top: $space-xl;
}
ul {
  padding-inline-start: $space-lg;
}
li {
  margin-block: $space-sm;
  overflow-wrap: anywhere;
}
</style>
