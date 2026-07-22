import axios from 'axios'
import type {
  LoginRequest,
  LoginResponse,
  ConfigResponse,
  Variable,
  DeviceInstance,
  InstanceSummary,
  InstanceDetail,
  ApiResponse
} from '@/types'

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 自动添加 Token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('plc_simulator_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.message)
    return Promise.reject(error)
  }
)

/**
 * 用户认证 API
 */
export const authApi = {
  // 登录
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', data)
    return response.data
  }
}

/**
 * 配置管理 API（已废弃，保留向后兼容）
 * @deprecated 使用 instancesApi.getInstanceConfig / updateInstanceConfig 替代
 */
export const configApi = {
  // 获取默认实例配置
  getConfig: async (): Promise<ConfigResponse> => {
    const response = await apiClient.get('/instances/0/config')
    return response.data
  },

  // 保存默认实例变量
  saveConfig: async (variables: Variable[]): Promise<ApiResponse> => {
    const response = await apiClient.put('/instances/0/variables', { variables })
    return response.data
  }
}

/**
 * 设备实例 API
 */
export const deviceInstanceApi = {
  // 获取设备实例信息
  getInstance: async (instanceId: string = '0'): Promise<ApiResponse<DeviceInstance>> => {
    const response = await apiClient.get(`/devices/instances/${instanceId}`)
    return response.data
  },

  // 更新设备实例信息
  updateInstance: async (instanceId: string, updates: Partial<DeviceInstance>): Promise<ApiResponse<DeviceInstance>> => {
    const response = await apiClient.put(`/devices/instances/${instanceId}`, updates)
    return response.data
  }
}

/**
 * 多实例管理 API (P5)
 */
export const instancesApi = {
  // 获取所有实例
  listInstances: async (): Promise<ApiResponse<{ instances: InstanceSummary[]; total: number }>> => {
    const response = await apiClient.get('/instances')
    return response.data
  },

  // 创建新实例
  createInstance: async (config: Record<string, unknown>): Promise<ApiResponse<DeviceInstance>> => {
    const response = await apiClient.post('/instances', config)
    return response.data
  },

  // 获取实例详情
  getInstance: async (instanceId: string): Promise<ApiResponse<InstanceDetail>> => {
    const response = await apiClient.get(`/instances/${instanceId}`)
    return response.data
  },

  // 启动实例
  startInstance: async (instanceId: string): Promise<ApiResponse> => {
    const response = await apiClient.post(`/instances/${instanceId}/start`)
    return response.data
  },

  // 停止实例
  stopInstance: async (instanceId: string): Promise<ApiResponse> => {
    const response = await apiClient.post(`/instances/${instanceId}/stop`)
    return response.data
  },

  // 删除实例
  deleteInstance: async (instanceId: string): Promise<ApiResponse> => {
    const response = await apiClient.delete(`/instances/${instanceId}`)
    return response.data
  },

  // 生成实例ID
  generateInstanceId: async (): Promise<ApiResponse<{ instanceId: string }>> => {
    const response = await apiClient.post('/instances/generate-id')
    return response.data
  },

  // 获取实例完整配置（含变量）
  getInstanceConfig: async (instanceId: string): Promise<ApiResponse<{ config: Record<string, unknown>; variables: Variable[] }>> => {
    const response = await apiClient.get(`/instances/${instanceId}/config`)
    return response.data
  },

  // 更新实例配置（属性编辑）
  updateInstanceConfig: async (instanceId: string, updates: Record<string, unknown>): Promise<ApiResponse> => {
    const response = await apiClient.put(`/instances/${instanceId}/config`, updates)
    return response.data
  },

  // 获取实例变量配置
  getInstanceVariables: async (instanceId: string): Promise<ApiResponse<{ variables: Variable[] }>> => {
    const response = await apiClient.get(`/instances/${instanceId}/variables`)
    return response.data
  },

  // 更新实例变量配置
  updateInstanceVariables: async (instanceId: string, variables: Variable[]): Promise<ApiResponse> => {
    const response = await apiClient.put(`/instances/${instanceId}/variables`, { variables })
    return response.data
  }
}

/**
 * 变量管理 API
 */
export const variableApi = {
  // 批量读取变量值
  getVariableValues: async (addresses: string[], instanceId: string = '0') => {
    const response = await apiClient.get(
      `/devices/instances/${instanceId}/variables/values?addresses=${encodeURIComponent(addresses.join(','))}`
    )
    return response.data
  },

  // 写入变量值
  writeVariableValue: async (address: string, value: any, instanceId: string = '0'): Promise<ApiResponse> => {
    const response = await apiClient.post(
      `/devices/instances/${instanceId}/variables/${encodeURIComponent(address)}/write`,
      { value }
    )
    return response.data
  }
}

/**
 * 设备枚举 API - 品牌、系列、型号、变量模板
 */
export const deviceCatalogApi = {
  // 获取所有品牌列表
  getManufacturers: async (options?: {
    deviceType?: string
    isActive?: boolean
  }) => {
    const params = new URLSearchParams()
    if (options?.deviceType) params.append('deviceType', options.deviceType)
    if (options?.isActive !== undefined) params.append('isActive', String(options.isActive))
    
    const queryString = params.toString()
    const url = `/devices/manufacturers${queryString ? `?${queryString}` : ''}`
    const response = await apiClient.get(url)
    return response.data
  },

  // 根据ID获取品牌详情
  getManufacturerById: async (id: string) => {
    const response = await apiClient.get(`/devices/manufacturers/${id}`)
    return response.data
  },

  // 获取系列列表
  getSeries: async (options?: {
    manufacturerId?: string  // 兼容旧版
    manufacturerName?: string  // 新版：使用品牌名
    type?: string
    isActive?: boolean
  }) => {
    const params = new URLSearchParams()
    if (options?.manufacturerId) params.append('manufacturerId', options.manufacturerId)
    if (options?.manufacturerName) params.append('manufacturerName', options.manufacturerName)
    if (options?.type) params.append('type', options.type)
    if (options?.isActive !== undefined) params.append('isActive', String(options.isActive))
    
    const queryString = params.toString()
    const url = `/devices/series${queryString ? `?${queryString}` : ''}`
    const response = await apiClient.get(url)
    return response.data
  },

  // 根据ID获取系列详情
  getSeriesById: async (id: string) => {
    const response = await apiClient.get(`/devices/series/${id}`)
    return response.data
  },

  // 获取PLC设备型号列表
  getPLCDevices: async (options?: {
    seriesId?: string  // 兼容旧版
    seriesName?: string  // 新版：使用系列名
    manufacturerName?: string  // 新版：使用品牌名
    isActive?: boolean
  }) => {
    const params = new URLSearchParams()
    if (options?.seriesId) params.append('seriesId', options.seriesId)
    if (options?.seriesName) params.append('seriesName', options.seriesName)
    if (options?.manufacturerName) params.append('manufacturerName', options.manufacturerName)
    if (options?.isActive !== undefined) params.append('isActive', String(options.isActive))
    
    const queryString = params.toString()
    const url = `/devices/plc${queryString ? `?${queryString}` : ''}`
    const response = await apiClient.get(url)
    return response.data
  },

  // 根据ID获取PLC设备详情
  getPLCDeviceById: async (id: string) => {
    const response = await apiClient.get(`/devices/plc/${id}`)
    return response.data
  },

  // 根据型号获取PLC设备
  getPLCDeviceByModel: async (model: string) => {
    const response = await apiClient.get(`/devices/plc/model/${encodeURIComponent(model)}`)
    return response.data
  },

  // 获取变量模板列表
  getVariableTemplates: async (options?: {
    deviceModelId?: string  // 兼容旧版
    deviceModel?: string  // 新版：使用设备型号
    manufacturerName?: string  // 新版：使用品牌名
    seriesName?: string  // 新版：使用系列名
    type?: string
  }) => {
    const params = new URLSearchParams()
    if (options?.deviceModelId) params.append('deviceModelId', options.deviceModelId)
    if (options?.deviceModel) params.append('deviceModel', options.deviceModel)
    if (options?.manufacturerName) params.append('manufacturerName', options.manufacturerName)
    if (options?.seriesName) params.append('seriesName', options.seriesName)
    if (options?.type) params.append('type', options.type)
    
    const queryString = params.toString()
    const url = `/devices/variables/templates${queryString ? `?${queryString}` : ''}`
    const response = await apiClient.get(url)
    return response.data
  },

  // 根据ID获取变量模板详情
  getVariableTemplateById: async (id: string) => {
    const response = await apiClient.get(`/devices/variables/templates/${id}`)
    return response.data
  }
}

export default apiClient