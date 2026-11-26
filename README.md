\# CartForge – DevOps Learning Platform



CartForge is a DevOps learning platform designed to help learners understand and practice DevOps tools and workflows through a unified interface.



\## Project Overview



The platform brings together source-code analysis, CI/CD pipeline generation, containerization, orchestration, and Infrastructure as Code learning modules.



\## Features



\- \*\*GitHub Integration:\*\* Connect and analyze GitHub repositories.

\- \*\*AI Pipeline Generator:\*\* Generate Jenkins pipeline scripts based on repository analysis.

\- \*\*Jenkins Integration:\*\* Create and manage Jenkins pipeline jobs and trigger builds.

\- \*\*Docker:\*\* Learn and work with Docker-related configurations.

\- \*\*Kubernetes:\*\* Generate and work with Kubernetes YAML configurations.

\- \*\*Terraform:\*\* Work with Terraform configuration and validation workflows.

\- \*\*Ansible:\*\* Generate Ansible configuration files.

\- \*\*AWS Simulation:\*\* Demonstrate AWS learning workflows in simulation mode. Real AWS resource provisioning is disabled.



\## Technology Stack



\- Frontend: React, TypeScript, Vite

\- Backend: Node.js, Express

\- CI/CD: Jenkins

\- Source Control: Git, GitHub

\- AI: Ollama

\- Containers: Docker

\- Orchestration: Kubernetes, Minikube

\- Infrastructure as Code: Terraform, Ansible

\- Cloud Learning: AWS simulation mode



\## Project Architecture



The frontend communicates with the Node.js backend through API endpoints. The backend integrates with configured tools and services such as Jenkins, GitHub, and Ollama.



\## Running Locally



Install the project dependencies:



```bash

npm install

```



Configure the required environment variables in local `.env` files. Never commit credentials or API tokens.



Start the backend using the project's configured startup command.



Start the frontend using:



```bash

npm run dev

```



Check the project's `package.json` scripts and backend configuration for the exact startup commands and required settings.



\## Security Notes



\- Environment files and credentials must remain private.

\- AWS functionality is intended for simulation only.

\- Real AWS resource provisioning is disabled.

\- Do not publish Jenkins tokens, GitHub tokens, passwords, or private keys.



\## Project Purpose



CartForge was developed as an academic DevOps project to demonstrate how multiple DevOps tools can be integrated into a single learning platform.

