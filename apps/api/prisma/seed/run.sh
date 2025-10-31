#!/bin/bash

# WebSocket Framework Database Seed Script
# This script seeds the SQLite database with initial data

echo "🌱 Starting database seeding..."

# Change to the API directory
cd "$(dirname "$0")/.."

# Run the seed script
npm run db:seed

echo "✅ Database seeding completed!"
