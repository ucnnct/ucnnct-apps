const MEDIA_BASE_URL = window.__ENV__?.MEDIA_BASE_URL ?? "";

export interface UploadResponse {
  url: string;
  key: string;
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
};
