"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard on initial load
    router.push('/dashboard')
  }, [router])

  return null
} 