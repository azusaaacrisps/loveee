/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        bg: {
          primary: '#C8E0F5',
          card: 'rgba(255, 255, 255, 0.45)',
          'card-solid': '#FFFFFF',
          nav: 'rgba(255, 255, 255, 0.6)',
        },
        text: {
          primary: '#2D3748',
          secondary: '#718096',
          muted: '#A0AEC0',
        },
        primary: {
          light: '#E8F4FF',
          DEFAULT: '#5B9BD5',
          dark: '#4A8AC4',
        },
        accent: {
          light: '#FFF0F4',
          DEFAULT: '#FF9EB1',
          dark: '#FF7FA3',
        },
        blue: {
          50: '#E8F4FF',
          100: '#D4EBFF',
          200: '#BFE6FF',
          300: '#A9DFFF',
          400: '#8AC8EE',
          500: '#5B9BD5',
          600: '#4A8AC4',
          700: '#3D7BB5',
          800: '#326A99',
          900: '#28577D',
        },
        pink: {
          50: '#FFF0F4',
          100: '#FFE0E7',
          200: '#FFC7D2',
          300: '#FFA8BC',
          400: '#FF9EB1',
          500: '#FF7FA3',
          600: '#FF618A',
        },
        success: '#68D391',
        warning: '#F6AD55',
        danger: '#FC8181',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 16px rgba(91, 155, 213, 0.08)',
        'card-hover': '0 8px 24px rgba(91, 155, 213, 0.12)',
        nav: '0 -2px 16px rgba(91, 155, 213, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'heart-beat': 'heartBeat 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        heartBeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.1)' },
          '50%': { transform: 'scale(1)' },
          '75%': { transform: 'scale(1.05)' },
        },
      },
      borderRadius: {
        'xl': '20px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
};