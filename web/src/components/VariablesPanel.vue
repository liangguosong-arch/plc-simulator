<template>
  <div class="content">
    <!-- 加载中 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>Loading configuration...</span>
    </div>

    <!-- 变量列表 -->
    <div v-else>
      <!-- 按类别分组显示变量 -->
      <div v-for="group in variableGroups" :key="group.type" class="variable-group">
        <div class="group-title">
          <span>{{ group.icon }}</span>
          {{ group.title }} ({{ group.variables.length }})
          <button class="add-variable-btn" @click="showAddVariableModal(group.type)">
            + Add Variable
          </button>
        </div>
        
        <div class="variables-grid">
          <div v-for="variable in group.variables" :key="variable.id" class="variable-card">
            <!-- 变量头部：信息 + 值 -->
            <div class="variable-header">
              <div class="variable-info">
                <h4>{{ variable.label }}</h4>
                <p>{{ variable.description }} | {{ variable.address }} | {{ variable.dataType }} | {{ variable.accessLevel }}</p>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="value-display">
                  {{ formatValue(variable) }}
                </div>
                <button 
                  class="delete-variable-btn" 
                  @click="confirmDeleteVariable(variable)"
                  title="Delete this variable"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <!-- 控制区域：Auto开关 + 配置 -->
            <div class="variable-controls">
              <!-- Auto/Manual 切换 -->
              <div class="mode-control">
                <input 
                  type="checkbox" 
                  :id="'auto-' + variable.id"
                  :checked="variable.simulationMode === 'auto'"
                  @change="handleToggleMode(variable)"
                >
                <label :for="'auto-' + variable.id">Auto</label>
              </div>
              
              <!-- 配置面板 -->
              <div class="config-panel" style="flex: 1;">
                <!-- 自动模式配置 -->
                <template v-if="variable.simulationMode === 'auto'">
                  <div class="config-row">
                    <label>Strategy:</label>
                    <select v-model="variable.simulationConfig!.strategy" @change="handleSaveConfig">
                      <option value="random">Random</option>
                      <option value="sine">Sine</option>
                      <option value="step">Step (Ramp)</option>
                      <option value="binary-toggle">Binary Toggle</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div class="config-row" v-if="variable.simulationConfig!.strategy === 'random'">
                    <label>Range:</label>
                    <input type="number" v-model.number="variable.simulationConfig!.fluctuationRange" min="1" max="100" @change="handleSaveConfig">
                  </div>
                  <div class="config-row" v-if="variable.simulationConfig!.strategy === 'step'">
                    <label>Step:</label>
                    <input type="number" v-model.number="variable.simulationConfig!.step" min="1" @change="handleSaveConfig">
                  </div>
                  <div class="config-row" v-if="variable.simulationConfig!.strategy === 'step' || variable.simulationConfig!.strategy === 'binary-toggle'">
                    <label>Interval:</label>
                    <input type="number" v-model.number="variable.simulationConfig!.updateInterval" min="100" step="100" @change="handleSaveConfig">
                  </div>
                  <div class="config-row">
                    <label>Min/Max:</label>
                    <input type="number" v-model.number="variable.simulationConfig!.minValue" @change="handleSaveConfig" style="width: 45%;">
                    <input type="number" v-model.number="variable.simulationConfig!.maxValue" @change="handleSaveConfig" style="width: 45%;">
                  </div>
                </template>
                
                <!-- 手动模式输入 -->
                <template v-else>
                  <div class="config-row">
                    <label>Value:</label>
                    <input 
                      v-if="variable.dataType === 'BOOL'" 
                      type="checkbox" 
                      v-model="variable.manualValue"
                      @change="handleUpdateManualValue(variable)"
                    >
                    <input 
                      v-else
                      type="number" 
                      v-model.number="variable.manualValue"
                      @change="handleUpdateManualValue(variable)"
                      :step="variable.dataType === 'REAL' ? 0.1 : 1"
                      :min="variable.simulationConfig!.minValue"
                      :max="variable.simulationConfig!.maxValue"
                    >
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 保存按钮 -->
      <button class="save-btn" @click="handleSaveAllConfig">💾 Save All Configuration</button>
    </div>
  </div>
  
  <!-- 添加变量模态框 -->
  <Teleport to="body">
    <div v-if="showAddVariable" class="modal-overlay" @click.self="closeAddVariableModal">
      <div class="add-variable-modal">
        <h2>➕ Add New Variable</h2>
        
        <div v-if="addError" class="error-message">
          {{ addError }}
        </div>

        <form @submit.prevent="handleAddVariable">
          <div class="form-row">
            <div class="form-group">
              <label for="varAddress">Address *</label>
              <input 
                id="varAddress"
                v-model="newVariable.address" 
                type="text" 
                placeholder="e.g., M100, Q0.1"
                required
              >
            </div>

            <div class="form-group">
              <label for="varDataType">Data Type *</label>
              <select id="varDataType" v-model="newVariable.dataType" required>
                <option value="BOOL">BOOL</option>
                <option value="INT">INT</option>
                <option value="UINT">UINT</option>
                <option value="DINT">DINT</option>
                <option value="REAL">REAL</option>
                <option value="STRING">STRING</option>
              </select>
            </div>
          </div>

          <div class="form-group full-width">
            <label for="varLabel">Label (Optional)</label>
            <input 
              id="varLabel"
              v-model="newVariable.label" 
              type="text" 
              placeholder="Leave empty to auto-generate from group + address"
            >
          </div>

          <div class="form-group full-width">
            <label for="varDescription">Description (Optional)</label>
            <input 
              id="varDescription"
              v-model="newVariable.description" 
              type="text" 
              placeholder="Brief description of this variable"
            >
          </div>

          <!-- 数值类型才显示范围设置 -->
          <div v-if="newVariable.dataType && isNumericType(newVariable.dataType)" class="form-row">
            <div class="form-group">
              <label for="varMin">Min Value</label>
              <input 
                id="varMin"
                v-model.number="newVariable.minValue" 
                type="number" 
                :step="newVariable.dataType === 'REAL' ? 0.1 : 1"
              >
            </div>

            <div class="form-group">
              <label for="varMax">Max Value</label>
              <input 
                id="varMax"
                v-model.number="newVariable.maxValue" 
                type="number" 
                :step="newVariable.dataType === 'REAL' ? 0.1 : 1"
              >
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="cancel-btn" @click="closeAddVariableModal">
              Cancel
            </button>
            <button type="submit" class="confirm-btn">
              Add Variable
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- 确认删除模态框 -->
  <Teleport to="body">
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="closeDeleteConfirm">
      <div class="confirm-modal">
        <h3>⚠️ Confirm Deletion</h3>
        <p>Are you sure you want to delete the variable "<span class="variable-name">{{ variableToDelete?.label }}</span>"?</p>
        <p style="font-size: 12px; color: #999;">This action cannot be undone.</p>
        
        <div class="confirm-actions">
          <button class="delete-cancel-btn" @click="closeDeleteConfirm">
            Cancel
          </button>
          <button class="delete-confirm-btn" @click="handleDeleteVariable">
            Delete
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useVariableStore } from '@/stores/variables'
import { useUiStore } from '@/stores/ui'
import type { Variable } from '@/types'

// Stores
const variableStore = useVariableStore()
const uiStore = useUiStore()

// State
const showAddVariable = ref(false)
const addError = ref('')
const currentGroupType = ref('')
const newVariable = ref<Partial<Variable> & { address: string; label: string; description: string; minValue: number; maxValue: number }>({
  address: '',
  dataType: 'INT',
  label: '',
  description: '',
  minValue: 0,
  maxValue: 100
})

const showDeleteConfirm = ref(false)
const variableToDelete = ref<Variable | null>(null)

// Computed - 使用 storeToRefs 保持响应式
const { loading, variableGroups } = storeToRefs(variableStore)
const isNumericType = variableStore.isNumericType
const formatValue = variableStore.formatValue


// Methods
const handleSaveConfig = async () => {
  try {
    await variableStore.saveConfig()
  } catch (error) {
    uiStore.showToast('Failed to save configuration', 'error')
  }
}

const handleToggleMode = (variable: Variable) => {
  variableStore.toggleMode(variable)
  const newMode = variable.simulationMode // === 'auto' ? 'manual' : 'auto'
  uiStore.showToast(`Switched to ${newMode} mode`)
}

const handleUpdateManualValue = async (variable: Variable) => {
  try {
    await variableStore.updateManualValue(variable)
    uiStore.showToast('Value updated successfully')
  } catch (error) {
    uiStore.showToast('Failed to update value', 'error')
  }
}

const handleSaveAllConfig = async () => {
  try {
    await variableStore.saveConfig()
    uiStore.showToast('Configuration saved successfully!')
  } catch (error) {
    uiStore.showToast('Failed to save configuration', 'error')
  }
}

const showAddVariableModal = (groupType: string) => {
  currentGroupType.value = groupType
  showAddVariable.value = true
  addError.value = ''
  
  // 重置表单
  newVariable.value = {
    address: '',
    dataType: 'INT',
    label: '',
    description: '',
    minValue: 0,
    maxValue: 100
  }
  
  // 聚焦到地址输入框
  setTimeout(() => {
    const addressInput = document.getElementById('varAddress')
    if (addressInput) {
      addressInput.focus()
    }
  }, 100)
}

const closeAddVariableModal = () => {
  showAddVariable.value = false
  addError.value = ''
  newVariable.value = {
    address: '',
    dataType: 'INT',
    label: '',
    description: '',
    minValue: 0,
    maxValue: 100
  }
}

const handleAddVariable = async () => {
  if (!newVariable.value.address) {
    addError.value = 'Address is required'
    return
  }

  // 检查地址是否已存在
  const exists = variableStore.variables.some((v: Variable) => 
    v.address === newVariable.value.address && v.type === currentGroupType.value
  )
  
  if (exists) {
    addError.value = `Variable with address ${newVariable.value.address} already exists in this group`
    return
  }

  // 生成Label（如果用户没有输入）
  const groupNames: Record<string, string> = {
    input: 'Input',
    output: 'Output',
    memory: 'Memory'
  }
  
  const label = newVariable.value.label || 
    `${groupNames[currentGroupType.value]} ${newVariable.value.address}`

  // 创建新变量对象
  const varToAdd: Variable = {
    id: `var-${Date.now()}`,
    address: newVariable.value.address,
    type: currentGroupType.value as any,
    dataType: newVariable.value.dataType || 'INT',
    label: label,
    description: newVariable.value.description || '',
    accessLevel: 'read-write',
    currentValue: newVariable.value.dataType === 'BOOL' ? false : 0,
    simulationMode: 'manual',
    manualValue: newVariable.value.dataType === 'BOOL' ? false : 0,
    simulationConfig: {
      strategy: 'random',
      fluctuationRange: 10,
      step: 1,
      updateInterval: 1000,
      minValue: isNumericType(newVariable.value.dataType || 'INT') ? (newVariable.value.minValue || 0) : 0,
      maxValue: isNumericType(newVariable.value.dataType || 'INT') ? (newVariable.value.maxValue || 100) : 100
    },
    unit: ''
  }

  // 添加到 store
  variableStore.addVariable(varToAdd)

  // 关闭模态框并显示成功提示
  closeAddVariableModal()
  uiStore.showToast(`Variable "${label}" added successfully!`)
}

const confirmDeleteVariable = (variable: Variable) => {
  variableToDelete.value = variable
  showDeleteConfirm.value = true
}

const closeDeleteConfirm = () => {
  showDeleteConfirm.value = false
  variableToDelete.value = null
}

const handleDeleteVariable = () => {
  if (!variableToDelete.value) {
    return
  }

  const varName = variableToDelete.value.label
  const varId = variableToDelete.value.id

  // 从 store 中移除
  variableStore.deleteVariable(varId)

  // 关闭确认框并显示成功提示
  closeDeleteConfirm()
  uiStore.showToast(`Variable "${varName}" deleted successfully!`)
}

// Lifecycle
onMounted(() => {
  // App.vue/HomePage 已通过 switchInstance 统一加载实例数据，
  // 此处仅确保实时轮询处于运行状态
  variableStore.startRealtimeUpdate()
})

onBeforeUnmount(() => {
  variableStore.stopRealtimeUpdate()
})
</script>

<style scoped>
/* 内容区样式 */
.content {
  padding: 20px;
}

/* 变量组样式 */
.variable-group {
  margin-bottom: 15px;
}

.group-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 2px solid #667eea;
  display: flex;
  align-items: center;
}

.group-title span {
  margin-right: 6px;
}

.add-variable-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-left: auto;
  transition: all 0.3s;
}

.add-variable-btn:hover {
  background: #5568d3;
  transform: translateY(-1px);
}

/* 变量网格布局 */
.variables-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.variable-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.2s;
}

.variable-card:hover {
  box-shadow: 0 1px 4px rgba(102, 126, 234, 0.15);
  border-color: #667eea;
}

.variable-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.variable-info h4 {
  font-size: 12px;
  color: #333;
  margin-bottom: 2px;
}

.variable-info p {
  font-size: 10px;
  color: #666;
  line-height: 1.3;
}

.value-display {
  font-size: 14px;
  font-weight: bold;
  color: #667eea;
  text-align: center;
  padding: 6px 8px;
  background: linear-gradient(135deg, #f5f7ff 0%, #f0f2ff 100%);
  border-radius: 4px;
  border: 1px solid #e0e4ff;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.variable-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-control {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.mode-control label {
  font-size: 10px;
  color: #555;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
}

.mode-control input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  margin: 0;
}

.config-panel {
  background: linear-gradient(135deg, #f8f9ff 0%, #f5f7ff 100%);
  padding: 6px 8px;
  border-radius: 4px;
  display: grid;
  gap: 4px;
  border: 1px solid #e0e4ff;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.config-row label {
  min-width: 55px;
  font-size: 10px;
  color: #555;
  font-weight: 500;
  white-space: nowrap;
}

input[type="number"],
input[type="text"],
select {
  flex: 1;
  padding: 3px 6px;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 11px;
  transition: all 0.3s;
  min-width: 0;
}

input[type="number"]:focus,
input[type="text"]:focus,
select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.save-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  margin-top: 15px;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.save-btn:active {
  transform: translateY(0);
}

/* 删除按钮样式 */
.delete-variable-btn {
  background: transparent;
  color: #f56565;
  border: 1px solid #f56565;
  padding: 2px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.3s;
  margin-left: auto;
}

.delete-variable-btn:hover {
  background: #f56565;
  color: white;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.add-variable-modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s;
  max-height: 90vh;
  overflow-y: auto;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.add-variable-modal h2 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.range-inputs {
  display: flex;
  gap: 10px;
  align-items: center;
}

.range-inputs span {
  color: #666;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions button {
  flex: 1;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.confirm-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.cancel-btn {
  background: white;
  color: #666;
  border: 2px solid #ddd;
}

.cancel-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

/* 确认删除模态框 */
.confirm-modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s;
}

.confirm-modal h3 {
  color: #333;
  margin-bottom: 15px;
  text-align: center;
}

.confirm-modal p {
  color: #666;
  text-align: center;
  margin-bottom: 20px;
  font-size: 14px;
}

.confirm-modal .variable-name {
  font-weight: bold;
  color: #667eea;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.confirm-actions button {
  flex: 1;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.delete-confirm-btn {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
  border: none;
}

.delete-confirm-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 101, 101, 0.4);
}

.delete-cancel-btn {
  background: white;
  color: #666;
  border: 2px solid #ddd;
}

.delete-cancel-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 14px;
  text-align: center;
}

/* 加载动画 */
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px;
  font-size: 18px;
  color: #667eea;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-right: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
