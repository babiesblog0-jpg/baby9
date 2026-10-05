@echo off
echo ========================================
echo Baby Food CMS - Quick Setup
echo ========================================
echo.

echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js first.
    exit /b 1
)

echo ✓ Node.js found

echo.
echo Installing dependencies...
call npm install

if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)

echo ✓ Dependencies installed

echo.
echo Seeding database...
call npm run seed

if errorlevel 1 (
    echo ERROR: Failed to seed database
    exit /b 1
)

echo ✓ Database seeded

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the server, run:
echo   npm start
echo.
echo Admin Panel URL:
echo   http://localhost:5000/admin/index.html
echo.
echo Default Admin Credentials:
echo   Email: admin@babyfood.com
echo   Password: Admin@123456
echo.
echo Make sure MongoDB is running before starting!
echo ========================================
