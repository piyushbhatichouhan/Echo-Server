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
