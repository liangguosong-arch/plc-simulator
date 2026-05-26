// 用户相关类型
export interface User {
  name: string
  role: string
  token: string | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  code: number
  message: string
  data: User
}

// 变量相关类型
export interface Variable {
  id: string
  address: string
  type: 'input' | 'output' | 'memory'
  dataType: 'BOOL' | 'INT' | 'UINT' | 'DINT' | 'REAL' | 'STRING'
  label: string
  description: string
  accessLevel: string
  currentValue: any
  simulationMode: 'auto' | 'manual'
  manualValue: any
  simulationConfig: SimulationConfig
  unit?: string
}

export interface SimulationConfig {
  strategy: 'random' | 'sine' | 'step' | 'binary-toggle' | 'fixed'
  fluctuationRange: number
  step: number
  updateInterval: number
  minValue: number
  maxValue: number
}

export interface VariableGroup {
  type: string
  title: string
  icon: string
  variables: Variable[]
}

// 设备实例配置
export interface DeviceInstance {
  id: string
  projectId?: string
  manufacturer: string
  type: 'plc' | 'hmi'
  series: string
  deviceModel: string
  instanceName: string
  status: 'online' | 'offline' | 'error'
  ipAddress?: string
  port?: number
  lastConnectedAt?: string
  createdAt: string
  updatedAt: string
}

// 配置响应
export interface ConfigResponse {
  code: number
  message: string
  data: {
    variables: Variable[]

    deviceInstance?: DeviceInstance
  }
}

// API 通用响应
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// Toast 类型
export type ToastType = 'success' | 'error' | 'info'

// 设备枚举相关类型
export interface Manufacturer {
  _id?: string
  id?: string
  name: string
  name_en?: string
  code?: string
  device_types?: Array<'plc' | 'hmi'> | string
  is_active?: boolean
  sort_order?: number
  logo_url?: string
  description?: string
}

export interface Series {
  _id?: string
  id?: string
  manufacturer_id?: string  // 保留以兼容旧数据
  manufacturer_name?: string  // 新增：使用品牌英文名关联
  name: string
  name_en?: string  // 新增：系列英文名
  code?: string
  type?: 'plc' | 'hmi'
  is_active?: boolean
  sort_order?: number
  description?: string
}

export interface PLCDevice {
  _id?: string
  id?: string
  series_id?: string  // 保留以兼容旧数据
  series_name?: string  // 新增：使用系列名关联
  manufacturer_name?: string  // 新增：使用品牌名关联
  model: string
  name: string
  manufacturer?: string  // 兼容字段
  series?: string  // 兼容字段
  type?: string
  cpu_type?: string
  memory_size?: number
  io_points?: number
  communicationProtocols?: string[]
  supportFeatures?: string[]
  description?: string
  is_active?: boolean
  sort_order?: number
  datasheet_url?: string
}

export interface VariableTemplate {
  _id?: string
  id?: string
  device_model_id?: string  // 保留以兼容旧数据
  device_model?: string  // 新增：使用设备型号关联
  manufacturer_name?: string  // 新增：品牌名
  series_name?: string  // 新增：系列名
  name: string
  address: string
  type: 'input' | 'output' | 'memory'
  data_type: 'BOOL' | 'INT' | 'UINT' | 'DINT' | 'REAL' | 'STRING'
  dataType?: 'BOOL' | 'INT' | 'UINT' | 'DINT' | 'REAL' | 'STRING'  // 兼容
  description?: string
  unit?: string
  default_value?: any
  defaultValue?: any  // 兼容
  min_value?: number
  minValue?: number  // 兼容
  max_value?: number
  maxValue?: number  // 兼容
  access_level?: 'read' | 'write' | 'read-write'
  accessLevel?: 'read' | 'write' | 'read-write'  // 兼容
  is_system_variable?: boolean
  isSystemVariable?: boolean  // 兼容
  sort_order?: number
  sortOrder?: number  // 兼容
}
