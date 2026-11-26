
import { useCallback, useEffect, useState } from 'react';

import { AuthProvider, useAuth } from '@/context/AuthContext';

import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import JenkinsPage from '@/pages/jenkins/JenkinsPage';
import GitHubPage from '@/pages/GitHubPage';
import MonitoringPage from '@/pages/MonitoringPage';
import DockerPage from '@/pages/DockerPage';
import KubernetesPage from '@/pages/KubernetesPage';
import TerraformPage from '@/pages/TerraformPage';
import AnsiblePage from '@/pages/AnsiblePage';
import AWSPage from '@/pages/AWSPage';

import ComingSoon, {
  DocumentationPage,
  SettingsPage,
} from '@/pages/Placeholder';

import { Reports } from '@/pages/Reports';

import { BUILDS, PIPELINES } from '@/data/jenkinsData';
import type { ModuleKey } from '@/types';

const MODULE_PATHS: Record<ModuleKey, string> = {
  dashboard: '/dashboard',
  aws: '/aws',
  linux: '/linux',
  github: '/github',
  jenkins: '/jenkins',
  docker: '/docker',
  kubernetes: '/kubernetes',
  terraform: '/terraform',
  ansible: '/ansible',
  observability: '/observability',
  automation: '/automation',
  apache: '/apache',
  monitoring: '/monitoring',
  reports: '/reports',
  documentation: '/documentation',
  settings: '/settings',
};

const PATH_MODULES: Record<string, ModuleKey> = Object.fromEntries(
  Object.entries(MODULE_PATHS).map(([key, path]) => [path, key]),
) as Record<string, ModuleKey>;

function getModuleFromPath(pathname: string): ModuleKey {
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  if (normalizedPath === '/') {
    return 'dashboard';
  }

  return PATH_MODULES[normalizedPath] ?? 'dashboard';
}

function Shell() {
  const { user } = useAuth();

  const [module, setModule] = useState<ModuleKey>(() =>
    getModuleFromPath(window.location.pathname),
  );

  const [jenkinsTab, setJenkinsTab] = useState('overview');

  const [buildTrigger, setBuildTrigger] = useState<{
    name: string;
    n: number;
  } | null>(null);

  // Keep React in sync with the browser Back and Forward buttons.
  useEffect(() => {
    const handlePopState = () => {
      setModule(getModuleFromPath(window.location.pathname));
      setJenkinsTab('overview');
      setBuildTrigger(null);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback(
    (key: ModuleKey, tab?: string, build?: string) => {
      const targetPath = MODULE_PATHS[key];

      // Add a browser-history entry when moving to another module.
      if (window.location.pathname !== targetPath) {
        window.history.pushState(
          { cartForge: true, module: key },
          '',
          targetPath,
        );
      }

      setModule(key);

      if (key === 'jenkins' && tab) {
        setJenkinsTab(tab);

        if (tab === 'execution' && build) {
          setBuildTrigger({
            name: build,
            n: Date.now(),
          });
        }
      } else if (key === 'jenkins') {
        setJenkinsTab('overview');
      }
    },
    [],
  );

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950">
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl">
            {module === 'dashboard' && (
              <Dashboard onNavigate={navigate} />
            )}

            {module === 'aws' && <AWSPage />}

            {module === 'jenkins' && (
              <JenkinsPage
                initialTab={jenkinsTab}
                buildTrigger={buildTrigger}
                onNavigate={navigate}
              />
            )}

            {module === 'github' && <GitHubPage />}

            {module === 'observability' && <MonitoringPage />}

            {module === 'monitoring' && <MonitoringPage />}

            {module === 'docker' && <DockerPage />}

            {module === 'reports' && (
              <Reports builds={BUILDS} pipelines={PIPELINES} />
            )}







            {module === 'ansible' && <AnsiblePage />}

            {module === 'automation' && <ComingSoon module={module} />}



            {module === 'terraform' && <TerraformPage />}

            {module === 'kubernetes' && <KubernetesPage />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}




