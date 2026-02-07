import React from "react";
import { FileText, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems = [
  { title: "Submissions", url: "submissions", icon: FileText },
  { title: "Server Config", url: "config", icon: Settings },
];

const AdminSidebar = ({ isCollapsed, onToggleCollapse }: AdminSidebarProps) => {
  return (
    <aside
      className={cn(
        "h-full bg-card border-r border-border flex flex-col whitespace-nowrap transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center  justify-between">
        {!isCollapsed && (
          <div className="flex flex-col ">
            <h2 className="text-lg font-semibold text-foreground">EPF Admin</h2>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.url}>
              <NavLink
                to={item.url}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                  isCollapsed && "justify-center px-2",
                )}
                activeClassName="bg-primary/10 text-primary hover:bg-primary/15"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.title}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground">Admin Portal v1.0</p>
        </div>
      )}
    </aside>
  );
};

export default AdminSidebar;
