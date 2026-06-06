IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'aivacol_db')
BEGIN
    CREATE DATABASE aivacol_db;
END
GO