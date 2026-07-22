<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useInstanceStore } from '@/stores/instances'
import { useUiStore } from '@/stores/ui'
import { instancesApi, deviceCatalogApi } from '@/api'
import type { InstanceSummary, Manufacturer, Series, PLCDevice } from '@/types'

const router = useRouter()
const instanceStore = useInstanceStore()
const uiStore = useUiStore()

const loading = ref(false)

// ===== 级联数据（创建 / 编辑共用） =====
// 制造商列表
const manufacturerList = ref<Manufacturer[]>([])
const manufacturerLoading = ref(false)

// 系列列表（按选中制造商级联）
const seriesList = ref<Series[]>([])
const seriesLoading = ref(false)

// 型号列表（按选中系列级联）
const modelList = ref<PLCDevice[]>([])
const modelLoading = ref(false)

// ===== 创建对话框 =====
const showCreateModal = ref(false)
const creating = ref(false)
const newId = ref('')
const newName = ref('')
const newManufacturer = ref('')
const newSeries = ref('')
const newModel = ref('')

// ===== 编辑对话框 =====
const showEditModal = ref(false)
const editing = ref(false)
const editingId = ref('')
const editName = ref('')
const editManufacturer = ref('')
const editSeries = ref('')
const editModel = ref('')

// 启动/停止加载中的实例ID
const actionLoadingId = ref('')

// ===== 级联加载函数 =====

/** 加载制造商列表（PLC 类型） */
async function loadManufacturers() {
  manufacturerLoading.value = true
  try {
    const result = await deviceCatalogApi.getManufacturers({ deviceType: 'plc' })
    manufacturerList.value = (result.data || []) as Manufacturer[]
    console.log('manufacturerList: ', manufacturerList.value)
  } catch {
    manufacturerList.value = []
  } finally {
    manufacturerLoading.value = false
  }
}

/** 根据选中制造商加载系列列表 */
async function loadSeries(manufacturerName: string) {
  if (!manufacturerName) {
    seriesList.value = []
    return
  }
  seriesLoading.value = true
  try {
    const result = await deviceCatalogApi.getSeries({ manufacturerName, type: 'plc' })
    seriesList.value = (result.data || []) as Series[]
  } catch {
    seriesList.value = []
  } finally {
    seriesLoading.value = false
  }
}

/** 根据选中系列加载型号列表 */
async function loadModels(seriesName: string) {
  if (!seriesName) {
    modelList.value = []
    return
  }
  modelLoading.value = true
  try {
    const result = await deviceCatalogApi.getPLCDevices({ seriesName })
    modelList.value = (result.data || []) as PLCDevice[]
  } catch {
    modelList.value = []
  } finally {
    modelLoading.value = false
  }
}

// ===== 创建对话框级联联动 =====

/** 新实例：制造商变更 → 重置并加载系列 */
watch(newManufacturer, (name) => {
  newSeries.value = ''
  newModel.value = ''
  seriesList.value = []
  modelList.value = []
  if (name) {
    loadSeries(name)
  }
})

/** 新实例：系列变更 → 重置并加载型号 */
watch(newSeries, (name) => {
  newModel.value = ''
  modelList.value = []
  if (name) {
    loadModels(name)
  }
})

// ===== 编辑对话框级联联动 =====

/** 编辑：制造商变更 → 重置并加载系列 */
watch(editManufacturer, (name) => {
  editSeries.value = ''
  editModel.value = ''
  seriesList.value = []
  modelList.value = []
  if (name) {
    loadSeries(name)
  }
})

/** 编辑：系列变更 → 重置并加载型号 */
watch(editSeries, (name) => {
  editModel.value = ''
  modelList.value = []
  if (name) {
    loadModels(name)
  }
})

// ===== 创建对话框操作 =====

async function openCreateModal() {
  try {
    const result = await instancesApi.generateInstanceId()
    newId.value = result.data!.instanceId
  } catch {
    newId.value = `inst-${Date.now().toString(36)}`
  }
  newName.value = ''
  newManufacturer.value = manufacturerList.value.length > 0 ? manufacturerList.value[0].name : ''
  newSeries.value = ''
  newModel.value = ''
  seriesList.value = []
  modelList.value = []
  // 预加载第一个制造商的系列
  if (newManufacturer.value) {
    loadSeries(newManufacturer.value)
  }
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
  // 重置级联数据避免影响编辑对话框
  seriesList.value = []
  modelList.value = []
}

async function handleCreate() {
  if (!newName.value.trim()) {
    uiStore.showToast('请输入实例名称', 'error')
    return
  }
  if (!newManufacturer.value) {
    uiStore.showToast('请选择制造商', 'error')
    return
  }
  if (!newSeries.value) {
    uiStore.showToast('请选择系列', 'error')
    return
  }
  if (!newModel.value) {
    uiStore.showToast('请选择型号', 'error')
    return
  }
  creating.value = true
  try {
    await instanceStore.createInstance({
      id: newId.value,
      instanceName: newName.value.trim(),
      manufacturer: newManufacturer.value,
      series: newSeries.value,
      deviceModel: newModel.value,
      type: 'plc'
    })
    uiStore.showToast('实例创建成功', 'success')
    closeCreateModal()
  } catch (err: any) {
    uiStore.showToast(err.response?.data?.message || '创建失败', 'error')
  } finally {
    creating.value = false
  }
}

// ===== 编辑对话框操作 =====

function openEditModal(inst: InstanceSummary) {
  editingId.value = inst.instanceId
  editName.value = inst.name || inst.instanceId
  seriesList.value = []
  modelList.value = []
  getInstanceDetail(inst.instanceId)
  showEditModal.value = true
}

async function getInstanceDetail(instanceId: string) {
  try {
    const result = await instancesApi.getInstance(instanceId)
    if (result.code === 200 && result.data && result.data.config) {
      const cfg = result.data.config as unknown as Record<string, unknown>
      editName.value = (cfg.instanceName as string) || instanceId
      const mfr = (cfg.manufacturer as string) || ''
      const ser = (cfg.series as string) || ''
      const mdl = (cfg.deviceModel as string) || ''

      // 先设制造商，级联 watch 会自动加载系列
      editManufacturer.value = mfr
      // 需要等系列加载完成后设置系列和型号
      if (mfr) {
        await loadSeries(mfr)
        editSeries.value = ser
        if (ser) {
          await loadModels(ser)
          editModel.value = mdl
        }
      }
    }
  } catch { /* ignore */ }
}

function closeEditModal() {
  showEditModal.value = false
  seriesList.value = []
  modelList.value = []
}

async function handleEdit() {
  if (!editName.value.trim()) {
    uiStore.showToast('请输入实例名称', 'error')
    return
  }
  editing.value = true
  try {
    await instanceStore.updateInstance(editingId.value, {
      instanceName: editName.value.trim(),
      manufacturer: editManufacturer.value,
      series: editSeries.value,
      deviceModel: editModel.value,
    })
    uiStore.showToast('实例属性已更新', 'success')
    closeEditModal()
  } catch (err: any) {
    uiStore.showToast(err.response?.data?.message || '更新失败', 'error')
  } finally {
    editing.value = false
  }
}

// ===== 实例操作 =====

async function handleToggleStatus(inst: InstanceSummary) {
  actionLoadingId.value = inst.instanceId
  try {
    if (inst.status === 'running') {
      await instancesApi.stopInstance(inst.instanceId)
    } else {
      await instancesApi.startInstance(inst.instanceId)
    }
    await instanceStore.loadInstances()
  } catch (err: any) {
    uiStore.showToast(err.response?.data?.message || '操作失败', 'error')
  } finally {
    actionLoadingId.value = ''
  }
}

async function handleDelete(inst: InstanceSummary) {
  if (inst.instanceId === '0') {
    uiStore.showToast('默认实例不可删除', 'error')
    return
  }
  if (!confirm(`确定要删除实例 "${inst.name || inst.instanceId}" 吗？`)) return
  actionLoadingId.value = inst.instanceId
  try {
    await instanceStore.deleteInstance(inst.instanceId)
    uiStore.showToast('实例已删除', 'success')
  } catch (err: any) {
    uiStore.showToast(err.response?.data?.message || '删除失败', 'error')
  } finally {
    actionLoadingId.value = ''
  }
}

function goToInstance(instanceId: string) {
  instanceStore.switchInstance(instanceId)
  router.push('/')
}

onMounted(async () => {
  loading.value = true
  await Promise.all([
    instanceStore.loadInstances(),
    loadManufacturers()
  ])
  loading.value = false
})
</script>

<template>
  <div class="instance-manager">
    <div class="page-header">
      <div class="header-info">
        <h2>📋 实例管理</h2>
        <p>管理所有 PLC 仿真实例的配置和生命周期</p>
      </div>
      <button class="create-btn" @click="openCreateModal">+ 创建实例</button>
    </div>

    <!-- 实例列表 -->
    <div class="instance-table-wrap" v-if="!loading">
      <table class="instance-table" v-if="instanceStore.instances.length > 0">
        <thead>
          <tr>
            <th>实例ID</th>
            <th>名称</th>
            <th>设备类型</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inst in instanceStore.instances" :key="inst.instanceId" :class="{ 'is-default': inst.instanceId === '0' }">
            <td>
              <code class="instance-id-code">{{ inst.instanceId }}</code>
              <span v-if="inst.instanceId === '0'" class="badge">默认</span>
            </td>
            <td>{{ inst.name || inst.instanceId }}</td>
            <td><span class="device-tag">{{ inst.deviceType }}</span></td>
            <td>
              <span class="status-badge" :class="inst.status === 'running' ? 'running' : 'offline'">
                {{ inst.status === 'running' ? '🟢 运行中' : '🔴 已停止' }}
              </span>
            </td>
            <td class="date-cell">{{ inst.createdAt ? new Date(inst.createdAt).toLocaleDateString() : '-' }}</td>
            <td class="actions-cell">
              <button class="action-btn primary" @click="goToInstance(inst.instanceId)" title="打开实例">
                🔍
              </button>
              <button class="action-btn" @click="openEditModal(inst)" title="编辑属性">
                ✏️
              </button>
              <button class="action-btn" @click="handleToggleStatus(inst)" :disabled="actionLoadingId === inst.instanceId" title="启动/停止">
                {{ inst.status === 'running' ? '⏹' : '▶️' }}
              </button>
              <button
                v-if="inst.instanceId !== '0'"
                class="action-btn danger"
                @click="handleDelete(inst)"
                :disabled="actionLoadingId === inst.instanceId"
                title="删除"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="empty-state" v-else>
        <p>暂无实例，请点击「创建实例」按钮开始。</p>
      </div>
    </div>

    <div class="loading-state" v-else>
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 创建对话框 -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
        <div class="modal">
          <div class="modal-header">
            <h3>创建新实例</h3>
            <button class="modal-close" @click="closeCreateModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>实例ID</label>
              <input type="text" :value="newId" disabled class="readonly-input" />
              <span class="form-hint">自动生成，不可修改</span>
            </div>
            <div class="form-group">
              <label>实例名称 <span class="required">*</span></label>
              <input
                v-model="newName"
                type="text"
                placeholder="输入实例友好名称"
                @keyup.enter="handleCreate"
              />
            </div>
            <div class="form-group">
              <label>制造商 <span class="required">*</span></label>
              <select v-model="newManufacturer" :disabled="manufacturerLoading">
                <option value="" disabled>-- 请选择制造商 --</option>
                <option v-for="m in manufacturerList" :key="m._id || m.id" :value="m.name_en || m.name">
                  {{ m.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>系列 <span class="required">*</span></label>
              <select v-model="newSeries" :disabled="!newManufacturer || seriesLoading">
                <option value="" disabled>-- {{ seriesLoading ? '加载中...' : '请选择系列' }} --</option>
                <option v-for="s in seriesList" :key="s._id || s.id" :value="s.name">
                  {{ s.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>型号 <span class="required">*</span></label>
              <select v-model="newModel" :disabled="!newSeries || modelLoading">
                <option value="" disabled>-- {{ modelLoading ? '加载中...' : '请选择型号' }} --</option>
                <option v-for="d in modelList" :key="d._id || d.id" :value="d.model">
                  {{ d.model }}<template v-if="d.name && d.name !== d.model"> — {{ d.name }}</template>
                </option>
              </select>
              <span v-if="newModel && modelList.length > 0" class="form-hint device-specs">
                <template v-for="d in modelList.filter(m => m.model === newModel)" :key="d._id || d.id">
                  <span v-if="d.cpu_type">CPU: {{ d.cpu_type }}</span>
                  <span v-if="d.memory_size"> | 内存: {{ d.memory_size }}KB</span>
                  <span v-if="d.io_points !== undefined"> | IO: {{ d.io_points }}点</span>
                </template>
              </span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="closeCreateModal" :disabled="creating">取消</button>
            <button class="confirm-btn" @click="handleCreate" :disabled="creating || !newName.trim() || !newManufacturer || !newSeries || !newModel">
              {{ creating ? '创建中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 编辑对话框 -->
    <Teleport to="body">
      <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
        <div class="modal">
          <div class="modal-header">
            <h3>编辑实例属性</h3>
            <button class="modal-close" @click="closeEditModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>实例ID</label>
              <input type="text" :value="editingId" disabled class="readonly-input" />
            </div>
            <div class="form-group">
              <label>实例名称 <span class="required">*</span></label>
              <input v-model="editName" type="text" placeholder="实例名称" />
            </div>
            <div class="form-group">
              <label>制造商</label>
              <select v-model="editManufacturer" :disabled="manufacturerLoading">
                <option value="" disabled>-- 请选择制造商 --</option>
                <option v-for="m in manufacturerList" :key="m._id || m.id" :value="m.name_en ||m.name">
                  {{ m.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>系列</label>
              <select v-model="editSeries" :disabled="!editManufacturer || seriesLoading">
                <option value="" disabled>-- {{ seriesLoading ? '加载中...' : '请选择系列' }} --</option>
                <option v-for="s in seriesList" :key="s._id || s.id" :value="s.name">
                  {{ s.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>型号</label>
              <select v-model="editModel" :disabled="!editSeries || modelLoading">
                <option value="" disabled>-- {{ modelLoading ? '加载中...' : '请选择型号' }} --</option>
                <option v-for="d in modelList" :key="d._id || d.id" :value="d.model">
                  {{ d.model }}<template v-if="d.name && d.name !== d.model"> — {{ d.name }}</template>
                </option>
              </select>
              <span v-if="editModel && modelList.length > 0" class="form-hint device-specs">
                <template v-for="d in modelList.filter(m => m.model === editModel)" :key="d._id || d.id">
                  <span v-if="d.cpu_type">CPU: {{ d.cpu_type }}</span>
                  <span v-if="d.memory_size"> | 内存: {{ d.memory_size }}KB</span>
                  <span v-if="d.io_points !== undefined"> | IO: {{ d.io_points }}点</span>
                </template>
              </span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-btn" @click="closeEditModal" :disabled="editing">取消</button>
            <button class="confirm-btn" @click="handleEdit" :disabled="editing || !editName.trim()">
              {{ editing ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.instance-manager {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-info h2 {
  font-size: 20px;
  color: #1e293b;
  margin-bottom: 4px;
}

.header-info p {
  font-size: 13px;
  color: #64748b;
}

.create-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 表格 */
.instance-table-wrap {
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  overflow: hidden;
}

.instance-table {
  width: 100%;
  border-collapse: collapse;
}

.instance-table th {
  background: #f8fafc;
  text-align: left;
  padding: 12px 16px;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #e2e8f0;
}

.instance-table td {
  padding: 12px 16px;
  font-size: 13px;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
}

.instance-table tr:hover td {
  background: #f8fafc;
}

.is-default td {
  background: #fefce8;
}

.instance-id-code {
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.badge {
  background: #fbbf24;
  color: #78350f;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  margin-left: 6px;
  vertical-align: middle;
}

.device-tag {
  background: #eef2ff;
  color: #4338ca;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.status-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.running {
  background: #dcfce7;
  color: #166534;
}

.status-badge.offline {
  background: #fee2e2;
  color: #991b1b;
}

.date-cell {
  font-size: 12px;
  color: #94a3b8;
}

.actions-cell {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.action-btn.primary:hover:not(:disabled) { background: #eef2ff; border-color: #667eea; }
.action-btn.danger:hover:not(:disabled) { background: #fef2f2; border-color: #ef4444; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 空/加载 */
.empty-state, .loading-state {
  padding: 60px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: white;
  border-radius: 12px;
  width: 520px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  animation: slideUp 0.25s;
}

@keyframes slideUp {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 0;
}

.modal-header h3 {
  font-size: 18px;
  color: #1e293b;
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.modal-close:hover { background: #f1f5f9; color: #475569; }

.modal-body {
  padding: 20px 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

.required { color: #ef4444; }

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  outline: none;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
}

.readonly-input {
  background: #f8fafc !important;
  color: #94a3b8 !important;
  cursor: not-allowed;
  font-family: monospace;
}

.form-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
  display: block;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* 级联 select 禁用的过渡态样式 */
.form-group select:disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
}

/* 选中型号后显示的规格提示 */
.device-specs {
  background: #eef2ff;
  color: #4338ca;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  gap: 6px;
  margin-top: 6px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 0 24px 20px;
  justify-content: flex-end;
}

.cancel-btn, .confirm-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: white;
  border: 2px solid #e2e8f0;
  color: #475569;
}

.cancel-btn:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.confirm-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102,126,234,0.4);
}

.confirm-btn:disabled, .cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
