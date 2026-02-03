const MEDIA_BASE_URL = window.__ENV__?.MEDIA_BASE_URL ?? "http://localhost:8083";

export interface UploadResponse {
  url: string;
  key: string;
}

export const mediaApi = {
  upload: async (token: string, file: File, folder: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${MEDIA_BASE_URL}/api/media/upload?folder=${encodeURIComponent(folder)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }

    return res.json();
  },

  delete: async (token: string, key: string): Promise<void> => {
    const res = await fetch(`${MEDIA_BASE_URL}/api/media?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Delete failed: ${res.status}`);
    }
  },
};
