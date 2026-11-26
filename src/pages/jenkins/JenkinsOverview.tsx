import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, StatusBadge, Badge, Button } from '@/components/ui';
import {
  Activity,
  CheckCircle2,
  Clock,
  Container,
  ExternalLink,
  GitBranch,
  Globe,
  HardDrive,
  History,
  ListChecks,
  Play,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Terminal,
  Workflow,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { ModuleKey } from '@/types';

const API_BASE = 'http://localhost:5000';
const JENKINS_URL = 'http://localhost:8080';
const REFRESH_INTERVAL = 10000;

type JenkinsBuild = {
  number: number;
  result: string | null;
  timestamp: number;
  duration: number;
};

type JenkinsJob = {
  _class?: string;
  displayName: string;
  name: string;
  url: string;
  color: string;
  lastBuild: JenkinsBuild | null;
};

type JenkinsJobsResponse = {
  success: boolean;
  jobs: JenkinsJob[];
  error?: string;
};

type JenkinsStatus = 'success' | 'error' | 'running' | 'pending';

function formatDuration(milliseconds: number) {
  if (!milliseconds || milliseconds <= 0) {
    return '—';
  }

  const seconds = Math.floor(milliseconds / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

function formatBuildTime(timestamp: number) {
  if (!timestamp) {
    return '—';
  }

  return new Date(timestamp).toLocaleString();
}

function getBuildStatus(job: JenkinsJob): JenkinsStatus {
  if (!job.lastBuild) {
    return 'pending';
  }

  if (job.lastBuild.result === 'SUCCESS') {
    return 'success';
  }

  if (
    job.lastBuild.result === 'FAILURE' ||
    job.lastBuild.result === 'ABORTED' ||
    job.lastBuild.result === 'UNSTABLE'
  ) {
    return 'error';
  }

  return 'running';
}

function getResultLabel(job: JenkinsJob) {
  if (!job.lastBuild) {
    return 'NOT BUILT';
  }

  if (!job.lastBuild.result) {
    return 'RUNNING';
  }

  return job.lastBuild.result;
}

function getStatusIcon(job: JenkinsJob) {
  const status = getBuildStatus(job);

  if (status === 'success') {
    return <CheckCircle2 size={17} className="text-emerald-600" />;
  }

  if (status === 'error') {
    return <XCircle size={17} className="text-red-600" />;
  }

  if (status === 'running') {
    return <RefreshCw size={17} className="animate-spin text-blue-600" />;
  }

  return <AlertCircle size={17} className="text-slate-400" />;
}

function getStatusClasses(job: JenkinsJob) {
  const status = getBuildStatus(job);

  if (status === 'success') {
    return 'border-emerald-200 bg-emerald-50';
  }

  if (status === 'error') {
    return 'border-red-200 bg-red-50';
  }

  if (status === 'running') {
    return 'border-blue-200 bg-blue-50';
  }

  return 'border-slate-200 bg-slate-50';
}

export default function JenkinsOverview({
  onNavigate,
}: {
  onNavigate: (k: ModuleKey, tab?: string) => void;
}) {
  const [jobs, setJobs] = useState<JenkinsJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchJobs = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      }

      const response = await fetch(`${API_BASE}/api/jenkins/jobs`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Jenkins API returned HTTP ${response.status}`);
      }

      const data: JenkinsJobsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load Jenkins jobs');
      }

      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to connect to Jenkins backend';

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();

    const interval = window.setInterval(() => {
      fetchJobs();
    }, REFRESH_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchJobs]);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aTime = a.lastBuild?.timestamp ?? 0;
      const bTime = b.lastBuild?.timestamp ?? 0;

      return bTime - aTime;
    });
  }, [jobs]);

  const latestJob = sortedJobs[0] ?? null;

  const successfulJobs = jobs.filter(
    (job) => job.lastBuild?.result === 'SUCCESS'
  ).length;

  const failedJobs = jobs.filter(
    (job) =>
      job.lastBuild?.result === 'FAILURE' ||
      job.lastBuild?.result === 'UNSTABLE' ||
      job.lastBuild?.result === 'ABORTED'
  ).length;

  const notBuiltJobs = jobs.filter((job) => !job.lastBuild).length;

  const openJenkins = () => {
    window.open(JENKINS_URL, '_blank', 'noopener,noreferrer');
  };

  const openJob = (job: JenkinsJob) => {
    window.open(job.url, '_blank', 'noopener,noreferrer');
  };

  const triggerBuild = () => {
    onNavigate('jenkins', 'execution');
  };

  return (
    <div className="space-y-6">
      {/* =========================================================
          DYNAMIC JENKINS HEADER
         ========================================================= */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 shadow-sm">
                <Workflow size={28} className="text-white" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    CartForge CI/CD Pipelines
                  </h2>

                  <StatusBadge status="running" />
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Live Jenkins jobs and latest build information
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                    {jobs.length} Jenkins Jobs
                  </span>

                  {latestJob && (
                    <span className="rounded-md bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                      Latest: {latestJob.displayName}
                    </span>
                  )}

                  {latestJob?.lastBuild && (
                    <span
                      className={`rounded-md px-2.5 py-1 font-medium ${
                        latestJob.lastBuild.result === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      Build #{latestJob.lastBuild.number}{' '}
                      {getResultLabel(latestJob)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={triggerBuild}
              >
                <Play size={14} />
                Pipeline Execution
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => fetchJobs(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? 'animate-spin' : ''}
                />
                Refresh
              </Button>

              <Button
                size="sm"
                onClick={openJenkins}
              >
                <ExternalLink size={14} />
                Open Jenkins
              </Button>
            </div>
          </div>

          {lastUpdated && (
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Activity size={13} />
              Last updated: {lastUpdated.toLocaleTimeString()}
              <span>•</span>
              Auto-refresh every 10 seconds
            </div>
          )}
        </div>
      </Card>

      {/* =========================================================
          LIVE JENKINS JOB LIST
         ========================================================= */}
      <Card className="p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              All Jenkins Pipelines / Jobs
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              This list comes directly from Jenkins. New jobs appear
              automatically.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="success">
              {successfulJobs} Success
            </Badge>

            {failedJobs > 0 && (
              <span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                {failedJobs} Failed
              </span>
            )}

            {notBuiltJobs > 0 && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {notBuiltJobs} Not Built
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-10">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <RefreshCw size={18} className="animate-spin" />
              Loading Jenkins jobs...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="text-sm font-semibold text-red-800">
                  Unable to load Jenkins jobs
                </p>

                <p className="mt-1 text-xs text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => fetchJobs(true)}
                  className="mt-3 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-100"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
            <Workflow
              size={28}
              className="mx-auto text-slate-400"
            />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              No Jenkins jobs found
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Create a Jenkins pipeline and it will appear here
              automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedJobs.map((job) => {
              const status = getBuildStatus(job);
              const result = getResultLabel(job);

              return (
                <div
                  key={job.name}
                  className={`rounded-xl border p-4 transition hover:shadow-sm ${getStatusClasses(
                    job
                  )}`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                        {getStatusIcon(job)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-semibold text-slate-900">
                            {job.displayName}
                          </h4>

                          {status === 'success' && (
                            <Badge variant="success">
                              SUCCESS
                            </Badge>
                          )}

                          {status === 'error' && (
                            <span className="rounded-md bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">
                              {result}
                            </span>
                          )}

                          {status === 'pending' && (
                            <span className="rounded-md bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">
                              NOT BUILT
                            </span>
                          )}

                          {status === 'running' && (
                            <span className="rounded-md bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">
                              RUNNING
                            </span>
                          )}
                        </div>

                        <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                          {job.name}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[500px]">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Latest Build
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {job.lastBuild
                            ? `#${job.lastBuild.number}`
                            : '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Duration
                        </p>

                        <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                          <Clock size={13} />
                          {job.lastBuild
                            ? formatDuration(job.lastBuild.duration)
                            : '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Last Build
                        </p>

                        <p className="mt-1 text-xs font-medium text-slate-700">
                          {job.lastBuild
                            ? formatBuildTime(
                                job.lastBuild.timestamp
                              )
                            : 'No builds yet'}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openJob(job)}
                    >
                      <ExternalLink size={14} />
                      Open
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* =========================================================
          CURRENT BUILD / DOCKER / KUBERNETES
         ========================================================= */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Latest Jenkins Build
            </span>

            {latestJob && getStatusIcon(latestJob)}
          </div>

          <p className="mt-3 text-2xl font-bold text-slate-900">
            {latestJob?.lastBuild
              ? `#${latestJob.lastBuild.number}`
              : '—'}
          </p>

          <p
            className={`mt-1 text-sm font-medium ${
              latestJob?.lastBuild?.result === 'SUCCESS'
                ? 'text-emerald-600'
                : latestJob?.lastBuild
                ? 'text-red-600'
                : 'text-slate-500'
            }`}
          >
            {latestJob ? getResultLabel(latestJob) : 'NO BUILDS'}
          </p>

          <p className="mt-2 truncate text-xs text-slate-500">
            {latestJob?.displayName || 'No Jenkins jobs'}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Jenkins
            </span>

            <Workflow size={18} className="text-blue-600" />
          </div>

          <p className="mt-3 text-2xl font-bold text-slate-900">
            {jobs.length}
          </p>

          <p className="mt-1 text-sm font-medium text-blue-600">
            Active Jobs
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Read directly from Jenkins API
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Docker
            </span>

            <Container size={18} className="text-blue-600" />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-900">
            CI/CD Image Build
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Docker image is created by the Jenkins pipeline.
          </p>

          <div className="mt-3">
            <Badge variant="success">
              Jenkins Integrated
            </Badge>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Kubernetes
            </span>

            <Rocket size={18} className="text-blue-600" />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-900">
            Minikube
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Jenkins deployment target
          </p>

          <div className="mt-3">
            <Badge variant="success">
              CI/CD Target
            </Badge>
          </div>
        </Card>
      </div>

      {/* =========================================================
          AUTOMATED WORKFLOW
         ========================================================= */}
      <Card className="p-5">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Automated Deployment Workflow
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            CartForge CI/CD flow demonstrated by the Jenkins pipelines.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-0">
          <FlowStep
            icon={<GitBranch size={19} />}
            title="GitHub"
            description="Push code"
          />

          <FlowArrow />

          <FlowStep
            icon={<Workflow size={19} />}
            title="Jenkins"
            description="Webhook trigger"
          />

          <FlowArrow />

          <FlowStep
            icon={<Terminal size={19} />}
            title="Build"
            description="npm run build"
          />

          <FlowArrow />

          <FlowStep
            icon={<Container size={19} />}
            title="Docker"
            description="Build image"
          />

          <FlowArrow />

          <FlowStep
            icon={<Rocket size={19} />}
            title="Minikube"
            description="Load image"
          />

          <FlowArrow />

          <FlowStep
            icon={<Server size={19} />}
            title="Kubernetes"
            description="Deploy workload"
          />
        </div>
      </Card>

      {/* =========================================================
          RECENT JENKINS ACTIVITY
         ========================================================= */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Recent Jenkins Activity
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Jobs are sorted by their latest build time.
              </p>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => onNavigate('jenkins', 'pipelines')}
            >
              <History size={14} />
              View Pipelines
            </Button>
          </div>

          <div className="space-y-2">
            {sortedJobs.slice(0, 5).map((job) => (
              <div
                key={job.name}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                {getStatusIcon(job)}

                <span className="font-mono text-xs font-semibold text-slate-700">
                  {job.lastBuild
                    ? `#${job.lastBuild.number}`
                    : '—'}
                </span>

                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                  {job.displayName}
                </span>

                <span className="text-xs text-slate-500">
                  {job.lastBuild
                    ? getResultLabel(job)
                    : 'NOT BUILT'}
                </span>

                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock size={12} />
                  {job.lastBuild
                    ? formatDuration(job.lastBuild.duration)
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Kubernetes Deployment
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              CartForge CI/CD deployment target
            </p>
          </div>

          <div className="space-y-3">
            <InfoRow
              label="Context"
              value="minikube"
              icon={<Server size={15} />}
            />

            <InfoRow
              label="Deployment"
              value="cartforge"
              icon={<Rocket size={15} />}
            />

            <InfoRow
              label="Replicas"
              value="1 / 1"
              icon={<Server size={15} />}
            />

            <InfoRow
              label="Service"
              value="NodePort 30080"
              icon={<Globe size={15} />}
            />

            <InfoRow
              label="Pipeline"
              value="Jenkins"
              icon={<Workflow size={15} />}
            />
          </div>

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <CheckCircle2 size={16} />
              CI/CD Deployment Target
            </div>

            <p className="mt-1 text-xs text-blue-700/80">
              Jenkins can build the Docker image and deploy the
              application to Minikube.
            </p>
          </div>
        </Card>
      </div>

      {/* =========================================================
          JENKINS CONTROLLER
         ========================================================= */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Workflow size={20} className="text-blue-600" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Jenkins Controller
              </h3>

              <p className="text-xs text-slate-500">
                Local Jenkins server used for CartForge CI/CD
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ControllerInfo
              icon={<Globe size={15} />}
              label="Jenkins URL"
              value="localhost:8080"
            />

            <ControllerInfo
              icon={<Activity size={15} />}
              label="API"
              value="Connected"
              success={!error}
            />

            <ControllerInfo
              icon={<ShieldCheck size={15} />}
              label="Pipeline"
              value="Declarative Jenkinsfile"
            />

            <ControllerInfo
              icon={<RefreshCw size={15} />}
              label="Refresh"
              value="Every 10 seconds"
            />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Quick Actions
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Open the detailed Jenkins modules.
          </p>

          <div className="mt-4 space-y-2">
            <QuickAction
              label="Pipeline Execution"
              icon={<Play size={15} />}
              onClick={() => onNavigate('jenkins', 'execution')}
            />

            <QuickAction
              label="Webhooks"
              icon={<GitBranch size={15} />}
              onClick={() => onNavigate('jenkins', 'webhooks')}
            />

            <QuickAction
              label="Credentials"
              icon={<ShieldCheck size={15} />}
              onClick={() => onNavigate('jenkins', 'credentials')}
            />

            <QuickAction
              label="Artifacts"
              icon={<HardDrive size={15} />}
              onClick={() => onNavigate('jenkins', 'artifacts')}
            />
          </div>
        </Card>
      </div>

      {/* =========================================================
          LIVE DEMONSTRATION
         ========================================================= */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
            <ListChecks size={19} className="text-blue-600" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-blue-900">
              CartForge Live CI/CD Demonstration
            </h3>

            <p className="mt-1 text-sm text-blue-800">
              Push a change to GitHub and the webhook can trigger
              Jenkins. Jenkins checks out the code, builds the
              application, creates a Docker image, loads it into
              Minikube, deploys it to Kubernetes, waits for the
              rollout, and verifies the running resources.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-700">
                GitHub Webhook
              </span>

              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-700">
                Jenkins Pipeline
              </span>

              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-700">
                Docker Build
              </span>

              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-700">
                Minikube
              </span>

              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-blue-700">
                Kubernetes Rollout
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   SMALL REUSABLE UI COMPONENTS
   ============================================================= */

function FlowStep({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-900">
          {title}
        </p>

        <p className="truncate text-[11px] text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden px-1 text-slate-300 lg:block">
      →
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <span className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </span>

      <span className="truncate text-xs font-medium text-slate-800">
        {value}
      </span>
    </div>
  );
}

function ControllerInfo({
  icon,
  label,
  value,
  success = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>

      <p
        className={`mt-1 text-sm font-medium ${
          success ? 'text-emerald-600' : 'text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function QuickAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50"
    >
      <span className="text-blue-600">
        {icon}
      </span>

      <span className="flex-1 text-xs font-medium text-slate-700">
        {label}
      </span>

      <ExternalLink size={13} className="text-slate-400" />
    </button>
  );
}