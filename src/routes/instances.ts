import { Router, Request, Response } from 'express'
import { InstanceRegistry } from '../core/instance-registry'
import { optionalAuth } from '../auth/middleware'
import { ConfigManager } from '../config/config-manager'
import { DeviceInstanceConfig } from '../types/device'
import { validateInstanceId } from '../middleware/errorHandler'

let registry: InstanceRegistry
let configManager: ConfigManager

const router = Router()

export function initializeInstancesRouter(reg: InstanceRegistry, cm: ConfigManager): Router {
  registry = reg
  configManager = cm
  return router
}

/**
 * 自动生成实例ID
 */
router.post('/instances/generate-id', optionalAuth, (_req: Request, res: Response) => {
  try {
    const instanceId = configManager.generateInstanceId()
    res.json({
      code: 200,
      message: 'OK',
      data: { instanceId },
      timestamp: Date.now()
    })
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      message: error.message || 'Failed to generate instance ID',
      data: null,
      timestamp: Date.now()
    })
  }
})

/**
 * 列出所有实例（从注册表 + 持久化合并）
 */
router.get('/instances', optionalAuth, async (_req: Request, res: Response) => {
  try {
    const runningInstances = registry.getAll()
    
    // 合并运行中实例和持久化索引
    const persistedIds = await configManager.listPersistedInstanceIds()
    const indexData = await configManager.getAllInstanceConfigs()
    
    const instanceMap = new Map<string, any>()
    
    // 先加入持久化的实例
    for (const id of persistedIds) {
      const idx = indexData[id] as any
      const regInst = runningInstances.find(i => i.instanceId === id)
      instanceMap.set(id, {
        instanceId: id,
        name: idx?.name || id,
        status: regInst?.status || 'offline',
        deviceType: idx?.deviceType || 'plc',
        createdAt: idx?.createdAt || ''
      })
    }
    
    // 加入仅在注册表中运行的实例（持久化数据丢失的容错）
    for (const inst of runningInstances) {
      if (!instanceMap.has(inst.instanceId)) {
        instanceMap.set(inst.instanceId, {
          instanceId: inst.instanceId,
          name: inst.instanceId,
          status: inst.status,
          deviceType: 'plc',
          createdAt: ''
        })
      }
    }
    
    const instances = Array.from(instanceMap.values())
    
    res.json({
      code: 200,
      message: 'OK',
      data: { instances, total: instances.length },
      timestamp: Date.now()
    })
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      message: error.message,
      data: null,
      timestamp: Date.now()
    })
  }
})

/**
 * 获取实例详情
 */
router.get('/instances/:instanceId', optionalAuth, validateInstanceId, async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params
    const inst = registry.get(instanceId)
    const fullConfig = await configManager.getInstanceFullConfig(instanceId)
    
    res.json({
      code: 200,
      message: 'OK',
      data: {
        instanceId,
        config: fullConfig?.config || inst?.config || null,
        status: inst?.status || 'offline',
        variableCount: Array.isArray(fullConfig?.variables) ? fullConfig.variables.length : 0,
        createdAt: (fullConfig?.config as any)?.createdAt || '',
        startedAt: inst?.startedAt || undefined
      },
      timestamp: Date.now()
    })
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      message: error.message,
      data: null,
      timestamp: Date.now()
    })
  }
})

/**
 * 创建实例
 */
router.post('/instances', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id, instanceName, manufacturer, series, deviceModel, type } = req.body
    
    if (!id || !instanceName) {
      res.status(400).json({
        code: 40001,
        message: 'id 和 instanceName 是必填字段',
        data: null,
        timestamp: Date.now()
      })
      return
    }

    // 409 门控：检查ID是否已存在
    const existing = await configManager.getInstanceFullConfig(id)
    const existingRunning = registry.get(id)
    if (existing || existingRunning) {
      res.status(409).json({
        code: 40901,
        message: `实例 "${id}" 已存在`,
        data: null,
        timestamp: Date.now()
      })
      return
    }

    const now = new Date().toISOString()
    const config: DeviceInstanceConfig = {
      id,
      instanceName: instanceName || id,
      type: type === 'hmi' ? 'hmi' : 'plc',
      manufacturer: manufacturer || 'PLC-Sim',
      series: series || 'SIM',
      deviceModel: deviceModel || 'SIM-Default',
      status: 'offline',
      createdAt: now,
      updatedAt: now,
    }

    // 持久化保存
    await configManager.saveInstanceFullConfig(id, config as unknown as Record<string, unknown>, [])

    // 创建默认为离线，不启动
    await registry.create(config, [])

    res.status(201).json({
      code: 201,
      message: '实例创建成功',
      data: config,
      timestamp: Date.now()
    })
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      message: error.message,
      data: null,
      timestamp: Date.now()
    })
  }
})

/**
 * 获取实例配置（含变量）
 */
router.get('/instances/:instanceId/config', optionalAuth, validateInstanceId, async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params
    const fullConfig = await configManager.getInstanceFullConfig(instanceId)
    
    if (!fullConfig) {
      res.status(404).json({
        code: 40401,
        message: '实例配置不存在',
        data: null,
        timestamp: Date.now()
      })
      return
    }

    res.json({
      code: 200,
      message: 'OK',
      data: fullConfig,
      timestamp: Date.now()
    })
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      message: error.message,
      data: null,
      timestamp: Date.now()
    })
  }
})

/**
 * 更新实例配置（编辑属性）
 */
router.put('/instances/:instanceId/config', optionalAuth, validateInstanceId, async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params
    
    const fullConfig = await configManager.getInstanceFullConfig(instanceId)
    if (!fullConfig) {
      res.status(404).json({
        code: 40401,
        message: '实例配置不存在',
        data: null,
        timestamp: Date.now()
      })
      return
    }

    const existing = fullConfig.config as Record<string, unknown>
    const now = new Date().toISOString()
    
    // 构建设备实例配置 — 仅允许编辑特定字段
    const updatedConfig: DeviceInstanceConfig = {
      id: instanceId,
      instanceName: (req.body.instanceName ?? existing.instanceName ?? instanceId) as string,
      type: (req.body.type === 'hmi' ? 'hmi' : existing.type ?? 'plc') as 'plc' | 'hmi',
      manufacturer: (req.body.manufacturer ?? existing.manufacturer ?? 'PLC-Sim') as string,
      series: (req.body.series ?? existing.series ?? 'SIM') as string,
      deviceModel: (req.body.deviceModel ?? existing.deviceModel ?? 'SIM-Default') as string,
      status: (req.body.status ?? existing.status ?? 'offline') as 'online' | 'offline' | 'error',
      createdAt: (existing.createdAt ?? now) as string,
      updatedAt: now,
    }

    // 持久化（saveInstanceConfig 内部保留 variables 不变）
    await configManager.saveInstanceConfig(updatedConfig as unknown as Record<string, unknown>)

    // 如果实例正在运行，同步更新注册表中内存配置
    if (registry.has(instanceId)) {
      registry.syncConfig(instanceId, updatedConfig)
    }

    res.json({
      code: 200,
      message: '配置更新成功',
      data: updatedConfig,
      timestamp: Date.now()
    })
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      message: error.message,
      data: null,
      timestamp: Date.now()
    })
  }
})

/**
 * 获取实例变量配置
 */
router.get('/instances/:instanceId/variables', optionalAuth, validateInstanceId, async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params
    const variables = await configManager.getInstanceVariables(instanceId)
    
    res.json({
      code: 200,
      message: 'OK',
      data: { variables },
      timestamp: Date.now()
    })
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      message: error.message,
      data: null,
      timestamp: Date.now()
    })
  }
})

/**
 * 更新实例变量配置
 */
router.put('/instances/:instanceId/variables', optionalAuth, validateInstanceId, async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params
    const { variables } = req.body

    if (!Array.isArray(variables)) {
      res.status(400).json({
        code: 40001,
        message: 'variables 必须是数组',
        data: null,
        timestamp: Date.now()
      })
      return
    }

    await configManager.saveInstanceVariables(instanceId, variables)

    // 如果实例正在运行，同步变量
    const inst = registry.get(instanceId)
    if (inst) {
      inst.variableManager.syncWithConfig(variables)
    }

    res.json({
      code: 200,
      message: '变量配置更新成功',
      data: { variableCount: variables.length },
      timestamp: Date.now()
    })
  } catch (error: any) {
    res.status(500).json({
      code: 50000,
      message: error.message,
      data: null,
      timestamp: Date.now()
    })
  }
})

/**
 * 启动实例
 */
router.post('/instances/:instanceId/start', optionalAuth, validateInstanceId, (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params
    registry.start(instanceId)

    res.json({
      code: 200,
      message: `实例 "${instanceId}" 已启动`,
      data: { status: 'running' },
      timestamp: Date.now()
    })
  } catch (error: any) {
    res.status(error.message?.includes('not found') ? 404 : 500).json({
      code: error.message?.includes('not found') ? 40401 : 50000,
      message: error.message,
      data: null,
      timestamp: Date.now()
    })
  }
})

/**
 * 停止实例
 */
router.post('/instances/:instanceId/stop', optionalAuth, validateInstanceId, (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params
    registry.stop(instanceId)

    res.json({
      code: 200,
      message: `实例 "${instanceId}" 已停止`,
      data: { status: 'offline' },
      timestamp: Date.now()
    })
  } catch (error: any) {
    res.status(error.message?.includes('not found') ? 404 : 500).json({
      code: error.message?.includes('not found') ? 40401 : 50000,
      message: error.message,
      data: null,
      timestamp: Date.now()
    })
  }
})

/**
 * 删除实例
 */
router.delete('/instances/:instanceId', optionalAuth, validateInstanceId, async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params
    
    // 保护默认实例
    if (instanceId === '0') {
      res.status(403).json({
        code: 40301,
        message: '默认实例不可删除',
        data: null,
        timestamp: Date.now()
      })
      return
    }

    registry.remove(instanceId)
    await configManager.removeInstanceConfig(instanceId)

    res.json({
      code: 200,
      message: `实例 "${instanceId}" 已删除`,
      data: null,
      timestamp: Date.now()
    })
  } catch (error: any) {
    res.status(error.message?.includes('not found') ? 404 : 500).json({
      code: error.message?.includes('not found') ? 40401 : 50000,
      message: error.message,
      data: null,
      timestamp: Date.now()
    })
  }
})

export default router
