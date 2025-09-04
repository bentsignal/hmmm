"use client";

import { createContext, useContext, useState } from "react";
import Cookies from "js-cookie";

export const themes = [
  "sunrise",
  "afternoon",
  "nebula",
  "outer-space",
] as const;

export type Theme = (typeof themes)[number];
export const defaultTheme = "nebula";

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
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(
    (Cookies.get("theme") as Theme | undefined) || defaultTheme,
  );
  const [stars, setStars] = useState(Cookies.get("stars") === "true");

  const changeTheme = (newTheme: Theme) => {
    const currentThemeClass = `theme-${theme}`;
    document.body.classList.remove(currentThemeClass);
    const newThemeClass = `theme-${newTheme}`;
    document.body.classList.add(newThemeClass);
    setTheme(newTheme);
    Cookies.set("theme", newTheme);
  };

  const changeStars = (newStarsValue: boolean) => {
    setStars(newStarsValue);
    Cookies.set("stars", newStarsValue.toString());
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
