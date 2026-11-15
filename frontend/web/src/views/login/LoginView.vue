<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { login, type LoginRequest } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { getLoginErrorMessage, getPostLoginPath } from './rules'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const form = reactive<LoginRequest>({ account: '', password: '' })
const submitting = ref(false)

const rules: FormRules<LoginRequest> = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

/**
 * 登录：成功后保存登录状态，须先改密码时去改密码页，否则回到原本要去的页面。
 * 失败时清空密码，提示统一的错误文案（不区分账号错还是密码错）。
 */
async function submit(): Promise<void> {
  if (submitting.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const result = await login({ account: form.account, password: form.password })
    authStore.setSession(result)
    await router.replace(getPostLoginPath(result, route.query.redirect))
  } catch (error) {
    form.password = ''
    ElMessage.error(getLoginErrorMessage(error))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-page__card" shadow="never">
      <template #header>
        <h1 class="login-page__title">拾澳管理后台</h1>
      </template>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <el-form-item label="账号" prop="account">
          <el-input
            v-model="form.account"
            autocomplete="username"
            maxlength="32"
            placeholder="请输入账号"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            maxlength="64"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-button
          class="login-page__submit"
          type="primary"
          native-type="submit"
          :loading="submitting"
        >
          登录
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: $space-md;
  background: $bg-page;
}

.login-page__card {
  width: 100%;
  max-width: 400px;
}

.login-page__title {
  margin: 0;
  font-size: var(--el-font-size-extra-large);
  color: $text-primary;
}

.login-page__submit {
  width: 100%;
  margin-top: $space-sm;
}
</style>
