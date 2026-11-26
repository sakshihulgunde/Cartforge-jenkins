import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';

import type { User } from '@/types';

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

const DEMO_USER: User = {
  name: 'Sakshi Hulgunde',
  email: 'sakshihulgunde28@gmail.com',
  role: 'DevOps ',
  avatar: 'SH',
};

const AUTH_STORAGE_KEY = 'cartforge_auth_user';

function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    return JSON.parse(stored) as User;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(
    getStoredUser,
  );

  const login = (
    email: string,
    _password: string,
  ) => {
    if (
      email.trim().length > 0 &&
      _password.trim().length > 0
    ) {
      setUser(DEMO_USER);

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(DEMO_USER),
      );

      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <Ctx.Provider
      value={{
        user,
        login,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);

  if (!ctx) {
    throw new Error(
      'useAuth must be inside AuthProvider',
    );
  }

  return ctx;
}