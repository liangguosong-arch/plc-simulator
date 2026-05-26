import { Router } from 'express'
import { ConfigManager } from '../config/config-manager'
import { optionalAuth } from '../auth/middleware'
import { ApiResponse } from '../types/api'

const router = Router()

// 依赖注入 - 由server.ts传入已初始化的ConfigManager实例
let configManager: ConfigManager
let onConfigUpdate: ((variables: any[]) => void) | null = null

export function initializeConfigRouter(cm: ConfigManager, updateCallback?: (variables: any[]) => void) {
  configManager = cm
  onConfigUpdate = updateCallback || null
}

/**
 * GET /api/v1/config
 * 获取配置（允许公开访问，用于Web管理界面）
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    if (!configManager) {
      throw new Error('ConfigManager not initialized')
    }
    
    const config = await configManager.getConfig()
    
    res.json({
      code: 200,
      data: config,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Config Router] Error:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取配置失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * PUT /api/v1/config
 * 更新配置（允许公开访问，用于Web管理界面）
 */
router.put('/', optionalAuth, async (req, res) => {
  try {
    if (!configManager) {
      throw new Error('ConfigManager not initialized')
    }
    
    const updates = req.body
    
    await configManager.saveConfig(updates)
    
    // 如果更新了变量配置，通知VariableManager重新同步
    if (updates.variables && onConfigUpdate) {
      console.log('[Config Router] Variables updated, syncing with VariableManager...')
      onConfigUpdate(updates.variables)
    }
    
    res.json({
      code: 200,
      data: await configManager.getConfig(),
      message: '配置保存成功',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Config Router] Error:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `保存配置失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

export default router
