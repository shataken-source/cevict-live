'use client'

import { useState, useEffect } from 'react'
import { Folder, File, ChevronRight, Home, RefreshCw, Upload, Download } from 'lucide-react'
import { motion } from 'framer-motion'

interface FileItem {
  name: string
  type: 'file' | 'directory'
  path: string
}

export default function FileManager() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPath, setCurrentPath] = useState('C:\\gcc\\cevict-app\\cevict-monorepo')
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')

  const loadDirectory = async (path: string) => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:3847/file/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })

      const result = await response.json()
      if (result.success) {
        setFiles(result.files || [])
      }
    } catch (error) {
      console.error('Failed to load directory:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadDirectory(currentPath)
    }
  }, [isOpen, currentPath])

  const handleFileClick = async (file: FileItem) => {
    if (file.type === 'directory') {
      setCurrentPath(file.path)
    } else {
      setSelectedFile(file.path)
      try {
        const response = await fetch('http://localhost:3847/file/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: file.path }),
        })

        const result = await response.json()
        if (result.success) {
          setFileContent(result.content || '')
        }
      } catch (error) {
        console.error('Failed to read file:', error)
      }
    }
  }

  const navigateUp = () => {
    const parent = currentPath.split('\\').slice(0, -1).join('\\')
    if (parent) {
      setCurrentPath(parent)
    }
  }

  const goToRoot = () => {
    setCurrentPath('C:\\gcc\\cevict-app\\cevict-monorepo')
  }

  const pathParts = currentPath.split('\\').filter(Boolean)

  return (
    <>
      {/* File Manager Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all"
        title="Open File Manager"
      >
        <Folder className="w-6 h-6 text-white" />
      </motion.button>

      {/* File Manager Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <Folder className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">File Manager</h2>
                  <p className="text-sm text-gray-400">Browse and manage files</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadDirectory(currentPath)}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-5 h-5 text-gray-400" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <span className="text-gray-400">✕</span>
                </button>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="p-4 border-b border-gray-700 bg-gray-800/50">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={goToRoot}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                >
                  <Home className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Root</span>
                </button>
                {pathParts.map((part, index) => {
                  const pathToHere = pathParts.slice(0, index + 1).join('\\')
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                      <button
                        onClick={() => setCurrentPath(pathToHere)}
                        className="text-sm text-gray-300 hover:text-white transition-colors"
                      >
                        {part}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* File List */}
              <div className="w-1/2 border-r border-gray-700 overflow-auto">
                <div className="p-4">
                  {loading ? (
                    <div className="text-center text-gray-400 py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-2"></div>
                      <p>Loading...</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {currentPath !== 'C:\\gcc\\cevict-app\\cevict-monorepo' && (
                        <button
                          onClick={navigateUp}
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-800 transition-colors text-left"
                        >
                          <Folder className="w-5 h-5 text-blue-400" />
                          <span className="text-gray-300">..</span>
                        </button>
                      )}
                      {files.map((file) => (
                        <button
                          key={file.path}
                          onClick={() => handleFileClick(file)}
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-800 transition-colors text-left"
                        >
                          {file.type === 'directory' ? (
                            <Folder className="w-5 h-5 text-blue-400" />
                          ) : (
                            <File className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="text-gray-300">{file.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* File Viewer */}
              <div className="w-1/2 overflow-auto bg-gray-950">
                {selectedFile ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-white font-semibold">{selectedFile.split('\\').pop()}</h3>
                        <p className="text-xs text-gray-400">{selectedFile}</p>
                      </div>
                    </div>
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                      {fileContent || 'No content'}
                    </pre>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Select a file to view</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

