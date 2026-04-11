import { createContext, useContext, useState } from "react";

import { defaultTheme, Theme } from "~/lib/theme";

interface ThemeContextType {
  theme: Theme;
  stars: boolean;
  changeTheme: (newTheme: Theme) => void;
  changeStars: (newStarsValue: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  stars: false,
  changeTheme: () => {},
  changeStars: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({
  children,
  initialTheme,
  initialStars,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
  initialStars: boolean;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [stars, setStars] = useState(initialStars);

  const changeTheme = (newTheme: Theme) => {
    const currentThemeClass = `theme-${theme}`;
    document.body.classList.remove(currentThemeClass);
    const newThemeClass = `theme-${newTheme}`;
    document.body.classList.add(newThemeClass);
    setTheme(newTheme);
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000`;
  };

  const changeStars = (newStarsValue: boolean) => {
    setStars(newStarsValue);
    document.cookie = `stars=${newStarsValue}; path=/; max-age=31536000`;
  };

  return (
    <ThemeContext.Provider value={{ theme, stars, changeTheme, changeStars }}>
      {children}
      <Stars show={stars} />
    </ThemeContext.Provider>
  );
}

const Stars = ({ show }: { show: boolean }) => {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 h-screen w-screen transition-opacity duration-300">
      {Array.from({ length: 200 }).map((_, index) => (
        <div
          className={`bg-foreground absolute h-[1px] w-[1px]`}
          key={index}
          style={{
            left: `calc(100vw * ${Math.random()})`,
            top: `calc(100vh * ${Math.random()})`,
            opacity: Math.random(),
          }}
        />
      ))}
    </div>
  );
};
