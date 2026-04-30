import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AuthContextType {
  driver: any;
  login: (userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [driver, setDriver] = useState<any>(null);

  const login = (userData: any) => setDriver(userData);
  const logout = () => setDriver(null);

  return (
    <AuthContext.Provider value={{ driver, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};