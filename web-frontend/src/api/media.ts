const MEDIA_BASE_URL = window.__ENV__?.MEDIA_BASE_URL ?? "";
const PUBLIC_MEDIA_PREFIX = "/uconnect-media";

function normalizeObjectKeyForUrl(objectKey: string): string {
  return objectKey
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildPublicObjectUrl(objectKey: string): string {
  const normalizedObjectKey = normalizeObjectKeyForUrl(objectKey);
  const base = MEDIA_BASE_URL.replace(/\/+$/, "");
  return `${base}${PUBLIC_MEDIA_PREFIX}/${normalizedObjectKey}`;
}

function isPrivateIpv4Host(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) {
    return false;
  }

  const octets = parts.map((part) => Number.parseInt(part, 10));
  if (octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function isInternalHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (
    normalized === "localhost" ||
    normalized === "minio" ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".svc") ||
    normalized.includes(".svc.cluster.local")
  ) {
    return true;
  }

  return isPrivateIpv4Host(normalized);
}

function isInternalMinioUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    if (isInternalHost(parsedUrl.hostname)) {
      return true;
    }

    return (
      parsedUrl.port === "9000" &&
      parsedUrl.hostname.toLowerCase() !== window.location.hostname.toLowerCase()
    );
  } catch {
    return true;
  }
}

export interface UploadResponse {
  url: string;
  key: string;
}

export interface PrepareDownloadResponse {
  objectKey: string;
  presignedGetUrl: string;
  expiresInSeconds: number;
}

export const mediaApi = {
  upload: async (file: File, folder: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${MEDIA_BASE_URL}/api/media/upload?folder=${encodeURIComponent(folder)}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }

    return res.json();
  },

  delete: async (key: string): Promise<void> => {
    const res = await fetch(`${MEDIA_BASE_URL}/api/media?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Delete failed: ${res.status}`);
    }
  },

  prepareDownload: async (objectKey: string): Promise<PrepareDownloadResponse> => {
    const res = await fetch(`${MEDIA_BASE_URL}/api/media/downloads/prepare`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectKey }),
    });

    if (!res.ok) {
      throw new Error(`Prepare download failed: ${res.status}`);
    }

    return res.json();
  },

  resolveDownloadUrl: async (objectKey: string): Promise<string> => {
    const publicUrl = buildPublicObjectUrl(objectKey);

    try {
      const response = await mediaApi.prepareDownload(objectKey);
      if (!response.presignedGetUrl || isInternalMinioUrl(response.presignedGetUrl)) {
        return publicUrl;
      }
      return response.presignedGetUrl;
    } catch {
      return publicUrl;
    }
  },
};
