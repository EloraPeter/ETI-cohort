import { clsx } from "clsx";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  light = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  light?: boolean;
}) {
  return (
    <div
      className={clsx(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left"
      )}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2
        className={clsx(
          "mt-3 text-3xl font-semibold sm:text-4xl",
          light ? "text-ink-900" : "text-white"
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={clsx("mt-4 text-base leading-relaxed", light ? "text-ink-700" : "text-mist")}>
          {description}
        </p>
      )}
    </div>
  );
}
