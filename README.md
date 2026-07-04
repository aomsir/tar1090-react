# tar1090-react

A modern React rewrite of [tar1090](https://github.com/wiedehopf/tar1090), the popular ADS-B aircraft tracking web interface. Built with React 19, TypeScript, and OpenLayers — fully compatible with the original tar1090 data backend.

## Features

- Real-time aircraft tracking on an interactive map
- History playback with timeline controls
- Aircraft detail view with registration, route, photo lookup, and more
- Statistics dashboard with various charts
- Dark mode UI
- Mobile-responsive layout
- Internationalization (English & Simplified Chinese)
- KML export for aircraft tracks

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm

### Install & Run

```bash
git clone https://github.com/aomsir/tar1090-react.git
cd tar1090-react
pnpm install
pnpm run vendor-db   # download aircraft database
pnpm dev
```

### Configuration

Create a `.env.local` file to point at your ADS-B data source:

```env
VITE_PROXY_TARGET=https://your-tar1090-server.example.com
```

### Build

```bash
pnpm build
pnpm preview
```

## Tech Stack

React 19 / TypeScript / Vite / Tailwind CSS v4 / HeroUI v3 / OpenLayers / Zustand / TanStack Query / Recharts / i18next / Vitest

## Acknowledgements

This project is a React-based rewrite inspired by the original **[tar1090](https://github.com/wiedehopf/tar1090)** by **[wiedehopf](https://github.com/wiedehopf)** (Matthias Wirth), which is itself based on **[dump1090](https://github.com/flightaware/dump1090)** by **[FlightAware](https://www.flightaware.com/)**. Huge thanks to both projects for their contributions to the ADS-B open-source community.

Additional credits:

- **[tar1090-db](https://github.com/wiedehopf/tar1090-db)** — Aircraft database for type/registration lookups
- **[country-flag-icons](https://gitlab.com/nicedoc/country-flag-icons)** by @catamphetamine — Country flag SVGs

## License

GPL-2.0-or-later — see [LICENSE](LICENSE).
