# Slack + Notion タスク管理 Bot

Slack から Notion のタスクを管理できる Bot です。

## 📋 機能

- `/task` - タスクを追加
- `/tasks` - タスク一覧を表示
- `/done` - タスクを完了

## 🚀 デプロイ手順

### 1. 前提条件

- Notion アカウント
- Slack Workspace（管理者権限）
- GitHub アカウント
- Vercel アカウント（GitHub でサインアップ）

### 2. Notion の準備

1. Notion でデータベースを作成
2. プロパティを追加:
   - Name (Title)
   - ステータス (Select): TODO, 進行中, 完了
   - 優先度 (Select): 🔴 高, 🟡 中, 🟢 低
   - カテゴリ (Select): 📚 学習, 💻 開発, 🏠 生活, 🎨 趣味
   - 期限 (Date)
   - 完了日 (Date)

3. Integration を作成:
   - https://www.notion.so/my-integrations
   - API Key をコピー

4. データベースに Integration を招待

5. データベース ID を取得（URL から）

### 3. GitHub にコードを push

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/slack-notion-bot.git
git push -u origin main
```

### 4. Vercel にデプロイ

```bash
# Vercel CLI をインストール
npm i -g vercel

# ログイン
vercel login

# デプロイ
vercel
```

### 5. Vercel で環境変数を設定

```bash
vercel env add NOTION_API_KEY
vercel env add NOTION_DATABASE_ID
vercel env add SLACK_SIGNING_SECRET
```

または Vercel Dashboard で設定:
- Settings → Environment Variables

### 6. Slack App を作成

1. https://api.slack.com/apps
2. Slash Commands を追加:
   - `/task` → `https://your-app.vercel.app/api/task`
   - `/tasks` → `https://your-app.vercel.app/api/tasks`
   - `/done` → `https://your-app.vercel.app/api/done`

3. Signing Secret をコピー

4. Workspace にインストール

## 📝 使い方

### タスクを追加

```
/task ブログ記事を書く @高 #学習 due:明日
/task 牛乳を買う @低 #生活
/task Flutter を試す @中 #開発 due:金曜
```

### タスク一覧

```
/tasks          # 全タスク
/tasks 高       # 優先度高のみ
/tasks 今日     # 今日が期限のもの
/tasks 学習     # カテゴリ「学習」のみ
```

### タスク完了

```
/done ブログ記事
/done 牛乳
```

## 🔧 トラブルシューティング

### タスクが追加されない

- Notion Integration が DB に招待されているか確認
- 環境変数が正しく設定されているか確認

### コマンドがタイムアウトする

- Vercel の URL が正しいか確認
- Vercel のログを確認: `vercel logs`

## 📚 参考

- [Notion API](https://developers.notion.com/)
- [Slack API](https://api.slack.com/)
- [Vercel Docs](https://vercel.com/docs)
