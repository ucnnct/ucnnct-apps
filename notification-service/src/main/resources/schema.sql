CREATE TABLE IF NOT EXISTS notifications (
    notification_id VARCHAR(64) PRIMARY KEY,
    message_id VARCHAR(64),
    sender_id VARCHAR(64),
    target_id VARCHAR(64) NOT NULL,
    category VARCHAR(128),
    content TEXT,
    decision_type VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_target_id
    ON notifications (target_id);

CREATE INDEX IF NOT EXISTS idx_notifications_message_id
    ON notifications (message_id);
