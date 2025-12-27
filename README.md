# DB-Hub

**The Universal Database Explorer for Modern Development.**

A professional, unified interface for managing databases across local Docker containers, remote servers, and SQLite files.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-purple.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)

<img width="2000" height="1000" alt="Preview" src="https://github.com/user-attachments/assets/62afa0a5-8b08-4929-90ba-3df346ae6e81" />

## Why DB-Hub?

Most database clients are clunky desktop apps. DB-Hub is a modern **Progressive Web App (PWA)** that runs anywhere:

- **Universal Connectivity**: Connect to **MySQL**, **PostgreSQL**, **SQL Server**, and **SQLite**.
- **Hybrid Workflow**: Seamlessly switch between auto-provisioned local containers (Docker) and your own custom remote connections.
- **Zero-Config Environments**: Spin up a full stack with one command (`docker-compose up`).

## Features

### Universal Database Support
- **Multi-Engine**: Native support for MySQL, PostgreSQL, SQL Server.
- **SQLite Manager**: Full-featured file manager for SQLite. Upload, create, download, and query `.db` files directly from the browser.
- **Custom Connections**: Connect to any external database instance (AWS RDS, Remote VPS, Localhost) using standard connection strings.

### Professional Query Interface
- **Advanced Editor**: Syntax highlighting, auto-formatting, and intelligent suggestions.
- **Query History**: Automatically saves your execution history. Restore and rerun past queries with one click.
- **Inline Editing**: Edit, update, and delete table rows directly within the results grid, **without writing SQL**.
- **Real-time Results**: Fast, sortable, and searchable result tables.

### Premium User Experience
- **Modern UI**: Polished React interface with smooth animations and a carefully crafted Dark/Light theme.
- **PWA Standard**: Install as a native desktop app. Works offline.
- **Secure**: Built-in authentication with session management.
- **Developer First**: Docker-ready, export capabilities, and REST API documentation included.

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
