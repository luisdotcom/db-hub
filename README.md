# DB-Hub

A modern, unified database management system for containerized databases (MySQL, PostgreSQL, SQL Server) with a professional web interface. Designed for portable and reproducible development environments.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

<img width="2000" height="1000" alt="Document" src="https://github.com/user-attachments/assets/82a27020-7c0d-4745-9f31-8be3bd3c05de" />

## Features

- **Multi-Database Support**: Connect to MySQL, PostgreSQL, and SQL Server
- **Use Autononous Containers**: The system automatically spins up pre-configured Docker containers for each database type by default, ensuring a ready-to-use environment out of the box.
- **Secure Authentication**: Built-in login system with session management and HTTP-only cookies
- **Modern Web Interface**: Clean, responsive React-based UI with dark/light theme support
- **Progressive Web App (PWA)**: Installable as a native-like app with offline capabilities
- **Query Editor**: Syntax highlighting, automatic formatting, and sample queries for quick testing
- **Real-time Results**: Execute queries and view results in formatted tables
- **Database Export**: Export your databases to SQL files with a single click
- **Docker-Ready**: Full-stack Docker Compose setup (Frontend, Backend, Databases)
- **RESTful API**: FastAPI backend with automatic OpenAPI documentation

## Architecture

```
db-hub/
├── backend/                 # FastAPI Python backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── config/         # Configuration settings
│   │   ├── core/           # Core utilities & exceptions
│   │   ├── models/         # Pydantic models
│   │   └── services/       # Database services
│   └── requirements.txt
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # Theme & Toast contexts
│   │   ├── services/       # API services
│   │   └── config/         # Configuration
│   └── package.json
└── docker-compose.yml      # Database containers
```

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Docker & Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/luisdotcom/db-hub.git
cd db-hub/db-hub
```

### 2. Launch the Full Stack
This command orchestrates the entire environment: the UI, the API, and all database engines.

```bash
docker-compose up -d --build
```

> [!NOTE]
> A single docker-compose up command initializes the full stack.
>
> This includes the Web Interface, the REST API, and a dedicated container for each supported database engine, ensuring a complete, isolated, and ready-to-use development environment.
> 
> Navigate to http://localhost:9090 to see the project running via Docker.


## Local Development (Optional)
### 1. Start the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python -m app.main
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Open the app

Navigate to http://localhost:5173 in your browser.

> [!TIP]
> For detailed setup instructions, see [GETTING_STARTED.md](db-hub/GETTING_STARTED.md)

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **python-jose** - JWT Authentication

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Vite PWA** - PWA Support
- **Axios** - HTTP client
- **Lucide React** - Icons
- **React Syntax Highlighter** - Code highlighting
- **SQL Formatter** - Query formatting

### Databases & Services
- **mi-frontend**: React Frontend (Port 9090/5173)
- **mi-backend**: FastAPI Backend (Port 9000)
- **mi-mysql**: MySQL 8.0 (Port 9306)
- **mi-postgres**: PostgreSQL 16 (Port 9432)
- **mi-sqlserver**: SQL Server 2022 (Port 9433)

## API Documentation

Once the backend is running, access the API documentation:

- **Swagger UI**: http://localhost:9000/api/docs
- **ReDoc**: http://localhost:9000/api/redoc

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
