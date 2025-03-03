"use client"

import React from 'react'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: string | number
    positive: boolean
  }
  className?: string
}

const StatCard = ({ title, value, icon: Icon, trend, className = '' }: StatCardProps) => {
  return (
    <div className={`stat-card ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-body dark:text-bodydark2">{title}</h4>
          <h3 className="mt-4 text-title-md font-bold text-black dark:text-white">
            {value}
          </h3>
        </div>
        <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
          <Icon className="fill-primary text-primary dark:fill-white dark:text-white" />
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center justify-between">
          <span
            className={`flex items-center gap-1 text-sm font-medium ${
              trend.positive ? 'text-meta-3' : 'text-meta-1'
            }`}
          >
            {trend.positive ? (
              <svg
                className="fill-meta-3"
                width="10"
                height="11"
                viewBox="0 0 10 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.35716 2.47737L0.908974 5.82987L5.0443e-07 4.94612L5 0.0848689L10 4.94612L9.09103 5.82987L5.64284 2.47737L5.64284 10.0849L4.35716 10.0849L4.35716 2.47737Z"
                  fill=""
                />
              </svg>
            ) : (
              <svg
                className="fill-meta-1"
                width="10"
                height="11"
                viewBox="0 0 10 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.64284 7.69237L9.09102 4.33987L10 5.22362L5 10.0849L-8.98488e-07 5.22362L0.908973 4.33987L4.35716 7.69237L4.35716 0.0848701L5.64284 0.0848704L5.64284 7.69237Z"
                  fill=""
                />
              </svg>
            )}
            {trend.value}%
          </span>
          <span className="text-xs font-medium">vs. previous period</span>
        </div>
      )}
    </div>
  )
}

export default StatCard 