import { databaseManager } from './src/database/database-manager'
import { deviceCatalogService } from './src/services/device-catalog-service'

/**
 * 设备枚举接口测试脚本
 */
async function testDeviceCatalog() {
  console.log('=== 设备枚举接口测试 ===\n')
  
  try {
    // 初始化数据库
    console.log('1. 初始化数据库...')
    await databaseManager.initialize()
    console.log('✓ 数据库初始化成功\n')
    
    // 测试获取品牌列表
    console.log('2. 获取所有品牌...')
    const manufacturers = await deviceCatalogService.getManufacturers()
    console.log(`✓ 找到 ${manufacturers.length} 个品牌`)
    if (manufacturers.length > 0) {
      console.log('   示例:', manufacturers[0].name, `(${manufacturers[0].id})`)
    }
    console.log()
    
    // 测试获取系列列表
    console.log('3. 获取所有系列...')
    const series = await deviceCatalogService.getSeries()
    console.log(`✓ 找到 ${series.length} 个系列`)
    if (series.length > 0) {
      console.log('   示例:', series[0].name, `(${series[0].id})`)
    }
    console.log()
    
    // 测试获取PLC设备列表
    console.log('4. 获取所有PLC设备...')
    const devices = await deviceCatalogService.getPLCDevices()
    console.log(`✓ 找到 ${devices.length} 个PLC设备`)
    if (devices.length > 0) {
      console.log('   示例:', devices[0].model, `(${devices[0].id})`)
    }
    console.log()
    
    // 测试获取变量模板列表
    console.log('5. 获取所有变量模板...')
    const templates = await deviceCatalogService.getVariableTemplates()
    console.log(`✓ 找到 ${templates.length} 个变量模板`)
    if (templates.length > 0) {
      console.log('   示例:', templates[0].name, `(${templates[0].address})`)
    }
    console.log()
    
    console.log('=== 测试完成 ===')
    process.exit(0)
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

testDeviceCatalog()
