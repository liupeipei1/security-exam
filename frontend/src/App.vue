<template>
  <div class="page">
    <header class="header">
      <h1>考试刷题系统</h1>
      <p class="sub">Spring Cloud 前后端分离 · API 网关 {{ apiBase }}</p>
    </header>

    <section class="card">
      <h2>题库</h2>
      <p v-if="loading">加载中…</p>
      <ul v-else class="bank-list">
        <li v-for="b in banks" :key="b.bank_code" @click="selectBank(b.bank_code)"
            :class="{ active: currentBank === b.bank_code }">
          <span>{{ b.icon || '📚' }}</span>
          <span>{{ b.bank_name }}</span>
          <small>{{ b.total_questions }} 题</small>
        </li>
      </ul>
    </section>

    <section class="card">
      <h2>登录</h2>
      <p v-if="user">已登录：{{ user.nickname || user.openid }}
        <span v-if="user.is_vip" class="vip">VIP</span>
      </p>
      <button v-else class="btn" @click="testLogin">测试登录 (dev)</button>
    </section>

    <section class="card" v-if="user">
      <h2>练习</h2>
      <p v-if="!user.is_vip" class="warn">非会员无法拉取题目，请开通 VIP</p>
      <button v-else class="btn" :disabled="questionLoading" @click="loadQuestions">
        加载题目 ({{ currentBank }})
      </button>
      <p v-if="questions.length">已加载 {{ questions.length }} 道题</p>
    </section>

    <p class="hint">
      完整 UI 可从根目录 <code>index.html</code> 逐步迁移到此项目。
      开发时 Vite 将 <code>/api</code> 代理到网关 <code>http://localhost:8080</code>。
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet, apiPost, getStoredUser, setStoredUser } from './api/client.js'

const apiBase = import.meta.env.VITE_API_BASE || '(代理 /api → :8080)'
const banks = ref([])
const currentBank = ref('')
const loading = ref(true)
const user = ref(getStoredUser())
const questions = ref([])
const questionLoading = ref(false)

onMounted(async () => {
  try {
    const res = await apiGet('/api/banks')
    if (res.success) {
      banks.value = res.data
      if (banks.value.length) {
        currentBank.value = banks.value[0].bank_code
      }
    }
  } finally {
    loading.value = false
  }
})

function selectBank(code) {
  currentBank.value = code
}

async function testLogin() {
  const res = await apiPost('/api/auth/login', { code: 'dev', loginType: 'mini' })
  if (res.success) {
    user.value = res.data
    setStoredUser(res.data)
  } else {
    alert(res.message || '登录失败')
  }
}

async function loadQuestions() {
  if (!user.value?.openid) return
  questionLoading.value = true
  try {
    const res = await apiGet('/api/questions', {
      openid: user.value.openid,
      bank_code: currentBank.value
    })
    if (res.success) {
      questions.value = res.data
    } else {
      alert(res.message || '加载失败')
    }
  } finally {
    questionLoading.value = false
  }
}
</script>

<style scoped>
.page { max-width: 720px; margin: 0 auto; padding: 24px; }
.header h1 { margin: 0 0 8px; font-size: 1.5rem; }
.sub { color: #666; margin: 0; font-size: 0.9rem; }
.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  margin-top: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
}
.bank-list { list-style: none; padding: 0; margin: 0; }
.bank-list li {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-radius: 8px; cursor: pointer;
}
.bank-list li:hover, .bank-list li.active { background: #eef2ff; }
.bank-list small { margin-left: auto; color: #888; }
.btn {
  background: #4f46e5; color: #fff; border: none;
  padding: 10px 18px; border-radius: 8px; cursor: pointer;
}
.btn:disabled { opacity: 0.6; }
.vip { color: #b45309; margin-left: 8px; font-weight: 600; }
.warn { color: #c2410c; }
.hint { font-size: 0.85rem; color: #888; margin-top: 24px; }
code { background: #eee; padding: 2px 6px; border-radius: 4px; }
</style>
