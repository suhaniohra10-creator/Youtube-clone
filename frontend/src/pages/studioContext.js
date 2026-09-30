import { createContext, useContext } from 'react'

export const StudioContext = createContext(null)

export function useStudio() {
  return useContext(StudioContext) || {}
}
