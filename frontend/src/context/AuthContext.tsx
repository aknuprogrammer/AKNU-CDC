import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, College } from '../api/types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  college: College | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User, college?: College) => void;
  logout: () => void;
  switchUser: (role: string, collegeId?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('aknu_access_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('aknu_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [college, setCollege] = useState<College | null>(() => {
    const saved = localStorage.getItem('aknu_college');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // If no user saved, initialize with default University Super Admin
    if (!user) {
      const defaultUser: User = {
        id: 'usr-admin',
        email: 'admin@aknu.edu.in',
        phone: '9848012345',
        name: 'AKNU Super Admin',
        role: 'SUPER_ADMIN',
        courseSection: 'ALL',
        isActive: true,
      };
      setUser(defaultUser);
      setToken('mock-token-admin');
      localStorage.setItem('aknu_user', JSON.stringify(defaultUser));
      localStorage.setItem('aknu_access_token', 'mock-token-admin');
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User, newCollege?: College) => {
    setToken(newToken);
    setUser(newUser);
    setCollege(newCollege || null);
    localStorage.setItem('aknu_access_token', newToken);
    localStorage.setItem('aknu_user', JSON.stringify(newUser));
    if (newCollege) {
      localStorage.setItem('aknu_college', JSON.stringify(newCollege));
    } else {
      localStorage.removeItem('aknu_college');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCollege(null);
    localStorage.removeItem('aknu_access_token');
    localStorage.removeItem('aknu_user');
    localStorage.removeItem('aknu_college');
  };

  const switchUser = (role: string, collegeCodeOrId: string = '001') => {
    if (role === 'COLLEGE_PRINCIPAL') {
      const code = collegeCodeOrId.toUpperCase();
      const KNOWN_PRINCIPALS: Record<string, { name: string; mobile: string; collegeName: string }> = {
        '001': { name: 'Dr. K. Srinivas Rao', mobile: '9440123456', collegeName: 'Government Degree College (Autonomous)' },
        '002': { name: 'Dr. P. Lakshmi Devi', mobile: '9848123456', collegeName: 'Aditya Degree College for Women' },
        '003': { name: 'Dr. M. Satyanarayana', mobile: '9440987654', collegeName: 'SKBR College' },
        '004': { name: 'Dr. V. Prasad', mobile: '9440112233', collegeName: 'P.R. Government Degree College' },
        '005': { name: 'Dr. K. Ranga Rao', mobile: '9848223344', collegeName: 'VSM College of Arts & Science' },
        '006': { name: 'Dr. G. Venkanna', mobile: '9440334455', collegeName: 'Sri YN College' },
        '007': { name: 'Dr. Ch. Mohan', mobile: '9440445566', collegeName: 'DNR College' },
        '008': { name: 'Dr. S. Rama Krishna', mobile: '9848556677', collegeName: 'Ideal Institute of Degree Studies' },
      };
      const known = KNOWN_PRINCIPALS[code];
      const principalName = known?.name || 'Dr. K. Srinivas Rao';
      const principalMobile = known?.mobile || '9440112233';
      const collegeName = known?.collegeName || `Affiliated College (${code})`;

      const col = {
        id: `col-${code.toLowerCase()}`,
        code: code,
        name: collegeName,
        type: 'UNAIDED' as const,
        isAutonomous: false,
        location: 'RURAL' as const,
        district: 'East Godavari',
        address: 'Campus Address, AKNU Affiliated Zone',
        pincode: '533001',
        principalName: principalName,
        principalMobile: principalMobile,
        principalEmail: `principal.${code.toLowerCase()}@aknu.edu.in`,
        hasHostel: false,
        active: true,
        createdAt: new Date().toISOString(),
      };
      const colUser: User = {
        id: `usr-col-${code.toLowerCase()}`,
        email: `principal.${code.toLowerCase()}@aknu.edu.in`,
        phone: principalMobile,
        name: principalName,
        role: 'COLLEGE_PRINCIPAL',
        courseSection: 'ALL',
        collegeId: col.id,
        isActive: true,
      };
      login('mock-token-col', colUser, col);
    } else if (role === 'DEAN_CDC') {
      const u: User = {
        id: 'usr-dean',
        email: 'dean.cdc@aknu.edu.in',
        phone: '9848023456',
        name: 'Prof. P. Suresh Varma (Dean CDC)',
        role: 'DEAN_CDC',
        courseSection: 'ALL',
        isActive: true,
      };
      login('mock-token-univ', u, undefined);
    } else if (role === 'SECTION_UG') {
      const u: User = {
        id: 'usr-sec-ug',
        email: 'section.ug@aknu.edu.in',
        phone: '9848067890',
        name: 'UG Section Officer (Undergraduate Courses)',
        role: 'SECTION_OFFICER',
        courseSection: 'UG',
        isActive: true,
      };
      login('mock-token-univ', u, undefined);
    } else if (role === 'SECTION_PG') {
      const u: User = {
        id: 'usr-sec-pg',
        email: 'section.pg@aknu.edu.in',
        phone: '9848078901',
        name: 'PG Section Officer (M.B.A, M.C.A, M.Com, M.Sc, M.A)',
        role: 'SECTION_OFFICER',
        courseSection: 'PG',
        isActive: true,
      };
      login('mock-token-univ', u, undefined);
    } else if (role === 'SECTION_EDUCATION') {
      const u: User = {
        id: 'usr-sec-education',
        email: 'section.education@aknu.edu.in',
        phone: '9848089012',
        name: 'Education Section Officer (B.Ed, M.Ed, B.P.Ed, M.P.Ed)',
        role: 'SECTION_OFFICER',
        courseSection: 'EDUCATION',
        isActive: true,
      };
      login('mock-token-univ', u, undefined);
    } else if (role === 'SECTION_LAW') {
      const u: User = {
        id: 'usr-sec-law',
        email: 'section.law@aknu.edu.in',
        phone: '9848090123',
        name: 'LAW Section Officer (L.L.B, L.L.M)',
        role: 'SECTION_OFFICER',
        courseSection: 'LAW',
        isActive: true,
      };
      login('mock-token-univ', u, undefined);
    } else {
      const u: User = {
        id: 'usr-admin',
        email: 'admin@aknu.edu.in',
        phone: '9848012345',
        name: 'AKNU Super Admin',
        role: 'SUPER_ADMIN',
        courseSection: 'ALL',
        isActive: true,
      };
      login('mock-token-univ', u, undefined);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        college,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchUser,
      }}
    >
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
