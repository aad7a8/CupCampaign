import { createContext, useContext, useState, ReactNode } from 'react';

export interface UserInfo {
  brandName?: string;
  branchName?: string;
  // 支援多種可能的欄位名稱作為 fallback
  shopName?: string;
  merchantName?: string;
  storeName?: string;
  branch?: string;
}

interface UserContextType {
  user: UserInfo | null;
  setUser: (user: UserInfo | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
