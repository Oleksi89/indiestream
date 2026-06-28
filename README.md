# IndieStream

## Project Overview

IndieStream is a streaming platform engineered for independent artists. It provides infrastructure for multi-track
audio (stems) playback, high-throughput telemetry data processing, and a spatial vector-based recommendation system. The
platform resolves the limitations of traditional monolithic architectures by implementing strict domain boundaries,
ensuring fault isolation and scalability for media processing.

## Architecture & Design Patterns

The system architecture prioritizes modularity, strict encapsulation, and high-performance data processing.

* **Backend (Modular Monolith):** Built on Domain-Driven Design (DDD) principles. Modules (Bounded Contexts) interact
  exclusively through explicit Public API Facades and asynchronous Domain Events. Internal components are strictly
  encapsulated using `package-private` access. Architectural constraints are enforced continuously via Spring Modulith
  ArchUnit tests.
* **Frontend (Feature-Sliced Design):** The React SPA strictly adheres to FSD methodology to guarantee unidirectional
  dependencies. State management is bifurcated: Zustand operates as a deterministic State Machine for global client
  state (audio player, queue), while TanStack Query handles server state synchronization with Optimistic UI mutations.
* **Data Flow & Aggregation: Lambda Architecture & CQRS:** Telemetry and statistics ingestion utilize Redis
  Streams for the fast path (micro-batching) and PostgreSQL for the slow path (relational aggregation and time-series
  querying).
    * **Backend-For-Frontend (BFF):** Cross-module data aggregation (e.g., merging track metadata, social graphs, and
      like statuses) is executed natively on the backend via parallel CompletableFutures to eliminate client-side N+1
      queries and network waterfalls.
* **Database Management:** Schema-first design managed by Flyway sequential migrations, prohibiting ORM auto-generation
  to maintain strict control over spatial indexes.

## Technology Stack

**Backend:**

* Java 21, Spring Boot 3.2+
* Spring Modulith, Spring Data JPA, Spring Security (Stateless JWT)
* Spring AI (OpenAI API, Google Gemini API)

**Database & Infrastructure:**

* PostgreSQL 16 (with `pgvector`)
* Redis (Session revocation, Streams for telemetry, Caching)
* MinIO (S3-compatible blob storage)
* Docker & Docker Compose (Internal DNS resolution)

**Frontend:**

* React 19, TypeScript, Vite
* Zustand, TanStack Query
* Web Audio API, hls.js
* Tailwind CSS, Radix UI

## Key Features

* **Multi-Track Audio Streaming:** Custom implementation of HTTP Live Streaming (HLS) for media delivery.
* **Interactive Stem Mixer:** Real-time volume adjustment and isolation of individual track components (vocals,
  instruments) via the Web Audio API without losing synchronization.
* **Vector Recommendation Engine:** Spatial similarity search utilizing HNSW indexes in `pgvector`.
  Recommendations adapt based on Exponential Moving Average (EMA) centroids updated by user playback telemetry and
  direct interactions with tracks.
* **Cold Start Resolution:** Interactive onboarding calibration flow to initialize user taste vectors.
* **High-Load Telemetry & Analytics:** Lambda Architecture utilizing CQRS. Micro-batched processing
  separates real-time ingestion from historical time-series analytics, ensuring mathematically accurate metrics for
  artist dashboards and system administrators.
* **AI Moderation Pipeline:** Multimodal LLM analysis (Gemini API) of uploaded media to generate semantic vectors and
  detect explicit content.
* **Track Lifecycle Management:** Content transitions and visibility governed by a strict Finite State Machine (
  FSM).
* **Social Graph & Playlists:** Creation of collaborative and private playlists, alongside management of user
  subscriptions.
* **Recommendation Tuning:** Explicit recommendation feed adjustment via negative feedback loops ("Not Interested"
  blocklists).
* **Stateless Security:** JWT-based authentication with instant Redis-backed token revocation.
* **Optimistic UI:** UI interactions optimized to apply visual mutations (likes, playlist edits) in under 50ms.
* **Human-in-the-Loop (HITL) Moderation:** Comprehensive admin tooling for resolving AI moderation conflicts and
  managing platform security (account bans, forced archiving).
* **Infrastructure Administration:** Workflows for executing infrastructure recalculations (vector embeddings, telemetry
  rollups) and platform telemetry monitoring.
* **Localization:** Integrated i18n support with Ukrainian as the primary language.

## Local Development

### Prerequisites

Before setting up the project locally, ensure your development workstation has the following components installed and
configured:

* **Java 21** (JDK / Eclipse Temurin)
* **Node.js** (v20+ LTS recommended) & **npm**
* **Docker & Docker Compose**
* **FFmpeg** (installed locally and available in the system environment variables/PATH for native audio processing
  workflows)

### Infrastructure Setup

The environment relies on PostgreSQL (with pgvector), Redis, and MinIO. These can be initialized as persistent local
infrastructure via Docker Compose, while integration tests will independently spin up ephemeral instances via
Testcontainers.

1. Clone the repository and navigate to the project root directory.
2. Generate your local environment file:
   ```bash
   cp .env.example .env
   ```
3. Edit the `.env` file to provide valid external infrastructure credentials and cloud provider keys (`OPENAI_API_KEY`,
   `GEMINI_API_KEY`).
4. Boot up the core infrastructure services in detached mode:

```bash
docker compose up -d postgres redis minio
```

### Backend Execution

The backend module leverages Gradle for dependency management and compilation. Build the application and trigger
automatic Flyway schema migrations using the commands below:

```bash
# Build the executable artifact while skipping integration test execution
./gradlew clean build -x test

# Boot the backend server using the default development profile
./gradlew bootRun
```

#### Data Seeding

To fill the local database, MinIO object buckets, and Redis streams with simulated artists, listeners, HLS track assets,
spatial taste vectors, and a 30-day window of synthetic time-series telemetry logs, launch the runtime with the `seeder`
profile active:

```bash
./gradlew bootRun --args='--spring.profiles.active=seeder'
```

### Frontend Execution

Navigate into the Single Page Application directory to initialize dependencies and boot up the Vite development server
with Hot Module Replacement (HMR):

```bash
# Navigate to the web application source root
cd frontend

# Install package dependencies declared in package.json
npm install

# Launch the local Vite development instance
npm run dev
```

The client dashboard will be available via the default local loopback interface at `http://localhost:5173`.

## Deployment & CI/CD

The platform relies on a distributed deployment model orchestrated by GitHub Actions.

* **Backend CI/CD:** Triggers on `main`/`dev` branches, executing a multi-stage Docker build that natively
  installs `ffmpeg` required for HLS media processing. Successfully built images are published to the GitHub
  Container Registry (GHCR) and deployed via SSH to a Hetzner VPS (Ubuntu 24.04) running Docker Compose.
* **Frontend Delivery:** The React application is automatically built and globally distributed via Vercel's Edge
  Network.
* **Proxy & Gateway:** An Nginx reverse proxy manages internal network routing, SSL termination, and allows large body
  payloads necessary for multi-stem audio uploads.
* **Secrets Management:** CI/CD requires GitHub Secrets for VPS SSH access (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`) and
  repository mirroring (`GITLAB_TOKEN`). Production server runtime requires an `.env` file containing
  overriding credentials for PostgreSQL, MinIO, JWT secrets, and external AI provider APIs.