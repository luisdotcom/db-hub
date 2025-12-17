# DB-Hub - Getting Started

Welcome to DB-Hub! This guide will walk you through setting up the complete development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Minimum Version | Check Command |
|------|-----------------|---------------|
| Python | 3.8+ | `python --version` |
| Node.js | 16+ | `node --version` |
| Docker | 20+ | `docker --version` |
| Docker Compose | 2.0+ | `docker-compose --version` |

## Step 1: Start All Services via Docker
 
The easiest way to run the entire application (Frontend + Backend + Databases) is using Docker Compose.
 
 ```bash
 docker-compose up -d --build
 ```
 
 This will start:
 - **Frontend**: http://localhost:9090
 - **Backend**: http://localhost:9000
 - **MySQL**: Port 9306
 - **PostgreSQL**: Port 9432
 - **SQL Server**: Port 9433
 
 Verify containers are running:
 
 ```bash
 docker ps
 ```
 
 You should see `mi-frontend`, `mi-backend`, `mi-mysql`, `mi-postgres`, and `mi-sqlserver` running.
 
 ## Manual Setup (Optional)
 
 If you prefer to run the apps locally while keeping databases in Docker:
 
 ### 1. Start only databases
 ```bash
 docker-compose up -d mysql postgres sqlserver
 ```
 
 ### 2. Start Backend
 ```bash
 cd backend
 python -m venv venv
 # Windows:
 venv\Scripts\activate
 # Linux/Mac:
 # source venv/bin/activate
 pip install -r requirements.txt
 python -m app.main
 ```
 
 ### 3. Start Frontend
 Open a new terminal:
 ```bash
 cd frontend
 npm install
 npm run dev
 ```
 
 **Frontend running at:** http://localhost:5173 (Manual) or http://localhost:9090 (Docker)

## Your First Query

1. Open http://localhost:5173 in your browser
2. Select a database from the dropdown (MySQL, PostgreSQL, or SQL Server)
3. Click **"Test Connection"** to verify connectivity
4. Click **"Load Example"** to load a sample query
5. Click **"Execute Query"** or press `Ctrl+Enter`

## Troubleshooting

### Backend Issues

#### Error: "No module named 'app'"
- Ensure you're in the `backend` directory
- Virtual environment is activated (you should see `(venv)` in your terminal)
- Run `pip install -r requirements.txt` again

#### Error: "Can't connect to database"
- Check if Docker containers are running: `docker ps`
- Restart containers: `docker-compose restart`

### Frontend Issues

#### Error: "Cannot find module"
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### Error: "Network Error" when executing queries
- Ensure backend is running and accessible (check port 9000)
- Check browser console for CORS errors
- Verify the API URL in frontend config

### Database Connection Issues

#### Test MySQL connection directly:
```bash
docker exec -it mi-mysql mysql -u luisdotcom -p
# Password: !WH0wZ&MD1@QrbR
```

#### Test PostgreSQL connection directly:
```bash
docker exec -it mi-postgres psql -U luisdotcom -d dev
```

#### Test SQL Server connection directly:
```bash
docker exec -it mi-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '!WH0wZ&MD1@QrbR' -C
```

## Development Tips

### Hot Reload

Both backend and frontend support hot reload during development:

| Component | What triggers reload |
|-----------|---------------------|
| Backend | Changes to `.py` files |
| Frontend | Changes to `.jsx`, `.js`, `.css` files |

### API Testing

Use the built-in Swagger UI for interactive API testing:
- http://localhost:9000/api/docs

### Theme Toggle

Click the sun/moon icon in the header to switch between light and dark themes.

### Useful Docker Commands

```bash
# View container logs
docker-compose logs -f

# Stop all containers
docker-compose down

# Reset databases (destroys data)
docker-compose down -v
docker-compose up -d
```

## Next Steps

1. Explore the [API documentation](http://localhost:9000/api/docs)
2. Try different SQL queries on each database
3. Check out the project structure in the main [README.md](../README.md)
4. Customize theme colors in CSS variables

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the terminal logs for error messages
3. Check Docker container logs: `docker-compose logs`
4. Open an issue on [GitHub](https://github.com/luisdotcom/db-hub/issues)