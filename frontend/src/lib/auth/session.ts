import { jwtDecode } from 'jwt-decode'

let accessToken: string | null = null
let lastRefreshedAt = 0

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function markRefreshed(): void {
  lastRefreshedAt = Date.now()
}

export function getLastRefreshedAt(): number {
  return lastRefreshedAt
}

interface AccessTokenPayload {
  sub: string
}

export function getUserIdFromToken(token: string): string {
  return jwtDecode<AccessTokenPayload>(token).sub
}
