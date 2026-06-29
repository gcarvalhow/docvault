'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { login as loginRequest, logout as logoutRequest, refresh as refreshRequest } from '@/lib/api/auth'
import { getUser } from '@/lib/api/users'
import { getUserIdFromToken, markRefreshed, setAccessToken } from '@/lib/auth/session'
import { setUnauthorizedHandler } from '@/lib/api/client'
import type { User } from '@/lib/types/identity'

interface AuthContextValue {
  currentUser: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const bootRan = useRef(false)

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setCurrentUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
      router.push('/login')
    })
  }, [clearSession, router])

  useEffect(() => {
    if (bootRan.current) return
    bootRan.current = true

    async function boot() {
      try {
        const { access_token } = await refreshRequest()
        setAccessToken(access_token)
        markRefreshed()
        const user = await getUser(getUserIdFromToken(access_token))
        setCurrentUser(user)
      } catch {
        setAccessToken(null)
        setCurrentUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    boot()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await loginRequest({ email, password })
    setAccessToken(access_token)
    markRefreshed()
    const user = await getUser(getUserIdFromToken(access_token))
    setCurrentUser(user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      clearSession()
      router.push('/login')
    }
  }, [clearSession, router])

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
