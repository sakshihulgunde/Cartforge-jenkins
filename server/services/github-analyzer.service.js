'use strict';

/*
 * CartForge GitHub Repository Analyzer
 *
 * This service ONLY analyzes a repository.
 * It does NOT create Jenkins jobs.
 * It does NOT trigger builds.
 * It does NOT deploy anything.
 */

function parseGitHubUrl(repositoryUrl) {
  const value = String(repositoryUrl || '').trim();

  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid GitHub repository URL.');
  }

  if (url.hostname.toLowerCase() !== 'github.com') {
    throw new Error('Only github.com repository URLs are supported.');
  }

  const parts = url.pathname
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);

  if (parts.length < 2) {
    throw new Error('GitHub URL must contain owner and repository name.');
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, '');

  if (!owner || !repo) {
    throw new Error('Unable to determine GitHub owner or repository name.');
  }

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
  };
}

async function githubRequest(url) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'CartForge-Repository-Analyzer',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, {
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.message ||
      `GitHub API request failed with HTTP ${response.status}`;

    throw new Error(message);
  }

  return data;
}

function normalizePath(filePath) {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
}

function hasFile(files, name) {
  const target = String(name).toLowerCase();

  return files.some(
    (file) => normalizePath(file.path).toLowerCase() === target
  );
}

function hasFileAnywhere(files, name) {
  const target = String(name).toLowerCase();

  return files.some(
    (file) =>
      normalizePath(file.path)
        .split('/')
        .pop()
        .toLowerCase() === target
  );
}

function hasDirectory(files, directory) {
  const target =
    `${String(directory).replace(/\/+$/, '').toLowerCase()}/`;

  return files.some((file) =>
    normalizePath(file.path).toLowerCase().startsWith(target)
  );
}

function findFile(files, names) {
  const targets = names.map((name) => String(name).toLowerCase());

  return files.find((file) =>
    targets.includes(normalizePath(file.path).toLowerCase())
  );
}

/*
 * Kubernetes manifest detection.
 *
 * Supports:
 *
 * deployment.yaml
 * service.yaml
 * ingress.yaml
 * configmap.yaml
 * statefulset.yaml
 * daemonset.yaml
 * job.yaml
 * cronjob.yaml
 * namespace.yaml
 * persistentvolume.yaml
 * persistentvolumeclaim.yaml
 * role.yaml
 * rolebinding.yaml
 * serviceaccount.yaml
 * horizontalpodautoscaler.yaml
 */
function isKubernetesManifest(filePath) {
  const path = normalizePath(filePath).toLowerCase();

  if (!/\.(yaml|yml)$/i.test(path)) {
    return false;
  }

  return /(^|\/)(deployment|service|ingress|configmap|secret|statefulset|daemonset|job|cronjob|namespace|persistentvolume|persistentvolumeclaim|role|rolebinding|serviceaccount|horizontalpodautoscaler)\.ya?ml$/i.test(
    path
  );
}

function getKubernetesManifestFiles(files) {
  const preferred = [];
  const eks = [];

  for (const file of files) {
    const path = normalizePath(file.path);

    if (!isKubernetesManifest(path)) {
      continue;
    }

    const lowerPath = path.toLowerCase();

    /*
     * EKS manifests are deliberately separated.
     *
     * CartForge should not automatically deploy EKS manifests
     * because the platform is intended for safe/local practice.
     */
    if (
      lowerPath === 'eks' ||
      lowerPath.startsWith('eks/')
    ) {
      eks.push(path);
      continue;
    }

    preferred.push(path);
  }

  return {
    preferred: [...new Set(preferred)],
    eks: [...new Set(eks)],
  };
}

function detectLanguages(files) {
  const languages = [];

  if (
    hasFile(files, 'package.json') ||
    hasFile(files, 'package-lock.json') ||
    hasFile(files, 'yarn.lock') ||
    hasFile(files, 'pnpm-lock.yaml')
  ) {
    languages.push('JavaScript/Node.js');
  }

  if (
    hasFile(files, 'requirements.txt') ||
    hasFile(files, 'pyproject.toml') ||
    hasFile(files, 'Pipfile') ||
    hasFile(files, 'setup.py')
  ) {
    languages.push('Python');
  }

  if (
    hasFile(files, 'pom.xml') ||
    hasFile(files, 'mvnw') ||
    hasFile(files, 'mvnw.cmd')
  ) {
    languages.push('Java');
  }

  if (
    hasFile(files, 'build.gradle') ||
    hasFile(files, 'build.gradle.kts') ||
    hasFile(files, 'gradlew')
  ) {
    if (!languages.includes('Java')) {
      languages.push('Java/JVM');
    }
  }

  if (
    files.some((file) =>
      /\.(go|mod)$/i.test(normalizePath(file.path))
    )
  ) {
    languages.push('Go');
  }

  if (
    files.some((file) =>
      /\.(csproj|sln)$/i.test(normalizePath(file.path))
    )
  ) {
    languages.push('.NET');
  }

  if (
    hasDirectory(files, 'terraform') ||
    files.some((file) =>
      /\.tf$/i.test(normalizePath(file.path))
    )
  ) {
    languages.push('Terraform');
  }

  if (
    hasFile(files, 'ansible.cfg') ||
    hasDirectory(files, 'ansible') ||
    files.some((file) => {
      const path = normalizePath(file.path);

      return (
        /\.(yml|yaml)$/i.test(path) &&
        /playbook|ansible/i.test(path)
      );
    })
  ) {
    languages.push('Ansible');
  }

  const hasHtml = files.some((file) =>
    /\.html?$/i.test(normalizePath(file.path))
  );

  const hasCss = files.some((file) =>
    /\.css$/i.test(normalizePath(file.path))
  );

  const hasBrowserJs = files.some((file) =>
    /\.(js|jsx)$/i.test(normalizePath(file.path))
  );

  if (hasHtml) {
    languages.push('HTML');
  }

  if (hasCss) {
    languages.push('CSS');
  }

  if (
    hasBrowserJs &&
    !languages.includes('JavaScript/Node.js')
  ) {
    languages.push('JavaScript');
  }

  if (
    files.some((file) =>
      /\.(sh|bash)$/i.test(normalizePath(file.path))
    )
  ) {
    languages.push('Shell/Bash');
  }

  return [...new Set(languages)];
}

function detectPackageManagers(files) {
  const managers = [];

  if (hasFile(files, 'package-lock.json')) {
    managers.push('npm');
  }

  if (hasFile(files, 'yarn.lock')) {
    managers.push('Yarn');
  }

  if (hasFile(files, 'pnpm-lock.yaml')) {
    managers.push('pnpm');
  }

  if (
    hasFile(files, 'requirements.txt') ||
    hasFile(files, 'pyproject.toml')
  ) {
    managers.push('pip');
  }

  if (hasFile(files, 'pom.xml')) {
    managers.push('Maven');
  }

  if (
    hasFile(files, 'build.gradle') ||
    hasFile(files, 'build.gradle.kts')
  ) {
    managers.push('Gradle');
  }

  if (
    files.some((file) =>
      /\.tf$/i.test(normalizePath(file.path))
    )
  ) {
    managers.push('Terraform');
  }

  return [...new Set(managers)];
}

function detectFrameworks(files) {
  const frameworks = [];

  const allPaths = files
    .map((file) => normalizePath(file.path).toLowerCase())
    .join('\n');

  if (allPaths.includes('next.config.')) {
    frameworks.push('Next.js');
  }

  if (allPaths.includes('vite.config.')) {
    frameworks.push('Vite');
  }

  if (allPaths.includes('angular.json')) {
    frameworks.push('Angular');
  }

  if (allPaths.includes('nuxt.config.')) {
    frameworks.push('Nuxt');
  }

  if (
    hasFile(files, 'requirements.txt') ||
    hasFile(files, 'pyproject.toml')
  ) {
    if (allPaths.includes('manage.py')) {
      frameworks.push('Django');
    }

    if (
      allPaths.includes('flask') ||
      allPaths.includes('app.py')
    ) {
      frameworks.push('Flask');
    }

    if (
      allPaths.includes('fastapi') ||
      allPaths.includes('main.py')
    ) {
      frameworks.push('FastAPI');
    }
  }

  if (
    hasFile(files, 'pom.xml') ||
    hasFile(files, 'build.gradle') ||
    hasFile(files, 'build.gradle.kts')
  ) {
    if (allPaths.includes('spring')) {
      frameworks.push('Spring');
    }
  }

  const hasIndexHtml = hasFile(files, 'index.html');

  const hasHtml = files.some((file) =>
    /\.html?$/i.test(normalizePath(file.path))
  );

  if (hasIndexHtml || hasHtml) {
    frameworks.push('Static Web');
  }

  return [...new Set(frameworks)];
}

async function readRawFile(owner, repo, branch, path) {
  const encodedPath = path
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  const url =
    `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/` +
    `${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`;

  const headers = {
    'User-Agent': 'CartForge-Repository-Analyzer',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, {
    headers,
  });

  if (!response.ok) {
    return null;
  }

  return response.text();
}

function extractNodeScripts(packageJsonText) {
  if (!packageJsonText) {
    return {
      buildCommand: null,
      testCommand: null,
      startCommand: null,
    };
  }

  try {
    const packageJson = JSON.parse(packageJsonText);
    const scripts = packageJson.scripts || {};

    return {
      buildCommand: scripts.build || null,
      testCommand: scripts.test || null,
      startCommand: scripts.start || null,
    };
  } catch {
    return {
      buildCommand: null,
      testCommand: null,
      startCommand: null,
    };
  }
}

function determineRecommendedStages(analysis) {
  const stages = ['Checkout'];

  if (analysis.languages.includes('JavaScript/Node.js')) {
    stages.push('Node.js Environment');
    stages.push('Install Dependencies');

    if (analysis.testCommand) {
      stages.push('Test');
    }

    if (analysis.buildCommand) {
      stages.push('Build Application');
    }
  }

  if (
    analysis.languages.includes('JavaScript') &&
    !analysis.languages.includes('JavaScript/Node.js')
  ) {
    stages.push('JavaScript Validation');
  }

  if (
    analysis.frameworks.includes('Static Web') ||
    analysis.languages.includes('HTML')
  ) {
    stages.push('Static Website Validation');
  }

  if (analysis.languages.includes('CSS')) {
    stages.push('CSS Validation');
  }

  if (analysis.languages.includes('Python')) {
    stages.push('Python Environment');
    stages.push('Install Dependencies');

    if (analysis.hasTests) {
      stages.push('Test');
    }
  }

  if (
    analysis.languages.includes('Java') ||
    analysis.languages.includes('Java/JVM')
  ) {
    stages.push('Java Environment');
    stages.push('Build and Test');
  }

  if (analysis.languages.includes('Go')) {
    stages.push('Go Environment');
    stages.push('Build and Test');
  }

  if (analysis.languages.includes('Shell/Bash')) {
    stages.push('Shell Script Validation');
  }

  if (analysis.hasTerraform) {
    stages.push('Terraform Validate');
    stages.push('Terraform Plan');
  }

  if (analysis.hasAnsible) {
    stages.push('Ansible Validation');
  }

  if (analysis.hasDockerfile) {
    stages.push('Docker Build');
  }

  if (analysis.hasDockerCompose) {
    stages.push('Docker Compose Validation');
  }

  if (analysis.hasKubernetes) {
    stages.push('Kubernetes Deploy');
    stages.push('Kubernetes Verify');
  }

  if (analysis.hasHelm) {
    stages.push('Helm Validation');
  }

  return [...new Set(stages)];
}

async function analyzeRepository(repositoryUrl, requestedBranch = '') {
  const parsed = parseGitHubUrl(repositoryUrl);

  const repositoryApi =
    `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/` +
    encodeURIComponent(parsed.repo);

  const repository = await githubRequest(repositoryApi);

  const branch =
    String(requestedBranch || '').trim() ||
    repository.default_branch ||
    'main';

  const treeApi =
    `${repositoryApi}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

  const treeResponse = await githubRequest(treeApi);

  if (treeResponse.truncated) {
    throw new Error(
      'GitHub returned a truncated repository tree. This repository is too large for the current analyzer.'
    );
  }

  const files = (treeResponse.tree || [])
    .filter((item) => item.type === 'blob')
    .map((item) => ({
      path: normalizePath(item.path),
      size: item.size || 0,
    }));

  const packageJsonFile = findFile(files, ['package.json']);

  const packageJsonText = packageJsonFile
    ? await readRawFile(
      parsed.owner,
      parsed.repo,
      branch,
      packageJsonFile.path
    )
    : null;

  const nodeScripts = extractNodeScripts(packageJsonText);

  const hasTests =
    files.some((file) => {
      const path = normalizePath(file.path).toLowerCase();

      return (
        path.includes('/test/') ||
        path.includes('/tests/') ||
        path.includes('/__tests__/') ||
        /\.(test|spec)\.(js|jsx|ts|tsx|py)$/i.test(path)
      );
    }) ||
    Boolean(nodeScripts.testCommand);

  const hasIndexHtml = hasFile(files, 'index.html');

  const hasHtmlFiles = files.some((file) =>
    /\.html?$/i.test(normalizePath(file.path))
  );

  const hasCssFiles = files.some((file) =>
    /\.css$/i.test(normalizePath(file.path))
  );

  const hasBrowserJavaScript = files.some((file) =>
    /\.(js|jsx)$/i.test(normalizePath(file.path))
  );

  const hasShellScripts = files.some((file) =>
    /\.(sh|bash)$/i.test(normalizePath(file.path))
  );

  const isStaticWebsite =
    hasIndexHtml ||
    (hasHtmlFiles && (hasCssFiles || hasBrowserJavaScript));

  const kubernetesManifestFiles =
    getKubernetesManifestFiles(files);

  const hasKubernetes =
    kubernetesManifestFiles.preferred.length > 0 ||
    kubernetesManifestFiles.eks.length > 0 ||
    hasDirectory(files, 'kubernetes') ||
    hasDirectory(files, 'k8s');

  const analysis = {
    repository: {
      owner: parsed.owner,
      name: parsed.repo,
      fullName: parsed.fullName,
      url: `https://github.com/${parsed.owner}/${parsed.repo}`,
      cloneUrl: repository.clone_url,
      private: Boolean(repository.private),
      description: repository.description || '',
      defaultBranch: repository.default_branch || 'main',
      selectedBranch: branch,
    },

    summary: {
      totalFiles: files.length,
      repositorySizeKb: repository.size || 0,
      truncated: Boolean(treeResponse.truncated),
    },

    languages: detectLanguages(files),

    packageManagers: detectPackageManagers(files),

    frameworks: detectFrameworks(files),

    buildCommand: nodeScripts.buildCommand,

    testCommand: nodeScripts.testCommand,

    startCommand: nodeScripts.startCommand,

    hasTests,

    isStaticWebsite,

    hasHtmlFiles,

    hasCssFiles,

    hasBrowserJavaScript,

    hasShellScripts,

    hasDockerfile:
      hasFile(files, 'Dockerfile') ||
      hasFileAnywhere(files, 'Dockerfile'),

    hasDockerCompose:
      hasFile(files, 'docker-compose.yml') ||
      hasFile(files, 'docker-compose.yaml') ||
      hasFile(files, 'compose.yml') ||
      hasFile(files, 'compose.yaml'),

    hasKubernetes,

    /*
     * Preferred local Kubernetes manifests.
     *
     * These are the manifests CartForge should use for
     * local Kubernetes / Minikube practice.
     */
    kubernetesFiles: kubernetesManifestFiles.preferred,

    /*
     * EKS manifests are reported separately and are NOT
     * selected automatically for deployment.
     */
    kubernetesEksFiles: kubernetesManifestFiles.eks,

    hasHelm:
      hasDirectory(files, 'helm') ||
      files.some((file) =>
        /(^|\/)Chart\.yaml$/i.test(normalizePath(file.path))
      ),

    hasTerraform:
      files.some((file) =>
        /\.tf$/i.test(normalizePath(file.path))
      ) ||
      hasDirectory(files, 'terraform'),

    hasAnsible:
      hasFile(files, 'ansible.cfg') ||
      hasDirectory(files, 'ansible'),

    hasJenkinsfile:
      hasFile(files, 'Jenkinsfile') ||
      hasFile(files, 'jenkinsfile'),

    importantFiles: files
      .filter((file) => {
        const path = normalizePath(file.path).toLowerCase();

        return (
          [
            'package.json',
            'requirements.txt',
            'pyproject.toml',
            'pom.xml',
            'build.gradle',
            'build.gradle.kts',
            'dockerfile',
            'docker-compose.yml',
            'docker-compose.yaml',
            'compose.yml',
            'compose.yaml',
            'jenkinsfile',
            'ansible.cfg',
            'index.html',
            'readme.md',
          ].includes(path) ||
          path.endsWith('.tf') ||
          path.endsWith('.sh') ||
          path.endsWith('.bash') ||
          path.endsWith('.html') ||
          path.endsWith('.css') ||
          path.endsWith('.js') ||
          isKubernetesManifest(path) ||
          path.includes('/kubernetes/') ||
          path.includes('/k8s/') ||
          path.includes('/helm/') ||
          path.includes('/scripts/')
        );
      })
      .slice(0, 100)
      .map((file) => file.path),
  };

  if (isStaticWebsite) {
    analysis.websiteType =
      'Static HTML/CSS/JavaScript website';

    analysis.deploymentRecommendation =
      'Web server such as Nginx';
  }

  if (hasShellScripts) {
    analysis.shellScripts = files
      .filter((file) =>
        /\.(sh|bash)$/i.test(normalizePath(file.path))
      )
      .map((file) => file.path)
      .slice(0, 100);
  }

  analysis.recommendedStages =
    determineRecommendedStages(analysis);

  return analysis;
}

module.exports = {
  analyzeRepository,
  parseGitHubUrl,
};