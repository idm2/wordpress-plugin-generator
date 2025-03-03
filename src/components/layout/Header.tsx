"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, Search, Menu, User, Settings, LogOut } from 'lucide-react'
import { ThemeSwitcher } from '../ThemeSwitcher'

interface HeaderProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const Header = ({ sidebarOpen, setSidebarOpen }: HeaderProps) => {
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Close dropdowns when clicking elsewhere
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!target) return
      
      // Close notifications dropdown
      if (notificationsOpen && !(target as Element).closest('.notifications-dropdown')) {
        setNotificationsOpen(false)
      }
      
      // Close user menu dropdown
      if (userMenuOpen && !(target as Element).closest('.user-menu-dropdown')) {
        setUserMenuOpen(false)
      }
    }
    
    document.addEventListener('click', clickHandler)
    return () => document.removeEventListener('click', clickHandler)
  }, [notificationsOpen, userMenuOpen])

  return (
    <header className="sticky top-0 z-999 flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        {/* Left: Hamburger button */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            aria-controls="sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="z-99999 block rounded-sm border border-stroke bg-white p-1.5 shadow-sm dark:border-strokedark dark:bg-boxdark lg:hidden"
          >
            <Menu className="h-5 w-5 text-black dark:text-white" />
          </button>
        </div>

        {/* Middle: Search */}
        <div className="hidden sm:block">
          <div className="relative">
            <input
              type="text"
              placeholder="Type to search..."
              className="w-full rounded-lg border border-stroke bg-gray py-2 pl-4 pr-10 outline-none focus:border-primary dark:border-strokedark dark:bg-boxdark-2 dark:text-white"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2">
              <Search className="h-4 w-4 text-body dark:text-bodydark" />
            </button>
          </div>
        </div>

        {/* Right: Notifications, Theme Toggle, User Menu */}
        <div className="flex items-center gap-3 2xsm:gap-7">
          {/* Notifications */}
          <div className="relative">
            <button 
              className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <span className="absolute -top-0.5 right-0 z-1 h-2 w-2 rounded-full bg-meta-1">
                <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
              </span>
              <Bell className="h-4.5 w-4.5 duration-300 ease-in-out" />
            </button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <div className="notifications-dropdown absolute -right-27 mt-2.5 flex h-90 w-75 flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark sm:right-0 sm:w-80">
                <div className="px-4.5 py-3">
                  <h5 className="text-sm font-medium text-bodydark2">Notifications</h5>
                </div>

                <ul className="flex h-auto flex-col overflow-y-auto">
                  <li>
                    <Link href="#" className="flex gap-4.5 border-t border-stroke px-4.5 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4">
                      <div className="h-12.5 w-12.5 rounded-full bg-meta-2 dark:bg-meta-4 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h6 className="text-sm font-medium text-black dark:text-white">
                          New plugin generated
                        </h6>
                        <p className="text-sm text-black dark:text-white">
                          Your plugin "Contact Form" has been generated successfully.
                        </p>
                        <p className="text-xs text-black dark:text-white">3 min ago</p>
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="flex gap-4.5 border-t border-stroke px-4.5 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4">
                      <div className="h-12.5 w-12.5 rounded-full bg-meta-2 dark:bg-meta-4 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h6 className="text-sm font-medium text-black dark:text-white">
                          Plugin update available
                        </h6>
                        <p className="text-sm text-black dark:text-white">
                          A new version of WordPress is available.
                        </p>
                        <p className="text-xs text-black dark:text-white">2 hours ago</p>
                      </div>
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Theme toggler */}
          <ThemeSwitcher />

          {/* User Menu */}
          <div className="relative">
            <button 
              className="flex items-center gap-4 user-menu-dropdown"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <span className="hidden text-right lg:block">
                <span className="block text-sm font-medium text-black dark:text-white">
                  Thomas Anree
                </span>
                <span className="block text-xs text-black dark:text-white">UX Designer</span>
              </span>
              <div className="h-12 w-12 rounded-full overflow-hidden">
                <img
                  src="https://randomuser.me/api/portraits/men/32.jpg"
                  alt="User"
                  className="h-full w-full object-cover"
                />
              </div>
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <div className="user-menu-dropdown absolute right-0 mt-4 flex w-62.5 flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <ul className="flex flex-col gap-5 border-b border-stroke px-6 py-7.5 dark:border-strokedark">
                  <li>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
                    >
                      <User className="h-4.5 w-4.5" />
                      My Profile
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
                    >
                      <Settings className="h-4.5 w-4.5" />
                      Account Settings
                    </Link>
                  </li>
                </ul>
                <div className="px-6 py-5">
                  <button className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base">
                    <LogOut className="h-4.5 w-4.5" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header 