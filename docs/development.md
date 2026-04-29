# 開発者向けガイド

このドキュメントでは、コードのカスタマイズや拡張方法について説明します。

---

## 📋 目次

1. [ファイル構成](#ファイル構成)
2. [API 仕様](#api-仕様)
3. [カスタマイズ方法](#カスタマイズ方法)
4. [テスト](#テスト)
5. [拡張案](#拡張案)

---

## ファイル構成

```
slack-notion-bot/
├── api/
│   ├── task.js         # /task コマンドハンドラー
│   ├── tasks.js        # /tasks コマンドハンドラー
│   └── done.js         # /done コマンドハンドラー
│
├── lib/
│   ├── slack.js        # Slack ユーティリティ
│   └── notion.js       # Notion API ラッパー
│
├── package.json        # 依存関係定義
├── vercel.json         # Vercel 設定（オプション）
└── README.md           # プロジェクト説明
```

---

## API 仕様

### api/task.js

**エンドポイント:** `POST /api/task`

**リクエスト:**
```
Content-Type: application/x-www-form-urlencoded

text=ブログ記事を書く @高 #学習 due:明日
user_id=U123456
user_name=masa-futa
channel_id=C123456
```

**レスポンス:**
```json
{
  "response_type": "in_channel",
  "text": "✅ タスクを追加しました\n🔴 ブログ記事を書く 📚 学習 (期限: 2026-04-30)"
}
```

**処理フロー:**
1. 署名検証 (`verifySlackRequest`)
2. コマンドパース (`parseTaskCommand`)
3. Notion にタスク作成 (`createTask`)
4. レスポンス返却

---

### api/tasks.js

**エンドポイント:** `POST /api/tasks`

**リクエスト:**
```
Content-Type: application/x-www-form-urlencoded

text=高
user_id=U123456
```

**レスポンス:**
```json
{
  "response_type": "ephemeral",
  "text": "📋 タスク一覧 (フィルター: 高) (2件)\n\n🔴 高\n• タスク1\n• タスク2"
}
```

**処理フロー:**
1. 署名検証
2. フィルター解析
3. Notion からタスク取得 (`getTasks`)
4. タスク整形 (`formatTask`)
5. レスポンス返却

---

### api/done.js

**エンドポイント:** `POST /api/done`

**リクエスト:**
```
Content-Type: application/x-www-form-urlencoded

text=ブログ
user_id=U123456
```

**レスポンス:**
```json
{
  "response_type": "in_channel",
  "text": "✅ タスクを完了しました！\n🔴 ブログ記事を書く"
}
```

**処理フロー:**
1. 署名検証
2. Notion からタスク検索 (`completeTask`)
3. 部分一致検索
4. ステータス更新
5. レスポンス返却

---

## lib/slack.js

### verifySlackRequest(req)

Slack の署名を検証します。

**パラメータ:**
- `req`: HTTP リクエストオブジェクト

**戻り値:**
- `true`: 署名が有効
- `false`: 署名が無効

**実装:**
```javascript
function verifySlackRequest(req) {
  const slackSignature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  // タイムスタンプチェック (5分以内)
  const time = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(time - timestamp) > 300) {
    return false;
  }

  // HMAC-SHA256 で署名生成
  const sigBasestring = `v0:${timestamp}:${bodyString}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring, 'utf8')
    .digest('hex');

  // 署名比較
  return crypto.timingSafeEqual(
    Buffer.from(mySignature, 'utf8'),
    Buffer.from(slackSignature, 'utf8')
  );
}
```

---

### parseTaskCommand(text)

コマンドテキストをパースします。

**パラメータ:**
- `text`: コマンドテキスト（例: `"ブログ記事 @高 #学習 due:明日"`）

**戻り値:**
```javascript
{
  taskName: "ブログ記事",
  priority: "高",
  category: "学習",
  dueDate: "2026-04-30"
}
```

**実装:**
```javascript
function parseTaskCommand(text) {
  const parts = text.trim().split(/\s+/);
  let taskName = '';
  let priority = null;
  let category = null;
  let dueDate = null;

  for (const part of parts) {
    if (part.startsWith('@')) {
      priority = part.substring(1);
    } else if (part.startsWith('#')) {
      category = part.substring(1);
    } else if (part.startsWith('due:')) {
      // 日付解析
    } else {
      taskName += (taskName ? ' ' : '') + part;
    }
  }

  return { taskName, priority, category, dueDate };
}
```

---

## lib/notion.js

### createTask({ title, priority, category, dueDate })

Notion にタスクを作成します。

**パラメータ:**
```javascript
{
  title: "ブログ記事を書く",
  priority: "高",      // "高", "中", "低"
  category: "学習",    // "学習", "開発", "生活", "趣味"
  dueDate: "2026-04-30"
}
```

**戻り値:**
- Notion の page オブジェクト

**実装:**
```javascript
async function createTask({ title, priority = '中', category = null, dueDate = null }) {
  const properties = {
    'Name': {
      title: [{ text: { content: title } }],
    },
    'ステータス': {
      select: { name: 'TODO' },
    },
    '優先度': {
      select: { name: PRIORITY_MAP[priority] || '🟡 中' },
    },
  };

  if (category && CATEGORY_MAP[category]) {
    properties['カテゴリ'] = {
      select: { name: CATEGORY_MAP[category] },
    };
  }

  if (dueDate) {
    properties['期限'] = {
      date: { start: dueDate },
    };
  }

  return await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties,
  });
}
```

---

### getTasks(filter)

Notion からタスクを取得します。

**パラメータ:**
- `filter`: フィルター文字列（`"高"`, `"今日"`, `"学習"` など）

**戻り値:**
- タスクの配列

**実装:**
```javascript
async function getTasks(filter = null) {
  let notionFilter = {
    property: 'ステータス',
    select: { does_not_equal: '完了' },
  };

  // フィルター適用
  if (filter === '高' || filter === '中' || filter === '低') {
    notionFilter = {
      and: [
        notionFilter,
        { property: '優先度', select: { equals: PRIORITY_MAP[filter] } },
      ],
    };
  }

  return await notion.databases.query({
    database_id: DATABASE_ID,
    filter: notionFilter,
    sorts: [
      { property: '優先度', direction: 'ascending' },
      { property: '期限', direction: 'ascending' },
    ],
  });
}
```

---

### completeTask(searchTerm)

タスクを完了します。

**パラメータ:**
- `searchTerm`: 検索キーワード

**戻り値:**
- 完了したタスク（見つからない場合は `null`）

**実装:**
```javascript
async function completeTask(searchTerm) {
  // 全タスクを取得
  const allTasks = await getTasks();
  
  // 部分一致検索
  const matchedTask = allTasks.find(task => {
    const title = task.properties.Name.title[0]?.plain_text || '';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!matchedTask) {
    return null;
  }

  // ステータスを「完了」に更新
  await notion.pages.update({
    page_id: matchedTask.id,
    properties: {
      'ステータス': { select: { name: '完了' } },
      '完了日': { date: { start: new Date().toISOString().split('T')[0] } },
    },
  });

  return matchedTask;
}
```

---

## カスタマイズ方法

### 1. 新しいプロパティを追加

#### Notion に追加

1. Notion でプロパティを追加（例: `担当者` (Select)）

#### コードに反映

**lib/notion.js:**
```javascript
async function createTask({ title, assignee, ... }) {
  const properties = {
    // 既存のプロパティ
    ...

    // 新しいプロパティ
    '担当者': {
      select: { name: assignee },
    },
  };
}
```

**lib/slack.js:**
```javascript
function parseTaskCommand(text) {
  // 既存のパース処理
  ...

  // 新しいパラメータ
  if (part.startsWith('!')) {
    assignee = part.substring(1);
  }

  return { taskName, priority, category, dueDate, assignee };
}
```

---

### 2. 新しいコマンドを追加

#### 例: /urgent - 緊急タスクのみ表示

**api/urgent.js:**
```javascript
const { verifySlackRequest } = require('../lib/slack');
const { getTasks, formatTask } = require('../lib/notion');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifySlackRequest(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    // 優先度「高」かつ期限が今日または過去
    const tasks = await getTasks('高');
    const today = new Date().toISOString().split('T')[0];
    
    const urgentTasks = tasks.filter(task => {
      const dueDate = task.properties['期限']?.date?.start;
      return dueDate && dueDate <= today;
    });

    if (urgentTasks.length === 0) {
      return res.status(200).json({
        response_type: 'ephemeral',
        text: '🎉 緊急タスクはありません！',
      });
    }

    let message = `⚠️ 緊急タスク (${urgentTasks.length}件)\n\n`;
    for (const task of urgentTasks) {
      message += `• ${formatTask(task)}\n`;
    }

    return res.status(200).json({
      response_type: 'ephemeral',
      text: message.trim(),
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(200).json({
      response_type: 'ephemeral',
      text: `❌ エラーが発生しました: ${error.message}`,
    });
  }
};
```

#### Slack App に追加

1. https://api.slack.com/apps → Task Bot
2. Slash Commands → Create New Command
3. Command: `/urgent`
4. Request URL: `https://your-url.vercel.app/api/urgent`
5. Save

---

### 3. 通知機能を追加

#### 例: 毎朝の自動リマインド

**api/cron.js:**
```javascript
const { getTasks, formatTask } = require('../lib/notion');

module.exports = async (req, res) => {
  // Vercel Cron Secret で認証
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 今日が期限のタスクを取得
    const tasks = await getTasks('今日');

    if (tasks.length === 0) {
      return res.status(200).json({ message: 'No tasks today' });
    }

    // Slack に投稿
    const message = `☀️ おはようございます！\n今日のタスク (${tasks.length}件)\n\n` +
      tasks.map(task => `• ${formatTask(task)}`).join('\n');

    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: process.env.SLACK_CHANNEL_ID,
        text: message,
      }),
    });

    return res.status(200).json({ message: 'Reminder sent' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
```

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 8 * * *"
    }
  ]
}
```

---

## テスト

### ローカルテスト

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
# .env.local を編集

# Vercel Dev Server で実行
vercel dev
```

### cURL でテスト

```bash
# /task エンドポイント
curl -X POST http://localhost:3000/api/task \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "text=テストタスク"

# 署名検証エラーが出るのは正常
```

### Notion API のテスト

```javascript
// test.js
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function test() {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
  });
  console.log(response);
}

test();
```

---

## 拡張案

### 1. 定期レポート

- 週次サマリー（完了数・カテゴリ別）
- 月次レポート

### 2. リマインダー

- 期限1日前に通知
- 優先度高の未完了タスク通知

### 3. 統計機能

- 完了率のグラフ
- カテゴリ別の時間分析

### 4. チーム機能

- タスクの割り当て
- メンション通知

### 5. Integration 連携

- GitHub Issues との同期
- Google Calendar との連携
- Jira との統合

---

## コントリビューション

プルリクエスト歓迎です！

1. Fork する
2. Feature ブランチを作成
3. コミット
4. Push
5. Pull Request を作成

---

## ライセンス

MIT License
