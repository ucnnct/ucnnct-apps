CREATE TABLE IF NOT EXISTS notifications (
    notification_id VARCHAR(64) PRIMARY KEY,
    message_id VARCHAR(64),
    sender_id VARCHAR(64),
    owner_user_id VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    category VARCHAR(128),
    content TEXT,
    decision_type VARCHAR(32),
    status VARCHAR(16) NOT NULL DEFAULT 'UNREAD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_target_id
    ON notifications (target_id);

CREATE INDEX IF NOT EXISTS idx_notifications_owner_created
    ON notifications (owner_user_id, created_at DESC, notification_id DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_owner_status
    ON notifications (owner_user_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_message_id
    ON notifications (message_id);
