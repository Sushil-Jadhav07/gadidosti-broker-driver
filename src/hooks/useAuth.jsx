import { createContext, useContext, useState, useCallback } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

const STORAGE_KEY = {
  broker: "ssk_broker_auth",
  driver: "ssk_driver_auth",
};

const loadStoredUser = () => {
  try {
    const b = localStorage.getItem(STORAGE_KEY.broker);
    if (b) { const d = JSON.parse(b); return { ...d.user, role: "broker", tokens: d.tokens }; }
    const d = localStorage.getItem(STORAGE_KEY.driver);
    if (d) { const p = JSON.parse(d); return { ...p.user, role: "driver", tokens: p.tokens }; }
  } catch {}
  return null;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser);

  const persistSession = useCallback((userData, tokens) => {
    const key = STORAGE_KEY[userData.role] || STORAGE_KEY.broker;
    localStorage.setItem(key, JSON.stringify({ user: userData, tokens }));
    setUser({ ...userData, tokens });
  }, []);

  const clearSession = useCallback((role) => {
    if (role) {
      localStorage.removeItem(STORAGE_KEY[role]);
    } else {
      localStorage.removeItem(STORAGE_KEY.broker);
      localStorage.removeItem(STORAGE_KEY.driver);
    }
    setUser(null);
  }, []);

  const loginBroker = useCallback(async (phone, password) => {
    const data = await api.post("/api/auth/login", { phone, password });
    if (!data.success) throw new Error(data.message || "Login failed");
    if (data.data.user.role !== "broker") throw new Error("Not a broker account");
    persistSession(data.data.user, data.data.tokens);
    return data.data.user;
  }, [persistSession]);

  const loginDriver = useCallback(async (phone, password) => {
    const data = await api.post("/api/auth/login", { phone, password });
    if (!data.success) throw new Error(data.message || "Login failed");
    if (data.data.user.role !== "driver") throw new Error("Not a driver account");
    persistSession(data.data.user, data.data.tokens);
    return data.data.user;
  }, [persistSession]);

  // backward-compat alias
  const login = loginBroker;

  const registerUser = useCallback(async ({ name, phone, password, role, business_name, vehicle_registration }) => {
    const payload = { name, phone, password, role };
    if (business_name) payload.business_name = business_name;
    if (vehicle_registration) payload.vehicle_registration = vehicle_registration;
    const data = await api.post("/api/auth/register", payload);
    if (!data.success) throw new Error(data.message || "Registration failed");
    return data.data;
  }, []);

  const sendOtp = useCallback(async (phone) => {
    const data = await api.post("/api/auth/otp/send", { phone, purpose: "phone_verify" });
    if (!data.success) throw new Error(data.message || "Failed to send OTP");
    return data.data;
  }, []);

  const verifyOtp = useCallback(async (phone, otp) => {
    const data = await api.post("/api/auth/otp/verify", { phone, otp, purpose: "phone_verify" });
    if (!data.success) throw new Error(data.message || "Invalid or expired OTP");
    return data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (user?.tokens) {
        await api.post("/api/auth/logout", { refresh_token: user.tokens.refresh_token }, user.tokens.access_token);
      }
    } catch {}
    clearSession(user?.role);
  }, [user, clearSession]);

  const refreshTokens = useCallback(async () => {
    if (!user?.tokens?.refresh_token) return false;
    try {
      const data = await api.post("/api/auth/refresh-token", { refresh_token: user.tokens.refresh_token });
      if (data.success) {
        persistSession(user, data.data.tokens);
        return true;
      }
    } catch {}
    clearSession(user?.role);
    return false;
  }, [user, persistSession, clearSession]);

  return (
    <AuthContext.Provider value={{ user, login, loginBroker, loginDriver, registerUser, sendOtp, verifyOtp, logout, refreshTokens }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
