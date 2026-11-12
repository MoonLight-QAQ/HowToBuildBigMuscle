<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormItemRule, type FormRules } from 'element-plus'
import { changePassword } from '@/api/auth'
import { HOME_PATH, LOGIN_PATH } from '@/router/guard'
import { useAuthStore } from '@/stores/auth'
import { getChangePasswordErrorMessage, validateNewPasswordConfirm } from './rules'

interface ChangePasswordForm {
  oldPassword: string
  newPassword: string
  again: string
}

const router = useRouter()
const authStore = useAuthStore()

/** 首次登录：改完密码之前，其他页面都打不开 */
const isFirstLogin = computed(() => authStore.mustChangePassword)

const formRef = ref<FormInstance>()
const form = reactive<ChangePasswordForm>({ oldPassword: '', newPassword: '', again: '' })
const submitting = ref(false)

const confirmRule: FormItemRule = {
  trigger: 'blur',
  validator: (_rule, value: string, callback) => {
    const message = validateNewPasswordConfirm(form.newPassword, value)
    callback(message === null ? undefined : new Error(message))
  },
}

const rules: FormRules<ChangePasswordForm> = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }],
  again: [{ required: true, message: '请再输入一次新密码', trigger: 'blur' }, confirmRule],
}

/**
 * 改密码：两次输入不一致由表单校验拦下，不发请求。
 * 成功后服务器作废该账号的所有通行证，这里清除本地登录状态并回到登录页。
 */
async function submit(): Promise<void> {
  if (submitting.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
    authStore.clear()
    ElMessage.success('密码已修改，请用新密码重新登录')
    await router.replace(LOGIN_PATH)
  } catch (error) {
    ElMessage.error(getChangePasswordErrorMessage(error))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="change-password-page">
    <el-card class="change-password-page__card" shadow="never">
      <template #header>
        <h1 class="change-password-page__title">{{ isFirstLogin ? '先改密码' : '修改密码' }}</h1>
        <p class="change-password-page__desc">
          {{
            isFirstLogin
              ? '这是首次登录。账号是初始化时给的密码，改完才能用后台。'
              : '改完之后，这个账号在所有电脑上的登录都会失效，要用新密码重新登录。'
          }}
        </p>
      </template>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input
            v-model="form.oldPassword"
            type="password"
            autocomplete="current-password"
            maxlength="64"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            autocomplete="new-password"
            maxlength="64"
            placeholder="至少 12 位"
            show-password
          />
        </el-form-item>
        <el-form-item label="再输一次新密码" prop="again">
          <el-input
            v-model="form.again"
            type="password"
            autocomplete="new-password"
            maxlength="64"
            show-password
          />
        </el-form-item>
        <p class="change-password-page__hint">
          至少 12 位，不能是常见密码，不能和旧密码相同。建议用密码管理器生成，不要和其他网站共用。
        </p>
        <div class="change-password-page__actions">
          <el-button v-if="!isFirstLogin" @click="router.push(HOME_PATH)">返回后台</el-button>
          <el-button type="primary" native-type="submit" :loading="submitting">改密码</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.change-password-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: $space-md;
  background: $bg-page;
}

.change-password-page__card {
  width: 100%;
  max-width: 420px;
}

.change-password-page__title {
  margin: 0;
  font-size: var(--el-font-size-extra-large);
  color: $text-primary;
}

.change-password-page__desc,
.change-password-page__hint {
  margin: $space-sm 0 0;
  font-size: var(--el-font-size-small);
  color: $text-secondary;
}

.change-password-page__hint {
  margin: 0 0 $space-md;
}

.change-password-page__actions {
  display: flex;
  justify-content: flex-end;
  gap: $space-sm;
}
</style>
