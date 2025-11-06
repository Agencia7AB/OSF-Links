import React from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import Icon from "../assets/icon.svg"

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-black">
      <header className="shadow-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img
                src={Icon}
                alt="Logo"
                className="h-8 max-w-32 object-contain"
              />
              <h1 className="text-2xl font-bold text-white">Video Manager</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition duration-200"
              >
                <LogOut className="mr-2" size={18} />
                Sair
              </button>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
