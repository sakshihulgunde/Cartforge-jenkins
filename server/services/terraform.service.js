'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

const WORKSPACE_ROOT = path.join(
    ROOT_DIR,
    'terraform-workspaces',
);

const TERRAFORM_TIMEOUT = 120000;
const MAX_OUTPUT_SIZE = 1024 * 1024;

// ============================================================
// TERRAFORM CLI
// ============================================================

const TERRAFORM_WINDOWS_PATH =
    'C:\\Users\\saksh\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Hashicorp.Terraform_Microsoft.Winget.Source_8wekyb3d8bbwe\\terraform.exe';

const TERRAFORM_COMMAND =
    process.platform === 'win32' &&
        fs.existsSync(TERRAFORM_WINDOWS_PATH)
        ? TERRAFORM_WINDOWS_PATH
        : 'terraform';

console.log(
    `[Terraform] CLI command: ${TERRAFORM_COMMAND}`,
);

// ============================================================
// ALLOWED TERRAFORM FILES
// ============================================================

const ALLOWED_FILES = [
    'main.tf',
    'variables.tf',
    'outputs.tf',
    'providers.tf',
    'terraform.tfvars',
];

// ============================================================
// SAFE LOCAL DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_FILES = {
    'main.tf': `terraform {
  required_version = ">= 1.4"
}

resource "terraform_data" "cartforge_demo" {
  input = var.environment
}

output "environment_name" {
  value = var.environment
}

output "resource_id" {
  value = terraform_data.cartforge_demo.id
}
`,

    'variables.tf': `variable "environment" {
  description = "Environment name used by the CartForge Terraform lab."
  type        = string
  default     = "dev"
}
`,

    'outputs.tf': `output "environment_name" {
  description = "Current environment name."
  value       = var.environment
}

output "resource_id" {
  description = "Terraform-managed local resource identifier."
  value       = terraform_data.cartforge_demo.id
}
`,

    'providers.tf': `# Safe local Terraform lab.
#
# This file intentionally does not configure AWS,
# Azure, Google Cloud, or any other cloud provider.
#
# CartForge Safe Local Mode does not connect to
# the learner's personal cloud account.
`,

    'terraform.tfvars': `environment = "dev"
`,
};

// ============================================================
// WORKSPACE HELPERS
// ============================================================

function ensureWorkspaceRoot() {
    fs.mkdirSync(
        WORKSPACE_ROOT,
        {
            recursive: true,
        },
    );
}

function sanitizeProjectName(name) {
    const value = String(
        name || 'default',
    )
        .trim()
        .replace(
            /[^a-zA-Z0-9_-]/g,
            '-',
        )
        .replace(
            /-+/g,
            '-',
        )
        .replace(
            /^-|-$/g,
            '',
        );

    return value || 'default';
}

function getWorkspace(projectName) {
    ensureWorkspaceRoot();

    const safeName =
        sanitizeProjectName(
            projectName,
        );

    const root =
        path.resolve(
            WORKSPACE_ROOT,
        );

    const workspace =
        path.resolve(
            root,
            safeName,
        );

    const relativePath =
        path.relative(
            root,
            workspace,
        );

    if (
        relativePath.startsWith('..') ||
        path.isAbsolute(relativePath)
    ) {
        throw new Error(
            'Invalid Terraform workspace path.',
        );
    }

    fs.mkdirSync(
        workspace,
        {
            recursive: true,
        },
    );

    return workspace;
}

function sanitizeFileName(fileName) {
    const name =
        String(fileName || '')
            .trim()
            .toLowerCase();

    if (!ALLOWED_FILES.includes(name)) {
        throw new Error(
            `Terraform file "${fileName}" is not allowed.`,
        );
    }

    return name;
}

function getFilePath(
    workspace,
    fileName,
) {
    const safeFile =
        sanitizeFileName(
            fileName,
        );

    const filePath =
        path.resolve(
            workspace,
            safeFile,
        );

    const relativePath =
        path.relative(
            workspace,
            filePath,
        );

    if (
        relativePath.startsWith('..') ||
        path.isAbsolute(relativePath)
    ) {
        throw new Error(
            'Invalid Terraform file path.',
        );
    }

    return filePath;
}

// ============================================================
// COMMAND EXECUTION
// ============================================================

function runTerraform(
    args,
    cwd,
) {
    return new Promise(
        (resolve, reject) => {
            let child;

            try {
                child =
                    spawn(
                        TERRAFORM_COMMAND,
                        args,
                        {
                            cwd,
                            shell: false,
                            windowsHide: true,
                            env: {
                                ...process.env,
                                TF_IN_AUTOMATION: '1',
                            },
                        },
                    );
            } catch (error) {
                reject(error);
                return;
            }

            let stdout = '';
            let stderr = '';
            let finished = false;
            let outputTooLarge = false;

            const appendOutput = (
                current,
                data,
            ) => {
                const next =
                    current +
                    data.toString();

                if (
                    next.length >
                    MAX_OUTPUT_SIZE
                ) {
                    outputTooLarge = true;

                    return next.slice(
                        0,
                        MAX_OUTPUT_SIZE,
                    );
                }

                return next;
            };

            const timeout =
                setTimeout(
                    () => {
                        if (finished) {
                            return;
                        }

                        finished = true;

                        try {
                            child.kill();
                        } catch {
                            // Ignore kill errors.
                        }

                        reject(
                            new Error(
                                `Terraform command timed out after ${TERRAFORM_TIMEOUT / 1000} seconds.`,
                            ),
                        );
                    },
                    TERRAFORM_TIMEOUT,
                );

            child.stdout.on(
                'data',
                (data) => {
                    stdout =
                        appendOutput(
                            stdout,
                            data,
                        );
                },
            );

            child.stderr.on(
                'data',
                (data) => {
                    stderr =
                        appendOutput(
                            stderr,
                            data,
                        );
                },
            );

            child.on(
                'error',
                (error) => {
                    if (finished) {
                        return;
                    }

                    finished = true;

                    clearTimeout(
                        timeout,
                    );

                    if (
                        error.code ===
                        'ENOENT'
                    ) {
                        reject(
                            new Error(
                                `Terraform CLI was not found.

Configured path:
${TERRAFORM_WINDOWS_PATH}

Make sure Terraform is installed and available on PATH.`,
                            ),
                        );

                        return;
                    }

                    reject(error);
                },
            );

            child.on(
                'close',
                (code) => {
                    if (finished) {
                        return;
                    }

                    finished = true;

                    clearTimeout(
                        timeout,
                    );

                    resolve({
                        code:
                            typeof code ===
                                'number'
                                ? code
                                : 1,

                        stdout,

                        stderr,

                        outputTooLarge,
                    });
                },
            );
        },
    );
}

// ============================================================
// RESULT HELPERS
// ============================================================

function combineOutput(
    result,
) {
    const parts = [
        result.stdout,
        result.stderr,
    ].filter(Boolean);

    let output =
        parts.join('\n').trim();

    if (result.outputTooLarge) {
        output +=
            '\n\n[CartForge] Output was truncated because it exceeded the maximum allowed size.';
    }

    return output;
}

function baseResult(
    projectName,
    command,
    result,
) {
    return {
        success:
            result.code === 0,

        project:
            sanitizeProjectName(
                projectName,
            ),

        command,

        output:
            combineOutput(
                result,
            ),

        exitCode:
            result.code,
    };
}

// ============================================================
// FILE OPERATIONS
// ============================================================

function writeFile(
    workspace,
    fileName,
    content,
) {
    if (
        typeof content !==
        'string'
    ) {
        throw new Error(
            'Terraform configuration must be a string.',
        );
    }

    if (
        content.length >
        100000
    ) {
        throw new Error(
            'Terraform configuration file is too large.',
        );
    }

    const filePath =
        getFilePath(
            workspace,
            fileName,
        );

    fs.writeFileSync(
        filePath,
        content,
        'utf8',
    );

    return filePath;
}

function writeFiles(
    workspace,
    files,
) {
    if (
        !files ||
        typeof files !==
        'object'
    ) {
        throw new Error(
            'Terraform files must be an object.',
        );
    }

    for (
        const [fileName, content]
        of Object.entries(files)
    ) {
        writeFile(
            workspace,
            fileName,
            content,
        );
    }
}

function writeMainTf(
    workspace,
    content,
) {
    return writeFile(
        workspace,
        'main.tf',
        content,
    );
}

function getFiles(
    projectName,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    const files =
        {};

    for (
        const fileName
        of ALLOWED_FILES
    ) {
        const filePath =
            getFilePath(
                workspace,
                fileName,
            );

        files[fileName] =
            fs.existsSync(
                filePath,
            )
                ? fs.readFileSync(
                    filePath,
                    'utf8',
                )
                : '';
    }

    return {
        success: true,

        project:
            sanitizeProjectName(
                projectName,
            ),

        files,
    };

}

function saveFiles(
    projectName,
    files,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    writeFiles(
        workspace,
        files,
    );

    return getFiles(
        projectName,
    );
}

function resetProject(
    projectName,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    for (
        const fileName
        of ALLOWED_FILES
    ) {
        const filePath =
            getFilePath(
                workspace,
                fileName,
            );

        if (
            fs.existsSync(
                filePath,
            )
        ) {
            fs.unlinkSync(
                filePath,
            );
        }
    }

    writeFiles(
        workspace,
        DEFAULT_FILES,
    );

    return getFiles(
        projectName,
    );
}

// ============================================================
// VERSION
// ============================================================

async function version(
    projectName = 'terraform-demo',
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    const result =
        await runTerraform(
            [
                'version',
            ],
            workspace,
        );

    return baseResult(
        projectName,
        'terraform version',
        result,
    );
}

// ============================================================
// INIT
// ============================================================

async function init(
    projectName,
    files,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    if (files) {
        writeFiles(
            workspace,
            files,
        );
    }

    const result =
        await runTerraform(
            [
                'init',
                '-backend=false',
                '-input=false',
                '-no-color',
            ],
            workspace,
        );

    return baseResult(
        projectName,
        'terraform init -backend=false -input=false -no-color',
        result,
    );
}

// ============================================================
// FORMAT
// ============================================================

async function format(
    projectName,
    content,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    writeMainTf(
        workspace,
        content,
    );

    const result =
        await runTerraform(
            [
                'fmt',
                'main.tf',
            ],
            workspace,
        );

    const mainTf =
        getFilePath(
            workspace,
            'main.tf',
        );

    const formatted =
        fs.existsSync(
            mainTf,
        )
            ? fs.readFileSync(
                mainTf,
                'utf8',
            )
            : content;

    return {
        ...baseResult(
            projectName,
            'terraform fmt main.tf',
            result,
        ),

        formatted,
    };
}

// ============================================================
// FORMAT ALL
// ============================================================

async function formatAll(
    projectName,
    files,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    if (files) {
        writeFiles(
            workspace,
            files,
        );
    }

    const result =
        await runTerraform(
            [
                'fmt',
            ],
            workspace,
        );

    const resultData =
        baseResult(
            projectName,
            'terraform fmt',
            result,
        );

    return {
        ...resultData,
        files:
            getFiles(
                projectName,
            ).files,
    };
}

// ============================================================
// VALIDATE
// ============================================================

async function validate(
    projectName,
    content,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    writeMainTf(
        workspace,
        content,
    );

    const initResult =
        await runTerraform(
            [
                'init',
                '-backend=false',
                '-input=false',
                '-no-color',
            ],
            workspace,
        );

    if (
        initResult.code !== 0
    ) {
        return baseResult(
            projectName,
            'terraform init -backend=false -input=false -no-color',
            initResult,
        );
    }

    const result =
        await runTerraform(
            [
                'validate',
                '-no-color',
            ],
            workspace,
        );

    return baseResult(
        projectName,
        'terraform validate -no-color',
        result,
    );
}

// ============================================================
// VALIDATE ALL FILES
// ============================================================

async function validateAll(
    projectName,
    files,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    if (files) {
        writeFiles(
            workspace,
            files,
        );
    }

    const initResult =
        await runTerraform(
            [
                'init',
                '-backend=false',
                '-input=false',
                '-no-color',
            ],
            workspace,
        );

    if (
        initResult.code !== 0
    ) {
        return baseResult(
            projectName,
            'terraform init -backend=false -input=false -no-color',
            initResult,
        );
    }

    const result =
        await runTerraform(
            [
                'validate',
                '-no-color',
            ],
            workspace,
        );

    return baseResult(
        projectName,
        'terraform validate -no-color',
        result,
    );
}

// ============================================================
// PLAN
// ============================================================

async function plan(
    projectName,
    content,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    writeMainTf(
        workspace,
        content,
    );

    const initResult =
        await runTerraform(
            [
                'init',
                '-backend=false',
                '-input=false',
                '-no-color',
            ],
            workspace,
        );

    if (
        initResult.code !== 0
    ) {
        return baseResult(
            projectName,
            'terraform init -backend=false -input=false -no-color',
            initResult,
        );
    }

    const validateResult =
        await runTerraform(
            [
                'validate',
                '-no-color',
            ],
            workspace,
        );

    if (
        validateResult.code !== 0
    ) {
        return baseResult(
            projectName,
            'terraform validate -no-color',
            validateResult,
        );
    }

    const result =
        await runTerraform(
            [
                'plan',
                '-input=false',
                '-lock=false',
                '-no-color',
            ],
            workspace,
        );

    return baseResult(
        projectName,
        'terraform plan -input=false -lock=false -no-color',
        result,
    );
}

// ============================================================
// PLAN ALL
// ============================================================

async function planAll(
    projectName,
    files,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    if (files) {
        writeFiles(
            workspace,
            files,
        );
    }

    const initResult =
        await runTerraform(
            [
                'init',
                '-backend=false',
                '-input=false',
                '-no-color',
            ],
            workspace,
        );

    if (
        initResult.code !== 0
    ) {
        return baseResult(
            projectName,
            'terraform init -backend=false -input=false -no-color',
            initResult,
        );
    }

    const validateResult =
        await runTerraform(
            [
                'validate',
                '-no-color',
            ],
            workspace,
        );

    if (
        validateResult.code !== 0
    ) {
        return baseResult(
            projectName,
            'terraform validate -no-color',
            validateResult,
        );
    }

    const result =
        await runTerraform(
            [
                'plan',
                '-input=false',
                '-lock=false',
                '-no-color',
            ],
            workspace,
        );

    return baseResult(
        projectName,
        'terraform plan -input=false -lock=false -no-color',
        result,
    );
}

// ============================================================
// STATE LIST
// ============================================================

async function stateList(
    projectName,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    const result =
        await runTerraform(
            [
                'state',
                'list',
            ],
            workspace,
        );

    return {
        ...baseResult(
            projectName,
            'terraform state list',
            result,
        ),

        resources:
            result.stdout
                .split(/\r?\n/)
                .map(
                    (line) =>
                        line.trim(),
                )
                .filter(Boolean),
    };
}

// ============================================================
// OUTPUT
// ============================================================

async function output(
    projectName,
) {
    const workspace =
        getWorkspace(
            projectName,
        );

    const result =
        await runTerraform(
            [
                'output',
                '-no-color',
            ],
            workspace,
        );

    return baseResult(
        projectName,
        'terraform output -no-color',
        result,
    );
}

// ============================================================
// DASHBOARD STATUS
// ============================================================

async function getStatus(
    projectName,
) {
    const safeProject =
        sanitizeProjectName(
            projectName,
        );

    const workspace =
        getWorkspace(
            safeProject,
        );

    let terraformVersion =
        'Unavailable';

    try {
        const versionResult =
            await runTerraform(
                [
                    'version',
                ],
                workspace,
            );

        if (
            versionResult.code === 0
        ) {
            const firstLine =
                versionResult.stdout
                    .split(/\r?\n/)
                    .find(
                        (line) =>
                            line
                                .trim()
                                .length > 0,
                    );

            if (firstLine) {
                terraformVersion =
                    firstLine.trim();
            }
        }
    } catch {
        // Keep dashboard usable.
    }

    const stateResult =
        await runTerraform(
            [
                'state',
                'list',
            ],
            workspace,
        );

    const resources =
        stateResult.code === 0
            ? stateResult.stdout
                .split(/\r?\n/)
                .map(
                    (line) =>
                        line.trim(),
                )
                .filter(Boolean)
            : [];

    const files =
        getFiles(
            safeProject,
        ).files;

    return {
        success: true,

        project:
            safeProject,

        terraformVersion,

        workspace,

        resourceCount:
            resources.length,

        resources,

        files:
            Object.keys(
                files,
            ).filter(
                (fileName) =>
                    files[fileName]
                        .trim()
                        .length > 0,
            ),

        safeMode: true,

        applyEnabled: false,

        destroyEnabled: false,
    };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    ALLOWED_FILES,
    DEFAULT_FILES,

    format,
    formatAll,

    validate,
    validateAll,

    plan,
    planAll,

    init,

    version,

    getFiles,
    saveFiles,
    resetProject,

    stateList,
    output,

    getStatus,

    sanitizeProjectName,
};
