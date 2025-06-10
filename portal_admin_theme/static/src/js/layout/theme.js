const reloadDocumentThemeMode = () => {
  // On page load or when changing themes, best to add inline in `head` to avoid FOUC
  document.documentElement.classList.toggle(
      "dark",
      localStorage.theme === "dark" ||
          (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );

}

const initDocumentThemeMode = () => {
  reloadDocumentThemeMode();

  const themeToggleButton = document.getElementById('theme-toggle-button');
  const lightThemeIcon = document.getElementById('light-theme-icon');
  const darkThemeIcon = document.getElementById('dark-theme-icon');

  if (!themeToggleButton || !lightThemeIcon || !darkThemeIcon) return;

  const updateDocumentThemeIcons = (isDarkMode) => {
      lightThemeIcon.classList.toggle('hidden', isDarkMode);
      darkThemeIcon.classList.toggle('hidden', !isDarkMode);
  }

  const toggleDocumentThemeMode = () => {
      document.documentElement.classList.toggle('dark');
      const isDarkMode = document.documentElement.classList.contains('dark');
      localStorage.theme = isDarkMode ? 'dark' : 'light';
      document.dispatchEvent(new Event('layout:theme-change', { theme: localStorage.theme }));
      updateDocumentThemeIcons(isDarkMode);
  }

  updateDocumentThemeIcons(document.documentElement.classList.contains('dark'));

  themeToggleButton.addEventListener('click', toggleDocumentThemeMode);
}

document.addEventListener('DOMContentLoaded', initDocumentThemeMode);