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

const glass = {
  background: 'var(--glass-bg)',
  borderColor: 'var(--glass-border)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
}

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
    // OLED-friendly dark scale following Material Design guidance:
    // #121212 body avoids OLED smearing/halation of pure black
    // while saving ~99.7% of the power. Surfaces use overlay-style
    // progressive elevation above the base.
    dark: [
      '#d5d5d5', // 0  high-emphasis text (87% opacity equivalent)
      '#ababab', // 1  medium-emphasis text
      '#7a7a7a', // 2  dimmed / disabled text
      '#585858', // 3
      '#333333', // 4  borders
      '#252525', // 5  hover surfaces
      '#1a1a1a', // 6  cards / elevated surfaces
      '#121212', // 7  body background
      '#0a0a0a', // 8
      '#050505', // 9
    ],
  },
  components: {
    Card: {
      styles: { root: glass },
    },
    AppShell: {
      styles: {
        header: glass,
        navbar: glass,
      },
    },
  },
})

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--glass-bg': 'rgba(255, 255, 255, 0.65)',
    '--glass-border': 'rgba(0, 0, 0, 0.08)',
    '--glass-blur': 'blur(12px)',
  },
  dark: {
    '--glass-bg': 'rgba(26, 26, 26, 0.55)',
    '--glass-border': 'rgba(255, 255, 255, 0.06)',
    '--glass-blur': 'blur(16px)',
  },
})
