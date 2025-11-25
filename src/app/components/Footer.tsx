"use client";

export default function Footer() {
  return (
    <footer className="w-full py-4 mt-auto">
      <div className="text-center">
        <p className="text-white/40 text-xs">
          Developed by{" "}
          <span className="text-white/60 font-medium">Younan Nwesre</span>
        </p>
        <a
          href="mailto:younan.n@gmail.com"
          className="text-indigo-400/60 hover:text-indigo-400 text-xs transition-colors"
        >
          younan.n@gmail.com
        </a>
      </div>
    </footer>
  );
}
