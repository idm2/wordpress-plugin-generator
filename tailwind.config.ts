/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	content: ["./src/pages/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/app/**/*.{ts,tsx}"],
	theme: {
	  container: {
		center: true,
		padding: "2rem",
		screens: {
		  "2xl": "1400px",
		},
	  },
	  extend: {
		colors: {
		  // TailAdmin color scheme
		  current: 'currentColor',
		  transparent: 'transparent',
		  white: '#FFFFFF',
		  black: '#1C2434',
		  'black-2': '#010101',
		  body: '#64748B',
		  bodydark: '#AEB7C0',
		  bodydark1: '#DEE4EE',
		  bodydark2: '#8A99AF',
		  primary: '#3C50E0',
		  secondary: '#80CAEE',
		  stroke: '#E2E8F0',
		  gray: '#EFF4FB',
		  graydark: '#333A48',
		  'gray-2': '#F7F9FC',
		  'gray-3': '#FAFAFA',
		  whiten: '#F1F5F9',
		  whiter: '#F5F7FD',
		  boxdark: '#24303F',
		  'boxdark-2': '#1A222C',
		  strokedark: '#2E3A47',
		  'form-strokedark': '#3d4d60',
		  'form-input': '#1d2a39',
		  'meta-1': '#DC3545',
		  'meta-2': '#EFF2F7',
		  'meta-3': '#10B981',
		  'meta-4': '#313D4A',
		  'meta-5': '#259AE6',
		  'meta-6': '#FFBA00',
		  'meta-7': '#FF6766',
		  'meta-8': '#F0950C',
		  'meta-9': '#E5E7EB',
		  success: '#219653',
		  danger: '#D34053',
		  warning: '#FFA70B',

		  // Keep existing color system for compatibility
		  border: "hsl(var(--border))",
		  input: "hsl(var(--input))",
		  ring: "hsl(var(--ring))",
		  background: "hsl(var(--background))",
		  foreground: "hsl(var(--foreground))",
		  destructive: {
			DEFAULT: "hsl(var(--destructive))",
			foreground: "hsl(var(--destructive-foreground))",
		  },
		  muted: {
			DEFAULT: "hsl(var(--muted))",
			foreground: "hsl(var(--muted-foreground))",
		  },
		  accent: {
			DEFAULT: "hsl(var(--accent))",
			foreground: "hsl(var(--accent-foreground))",
		  },
		  popover: {
			DEFAULT: "hsl(var(--popover))",
			foreground: "hsl(var(--popover-foreground))",
		  },
		  card: {
			DEFAULT: "hsl(var(--card))",
			foreground: "hsl(var(--card-foreground))",
		  },
		},
		borderRadius: {
		  lg: "var(--radius)",
		  md: "calc(var(--radius) - 2px)",
		  sm: "calc(var(--radius) - 4px)",
		},
		boxShadow: {
		  default: '0px 8px 13px -3px rgba(0, 0, 0, 0.07)',
		  card: '0px 1px 3px rgba(0, 0, 0, 0.12)',
		  'card-2': '0px 1px 2px rgba(0, 0, 0, 0.05)',
		  switcher:
			'0px 2px 4px rgba(0, 0, 0, 0.2), inset 0px 2px 2px #FFFFFF, inset 0px -1px 1px rgba(0, 0, 0, 0.1)',
		  'switch-1': '0px 0px 5px rgba(0, 0, 0, 0.15)',
		  1: '0px 1px 3px rgba(0, 0, 0, 0.08)',
		  2: '0px 1px 4px rgba(0, 0, 0, 0.12)',
		  3: '0px 1px 5px rgba(0, 0, 0, 0.14)',
		  4: '0px 4px 10px rgba(0, 0, 0, 0.12)',
		  5: '0px 1px 1px rgba(0, 0, 0, 0.15)',
		  6: '0px 3px 15px rgba(0, 0, 0, 0.1)',
		},
		keyframes: {
		  "accordion-down": {
			from: { height: 0 },
			to: { height: "var(--radix-accordion-content-height)" },
		  },
		  "accordion-up": {
			from: { height: "var(--radix-accordion-content-height)" },
			to: { height: 0 },
		  },
		},
		animation: {
		  "accordion-down": "accordion-down 0.2s ease-out",
		  "accordion-up": "accordion-up 0.2s ease-out",
		},
	  },
	},
	plugins: ["tailwindcss-animate"],
  }
  
  