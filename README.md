<p align="center">
  <img src="public/images/readme-banner.svg" alt="tar1090-react" width="800" />
</p>

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

## Project Structure

```
src/
├── app/            # App shell, layout, routing
├── config/         # App-wide configuration constants
├── data/           # Data fetching, polling, decoders
├── domain/         # Core domain logic (aircraft, altitude, units…)
├── features/       # Feature modules (live, playback, stats, detail…)
├── i18n/           # Internationalization resources
├── map/            # OpenLayers map layers, styles, markers
├── store/          # Zustand state stores
└── ui/             # UI components (Toolbar, ListPanel, StatsDashboard…)
```

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Framework | React 19, TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4, HeroUI v3 |
| Map | OpenLayers |
| State | Zustand |
| Data | TanStack Query |
| Charts | Recharts |
| i18n | i18next |
| Testing | Vitest |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes
4. Push to the branch and open a Pull Request

## Roadmap

- [ ] Multi-receiver support
- [ ] PWA offline mode
- [ ] More language packs
- [ ] Performance optimizations for high-traffic feeds

## Acknowledgements

This project is a React-based rewrite inspired by the original **[tar1090](https://github.com/wiedehopf/tar1090)** by **[wiedehopf](https://github.com/wiedehopf)** (Matthias Wirth), which is itself based on **[dump1090](https://github.com/flightaware/dump1090)** by **[FlightAware](https://www.flightaware.com/)**. Huge thanks to both projects for their contributions to the ADS-B open-source community.

Additional credits:

- **[tar1090-db](https://github.com/wiedehopf/tar1090-db)** — Aircraft database for type/registration lookups
- **[country-flag-icons](https://gitlab.com/nicedoc/country-flag-icons)** by @catamphetamine — Country flag SVGs

## License

GPL-2.0-or-later — see [LICENSE](LICENSE).
