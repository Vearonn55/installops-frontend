# InstallOps - Furniture Installation Management Platform

A comprehensive web application for managing furniture installation operations across multiple roles and workflows.

## Features

### Multi-Role Support
- **Admin**: System administration, user management, integrations, audit logs
- **Store Manager**: Order management, installation scheduling, customer management
- **Warehouse Manager**: Inventory management, pick list generation, stock tracking
- **Installation Crew**: Mobile PWA for job execution, offline support, photo capture

### Core Functionality
- **Order Management**: Create and manage customer orders
- **Installation Scheduling**: Calendar-based scheduling with capacity management
- **Inventory Tracking**: Real-time stock levels and allocation
- **Pick List Generation**: Automated pick list creation for installations
- **Job Execution**: Mobile-friendly crew app with offline capabilities
- **Photo Documentation**: Required photo capture with tagging
- **Checklist Management**: Configurable installation checklists
- **Reporting & Analytics**: KPI dashboards and operational insights
- **Audit Trail**: Complete activity logging and compliance tracking

## Technology Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation
- **TanStack Query** for server state management
- **Zustand** for client state management
- **React Hook Form** with Zod validation
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Architecture
- **Modular Monolith**: Organized by feature modules
- **Role-Based Access Control (RBAC)**: Granular permissions
- **Offline-First PWA**: Crew app works offline with sync
- **API-First Design**: RESTful API with OpenAPI specification
- **Responsive Design**: Mobile-first approach

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd installops-alpler
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage

## Build and serve with nginx

### 1. Build the app

On the server (or in CI), from the project root:

```bash
cd /var/www/installops-frontend
npm install
# Optional: apply TypeScript/build fixes if build fails
node scripts/fix-ts-build.cjs
npm run build
```

Output goes to `dist/`.

### 2. Configure nginx

Copy the example config and enable the site:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/installops-frontend
# Edit server_name and paths if needed
sudo ln -sf /etc/nginx/sites-available/installops-frontend /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

- **Root**: nginx serves from `/var/www/installops-frontend/dist` (set in `deploy/nginx.conf`).
- **SPA routing**: `try_files` sends all routes to `index.html` so React Router works.
- **API**: If your backend runs on the same host, uncomment the `location /api/` block in `deploy/nginx.conf` and point `proxy_pass` at your API (e.g. `http://127.0.0.1:8000/`).

### 3. Deploy updates

After pulling new code:

```bash
cd /var/www/installops-frontend
npm install
npm run build
# nginx already serves dist/; no reload needed for static files
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   ├── api.ts         # API client
│   ├── query-client.ts # React Query configuration
│   └── utils.ts       # Utility functions
├── pages/              # Page components
│   ├── admin/         # Admin pages
│   ├── auth/          # Authentication pages
│   ├── crew/          # Crew PWA pages
│   ├── manager/       # Store manager pages
│   ├── shared/        # Shared pages
│   └── warehouse/     # Warehouse pages
├── stores/             # State management
│   ├── auth.ts        # Authentication store
│   └── offline.ts     # Offline queue store
├── types/              # TypeScript type definitions
└── App.tsx            # Main application component
```

## Role-Based Access Control

### Admin
- Full system access
- User and role management
- System configuration
- Audit log access
- Integration management

### Store Manager
- Order management
- Installation scheduling
- Customer management
- Calendar access
- Reports (store-scoped)

### Warehouse Manager
- Inventory management
- Pick list generation
- Product catalog
- Stock allocation

### Installation Crew
- Job acceptance/decline
- Installation execution
- Photo capture
- Checklist completion
- Issue reporting
- Offline operation

## API Integration

The frontend communicates with a REST API following these patterns:

- **Base URL**: `/api/v1`
- **Authentication**: JWT Bearer tokens
- **Error Handling**: RFC 7807 Problem Details
- **Data Format**: JSON
- **Pagination**: Cursor-based pagination
- **Filtering**: Query parameter-based

## Offline Support

The Crew PWA includes comprehensive offline support:

- **Offline Queue**: Actions are queued when offline
- **Background Sync**: Automatic sync when connection restored
- **Conflict Resolution**: Handles sync conflicts gracefully
- **Data Persistence**: Local storage for critical data
- **Status Indicators**: Clear offline/online status

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks
- Implement proper error boundaries
- Write comprehensive tests

### Component Guidelines
- Keep components small and focused
- Use proper prop typing
- Implement loading and error states
- Follow accessibility guidelines (WCAG 2.1 AA)

### State Management
- Use React Query for server state
- Use Zustand for client state
- Implement optimistic updates where appropriate
- Handle loading and error states consistently

## Testing

The project includes comprehensive testing setup:

- **Unit Tests**: Component and utility testing
- **Integration Tests**: API integration testing
- **E2E Tests**: Full user workflow testing
- **Accessibility Tests**: WCAG compliance testing

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
Create a `.env` file with:
```
VITE_API_URL=http://localhost:8000/api/v1
```

### Docker Support
```bash
docker build -t installops-frontend .
docker run -p 3000:3000 installops-frontend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.