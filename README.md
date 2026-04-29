# Slack + Notion Bot

Slack から Notion を操作する2つの機能を持つ Bot です。

## 📋 機能一覧

### 1. タスク管理 (既存機能)

Slash コマンドで Notion のタスクを管理します。

| コマンド | 説明             |
| -------- | ---------------- |
| `/task`  | タスクを追加     |
| `/tasks` | タスク一覧を表示 |
| `/done`  | タスクを完了     |

### 2. Feed 記事保存 (追加機能)

Feed Bot が投稿した記事に `:atode:` リアクションをつけると、Notion の専用テーブルに自動保存されます。

| 保存される情報 | 内容                        |
| -------------- | --------------------------- |
| タイトル       | 記事タイトル                |
| URL            | 記事リンク                  |
| 要約           | RSS の description から取得 |
| チャンネル     | 投稿元の Slack チャンネル名 |
| 保存日時       | リアクションした日時        |

---

## 🏗️ アーキテクチャ

```
Slack リアクション (:atode:)
      ↓
Slack Events API
      ↓
Vercel Serverless Function (api/slack-reaction.js)
      ↓
Notion API → 専用テーブルに行を追加
```

---

## 🚀 セットアップ手順

### 前提条件

- Notion アカウント
- Slack Workspace（管理者権限）
- Vercel アカウント（GitHub 連携済み）

---

### 1. Notion の準備

#### 1-1. インテグレーションキーの取得

1. <https://www.notion.so/my-integrations> を開く
2. 「+ 新しいインテグレーション」→ 名前: `Slack Notion Bot`、ワークスペースを選択 → 「送信」
3. 表示された `secret_...` をコピー → `NOTION_TOKEN` として使用

#### 1-2. タスク管理用データベースの作成（タスク管理機能を使う場合）

以下のプロパティを持つデータベースを作成します:

| プロパティ名 | 型                                              |
| ------------ | ----------------------------------------------- |
| Name         | タイトル（デフォルト）                          |
| ステータス   | セレクト: TODO / 進行中 / 完了                  |
| 優先度       | セレクト: 🔴 高 / 🟡 中 / 🟢 低                 |
| カテゴリ     | セレクト: 📚 学習 / 💻 開発 / 🏠 生活 / 🎨 趣味 |
| 期限         | 日付                                            |
| 完了日       | 日付                                            |

#### 1-3. Feed 記事保存用データベースの作成

以下のプロパティを持つ**専用の新規データベース**を作成します:

| プロパティ名 | 型                     |
| ------------ | ---------------------- |
| タイトル     | タイトル（デフォルト） |
| URL          | URL                    |
| 要約         | テキスト               |
| チャンネル   | セレクト               |
| 保存日時     | 日付                   |

作成後、ページ URL からデータベース ID を取得します:

```
https://www.notion.so/【この32文字がデータベースID】?v=...
```

#### 1-4. インテグレーションをデータベースに接続

各データベースのページ右上「...」→「接続」→ `Slack Notion Bot` を追加

---

### 2. Vercel へのデプロイ

#### 2-1. GitHub リポジトリを Vercel にインポート

1. <https://vercel.com/dashboard> → 「Add New... → Project」
2. `masa-futa/slack-notion-task-bot` を選択 → 「Import」
3. 設定はデフォルトのまま「Deploy」

#### 2-2. 環境変数を設定

Vercel ダッシュボード → Settings → Environment Variables に以下を追加:

| 変数名                    | 値           | 説明                                                 |
| ------------------------- | ------------ | ---------------------------------------------------- |
| `SLACK_BOT_TOKEN`         | `xoxb-...`   | Slack Bot User OAuth Token（再インストール後に更新） |
| `SLACK_SIGNING_SECRET`    | `...`        | Slack App の Signing Secret                          |
| `NOTION_TOKEN`            | `secret_...` | Notion インテグレーションキー                        |
| `NOTION_API_KEY`          | `secret_...` | タスク管理用（NOTION_TOKEN と同じ値）                |
| `NOTION_DATABASE_ID`      | `...`        | タスク管理用データベース ID                          |
| `NOTION_FEED_DATABASE_ID` | `...`        | Feed 記事保存用データベース ID（32文字）             |
| `TRIGGER_EMOJI`           | `atode`      | トリガー絵文字名（コロンなし）                       |

#### 2-3. 再デプロイして環境変数を反映

Deployments タブ → 最新のデプロイの「...」→「Redeploy」

#### 2-4. 動作確認

ブラウザで以下の URL を開いて `Method Not Allowed` と表示されれば正常:

```
https://your-project.vercel.app/api/slack-reaction
```

---

### 3. Slack App の設定

1. <https://api.slack.com/apps> を開き既存の App を選択

#### 3-1. Bot Token Scopes の追加

「OAuth & Permissions」→「Bot Token Scopes」に以下を追加:

| スコープ           | 用途                                   |
| ------------------ | -------------------------------------- |
| `reactions:read`   | リアクションイベントの受信             |
| `channels:history` | パブリックチャンネルのメッセージ取得   |
| `groups:history`   | プライベートチャンネルのメッセージ取得 |

#### 3-2. Event Subscriptions の設定

「Event Subscriptions」→「Enable Events」を ON

Request URL に入力（Vercel のデプロイが完了している必要があります）:

```
https://your-project.vercel.app/api/slack-reaction
```

✅ Verified と表示されたら成功

「Subscribe to bot events」に追加:

- `reaction_added`

「Save Changes」をクリック

#### 3-3. Slash Commands の設定（タスク管理機能）

「Slash Commands」に以下を追加:

| コマンド | Request URL                                 |
| -------- | ------------------------------------------- |
| `/task`  | `https://your-project.vercel.app/api/task`  |
| `/tasks` | `https://your-project.vercel.app/api/tasks` |
| `/done`  | `https://your-project.vercel.app/api/done`  |

#### 3-4. 再インストール

上部のバナーまたは「Install App」から「Reinstall to Workspace」→「許可する」

再インストール後に発行される新しい `xoxb-...` トークンを Vercel の `SLACK_BOT_TOKEN` に更新する

---

## 📝 使い方

### Feed 記事を保存する

Feed Bot が投稿した記事のメッセージに `:atode:` リアクションをつけるだけです。
数秒後に Notion の Feed 専用テーブルに行が追加されます。

### タスクを追加する

```
/task ブログ記事を書く @高 #学習 due:明日
/task 牛乳を買う @低 #生活
/task Flutter を試す @中 #開発 due:金曜
```

### タスク一覧を表示する

```
/tasks          # 全タスク
/tasks 高       # 優先度高のみ
/tasks 今日     # 今日が期限のもの
/tasks 学習     # カテゴリ「学習」のみ
```

### タスクを完了にする

```
/done ブログ記事
/done 牛乳
```

---

## ⚙️ 環境変数一覧

| 変数名                    | 必須 | 説明                                                 |
| ------------------------- | ---- | ---------------------------------------------------- |
| `SLACK_BOT_TOKEN`         | ✅   | `xoxb-` で始まる Bot User OAuth Token                |
| `SLACK_SIGNING_SECRET`    | ✅   | Slack App の Basic Information にある Signing Secret |
| `NOTION_TOKEN`            | ✅   | `secret_` で始まる Notion インテグレーションキー     |
| `NOTION_API_KEY`          | ✅   | タスク管理用（NOTION_TOKEN と同じ値）                |
| `NOTION_DATABASE_ID`      | ✅   | タスク管理用 Notion データベース ID                  |
| `NOTION_FEED_DATABASE_ID` | ✅   | Feed 記事保存用 Notion データベース ID               |
| `TRIGGER_EMOJI`           | ✅   | トリガー絵文字名（デフォルト: `atode`）              |

---

## 📁 ファイル構成

```
slack-notion-task-bot/
├── api/
│   ├── task.js              # /task コマンド
│   ├── tasks.js             # /tasks コマンド
│   ├── done.js              # /done コマンド
│   └── slack-reaction.js    # リアクション → Notion 保存
├── lib/
│   └── notion.js            # Notion API ユーティリティ
├── docs/
├── package.json
└── README.md
```

---

## 🔧 トラブルシューティング

### Notion に保存されない

Vercel のログを確認します（ダッシュボード → Logs タブ）:

| ログメッセージ                | 原因                                  | 対処                                    |
| ----------------------------- | ------------------------------------- | --------------------------------------- |
| `Not a bot message, skipping` | 通常ユーザーの投稿にリアクションした  | Feed Bot の投稿に `:atode:` をつける    |
| `No URL found, skipping`      | メッセージから URL を抽出できなかった | ログの `text:` 行を確認して開発者に報告 |
| `Message not found`           | Bot がチャンネルに未参加              | チャンネルで `/invite @Bot名` を実行    |
| `Notion エラー: ...`          | Notion API のエラー                   | 環境変数・DB 接続設定を確認             |

### 「再インストールできない」と表示される

Event Subscriptions の Request URL が「✅ Verified」になっていない状態です。先に Vercel にデプロイして URL が有効になってから再インストールしてください。

### Vercel のログの見方

```bash
# CLI で確認する場合
vercel logs your-project-name

# または Vercel ダッシュボード → プロジェクト → Logs タブ
```

### トリガー絵文字を変更したい

Vercel の環境変数 `TRIGGER_EMOJI` を変更して再デプロイします:

```bash
vercel env rm TRIGGER_EMOJI
vercel env add TRIGGER_EMOJI   # 新しい絵文字名を入力（コロンなし）
vercel --prod
```

---

## 📚 参考リンク

- [Notion API ドキュメント](https://developers.notion.com/)
- [Slack Events API](https://api.slack.com/events-api)
- [Slack Block Kit](https://api.slack.com/block-kit)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
