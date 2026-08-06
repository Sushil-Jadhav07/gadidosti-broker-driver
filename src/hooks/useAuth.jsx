import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { api } from "../services/api";
import { unregisterFcmToken } from "../lib/fcm";

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
  const kycRefreshedForUserRef = useRef(null);

  // Always reflects the truly-current session, unlike a value closed over inside an async
  // callback (see updateUser below) — a promise started under Account A's render can still
  // resolve after the user has logged out and logged in as Account B, so anything reading
  // the closed-over `user` at that point would act on stale, wrong-account data.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

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

  const loginBroker = useCallback(async (email, password) => {
    const data = await api.post("/api/auth/login", { email, password });
    if (!data.success) throw new Error(data.message || "Login failed");
    if (data.data.user.role !== "broker") throw new Error("Not a broker account");
    persistSession(data.data.user, data.data.tokens);
    return data.data.user;
  }, [persistSession]);

  const loginDriver = useCallback(async (email, password) => {
    const data = await api.post("/api/auth/login", { email, password });
    if (!data.success) throw new Error(data.message || "Login failed");
    if (data.data.user.role !== "driver") throw new Error("Not a driver account");
    persistSession(data.data.user, data.data.tokens);
    return data.data.user;
  }, [persistSession]);

  const googleLogin = useCallback(async (idToken, role = "broker") => {
    if (!["broker", "driver"].includes(role)) throw new Error("Invalid role for this portal");
    const data = await api.post("/api/auth/google", { id_token: idToken, role });
    if (!data.success) throw new Error(data.message || "Google Sign-In failed");
    if (!["broker", "driver"].includes(data.data.user.role)) {
      throw new Error("This Google account is registered under a different portal. Please use the correct portal.");
    }
    persistSession(data.data.user, data.data.tokens);
    return { user: data.data.user, needs_phone: !!data.data.needs_phone };
  }, [persistSession]);

  // backward-compat alias
  const login = loginBroker;

  const registerUser = useCallback(async ({ name, email, phone, password, role, business_name }) => {
    const payload = { name, email, phone, password, role };
    if (business_name) payload.business_name = business_name;
    const data = await api.post("/api/auth/register", payload);
    if (!data.success) throw new Error(data.message || "Registration failed");
    return data.data;
  }, []);

  // Self-registration for an independent owner-operator driver: one call creates the user,
  // driver profile, and their own truck together (broker_id = their own id — see
  // registerDriverWithTruck in auth.controller.js). Distinct from registerUser/POST
  // /api/auth/register, which never accepted truck fields at all.
  const registerDriver = useCallback(async ({
    name, email, phone, password, confirmPassword,
    registration, category, capacity, make, year, insuranceExpiry,
  }) => {
    const payload = {
      name, phone, email, password,
      confirm_password: confirmPassword,
      registration, category, capacity,
    };
    if (make) payload.make = make;
    if (year) payload.year = Number(year);
    if (insuranceExpiry) payload.insurance_expiry = insuranceExpiry;
    const data = await api.post("/api/auth/register/driver", payload);
    if (!data.success) throw new Error(data.message || "Registration failed");
    return data.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (user?.tokens) {
        await unregisterFcmToken(user.tokens.access_token);
        await api.post("/api/auth/logout", { refresh_token: user.tokens.refresh_token }, user.tokens.access_token);
      }
    } catch {}
    clearSession(user?.role);
  }, [user, clearSession]);

  // Merge partial fields (e.g. kyc_status, profile edits) into the cached session without a
  // fresh login. Reads the CURRENT session from userRef rather than the closed-over `user` —
  // callers are frequently async (an API response resolving well after the triggering render),
  // and using a stale closure here is exactly how one account's data could get written into
  // another account's localStorage entry after a fast logout+login. `forUserId`, when passed,
  // is an extra explicit check: skip silently if the session has since moved on to someone else,
  // rather than merging a since-superseded response into whoever is logged in now.
  const updateUser = useCallback((partial, forUserId) => {
    const current = userRef.current;
    if (!current) return;
    if (forUserId && current.id !== forUserId) return;
    const { tokens, ...prevData } = current;
    persistSession({ ...prevData, ...partial }, tokens);
  }, [persistSession]);

  // kyc_status is a snapshot from login time, cached in localStorage — it never updates on its
  // own (e.g. after an admin verifies KYC while the session stays logged in), which was leaving
  // gated pages (JobRequests, MyTrip) stuck showing "Complete Your KYC First" until the user
  // happened to visit the KYC status page, whose own fetch is what corrects the cache today.
  // Re-checking once per logged-in user (not just once per app load) fixes that without waiting
  // on a page that may never be visited, and without skipping the check entirely for whichever
  // account logs in second in the same browser session.
  useEffect(() => {
    if (!user?.tokens?.access_token || !["broker", "driver"].includes(user.role)) return;
    if (kycRefreshedForUserRef.current === user.id) return;
    kycRefreshedForUserRef.current = user.id;
    const requestUserId = user.id;
    api.get("/api/kyc/status", user.tokens.access_token)
      .then((data) => {
        if (data.success && data.data.kyc_status && data.data.kyc_status !== user.kyc_status) {
          updateUser({ kyc_status: data.data.kyc_status }, requestUserId);
        }
      })
      .catch(() => {});
  }, [user, updateUser]);

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
    <AuthContext.Provider value={{ user, login, loginBroker, loginDriver, googleLogin, registerUser, registerDriver, updateUser, logout, refreshTokens }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
