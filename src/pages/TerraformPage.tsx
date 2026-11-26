
import { useEffect, useMemo, useState } from 'react';

import {
    Activity,
    CheckCircle2,
    CircleDot,
    Copy,
    FileCode2,
    Layers3,
    Play,
    RotateCcw,
    Server,
    ShieldCheck,
    Terminal,
    Wand2,
    XCircle,
} from 'lucide-react';

const API_BASE = (
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5000'
)
    .trim()
    .replace(/\/+$/, '');

type Status =
    | 'idle'
    | 'running'
    | 'success'
    | 'error';

interface TerraformStatusResponse {
    success?: boolean;
    project?: string;
    terraformVersion?: string;
    workspace?: string;
    error?: string;
}

const DEFAULT_TERRAFORM = `terraform {
    required_version = ">= 1.0"
}

variable "environment" {
    type = string
  default = "dev"
}

output "environment_name" {
    value = var.environment
} `;

export default function TerraformPage() {
    const [project, setProject] =
        useState('terraform-demo');

    const [content, setContent] =
        useState(DEFAULT_TERRAFORM);

    const [output, setOutput] =
        useState('');

    const [status, setStatus] =
        useState<Status>('idle');

    const [lastCommand, setLastCommand] =
        useState('');

    const [copied, setCopied] =
        useState(false);

    const [terraformVersion, setTerraformVersion] =
        useState('Loading...');

    const [workspace, setWorkspace] =
        useState('Loading...');

    const [dashboardError, setDashboardError] =
        useState('');

    const [latestOperation, setLatestOperation] =
        useState('None');

    async function loadTerraformStatus() {
        try {
            setDashboardError('');

            const response = await fetch(
                `${API_BASE}/api/terraform/status`,
            );

            const data =
                (await response.json()) as TerraformStatusResponse;

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error ||
                    'Unable to load Terraform status.',
                );
            }

            setTerraformVersion(
                data.terraformVersion ||
                'Unknown',
            );

            setWorkspace(
                data.workspace ||
                'default',
            );

            if (data.project) {
                setProject(data.project);
            }
        } catch (error) {
            setDashboardError(
                error instanceof Error
                    ? error.message
                    : 'Unable to connect to Terraform backend.',
            );

            setTerraformVersion('Unavailable');
            setWorkspace('Unavailable');
        }
    }

    useEffect(() => {
        void loadTerraformStatus();
    }, []);

    async function callTerraform(
        endpoint: string,
    ) {
        const operationName =
            endpoint.charAt(0).toUpperCase() +
            endpoint.slice(1);

        setStatus('running');
        setOutput('Running Terraform...');
        setLastCommand('');
        setLatestOperation(operationName);

        try {
            const response = await fetch(
                `${API_BASE}/api/terraform/${endpoint}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                    },
                    body: JSON.stringify({
                        project,
                        content,
                    }),
                },
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setStatus('error');

                setOutput(
                    data.output ||
                    data.error ||
                    'Terraform operation failed.',
                );

                setLastCommand(
                    data.command || '',
                );

                return;
            }

            setStatus('success');

            setOutput(
                data.output ||
                'Operation completed successfully.',
            );

            setLastCommand(
                data.command || '',
            );

            if (
                endpoint === 'format' &&
                typeof data.formatted === 'string'
            ) {
                setContent(data.formatted);
            }

            await loadTerraformStatus();
        } catch (error) {
            setStatus('error');

            setOutput(
                error instanceof Error
                    ? error.message
                    : 'Unable to connect to CartForge backend.',
            );
        }
    }

    function resetEditor() {
        setContent(DEFAULT_TERRAFORM);
        setOutput('');
        setLastCommand('');
        setStatus('idle');
        setLatestOperation('None');
    }

    async function copyOutput() {
        if (!output) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                output,
            );

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 1500);
        } catch {
            setCopied(false);
        }
    }

    const provider = useMemo(() => {
        const providerMatch =
            content.match(
                /\bprovider\s+"([^"]+)"/,
            );

        if (providerMatch?.[1]) {
            return providerMatch[1];
        }

        const requiredProviderMatch =
            content.match(
                /\b([a-zA-Z0-9_-]+)\s*=\s*\{/,
            );

        if (
            requiredProviderMatch?.[1] &&
            requiredProviderMatch[1] !== 'terraform'
        ) {
            return requiredProviderMatch[1];
        }

        return 'None configured';
    }, [content]);

    const resourceCount = useMemo(() => {
        const matches =
            content.match(
                /^\s*resource\s+"[^"]+"\s+"[^"]+"\s*\{/gm,
            );

        return matches?.length || 0;
    }, [content]);

    const statusLabel = {
        idle: 'Ready',
        running: 'Running',
        success: 'Success',
        error: 'Failed',
    }[status];

    const statusClass = {
        idle: 'text-slate-300',
        running: 'text-yellow-300',
        success: 'text-emerald-300',
        error: 'text-red-300',
    }[status];

    return (
        <div className="min-h-full bg-slate-950 p-6 text-slate-100">
            <div className="mx-auto max-w-7xl space-y-6">

                {/* Header */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15">
                                <FileCode2
                                    size={24}
                                    className="text-purple-400"
                                />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold">
                                    Terraform
                                </h1>

                                <p className="text-sm text-slate-400">
                                    Infrastructure as Code practice
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
                        <ShieldCheck
                            size={18}
                            className="text-emerald-400"
                        />

                        <div>
                            <div className="text-sm font-medium text-emerald-300">
                                Safe Local Mode
                            </div>

                            <div className="text-xs text-slate-400">
                                No AWS Apply or Destroy
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard */}
                <div>
                    <div className="mb-3 flex items-center gap-2">
                        <Activity
                            size={18}
                            className="text-purple-400"
                        />

                        <h2 className="text-lg font-semibold">
                            Terraform Dashboard
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

                        {/* Terraform Version */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Terraform
                                </span>

                                <Server
                                    size={17}
                                    className="text-purple-400"
                                />
                            </div>

                            <div className="truncate text-sm font-semibold text-white">
                                {terraformVersion}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                                CLI Version
                            </div>
                        </div>

                        {/* Project */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Project
                                </span>

                                <FileCode2
                                    size={17}
                                    className="text-blue-400"
                                />
                            </div>

                            <div className="truncate text-sm font-semibold text-white">
                                {project}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                                Current Project
                            </div>
                        </div>

                        {/* Workspace */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Workspace
                                </span>

                                <Layers3
                                    size={17}
                                    className="text-cyan-400"
                                />
                            </div>

                            <div className="truncate text-sm font-semibold text-white">
                                {workspace}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                                Active Workspace
                            </div>
                        </div>

                        {/* Provider */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Provider
                                </span>

                                <CircleDot
                                    size={17}
                                    className="text-orange-400"
                                />
                            </div>

                            <div className="truncate text-sm font-semibold text-white">
                                {provider}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                                Detected Provider
                            </div>
                        </div>

                        {/* Resource Count */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Resources
                                </span>

                                <Layers3
                                    size={17}
                                    className="text-emerald-400"
                                />
                            </div>

                            <div className="text-xl font-bold text-white">
                                {resourceCount}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                                In Configuration
                            </div>
                        </div>

                        {/* Latest Operation */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Latest Operation
                                </span>

                                {status === 'success' ? (
                                    <CheckCircle2
                                        size={17}
                                        className="text-emerald-400"
                                    />
                                ) : status === 'error' ? (
                                    <XCircle
                                        size={17}
                                        className="text-red-400"
                                    />
                                ) : (
                                    <Activity
                                        size={17}
                                        className="text-purple-400"
                                    />
                                )}
                            </div>

                            <div className="truncate text-sm font-semibold text-white">
                                {latestOperation}
                            </div>

                            <div
                                className={`mt - 1 text - xs ${statusClass} `}
                            >
                                {statusLabel}
                            </div>
                        </div>
                    </div>
                </div>

                {dashboardError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        Terraform status unavailable: {dashboardError}
                    </div>
                )}

                {/* Project Controls */}
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                                Project Name
                            </label>

                            <input
                                value={project}
                                onChange={(event) =>
                                    setProject(
                                        event.target.value,
                                    )
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                                placeholder="terraform-demo"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={resetEditor}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 md:w-auto"
                            >
                                <RotateCcw size={16} />
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="grid gap-6 xl:grid-cols-2">

                    {/* Editor */}
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <FileCode2
                                    size={18}
                                    className="text-purple-400"
                                />

                                <span className="font-semibold">
                                    main.tf
                                </span>
                            </div>

                            <span className="text-xs text-slate-500">
                                Terraform HCL
                            </span>
                        </div>

                        <div className="p-4">
                            <textarea
                                value={content}
                                onChange={(event) =>
                                    setContent(
                                        event.target.value,
                                    )
                                }
                                spellCheck={false}
                                className="min-h-[430px] w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-200 outline-none focus:border-purple-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 border-t border-slate-800 p-4">
                            <button
                                type="button"
                                disabled={
                                    status === 'running'
                                }
                                onClick={() =>
                                    callTerraform(
                                        'format',
                                    )
                                }
                                className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Wand2 size={16} />
                                Format
                            </button>

                            <button
                                type="button"
                                disabled={
                                    status === 'running'
                                }
                                onClick={() =>
                                    callTerraform(
                                        'validate',
                                    )
                                }
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <CheckCircle2 size={16} />
                                Validate
                            </button>

                            <button
                                type="button"
                                disabled={
                                    status === 'running'
                                }
                                onClick={() =>
                                    callTerraform(
                                        'plan',
                                    )
                                }
                                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Play size={16} />
                                Plan
                            </button>
                        </div>
                    </div>

                    {/* Output */}
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <Terminal
                                    size={18}
                                    className="text-emerald-400"
                                />

                                <span className="font-semibold">
                                    Terraform Output
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={copyOutput}
                                disabled={!output}
                                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"
                            >
                                <Copy size={14} />
                                {copied
                                    ? 'Copied'
                                    : 'Copy'}
                            </button>
                        </div>

                        {/* Status */}
                        <div className="border-b border-slate-800 px-5 py-3">
                            <div className="flex items-center gap-2 text-sm">
                                {status === 'running' && (
                                    <>
                                        <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />

                                        <span className="text-yellow-300">
                                            Running
                                        </span>
                                    </>
                                )}

                                {status === 'success' && (
                                    <>
                                        <CheckCircle2
                                            size={16}
                                            className="text-emerald-400"
                                        />

                                        <span className="text-emerald-300">
                                            Success
                                        </span>
                                    </>
                                )}

                                {status === 'error' && (
                                    <>
                                        <XCircle
                                            size={16}
                                            className="text-red-400"
                                        />

                                        <span className="text-red-300">
                                            Error
                                        </span>
                                    </>
                                )}

                                {status === 'idle' && (
                                    <>
                                        <span className="h-2 w-2 rounded-full bg-slate-500" />

                                        <span className="text-slate-400">
                                            Ready
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Command */}
                        {lastCommand && (
                            <div className="border-b border-slate-800 bg-slate-950 px-5 py-3">
                                <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                                    Command
                                </div>

                                <code className="text-xs text-purple-300">
                                    {lastCommand}
                                </code>
                            </div>
                        )}

                        {/* Terminal */}
                        <div className="min-h-[430px] bg-black p-5">
                            <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6 text-slate-300">
                                {output ||
                                    'Terraform output will appear here...'}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Safety Information */}
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <div className="flex gap-3">
                        <ShieldCheck
                            size={20}
                            className="mt-0.5 shrink-0 text-emerald-400"
                        />

                        <div>
                            <h2 className="font-semibold">
                                Safe Terraform Practice
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-400">
                                CartForge currently supports Terraform
                                formatting, validation, and planning.
                                Apply and Destroy operations are disabled
                                so learners can practice Terraform without
                                creating real cloud infrastructure.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
