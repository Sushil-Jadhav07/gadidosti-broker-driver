import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const broker = localStorage.getItem("ssk_broker_auth");
    if (broker) return { ...JSON.parse(broker), role: "broker" };
    const driver = localStorage.getItem("ssk_driver_auth");
    if (driver) return { ...JSON.parse(driver), role: "driver" };
    return null;
  });

  const loginBroker = useCallback((phone, password) => {
    if (phone === "9000000003" && password === "Broker@123") {
      const userData = {
        name: "Suresh Patel",
        phone: "+91 90000 00003",
        role: "broker",
        businessName: "Suresh Transport Co.",
      };
      localStorage.setItem("ssk_broker_auth", JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    }
    return { success: false, error: "Invalid phone number or password" };
  }, []);

  const loginDriver = useCallback((phone, password) => {
    if (phone === "9000000004" && password === "Driver@123") {
      const userData = {
        name: "Ramesh Singh",
        phone: "+91 90000 00004",
        role: "driver",
      };
      localStorage.setItem("ssk_driver_auth", JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    }
    return { success: false, error: "Invalid phone number or password" };
  }, []);

  // Keep backward-compat "login" alias (broker)
  const login = loginBroker;

  const logout = useCallback(() => {
    localStorage.removeItem("ssk_broker_auth");
    localStorage.removeItem("ssk_driver_auth");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, loginBroker, loginDriver, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
