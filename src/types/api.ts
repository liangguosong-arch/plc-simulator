/**
 * API通用响应格式
 */
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
  timestamp: number
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T> {
  total: number
  page: number
  pageSize: number
  items: T[]
}

/**
 * JWT Token载荷
 */
export interface TokenPayload {
  userId: string
  role: UserRole
  iat?: number
  exp?: number
}

/**
 * 用户角色枚举
 */
export type UserRole = 'GUEST' | 'OPERATOR' | 'ENGINEER' | 'ADMIN'

/**
 * 用户账户
 */
export interface UserAccount {
  id: string
  password: string
  role: UserRole
  name?: string
}

/**
 * 设备类型
 */
export type DeviceType = 'plc' | 'hmi'

/**
 * 变量类型
 */
export type VariableType = 'input' | 'output' | 'memory'

/**
 * 数据类型
 */
export type DataType = 'BOOL' | 'INT' | 'DINT' | 'REAL' | 'STRING'

/**
 * 访问权限
 */
export type AccessLevel = 'read' | 'write' | 'read-write'

/**
 * 模拟策略
 */
export type SimulationStrategy = 'random' | 'sine' | 'step' | 'binary-toggle' | 'fixed'

/**
 * 模拟模式
 */
export type SimulationMode = 'auto' | 'manual'

/**
 * 数据质量
 */
export type DataQuality = 'good' | 'bad' | 'uncertain'

/**
 * 设备状态
 */
export type DeviceStatusType = 'running' | 'stopped' | 'error' | 'maintenance' | 'offline'

/**
 * 运行模式
 */
export type OperationMode = 'auto' | 'manual' | 'teach'

/**
 * 报警状态
 */
export type AlarmStatus = 'active' | 'acknowledged' | 'cleared'

/**
 * 报警级别
 */
export type AlarmSeverity = 'info' | 'warning' | 'error' | 'critical'
