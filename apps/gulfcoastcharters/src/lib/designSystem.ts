// Gulf Coast Charters Design System - Water & Sand Theme
export const colors = {
  primary: {
    gradient: 'from-blue-500 via-cyan-400 to-teal-500',
    solid: 'bg-blue-500',
    text: 'text-blue-500',
    hover: 'hover:bg-blue-600'
  },
  secondary: {
    gradient: 'from-amber-200 via-yellow-100 to-orange-200',
    solid: 'bg-amber-100',
    text: 'text-amber-700'
  },
  ocean: {
    deep: 'bg-blue-900',
    medium: 'bg-blue-600',
    light: 'bg-cyan-400',
    foam: 'bg-cyan-100'
  },
  sand: {
    dark: 'bg-amber-200',
    medium: 'bg-yellow-100',
    light: 'bg-orange-50'
  },
  accent: {
    coral: 'bg-orange-400',
    seaweed: 'bg-teal-600',
    sunset: 'bg-rose-400'
  }
};

export const shadows = {
  card: 'shadow-lg shadow-blue-100/50',
  cardHover: 'hover:shadow-xl hover:shadow-cyan-200/50',
  button: 'shadow-md shadow-blue-200/30'
};

export const spacing = {
  section: 'py-12 md:py-16',
  container: 'container mx-auto px-4',
  cardGap: 'gap-4 md:gap-6'
};

export const typography = {
  h1: 'text-4xl md:text-5xl lg:text-6xl font-bold',
  h2: 'text-3xl md:text-4xl lg:text-5xl font-bold',
  h3: 'text-2xl md:text-3xl font-bold',
  body: 'text-base md:text-lg',
  small: 'text-sm'
};

export const breakpoints = {
  mobile: 'grid-cols-1',
  tablet: 'sm:grid-cols-2',
  desktop: 'lg:grid-cols-3',
  wide: 'xl:grid-cols-4'
};
