import { Router } from 'express'
import { DeviceStatusSimulator } from '../simulator/device-status'
import { VariableManager } from '../variables/variable-manager'
import { AlarmGenerator } from '../simulator/alarm-generator'
import { optionalAuth } from '../auth/middleware'
import { validateInstanceId } from '../middleware/errorHandler'
import { ApiResponse } from '../types/api'
import { ConfigManager } from '../config/config-manager'

const router = Router()

// 依赖注入
let deviceStatus: DeviceStatusSimulator
let variableManager: VariableManager
let alarmGenerator: AlarmGenerator
let configManager: ConfigManager

export function initializeMonitoring(
  statusSimulator: DeviceStatusSimulator,
  varManager: VariableManager,
  alarms: AlarmGenerator,
  cfgManager?: ConfigManager
) {
  deviceStatus = statusSimulator
  variableManager = varManager
  alarmGenerator = alarms
  if (cfgManager) {
    configManager = cfgManager
  }
}

// 使用optionalAuth允许公开访问（本地开发环境）
router.use(optionalAuth)

/**
 * GET /api/v1/devices/instances/:instanceId
 * 获取设备实例信息
 */
router.get('/devices/instances/:instanceId', validateInstanceId, async (req, res) => {
  try {
    if (!configManager) {
      return res.status(500).json({
        code: 50000,
        data: null,
        message: '配置管理器未初始化',
        timestamp: Date.now()
      } as ApiResponse)
    }

    const config = await configManager.getConfig()
    const deviceInstance = config.deviceInstance

    if (!deviceInstance) {
      return res.status(404).json({
        code: 40401,
        data: null,
        message: '设备实例不存在',
        timestamp: Date.now()
      } as ApiResponse)
    }

    res.json({
      code: 200,
      data: deviceInstance,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取设备实例失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * PUT /api/v1/devices/instances/:instanceId
 * 更新设备实例信息
 */
router.put('/devices/instances/:instanceId', validateInstanceId, async (req, res) => {
  try {
    if (!configManager) {
      return res.status(500).json({
        code: 50000,
        data: null,
        message: '配置管理器未初始化',
        timestamp: Date.now()
      } as ApiResponse)
    }

    const updates = req.body
    
    // 获取当前配置
    const config = await configManager.getConfig()
    const currentInstance = config.deviceInstance

    if (!currentInstance) {
      return res.status(404).json({
        code: 40401,
        data: null,
        message: '设备实例不存在',
        timestamp: Date.now()
      } as ApiResponse)
    }

    // 合并更新
    const updatedInstance = {
      ...currentInstance,
      ...updates,
      id: currentInstance.id, // 不允许修改ID
      updatedAt: new Date().toISOString()
    }

    // 保存配置
    await configManager.saveConfig({
      deviceInstance: updatedInstance
    })

    res.json({
      code: 200,
      data: updatedInstance,
      message: '设备实例信息已更新',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      data: null,
      message: `更新设备实例失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/devices/instances/:id/status
 * 获取设备状态
 */
router.get('/devices/instances/:instanceId/status', validateInstanceId, (req, res) => {
  const status = deviceStatus.getStatus()
  
  res.json({
    code: 200,
    data: status,
    message: 'success',
    timestamp: Date.now()
  } as ApiResponse)
})

/**
 * GET /api/v1/devices/instances/:instanceId/variables
 * 获取变量列表
 */
router.get('/devices/instances/:instanceId/variables', validateInstanceId, (req, res) => {
  const variables = variableManager.getVariableList()
  
  res.json({
    code: 200,
    data: variables,
    message: 'success',
    timestamp: Date.now()
  } as ApiResponse)
})

/**
 * GET /api/v1/devices/instances/:instanceId/variables/values
 * 批量获取变量值（使用地址作为key）
 */
router.get('/devices/instances/:instanceId/variables/values', validateInstanceId, (req, res) => {
  const { addresses } = req.query

  if (!addresses || typeof addresses !== 'string') {
    return res.status(400).json({
      code: 40001,
      data: null,
      message: '缺少addresses参数',
      timestamp: Date.now()
    } as ApiResponse)
  }

  const addressList = addresses.split(',')
  
  try {
    const values = variableManager.getVariableValuesByAddresses(addressList)
    
    res.json({
      code: 200,
      data: values,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取变量值失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/devices/instances/:instanceId/variables/history
 * 获取历史数据（使用地址作为key）
 */
router.get('/devices/instances/:instanceId/variables/history', validateInstanceId, (req, res) => {
  const { addresses, startTime, endTime, interval } = req.query
  
  if (!addresses || !startTime || !endTime) {
    return res.status(400).json({
      code: 40001,
      data: null,
      message: '缺少必要参数',
      timestamp: Date.now()
    } as ApiResponse)
  }

  const addressList = (addresses as string).split(',')
  const start = startTime as string
  const end = endTime as string
  const intervalNum = interval ? parseInt(interval as string) : undefined

  try {
    const history = addressList.map(address => ({
      address: address,
      data: variableManager.getHistoryByAddress(address, start, end, intervalNum)
    }))

    res.json({
      code: 200,
      data: {
        data: history,
        total: history.reduce((sum, h) => sum + h.data.length, 0),
        startTime: start,
        endTime: end,
        interval: intervalNum || 0
      },
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取历史数据失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/devices/instances/:instanceId/alarms
 * 获取报警信息
 */
router.get('/devices/instances/:instanceId/alarms', validateInstanceId, (req, res) => {
  const { status, severity } = req.query

  try {
    const alarms = alarmGenerator.getAlarms(
      status as any,
      severity as any
    )

    res.json({
      code: 200,
      data: alarms,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取报警信息失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * POST /api/v1/devices/instances/:instanceId/alarms/:alarmId/acknowledge
 * 确认报警
 */
router.post('/devices/instances/:instanceId/alarms/:alarmId/acknowledge', validateInstanceId, (req, res) => {
  const alarmId = req.params.alarmId
  
  try {
    const success = alarmGenerator.acknowledgeAlarm(alarmId, req.user?.userId)
    
    if (!success) {
      return res.status(400).json({
        code: 40000,
        data: null,
        message: '报警不存在或状态不正确',
        timestamp: Date.now()
      } as ApiResponse)
    }

    res.json({
      code: 200,
      data: { success: true },
      message: '报警已确认',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      data: null,
      message: `确认报警失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

export default router
