import { useCallback, useEffect, useState } from "react";
import { mediaApi } from "../../api/media";
import { getObjectFileName, isImageFileName, isImageObjectKey } from "./utils";

interface MessageAttachmentProps {
  objectKey: string;
  isOwn: boolean;
  fileNameHint?: string | null;
}

const objectDownloadUrlCache = new Map<string, string>();

export default function MessageAttachment({
  objectKey,
  isOwn,
  fileNameHint = null,
}: MessageAttachmentProps) {
  const cachedUrl = objectDownloadUrlCache.get(objectKey) ?? null;
  const [downloadUrl, setDownloadUrl] = useState<string | null>(cachedUrl);
  const [loading, setLoading] = useState<boolean>(!cachedUrl);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveDownloadUrl = useCallback(async () => {
    const existing = objectDownloadUrlCache.get(objectKey);
    if (existing) {
      setDownloadUrl(existing);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resolvedUrl = await mediaApi.resolveDownloadUrl(objectKey);
      objectDownloadUrlCache.set(objectKey, resolvedUrl);
      setDownloadUrl(resolvedUrl);
    } catch {
      setError("Fichier indisponible");
    } finally {
      setLoading(false);
    }
  }, [objectKey]);

  const downloadFile = useCallback(async () => {
    if (!downloadUrl || downloading) {
      return;
    }

    setDownloading(true);
    setError(null);

    const fileName = fileNameHint?.trim() || getObjectFileName(objectKey);

    try {
      const response = await fetch(downloadUrl, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }

      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = localUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(localUrl);
    } catch {
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      anchor.rel = "noreferrer";
      anchor.target = "_blank";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setDownloading(false);
    }
  }, [downloadUrl, downloading, fileNameHint, objectKey]);

  useEffect(() => {
    void resolveDownloadUrl();
  }, [resolveDownloadUrl]);

  if (loading && !downloadUrl) {
    return (
      <p className={`text-xs ${isOwn ? "text-primary-100" : "text-secondary-500"}`}>
        Chargement du fichier...
      </p>
    );
  }

  if (!downloadUrl) {
    return (
      <div className="flex items-center gap-2">
        <p className={`text-xs ${isOwn ? "text-primary-100" : "text-secondary-500"}`}>
          {error ?? "Fichier indisponible"}
        </p>
        <button
          type="button"
          onClick={() => void resolveDownloadUrl()}
          className={`text-xs underline ${isOwn ? "text-white" : "text-primary-600"}`}
        >
          Reessayer
        </button>
      </div>
    );
  }

  const fileName = fileNameHint?.trim() || getObjectFileName(objectKey);
  const isImage = isImageObjectKey(objectKey) || isImageFileName(fileNameHint);

  if (isImage) {
    return (
      <a href={downloadUrl} target="_blank" rel="noreferrer" className="block mb-2">
        <img
          src={downloadUrl}
          alt={fileName}
          className="max-h-72 w-auto rounded-sm border border-black/10 object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void downloadFile()}
      disabled={downloading}
      className={`block text-xs underline mb-2 ${isOwn ? "text-white" : "text-primary-700"} disabled:opacity-60`}
    >
      {downloading ? "Telechargement..." : `Telecharger ${fileName}`}
    </button>
  );
}
