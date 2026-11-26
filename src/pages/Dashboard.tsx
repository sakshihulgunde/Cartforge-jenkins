import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Rocket,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';
import type { ModuleKey } from '@/types';

interface ModuleCard {
  key: ModuleKey;
  title: string;
  description: string;
  logoUrls: string[];
  iconColor: string;
  status: string;
  featured?: boolean;
}

const modules: ModuleCard[] = [
  {
    key: 'aws',
    title: 'EC2 / AWS Labs',
    description: 'Explore AWS services with safe simulation. Learn EC2, S3, IAM and VPC without provisioning real resources.',
    logoUrls: ['https://cdn.simpleicons.org/amazonaws/FF9900'],
    iconColor: 'text-orange-400',
    status: 'Simulation Mode',
    featured: true,
  },
  {
    key: 'terraform',
    title: 'Terraform',
    description: 'Practice Infrastructure as Code, validation and safe Terraform workflows.',
    logoUrls: ['https://cdn.simpleicons.org/terraform/844FBA'],
    iconColor: 'text-violet-400',
    status: 'Ready',
  },
  {
    key: 'github',
    title: 'GitHub',
    description: 'Manage repositories, branches, commits and webhooks for CI/CD.',
    logoUrls: ['https://cdn.simpleicons.org/github/FFFFFF'],
    iconColor: 'text-white',
    status: 'Open module',
  },
  {
    key: 'jenkins',
    title: 'Jenkins',
    description: 'Explore jobs, pipeline execution, build logs and build history.',
    logoUrls: ['https://cdn.simpleicons.org/jenkins/D24939'],
    iconColor: 'text-sky-400',
    status: 'Open module',
  },
  {
    key: 'docker',
    title: 'Docker',
    description: 'Learn container images, containers and application packaging.',
    logoUrls: ['https://cdn.simpleicons.org/docker/2496ED'],
    iconColor: 'text-sky-400',
    status: 'Open module',
  },
  {
    key: 'kubernetes',
    title: 'Kubernetes',
    description: 'Explore deployments, pods, services and orchestration.',
    logoUrls: ['https://cdn.simpleicons.org/kubernetes/326CE5'],
    iconColor: 'text-blue-400',
    status: 'Open module',
  },
  {
    key: 'ansible',
    title: 'Ansible',
    description: 'Practice inventories, playbooks and configuration automation.',
    logoUrls: ['https://cdn.simpleicons.org/ansible/EE0000'],
    iconColor: 'text-rose-300',
    status: 'Open module',
  },
  {
    key: 'linux',
    title: 'Linux',
    description: 'Learn commands, permissions, processes and system administration.',
    logoUrls: ['https://cdn.simpleicons.org/linux/FCC624'],
    iconColor: 'text-amber-300',
    status: 'Open module',
  },
  {
    key: 'observability',
    title: 'Monitoring',
    description: 'Explore Prometheus metrics, Grafana dashboards and alerting.',
    logoUrls: ['https://cdn.simpleicons.org/prometheus/E6522C', 'https://cdn.simpleicons.org/grafana/F46800'],
    iconColor: 'text-emerald-300',
    status: 'Open module',
  },
];

const pipelineStages: {
  name: string;
  detail: string;
  key: ModuleKey;
  logoUrl: string;
}[] = [
    { name: 'GitHub', detail: 'Source code', key: 'github', logoUrl: 'https://cdn.simpleicons.org/github/FFFFFF' },
    { name: 'Jenkins', detail: 'Build & test', key: 'jenkins', logoUrl: 'https://cdn.simpleicons.org/jenkins/D24939' },
    { name: 'Docker', detail: 'Container image', key: 'docker', logoUrl: 'https://cdn.simpleicons.org/docker/2496ED' },
    { name: 'Kubernetes', detail: 'Deployment', key: 'kubernetes', logoUrl: 'https://cdn.simpleicons.org/kubernetes/326CE5' },
  ];

export default function Dashboard({
  onNavigate,
}: {
  onNavigate: (key: ModuleKey) => void;
}) {
  return (
    <main className="min-h-full overflow-x-hidden bg-[#020e1c] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <section className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              <Activity size={15} /> CARTFORGE WORKSPACE
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Welcome to CartForge <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-3 text-base text-blue-200 sm:text-lg">
              Cloud &amp; DevOps Learning Workspace
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard icon={BookOpen} value="9" label="Learning Modules" color="text-blue-400" />
            <SummaryCard icon={Server} value="Explore" label="Services & Labs" color="text-sky-400" />
            <SummaryCard icon={Zap} value="CI/CD" label="Pipeline Tools" color="text-amber-400" />
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white sm:text-2xl">Learning Modules</h2>
              <p className="mt-1 text-sm text-slate-400">Choose a tool to open its interactive workspace.</p>
            </div>
            <span className="rounded-full border border-cyan-800 bg-cyan-950/50 px-3 py-1.5 text-xs font-semibold text-cyan-300">
              {modules.length} MODULES
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {modules.map((module) => {
              return (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => onNavigate(module.key)}
                  aria-label={`Open ${module.title}`}
                  className={[
                    'group relative flex min-h-[245px] flex-col overflow-hidden rounded-2xl border p-5 text-left',
                    'bg-gradient-to-br from-[#0b1d32] via-[#08182b] to-[#061426]',
                    'transition duration-200 hover:-translate-y-1 hover:border-cyan-500/70 hover:shadow-xl hover:shadow-cyan-950/30',
                    'focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#020e1c]',
                    module.featured ? 'border-emerald-500/50' : 'border-[#193653]',
                  ].join(' ')}
                >
                  <div className="pointer-events-none absolute -right-3 top-7 opacity-[0.10] transition group-hover:opacity-20">
                    {module.logoUrls.length === 1 ? (
                      <img src={module.logoUrls[0]} alt="" aria-hidden="true" className="h-28 w-28 object-contain" />
                    ) : (
                      <div className="flex items-center gap-2">
                        {module.logoUrls.map((url) => <img key={url} src={url} alt="" aria-hidden="true" className="h-20 w-20 object-contain" />)}
                      </div>
                    )}
                  </div>

                  <div className="relative flex w-full items-start justify-between gap-3">
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#132b45] p-2 ${module.iconColor}`}>
                      {module.logoUrls.map((url) => <img key={url} src={url} alt={`${module.title} logo`} loading="eager" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none'; }} className={module.logoUrls.length > 1 ? "h-7 w-7 object-contain" : "h-11 w-11 object-contain"} />)}
                    </div>
                    {module.featured ? (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300">
                        <ShieldCheck size={12} className="mr-1 inline" />
                        SAFE SIMULATION
                      </span>
                    ) : (
                      <ArrowUpRight size={19} className="text-slate-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-300" />
                    )}
                  </div>

                  <div className="relative mt-5">
                    <h3 className="text-lg font-bold text-slate-50">{module.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-blue-100/70">{module.description}</p>
                  </div>

                  <div className="relative mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {module.status}
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#14345f] text-white transition group-hover:bg-blue-600">
                      <ArrowRight size={17} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#193653] bg-gradient-to-r from-[#0a1b30] to-[#061426]">
          <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_2fr_1fr]">
            <div className="flex flex-col justify-center border-b border-[#193653] p-5 sm:p-6 xl:border-b-0 xl:border-r">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Rocket size={27} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">CI/CD Pipeline</h2>
                  <p className="mt-1 text-xs text-blue-200">Code to deployment</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-5 text-slate-400">
                Open each tool to inspect your pipeline workflow and results.
              </p>
            </div>

            <div className="flex items-center justify-around gap-1 border-b border-[#193653] px-2 py-5 sm:px-4 xl:border-b-0 xl:border-r">
              {pipelineStages.map((stage, index) => {
                return (
                  <div key={stage.name} className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate(stage.key)}
                      className="group flex min-w-0 flex-col items-center gap-2 rounded-xl p-2 transition hover:bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-500/50 bg-[#102743] text-blue-300 transition group-hover:border-cyan-400 group-hover:text-cyan-300 sm:h-14 sm:w-14">
                        <img src={stage.logoUrl} alt={`${stage.name} logo`} className="h-9 w-9 object-contain" loading="eager" decoding="async" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                      </span>
                      <span className="text-xs font-semibold text-white sm:text-sm">{stage.name}</span>
                      <span className="text-center text-[10px] text-blue-300 sm:text-xs">{stage.detail}</span>
                    </button>
                    {index < pipelineStages.length - 1 && <ArrowRight size={16} className="shrink-0 text-blue-500" />}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col justify-center gap-3 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
                <Activity size={17} /> Pipeline workspace
              </div>
              <p className="text-sm leading-5 text-slate-400">
                Build and deployment status should be verified in the connected Jenkins and Kubernetes modules.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('jenkins')}
                className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-500/60 bg-blue-600/10 px-4 py-2.5 text-sm font-semibold text-sky-300 transition hover:bg-blue-600/25 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                View Pipeline <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center gap-2 border-t border-[#193653] pt-4 text-xs text-slate-400">
          <ShieldCheck size={16} className="text-emerald-400" />
          AWS Labs are in simulation mode. This dashboard does not provision real AWS resources.
        </footer>
      </div>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#193653] bg-gradient-to-br from-[#0b1d32] to-[#071528] px-4 py-4 sm:min-w-[145px]">
      <Icon size={28} className={`shrink-0 ${color}`} />
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="mt-1 whitespace-nowrap text-xs text-blue-200">{label}</p>
      </div>
    </div>
  );
}
