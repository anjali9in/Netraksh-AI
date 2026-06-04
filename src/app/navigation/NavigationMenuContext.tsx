import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type NavigationMenuContextValue = {
  isOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
};

const NavigationMenuContext =
  createContext<NavigationMenuContextValue | null>(null);

type NavigationMenuProviderProps = {
  children: React.ReactNode;
};

export function NavigationMenuProvider({
  children,
}: NavigationMenuProviderProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen(current => !current), []);

  const value = useMemo(
    () => ({
      isOpen,
      openMenu,
      closeMenu,
      toggleMenu,
    }),
    [closeMenu, isOpen, openMenu, toggleMenu],
  );

  return (
    <NavigationMenuContext.Provider value={value}>
      {children}
    </NavigationMenuContext.Provider>
  );
}

export function useNavigationMenu(): NavigationMenuContextValue {
  const context = useContext(NavigationMenuContext);

  if (!context) {
    throw new Error(
      'useNavigationMenu must be used within NavigationMenuProvider',
    );
  }

  return context;
}

export function useNavigationMenuOptional(): NavigationMenuContextValue | null {
  return useContext(NavigationMenuContext);
}
