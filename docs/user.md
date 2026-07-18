## Register USER

# POST api/auth/register

{

"username": "Piyush",
"email": "piyush@gmail.com",
"password": "piyush@1"
}

# response

{
"success": true,
"message": "User registered successfully",
"data": {
"id": "da7a0aca-efc0-48a3-be72-74bc2ba5a8b3",
"username": "Piyush",
"email": "piyush@gmail.com",
"created_at": "2026-07-14T14:07:52.665Z"
}
}

## Login USER

# POST api/auth/login

{
"email": "piyush@gmail.com",
"password": "piyush@1"
}

# response

{
"success": true,
"message": "Login successful",
"data": {
"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRhN2EwYWNhLWVmYzAtNDhhMy1iZTcyLTc0YmMyYmE1YThiMyIsInVzZXJuYW1lIjoiUGl5dXNoIiwiZW1haWwiOiJwaXl1c2hAZ21haWwuY29tIiwiaWF0IjoxNzg0MDM4MjA5LCJleHAiOjE3ODQ2NDMwMDl9.LoxyPIPPCvxuWBjn2Oa7lPdDvIsqXDHcwMlNhBf01ng",
"user": {
"id": "da7a0aca-efc0-48a3-be72-74bc2ba5a8b3",
"username": "Piyush",
"email": "piyush@gmail.com"
}
}
}

## Create Project

# POST api/projects

{
"name": "Test Project V1",
"description": "Backend testing"
}

# response

{
"success": true,
"message": "Project created successfully",
"data": {
"id": "80800ba8-964b-43d9-b395-df906d83257b",
"owner_id": "da7a0aca-efc0-48a3-be72-74bc2ba5a8b3",
"name": "Test Project V1",
"description": "Backend testing",
"created_at": "2026-07-14T14:12:57.005Z",
"updated_at": "2026-07-14T14:12:57.005Z",
"port": 3006
}
}

## Upload File

# POST api/projects/project:id/files

# response

{
"success": true,
"message": "File uploaded successfully",
"data": {
"id": "467b15b2-e444-47f2-aa2d-1683a2663286",
"project_id": "80800ba8-964b-43d9-b395-df906d83257b",
"original_name": "index.js",
"stored_name": "72605d33-153f-404c-ad51-2a53591bfa27.js",
"mime_type": "application/javascript",
"file_size": "872",
"storage_path": "storage\\projects\\80800ba8-964b-43d9-b395-df906d83257b\\files\\72605d33-153f-404c-ad51-2a53591bfa27.js",
"created_at": "2026-07-14T14:25:14.304Z"
}
}

{
"success": true,
"message": "File uploaded successfully",
"data": {
"id": "ad9f3913-41ed-4639-b428-989345ed3d51",
"project_id": "80800ba8-964b-43d9-b395-df906d83257b",
"original_name": "package.json",
"stored_name": "3c0e9e34-56f6-46cf-8c67-b12ad416da08.json",
"mime_type": "application/json",
"file_size": "170",
"storage_path": "storage\\projects\\80800ba8-964b-43d9-b395-df906d83257b\\files\\3c0e9e34-56f6-46cf-8c67-b12ad416da08.json",
"created_at": "2026-07-14T14:26:17.099Z"
}
}

## Application Config.

# PUT api/projects/projectId:/application
