'use strict';

/*
 * CartForge Repository-Aware Jenkins Pipeline Generator
 *
 * Generates Windows-compatible Jenkins Declarative Pipelines.
 *
 * Design goals:
 * - Explicit Git checkout for inline CpsFlowDefinition jobs
 * - Never blindly assume a kubernetes/ directory
 * - Detect Kubernetes manifests from repository analysis
 * - Prefer local Kubernetes manifests over AWS/EKS manifests
 * - Docker image tag is tied to BUILD_NUMBER
 * - Docker Compose validation is non-fatal
 * - npm projects use npm run build instead of raw global commands
 * - Safe for arbitrary GitHub repositories as far as analysis allows
 */

function quoteGroovy(value) {
    return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
}

function normalizePath(value) {
    return String(value || '')
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .trim();
}

function getRepositoryUrl(analysis) {
    const url = String(
        analysis?.repository?.cloneUrl ||
        analysis?.repository?.url ||
        analysis?.repoUrl ||
        ''
    ).trim();

    if (!url) {
        return '';
    }

    return url.replace(/\.git$/i, '');
}

function getBranch(analysis) {
    return String(
        analysis?.repository?.selectedBranch ||
        analysis?.repository?.defaultBranch ||
        analysis?.branch ||
        'main'
    ).trim() || 'main';
}

function getRepositoryName(analysis) {
    const repositoryUrl = getRepositoryUrl(analysis);

    if (!repositoryUrl) {
        return 'cartforge-app';
    }

    const cleanUrl = repositoryUrl
        .trim()
        .replace(/\/+$/, '');

    const lastPart =
        cleanUrl.split('/').pop() ||
        'cartforge-app';

    return lastPart
        .replace(/\.git$/i, '')
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .toLowerCase() || 'cartforge-app';
}

/*
 * Convert different analyzer file structures into
 * a simple array of file paths.
 */
function collectFilePaths(value, result = [], seen = new Set()) {
    if (value === null || value === undefined) {
        return result;
    }

    if (typeof value === 'string') {
        const normalized = normalizePath(value);

        if (
            normalized.includes('/') ||
            /\.(ya?ml|json|toml|xml|tf|md|txt|js|ts|tsx|jsx|py|java|go|sh|bash)$/i.test(normalized) ||
            normalized.toLowerCase() === 'dockerfile'
        ) {
            result.push(normalized);
        }

        return result;
    }

    if (typeof value !== 'object') {
        return result;
    }

    if (seen.has(value)) {
        return result;
    }

    seen.add(value);

    if (Array.isArray(value)) {
        for (const item of value) {
            collectFilePaths(item, result, seen);
        }

        return result;
    }

    for (const [key, item] of Object.entries(value)) {
        const lowerKey = key.toLowerCase();

        if (
            lowerKey === 'path' ||
            lowerKey === 'filepath' ||
            lowerKey === 'file' ||
            lowerKey === 'filename' ||
            lowerKey === 'name'
        ) {
            if (typeof item === 'string') {
                collectFilePaths(item, result, seen);
            }
        }

        collectFilePaths(item, result, seen);
    }

    return result;
}

/*
 * Collect all possible repository file information.
 */
function getAnalysisFiles(analysis) {
    const candidates = [];

    const possibleSources = [
        analysis?.files,
        analysis?.fileList,
        analysis?.importantFiles,
        analysis?.detectedFiles,

        analysis?.repository?.files,
        analysis?.repository?.fileList,
        analysis?.repository?.importantFiles,

        analysis?.kubernetesFiles,
        analysis?.kubernetesManifests,

        analysis?.dockerFiles,
        analysis?.composeFiles
    ];

    for (const source of possibleSources) {
        collectFilePaths(source, candidates);
    }

    return [
        ...new Set(
            candidates
                .map(normalizePath)
                .filter(Boolean)
        )
    ];
}

/*
 * Determine whether a file exists.
 */
function hasFile(files, fileName) {
    const wanted = fileName.toLowerCase();

    return files.some(
        file => file.toLowerCase() === wanted
    );
}

/*
 * Determine whether package-lock exists.
 */
function hasNpmLockFile(analysis) {
    const files = getAnalysisFiles(analysis);

    return (
        hasFile(files, 'package-lock.json') ||
        hasFile(files, 'npm-shrinkwrap.json')
    );
}

/*
 * Kubernetes manifest detection.
 *
 * Priority:
 * 1. kubernetes/
 * 2. k8s/
 * 3. manifests/
 * 4. root deployment/service/etc.
 * 5. other likely Kubernetes YAML
 * 6. eks/ as final fallback
 */
function getKubernetesManifestTargets(analysis) {
    const files = getAnalysisFiles(analysis);

    const normalized = files.map(normalizePath);

    const directories = [
        'kubernetes',
        'k8s',
        'manifests'
    ];

    for (const directory of directories) {
        const hasDirectory = normalized.some(file => {
            return (
                file === directory ||
                file.startsWith(directory + '/')
            );
        });

        if (hasDirectory) {
            return {
                mode: 'directory',
                target: directory
            };
        }
    }

    const rootManifestNames = [
        'deployment.yaml',
        'deployment.yml',
        'service.yaml',
        'service.yml',
        'ingress.yaml',
        'ingress.yml',
        'configmap.yaml',
        'configmap.yml',
        'namespace.yaml',
        'namespace.yml',
        'statefulset.yaml',
        'statefulset.yml',
        'daemonset.yaml',
        'daemonset.yml',
        'job.yaml',
        'job.yml'
    ];

    const rootManifests = normalized.filter(file => {
        return (
            !file.includes('/') &&
            rootManifestNames.includes(file.toLowerCase())
        );
    });

    if (rootManifests.length > 0) {
        return {
            mode: 'files',
            target: rootManifests
        };
    }

    /*
     * Detect likely Kubernetes YAML anywhere else.
     */
    const likelyKubernetesFiles = normalized.filter(file => {
        const lower = file.toLowerCase();

        if (!/\.(yaml|yml)$/i.test(lower)) {
            return false;
        }

        return (
            lower.includes('deployment') ||
            lower.includes('service') ||
            lower.includes('ingress') ||
            lower.includes('statefulset') ||
            lower.includes('daemonset') ||
            lower.includes('configmap')
        );
    });

    if (likelyKubernetesFiles.length > 0) {
        return {
            mode: 'files',
            target: likelyKubernetesFiles
        };
    }

    /*
     * EKS is deliberately last.
     */
    const eksFiles = normalized.filter(file => {
        return (
            file.toLowerCase().startsWith('eks/') &&
            /\.(yaml|yml)$/i.test(file)
        );
    });

    if (eksFiles.length > 0) {
        return {
            mode: 'files',
            target: eksFiles
        };
    }

    return null;
}

/*
 * Python stages.
 */
function generatePythonStages(analysis) {
    const stages = [];

    stages.push(`
        stage('Python Environment') {
            steps {
                bat 'python --version'
                bat 'pip --version'
            }
        }`);

    const files = getAnalysisFiles(analysis);

    if (hasFile(files, 'requirements.txt')) {
        stages.push(`
        stage('Install Python Dependencies') {
            steps {
                bat 'python -m pip install --upgrade pip'
                bat 'pip install -r requirements.txt'
            }
        }`);
    }

    if (analysis.hasTests) {
        stages.push(`
        stage('Python Test') {
            steps {
                bat 'python -m pytest'
            }
        }`);
    }

    return stages;
}

/*
 * Node.js stages.
 */
function generateNodeStages(analysis) {
    const stages = [];

    stages.push(`
        stage('Node.js Environment') {
            steps {
                bat 'node --version'
                bat 'npm --version'
            }
        }`);

    /*
     * npm ci requires package-lock.json.
     * Otherwise npm install is safer for arbitrary repositories.
     */
    const installCommand = hasNpmLockFile(analysis)
        ? 'npm ci'
        : 'npm install';

    stages.push(`
        stage('Install Dependencies') {
            steps {
                bat '${installCommand}'
            }
        }`);

    /*
     * Prefer npm scripts for npm repositories.
     */
    if (analysis.testCommand) {
        const testCommand =
            Array.isArray(analysis.packageManagers) &&
                analysis.packageManagers.includes('npm')
                ? 'npm test'
                : analysis.testCommand;

        stages.push(`
        stage('Test') {
            steps {
                bat '${quoteGroovy(testCommand)}'
            }
        }`);
    }

    if (analysis.buildCommand) {
        const buildCommand =
            Array.isArray(analysis.packageManagers) &&
                analysis.packageManagers.includes('npm')
                ? 'npm run build'
                : analysis.buildCommand;

        stages.push(`
        stage('Build Application') {
            steps {
                bat '${quoteGroovy(buildCommand)}'
            }
        }`);
    }

    return stages;
}

/*
 * Java stages.
 */
function generateJavaStages(analysis) {
    const stages = [];
    const managers = analysis.packageManagers || [];

    if (managers.includes('Maven')) {
        stages.push(`
        stage('Java Build and Test') {
            steps {
                bat 'mvn test'
                bat 'mvn package -DskipTests'
            }
        }`);
    } else if (managers.includes('Gradle')) {
        stages.push(`
        stage('Java Build and Test') {
            steps {
                bat 'gradlew test'
                bat 'gradlew build -x test'
            }
        }`);
    } else {
        stages.push(`
        stage('Java Environment') {
            steps {
                bat 'java -version'
            }
        }`);
    }

    return stages;
}

/*
 * Go stages.
 */
function generateGoStages() {
    return [`
        stage('Go Build and Test') {
            steps {
                bat 'go version'
                bat 'go test ./...'
                bat 'go build ./...'
            }
        }`];
}

/*
 * Terraform.
 *
 * CartForge remains safe:
 * validate + plan only.
 * No apply.
 * No destroy.
 */
function generateTerraformStages() {
    return [`
        stage('Terraform Validate') {
            steps {
                bat 'terraform version'
                bat 'terraform init -backend=false'
                bat 'terraform validate'
            }
        }

        stage('Terraform Plan') {
            steps {
                bat 'terraform plan -input=false'
            }
        }`];
}

/*
 * Ansible.
 */
function generateAnsibleStages() {
    return [`
        stage('Ansible Validation') {
            steps {
                bat 'ansible --version'
                bat 'ansible-playbook --syntax-check *.yml'
            }
        }`];
}

/*
 * Docker.
 */
function generateDockerStage(analysis, repositoryName) {
    if (!analysis.hasDockerfile) {
        return '';
    }

    return `
        stage('Docker Build') {
            steps {
                bat 'docker version'
                bat 'docker build -t ${quoteGroovy(repositoryName)}:%BUILD_NUMBER% .'
            }
        }`;
}

/*
 * Docker Compose.
 *
 * Non-fatal when Docker Compose is unavailable.
 */
function generateComposeStage(analysis) {
    if (!analysis.hasDockerCompose) {
        return '';
    }

    return `
        stage('Docker Compose Validation') {
            steps {
                bat 'docker compose version || echo Docker Compose is not available to Jenkins - validation skipped'
            }
        }`;
}

/*
 * Kubernetes.
 */
function generateKubernetesStages(analysis) {
    if (!analysis.hasKubernetes) {
        return [];
    }

    const manifestInfo =
        getKubernetesManifestTargets(analysis);

    if (!manifestInfo) {
        return [`
        stage('Kubernetes Detection') {
            steps {
                bat 'kubectl version --client'
                echo 'Kubernetes was detected, but no Kubernetes manifest path was identified.'
            }
        }`];
    }

    let applyCommand = '';

    if (manifestInfo.mode === 'directory') {
        applyCommand =
            `kubectl apply -f "${manifestInfo.target}"`;
    }

    if (
        manifestInfo.mode === 'files' &&
        Array.isArray(manifestInfo.target)
    ) {
        const argumentsList =
            manifestInfo.target
                .map(file => `"${normalizePath(file)}"`)
                .join(' ');

        applyCommand =
            `kubectl apply -f ${argumentsList}`;
    }

    if (!applyCommand) {
        return [`
        stage('Kubernetes Detection') {
            steps {
                bat 'kubectl version --client'
                echo 'Kubernetes manifests were detected but no usable apply command was generated.'
            }
        }`];
    }

    return [`
        stage('Kubernetes Deploy') {
            steps {
                bat 'kubectl version --client'
                bat '${quoteGroovy(applyCommand)}'
            }
        }

        stage('Kubernetes Verify') {
            steps {
                bat 'kubectl get pods -o wide'
                bat 'kubectl get services'
                bat 'kubectl get deployments'
            }
        }`];
}

/*
 * Helm.
 */
function generateHelmStage(analysis) {
    if (!analysis.hasHelm) {
        return '';
    }

    const files = getAnalysisFiles(analysis);

    let chartPath = 'helm';

    const chartFile = files.find(
        file => file.toLowerCase().endsWith('/chart.yaml')
    );

    if (chartFile) {
        chartPath =
            chartFile.split('/').slice(0, -1).join('/') ||
            '.';
    }

    return `
        stage('Helm Validation') {
            steps {
                bat 'helm version'
                bat 'helm lint "${quoteGroovy(chartPath)}"'
            }
        }`;
}

/*
 * Static website validation.
 */
function generateStaticWebsiteStages(analysis) {
    const stages = [];

    if (
        analysis.isStaticWebsite ||
        analysis.hasHtmlFiles
    ) {
        stages.push(`
        stage('Static Website Validation') {
            steps {
                bat 'if not exist index.html (echo index.html not found && exit /b 1)'
                bat 'echo Static website structure validated.'
            }
        }`);
    }

    if (analysis.hasCssFiles) {
        stages.push(`
        stage('CSS Validation') {
            steps {
                powershell '''
                    $cssFiles = @(Get-ChildItem -Path . -Recurse -Filter *.css -ErrorAction SilentlyContinue)

                    if ($cssFiles.Count -eq 0) {
                        Write-Error "No CSS files found"
                    }

                    Write-Host "CSS files found: $($cssFiles.Count)"
                '''
            }
        }`);
    }

    if (analysis.hasBrowserJavaScript) {
        stages.push(`
        stage('JavaScript Validation') {
            steps {
                powershell '''
                    $jsFiles = @(Get-ChildItem -Path . -Recurse -Filter *.js -ErrorAction SilentlyContinue)

                    if ($jsFiles.Count -eq 0) {
                        Write-Error "No JavaScript files found"
                    }

                    Write-Host "JavaScript files found: $($jsFiles.Count)"
                '''
            }
        }`);
    }

    return stages;
}

/*
 * Shell / Bash.
 */
function generateShellScriptStages(analysis) {
    if (!analysis.hasShellScripts) {
        return [];
    }

    return [`
        stage('Shell Script Validation') {
            steps {
                powershell '''
                    $shellFiles = @(
                        Get-ChildItem -Path . -Recurse -Filter *.sh -ErrorAction SilentlyContinue
                        Get-ChildItem -Path . -Recurse -Filter *.bash -ErrorAction SilentlyContinue
                    )

                    if ($shellFiles.Count -eq 0) {
                        Write-Error "No shell scripts found"
                    }

                    Write-Host "Shell scripts found: $($shellFiles.Count)"

                    foreach ($file in $shellFiles) {
                        Write-Host $file.FullName
                    }
                '''
            }
        }`];
}

/*
 * Main pipeline generator.
 */
function generatePipeline(analysis) {
    if (!analysis || typeof analysis !== 'object') {
        throw new Error(
            'Repository analysis is required.'
        );
    }

    if (!analysis.repository?.url) {
        throw new Error(
            'Repository analysis is missing repository information.'
        );
    }

    const repositoryUrl =
        quoteGroovy(getRepositoryUrl(analysis));

    const branch =
        quoteGroovy(getBranch(analysis));

    const repositoryName =
        getRepositoryName(analysis);

    const stages = [];

    /*
     * Explicit checkout is required for inline
     * CpsFlowDefinition jobs.
     */
    stages.push(`
        stage('Checkout') {
            steps {
                deleteDir()
                git branch: '${branch}', url: '${repositoryUrl}'
            }
        }`);

    const languages =
        Array.isArray(analysis.languages)
            ? analysis.languages
            : [];

    /*
     * Python.
     */
    if (languages.includes('Python')) {
        stages.push(
            ...generatePythonStages(analysis)
        );
    }

    /*
     * Node.js.
     */
    if (languages.includes('JavaScript/Node.js')) {
        stages.push(
            ...generateNodeStages(analysis)
        );
    }

    /*
     * Java.
     */
    if (
        languages.includes('Java') ||
        languages.includes('Java/JVM')
    ) {
        stages.push(
            ...generateJavaStages(analysis)
        );
    }

    /*
     * Go.
     */
    if (languages.includes('Go')) {
        stages.push(
            ...generateGoStages()
        );
    }

    /*
     * Static website.
     */
    if (
        analysis.isStaticWebsite ||
        analysis.hasHtmlFiles ||
        analysis.hasCssFiles ||
        analysis.hasBrowserJavaScript
    ) {
        stages.push(
            ...generateStaticWebsiteStages(analysis)
        );
    }

    /*
     * Shell.
     */
    if (
        analysis.hasShellScripts ||
        languages.includes('Shell/Bash')
    ) {
        stages.push(
            ...generateShellScriptStages(analysis)
        );
    }

    /*
     * Terraform.
     */
    if (analysis.hasTerraform) {
        stages.push(
            ...generateTerraformStages()
        );
    }

    /*
     * Ansible.
     */
    if (analysis.hasAnsible) {
        stages.push(
            ...generateAnsibleStages()
        );
    }

    /*
     * Docker.
     */
    if (analysis.hasDockerfile) {
        stages.push(
            generateDockerStage(
                analysis,
                repositoryName
            )
        );
    }

    /*
     * Docker Compose.
     */
    if (analysis.hasDockerCompose) {
        stages.push(
            generateComposeStage(analysis)
        );
    }

    /*
     * Kubernetes.
     */
    if (analysis.hasKubernetes) {
        stages.push(
            ...generateKubernetesStages(analysis)
        );
    }

    /*
     * Helm.
     */
    if (analysis.hasHelm) {
        stages.push(
            generateHelmStage(analysis)
        );
    }

    const cleanStages =
        stages.filter(
            stage => String(stage || '').trim()
        );

    if (cleanStages.length <= 1) {
        throw new Error(
            'The repository analyzer did not detect enough information to generate a useful pipeline.'
        );
    }

    return `pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        CARTFORGE_IMAGE = '${quoteGroovy(repositoryName)}:$BUILD_NUMBER'
    }

    stages {
${cleanStages.join('\n')}
    }

    post {
        success {
            echo 'CartForge pipeline completed successfully.'
        }

        failure {
            echo 'CartForge pipeline failed.'
        }

        always {
            echo 'CartForge pipeline execution finished.'
        }
    }
}`;
}

module.exports = {
    generatePipeline
};