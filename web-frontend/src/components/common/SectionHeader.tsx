interface SectionHeaderProps {
  label?: string;
}

export default function SectionHeader({ label }: SectionHeaderProps) {
  if (!label) {
    return <div className="mx-4 mb-6 border-t border-secondary-100" />;
  }

  return (
    <div className="flex items-center px-4 mb-4">
      <div className="flex-1 border-t border-secondary-100"></div>
      <span className="px-4 text-[11px] font-medium text-secondary-300 uppercase tracking-widest">
        {label}
      </span>
      <div className="flex-1 border-t border-secondary-100"></div>
    </div>
  );
}
