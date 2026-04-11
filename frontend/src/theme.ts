import { createTheme, virtualColor, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core'

const accent: MantineColorsTuple = [
  '#ffe8ea',
  '#ffc9cd',
  '#ffa3a9',
  '#ff7a83',
  '#ff5a65',
  '#fd4654',
  '#f03a48',
  '#d6303f',
  '#bc2835',
  '#9e1f2b',
]

export const theme = createTheme({
  primaryColor: 'primary',
  defaultRadius: 'md',
  colors: {
    accent,
    primary: virtualColor({
      name: 'primary',
      light: 'dark',
      dark: 'accent',
    }),
    dark: [
      '#e0e0e0',
      '#b0b0b0',
      '#888888',
      '#666666',
      '#3a3a3a',
      '#2a2a2a',
      '#1e1e1e',
      '#121212',
      '#0a0a0a',
      '#000000',
    ],
  },
})

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--glass-bg': 'rgba(255, 255, 255, 0.6)',
    '--glass-border': 'rgba(255, 255, 255, 0.2)',
    '--glass-blur': 'blur(12px)',
  },
  dark: {
    '--glass-bg': 'rgba(18, 18, 18, 0.7)',
    '--glass-border': 'rgba(255, 255, 255, 0.08)',
    '--glass-blur': 'blur(12px)',
  },
  light: {
    '--glass-bg': 'rgba(255, 255, 255, 0.6)',
    '--glass-border': 'rgba(0, 0, 0, 0.06)',
    '--glass-blur': 'blur(12px)',
  },
})
