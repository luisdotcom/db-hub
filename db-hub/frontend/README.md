# Frontend README

## React + Vite Database Query UI

A modern, responsive React application for database query execution.

## Technology Stack

- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Vite PWA**: PWA support (Service Worker, Manifest)
- **Axios**: HTTP client
- **Lucide React**: Icon library
- **CSS Variables**: Theme management

## Project Structure

```
src/
├── components/       # UI components
│   ├── Header.jsx
│   ├── DatabaseSelector.jsx
│   ├── QueryEditor.jsx
│   └── QueryResults.jsx
├── contexts/        # React contexts
│   └── ThemeContext.jsx
├── services/        # API services
│   └── databaseService.js
├── config/          # Configuration
│   └── api.js
├── App.jsx          # Main component
└── main.jsx         # Entry point
```

## Setup

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create `.env` file:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Component Architecture

### Header
- Application title
- Theme toggle button
- Sticky positioning

### DatabaseSelector
- Database type selection (MySQL/PostgreSQL)
- Connection testing
- Visual feedback for connection status

### QueryEditor
- SQL query input
- Syntax highlighting with monospace font
- Keyboard shortcuts (Ctrl+Enter to execute)
- Example query loading

### QueryResults
- Table display for SELECT results
- Success/error messages
- Rows affected for INSERT/UPDATE/DELETE
- Empty state for no results

## Theme System

### CSS Variables

The application uses CSS custom properties for theming:

```css
/* Light Theme */
--light-background: #f8f9fa;
--light-surface: #ffffff;
--light-text: #1f2937;

/* Dark Theme */
--dark-background: #0d1117;
--dark-surface: #161b22;
--dark-text: #e6edf3;
```

### Theme Context

- React Context for theme state
- localStorage persistence
- Smooth transitions between themes

## Responsive Design

### Breakpoints

- **Desktop**: > 768px (full layout)
- **Tablet**: 640px - 768px (adjusted spacing)
- **Mobile**: < 640px (stacked layout)

### Mobile Optimizations

- Stack database options vertically
- Full-width buttons
- Reduced padding
- Scrollable tables

## Service Layer

### API Client

Centralized Axios instance with:
- Base URL configuration
- Request/response interceptors
- Error handling
- Timeout configuration

### Database Service

Clean API for database operations:
- `executeQuery()`
- `getTables()`
- `getTableSchema()`
- `testConnection()`

## Code Quality

### Clean Code Practices

- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Meaningful naming conventions
- Proper component composition

### JSDoc Comments

Functions include documentation:
```javascript
/**
 * Execute a SQL query on specified database
 * @param {string} databaseType - Type of database
 * @param {string} query - SQL query to execute
 * @returns {Promise} Query result
 */
```

## Performance

### Optimizations

- Component memoization where needed
- Lazy loading for future features
- Efficient re-renders
- Debouncing for search/filter (future)

## Accessibility

- Semantic HTML
- ARIA labels for buttons
- Keyboard navigation support
- Focus management

## PWA Support
- **Installable**: Can be installed as a standalone app on Desktop and Mobile.
- **Offline Capable**: Resources are cached via Service Worker.
- **Auto Update**: checks for updates automatically.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
