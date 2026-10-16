export function Head() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=BIZ+UDGothic:wght@400;700&display=swap" />
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
