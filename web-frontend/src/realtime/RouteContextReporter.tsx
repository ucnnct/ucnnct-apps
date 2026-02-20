import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppSocket } from "./AppSocketProvider";

export function RouteContextReporter() {
  const location = useLocation();
  const { connected, sendAction } = useAppSocket();

  useEffect(() => {
    if (!connected) {
      return;
    }

    sendAction("UPDATE_ACTIVE_CONTEXT", {
      page: location.pathname,
      updatedAt: Date.now(),
    });
  }, [connected, location.pathname, sendAction]);

  return null;
}
