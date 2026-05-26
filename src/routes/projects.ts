import { Router } from 'express'
import * as fs from 'fs-extra'
import * as path from 'path'
import { optionalAuth } from '../auth/middleware'
import { ApiResponse } from '../types/api'

const router = Router()

// 存储当前加载的项目路径（由runtime加载时设置）
let currentProjectPath: string | null = null

// WebSocket 服务器实例（由 server.ts 注入）
let wss: any = null

/**
 * Set the current project path
 * Called when runtime loads a project
 */
export function setCurrentProjectPath(projectPath: string): void {
  currentProjectPath = projectPath
  console.log(`[Projects Router] Current project path set to: ${projectPath}`)
}

/**
 * Get the current project path
 */
export function getCurrentProjectPath(): string | null {
  return currentProjectPath
}

/**
 * Initialize the router with WebSocket server
 */
export function initializeProjectsRouter(websocketServer: any): void {
  wss = websocketServer
  console.log('[Projects Router] WebSocket server initialized')
}

/**
 * Broadcast project update notification to all connected clients
 */
function broadcastProjectUpdate(projectData: any): void {
  if (!wss) {
    console.warn('[Projects Router] WebSocket server not initialized, skipping broadcast')
    return
  }

  const message = JSON.stringify({
    type: 'project_updated',
    data: {
      projectId: projectData.id,
      projectName: projectData.name,
      version: projectData.version,
      timestamp: Date.now()
    },
    timestamp: Date.now()
  })

  let clientCount = 0
  wss.clients.forEach((client: any) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message)
      clientCount++
    }
  })

  console.log(`[Projects Router] Broadcasted project update to ${clientCount} clients`)
}

/**
 * POST /api/v1/projects/update
 * Update the current running project and save to file
 *
 * Request Body:
 * {
 *   project: ProjectFileDTO - The updated project data
 *   filePath?: string - Optional specific file path to save to
 * }
 */
router.post('/update', optionalAuth, async (req, res) => {
  try {
    const { project, filePath } = req.body

    // Validate request body
    if (!project) {
      return res.status(400).json({
        code: 40000,
        data: null,
        message: '缺少项目数据',
        timestamp: Date.now()
      } as ApiResponse)
    }

    // Validate required fields
    const requiredFields = ['id', 'name', 'version', 'resolution', 'pages', 'currentPageId']
    for (const field of requiredFields) {
      if (!(field in project)) {
        return res.status(400).json({
          code: 40000,
          data: null,
          message: `缺少必需字段: ${field}`,
          timestamp: Date.now()
        } as ApiResponse)
      }
    }

    // Determine save path (priority: request filePath > currentProjectPath > default)
    let savePath = filePath || currentProjectPath

    // If no path specified, use default location
    if (!savePath) {
      const publicDir = path.join(__dirname, '../../public')
      await fs.ensureDir(publicDir)
      savePath = path.join(publicDir, 'project.hmi')
      console.log(`[Projects Router] No project path specified, using default: ${savePath}`)
    }

    // Ensure directory exists
    const dir = path.dirname(savePath)
    await fs.ensureDir(dir)

    // Save project to file
    console.log(`[Projects Router] Saving project to: ${savePath}`)
    await fs.writeJson(savePath, project, { spaces: 2 })

    // Update current project path
    currentProjectPath = savePath

    console.log(`[Projects Router] Project saved successfully: ${project.name} (${project.version})`)

    // Broadcast project update notification to all connected clients
    broadcastProjectUpdate(project)

    res.json({
      code: 200,
      data: {
        path: savePath,
        projectName: project.name,
        version: project.version
      },
      message: '项目更新成功',
      timestamp: Date.now()
    } as ApiResponse)

  } catch (error: any) {
    console.error('[Projects Router] Error saving project:', error)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `保存项目失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

/**
 * GET /api/v1/projects/current
 * Get the current project file path
 */
router.get('/current', optionalAuth, async (req, res) => {
  try {
    res.json({
      code: 200,
      data: {
        path: currentProjectPath
      },
      message: 'success',
      timestamp: Date.now()
    } as ApiResponse)
  } catch (error: any) {
    console.error('[Projects Router] Error:', error.message)
    res.status(500).json({
      code: 50000,
      data: null,
      message: `获取当前项目路径失败: ${error.message}`,
      timestamp: Date.now()
    } as ApiResponse)
  }
})

export default router
