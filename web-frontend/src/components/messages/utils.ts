const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"]);
const UUID_PREFIX_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-(.+)$/i;

export function formatConversationTime(isoDate: string | null): string {
  if (!isoDate) {
    return "";
  }
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();

  if (diffMs < 60_000) {
    return "now";
  }
  if (diffMs < 3_600_000) {
    return `${Math.floor(diffMs / 60_000)}m`;
  }
  if (diffMs < 86_400_000) {
    return `${Math.floor(diffMs / 3_600_000)}h`;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function formatMessageTime(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export function getObjectFileName(objectKey: string): string {
  const segments = objectKey.split("/");
  const rawName = segments[segments.length - 1] || "fichier";
  const match = rawName.match(UUID_PREFIX_PATTERN);
  return match?.[1] || rawName;
}

export function isImageFileName(fileName: string | null | undefined): boolean {
  if (!fileName) {
    return false;
  }
  const extension = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  return IMAGE_EXTENSIONS.has(extension.toLowerCase());
}

export function isImageObjectKey(objectKey: string): boolean {
  const fileName = getObjectFileName(objectKey).toLowerCase();
  const extension = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  return IMAGE_EXTENSIONS.has(extension);
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}
