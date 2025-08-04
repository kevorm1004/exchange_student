# Overview

This is a modern mobile-first marketplace web application designed for students to buy and sell items within their school communities. The platform combines e-commerce functionality with social features, allowing users to browse items, engage in real-time chat, and participate in community discussions. Built as a Progressive Web App (PWA) with a mobile-first design approach, it targets the student market with location-based filtering by school and country.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client uses a React-based Single Page Application (SPA) architecture built with Vite for fast development and optimized builds. The application follows a mobile-first responsive design pattern using Tailwind CSS for styling and shadcn/ui components for consistent UI elements. State management is handled through React Query for server state and React Context for authentication state. The routing system uses Wouter for lightweight client-side navigation.

## Backend Architecture  
The server implements a REST API architecture using Express.js with TypeScript. The application follows a layered architecture pattern with clear separation between routes, business logic, and data access layers. Real-time communication is enabled through WebSocket connections for instant messaging features. The server includes comprehensive middleware for request logging, error handling, and JWT-based authentication.

## Authentication & Authorization
The system uses JWT (JSON Web Tokens) for stateless authentication with bcrypt for password hashing. Authentication state is managed client-side through React Context with tokens stored in localStorage. Protected routes require valid JWT tokens passed via Authorization headers. The authentication flow supports both login and registration with user session persistence.

## Data Storage Strategy
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations and migrations. The database schema supports users, items, chat rooms, messages, community posts, comments, and favorites with proper foreign key relationships. Neon Database is used as the PostgreSQL provider for serverless database hosting.

## File Upload & Storage
File uploads are handled through Uppy.js on the frontend with support for drag-and-drop, progress tracking, and multiple file selection. The backend integrates with Google Cloud Storage for scalable file storage with AWS S3 compatibility as a fallback option. Images are stored as arrays in the database with cloud storage URLs.

## Real-time Communication
WebSocket connections enable real-time messaging between users with automatic reconnection logic and message queuing. The WebSocket server handles user authentication, room-based messaging, and message broadcasting. Client-side WebSocket management includes connection state handling and automatic reconnection on network failures.

# External Dependencies

## Database & ORM
- **Neon Database**: Serverless PostgreSQL database hosting
- **Drizzle ORM**: Type-safe database operations and schema management
- **Drizzle Kit**: Database migration and schema management tools

## Cloud Storage
- **Google Cloud Storage**: Primary file storage solution for images and documents
- **AWS S3**: Alternative cloud storage option for file uploads

## UI Component Library
- **shadcn/ui**: Pre-built accessible UI components based on Radix UI primitives
- **Radix UI**: Headless component library for complex UI interactions
- **Tailwind CSS**: Utility-first CSS framework for responsive design

## Authentication & Security
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and salt generation

## File Upload Management  
- **Uppy**: Modular file upload library with dashboard, drag-drop, and progress features
- **Multiple Uppy plugins**: Core, Dashboard, Drag Drop, File Input, Progress Bar, React integration

## Development & Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety and enhanced developer experience
- **React Query**: Server state management and caching
- **Wouter**: Lightweight client-side routing
- **ESBuild**: Fast JavaScript bundler for production builds

## Real-time Communication
- **WebSocket (ws)**: Native WebSocket implementation for real-time messaging
- **Custom WebSocket manager**: Client-side connection management with reconnection logic