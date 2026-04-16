# IndieStream - Architecture Overview

This document captures the **target architecture and working assumptions** for IndieStream at an early stage of development. It is intentionally lightweight: the goal is to keep the direction clear without overcommitting to implementation details that may still evolve.


## 1. Project Overview
IndieStream is a streaming platform tailored for independent artists. The system is designed as a Modular Monolith (Spring Modulith pattern) to balance deployment simplicity with strict domain boundaries.

## 2. Current State

At this stage, the backend foundation is still small. The primary implemented concern is **authentication and token issuance**. The rest of the architecture described here should be read as the intended direction for the next development steps, not as a completed implementation.

## 3. Target Tech Stack

* **Backend:** Java 21, Spring Boot 3.5.13, Spring Security (JWT-based)
* **Data Layer:** PostgreSQL (Relational Data), Flyway (Migrations), pgvector for vector search
* **Storage & Caching:** MinIO (S3-compatible) for binary media storage, Redis for caching and token revocation support
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Zustand

## 4. Infrastructure & Security Protocols
* **JWT-based authentication:** The backend uses JWTs for authentication. To support logout and token invalidation without introducing traditional server sessions, revoked active tokens are tracked in Redis with a TTL aligned to the token’s remaining lifetime.
* **Database-first schema management:** Hibernate DDL generation is disabled. Schema changes are managed explicitly through Flyway migration scripts.
* **DTO boundary at the API layer:** Controllers exchange Java records and other DTOs with the client. Internal domain objects remain within the backend boundary.

## 5. Media Domain
* **Audio storage:** Audio files are stored in MinIO. PostgreSQL stores metadata and storage references rather than the binary payload itself.
* **Streaming and seeking:** The backend is expected to support efficient audio playback and seeking through HTTP range-based responses, using Spring’s streaming facilities where appropriate.
* **Flexible stems model:** Tracks are not limited to a fixed vocal/instrumental split. A track may contain multiple stems such as drums, bass, synths, and other arbitrary components.
* **Stem metadata strategy:** Stem metadata is expected to live in PostgreSQL using `JSONB`, so the model can stay flexible while the core track structure remains relational and consistent.

## 6. AI & Recommendation Engine
* **Vector embeddings:** User preferences and track characteristics will be represented as high-dimensional vectors, with the exact embedding shape aligned to the selected model.
* **Similarity search:** PostgreSQL with `pgvector` will be used for similarity search, including cosine-distance-based ranking.
* **Event buffering:** High-frequency user interactions such as likes, skips, and listen time are expected to be buffered in Redis and processed in batches.
* **Preference aggregation:** The recommendation profile for a user may be maintained through an incremental weighted centroid or similar aggregation strategy to reduce unnecessary write pressure and keep updates efficient.

## 7. Architectural Governance & Cross-Module Communication
To prevent architectural erosion and maintain the Modular Monolith structure as the project grows, we enforce strict domain boundaries through code:

* **Automated Verification:** Direct access to internal components of other modules is strictly prohibited. The CI pipeline will automatically reject any pull request that violates these architectural boundaries.
* **Event-Driven Communication:** Modules do not communicate via direct service/bean calls. Instead, we use Spring's `@EventListener` and `@Async` to publish and consume Domain Events. For example, the Media module publishes a `TrackUploadedEvent`, which the Recommendation module listens to independently.
* **Living Documentation:** C4 architectural diagrams (PlantUML) are automatically generated from the source code during the test phase, to ensure our architecture documentation always reflects the actual implementation.

*(Note: This document is meant to describe the current architectural direction, not a frozen specification. Specific implementation details around media delivery, caching, recommendation logic, and API design will be refined as the project matures.)*