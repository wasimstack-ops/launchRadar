# Listings CRUS Documentation

## Purpose
This document explains how Listings currently work in LaunchRadar for public users and admins.

## Data Model
Collection: `listings`

Fields:
- `title` (String, required, trimmed)
- `description` (String, required)
- `category` (String, required, indexed)
- `link` (String, required)
- `tags` (String[], optional, default `[]`)
- `createdAt`, `updatedAt` (timestamps)

## Access Model
- Public routes: read-only
- Admin routes: create, update, delete (protected by `x-admin-key`)

## Base URL
- Local: `http://localhost:5000`

## Public Endpoints
### 1) Get all listings
- Method: `GET`
- Route: `/api/listings`
- Auth: none
- Success response: `200`

Example response shape:
- `{ success: true, data: [ ...listings ] }`

### 2) Get listing by id
- Method: `GET`
- Route: `/api/listings/:id`
- Auth: none
- Success response: `200`

Example response shape:
- `{ success: true, data: { ...listing } }`

## Admin Endpoints
All admin endpoints require header:
- `x-admin-key: <ADMIN_KEY>`

### 1) Create listing
- Method: `POST`
- Route: `/api/admin/listings`
- Success response: `201`

Request body:
- `title` (required)
- `description` (required)
- `category` (required)
- `link` (required)
- `tags` (optional string array)

Example success response:
- `{ success: true, data: { ...createdListing } }`

### 2) Update listing
- Method: `PUT`
- Route: `/api/admin/listings/:id`
- Success response: `200`

Example success response:
- `{ success: true, data: { ...updatedListing } }`

### 3) Delete listing
- Method: `DELETE`
- Route: `/api/admin/listings/:id`
- Success response: `204` (no body)

## Error Behavior
- Invalid/missing admin key: `403` with `{ message: "Forbidden" }`
- Validation failure: `400` with details per field
- Invalid Mongo ObjectId format: `400`
- Listing not found: `404`
- Unexpected server error: `500`

## CRUS Coverage Status
- Create: implemented (admin)
- Read all: implemented (public)
- Read by id: implemented (public)
- Update: implemented (admin)
- Delete: implemented (admin)
