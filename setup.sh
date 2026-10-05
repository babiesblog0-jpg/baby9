#!/bin/bash

echo "========================================"
echo "Baby Food CMS - Quick Setup"
echo "========================================"
echo

echo "Checking for Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✓ Node.js found"

echo
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"

echo
echo "Seeding database..."
npm run seed

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to seed database"
    exit 1
fi

echo "✓ Database seeded"

echo
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo
echo "To start the server, run:"
echo "  npm start"
echo
echo "Admin Panel URL:"
echo "  http://localhost:5000/admin/index.html"
echo
echo "Default Admin Credentials:"
echo "  Email: admin@babyfood.com"
echo "  Password: Admin@123456"
echo
echo "Make sure MongoDB is running before starting!"
echo "========================================"
