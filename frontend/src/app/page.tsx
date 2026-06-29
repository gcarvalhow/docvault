'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Spinner } from '@/components/ui/Spinner'

export default function Home() {
  const { currentUser, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    router.replace(currentUser ? '/dashboard' : '/login')
  }, [isLoading, currentUser, router])

  return (
    <div className="flex flex-1 items-center justify-center">
      <Spinner />
    </div>
  )
}
