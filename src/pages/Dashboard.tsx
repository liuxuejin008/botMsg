import type { FC } from "hono/jsx";
import { Layout } from "./Layout";
import type { ChannelRow } from "../types";

type Card = {
  channel: ChannelRow;
  webhookUrl: string;
  unseen: number;
};

type Props = {
  email: string;
  cards: Card[];
  flashes?: { category: string; message: string }[];
};

export const DashboardPage: FC<Props> = ({ email, cards, flashes }) => (
  <Layout title="控制台 — BotMsg" email={email} flashes={flashes}>
    <header class="page-head">
      <h1 class="ds-page-title">我的频道</h1>
      <p class="ds-lead">Webhook 由公网地址接收；本机只需打开控制台或使用 API 拉取未读队列。</p>
    </header>

    <section class="panel" aria-labelledby="create-channel-title">
      <h2 class="ds-panel-title" id="create-channel-title">新建频道</h2>
      <p class="ds-muted ds-small">创建后将获得唯一 Webhook 路径，可向该 URL 发送 POST。</p>
      <form method="post" action="/dashboard" class="inline-create" style="margin-top:16px;">
        <input type="text" name="name" placeholder="名称，例如 Alerts" maxlength={128} required aria-label="频道名称" />
        <select name="mode" aria-label="频道模式" style="margin-left:8px;">
          <option value="sandbox">Sandbox</option>
          <option value="proxy">Proxy</option>
        </select>
        <button type="submit" class="btn primary">创建</button>
      </form>
    </section>

    {cards.length === 0 ? (
      <p class="empty-hint">还没有频道，先在上方创建一个。</p>
    ) : (
      <ul class="channel-grid">
        {cards.map((item) => {
          const ch = item.channel;
          return (
            <li key={ch.id} class="channel-card">
              <a class="channel-card-link" href={`/channels/${ch.id}`}>
                <div class="channel-card-head">
                  {ch.avatar_url ? (
                    <img src={ch.avatar_url} alt="" class="avatar" width={48} height={48} />
                  ) : (
                    <div class="avatar placeholder" aria-hidden="true">{ch.name.charAt(0)}</div>
                  )}
                  <div>
                    <div class="channel-name">{ch.name}</div>
                    <div class="channel-meta">
                      <span class="mono-label" style="display:inline;margin-right:8px;">#{ch.id}</span>
                      <span class="tag-pill" style="margin-right:8px;">{ch.mode}</span>
                      队列未读
                      <span class="badge" style="margin-left:8px;vertical-align:middle;">{item.unseen}</span>
                    </div>
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    )}
  </Layout>
);
