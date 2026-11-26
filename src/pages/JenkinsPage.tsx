import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Code2,
  Container,
  ExternalLink,
  GitBranch,
  History,
  Package,
  Play,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Webhook,
  XCircle,
} from 'lucide-react';

const JENKINS_URL = 'http://localhost:8080';
const JENKINS_JOB_URL = `${JENKINS_URL}/job/CartForge-k8s-test`;
const LATEST_BUILD = 13;

export default function JenkinsPage() {
  const [activeTab, setActiveTab] = useState('Overview');

  const openJenkins = () => {
    window.open(JENKINS_URL, '_blank', 'noopener,noreferrer');
  };

  const openJob = () => {
    window.open(JENKINS_JOB_URL, '_blank', 'noopener,noreferrer');
  };

  const openConsole = () => {
    window.open(
      `${JENKINS_JOB_URL}/${LATEST_BUILD}/console`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const runBuild = () => {
    window.open(
      `${JENKINS_JOB_URL}/build`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const refreshPage = () => {
    window.location.reload();
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="min-h-full bg-slate-50 p-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">

        <div>
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50">
              <GitBranch size={22} className="text-orange-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Jenkins
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Automated CI/CD pipeline for CartForge
              </p>
            </div>

          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={refreshPage}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openJenkins}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-700"
          >
            <ExternalLink size={14} />
            Open Jenkins
          </button>

          <span className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="text-xs font-semibold text-emerald-700">
              Jenkins Running
            </span>
          </span>

        </div>

      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="flex min-w-max">

          {[
            ['Overview', Activity],
            ['Pipeline', GitBranch],
            ['Execution', Play],
            ['Build History', History],
            ['Kubernetes', Server],
            ['Webhooks', Webhook],
            ['Credentials', ShieldCheck],
          ].map(([label, Icon]) => (
            <JenkinsTab
              key={label as string}
              label={label as string}
              icon={<Icon size={15} />}
              active={activeTab === label}
              onClick={() => {
                setActiveTab(label as string);

                const target =
                  label === 'Pipeline'
                    ? 'pipeline'
                    : label === 'Execution'
                      ? 'execution'
                      : label === 'Build History'
                        ? 'history'
                        : label === 'Kubernetes'
                          ? 'kubernetes'
                          : label === 'Webhooks'
                            ? 'webhooks'
                            : label === 'Credentials'
                              ? 'credentials'
                              : 'overview';

                scrollToSection(target);
              }}
            />
          ))}

        </div>
      </div>

      {/* =====================================================
          JENKINS CONTROLLER
      ====================================================== */}

      <section id="overview" className="mb-6">

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <Server size={19} className="text-orange-600" />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Jenkins Controller
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Local Jenkins server connected to CartForge CI/CD
                </p>
              </div>

            </div>

            <div className="flex items-center gap-2">

              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                Running
              </span>

              <span className="text-xs font-medium text-slate-500">
                Jenkins 2.452.1 LTS
              </span>

            </div>

          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <ControllerInfo
              label="Jenkins URL"
              value="localhost:8080"
            />

            <ControllerInfo
              label="Pipeline Job"
              value="CartForge-k8s-test"
            />

            <ControllerInfo
              label="Latest Build"
              value="#13"
              valueClass="text-emerald-600"
            />

            <ControllerInfo
              label="Pipeline Status"
              value="SUCCESS"
              valueClass="text-emerald-600"
            />

          </div>

        </div>

      </section>

      {/* =====================================================
          MAIN METRICS
      ====================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <MetricCard
          icon={<GitBranch size={21} />}
          iconClass="bg-blue-50 text-blue-600"
          title="Pipeline"
          value="1"
          subtitle="CartForge CI/CD pipeline"
        />

        <MetricCard
          icon={<CheckCircle2 size={21} />}
          iconClass="bg-emerald-50 text-emerald-600"
          title="Latest Build"
          value="#13"
          subtitle="Successful"
          valueClass="text-emerald-600"
        />

        <MetricCard
          icon={<Container size={21} />}
          iconClass="bg-purple-50 text-purple-600"
          title="Docker Image"
          value="13"
          subtitle="cartforge:13"
        />

        <MetricCard
          icon={<Server size={21} />}
          iconClass="bg-orange-50 text-orange-600"
          title="Kubernetes"
          value="Ready"
          subtitle="Minikube"
          valueClass="text-emerald-600"
        />

      </div>

      {/* =====================================================
          ACTION BAR
      ====================================================== */}

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
              <Play size={18} className="text-blue-600" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                CartForge CI/CD Pipeline
              </h2>

              <p className="mt-1 text-xs text-slate-600">
                Push code to GitHub and Jenkins automatically builds and deploys CartForge.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={runBuild}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              <Play size={14} />
              Run Build
            </button>

            <button
              type="button"
              onClick={openConsole}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Terminal size={14} />
              Console
            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          REAL PIPELINE
      ====================================================== */}

      <section id="pipeline" className="mb-6">

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-5">

            <h2 className="text-base font-bold text-slate-900">
              CartForge CI/CD Pipeline
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Automated workflow executed by Jenkins
            </p>

          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">

            <PipelineStage
              number="01"
              icon={<GitBranch size={18} />}
              title="Checkout"
              description="GitHub source"
              status="success"
            />

            <PipelineArrow />

            <PipelineStage
              number="02"
              icon={<Code2 size={18} />}
              title="React Build"
              description="npm ci + Vite"
              status="success"
            />

            <PipelineArrow />

            <PipelineStage
              number="03"
              icon={<Container size={18} />}
              title="Docker Build"
              description="cartforge:13"
              status="success"
            />

            <PipelineArrow />

            <PipelineStage
              number="04"
              icon={<Server size={18} />}
              title="Kubernetes"
              description="Minikube deploy"
              status="success"
            />

          </div>

          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">

            <div className="flex items-center gap-3">

              <CheckCircle2
                size={18}
                className="shrink-0 text-emerald-600"
              />

              <div>

                <p className="text-xs font-bold text-emerald-800">
                  Pipeline completed successfully
                </p>

                <p className="mt-0.5 text-[11px] text-emerald-700">
                  Docker image was loaded into Minikube and CartForge was successfully deployed to Kubernetes.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          EXECUTION
      ====================================================== */}

      <section id="execution" className="mb-6">

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

          {/* Build Details */}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Latest Pipeline Execution
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Jenkins build #13
                </p>
              </div>

              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600">
                <CheckCircle2 size={12} />
                SUCCESS
              </span>

            </div>

            <div className="space-y-3">

              <ExecutionRow
                label="Job"
                value="CartForge-k8s-test"
              />

              <ExecutionRow
                label="Build"
                value="#13"
              />

              <ExecutionRow
                label="Branch"
                value="main"
              />

              <ExecutionRow
                label="Commit"
                value="1798763f"
              />

              <ExecutionRow
                label="Trigger"
                value="GitHub / Jenkins"
              />

              <ExecutionRow
                label="Docker Image"
                value="cartforge:13"
              />

              <ExecutionRow
                label="Kubernetes Context"
                value="minikube"
              />

            </div>

          </div>

          {/* Jenkins Stages */}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-5">

              <h2 className="text-base font-bold text-slate-900">
                Build Stages
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest successful execution
              </p>

            </div>

            <div className="space-y-3">

              <StageRow
                title="Checkout"
                description="GitHub repository checkout"
              />

              <StageRow
                title="Build React Application"
                description="npm ci and npm run build"
              />

              <StageRow
                title="Check Docker"
                description="Docker client and server verification"
              />

              <StageRow
                title="Build Docker Image"
                description="cartforge:13"
              />

              <StageRow
                title="Check Kubernetes"
                description="Minikube cluster verification"
              />

              <StageRow
                title="Load Image into Minikube"
                description="cartforge:13"
              />

              <StageRow
                title="Deploy to Kubernetes"
                description="kubectl apply"
              />

              <StageRow
                title="Wait for Deployment"
                description="Rollout verification"
              />

              <StageRow
                title="Verify Kubernetes"
                description="Deployments, pods and services"
              />

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          BUILD HISTORY
      ====================================================== */}

      <section id="history" className="mb-6">

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

            <div>

              <h2 className="text-base font-bold text-slate-900">
                Build History
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                CartForge-k8s-test Jenkins job
              </p>

            </div>

            <button
              type="button"
              onClick={openJob}
              className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Open Jenkins Job
              <ExternalLink size={13} />
            </button>

          </div>

          <BuildRow
            build="#13"
            branch="main"
            commit="1798763f"
            status="SUCCESS"
            active
          />

          <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3">

            <div className="flex items-center gap-3">

              <History
                size={16}
                className="text-slate-400"
              />

              <p className="text-xs text-slate-500">
                Earlier builds can be viewed directly from the Jenkins job.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          KUBERNETES DEPLOYMENT
      ====================================================== */}

      <section id="kubernetes" className="mb-6">

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-lg bg-blue-50 p-2">
              <Server size={18} className="text-blue-600" />
            </div>

            <div>

              <h2 className="text-base font-bold text-slate-900">
                Kubernetes Deployment
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Deployment generated by the Jenkins pipeline
              </p>

            </div>

          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

            <DeploymentCard
              label="Cluster"
              value="Minikube"
              status="Ready"
            />

            <DeploymentCard
              label="Deployment"
              value="cartforge"
              status="1/1 Ready"
            />

            <DeploymentCard
              label="Service"
              value="cartforge"
              status="NodePort 30080"
            />

            <DeploymentCard
              label="Docker Image"
              value="cartforge:13"
              status="Loaded"
            />

          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">

            <DeploymentRow
              label="Kubernetes Context"
              value="minikube"
            />

            <DeploymentRow
              label="Namespace"
              value="default"
            />

            <DeploymentRow
              label="Container Port"
              value="80"
            />

          </div>

        </div>

      </section>

      {/* =====================================================
          WEBHOOKS
      ====================================================== */}

      <section id="webhooks" className="mb-6">

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-lg bg-purple-50 p-2">
              <Webhook size={18} className="text-purple-600" />
            </div>

            <div>

              <h2 className="text-base font-bold text-slate-900">
                GitHub Webhook
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Automatic Jenkins build trigger
              </p>

            </div>

          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                <CheckCircle2
                  size={19}
                  className="text-emerald-600"
                />
              </div>

              <div>

                <p className="text-sm font-bold text-emerald-800">
                  GitHub webhook active
                </p>

                <p className="mt-1 text-xs text-emerald-700">
                  A push to the repository can trigger the CartForge Jenkins pipeline automatically.
                </p>

              </div>

            </div>

          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">

            <DeploymentRow
              label="Repository"
              value="CartForge-DevOpsLab"
            />

            <DeploymentRow
              label="Branch"
              value="main"
            />

            <DeploymentRow
              label="Trigger"
              value="GitHub Push"
            />

          </div>

        </div>

      </section>

      {/* =====================================================
          CREDENTIALS
      ====================================================== */}

      <section id="credentials" className="mb-6">

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-lg bg-emerald-50 p-2">
              <ShieldCheck size={18} className="text-emerald-600" />
            </div>

            <div>

              <h2 className="text-base font-bold text-slate-900">
                Jenkins Credentials
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Credentials used by Jenkins integrations
              </p>

            </div>

          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">

            <div className="flex items-center gap-3">

              <ShieldCheck
                size={18}
                className="text-emerald-600"
              />

              <div>

                <p className="text-sm font-semibold text-slate-800">
                  Jenkins credential management
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Manage GitHub, Docker and other credentials from Jenkins.
                </p>

              </div>

              <button
                type="button"
                onClick={openJenkins}
                className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Manage
                <ExternalLink size={13} />
              </button>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          LEARNING FLOW
      ====================================================== */}

      <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">

        <div className="mb-5">

          <h2 className="text-base font-bold text-slate-900">
            How CartForge CI/CD Works
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            The complete automated deployment workflow
          </p>

        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">

          <LearningStep
            number="1"
            title="Developer Push"
            description="Code is pushed to GitHub."
          />

          <LearningStep
            number="2"
            title="Jenkins Trigger"
            description="GitHub webhook starts the pipeline."
          />

          <LearningStep
            number="3"
            title="Build & Docker"
            description="React is built and Docker image is created."
          />

          <LearningStep
            number="4"
            title="Minikube"
            description="Image is loaded into Minikube."
          />

          <LearningStep
            number="5"
            title="Kubernetes"
            description="CartForge is deployed and verified."
          />

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   TAB
========================================================= */

function JenkinsTab({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition ${active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* =========================================================
   CONTROLLER INFO
========================================================= */

function ControllerInfo({
  label,
  value,
  valueClass = 'text-slate-900',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">

      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className={`mt-1 text-sm font-semibold ${valueClass}`}>
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  icon,
  iconClass,
  title,
  value,
  subtitle,
  valueClass = 'text-slate-900',
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  value: string;
  subtitle: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start gap-4">

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <p className={`mt-1 text-2xl font-bold ${valueClass}`}>
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   PIPELINE STAGE
========================================================= */

function PipelineStage({
  number,
  icon,
  title,
  description,
  status,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'success' | 'failed';
}) {
  const success = status === 'success';

  return (
    <div
      className={`rounded-xl border p-4 ${success
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-red-200 bg-red-50'
        }`}
    >

      <div className="flex items-center justify-between">

        <span
          className={`text-[10px] font-bold ${success ? 'text-emerald-600' : 'text-red-600'
            }`}
        >
          {number}
        </span>

        {success ? (
          <CheckCircle2
            size={16}
            className="text-emerald-600"
          />
        ) : (
          <XCircle
            size={16}
            className="text-red-600"
          />
        )}

      </div>

      <div
        className={`mt-3 flex h-9 w-9 items-center justify-center rounded-lg ${success ? 'bg-white text-emerald-600' : 'bg-white text-red-600'
          }`}
      >
        {icon}
      </div>

      <p className="mt-3 text-xs font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-[10px] text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* =========================================================
   PIPELINE ARROW
========================================================= */

function PipelineArrow() {
  return (
    <div className="hidden items-center justify-center xl:flex">
      <span className="text-slate-300">→</span>
    </div>
  );
}

/* =========================================================
   EXECUTION ROW
========================================================= */

function ExecutionRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">

      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span className="max-w-[65%] truncate text-right text-xs font-semibold text-slate-800">
        {value}
      </span>

    </div>
  );
}

/* =========================================================
   STAGE ROW
========================================================= */

function StageRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2
          size={15}
          className="text-emerald-600"
        />
      </div>

      <div className="min-w-0">

        <p className="text-xs font-bold text-slate-800">
          {title}
        </p>

        <p className="mt-0.5 text-[10px] text-slate-500">
          {description}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   BUILD ROW
========================================================= */

function BuildRow({
  build,
  branch,
  commit,
  status,
  active = false,
}: {
  build: string;
  branch: string;
  commit: string;
  status: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${active
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-slate-100 bg-slate-50'
        }`}
    >

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
        <CheckCircle2
          size={15}
          className="text-emerald-600"
        />
      </div>

      <div className="min-w-0 flex-1">

        <div className="flex items-center gap-2">

          <span className="text-xs font-bold text-slate-900">
            {build}
          </span>

          <span className="text-xs font-semibold text-slate-700">
            CartForge-k8s-test
          </span>

        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">

          <span className="font-mono text-[11px] text-slate-400">
            {branch}
          </span>

          <span className="font-mono text-[11px] text-slate-400">
            {commit}
          </span>

        </div>

      </div>

      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
        {status}
      </span>

    </div>
  );
}

/* =========================================================
   DEPLOYMENT CARD
========================================================= */

function DeploymentCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-slate-900">
        {value}
      </p>

      <div className="mt-2 flex items-center gap-2">

        <span className="h-2 w-2 rounded-full bg-emerald-500" />

        <span className="text-[11px] font-semibold text-emerald-600">
          {status}
        </span>

      </div>

    </div>
  );
}

/* =========================================================
   DEPLOYMENT ROW
========================================================= */

function DeploymentRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">

      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span className="text-xs font-semibold text-slate-800">
        {value}
      </span>

    </div>
  );
}

/* =========================================================
   LEARNING STEP
========================================================= */

function LearningStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {number}
        </div>

        <p className="text-xs font-bold text-slate-900">
          {title}
        </p>

      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}