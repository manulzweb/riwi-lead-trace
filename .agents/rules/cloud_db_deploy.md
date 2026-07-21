---
description: Ensure database deployment scripts and connection strings align, especially for cloud providers.
---

# Cloud Database Deployment Rule

When deploying or executing SQL scripts against a cloud database provider (like Railway, Render, etc.):

1. **Check for `USE` Statements**: Inspect the DDL/DML scripts for `CREATE DATABASE` or `USE <dbname>` statements.
2. **Align Connection Strings**: Ensure that the database name in the application's connection string (e.g., `DATABASE_URL`) matches the exact database being created or used in the SQL scripts.
3. **If unavoidable**, advise the user to either update their cloud Environment Variables to point to the new database name, or safely remove the `CREATE DATABASE / USE` lines from the SQL scripts so the tables populate the cloud provider's default database.
