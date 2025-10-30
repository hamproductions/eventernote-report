export function Head() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `const savedSettings = localStorage.getItem('color-mode')
            if (savedSettings !== null) {
              document.documentElement.classList.add(savedSettings === '"dark"' ? 'dark': 'light');
            } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
              document.documentElement.classList.add('dark');
              localStorage.setItem("color-mode", '"dark"')
            } else {
              document.documentElement.classList.add('light');
            }`
        }}
      />
    </>
  );
}
