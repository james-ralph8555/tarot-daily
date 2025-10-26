# Database Initialization

The pipeline requires a PostgreSQL database with the proper schema to function. The database schema is defined in the web application and must be initialized before running the pipeline.

## How to Initialize the Database

### Option 1: Start the Web Application

The easiest way to initialize the database is to start the web application. It will automatically create the database and all required tables:

```bash
cd apps/web
npm run dev
```

The web app will connect to PostgreSQL using the `DATABASE_URL` environment variable and initialize all necessary tables.
