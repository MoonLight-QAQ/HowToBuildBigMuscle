<!--
  商城类目页（路由 /mall-categories）。

  只做组装：从 composables 取状态和操作，传给组件；把组件的事件转给 composables。
  不调用接口，不写业务判断。业务规则在 model/mall-category-form.ts，加载和提交在 composables/ 中。
  新增成功、删除成功或删除时发现数据已过时，都把列表的 load 作为回调传入，重新加载列表。
-->
<script setup lang="ts">
import { onMounted } from 'vue'
import MallCategoryFormDialog from './components/MallCategoryFormDialog.vue'
import MallCategoryTable from './components/MallCategoryTable.vue'
import { useMallCategoryDelete } from './composables/useMallCategoryDelete'
import { useMallCategoryForm } from './composables/useMallCategoryForm'
import { useMallCategoryList } from './composables/useMallCategoryList'

const { categories, loading, errorMessage, empty, load } = useMallCategoryList()
const {
  visible,
  form,
  rules,
  submitting,
  formError,
  serverErrorFields,
  openCreate,
  close,
  submit,
} = useMallCategoryForm({ onSaved: load })
const { deletingId, remove } = useMallCategoryDelete({ onChanged: load })

onMounted(load)
</script>

<template>
  <div class="mall-category-page">
    <div class="mall-category-page__header">
      <div>
        <h2 class="mall-category-page__title">商城类目</h2>
        <p class="mall-category-page__desc">
          用户在小程序里只能选这些类目，不能自己输入。类目只能添加和删除；还有已上架商品的类目不能删除。
        </p>
      </div>
      <el-button type="primary" @click="openCreate(categories)">添加类目</el-button>
    </div>

    <MallCategoryTable
      :categories="categories"
      :loading="loading"
      :error-message="errorMessage"
      :empty="empty"
      :deleting-id="deletingId"
      @retry="load"
      @delete="remove"
    />

    <MallCategoryFormDialog
      v-model:form="form"
      :visible="visible"
      :rules="rules"
      :submitting="submitting"
      :form-error="formError"
      :server-error-fields="serverErrorFields"
      @close="close"
      @submit="submit"
    />
  </div>
</template>

<style scoped lang="scss">
.mall-category-page__header {
  display: flex;
  gap: $space-md;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: $space-md;
}

.mall-category-page__title {
  margin: 0 0 $space-xs;
  font-size: $font-size-title;
  color: $text-primary;
}

.mall-category-page__desc {
  margin: 0;
  color: $text-secondary;
}
</style>
