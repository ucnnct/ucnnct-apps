import type { MessageItem } from "../../stores/messagesStore";
import { formatMessageTime } from "./utils";
import MessageAttachment from "./MessageAttachment";

interface MessageBubbleProps {
  message: MessageItem;
}

function toDeliveryLabel(status: MessageItem["status"]): string {
  if (status === "READ") {
    return "Lu";
  }
  if (status === "DELIVERED") {
    return "Recu";
  }
  return "Envoye";
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const hasObjectAttachment = Boolean(message.objectKey);
  const isFallbackAttachmentLabel = hasObjectAttachment && message.content === "[Fichier]";
  const fileNameHint = hasObjectAttachment && !isFallbackAttachmentLabel ? message.content : null;
  const showTextContent = !isFallbackAttachmentLabel && message.content.trim().length > 0;

  return (
    <div
      className={`flex ${message.isOwn ? "justify-end" : "justify-start"} items-end gap-2 lg:gap-3`}
    >
      {!message.isOwn && (
        <div className="w-7 h-7 lg:w-8 lg:h-8 bg-secondary-100 border border-secondary-200 rounded-sm overflow-hidden shrink-0">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(message.senderLabel)}`}
            alt={message.senderLabel}
          />
        </div>
      )}
      <div
        className={`max-w-[85%] lg:max-w-[70%] group flex flex-col ${message.isOwn ? "items-end" : "items-start"}`}
      >
        {!message.isOwn && (
          <p className="text-[11px] font-semibold text-secondary-400 mb-1 ml-1">
            {message.senderLabel}
          </p>
        )}
        <div
          className={`p-3 rounded-xl border transition-all ${
            message.isOwn
              ? "bg-primary-500 border-primary-600 text-white"
              : "bg-white border-secondary-100 text-primary-900"
          }`}
        >
          {message.objectKey && (
            <MessageAttachment
              objectKey={message.objectKey}
              isOwn={message.isOwn}
              fileNameHint={fileNameHint}
            />
          )}
          {showTextContent && (
            <p className="text-sm font-normal leading-relaxed">{message.content}</p>
          )}
        </div>
        <p className="text-[11px] font-normal text-secondary-300 mt-1">
          {formatMessageTime(message.createdAt)}
          {message.isOwn ? ` · ${toDeliveryLabel(message.status)}` : ""}
        </p>
      </div>
    </div>
  );
}
