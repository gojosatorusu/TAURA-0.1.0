import React from 'react'
import {
  NavLink,
  Outlet
} from 'react-router-dom'
// Type definition for navigation items
type NavItem = {
  to: string;
  icon: React.ElementType;
  name: string;
}
// Props type for the WrapBar
type WrapBarProps = {
  baseRoute: string;
  navItems: NavItem[];
  children?: React.ReactNode;
}
const WrapBar: React.FC<WrapBarProps> = ({
  baseRoute,
  navItems,
  children
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-gray-100">
      {/* Navigation Container */}
      <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/30 shadow-2xl">
        <div className="container mx-auto px-4 py-3 max-w-6xl">
          <nav className="flex justify-center space-x-2">
            {navItems.map((item, index) => (
              <NavLink
                key={index}
                to={`${baseRoute}/${item.to}`}
                className={({ isActive }) => `
                  group relative flex items-center justify-center
                  px-4 py-2 rounded-xl
                  text-sm font-medium tracking-wide
                  transition-all duration-300 ease-in-out
                  ${isActive
                    ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/50 hover:bg-indigo-500/30'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-slate-800/50'}
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                  transform hover:scale-105 active:scale-95
                `}
              >
                <item.icon
                  className={`
                    mr-2 w-5 h-5
                    transition-all duration-300
                    group-hover:text-indigo-300
                  `}
                />
                <span className="tracking-tight">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      {/* Content Area with Top Padding to Prevent Navbar Overlap */}
      <main className="container mx-auto px-4 pt-6">
        {children}
        <Outlet />
      </main>
    </div>
  )
}
export default WrapBar