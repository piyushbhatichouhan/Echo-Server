Absolutely. At this point you've built **Echo Hub API v1**. Here's the complete API reference for everything that's available today.

---

# Base URL

For local development:

```text
http://localhost:3000/api
```

(Replace `3000` with whatever port your server is using.)

---

# 1. Health Check

## Endpoint

```http
GET /api/health
```

### Headers

None

### Body

None

### Example

```http
GET /api/health
```

### Response

```json
{
  "success": true,
  "message": "Server is healthy"
}
```

---

# 2. Register User

## Endpoint

```http
POST /api/auth/register
```

### Headers

```text
Content-Type: application/json
```

### Body

```json
{
  "username": "echo",
  "email": "echo@example.com",
  "password": "12345678"
}
```

### Success Response

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "...",
    "username": "echo",
    "email": "echo@example.com",
    "created_at": "..."
  }
}
```

### Possible Errors

- `400` Validation failed
- `409` Username already exists
- `409` Email already exists

---

# 3. Login

## Endpoint

```http
POST /api/auth/login
```

### Headers

```text
Content-Type: application/json
```

### Body

```json
{
  "email": "echo@example.com",
  "password": "12345678"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "...",
      "username": "echo",
      "email": "echo@example.com"
    }
  }
}
```

### Save this token

You'll use it for all protected routes.

---

# 4. Current User

## Endpoint

```http
GET /api/auth/me
```

### Headers

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body

None

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "...",
    "username": "echo",
    "email": "echo@example.com",
    "created_at": "..."
  }
}
```

---

# 5. Create Project

## Endpoint

```http
POST /api/projects
```

### Headers

```text
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### Body

```json
{
  "name": "Component Tester",
  "description": "Arduino component tester backend"
}
```

`description` is optional if your validator allows it.

### Success Response

```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "id": "...",
    "owner_id": "...",
    "name": "Component Tester",
    "description": "Arduino component tester backend",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

# 6. Get All Projects

## Endpoint

```http
GET /api/projects
```

### Headers

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body

None

### Success Response

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Component Tester",
      "description": "...",
      "created_at": "...",
      "updated_at": "..."
    },
    {
      "id": "...",
      "name": "Portfolio",
      "description": "...",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

Only projects owned by the authenticated user are returned.

---

# 7. Get Project by ID

## Endpoint

```http
GET /api/projects/:id
```

Example:

```http
GET /api/projects/8d82e6d3-7f5e-4f6c-baf7-9c4f1b9a3c0e
```

### Headers

```text
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body

None

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Component Tester",
    "description": "...",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### Possible Errors

```http
404 Not Found
```

if:

- project doesn't exist
- or project belongs to another user

---

# Authorization Header

Every protected endpoint uses exactly the same header:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Notice the space after `Bearer`.

---

# Current API Summary

| Method | Endpoint             | Auth Required | Purpose                  |
| ------ | -------------------- | ------------- | ------------------------ |
| GET    | `/api/health`        | ❌            | Health check             |
| POST   | `/api/auth/register` | ❌            | Register a user          |
| POST   | `/api/auth/login`    | ❌            | Login and receive JWT    |
| GET    | `/api/auth/me`       | ✅            | Get current user         |
| POST   | `/api/projects`      | ✅            | Create a project         |
| GET    | `/api/projects`      | ✅            | List your projects       |
| GET    | `/api/projects/:id`  | ✅            | Get one of your projects |

---

# What we'll add next

The Project API is still incomplete. The next endpoints are:

| Method | Endpoint                  | Purpose                                |
| ------ | ------------------------- | -------------------------------------- |
| PATCH  | `/api/projects/:id`       | Update a project's name or description |
| DELETE | `/api/projects/:id`       | Delete a project                       |
| POST   | `/api/projects/:id/files` | Upload files to a project              |
| GET    | `/api/projects/:id/files` | List project files                     |
| GET    | `/api/files/:id/download` | Download a file                        |
| DELETE | `/api/files/:id`          | Delete a file                          |

After that, we'll have the first complete version of the **Projects + Files** module, which will become the foundation for the Echo Hub dashboard and everything else you plan to build on top of it.

---

EchoHub Backend API Test Checklist
Base URL
http://localhost:3000/api

1. Authentication
   □ Register
   POST /auth/register

Headers

Content-Type: application/json

Body

{
"username": "echo",
"email": "echo@test.com",
"password": "Password123!"
}
□ Login
POST /auth/login

Headers

Content-Type: application/json

Body

{
"email": "echo@test.com",
"password": "Password123!"
}

Save

accessToken
Everything below uses

Headers

Authorization: Bearer <TOKEN>

Content-Type: application/json 2. Projects
□ Create Project
POST /projects

Body

{
"name": "Test Project",
"description": "Backend testing"
}

Save

projectId
□ Get All Projects
GET /projects
□ Get Project
GET /projects/:projectId
□ Update Project
PUT /projects/:projectId

Body

{
"name": "Updated Project",
"description": "Updated description"
}
□ Delete Project
DELETE /projects/:projectId

Expected

container removed
image removed
folder removed
DB cleaned 3. Files
□ Upload File
POST /projects/:projectId/files

Body

form-data

file : index.js
□ Upload package.json
POST /projects/:projectId/files
form-data

file : package.json
□ Get Files
GET /projects/:projectId/files
□ Download File
GET /projects/:projectId/files/:fileId

(or whatever route you implemented)

□ Delete File
DELETE /projects/:projectId/files/:fileId 4. Application
□ Configure Entry File
PUT /projects/:projectId/application

Body

{
"entryFile": "index.js"
}
□ Get Application
GET /projects/:projectId/application 5. Environment Variables
□ Create Variable
POST /projects/:projectId/environment

Body

{
"key": "API_KEY",
"value": "123456"
}
□ Create Another Variable
{
"key": "NODE_ENV",
"value": "production"
}
□ List Variables
GET /projects/:projectId/environment
□ Update Variable
PUT /projects/:projectId/environment/:id

Body

{
"value": "abcdef"
}
□ Delete Variable
DELETE /projects/:projectId/environment/:id 6. Deployment
□ Deploy
POST /projects/:projectId/deploy

Verify

building

↓

creating_container

↓

starting_container

↓

health_check

↓

running
□ Redeploy
POST /projects/:projectId/redeploy

Verify

Old deployment

↓

Stopped

↓

New deployment created

□ Deployment History
GET /projects/:projectId/deployments
□ Deployment Status
GET /projects/:projectId/deployments/status
□ Stop Project
POST /projects/:projectId/deployments/stop
□ Start Project
POST /projects/:projectId/deployments/start
□ Restart Project
POST /projects/:projectId/deployments/restart 7. Logs
□ Get Logs
GET /projects/:projectId/logs
□ Live Logs (SSE)
GET /projects/:projectId/logs/live

Deploy again

Verify

Live stream updates 8. Health
□ Application Health

Visit

http://localhost:<projectPort>/health

Verify

{
"success": true
} 9. Authorization Tests

Without JWT

Verify

401

for every protected endpoint.

10. Ownership Tests

Login as another user

Verify

404 / 403

on

project
files
deployment
environment
logs 11. Validation Tests

Try

{
}

everywhere

Verify

400

Try

{
"name":123
}

Verify

400 12. Failure Tests

Deploy invalid app

Expected

failed

Logs stored

History stored

No orphan container

Delete running project

Expected

Everything cleaned.

Restart stopped project

Expected

Running.

Stop already stopped project

Expected

Graceful response.

13. Docker Verification

After all tests

Run

docker ps -a

Verify

Only expected containers exist.

Run

docker images

Verify

No dangling images.

14. Database Verification

Verify

users
projects
files
applications
environment_variables
deployments
deployment_logs

contain expected data.
