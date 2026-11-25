export function Footer() {
  return (
    <footer className="footer flex flex-row align-middle justify-center">
      <p className="font-mono text-sm hover:[&>em]:text-red-500 hover:[&>em]:animate-pulse">
        <span className="font-sans">v.{process.env.APP_VERSION}</span> - Coded
        with <em>♥</em> by CePro - {new Date().getFullYear()}
      </p>
    </footer>
  )
}
