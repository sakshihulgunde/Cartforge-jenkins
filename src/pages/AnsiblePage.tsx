
import { useState } from 'react';
import {
  Activity,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Code2,
  Copy,
  FileCode2,
  ListChecks,
  Play,
  RotateCcw,
  Server,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

type Tab = 'overview' | 'playbook' | 'inventory' | 'scenarios';

const EXAMPLES = {
  nginx: `---
- name: Install and start Nginx
  hosts: webservers
  become: true

  tasks:
    - name: Install Nginx
      ansible.builtin.package:
        name: nginx
        state: present

    - name: Start Nginx
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true`,
  packages: `---
- name: Update Linux packages
  hosts: all
  become: true

  tasks:
    - name: Refresh package cache
      ansible.builtin.apt:
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Install curl
      ansible.builtin.package:
        name: curl
        state: present`,
  users: `---
- name: Configure application user
  hosts: webservers
  become: true

  tasks:
    - name: Create application group
      ansible.builtin.group:
        name: appgroup
        state: present

    - name: Create application user
      ansible.builtin.user:
        name: appuser
        group: appgroup
        shell: /bin/bash
        state: present`,
  facts: `---
- name: Gather server information
  hosts: all

  tasks:
    - name: Display operating system
      ansible.builtin.debug:
        msg: "OS: {{ ansible_distribution }}"

    - name: Display hostname
      ansible.builtin.debug:
        msg: "Host: {{ inventory_hostname }}"`,
};

const SCENARIOS = [
  {
    id: 'nginx',
    title: 'Install and start Nginx',
    level: 'Beginner',
    description: 'Install a web server and ensure its service is running.',
    code: EXAMPLES.nginx,
  },
  {
    id: 'packages',
    title: 'Update Linux packages',
    level: 'Beginner',
    description: 'Refresh package metadata and install a utility.',
    code: EXAMPLES.packages,
  },
  {
    id: 'users',
    title: 'Manage Linux users',
    level: 'Intermediate',
    description: 'Create an application group and user.',
    code: EXAMPLES.users,
  },
  {
    id: 'facts',
    title: 'Gather server facts',
    level: 'Intermediate',
    description: 'Explore Ansible facts and inventory host variables.',
    code: EXAMPLES.facts,
  },
];

const INVENTORY_EXAMPLE = `[webservers]
web01 ansible_host=192.0.2.10
web02 ansible_host=192.0.2.11

[databases]
db01 ansible_host=192.0.2.20

[all:vars]
ansible_user=ubuntu`;

export default function AnsiblePage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [playbook, setPlaybook] = useState(EXAMPLES.nginx);
  const [inventory, setInventory] = useState(INVENTORY_EXAMPLE);
  const [selectedScenario, setSelectedScenario] = useState('nginx');
  const [output, setOutput] = useState<string[]>([]);
  const [result, setResult] = useState<'idle' | 'valid' | 'invalid' | 'simulated'>('idle');

  function validatePlaybook() {
    const errors: string[] = [];

    if (!playbook.trim()) errors.push('Playbook cannot be empty.');
    if (!/^\s*-\s+name\s*:/m.test(playbook)) {
      errors.push('Add a play named with "- name:".');
    }
    if (!/^\s*hosts\s*:/m.test(playbook)) {
      errors.push('Add a hosts: target.');
    }
    if (!/^\s*tasks\s*:/m.test(playbook)) {
      errors.push('Add a tasks: section.');
    }
    if (!/^\s{4,}[a-zA-Z0-9_.]+\s*:/m.test(playbook)) {
      errors.push('Add at least one task with a module or task field.');
    }
    if (/\t/.test(playbook)) {
      errors.push('YAML indentation should use spaces, not tabs.');
    }

    if (errors.length) {
      setResult('invalid');
      setOutput(['Local playbook checks failed:', ...errors.map((e) => `ERROR: ${e}`)]);
    } else {
      setResult('valid');
      setOutput([
        'Local structure checks passed.',
        'A play name, hosts, tasks and task fields were detected.',
        'Note: this is a basic check, not ansible-playbook --syntax-check.',
        'No hosts were contacted and no commands were executed.',
      ]);
    }
  }

  function simulateRun() {
    const errors: string[] = [];

    if (!playbook.trim()) errors.push('Playbook is empty.');
    if (!/^\s*-\s+name\s*:/m.test(playbook)) errors.push('Missing play name.');
    if (!/^\s*hosts\s*:/m.test(playbook)) errors.push('Missing hosts field.');
    if (!/^\s*tasks\s*:/m.test(playbook)) errors.push('Missing tasks section.');

    if (errors.length) {
      setResult('invalid');
      setOutput(['Simulation could not start.', ...errors.map((e) => `ERROR: ${e}`)]);
      return;
    }

    const taskNames = [...playbook.matchAll(/^\s*-\s+name:\s*(.+)$/gm)]
      .map((match) => match[1].trim());
    const tasks = taskNames.length ? taskNames : ['Unnamed task'];

    setResult('simulated');
    setOutput([
      'CartForge Ansible Lab — SIMULATION MODE',
      'Execution target: simulated hosts only',
      `Inventory groups detected: ${(inventory.match(/^\[[^\]]+\]/gm) || []).join(', ') || 'None detected'}`,
      '',
      'PLAY [Learning scenario]',
      ...tasks.map((name) => `TASK [${name}] ... ok (simulated)`),
      '',
      `PLAY RECAP: ${tasks.length} task(s) simulated`,
      'Changed: 0 | Failed: 0 | Unreachable: 0',
      '',
      'This is a demonstration only. Ansible was not launched and no real server was changed.',
    ]);
  }

  function chooseScenario(id: string) {
    const scenario = SCENARIOS.find((item) => item.id === id);
    if (!scenario) return;
    setSelectedScenario(id);
    setPlaybook(scenario.code);
    setOutput([]);
    setResult('idle');
    setTab('playbook');
  }

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'playbook', label: 'Playbook Lab', icon: FileCode2 },
    { id: 'inventory', label: 'Inventory', icon: Server },
    { id: 'scenarios', label: 'Scenarios', icon: ListChecks },
  ];

  return (
    <div className="min-h-full bg-slate-50 p-5 sm:p-8">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50">
            <Code2 size={25} className="text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ansible Learning Lab</h1>
            <p className="mt-1 text-sm text-slate-500">
              Learn configuration management through practical playbooks.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          <ShieldCheck size={15} />
          Safe simulation mode
        </span>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={BookOpen} label="Learning examples" value="4 scenarios" />
        <Stat icon={FileCode2} label="Playbook editor" value="YAML" />
        <Stat icon={ShieldCheck} label="Real server changes" value="Disabled" />
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              tab === id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="space-y-6">
          <section className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-300">
              Configuration management
            </p>
            <h2 className="mt-3 text-2xl font-bold">Automate repetitive server tasks</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Explore inventories, YAML playbooks, modules, variables and
              idempotent configuration. Use the editor to check your structure
              and preview simulated task output without connecting to servers.
            </p>
            <button
              type="button"
              onClick={() => setTab('playbook')}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-600"
            >
              <Terminal size={16} />
              Open playbook editor
            </button>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-900">Start with a scenario</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => chooseScenario(scenario.id)}
                  className="rounded-xl border border-slate-200 bg-white p-5 text-left transition hover:border-rose-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-slate-900">{scenario.title}</h3>
                    <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">
                      {scenario.level}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-5 text-slate-500">
                    {scenario.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                    Load example <Play size={13} />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <CircleAlert size={19} className="mt-0.5 shrink-0 text-amber-700" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">Execution safety</h3>
                <p className="mt-1 text-sm leading-5 text-amber-800">
                  The Run Simulation button only generates illustrative output in
                  your browser. It does not install Ansible, SSH into a host, or
                  execute a playbook.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === 'playbook' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">Playbook editor</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Edit YAML and run local structure checks.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlaybook(EXAMPLES.nginx);
                    setOutput([]);
                    setResult('idle');
                    setSelectedScenario('nginx');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw size={14} /> Reset
                </button>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(playbook)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Copy size={14} /> Copy YAML
                </button>
              </div>
            </div>

            <textarea
              aria-label="Ansible YAML playbook editor"
              spellCheck={false}
              value={playbook}
              onChange={(event) => {
                setPlaybook(event.target.value);
                setResult('idle');
              }}
              className="min-h-[390px] w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-emerald-200 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={validatePlaybook}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <CheckCircle2 size={16} /> Check structure
              </button>
              <button
                type="button"
                onClick={simulateRun}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
              >
                <Play size={16} /> Run simulation
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-bold text-slate-900">Example selector</h3>
              <p className="mt-1 text-xs text-slate-500">Load a starter playbook into the editor.</p>
              <div className="mt-3 space-y-2">
                {SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => chooseScenario(scenario.id)}
                    className={`w-full rounded-lg border p-3 text-left text-sm ${
                      selectedScenario === scenario.id
                        ? 'border-rose-300 bg-rose-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block font-semibold text-slate-800">{scenario.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">{scenario.level}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-bold text-slate-900">What to learn</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>• `hosts` selects inventory targets.</li>
                <li>• `tasks` defines work in order.</li>
                <li>• Modules describe the desired state.</li>
                <li>• `become: true` requests privilege escalation.</li>
                <li>• Idempotency avoids unnecessary changes.</li>
              </ul>
            </div>
          </aside>

          {output.length > 0 && (
            <section className="rounded-xl border border-slate-700 bg-slate-950 p-4 xl:col-span-3">
              <div className="mb-3 flex items-center gap-2">
                <Terminal size={17} className="text-emerald-400" />
                <h3 className="font-bold text-white">Lab output</h3>
                <span className={`ml-auto rounded-full px-2 py-1 text-[10px] font-bold ${
                  result === 'invalid'
                    ? 'bg-red-500/15 text-red-300'
                    : result === 'simulated'
                      ? 'bg-blue-500/15 text-blue-300'
                      : 'bg-emerald-500/15 text-emerald-300'
                }`}>
                  {result === 'invalid' ? 'CHECK FAILED' : result === 'simulated' ? 'SIMULATED' : 'STRUCTURE CHECK'}
                </span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-emerald-200">
                {output.join('\n')}
              </pre>
            </section>
          )}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Inventory editor</h2>
            <p className="mt-1 text-sm text-slate-500">
              Define example groups and host addresses using INI syntax.
            </p>
            <textarea
              aria-label="Ansible inventory editor"
              spellCheck={false}
              value={inventory}
              onChange={(event) => setInventory(event.target.value)}
              className="mt-4 min-h-72 w-full rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-sky-200 outline-none focus:border-rose-400"
            />
            <p className="mt-3 text-xs leading-5 text-amber-700">
              The example IP addresses use the documentation-only range
              192.0.2.0/24. These hosts are not contacted.
            </p>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Inventory concepts</h2>
            <div className="mt-4 space-y-3">
              <Concept title="[webservers]" detail="A host group you can target from a playbook." />
              <Concept title="ansible_host" detail="The address Ansible uses to reach a host." />
              <Concept title="ansible_user" detail="The remote account used for a connection." />
              <Concept title="Group variables" detail="Shared settings for hosts in a group." />
            </div>
            <div className="mt-5 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-700">Example command (not executed)</p>
              <code className="mt-2 block break-all text-xs text-slate-600">
                ansible-playbook -i inventory.ini playbook.yml --check
              </code>
            </div>
          </section>
        </div>
      )}

      {tab === 'scenarios' && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SCENARIOS.map((scenario, index) => (
            <article key={scenario.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-rose-600">LAB {String(index + 1).padStart(2, '0')}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                  {scenario.level}
                </span>
              </div>
              <h3 className="mt-3 font-bold text-slate-900">{scenario.title}</h3>
              <p className="mt-2 text-sm leading-5 text-slate-500">{scenario.description}</p>
              <button
                type="button"
                onClick={() => chooseScenario(scenario.id)}
                className="mt-4 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
              >
                Open lab
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="rounded-lg bg-slate-100 p-2.5 text-slate-700">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function Concept({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 p-3">
      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
