"use client"

import { useState, useEffect } from 'react'

interface NicePayConfig {
  clientId: string
  jsSDKUrl: string
  environment: 'production' | 'sandbox'
}

interface UseNicePayConfigReturn {
  config: NicePayConfig | null
  loading: boolean
  error: string | null
}

/**
 * Hook to safely fetch NicePay configuration from server
 * Avoids exposing sensitive credentials on client side
 */
export function useNicePayConfig(): UseNicePayConfigReturn {
  const [config, setConfig] = useState<NicePayConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true)
        setError(null)

        console.log('Fetching NicePay config...')
        const response = await fetch('/api/nicepay/config')
        console.log('NicePay config response:', response.status)
        
        const result = await response.json()
        console.log('NicePay config result:', result)

        if (result.success) {
          setConfig(result.data)
          console.log('NicePay config loaded successfully:', result.data)
        } else {
          console.error('NicePay config failed:', result.error)
          setError(result.error || 'Failed to load payment configuration')
        }
      } catch (err) {
        console.error('Error fetching NicePay config:', err)
        setError('Failed to load payment configuration')
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  return { config, loading, error }
}