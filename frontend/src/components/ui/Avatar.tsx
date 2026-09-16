import { avatarColor, initials } from "@/lib/format";

type Props = { name: string; size?: number; ring?: boolean };

export function Avatar({ name, size = 28, ring = false }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 ${
        ring ? "ring-2 ring-surface" : ""
      }`}
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.4 }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
