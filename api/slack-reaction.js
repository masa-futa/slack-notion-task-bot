/**
 * api/slack-reaction.js
 *
 * Slack の reaction_added イベントを受け取り、
 * 指定した絵文字（TRIGGER_EMOJI）がついたメッセージを
 * Notion データベースに保存する。
 *
 * 追加する環境変数:
 *   SLACK_BOT_TOKEN       xoxb-... (reactions:read + channels:history スコープ必要)
 *   SLACK_SIGNING_SECRET  Basic Information ページの Signing Secret
 *   NOTION_TOKEN          secret_...
 *   NOTION_FEED_DATABASE_ID  保存先 Notion データベースの ID (32文字)
 *   TRIGGER_EMOJI         atode  (絵文字名、コロンなし)
 */

const crypto = require("crypto");
const { Client } = require("@notionhq/client");

// ==================== 環境変数 ====================
const SLACK_BOT_TOKEN       = process.env.SLACK_BOT_TOKEN       || "";
const SLACK_SIGNING_SECRET  = process.env.SLACK_SIGNING_SECRET  || "";
const NOTION_TOKEN          = process.env.NOTION_TOKEN          || "";
const NOTION_FEED_DATABASE_ID = process.env.NOTION_FEED_DATABASE_ID || "";
const TRIGGER_EMOJI         = process.env.TRIGGER_EMOJI         || "atode";

// ==================== Slack 署名検証 ====================
function verifySlackSignature(rawBody, headers) {
  const timestamp = headers["x-slack-request-timestamp"] || "";
  const signature = headers["x-slack-signature"] || "";

  // 5分以上古いリクエストはリプレイ攻撃として拒否
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto
    .createHmac("sha256", SLACK_SIGNING_SECRET)
    .update(baseString)
    .digest("hex");
  const expected = `v0=${hmac}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// ==================== Slack API ====================

/** メッセージ詳細を取得（スレッド返信にも対応） */
async function fetchMessage(channel, ts) {
  const url = `https://slack.com/api/conversations.replies?channel=${channel}&ts=${ts}&limit=1&inclusive=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  });
  const data = await res.json();
  if (!data.ok || !data.messages?.length) return null;
  // ts と完全一致するメッセージを返す
  return data.messages.find((m) => m.ts === ts) || data.messages[0];
}

/** チャンネル名を取得 */
async function fetchChannelName(channelId) {
  const res = await fetch(
    `https://slack.com/api/conversations.info?channel=${channelId}`,
    { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } }
  );
  const data = await res.json();
  return data.ok ? `#${data.channel.name}` : channelId;
}

// ==================== メッセージ解析 ====================

/**
 * Feed Bot の attachment テキストから タイトル・URL・要約 を抽出する。
 *
 * attachment.text フォーマット:
 *   {emoji}  *<URL|タイトル>*
 *   要約テキスト
 *   _ソース名  ·  相対日時_
 */
function parseMessage(message) {
  // attachment の text を優先（Feed Bot のリッチ投稿）
  const src = message.attachments?.[0]?.text || message.text || "";

  // <URL|タイトル> を抽出
  const linkMatch = src.match(/<(https?:\/\/[^|>\s]+)\|([^>]+)>/);
  const url   = linkMatch?.[1] || "";
  const title = linkMatch?.[2]
    ? linkMatch[2].replace(/\*/g, "").replace(/[🎉✨⚡️🔧]/gu, "").trim()
    : "";

  // 要約: リンク行の次の行（イタリック行・空行の手前まで）
  let summary = "";
  if (linkMatch) {
    const afterLink = src.slice(src.indexOf(linkMatch[0]) + linkMatch[0].length);
    const lines = afterLink.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const candidate = lines[0];
      // _フッター行_ やリンクを含む行は除外
      if (!candidate.startsWith("_") && !candidate.includes("<http")) {
        summary = candidate.replace(/…$/, "").trim();
      }
    }
  }

  return { title, url, summary };
}

// ==================== Notion 書き込み ====================

async function addToNotion({ title, url, summary, channelName, savedAt }) {
  const notion = new Client({ auth: NOTION_TOKEN });

  await notion.pages.create({
    parent: { database_id: NOTION_FEED_DATABASE_ID },
    properties: {
      // Notion テーブルの列名と型に合わせる
      タイトル: {
        title: [{ text: { content: title || "（タイトルなし）" } }],
      },
      URL: {
        url: url || null,
      },
      要約: {
        rich_text: [{ text: { content: summary || "" } }],
      },
      チャンネル: {
        select: { name: channelName },
      },
      保存日時: {
        date: { start: savedAt },
      },
    },
  });
}

// ==================== rawBody を取得するユーティリティ ====================

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end",  () => resolve(body));
    req.on("error", reject);
  });
}

// ==================== メインハンドラ ====================

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // raw body を取得（署名検証に必要）
  const rawBody = await getRawBody(req);

  // JSON パース
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return res.status(400).send("Bad Request");
  }

  // ----- Slack URL 検証チャレンジ（初回登録時） -----
  if (body.type === "url_verification") {
    return res.status(200).json({ challenge: body.challenge });
  }

  // ----- 署名検証 -----
  if (!verifySlackSignature(rawBody, req.headers)) {
    return res.status(401).send("Unauthorized");
  }

  const event = body.event;

  // reaction_added 以外は無視
  if (!event || event.type !== "reaction_added") {
    return res.status(200).send("OK");
  }

  // トリガー絵文字と一致しなければスキップ
  if (event.reaction !== TRIGGER_EMOJI) {
    return res.status(200).send("OK");
  }

  // メッセージへのリアクションでなければスキップ
  if (event.item?.type !== "message") {
    return res.status(200).send("OK");
  }

  const { channel, ts } = event.item;

  // Slack は 3 秒以内のレスポンスを要求するため、
  // 先に 200 を返してから非同期処理を続ける
  res.status(200).send("OK");

  try {
    const [message, channelName] = await Promise.all([
      fetchMessage(channel, ts),
      fetchChannelName(channel),
    ]);

    if (!message) {
      console.warn("[slack-reaction] Message not found:", channel, ts);
      return;
    }

    // Feed Bot の投稿（bot メッセージ or attachment あり）のみ保存
    if (!message.bot_id && !message.attachments?.length) {
      console.log("[slack-reaction] Not a bot message, skipping.");
      return;
    }

    const { title, url, summary } = parseMessage(message);

    if (!url) {
      console.warn("[slack-reaction] No URL found, skipping.");
      return;
    }

    const savedAt = new Date().toISOString();
    await addToNotion({ title, url, summary, channelName, savedAt });

    console.log(`[slack-reaction] ✅ Saved: ${title}`);
  } catch (err) {
    console.error("[slack-reaction] Error:", err);
  }
};
