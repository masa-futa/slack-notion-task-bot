/**
 * api/debug-reaction.js
 *
 * 一時的なデバッグ用エンドポイント。
 * 動作確認後は削除してください。
 */

const crypto = require("crypto");
const { Client } = require("@notionhq/client");

const SLACK_BOT_TOKEN        = process.env.SLACK_BOT_TOKEN        || "";
const SLACK_SIGNING_SECRET   = process.env.SLACK_SIGNING_SECRET   || "";
const NOTION_TOKEN           = process.env.NOTION_TOKEN           || "";
const NOTION_FEED_DATABASE_ID = process.env.NOTION_FEED_DATABASE_ID || "";
const TRIGGER_EMOJI          = process.env.TRIGGER_EMOJI          || "atode";

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end",  () => resolve(body));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  const log = [];

  // ----- 環境変数チェック -----
  log.push("=== 環境変数チェック ===");
  log.push(`SLACK_BOT_TOKEN     : ${SLACK_BOT_TOKEN     ? "✅ セット済 (" + SLACK_BOT_TOKEN.slice(0,10) + "...)" : "❌ 未設定"}`);
  log.push(`SLACK_SIGNING_SECRET: ${SLACK_SIGNING_SECRET ? "✅ セット済" : "❌ 未設定"}`);
  log.push(`NOTION_TOKEN        : ${NOTION_TOKEN        ? "✅ セット済 (" + NOTION_TOKEN.slice(0,10) + "...)" : "❌ 未設定"}`);
  log.push(`NOTION_FEED_DATABASE_ID: ${NOTION_FEED_DATABASE_ID ? "✅ " + NOTION_FEED_DATABASE_ID : "❌ 未設定"}`);
  log.push(`TRIGGER_EMOJI       : ${TRIGGER_EMOJI}`);
  log.push("");

  if (req.method === "GET") {
    // GET アクセス時: 環境変数の状態だけ返す
    return res.status(200).json({ log });
  }

  // POST の場合: Slack イベントをそのまま解析してログに出す
  const rawBody = await getRawBody(req);
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "JSON parse failed", raw: rawBody.slice(0, 200) });
  }

  log.push("=== Slack イベント内容 ===");
  log.push(`type: ${body.type}`);

  if (body.type === "url_verification") {
    log.push("url_verification チャレンジ → 返答");
    console.log(log.join("\n"));
    return res.status(200).json({ challenge: body.challenge });
  }

  const event = body.event || {};
  log.push(`event.type    : ${event.type}`);
  log.push(`event.reaction: ${event.reaction}`);
  log.push(`item.type     : ${event.item?.type}`);
  log.push(`channel       : ${event.item?.channel}`);
  log.push(`ts            : ${event.item?.ts}`);
  log.push("");

  // トリガー絵文字チェック
  if (event.reaction !== TRIGGER_EMOJI) {
    log.push(`❌ 絵文字不一致: "${event.reaction}" !== "${TRIGGER_EMOJI}"`);
    console.log(log.join("\n"));
    return res.status(200).json({ log, result: "emoji_mismatch" });
  }
  log.push(`✅ 絵文字一致: ${event.reaction}`);

  // Slack API でメッセージ取得
  log.push("=== Slack API: メッセージ取得 ===");
  const channel = event.item?.channel;
  const ts      = event.item?.ts;

  try {
    const slackRes = await fetch(
      `https://slack.com/api/conversations.replies?channel=${channel}&ts=${ts}&limit=1&inclusive=true`,
      { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } }
    );
    const slackData = await slackRes.json();
    log.push(`Slack API ok: ${slackData.ok}`);
    log.push(`Slack API error: ${slackData.error || "なし"}`);

    if (slackData.ok && slackData.messages?.length) {
      const msg = slackData.messages.find((m) => m.ts === ts) || slackData.messages[0];
      log.push(`bot_id: ${msg.bot_id || "なし（通常ユーザー投稿）"}`);
      log.push(`attachments数: ${msg.attachments?.length || 0}`);
      log.push(`text: ${(msg.text || "").slice(0, 100)}`);
      if (msg.attachments?.length) {
        log.push(`attachment[0].text: ${(msg.attachments[0].text || "").slice(0, 200)}`);
      }
    } else {
      log.push("❌ メッセージ取得失敗");
    }
  } catch (e) {
    log.push(`❌ Slack API 呼び出しエラー: ${e.message}`);
  }

  // Notion 書き込みテスト
  log.push("");
  log.push("=== Notion API テスト ===");
  try {
    const notion = new Client({ auth: NOTION_TOKEN });
    await notion.pages.create({
      parent: { database_id: NOTION_FEED_DATABASE_ID },
      properties: {
        タイトル: { title: [{ text: { content: "🔧 デバッグテスト" } }] },
        URL:     { url: "https://example.com" },
        要約:    { rich_text: [{ text: { content: "デバッグ用テストエントリです。削除してください。" } }] },
        チャンネル: { select: { name: "#debug" } },
        保存日時:   { date: { start: new Date().toISOString() } },
      },
    });
    log.push("✅ Notion 書き込み成功！");
  } catch (e) {
    log.push(`❌ Notion エラー: ${e.message}`);
    log.push(`   code: ${e.code}`);
    log.push(`   status: ${e.status}`);
  }

  console.log(log.join("\n"));
  return res.status(200).json({ log });
};
