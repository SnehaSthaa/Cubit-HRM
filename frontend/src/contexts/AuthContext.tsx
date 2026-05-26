import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { apiClient } from "@/services/apiClient";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: ("super_admin" | "hr_admin" | "employee")[];
  activeRole: "super_admin" | "hr_admin" | "employee";
  profile_image?: string;
  permissions: string[];
}

// ── Typed shapes for API responses ───────────────────────────────────────────
interface AuthUserData {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "hr_admin" | "employee";
}

interface AuthResponseData {
  user: AuthUserData;
  token: string;
}

interface MeUserData {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "hr_admin" | "employee";
}

interface MeResponseData {
  user: MeUserData;
  employee?: unknown;
}
// ─────────────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  updateUser: (partial: Partial<UserProfile>) => void;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(): Promise<UserProfile> {
  const meResponse = await apiClient.getMe();
  if (!meResponse.success || !meResponse.data) {
    throw new Error("Failed to load user profile");
  }
  const { user, employee } = meResponse.data;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: Array.isArray(user.role) ? user.role : [user.role],
    activeRole:
      user.activeRole ?? (Array.isArray(user.role) ? user.role[0] : user.role),
    profile_image: employee?.profile_image ?? undefined,
    permissions: user.permissions ?? [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const profile = await fetchProfile();
          setUser(profile);
        
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("cubit-auth-user");
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const persistUser = (profile: UserProfile, token: string) => {
    setUser(profile);
    localStorage.setItem("access_token", token);
    localStorage.setItem("cubit-auth-user", JSON.stringify(profile));
  };

  const login = async (email: string, password: string) => {
    
      const response = await apiClient.login(email, password);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Login failed");
      }

 
    
    // Store token first so fetchProfile's apiClient picks it up
    localStorage.setItem("access_token", response.data.token);
    const profile = await fetchProfile();
    persistUser(profile, response.data.token);
  };

  const signup = async (email: string, password: string, name: string) => {
   
      const response = await apiClient.register(email, password, name);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Registration failed");
      }

    
    // Same pattern as login — store token, then fetch full profile
    localStorage.setItem("access_token", response.data.token);
    const profile = await fetchProfile();
    persistUser(profile, response.data.token);
  };

  const updateUser = (partial: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem("cubit-auth-user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("cubit-auth-user");
    localStorage.removeItem("cubit-role");
  };

  const hasPermission = (perm: string): boolean =>
    user?.permissions?.includes(perm) ?? false;

  const loginWithGoogle = async () => {
    throw new Error("Google login not yet implemented");
  };

  const forgotPassword = async (_email: string) => {
    throw new Error("Forgot password not yet implemented");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        updateUser,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        logout,
        forgotPassword,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}