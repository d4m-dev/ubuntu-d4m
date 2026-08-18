import { NavLink } from "react-router-dom";
import { Home, Search, Library } from "lucide-react";
import { usePlayer } from "@/components/music/contexts/PlayerContext";

const item = "flex flex-col items-center justify-center flex-1 py-2 text-[11px] gap-0.5";

export default function MobileNav() {
  const { current } = usePlayer();
  return (
    <nav
      data-testid="mobile-bottom-nav"
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/5 h-14 flex ${current ? "" : ""}`}
    >
      <NavLink
        to="/"
        end
        data-testid="mobile-nav-home"
        className={({ isActive }) => `${item} ${isActive ? "text-white" : "text-white/60"}`}
      >
        <Home className="w-5 h-5" />
        Trang chủ
      </NavLink>
      <NavLink
        to="/search"
        data-testid="mobile-nav-search"
        className={({ isActive }) => `${item} ${isActive ? "text-white" : "text-white/60"}`}
      >
        <Search className="w-5 h-5" />
        Tìm
      </NavLink>
      <NavLink
        to="/library"
        data-testid="mobile-nav-library"
        className={({ isActive }) => `${item} ${isActive ? "text-white" : "text-white/60"}`}
      >
        <Library className="w-5 h-5" />
        Thư viện
      </NavLink>
    </nav>
  );
}
