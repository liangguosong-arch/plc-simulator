import { Router } from 'express'
import { deviceCatalogService } from '../services/device-catalog-service'
import { optionalAuth } from '../auth/middleware'
import { ApiResponse } from '../types/api'

const router = Router()

/**
 * GET /api/v1/devices/manufacturers
 * 获取所有PLC品牌列表
 * Query参数:
 * - deviceType: 设备类型过滤 (plc | hmi)
 */
router.get('/manufacturers', optionalAuth, async (req, res) => {
  try {
    const { deviceType } = req.query

    const options: any = {}
    if (deviceType) options.deviceType = deviceType as string

    const manufacturers = await deviceCatalogService.getManufacturers(options)
    
    res.json({
      code: 200,
      data: manufacturers,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Device Catalog Router] Error fetching manufacturers:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取品牌列表失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/devices/manufacturers/:id
 * 根据ID获取品牌详情
 */
router.get('/manufacturers/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params
    
    const manufacturer = await deviceCatalogService.getManufacturerById(id)
    
    if (!manufacturer) {
      return res.status(404).json({
        code: 40400,
        data: null,
        message: '品牌不存在',
        timestamp: Date.now()
      } as ApiResponse)
    }
    
    res.json({
      code: 200,
      data: manufacturer,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Device Catalog Router] Error fetching manufacturer:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取品牌详情失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/devices/series
 * 获取系列列表
 * Query参数:
 * - manufacturerId: 品牌ID过滤（兼容旧版）
 * - manufacturerName: 品牌英文名过滤（新版推荐）
 * - type: 设备类型过滤 (plc | hmi)
 */
router.get('/series', optionalAuth, async (req, res) => {
  try {
    const { manufacturerId, manufacturerName, type } = req.query
    //console.log('[Device Catalog Router] Query params:', req.query)
    const options: any = {}
    if (manufacturerId) options.manufacturerId = manufacturerId as string
    if (manufacturerName) options.manufacturerName = manufacturerName as string
    if (type) options.type = type as string
    
    const series = await deviceCatalogService.getSeries(options)
    
    res.json({
      code: 200,
      data: series,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Device Catalog Router] Error fetching series:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取系列列表失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/devices/series/:id
 * 根据ID获取系列详情
 */
router.get('/series/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params
    
    const series = await deviceCatalogService.getSeriesById(id)
    
    if (!series) {
      return res.status(404).json({
        code: 40400,
        data: null,
        message: '系列不存在',
        timestamp: Date.now()
      } as ApiResponse)
    }
    
    res.json({
      code: 200,
      data: series,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Device Catalog Router] Error fetching series:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取系列详情失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/devices/plc
 * 获取PLC设备型号列表
 * Query参数:
 * - seriesId: 系列ID过滤（兼容旧版）
 * - seriesName: 系列名过滤（新版推荐）
 * - manufacturerName: 品牌名过滤（新版推荐）
 */
router.get('/plc', optionalAuth, async (req, res) => {
  try {
    const { seriesId, seriesName, manufacturerName } = req.query
    
    const options: any = {}
    if (seriesId) options.seriesId = seriesId as string
    if (seriesName) options.seriesName = seriesName as string
    if (manufacturerName) options.manufacturerName = manufacturerName as string
    
    const devices = await deviceCatalogService.getPLCDevices(options)
    
    res.json({
      code: 200,
      data: devices,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Device Catalog Router] Error fetching PLC devices:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取PLC设备列表失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/devices/plc/:id
 * 根据ID获取PLC设备详情
 */
router.get('/plc/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params
    
    const device = await deviceCatalogService.getPLCDeviceById(id)
    
    if (!device) {
      return res.status(404).json({
        code: 40400,
        data: null,
        message: 'PLC设备不存在',
        timestamp: Date.now()
      } as ApiResponse)
    }
    
    res.json({
      code: 200,
      data: device,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Device Catalog Router] Error fetching PLC device:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取PLC设备详情失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/devices/plc/model/:model
 * 根据型号获取PLC设备
 */
router.get('/plc/model/:model', optionalAuth, async (req, res) => {
  try {
    const { model } = req.params
    
    const device = await deviceCatalogService.getPLCDeviceByModel(decodeURIComponent(model))
    
    if (!device) {
      return res.status(404).json({
        code: 40400,
        data: null,
        message: 'PLC设备不存在',
        timestamp: Date.now()
      } as ApiResponse)
    }
    
    res.json({
      code: 200,
      data: device,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Device Catalog Router] Error fetching PLC device by model:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取PLC设备详情失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/devices/variables/templates
 * 获取变量模板列表
 * Query参数:
 * - deviceModelId: 设备型号ID过滤（兼容旧版）
 * - deviceModel: 设备型号过滤（新版推荐）
 * - manufacturerName: 品牌名过滤
 * - seriesName: 系列名过滤
 * - type: 变量类型过滤 (input | output | memory)
 */
router.get('/variables/templates', optionalAuth, async (req, res) => {
  try {
    const { deviceModelId, deviceModel, manufacturerName, seriesName, type } = req.query
    
    const options: any = {}
    if (deviceModelId) options.deviceModelId = deviceModelId as string
    if (deviceModel) options.deviceModel = deviceModel as string
    if (manufacturerName) options.manufacturerName = manufacturerName as string
    if (seriesName) options.seriesName = seriesName as string
    if (type) options.type = type as string
    
    const templates = await deviceCatalogService.getVariableTemplates(options)
    
    res.json({
      code: 200,
      data: templates,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Device Catalog Router] Error fetching variable templates:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取变量模板列表失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/devices/variables/templates/:id
 * 根据ID获取变量模板详情
 */
router.get('/variables/templates/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params
    
    const template = await deviceCatalogService.getVariableTemplateById(id)
    
    if (!template) {
      return res.status(404).json({
        code: 40400,
        data: null,
        message: '变量模板不存在',
        timestamp: Date.now()
      } as ApiResponse)
    }
    
    res.json({
      code: 200,
      data: template,
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Device Catalog Router] Error fetching variable template:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取变量模板详情失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

export default router
