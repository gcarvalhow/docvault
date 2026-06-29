import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getAccessToken, getLastRefreshedAt, markRefreshed, setAccessToken } from '@/lib/auth/session'
import type { TokenResponse } from '@/lib/types/identity'

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean
    _retriedAfterRecentRefresh?: boolean
  }
}

const REFRESH_URL = '/identity/auth/refresh'
const LOGIN_URL = '/identity/auth/login'
// The backend rotates the refresh token and security_stamp on every /refresh call.
// Immediately after a refresh, a request can transiently 401 before that write is
// visible to subsequent reads. Retrying the same (still-valid) access token after a
// short delay resolves this; calling /refresh again would burn the one-time-use
// refresh token a second time and risk reuse-detection invalidating the session.
const RECENT_REFRESH_WINDOW_MS = 2000
const RECENT_REFRESH_RETRY_DELAY_MS = 350

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

let isRefreshing = false
let refreshSubscribers: Array<(token: string | null) => void> = []

function subscribeTokenRefresh(callback: (token: string | null) => void) {
  refreshSubscribers.push(callback)
}

function onRefreshDone(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token))
  refreshSubscribers = []
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url === REFRESH_URL ||
      originalRequest.url === LOGIN_URL
    ) {
      return Promise.reject(error)
    }

    if (
      !originalRequest._retriedAfterRecentRefresh &&
      Date.now() - getLastRefreshedAt() < RECENT_REFRESH_WINDOW_MS
    ) {
      originalRequest._retriedAfterRecentRefresh = true
      await new Promise((resolve) => setTimeout(resolve, RECENT_REFRESH_RETRY_DELAY_MS))
      originalRequest.headers.set('Authorization', `Bearer ${getAccessToken()}`)
      return apiClient(originalRequest)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token) => {
          if (!token) {
            reject(error)
            return
          }
          originalRequest._retry = true
          originalRequest.headers.set('Authorization', `Bearer ${token}`)
          resolve(apiClient(originalRequest))
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await apiClient.post<TokenResponse>(REFRESH_URL)
      setAccessToken(data.access_token)
      markRefreshed()
      onRefreshDone(data.access_token)
      originalRequest.headers.set('Authorization', `Bearer ${data.access_token}`)
      return apiClient(originalRequest)
    } catch (refreshError) {
      setAccessToken(null)
      onRefreshDone(null)
      unauthorizedHandler?.()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
