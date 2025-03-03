"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import PluginGenerator from '@/app/page'

export default function GeneratorPage() {
  const router = useRouter()

  // Redirect from root to generator page on initial load
  useEffect(() => {
    // This is just to ensure the original functionality works
    // when accessed via the /generator route
  }, [])

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark md:p-6 xl:p-7.5">
          <div className="mb-6">
            <h2 className="text-title-md2 font-bold text-black dark:text-white">
              WordPress Plugin Generator
            </h2>
            <p className="text-sm text-body dark:text-bodydark">
              Generate custom WordPress plugins using AI
            </p>
          </div>

          {/* Original Plugin Generator Component */}
          <PluginGenerator />
        </div>
      </div>
    </Layout>
  )
} 