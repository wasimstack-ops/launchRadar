function ThemeToggle({ isDark, onToggle }) {
  return (
    <button className="pd-theme-toggle" type="button" onClick={onToggle}>
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}

export default ThemeToggle;
