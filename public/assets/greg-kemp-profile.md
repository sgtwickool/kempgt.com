# Greg Kemp - Personal Profile

## Contact
- **Location**: Budapest, Hungary
- **Phone**: +44 7965 482 696
- **Email**: greg@kempgt.com
- **GitHub**: github.com/sgtwickool
- **LinkedIn**: linkedin.com/in/kempgt
- **Website**: kempgt.com

## Who I Am

Senior full-stack engineer who builds complete products end-to-end. Originally trained as a mechanical engineer (BEng at Cardiff, 2007-2013) and fusion energy researcher (MSc at York, 2018-2019). Self-taught programmer who pivoted into software and brings a first-principles, engineering mindset to system design.

Multilingual: English (native), Hungarian (fluent), Spanish (conversational).

Outside of work: climbing, mountaineering, caving, outdoor swimming, music (guitar, bass, piano).

## How Colleagues Describe Me

- **Versatile generalist**: picks up any stack and ships with it
- **Thoughtful architect**: designs systems that last, not just systems that work
- **Ships fast, ships well**: velocity and quality at the same time

## Current Role

**CORE (UK) Ltd → TariffTel** | June 2014 - Present

Trade compliance software helping global companies classify goods for customs and international trade. Small team (2-5 developers). Joined as a junior, now one of the most senior engineers. The lead developer has ~10 more years of experience; Greg operates just below that level with high autonomy.

**Day-to-day scope:**
- Owns architectural decisions and technical direction for major systems
- Mentors other developers
- Leads standups and steps into the tech lead role when needed
- Works in a startup-like atmosphere, shipping features at high velocity

## Career Timeline

### Junior Developer (2014 - 2017)
- Supply chain and classification software for **Primark**, **SuperDry**, **Triumph Motorcycles**, and other major brands
- First greenfield project: sustainability reports for Primark's **SCAP** fibre-origin programme

### Developer (2017 - 2022)
- **TariffTel Essentials** (~2017): B2C customs classification web app
- **Customs Connect v1** (~2019): Customs declaration software built for Primark
- **LEAF** (~2020): Sustainability reporting platform tracking fibre origins for the SCAP scheme. Adopted by Primark. Was being evaluated by SuperDry before their financial restructure. The company later dropped the product during a restructure, but Primark still uses a legacy version.
- **Customs Connect v2**: Rebuilt as a fully serverless Azure Functions application integrating classification and supply chain data to mostly automate the customs declaration process
- **TariffTel Premium** (~2023): SME B2B version of TariffTel Essentials, built single-handedly. Never reached production but laid the architectural groundwork for TariffTel 2.0

### Senior Developer / Architect (2022 - Present)
- Company rebranded from CORE (UK) Ltd to TariffTel (~3 years ago)
- **TariffTel 2.0**: Ground-up rewrite of a 10+ year legacy platform
  - Legacy system: ASP.NET WebForms, WinForms, and millions of lines of business logic buried in SQL stored procedures and functions spread across **10 separate database repositories**
  - New system: .NET 8/10 APIs, Angular 19, Clean Architecture, CQRS, SignalR for real-time messaging, Microsoft Entra ID for enterprise SSO
  - Was poorly managed for about 2 years, then the team built it essentially from scratch in under a year
- **MDMS** (Master Data Management System): Built on .NET 10 with a custom CQRS dispatcher (replacing MediatR), Dapper for performance-critical queries, Tailwind-based Angular UI
- **@tarifftel/classifier-core**: Shared NPM package enabling consistent classification logic across multiple frontends, published to Azure Artifacts

## Technical Skills

### Primary Stack
- **Backend**: C#, .NET 8/10, ASP.NET, Entity Framework Core, Dapper, SignalR
- **Frontend**: TypeScript, Angular 19 (Material, NgRx/Signals, ngx-translate), RxJS
- **Database**: SQL Server, PostgreSQL
- **Cloud**: Azure (App Services, Functions, Artifacts, Entra ID)
- **DevOps**: Docker, GitHub Actions, CI/CD pipelines

### Also Proficient In
- **Python**: FastAPI, Flask, OR-Tools
- **JavaScript/Node.js**: Express
- **React**: React 19, Leaflet, React Testing Library
- **CSS**: Tailwind, Bootstrap
- **Other**: Figma (prototyping), ANSYS/APDL (from engineering days)

### Architecture & Patterns
- Clean Architecture (applied consistently across projects)
- CQRS (with MediatR and custom dispatcher implementations)
- Modular monolith design
- Repository pattern with Unit of Work
- Event-driven design
- Serverless (Azure Functions)
- REST API design with Swagger/OpenAPI

### Quality Practices
- xUnit, Moq, FluentAssertions, AutoFixture (C#)
- Jest, Karma (JavaScript/TypeScript)
- pytest (Python)
- Structured logging (Serilog)
- FluentValidation
- Docker containerisation for all projects

## Side Projects

### CodeMop
AI-augmented code review tool. Hooks into GitHub PRs via webhooks and suggests improvements automatically.
- **Stack**: Python, FastAPI, PostgreSQL
- **Features**: GitHub webhook integration with signature validation, PR event handling, API versioning, health checks, rate limiting

### EV Route Optimizer
Full-stack EV journey planner with interactive maps.
- **Backend**: Node.js, Express, GraphHopper integration, OpenChargeMap API
- **Frontend**: React 19, Leaflet maps, Bootstrap
- **Features**: Route planning with battery considerations, charging stop suggestions

### EV Fleet Platform
Polyglot microservices for fleet optimisation.
- **Fleet API**: C#, .NET 8, Clean Architecture
- **Optimisation Engine**: Python, Flask, Google OR-Tools (vehicle routing)
- **Infrastructure**: Docker Compose orchestration

### kempgt.com
Personal portfolio website. Bootstrap 5, vanilla JS, dark mode, Formspree contact form. Hosted on GitHub Pages.

## Education

| Qualification | Institution | Dates |
|---|---|---|
| MSc Fusion Energy | University of York, UK | 2018 - 2019 |
| BEng Mechanical Engineering (Hons) | Cardiff University, UK | 2007 - 2013 |

### Notable: Fusion for Energy (ITER) Internship
Technical support intern at Fusion for Energy in Barcelona (Jun - Sep 2012). Developed dynamic simulations for reactor components using ANSYS. Experience in APDL scripting and structural analysis.

## Key Narrative Points

- **Not "one job for 12 years"**: 6+ greenfield products built from scratch, a company rebrand and pivot, clients from Primark to Triumph Motorcycles. More product builds than most developers get in an entire career.
- **Career pivot is a strength**: The engineering and physics background gives a first-principles approach to software design that pure CS graduates don't always have.
- **Polyglot, not pigeonholed**: Primary stack is .NET/Angular but also ships production-quality work in Python, Node.js, and React.
- **Product builder, not just coder**: Thinks about the whole product, from architecture to UX to deployment, not just the code.
