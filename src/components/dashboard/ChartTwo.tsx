"use client"

import React from 'react'

const ChartTwo = () => {
  // In a real implementation, this would use a charting library like Chart.js or ApexCharts
  // For now, we'll create a simple bar chart placeholder

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  
  return (
    <div className="h-full w-full">
      <div className="flex h-full flex-col items-end justify-end">
        <div className="flex h-[300px] w-full items-end justify-between gap-1 px-5">
          {days.map((day, index) => {
            // Generate random heights for the bars
            const salesHeight = 40 + Math.random() * 60
            const revenueHeight = 20 + Math.random() * 30
            
            return (
              <div key={index} className="flex flex-col items-center">
                <div className="relative mb-2 flex w-full flex-col items-center">
                  {/* Revenue bar (light blue) */}
                  <div 
                    className="w-6 rounded-t-sm bg-secondary"
                    style={{ height: `${revenueHeight}px` }}
                  ></div>
                  
                  {/* Sales bar (dark blue) */}
                  <div 
                    className="absolute bottom-0 w-6 rounded-t-sm bg-primary"
                    style={{ height: `${salesHeight}px` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-body dark:text-bodydark2">
                  {day}
                </span>
              </div>
            )
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-5">
          <div className="flex items-center gap-2">
            <span className="block h-3 w-3 rounded-full bg-primary"></span>
            <span className="text-sm font-medium text-body dark:text-bodydark2">
              Sales
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="block h-3 w-3 rounded-full bg-secondary"></span>
            <span className="text-sm font-medium text-body dark:text-bodydark2">
              Revenue
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChartTwo 