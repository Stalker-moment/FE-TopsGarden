// hooks/useIsDarkMode.ts
import { useState, useEffect } from "react";

const useIsDarkMode = (): boolean => {
  const [isDark, setIsDark] = useState<boolean>(
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.attributeName === "class" &&
          mutation.target instanceof HTMLElement
        ) {
          setIsDark(mutation.target.classList.contains("dark"));
        }
      }
    });

    if (typeof window !== "undefined") {
      observer.observe(document.documentElement, { attributes: true });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return isDark;
};

export default useIsDarkMode;