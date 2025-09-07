# Overview

This is an elementary school learning management system designed for 5th grade (5학년 7반) students and teachers. The application facilitates weekly learning record submissions, AI-powered evaluation generation, and student progress tracking. Students can log their learning content and reflections, while teachers can upload weekly materials, manage students, and generate AI-powered evaluations based on learning records.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom Korean font (Noto Sans KR) support
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy using session-based authentication
- **Session Storage**: PostgreSQL-backed session store using connect-pg-simple
- **File Handling**: Multer for PDF upload processing
- **Security**: Password hashing using Node.js crypto scrypt function

## Database Design
- **Users**: Handles both teachers and students with role-based access
- **Students**: Separate student profiles linked to user accounts
- **Weekly Materials**: PDF uploads with extracted content and subject parsing
- **Learning Records**: Student submissions with content, reflections, and subject classification
- **Evaluations**: AI-generated assessments stored with student associations

## Authentication & Authorization
- **Session-based authentication** with secure cookie configuration
- **Role-based access control** distinguishing teachers from students
- **Protected routes** on both client and server sides
- **Automatic session persistence** across page refreshes

## AI Integration
- **OpenAI GPT-5 integration** for generating Korean language evaluations
- **PDF content extraction** for automatic subject identification
- **Structured prompt engineering** for educational assessment generation
- **JSON response parsing** for consistent evaluation format

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Database URL**: Environment-based configuration for database connectivity

## AI Services
- **OpenAI API**: GPT-5 model for generating Korean language evaluations
- **API Key Management**: Environment variable-based API key configuration

## Third-party Libraries
- **Radix UI**: Comprehensive accessible component primitives
- **TanStack Query**: Server state management and data synchronization
- **Drizzle ORM**: Type-safe PostgreSQL operations with migration support
- **Passport.js**: Authentication middleware with local strategy
- **Multer**: Multipart form data handling for file uploads
- **Zod**: Runtime type validation and schema definition

## Development Tools
- **Vite**: Fast build tool with HMR support
- **TypeScript**: Type safety across the entire application
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundling for production builds

## Session Management
- **connect-pg-simple**: PostgreSQL session store integration
- **Express Session**: Server-side session management with secure configuration