<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="login-icon">🔥</div>
        <h2 class="login-title">消防演练疏散推演系统</h2>
        <p class="login-subtitle">Fire Drill Evacuation Simulation</p>
      </div>

      <el-form
        v-if="!isRegister"
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            :loading="loading"
            native-type="submit"
          >
            登 录
          </el-button>
        </el-form-item>
        <div class="form-footer">
          <span class="footer-text">还没有账号？</span>
          <el-link type="primary" @click="isRegister = true">立即注册</el-link>
        </div>
      </el-form>

      <el-form
        v-else
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        @submit.prevent="handleRegister"
      >
        <el-form-item prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请确认密码"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            :loading="loading"
            native-type="submit"
          >
            注 册
          </el-button>
        </el-form-item>
        <div class="form-footer">
          <span class="footer-text">已有账号？</span>
          <el-link type="primary" @click="isRegister = false">返回登录</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const isRegister = ref(false)
const loading = ref(false)
const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const loginRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const validateConfirmPassword = (_rule: any, value: string, callback: (err?: Error) => void) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const registerRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度为6-32个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

async function handleLogin() {
  const valid = await loginFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.login(loginForm.username, loginForm.password)
    ElMessage.success('登录成功')
    router.push({ name: 'CommandCenter' })
  } catch (err: any) {
    ElMessage.error(err.response?.data?.detail || '登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  const valid = await registerFormRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.register(registerForm.username, registerForm.password)
    ElMessage.success('注册成功，请登录')
    isRegister.value = false
    loginForm.username = registerForm.username
    loginForm.password = ''
  } catch (err: any) {
    ElMessage.error(err.response?.data?.detail || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--color-bg-dark) 50%, var(--color-bg-panel) 100%);
  position: relative;
  overflow: hidden;
}

.login-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 40%, rgba(233, 69, 96, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 70% 60%, rgba(15, 52, 96, 0.15) 0%, transparent 50%);
  animation: pulse 8s ease-in-out infinite alternate;
}

.login-card {
  width: 420px;
  padding: 40px 36px;
  background: var(--bg-card);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.login-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.login-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 1px;
  margin: 0;
}

.submit-btn {
  width: 100%;
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.submit-btn:hover {
  background: var(--fire-red-light);
  border-color: var(--fire-red-light);
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.footer-text {
  font-size: 13px;
  color: var(--text-muted);
}
</style>
