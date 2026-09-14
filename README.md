# Admin Dashboard

A modern admin dashboard built with **Next.js 16**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

## Features

- **Next.js 16** (App Router, Turbopack)
- **React 19** with TypeScript
- **Tailwind CSS v4** with CSS-first configuration
- **next-intl v4** for internationalization (i18n) and RTL support
- **ApexCharts** for data visualization
- **FullCalendar** for scheduling
- **Swiper** for carousels
- Dark mode support (light/dark/auto)
- Responsive sidebar with collapsible navigation
- Authentication pages (Sign In, Sign Up)
- Multiple dashboard layouts
- UI component library (buttons, modals, tables, forms, charts, etc.)

## Getting Started

### Prerequisites

- Node.js 20.x or later

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   └── [locale]/            # Localized routes
├── components/              # React components
│   ├── ui/                  # Primitive UI components
│   ├── form/                # Form components
│   ├── common/              # Shared components
│   ├── header/              # Header dropdowns
│   └── <feature>/           # Feature-specific components
├── layout/                  # Admin shell (sidebar, header)
├── context/                 # React contexts (Sidebar, Theme)
├── hooks/                   # Custom hooks
├── icons/                   # SVG icons (SVGR)
├── i18n/                    # Internationalization config
├── messages/                # Translation dictionaries
└── utils/                   # Utility functions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Internationalization

This project uses `next-intl` for i18n. Supported locales:
- English (en)
- Arabic (ar) - RTL
- Spanish (es)
- German (de)

Translation files are in `src/messages/`.

## Styling

Uses Tailwind CSS v4 with theme tokens defined in `src/app/globals.css`. All styling uses CSS logical properties for RTL support.

## License

MIT