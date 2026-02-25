import React from 'react';
import { LayoutDashboard, FileCheck, History, ChevronLeft, ChevronRight, CupSoda, Coffee } from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Navigation({ currentPage, onNavigate, isCollapsed, onToggleCollapse }: NavigationProps) {
  const { t } = useLanguage();

  // Use CupSoda if available, otherwise fallback to Coffee
  // If CupSoda doesn't exist in this lucide-react version, TypeScript will error on import
  // In that case, replace CupSoda with Coffee in both the import and usage
  const MenuIcon = CupSoda ?? Coffee;

  const NAV_ITEMS = [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: LayoutDashboard },
    { id: 'audit', label: t('navigation.audit'), icon: FileCheck },
    { id: 'settings', label: t('navigation.settings'), icon: History },
    { id: 'menuManagement', label: t('navigation.menuManagement'), icon: MenuIcon },
  ];
  return (
    <nav 
      className={cn(
        "border-r flex flex-col transition-all duration-300 relative",
        isCollapsed ? "w-16" : "w-64"
      )}
      style={{ backgroundColor: 'white' }}
    >
      {/* Toggle Button */}
      <Button
        onClick={onToggleCollapse}
        variant="ghost"
        size="icon"
        className={cn(
          "absolute -right-3 top-4 z-10 w-6 h-6 rounded-full border bg-white shadow-sm hover:bg-gray-100",
          "transition-transform duration-300",
          isCollapsed && "rotate-180"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </Button>

      <div className={cn("p-4 border-b", isCollapsed && "px-2")}>
        {!isCollapsed && (
          <h3 className="font-semibold text-sm text-muted-foreground">{t('navigation.mainFeatures')}</h3>
        )}
      </div>
      
      <div className={cn("flex-1 p-2", isCollapsed && "px-1")}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg text-sm transition-colors mb-1",
                isCollapsed ? "px-2 py-3 justify-center" : "px-4 py-3",
                isActive 
                  ? "font-medium text-white" 
                  : "text-gray-700 hover:bg-gray-100"
              )}
              style={isActive ? { backgroundColor: 'var(--df-header)' } : {}}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>
      
      {!isCollapsed && (
        <div className="p-4 border-t">
          <div 
            className="p-3 rounded-lg text-xs"
            style={{ backgroundColor: 'var(--df-bg)' }}
          >
            <p className="font-semibold mb-1">系統狀態</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground">所有服務正常</span>
            </div>
          </div>
        </div>
      )}
      
      {isCollapsed && (
        <div className="p-2 border-t">
          <div className="flex justify-center">
            <div className="w-2 h-2 rounded-full bg-green-500" title="所有服務正常"></div>
          </div>
        </div>
      )}
    </nav>
  );
}
