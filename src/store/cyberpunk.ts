import { atom } from 'jotai'

const STORAGE_KEY = 'cyberpunk-mode'

function getStoredCyberpunkMode(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'on'
}

export const cyberpunkModeAtom = atom(getStoredCyberpunkMode())

export function persistCyberpunkMode(on: boolean) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
}
