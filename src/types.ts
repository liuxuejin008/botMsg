export type Env = {
  DB: D1Database;
  AVATARS: R2Bucket;
  SECRET_KEY: string;
  JWT_SECRET: string;
  PUBLIC_BASE_URL: string;
  JWT_EXPIRES_HOURS: string;
};

export type AppVars = {
  userId: number;
  sessionUserId: number | null;
};

export type AppEnv = { Bindings: Env; Variables: AppVars };

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
};

export type ChannelMode = "sandbox" | "proxy";

export type ChannelRow = {
  id: number;
  owner_user_id: number;
  name: string;
  avatar_url: string | null;
  webhook_secret: string;
  mode: ChannelMode;
  sandbox_response: string;
  created_at: string;
};

export type MessageRow = {
  id: number;
  channel_id: number;
  payload_json: string;
  headers_json: string | null;
  source_ip: string | null;
  tag: string | null;
  created_at: string;
  read_at: string | null;
};

export type ChannelRole = "owner" | "member" | "readonly";

export type ChannelMemberRow = {
  channel_id: number;
  user_id: number;
  role: ChannelRole;
  invited_at: string;
};

export type ChannelRuleRow = {
  id: number;
  channel_id: number;
  name: string;
  priority: number;
  condition_type: "header" | "payload_key" | "source_ip" | "content_type";
  condition_field: string | null;
  condition_op: "equals" | "contains" | "regex" | "exists";
  condition_value: string | null;
  action: "accept" | "reject" | "tag";
  tag_value: string | null;
  enabled: number;
  created_at: string;
};

export type ChannelForwardRow = {
  id: number;
  channel_id: number;
  url: string;
  method: string;
  extra_headers_json: string | null;
  enabled: number;
  retry_max: number;
  created_at: string;
};

export type ForwardLogRow = {
  id: number;
  message_id: number;
  forward_id: number;
  attempt: number;
  status_code: number | null;
  error: string | null;
  next_retry_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

export type ProxyRequestRow = {
  id: number;
  channel_id: number;
  payload_json: string;
  headers_json: string | null;
  source_ip: string | null;
  status: "pending" | "completed" | "timeout";
  response_body: string | null;
  response_status: number;
  response_headers_json: string | null;
  created_at: string;
  completed_at: string | null;
};
