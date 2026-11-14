<!--
  城市列表表格。

  只负责显示：数据通过 props 传入，操作通过事件通知页面。不调用接口，不使用 composables。
  三种状态：
  - 加载中：表格显示加载遮罩（v-loading）。
  - 加载失败：表格上方显示错误和「重试」按钮，点击后发出 retry。失败前已加载的数据仍然显示。
  - 空数据：表格中显示空状态。只有加载成功且没有数据时才显示，加载失败不算空数据。
  切换配送方式需要先确认（ElPopconfirm），确认后发出 toggle-fulfillment。

  其他模块照着写时要改的地方：
  - props 中的数据类型、表格列换成本模块的。
  - 枚举的文案和颜色从 src/constants/ 中取，不在这里写映射。
  - 行内的操作按钮换成本模块的，需要确认的操作用 ElPopconfirm，按钮文案从 model 中取。
-->
<script setup lang="ts">
import type { City } from '@/api/city'
import { AUSTRALIAN_STATE_LABEL } from '@/constants/australian-state'
import { FULFILLMENT_LABEL, FULFILLMENT_TAG_TYPE } from '@/constants/fulfillment'
import { toggleFulfillmentText } from '../model/city-form'

defineProps<{
  cities: readonly City[]
  loading: boolean
  /** 加载失败的文案；没有错误时为 null。 */
  errorMessage: string | null
  /** 是否为空数据（加载成功且没有城市）。 */
  empty: boolean
  /** 正在切换配送方式的城市 id。 */
  togglingId: string | null
}>()

const emit = defineEmits<{
  retry: []
  edit: [city: City]
  'toggle-fulfillment': [city: City]
}>()
</script>

<template>
  <div class="city-table">
    <el-alert
      v-if="errorMessage !== null"
      class="city-table__error"
      type="error"
      :title="`城市列表加载失败：${errorMessage}`"
      :closable="false"
      show-icon
    >
      <el-button size="small" :loading="loading" @click="emit('retry')">重试</el-button>
    </el-alert>

    <el-table v-loading="loading" :data="cities" row-key="id">
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column prop="nameZh" label="中文名" min-width="120" />
      <el-table-column prop="nameEn" label="英文名" min-width="140" />
      <el-table-column label="所属州" min-width="160">
        <template #default="{ row }: { row: City }">
          {{ AUSTRALIAN_STATE_LABEL[row.state] }}（{{ row.state }}）
        </template>
      </el-table-column>
      <el-table-column prop="timezone" label="时区" min-width="180" />
      <el-table-column label="配送方式" width="120">
        <template #default="{ row }: { row: City }">
          <el-tag :type="FULFILLMENT_TAG_TYPE[row.fulfillment]">
            {{ FULFILLMENT_LABEL[row.fulfillment] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }: { row: City }">
          <el-button link type="primary" @click="emit('edit', row)">编辑</el-button>
          <el-popconfirm
            :title="toggleFulfillmentText(row).confirm"
            width="260"
            @confirm="emit('toggle-fulfillment', row)"
          >
            <template #reference>
              <el-button
                link
                type="primary"
                :loading="togglingId === row.id"
                :disabled="togglingId !== null && togglingId !== row.id"
              >
                {{ toggleFulfillmentText(row).action }}
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty v-if="empty" description="还没有城市，点击「添加城市」新增" />
        <span v-else-if="errorMessage !== null">加载失败，请点击上方的「重试」</span>
        <span v-else />
      </template>
    </el-table>
  </div>
</template>

<style scoped lang="scss">
.city-table__error {
  margin-bottom: $space-md;
}
</style>
