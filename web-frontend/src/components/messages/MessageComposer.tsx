import { useRef, type ChangeEvent } from "react";
import { Image as ImageIcon, Paperclip, Send, Smile } from "lucide-react";

interface MessageComposerProps {
  draft: string;
  isWsConnected: boolean;
  uploadingAttachment: boolean;
  attachmentStatusLabel?: string | null;
  attachmentError: string | null;
  onDraftChange: (value: string) => void;
  onSendMessage: () => void;
  onAttachmentSelected: (file: File) => Promise<void> | void;
}

export default function MessageComposer({
  draft,
  isWsConnected,
  uploadingAttachment,
  attachmentStatusLabel = null,
  attachmentError,
  onDraftChange,
  onSendMessage,
  onAttachmentSelected,
}: MessageComposerProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageButtonClick = () => {
    if (uploadingAttachment) {
      return;
    }
    imageInputRef.current?.click();
  };

  const handleFileButtonClick = () => {
    if (uploadingAttachment) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleAttachmentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
      return;
    }
    await onAttachmentSelected(file);
  };

  return (
    <div className="p-6 border-t border-secondary-100 bg-white">
      {attachmentError && (
        <p className="text-xs text-red-500 mb-2">{attachmentError}</p>
      )}
      {uploadingAttachment && (
        <p className="text-xs text-secondary-400 mb-2">
          {attachmentStatusLabel ?? "Upload du fichier en cours..."}
        </p>
      )}
      <div className="flex items-end gap-2 bg-secondary-50 border border-secondary-100 focus-within:bg-white focus-within:border-primary-500 transition-all rounded-sm p-2">
        <div className="flex gap-1 mb-1">
          <button
            type="button"
            onClick={handleImageButtonClick}
            disabled={!isWsConnected || uploadingAttachment}
            className="p-2 text-secondary-400 hover:text-primary-500 transition-colors disabled:text-secondary-300 disabled:cursor-not-allowed"
          >
            <ImageIcon size={18} />
          </button>
          <button
            type="button"
            onClick={handleFileButtonClick}
            disabled={!isWsConnected || uploadingAttachment}
            className="p-2 text-secondary-400 hover:text-primary-500 transition-colors disabled:text-secondary-300 disabled:cursor-not-allowed"
          >
            <Paperclip size={18} />
          </button>
          <button className="p-2 text-secondary-400 hover:text-primary-500 transition-colors">
            <Smile size={18} />
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSendMessage();
            }
          }}
          placeholder={isWsConnected ? "Votre message..." : "WS deconnecte"}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-primary-900 placeholder:text-secondary-300 resize-none h-10 py-2 font-normal"
        />
        <button
          onClick={onSendMessage}
          disabled={!isWsConnected || uploadingAttachment || draft.trim().length === 0}
          className="mb-1 p-2 bg-primary-500 hover:bg-primary-600 disabled:bg-secondary-200 disabled:cursor-not-allowed text-white rounded-sm transition-all group"
        >
          <Send
            size={18}
            className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
          />
        </button>
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAttachmentChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleAttachmentChange}
      />
    </div>
  );
}
