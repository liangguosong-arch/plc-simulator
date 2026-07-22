// 从api导入基础类型
import {
  DeviceType,
  VariableType,
  DataType,
  AccessLevel,
  SimulationMode,
  SimulationStrategy,
  DataQuality,
  AlarmStatus,
  AlarmSeverity
} from './api'

// 重新导出 api 中的类型
export {
  DeviceType,
  VariableType,
  DataType,
  AccessLevel,
  SimulationMode,
  SimulationStrategy,
  DataQuality,
  AlarmStatus,
  AlarmSeverity
} from './api'

// 在device.ts中定义这些类型并导出
export type DeviceStatusType = 'running' | 'stopped' | 'error' | 'maintenance' | 'offline'
export type OperationMode = 'auto' | 'manual' | 'teach'

/**
 * 变量配置接口
 */
export interface VariableConfig {
  id: string
  label: string
  //value: string
  type: VariableType
  address: string
  dataType: DataType
  description?: string
  unit?: string
  minValue?: number
  maxValue?: number
  accessLevel: AccessLevel
  
  // 模拟配置
  simulationMode: SimulationMode
  simulationConfig?: {
    strategy: SimulationStrategy
    fluctuationRange?: number  // 波动范围 ±%
    updateInterval?: number    // 更新间隔(ms)
    minValue?: number          // 最小值
    maxValue?: number          // 最大值
    step?: number              // 阶梯波步长（用于step策略）
  }
}

/**
 * 历史数据点
 */
export interface HistoryDataPoint {
  variableId: string
  timestamp: string
  value: any
  quality: DataQuality
}

/**
 * 变量运行时数据
 */
export interface VariableData {
  config: VariableConfig
  currentValue: any
  quality: DataQuality
  lastUpdate: string
  history: HistoryDataPoint[]
}

/**
 * 设备实例
 */
export interface DeviceInstance {
  id: string
  projectId: string
  deviceModelId: string
  instanceName: string
  status: 'online' | 'offline' | 'error'
  ipAddress?: string
  port?: number
  configuration: Record<string, any>
  lastConnectedAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * 设备状态
 */
export interface DeviceStatus {
  instanceId: string
  status: DeviceStatusType
  mode: OperationMode
  errorCode?: string
  errorMessage?: string
  uptime: number  // 秒
  cycleTime?: number  // 毫秒
  cpuUsage?: number  // 百分比
  memoryUsage?: number  // 百分比
  temperature?: number  // 摄氏度
  lastUpdateAt: string
}

/**
 * 报警信息
 */
export interface Alarm {
  id: string
  instanceId: string
  alarmCode: string
  message: string
  severity: AlarmSeverity
  status: AlarmStatus
  triggeredAt: string
  acknowledgedAt?: string
  clearedAt?: string
  acknowledgedBy?: string
  relatedVariableId?: string
}

/**
 * 应用配置（持久化）
 */
export interface AppConfig {
  variables: VariableConfig[]

  simulationSettings: {
    updateInterval: number
    historyRetention: number
    enableAlarms: boolean
  }
  // 设备实例信息
  deviceInstance?: DeviceInstanceConfig
}

/**
 * 设备实例配置
 */
export interface DeviceInstanceConfig {
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

/**
 * WebSocket订阅请求（支持地址和ID两种格式，向后兼容）
 */
export interface SubscribeRequest {
  variableIds?: string[] // Deprecated, use addresses instead
  addresses?: string[]
  samplingRate?: number
}

/**
 * 变量值查询参数
 */
export interface VariableValuesQuery {
  variableIds?: string[] // Deprecated, use addresses instead
  addresses?: string[]
}

/**
 * 变量值响应（包含地址信息）
 */
export interface VariableValue {
  variableId: string
  address: string
  value: any
  quality: DataQuality
  timestamp: string
}

/**
 * 写入变量请求
 */
export interface WriteVariableRequest {
  value: any
  timeout?: number
}

/**
 * 批量写入请求（使用地址作为key）
 */
export interface BatchWriteRequest {
  writes: Array<{
    address: string
    value: any
  }>
  atomic?: boolean
  timeout?: number
}

/**
 * 命令执行请求
 */
export interface ExecuteCommandRequest {
  command: 'start' | 'stop' | 'reset' | 'pause' | 'resume' | string
  parameters?: Record<string, any>
  timeout?: number
}

/**
 * 命令执行响应
 */
export interface CommandExecutionResponse {
  success: boolean
  message: string
  executedAt: string
  result?: any
}

/**
 * 切换模式请求
 */
export interface SwitchModeRequest {
  mode: OperationMode
  password?: string
}

/**
 * 重启请求
 */
export interface RestartRequest {
  type: 'soft' | 'hard'
  confirm: boolean
}

/**
 * PLC && HMI 品牌信息
 */
export interface Manufacturer {
  _id?: string
  id: string
  name: string
  code: string
  device_types: DeviceType[]
  is_active: boolean
  sort_order: number
  logo_url?: string
  description?: string
  created_at?: string
  updated_at?: string
}

/**
 * PLC系列信息
 */
export interface Series {
  _id?: string
  id?: string
  manufacturer_id?: string  // 保留以兼容旧数据
  manufacturer_name?: string  // 新增：使用品牌英文名关联
  name: string
  name_en?: string  // 新增：系列英文名
  code?: string
  type?: DeviceType
  is_active?: boolean
  sort_order?: number
  description?: string
  created_at?: string
  updated_at?: string
}

/**
 * PLC设备型号信息
 */
export interface PLCDevice {
  _id?: string
  id?: string
  series_id?: string  // 保留以兼容旧数据
  series_name?: string  // 新增：使用系列名关联
  manufacturer_name?: string  // 新增：使用品牌名关联
  model: string
  name: string
  cpu_type?: string
  memory_size?: number
  io_points?: number | {
    digital_input?: number
    digital_output?: number
    analog_input?: number
    analog_output?: number
  }
  communication_protocols?: string[]
  communicationProtocols?: string[]  // 兼容不同命名风格
  supportFeatures?: string[]
  is_active?: boolean
  sort_order?: number
  description?: string
  datasheet_url?: string
  created_at?: string
  updated_at?: string
}

/**
 * 变量模板信息
 */
export interface VariableTemplate {
  _id?: string
  id?: string
  device_model_id?: string  // 保留以兼容旧数据
  device_model?: string  // 新增：使用设备型号关联
  manufacturer_name?: string  // 新增：品牌名
  series_name?: string  // 新增：系列名
  name: string
  address: string
  type: VariableType
  data_type: DataType
  dataType?: DataType  // 兼容不同命名风格
  description?: string
  unit?: string
  default_value?: any
  defaultValue?: any  // 兼容不同命名风格
  min_value?: number
  minValue?: number  // 兼容不同命名风格
  max_value?: number
  maxValue?: number  // 兼容不同命名风格
  access_level?: AccessLevel
  accessLevel?: AccessLevel  // 兼容不同命名风格
  is_system_variable?: boolean
  isSystemVariable?: boolean  // 兼容不同命名风格
  sort_order?: number
  sortOrder?: number  // 兼容不同命名风格
  created_at?: string
  updated_at?: string
}
