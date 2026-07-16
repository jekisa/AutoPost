type Props = {
  name?: string | null;
  className?: string;
};

export function Avatar({ name, className = "h-12 w-12 text-base" }: Props) {
  const initial = name?.trim().charAt(0).toUpperCase() || "A";
  return <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F97362] to-[#7C3AED] font-black text-white ${className}`} aria-label={`Avatar ${name ?? "Admin"}`}>
    {initial}
  </div>;
}
