# Chat App

A real-time chat application with JWT authentication and collection API.

## Features
- JWT access + refresh tokens (httpOnly cookie)
- bcrypt password hashing
- Rate limiting + Helmet security
- REST API for items collection
- Real-time messaging with Socket.IO

## Tech Stack
- Node.js + Express
- MongoDB (Mongoose)
- Socket.IO
- JWT + bcryptjs

## Local Setup
```bash
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
