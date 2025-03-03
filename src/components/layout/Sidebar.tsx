"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Code, 
  FileText, 
  Settings, 
  MessageSquare, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight,
  Wand2,
  X
} from 'lucide-react'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const pathname = usePathname()
  const trigger = useRef<HTMLButtonElement>(null)
  const sidebar = useRef<HTMLElement>(null)

  const storedSidebarExpanded = localStorage.getItem('sidebar-expanded')
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true'
  )

  // Close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return
      if (
        !sidebarOpen ||
        sidebar.current.contains(target as Node) ||
        trigger.current.contains(target as Node)
      )
        return
      setSidebarOpen(false)
    }
    document.addEventListener('click', clickHandler)
    return () => document.removeEventListener('click', clickHandler)
  }, [sidebarOpen, setSidebarOpen])

  // Close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (!sidebarOpen || key !== 'Escape') return
      setSidebarOpen(false)
    }
    document.addEventListener('keydown', keyHandler)
    return () => document.removeEventListener('keydown', keyHandler)
  }, [sidebarOpen, setSidebarOpen])

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString())
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded')
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded')
    }
  }, [sidebarExpanded])

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden bg-boxdark duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Sidebar header */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <Link href="/" className="flex items-center">
          <Wand2 className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-bold text-white">WP Generator</span>
        </Link>
        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <X className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Sidebar menu */}
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mt-5 px-4 py-4 lg:mt-9 lg:px-6">
          <div>
            <h3 className="mb-4 ml-4 text-sm font-medium text-bodydark2">MENU</h3>
            <ul className="mb-6 flex flex-col gap-1.5">
              {/* Dashboard */}
              <li>
                <Link
                  href="/"
                  className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                    pathname === '/' && 'bg-graydark dark:bg-meta-4'
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
              </li>

              {/* Plugin Generator */}
              <li>
                <Link
                  href="/generator"
                  className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                    pathname.includes('/generator') && 'bg-graydark dark:bg-meta-4'
                  }`}
                >
                  <Wand2 className="h-5 w-5" />
                  <span>Plugin Generator</span>
                </Link>
              </li>

              {/* Code Editor */}
              <li>
                <Link
                  href="/editor"
                  className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                    pathname.includes('/editor') && 'bg-graydark dark:bg-meta-4'
                  }`}
                >
                  <Code className="h-5 w-5" />
                  <span>Code Editor</span>
                </Link>
              </li>

              {/* Documentation */}
              <li>
                <Link
                  href="/docs"
                  className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                    pathname.includes('/docs') && 'bg-graydark dark:bg-meta-4'
                  }`}
                >
                  <FileText className="h-5 w-5" />
                  <span>Documentation</span>
                </Link>
              </li>

              {/* Support */}
              <li>
                <Link
                  href="/support"
                  className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                    pathname.includes('/support') && 'bg-graydark dark:bg-meta-4'
                  }`}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Support</span>
                </Link>
              </li>

              {/* Settings */}
              <li>
                <Link
                  href="/settings"
                  className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                    pathname.includes('/settings') && 'bg-graydark dark:bg-meta-4'
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </Link>
              </li>

              {/* Help */}
              <li>
                <Link
                  href="/help"
                  className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                    pathname.includes('/help') && 'bg-graydark dark:bg-meta-4'
                  }`}
                >
                  <HelpCircle className="h-5 w-5" />
                  <span>Help</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar 