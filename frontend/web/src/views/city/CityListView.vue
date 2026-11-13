<!--
  城市页（路由 /cities）。

  只做组装：从 composables 取状态和操作，传给组件；把组件的事件转给 composables。
  不调用接口，不写业务判断。业务规则在 model/city-form.ts，加载和提交在 composables/ 中。

  其他模块照着写时要改的地方：
  - 换成本模块的 composables 和组件。
  - 页面打开时加载数据（onMounted 中调用 load）。
  - 保存成功后重新加载：把列表的 load 作为表单 composable 的 onSaved 传入。
-->
<script setup lang="ts">
import { onMounted } from 'vue'
import CityFormDialog from './components/CityFormDialog.vue'
import CityTable from './components/CityTable.vue'
import { useCityForm } from './composables/useCityForm'
import { useCityList } from './composables/useCityList'

const { cities, loading, errorMessage, empty, togglingId, load, toggleFulfillment } = useCityList()
const {
  visible,
  mode,
  form,
  rules,
  submitting,
  formError,
  serverErrorFields,
  openCreate,
  openEdit,
  close,
  selectState,
  submit,
} = useCityForm({ onSaved: load })

onMounted(load)
</script>

<template>
  <div class="city-page">
    <div class="city-page__header">
      <div>
        <h2 class="city-page__title">城市</h2>
        <p class="city-page__desc">
          每个城市都能买，也能发闲置。这里只选配送方式：线下配送或快递。城市不能删除。
        </p>
      </div>
      <el-button type="primary" @click="openCreate(cities)">添加城市</el-button>
    </div>

    <CityTable
      :cities="cities"
      :loading="loading"
      :error-message="errorMessage"
      :empty="empty"
      :toggling-id="togglingId"
      @retry="load"
      @edit="openEdit"
      @toggle-fulfillment="toggleFulfillment"
    />

    <CityFormDialog
      v-model:form="form"
      :visible="visible"
      :mode="mode"
      :rules="rules"
      :submitting="submitting"
      :form-error="formError"
      :server-error-fields="serverErrorFields"
      @close="close"
      @submit="submit"
      @select-state="selectState"
    />
  </div>
</template>

<style scoped lang="scss">
.city-page__header {
  display: flex;
  gap: $space-md;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: $space-md;
}

.city-page__title {
  margin: 0 0 $space-xs;
  font-size: $font-size-title;
  color: $text-primary;
}

.city-page__desc {
  margin: 0;
  color: $text-secondary;
}
</style>
