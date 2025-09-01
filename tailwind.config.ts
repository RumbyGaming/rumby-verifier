import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      keyframes: {
        "fade-in": {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        "pulse-spin": {
          '0%': {
            transform: 'rotate(0deg) scale(1)',
          },
          '50%': {
            transform: 'rotate(90deg) scale(1.5)'
          },
          '100%': {
            transform: 'rotate(360deg) scale(1)'
          }
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s linear',
        'fast-fade-in': 'fade-in 0.25s linear',
        'pulse-spin': 'pulse-spin 2s linear infinite',
        'ping-sm': 'ping-sm 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'spin-slow': 'spin 60s linear infinite',
        'spin-wait': 'spin 2s linear infinite',
        'spin-reveal': 'spin 3.5s cubic-bezier(0, 0, 0.2, 1)',
        'win-popout': 'win-popout 0.2s ease',
        'float': 'float 1.5s linear infinite',
        'float-sm': 'float-sm 1.5s linear infinite',
        'float-up-sm': 'float-up-sm 1.5s linear infinite',
        'coin-rotate': 'coin-rotate 2.5s linear infinite',
        'coin-pulse': 'coin-pulse 1.5s linear infinite',
        'coin3-translate': 'coin3-translate 1.5s linear infinite',
        "fade-in-out": "fade-in-out 5s linear",
        "down-fade-in-out": "down-fade-in-out 5s linear",
        "big-small": "big-small 2s linear infinite",
        "big-small-high": "big-small-high 2s linear infinite",
      },
      fontFamily: {
        press: ['"Press Start 2P"', 'sans-serif'],
        alexandria: ['"Alexandria"', 'sans-serif'],
        changa: ['"Changa"', 'sans-serif'],
        speed: ['"SpeedCombine"', 'sans-serif'],
        ibm: ['"IBMPlexMono"', 'sans-serif'],
        redhat: ['"Red Hat Display"', 'sans-serif'],
        sporty: ['"Sporty"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config