<template>
  <div class="fire-spread-config">
    <el-form :model="form" label-width="90px" size="default">
      <el-form-item label="火情等级">
        <el-slider v-model="form.fire_level" :min="1" :max="5" :step="1" show-stops />
      </el-form-item>
      <el-form-item label="扩散速度">
        <el-input-number v-model="form.spread_speed" :min="0.1" :step="0.1" :precision="1" />
      </el-form-item>
      <el-form-item label="影响半径">
        <el-input-number v-model="form.affected_radius" :min="1" :step="1" />
      </el-form-item>
      <el-form-item label="天气条件">
        <el-select v-model="form.weather_condition" placeholder="选择天气" @change="handleWeatherChange">
          <el-option label="☀️ 晴天" value="clear" />
          <el-option label="💨 大风" value="windy" />
          <el-option label="🌧️ 雨天" value="rainy" />
          <el-option label="❄️ 雪天" value="snowy" />
        </el-select>
      </el-form-item>
      <template v-if="form.weather_condition === 'windy'">
        <el-form-item label="风速">
          <el-input-number v-model="form.wind_speed" :min="0" :max="100" :step="1" />
        </el-form-item>
        <el-form-item label="风向">
          <el-input-number v-model="form.wind_direction" :min="0" :max="360" :step="15" />
        </el-form-item>
      </template>
      <el-form-item label="经过时间">
        <el-slider v-model="form.elapsed_minutes" :min="0" :max="120" :step="5" show-input />
      </el-form-item>
    </el-form>
    <div class="config-actions">
      <el-button type="warning" @click="emit('calculate')">计算扩散</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

export interface FireSpreadConfigData {
  fire_level: number
  spread_speed: number
  affected_radius: number
  weather_condition: string
  wind_speed: number
  wind_direction: number
  elapsed_minutes: number
}

const props = defineProps<{
  modelValue: FireSpreadConfigData
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FireSpreadConfigData]
  calculate: []
  reset: []
}>()

const form = reactive<FireSpreadConfigData>({ ...props.modelValue })

watch(
  () => props.modelValue,
  (val) => {
    Object.assign(form, val)
  },
  { deep: true }
)

watch(
  () => ({ ...form }),
  (val) => {
    emit('update:modelValue', val)
  },
  { deep: true }
)

const handleWeatherChange = () => {
  if (form.weather_condition !== 'windy') {
    form.wind_speed = 0
    form.wind_direction = 0
  }
  emit('update:modelValue', { ...form })
}

const handleReset = () => {
  form.fire_level = 1
  form.spread_speed = 1.0
  form.affected_radius = 10
  form.weather_condition = 'clear'
  form.wind_speed = 0
  form.wind_direction = 0
  form.elapsed_minutes = 0
  emit('update:modelValue', { ...form })
  emit('reset')
}
</script>

<style scoped>
.fire-spread-config {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.config-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
