import axios from 'axios'
import type {
  LoginRequest,
  LoginResponse,
  ConfigResponse,
  Variable,
  DeviceInstance,
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
 * 配置管理 API
 */
export const configApi = {
  // 获取配置
  getConfig: async (): Promise<ConfigResponse> => {
    const response = await apiClient.get('/config')
    return response.data
  },

  // 保存配置
  saveConfig: async (variables: Variable[]): Promise<ApiResponse> => {
    const response = await apiClient.put('/config', { variables })
    return response.data
  }
}

/**
 * 设备实例 API
 */
export const deviceInstanceApi = {
  // 获取设备实例信息
  getInstance: async (instanceId: string = 'sim-device-001'): Promise<ApiResponse<DeviceInstance>> => {
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
 * 变量管理 API
 */
export const variableApi = {
  // 批量读取变量值
  getVariableValues: async (addresses: string[]) => {
    const response = await apiClient.get(
      `/devices/instances/sim-device-001/variables/values?addresses=${encodeURIComponent(addresses.join(','))}`
    )
    return response.data
  },

  // 写入变量值
  writeVariableValue: async (address: string, value: any): Promise<ApiResponse> => {
    const response = await apiClient.post(
      `/devices/instances/sim-device-001/variables/${encodeURIComponent(address)}/write`,
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