import { useAuth } from '../context/AuthContext';

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-4">
      {/* User Info */}
      <div className="flex items-center gap-3">
        <img
          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
          alt={user.name}
          className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
        />
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={logout}
        className="px-4 py-2 text-sm font-medium text-red-600 
                   hover:text-red-700 hover:bg-red-50 rounded-lg 
                   transition-colors duration-200"
      >
        Logout
      </button>
    </div>
  );
}