import { PLCSimulatorServer } from './server'

/**
 * PLC模拟器入口文件
 */
async function main() {
  // 从环境变量读取配置
  const port = parseInt(process.env.PORT || '8080', 10)
  const host = process.env.HOST || '0.0.0.0'

  // 创建并启动服务器
  const server = new PLCSimulatorServer(port, host)
  
  try {
    await server.start()
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// 启动应用
main().catch(err => {
  console.error('Unhandled exception:', err)
  process.exit(1)
})
