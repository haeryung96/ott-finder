export function SearchForm({
  defaultValue = "",
  autoFocus = false,
  size = "md",
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  size?: "md" | "lg";
}) {
  const lg = size === "lg";
  return (
    <form className="w-full" role="search">
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 ${
            lg ? "h-5 w-5" : "h-4 w-4"
          }`}
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          name="q"
          type="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder="영화·시리즈 제목을 검색하세요"
          className={`w-full rounded-full border border-gray-300 bg-white text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${
            lg ? "py-3.5 pl-12 pr-28 text-base" : "py-2.5 pl-11 pr-24 text-sm"
          }`}
        />
        <button
          type="submit"
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-emerald-600 font-medium text-white transition hover:bg-emerald-700 ${
            lg ? "px-5 py-2 text-sm" : "px-4 py-1.5 text-sm"
          }`}
        >
          검색
        </button>
      </div>
    </form>
  );
}
