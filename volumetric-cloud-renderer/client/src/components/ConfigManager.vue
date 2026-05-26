<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useCloudStore } from '../stores/cloudStore';
import { configApi } from '../api';
import type { SaveConfigRequest } from '../types';
import { Save, FolderOpen, Trash2, X } from 'lucide-vue-next';

const cloudStore = useCloudStore();
const { configs, params, isTransitioning } = storeToRefs(cloudStore);

const showSaveDialog = ref(false);
const showLoadDialog = ref(false);
const configName = ref('');
const configDescription = ref('');
const deleteConfirmId = ref<string | null>(null);

onMounted(async () => {
  await loadConfigs();
});

async function loadConfigs() {
  try {
    const data = await configApi.list();
    cloudStore.setConfigs(data as any);
  } catch (error) {
    console.error('Failed to load configs:', error);
  }
}

async function saveConfig() {
  if (!configName.value.trim()) return;

  try {
    const request: SaveConfigRequest = {
      name: configName.value.trim(),
      description: configDescription.value.trim(),
      params: { ...params.value }
    };

    await configApi.save(request);
    await loadConfigs();
    showSaveDialog.value = false;
    configName.value = '';
    configDescription.value = '';
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

async function loadConfig(id: string) {
  if (isTransitioning.value) return;
  try {
    const config = await configApi.get(id);
    await cloudStore.loadConfig(config);
    showLoadDialog.value = false;
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

async function deleteConfig(id: string) {
  try {
    await configApi.delete(id);
    await loadConfigs();
    deleteConfirmId.value = null;
  } catch (error) {
    console.error('Failed to delete config:', error);
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<template>
  <div class="config-manager">
    <div class="config-buttons">
      <button class="config-btn" @click="showSaveDialog = true">
        <Save :size="16" />
        <span>保存配置</span>
      </button>
      <button class="config-btn" @click="showLoadDialog = true">
        <FolderOpen :size="16" />
        <span>加载配置</span>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="showSaveDialog" class="modal-overlay" @click.self="showSaveDialog = false">
        <div class="modal">
          <div class="modal-header">
            <h3>保存配置</h3>
            <button class="close-btn" @click="showSaveDialog = false">
              <X :size="18" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>配置名称</label>
              <input
                v-model="configName"
                type="text"
                placeholder="输入配置名称"
                maxlength="50"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>描述 (可选)</label>
              <textarea
                v-model="configDescription"
                placeholder="输入配置描述"
                maxlength="200"
                rows="3"
                class="form-input"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showSaveDialog = false">取消</button>
            <button class="btn-primary" @click="saveConfig" :disabled="!configName.trim()">
              保存
            </button>
          </div>
        </div>
      </div>

      <div v-if="showLoadDialog" class="modal-overlay" @click.self="showLoadDialog = false">
        <div class="modal">
          <div class="modal-header">
            <h3>加载配置</h3>
            <button class="close-btn" @click="showLoadDialog = false">
              <X :size="18" />
            </button>
          </div>
          <div class="modal-body">
            <div v-if="configs.length === 0" class="empty-state">
              暂无保存的配置
            </div>
            <div v-else class="config-list">
              <div
                v-for="config in configs"
                :key="config.id"
                class="config-item"
                :class="{ 'delete-confirm': deleteConfirmId === config.id }"
              >
                <div class="config-info" @click="loadConfig(config.id)">
                  <div class="config-name">{{ config.name }}</div>
                  <div v-if="config.description" class="config-desc">{{ config.description }}</div>
                  <div class="config-date">{{ formatDate(config.updatedAt) }}</div>
                </div>
                <div class="config-actions">
                  <template v-if="deleteConfirmId === config.id">
                    <button class="btn-danger-small" @click.stop="deleteConfig(config.id)">
                      确认删除
                    </button>
                    <button class="btn-secondary-small" @click.stop="deleteConfirmId = null">
                      取消
                    </button>
                  </template>
                  <button v-else class="delete-btn" @click.stop="deleteConfirmId = config.id">
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="showLoadDialog = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.config-manager {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 100;
}

.config-buttons {
  display: flex;
  gap: 10px;
}

.config-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(15, 20, 45, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(123, 44, 191, 0.3);
  border-radius: 8px;
  color: #c0c8e0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(123, 44, 191, 0.3);
    border-color: rgba(123, 44, 191, 0.6);
    transform: translateY(-1px);
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: rgba(15, 20, 45, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(123, 44, 191, 0.3);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid rgba(123, 44, 191, 0.2);
}

.modal-header h3 {
  margin: 0;
  color: #f0f4ff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f0f4ff;
  }
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 6px;
    color: #a0a8c0;
    font-size: 13px;
  }
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(123, 44, 191, 0.3);
  border-radius: 8px;
  color: #f0f4ff;
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #7b2cbf;
    box-shadow: 0 0 0 3px rgba(123, 44, 191, 0.2);
  }

  &::placeholder {
    color: #4b5563;
  }
}

textarea.form-input {
  resize: vertical;
  min-height: 80px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid rgba(123, 44, 191, 0.2);
}

.btn-primary,
.btn-secondary,
.btn-danger-small,
.btn-secondary-small {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #7b2cbf, #4a90d9);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(123, 44, 191, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-secondary {
  background: rgba(107, 114, 128, 0.3);
  color: #c0c8e0;

  &:hover {
    background: rgba(107, 114, 128, 0.5);
  }
}

.btn-danger-small {
  background: rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 4px 10px;
  font-size: 11px;
  border: 1px solid rgba(239, 68, 68, 0.5);

  &:hover {
    background: rgba(239, 68, 68, 0.5);
  }
}

.btn-secondary-small {
  background: rgba(107, 114, 128, 0.3);
  color: #c0c8e0;
  padding: 4px 10px;
  font-size: 11px;

  &:hover {
    background: rgba(107, 114, 128, 0.5);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 14px;
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(123, 44, 191, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(123, 44, 191, 0.1);
    border-color: rgba(123, 44, 191, 0.3);
  }

  &.delete-confirm {
    border-color: rgba(239, 68, 68, 0.5);
    background: rgba(239, 68, 68, 0.1);
  }
}

.config-info {
  flex: 1;
  cursor: pointer;
}

.config-name {
  font-weight: 600;
  color: #f0f4ff;
  font-size: 14px;
  margin-bottom: 2px;
}

.config-desc {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.config-date {
  font-size: 11px;
  color: #4b5563;
}

.config-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.delete-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }
}
</style>
