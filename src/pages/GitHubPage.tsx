
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  GitBranch,
  CheckCircle2,
  Webhook,
  GitCommit,
  GitPullRequest,
  Server,
  ExternalLink,
  Activity,
  Terminal,
  LoaderCircle,
  RefreshCw,
  AlertCircle,
  Link2,
  Sparkles,
  Code2,
  FileCode2,
  ArrowRight,
  WandSparkles,
} from 'lucide-react';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

type Verification = {
  repository: {
    owner: string;
    name: string;
    fullName: string;
    url: string;
    cloneUrl: string;
    defaultBranch: string;
    private: boolean;
    description: string;
  };
  branch: {
    name: string;
    protected: boolean;
  };
  latestCommit: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
  verification: {
    repositoryAccessible: boolean;
    branchAccessible: boolean;
  };
};

type PipelineSource = 'existing' | 'ai' | 'custom';

type RepositoryAnalysis = {
  summary: { totalFiles: number; repositorySizeKb: number; truncated: boolean; };
  languages: string[]; packageManagers: string[]; frameworks: string[];
  buildCommand: string | null; testCommand: string | null; startCommand: string | null;
  hasTests: boolean; hasDockerfile: boolean; hasDockerCompose: boolean; hasKubernetes: boolean;
  hasHelm: boolean; hasTerraform: boolean; hasAnsible: boolean; hasJenkinsfile: boolean;
  importantFiles: string[]; recommendedStages: string[];
};


async function postJson(path: string, body: unknown) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.error || `Request failed with HTTP ${response.status}`
    );
  }

  return data;
}

export default function GitHubPage() {
  const [repoUrl, setRepoUrl] = useState(
    'https://github.com/sakshihulgunde/CartForge'
  );
  const [branch, setBranch] = useState('main');

  const [result, setResult] = useState<Verification | null>(null);

  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  /*
   * Pipeline Creator state.
   */
  const [pipelineSource, setPipelineSource] =
    useState<PipelineSource>('existing');

  const [customPipeline, setCustomPipeline] = useState('');

  const [pipelinePrepared, setPipelinePrepared] = useState(false);

  /*
   * AI-generated pipeline preview.
   */
  const [aiPipeline, setAiPipeline] = useState('');

  const [repositoryAnalysis, setRepositoryAnalysis] =
    useState<RepositoryAnalysis | null>(null);

  const [generatingPipeline, setGeneratingPipeline] =
    useState(false);

  const [jenkinsJobUrl, setJenkinsJobUrl] = useState('');
  const [jenkinsDashboardUrl, setJenkinsDashboardUrl] = useState('');

  async function verifyRepository() {
    setLoading(true);
    setError('');
    setNotice('');
    setResult(null);
    setPipelinePrepared(false);
    setAiPipeline('');
    setRepositoryAnalysis(null);
    setJenkinsJobUrl('');
    setJenkinsDashboardUrl('');

    try {
      const data = await postJson('/api/github/verify', {
        repoUrl: repoUrl.trim(),
        branch: branch.trim(),
      });

      setResult(data);
      setBranch(data.branch.name);

      setNotice('Repository and branch verified using the GitHub API.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to verify this repository.'
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Create/connect the selected pipeline with Jenkins.
   *
   * IMPORTANT:
   * This function creates/configures the Jenkins job only.
   * It does NOT call Build Now and does NOT trigger a build.
   */
  async function connectToJenkins(
    selectedSource: PipelineSource = pipelineSource
  ) {
    if (!result) {
      setError('Verify the repository before connecting to Jenkins.');
      return;
    }

    setConnecting(true);
    setError('');
    setNotice('');

    try {
      /*
       * 1. Verify the actual Jenkins connection.
       */
      const jenkinsResponse = await fetch(
        `${API_BASE}/api/jenkins/status`
      );

      const jenkinsData = await jenkinsResponse.json().catch(() => ({}));

      if (!jenkinsResponse.ok || !jenkinsData.connected) {
        throw new Error(
          'Jenkins is not connected. Check the Jenkins server.'
        );
      }

      /*
       * 2. Save the verified GitHub configuration.
       */
      const configResponse = await fetch(
        `${API_BASE}/api/github/config`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            repoUrl: result.repository.url,
            branch: result.branch.name,
          }),
        }
      );

      const configData = await configResponse.json().catch(() => ({}));

      if (!configResponse.ok || !configData.success) {
        throw new Error(
          configData.message ||
          configData.error ||
          'Unable to prepare GitHub configuration.'
        );
      }

      /*
       * 3. Determine the pipeline script.
       *
       * Existing:
       * Jenkins reads Jenkinsfile from GitHub.
       *
       * AI:
       * Jenkins receives the generated/edited pipeline directly.
       *
       * Custom:
       * Jenkins receives the custom pipeline directly.
       */
      let pipelineScript: string | undefined;

      if (selectedSource === 'ai') {
        pipelineScript = aiPipeline.trim();

        if (!pipelineScript) {
          throw new Error(
            'Generate the AI pipeline before creating the Jenkins job.'
          );
        }
      }

      if (selectedSource === 'custom') {
        pipelineScript = customPipeline.trim();

        if (!pipelineScript) {
          throw new Error(
            'Enter a custom Jenkins pipeline before creating the Jenkins job.'
          );
        }
      }

      /*
       * 4. Create a separate Jenkins job for this repository/pipeline type.
       *
       * Example:
       * CartForge-CartForge-existing
       * CartForge-CartForge-ai
       * CartForge-CartForge-custom
       */
      const repositoryName =
        result.repository.name
          .replace(/[^a-zA-Z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '') || 'repository';

      const jobName = `CartForge-${repositoryName}-${selectedSource}`;

      const createJobResponse = await fetch(
        `${API_BASE}/api/jenkins/create-job`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            repositoryUrl: result.repository.url,
            branch: result.branch.name,
            jobName,
            pipelineSource: selectedSource,
            ...(pipelineScript
              ? {
                pipelineScript,
              }
              : {}),
          }),
        }
      );

      const createJobData = await createJobResponse
        .json()
        .catch(() => ({}));

      if (
        !createJobResponse.ok ||
        !createJobData.success
      ) {
        throw new Error(
          createJobData.error ||
          createJobData.message ||
          'Unable to create the Jenkins Pipeline job.'
        );
      }

      /*
       * 5. Save the complete GitHub + Jenkins configuration.
       */
      const configuration = {
        ...configData.configuration,
        repository: result.repository,
        latestCommit: result.latestCommit,
        branch: result.branch.name,
        jenkinsUrl: jenkinsData.jenkins?.url,
        jenkinsConnected: true,
        verifiedAt: new Date().toISOString(),
        pipelineSource: selectedSource,
        jenkinsJob: createJobData.job,
      };

      localStorage.setItem(
        'cartforge_github_config',
        JSON.stringify(configuration)
      );

      /*
       * 6. Save generated/custom pipeline locally as well.
       */
      if (selectedSource === 'ai' && pipelineScript) {
        localStorage.setItem(
          'cartforge_generated_jenkinsfile',
          pipelineScript
        );
      }

      if (selectedSource === 'custom' && pipelineScript) {
        localStorage.setItem(
          'cartforge_custom_jenkinsfile',
          pipelineScript
        );
      }

      /*
       * 7. Display Jenkins job information.
       */
      const jobNameFromResponse =
        createJobData.job?.name || jobName;

      const jobUrl =
        createJobData.job?.url ||
        `${jenkinsData.jenkins?.url || ''}/job/${encodeURIComponent(
          jobNameFromResponse
        )}/`;

      setPipelinePrepared(true);
      setJenkinsJobUrl(jobUrl);
      setJenkinsDashboardUrl(jenkinsData.jenkins?.url || '');

      if (createJobData.created === false) {
        setNotice(
          `Jenkins job "${jobNameFromResponse}" already exists. Its configuration was not changed. No new build was triggered.`
        );
      } else {
        const buildResponse = await fetch(
          `${API_BASE}/api/jenkins/job/${encodeURIComponent(jobNameFromResponse)}/build`,
          {
            method: 'POST',
          }
        );

        const buildData = await buildResponse
          .json()
          .catch(() => ({}));

        if (!buildResponse.ok || !buildData.success) {
          throw new Error(
            `Jenkins job was created, but the build could not be triggered: ${buildData.error || 'Unknown Jenkins error'
            }`
          );
        }

        setNotice(
          `Jenkins job "${jobNameFromResponse}" created successfully. Build triggered! Open Jenkins to monitor its progress.`
        );
      }

      console.log('CartForge Jenkins job:', {
        name: jobNameFromResponse,
        url: jobUrl,
        pipelineSource: selectedSource,
        created: createJobData.created,
        repositoryUrl: result.repository.url,
        branch: result.branch.name,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect GitHub configuration to Jenkins.'
      );
    } finally {
      setConnecting(false);
    }
  }

  async function generatePipelinePreview() {
    if (!result) {
      setError('Verify the repository before creating a pipeline.');
      return;
    }

    setGeneratingPipeline(true);
    setError('');
    setNotice('');
    setPipelinePrepared(false);
    setJenkinsJobUrl('');
    setJenkinsDashboardUrl('');

    try {
      const data = await postJson('/api/github/generate-pipeline', {
        repoUrl: result.repository.url,
        branch: result.branch.name,
      });

      if (!data.pipelineScript) {
        throw new Error('CartForge did not receive a generated Jenkins pipeline.');
      }

      setAiPipeline(data.pipelineScript);
      setRepositoryAnalysis(data.analysis || null);
      setNotice('Repository analyzed successfully. CartForge generated a pipeline based on the detected technologies and files.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate the repository-specific pipeline.');
    } finally {
      setGeneratingPipeline(false);
    }
  }

  function prepareCustomPipeline() {
    if (!customPipeline.trim()) {
      setError('Enter a Jenkins pipeline before continuing.');
      return;
    }

    setError('');
    setPipelinePrepared(false);

    localStorage.setItem(
      'cartforge_custom_jenkinsfile',
      customPipeline
    );

    setNotice(
      'Custom Jenkins pipeline prepared. It is ready to create the Jenkins job.'
    );
  }

  function handlePipelineContinue() {
    setError('');
    setNotice('');

    if (!result) {
      setError('Verify the repository before creating a pipeline.');
      return;
    }

    if (pipelineSource === 'existing') {
      void connectToJenkins('existing');
      return;
    }

    if (pipelineSource === 'ai') {
      if (!aiPipeline.trim()) {
        void generatePipelinePreview();
        return;
      }

      void connectToJenkins('ai');
      return;
    }

    if (pipelineSource === 'custom') {
      if (!customPipeline.trim()) {
        setError('Enter a Jenkins pipeline before continuing.');
        return;
      }

      void connectToJenkins('custom');
      return;
    }

    setError('Select a valid pipeline source.');
  }

  const repo = result?.repository;
  const commit = result?.latestCommit;

  return (
    <div className="min-h-full bg-slate-50 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
              <GitBranch size={25} className="text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Git &amp; GitHub
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Verify repositories and create reusable CI/CD pipelines.
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${result
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600'
              }`}
          >
            {result ? (
              <CheckCircle2 size={15} />
            ) : (
              <Activity size={15} />
            )}

            <span className="text-xs font-semibold">
              {result
                ? 'Repository Verified'
                : 'Awaiting Verification'}
            </span>
          </div>
        </div>

        {/* Repository connection form */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <GitBranch size={22} />
            </div>

            <div>
              <h2 className="font-bold">
                Connect a GitHub Repository
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Verify a GitHub repository and its selected branch
                before creating a CI/CD pipeline.
              </p>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void verifyRepository();
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="github-repo-url"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Repository URL
              </label>

              <input
                id="github-repo-url"
                type="url"
                required
                value={repoUrl}
                onChange={(event) => {
                  setRepoUrl(event.target.value);
                  setResult(null);
                  setPipelinePrepared(false);
                  setAiPipeline('');
                  setRepositoryAnalysis(null);
                  setJenkinsJobUrl('');
                  setJenkinsDashboardUrl('');
                  setNotice('');
                  setError('');
                }}
                placeholder="https://github.com/username/project"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="github-branch"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Branch
              </label>

              <input
                id="github-branch"
                type="text"
                required
                value={branch}
                onChange={(event) => {
                  setBranch(event.target.value);
                  setResult(null);
                  setPipelinePrepared(false);
                  setAiPipeline('');
                  setRepositoryAnalysis(null);
                  setJenkinsJobUrl('');
                  setJenkinsDashboardUrl('');
                  setNotice('');
                  setError('');
                }}
                placeholder="main"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                Enter the branch Jenkins should check out.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  loading ||
                  !repoUrl.trim() ||
                  !branch.trim()
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCw size={16} />
                )}

                {loading
                  ? 'Verifying...'
                  : 'Verify Repository'}
              </button>

              {repo && (
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open on GitHub
                  <ExternalLink size={15} />
                </a>
              )}
            </div>
          </form>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
              />
              <span>{notice}</span>
            </div>
          )}
        </section>

        {/* Verified repository details */}
        {result && (
          <>
            <section className="mb-6 rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <CheckCircle2 size={23} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      Verified GitHub Repository
                    </p>

                    <h2 className="mt-1 text-lg font-bold">
                      {repo?.fullName}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {repo?.description ||
                        'No repository description provided.'}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  {repo?.private ? 'Private' : 'Public'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  label="Repository"
                  value={repo?.name || '—'}
                />

                <InfoCard
                  label="Selected Branch"
                  value={result.branch.name}
                />

                <InfoCard
                  label="Default Branch"
                  value={repo?.defaultBranch || '—'}
                />

                <InfoCard
                  label="Branch Protection"
                  value={
                    result.branch.protected
                      ? 'Enabled'
                      : 'Not enabled'
                  }
                />
              </div>

              <div className="mt-4 break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">
                  Clone URL:{' '}
                </span>
                {repo?.cloneUrl}
              </div>
            </section>

            {/* Repository metrics */}
            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<GitBranch size={20} />}
                title="Branch"
                value={result.branch.name}
                subtitle="Verified with GitHub"
                color="blue"
              />

              <MetricCard
                icon={<GitCommit size={20} />}
                title="Latest Commit"
                value={
                  commit?.sha
                    ? commit.sha.slice(0, 12)
                    : 'Unavailable'
                }
                subtitle={
                  commit?.author ||
                  'Commit author unavailable'
                }
                color="purple"
              />

              <MetricCard
                icon={<Webhook size={20} />}
                title="Webhook Workflow"
                value="Configured separately"
                subtitle="GitHub → Jenkins automation"
                color="orange"
              />

              <MetricCard
                icon={<Activity size={20} />}
                title="Repository Access"
                value="Verified"
                subtitle="Repository and branch accessible"
                color="green"
              />
            </section>

            {/* Latest commit */}
            <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <GitCommit
                  size={19}
                  className="text-purple-600"
                />

                <h2 className="font-bold">
                  Latest Commit
                </h2>
              </div>

              <p className="break-words text-sm font-semibold text-slate-800">
                {commit?.message ||
                  'No commit message available'}
              </p>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                <span>
                  Author: {commit?.author || 'Unknown'}
                </span>

                <span>
                  SHA:{' '}
                  {commit?.sha
                    ? commit.sha.slice(0, 12)
                    : 'Unavailable'}
                </span>

                <span>
                  Date:{' '}
                  {commit?.date
                    ? new Date(
                      commit.date
                    ).toLocaleString()
                    : 'Unavailable'}
                </span>
              </div>
            </section>

            {/* =========================================================
                PIPELINE CREATOR
               ========================================================= */}
            <section className="mb-6 rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <WandSparkles size={23} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                      Jenkins Integration
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-slate-900">
                      Pipeline Creator
                    </h2>

                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                      Choose how this repository should be connected
                      to Jenkins. Each repository can have its own
                      pipeline configuration.
                    </p>
                  </div>
                </div>

                <div className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  {repo?.name} / {result.branch.name}
                </div>
              </div>

              {/* Pipeline options */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Existing Jenkinsfile */}
                <PipelineOption
                  selected={pipelineSource === 'existing'}
                  onClick={() => {
                    setPipelineSource('existing');
                    setPipelinePrepared(false);
                    setError('');
                    setNotice('');
                  }}
                  icon={<FileCode2 size={22} />}
                  title="Existing Jenkinsfile"
                  description="Use the Jenkinsfile already committed in the GitHub repository."
                  badge="Current"
                />

                {/* AI Pipeline */}
                <PipelineOption
                  selected={pipelineSource === 'ai'}
                  onClick={() => {
                    setPipelineSource('ai');
                    setPipelinePrepared(false);
                    setError('');
                    setNotice('');
                  }}
                  icon={<Sparkles size={22} />}
                  title="AI Generated Pipeline"
                  description="Generate a CI/CD pipeline based on the repository structure."
                  badge="AI"
                />

                {/* Custom Pipeline */}
                <PipelineOption
                  selected={pipelineSource === 'custom'}
                  onClick={() => {
                    setPipelineSource('custom');
                    setPipelinePrepared(false);
                    setError('');
                    setNotice('');
                  }}
                  icon={<Code2 size={22} />}
                  title="Custom Pipeline"
                  description="Write your own Jenkins declarative pipeline."
                  badge="Custom"
                />
              </div>

              {/* Existing Jenkinsfile panel */}
              {pipelineSource === 'existing' && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
                      <FileCode2 size={20} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Use repository Jenkinsfile
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Jenkins will use the Jenkinsfile from the
                        selected branch of this repository.
                      </p>

                      <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
                        {result.branch.name}/Jenkinsfile
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI pipeline panel */}
              {pipelineSource === 'ai' && (
                <div className="mt-5 rounded-xl border border-purple-200 bg-purple-50/40 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-purple-600 shadow-sm">
                        <Sparkles size={20} />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          AI Pipeline Generator
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Generate a Jenkins pipeline for{' '}
                          <strong>
                            {repo?.fullName}
                          </strong>{' '}
                          on branch{' '}
                          <strong>
                            {result.branch.name}
                          </strong>
                          .
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        void generatePipelinePreview();
                      }}
                      disabled={generatingPipeline}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {generatingPipeline ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <Sparkles size={15} />
                      )}
                      {generatingPipeline ? 'Analyzing Repository...' : 'Generate Pipeline'}
                    </button>
                  </div>

                  {repositoryAnalysis && (
                    <RepositoryAnalysisPanel analysis={repositoryAnalysis} />
                  )}

                  {aiPipeline && (
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Generated Jenkinsfile Preview
                        </p>

                        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-semibold text-purple-700">
                          REPOSITORY GENERATED
                        </span>
                      </div>

                      <textarea
                        value={aiPipeline}
                        onChange={(event) => {
                          setAiPipeline(event.target.value);
                          setPipelinePrepared(false);
                          setError('');
                        }}
                        spellCheck={false}
                        className="min-h-[420px] w-full resize-y rounded-lg border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      />

                      <p className="mt-2 text-xs text-slate-500">
                        Review or edit the generated pipeline before
                        creating the Jenkins job.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom pipeline panel */}
              {pipelineSource === 'custom' && (
                <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50/40 p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm">
                      <Code2 size={20} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Custom Jenkins Pipeline
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Write the pipeline that Jenkins should execute
                        for this repository.
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={customPipeline}
                    onChange={(event) => {
                      setCustomPipeline(event.target.value);
                      setPipelinePrepared(false);
                      setError('');
                    }}
                    spellCheck={false}
                    placeholder={`pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                // Add your build command
            }
        }
    }
}`}
                    className="min-h-[420px] w-full resize-y rounded-lg border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    The pipeline will be sent to Jenkins as the job
                    definition. No build is triggered automatically.
                  </p>
                </div>
              )}

              {/* Pipeline action */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Selected pipeline
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {pipelineSource === 'existing' &&
                      'Existing Jenkinsfile'}

                    {pipelineSource === 'ai' &&
                      'AI Generated Pipeline'}

                    {pipelineSource === 'custom' &&
                      'Custom Pipeline'}
                  </p>

                  {pipelinePrepared && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 size={14} />
                      Jenkins job ready
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePipelineContinue}
                  disabled={connecting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {connecting ? (
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                  ) : pipelineSource === 'existing' ? (
                    <Server size={17} />
                  ) : pipelineSource === 'ai' ? (
                    <Sparkles size={17} />
                  ) : (
                    <Code2 size={17} />
                  )}

                  {connecting
                    ? 'Creating Jenkins Job...'
                    : pipelineSource === 'existing'
                      ? 'Create Jenkins Job'
                      : pipelineSource === 'ai'
                        ? aiPipeline
                          ? 'Create Jenkins Job'
                          : 'Generate AI Pipeline'
                        : 'Create Jenkins Job'}

                  {!connecting && (
                    <ArrowRight size={16} />
                  )}
                </button>
              </div>
            </section>

            {/* Existing Jenkins handoff information */}
            <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="font-bold">
                  Jenkins Integration
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a separate Jenkins Pipeline job for the
                  verified repository. The job is created first;
                  builds can be started manually from Jenkins.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <FeatureRow
                  icon={<GitBranch size={18} />}
                  title="Repository verified"
                  description={repo?.fullName || ''}
                />

                <FeatureRow
                  icon={<CheckCircle2 size={18} />}
                  title="Branch verified"
                  description={result.branch.name}
                />

                <FeatureRow
                  icon={<Link2 size={18} />}
                  title="Pipeline ready"
                  description="Choose an existing, AI, or custom pipeline"
                />
              </div>
            </section>
          </>
        )}

        {jenkinsJobUrl && (
          <section className="mb-6 rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Jenkins Job Ready</p>
                  <h2 className="mt-1 text-base font-bold text-slate-900">{result?.repository.name} pipeline is configured</h2>
                  <p className="mt-1 text-xs text-slate-500">The job was created/configured by CartForge. No build was triggered automatically.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={jenkinsJobUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">Open Jenkins Job <ExternalLink size={14} /></a>
                {jenkinsDashboardUrl && (
                  <a href={jenkinsDashboardUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Jenkins Dashboard <ExternalLink size={14} /></a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Workflow overview */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">
            Git &amp; CI/CD Workflow
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Each connected repository can follow its own CI/CD
            pipeline.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <WorkflowStep
              icon={<Terminal size={18} />}
              title="Developer"
              description="Change source code"
            />

            <WorkflowStep
              icon={<GitCommit size={18} />}
              title="Git"
              description="Commit changes"
            />

            <WorkflowStep
              icon={<GitBranch size={18} />}
              title="GitHub"
              description="Push repository"
            />

            <WorkflowStep
              icon={<WandSparkles size={18} />}
              title="Pipeline"
              description="Create pipeline"
            />

            <WorkflowStep
              icon={<Webhook size={18} />}
              title="Webhook"
              description="Notify Jenkins"
            />

            <WorkflowStep
              icon={<Server size={18} />}
              title="Jenkins"
              description="Build and deploy"
            />
          </div>
        </section>

        {/* Features */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">
            Git &amp; GitHub Features
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FeatureRow
              icon={<GitBranch size={18} />}
              title="Branch verification"
              description="Check a selected branch using GitHub's API."
            />

            <FeatureRow
              icon={<GitCommit size={18} />}
              title="Commit information"
              description="Display the latest commit on the selected branch."
            />

            <FeatureRow
              icon={<GitPullRequest size={18} />}
              title="Pull request workflow"
              description="Review changes before merging through GitHub."
            />

            <FeatureRow
              icon={<Sparkles size={18} />}
              title="Pipeline Creator"
              description="Use an existing Jenkinsfile, AI pipeline, or custom pipeline."
            />
          </div>
        </section>

        {/* Learning information */}
        <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
              <Terminal size={19} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-blue-900">
                CartForge DevOps Learning
              </h2>

              <p className="mt-1 text-xs leading-5 text-blue-800">
                Learners can verify their GitHub repository, choose
                a pipeline strategy, create a Jenkins job, and then
                manually start the build when required.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================================
   PIPELINE OPTION
   ============================================================ */

function PipelineOption({
  selected,
  onClick,
  icon,
  title,
  description,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left rounded-xl border p-5 transition ${selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected
              ? 'bg-white text-blue-600'
              : 'bg-slate-100 text-slate-600'
            }`}
        >
          {icon}
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${selected
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-600'
            }`}
        >
          {badge}
        </span>
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-4 flex items-center gap-1 text-xs font-semibold">
        {selected ? (
          <>
            <CheckCircle2
              size={14}
              className="text-blue-600"
            />
            <span className="text-blue-700">
              Selected
            </span>
          </>
        ) : (
          <span className="text-slate-400">
            Select pipeline
          </span>
        )}
      </div>
    </button>
  );
}

/* ============================================================
   REPOSITORY ANALYSIS PANEL
   ============================================================ */

function RepositoryAnalysisPanel({ analysis }: { analysis: RepositoryAnalysis }) {
  const capabilities = [
    ['Dockerfile', analysis.hasDockerfile],
    ['Docker Compose', analysis.hasDockerCompose],
    ['Kubernetes', analysis.hasKubernetes],
    ['Helm', analysis.hasHelm],
    ['Terraform', analysis.hasTerraform],
    ['Ansible', analysis.hasAnsible],
    ['Tests', analysis.hasTests],
    ['Jenkinsfile', analysis.hasJenkinsfile],
  ];

  return (
    <div className="mt-5 rounded-xl border border-purple-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">Repository Analysis</p>
          <h4 className="mt-1 text-sm font-bold text-slate-900">CartForge detected the technologies and files before generating the pipeline.</h4>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">DYNAMIC</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <AnalysisStat label="Languages" value={analysis.languages.join(', ') || 'None detected'} />
        <AnalysisStat label="Frameworks" value={analysis.frameworks.join(', ') || 'None detected'} />
        <AnalysisStat label="Package Managers" value={analysis.packageManagers.join(', ') || 'None detected'} />
        <AnalysisStat label="Repository Files" value={`${analysis.summary.totalFiles} files`} />
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Detected Capabilities</p>
        <div className="flex flex-wrap gap-2">
          {capabilities.map(([label, enabled]) => (
            <span key={String(label)} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
              {enabled ? '✓' : '—'} {label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Important Files</p>
          <div className="flex flex-wrap gap-2">
            {analysis.importantFiles.length > 0 ? analysis.importantFiles.map((file) => (
              <code key={file} className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-700">{file}</code>
            )) : <span className="text-xs text-slate-400">No key files detected.</span>}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Recommended Stages</p>
          <div className="flex flex-wrap gap-2">
            {analysis.recommendedStages.length > 0 ? analysis.recommendedStages.map((stage) => (
              <span key={stage} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">{stage}</span>
            )) : <span className="text-xs text-slate-400">No stages recommended.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xs font-bold text-slate-800">{value}</p>
    </div>
  );
}

/* ============================================================
   INFO CARD
   ============================================================ */

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   METRIC CARD
   ============================================================ */

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: 'blue' | 'purple' | 'orange' | 'green';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors[color]}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>

          <p className="mt-1 break-words text-base font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 break-words text-xs text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   FEATURE ROW
   ============================================================ */

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">
          {title}
        </p>

        <p className="mt-1 break-words text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <CheckCircle2
        size={17}
        className="shrink-0 text-emerald-500"
      />
    </div>
  );
}

/* ============================================================
   WORKFLOW STEP
   ============================================================ */

function WorkflowStep({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
        {icon}
      </div>

      <p className="mt-3 text-sm font-bold text-slate-800">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

