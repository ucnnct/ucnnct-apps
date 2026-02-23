import { useCallback, useState } from "react";
import { mediaApi } from "../../api/media";
import { toErrorMessage } from "../../components/messages/utils";
import type { WsInboundActionType } from "../../realtime/wsProtocol";
import type { MessageConversationItem } from "../../stores/messagesStore";

type SendAction = <TPayload = unknown>(
  actionType: WsInboundActionType,
  payload: TPayload,
) => boolean;

interface UseMessageAttachmentArgs {
  selectedConversation: MessageConversationItem | null;
  isWsConnected: boolean;
  sendAction: SendAction;
}

interface UseMessageAttachmentResult {
  uploadingAttachment: boolean;
  attachmentStatusLabel: string | null;
  attachmentError: string | null;
  sendAttachmentMessage: (file: File) => Promise<void>;
}

export function useMessageAttachment({
  selectedConversation,
  isWsConnected,
  sendAction,
}: UseMessageAttachmentArgs): UseMessageAttachmentResult {
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentStatusLabel, setAttachmentStatusLabel] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const sendAttachmentMessage = useCallback(
    async (file: File) => {
      if (!selectedConversation) {
        return;
      }
      if (!isWsConnected) {
        setAttachmentError("WebSocket deconnecte. Reconnecte-toi puis reessaye.");
        return;
      }

      setUploadingAttachment(true);
      setAttachmentStatusLabel("Preparation du fichier...");
      setAttachmentError(null);

      let objectKey: string | null = null;

      try {
        setAttachmentStatusLabel("Upload du fichier en cours...");
        const uploadResponse = await mediaApi.upload(file, "chat");
        objectKey = uploadResponse.key;

        const payload = {
          objectKey: uploadResponse.key,
          content: file.name,
        };

        let sent = false;
        setAttachmentStatusLabel("Envoi du message en cours...");
        if (selectedConversation.kind === "group" && selectedConversation.groupId) {
          sent = sendAction("SEND_FILE_MESSAGE", {
            ...payload,
            groupId: selectedConversation.groupId,
          });
        } else if (selectedConversation.kind === "peer" && selectedConversation.peerUserId) {
          sent = sendAction("SEND_FILE_MESSAGE", {
            ...payload,
            receiversId: [selectedConversation.peerUserId],
          });
        }

        if (!sent) {
          throw new Error("Envoi WS impossible. Le fichier n'a pas ete envoye.");
        }
      } catch (uploadError) {
        if (objectKey) {
          void mediaApi.delete(objectKey).catch(() => undefined);
        }
        setAttachmentError(toErrorMessage(uploadError, "Impossible d'envoyer le fichier."));
      } finally {
        setUploadingAttachment(false);
        setAttachmentStatusLabel(null);
      }
    },
    [isWsConnected, selectedConversation, sendAction],
  );

  return {
    uploadingAttachment,
    attachmentStatusLabel,
    attachmentError,
    sendAttachmentMessage,
  };
}
