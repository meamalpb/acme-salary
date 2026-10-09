import { createTheme } from '@mantine/core'

// Brand teal from the design: shade 7 is the primary (#0E6E62).
export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 7,
  colors: {
    brand: [
      '#EEF6F3', '#E1F1EC', '#C9E6DC', '#9DCFC1', '#6DB5A5',
      '#3F9A89', '#1F8171', '#0E6E62', '#0B5148', '#0B3F37',
    ],
  },
  defaultRadius: 'md',
})
