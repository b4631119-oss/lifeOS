import { initialOf } from "@/lib/identity";
import { cn } from "@/utils";
import { UserCircleIcon } from "@/icons";
import Image from "next/image";

type AvatarSize = "sm" | "lg";

const BOX_CLASSES: Record<AvatarSize, string> = {
  sm: "size-11 text-theme-sm",
  lg: "size-20 text-title-sm",
};

const ICON_CLASSES: Record<AvatarSize, string> = {
  sm: "size-5",
  lg: "size-9",
};

interface UserAvatarProps {
  /** An https avatar URL from the signed-in account, or `null`. */
  photoURL: string | null;
  /** Used for the fallback initial. */
  name: string;
  size?: AvatarSize;
  className?: string;
}

/**
 * The signed-in user's avatar.
 *
 * The photo comes from the Google account (`user.photoURL`, rendered through
 * `next/image`, which is why the Google avatar host is allow-listed in
 * `next.config.ts`). An account without a usable photo — or without a name —
 * falls back to an initials circle and then to a generic icon, so the header
 * never shows an empty box or somebody else's face.
 *
 * Decorative by design (`alt=""`): the name is always rendered next to it, so
 * announcing it again would only duplicate.
 */
export default function UserAvatar({
  photoURL,
  name,
  size = "sm",
  className,
}: UserAvatarProps) {
  const boxClasses = cn("shrink-0 rounded-full", BOX_CLASSES[size], className);

  if (photoURL) {
    return (
      <Image
        src={photoURL}
        alt=""
        width={size === "lg" ? 80 : 44}
        height={size === "lg" ? 80 : 44}
        className={cn(boxClasses, "object-cover")}
      />
    );
  }

  const initial = initialOf(name);

  return (
    <span
      className={cn(
        boxClasses,
        "flex items-center justify-center bg-brand-500 font-medium text-white",
      )}
    >
      {initial || <UserCircleIcon className={ICON_CLASSES[size]} />}
    </span>
  );
}
