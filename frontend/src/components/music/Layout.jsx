import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import BottomPlayer from "./BottomPlayer";

export default function Layout() {
  return (
    <div className="app-shell">
      <div className="main-row">
        <Sidebar />
        <main className="content">
          <Outlet />
        </main>
      </div>
      <BottomPlayer />
    </div>
  );
}
