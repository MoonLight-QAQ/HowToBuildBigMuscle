<!--
  商城类目列表表格。

  只负责显示：数据通过 props 传入，操作通过事件通知页面。不调用接口，不使用 composables。
  三种状态：
  - 加载中：表格显示加载遮罩（v-loading）。
  - 加载失败：表格上方显示错误和「重试」按钮，点击后发出 retry。失败前已加载的数据仍然显示。
  - 空数据：表格中显示空状态。只有加载成功且没有数据时才显示，加载失败不算空数据。

  删除按钮：
  - 类目下有已上架的商品（model 的 canDelete 为 false）时置灰，鼠标悬停显示原因（deleteBlockedReason）。
    禁用的按钮不触发鼠标事件，所以悬停提示挂在外层的 span 上。
  - 可以删除时，先用 ElPopconfirm 二次确认（文案见 deleteConfirmMessage），确认后发出 delete。
  - 正在删除的一行显示加载中；同时其他行的删除按钮不可用，同一时间只删除一个。
-->
<script setup lang="ts">
import type { MallCategory } from '@/api/mall-category'
import { canDelete, deleteBlockedReason, deleteConfirmMessage } from '../model/mall-category-form'

defineProps<{
  categories: readonly MallCategory[]
  loading: boolean
  /** 加载失败的文案；没有错误时为 null。 */
  errorMessage: string | null
  /** 是否为空数据（加载成功且没有类目）。 */
  empty: boolean
  /** 正在删除的类目 id。 */
  deletingId: string | null
}>()

const emit = defineEmits<{
  retry: []
  delete: [category: MallCategory]
}>()
</script>

<template>
  <div class="mall-category-table">
    <el-alert
      v-if="errorMessage !== null"
      class="mall-category-table__error"
      type="error"
      :title="`商城类目加载失败：${errorMessage}`"
      :closable="false"
      show-icon
    >
      <el-button size="small" :loading="loading" @click="emit('retry')">重试</el-button>
    </el-alert>

    <el-table v-loading="loading" :data="categories" row-key="id">
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column prop="nameZh" label="中文名" min-width="140" />
      <el-table-column prop="nameEn" label="英文名" min-width="160" />
      <el-table-column prop="inUseCount" label="在用商品数" width="120" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }: { row: MallCategory }">
          <el-tooltip v-if="!canDelete(row)" :content="deleteBlockedReason(row) ?? ''">
            <span class="mall-category-table__blocked" data-test="delete-blocked">
              <el-button link type="danger" disabled>删除</el-button>
            </span>
          </el-tooltip>
          <el-popconfirm
            v-else
            :title="deleteConfirmMessage(row)"
            width="280"
            confirm-button-text="删除"
            cancel-button-text="取消"
            @confirm="emit('delete', row)"
          >
            <template #reference>
              <el-button
                link
                type="danger"
                :loading="deletingId === row.id"
                :disabled="deletingId !== null && deletingId !== row.id"
              >
                删除
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty v-if="empty" description="还没有商城类目，点击「添加类目」新增" />
        <span v-else-if="errorMessage !== null">加载失败，请点击上方的「重试」</span>
        <span v-else />
      </template>
    </el-table>
  </div>
</template>

<style scoped lang="scss">
.mall-category-table__error {
  margin-bottom: $space-md;
}

.mall-category-table__blocked {
  display: inline-flex;
  cursor: not-allowed;
}
</style>
