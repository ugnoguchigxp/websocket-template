# Database Seed Scripts

This directory contains database seeding scripts for the WebSocket Framework.

## Files

- `index.ts` - Main seed script that creates initial data
- `run.sh` - Executable shell script to run the seed

## Usage

### Using npm script (recommended):
```bash
npm run db:seed
```

### Using the shell script:
```bash
./prisma/seed/run.sh
```

### Direct execution:
```bash
vite-node prisma/seed/index.ts
```

## What gets seeded

1. **Admin User**
   - Username: `admin`
   - Password: `websocket3001`

2. **Demo Posts** (3 posts)
   - Welcome post
   - Real-time communication demo
   - Tech stack overview

3. **Demo Comments** (5 comments)
   - Sample comments on the posts

## Database Reset

To completely reset the database and reseed:
```bash
npm run db:reset
```

This will clear all existing data and recreate the seed data.

## Notes

- The seed script uses SQLite directly (not Prisma)
- Passwords are hashed using Argon2
- All data is created with proper foreign key relationships
- The script logs all operations for debugging
