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
  role: "super_admin" | "hr_admin" | "employee";
}

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const stored = localStorage.getItem("access_token");

      if (stored) {
        try {
          const response = await apiClient.getMe();

          if (response.success && response.data) {
            const { user } = response.data;

            const profile: UserProfile = {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };

            setUser(profile);
          }
        } catch (error) {
          localStorage.removeItem("access_token");
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
    try {
      const response = await apiClient.login(email, password);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Login failed");
      }

      const { user: userData, token } = response.data;
      const profile: UserProfile = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      };

      persistUser(profile, token);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message || "Invalid email or password");
      }
      throw new Error("Invalid email or password");
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const response = await apiClient.register(email, password, name);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Registration failed");
      }

      const { user: userData, token } = response.data;
      const profile: UserProfile = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role || "employee",
      };

      persistUser(profile, token);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message || "Registration failed");
      }
      throw new Error("Registration failed");
    }
  };

  const loginWithGoogle = async () => {
    throw new Error("Google login not yet implemented");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("cubit-auth-user");
    localStorage.removeItem("cubit-role");
  };

  const forgotPassword = async (email: string) => {
    // TODO: Implement forgot password endpoint in backend
    throw new Error("Forgot password not yet implemented");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        logout,
        forgotPassword,
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
