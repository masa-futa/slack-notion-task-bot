# デプロイ手順書

## 📋 目次

1. [前提条件](#前提条件)
2. [初回セットアップ](#初回セットアップ)
3. [コード更新フロー](#コード更新フロー)
4. [環境変数の管理](#環境変数の管理)
5. [デプロイの確認](#デプロイの確認)

---

## 前提条件

### 必要なアカウント

- ✅ Notion アカウント
- ✅ Slack Workspace（管理者権限）
- ✅ GitHub アカウント
- ✅ Vercel アカウント（GitHub でサインアップ可能）

### 必要なツール

```bash
# Git
git --version

# Node.js (推奨: v18以上)
node --version

# npm
npm --version

# Vercel CLI (オプション)
npm install -g vercel
```

---

## 初回セットアップ

### ステップ1: Notion の準備（10分）

#### 1.1 Integration を作成

1. https://www.notion.so/my-integrations にアクセス
2. 「**+ New integration**」をクリック
3. 設定:
   - **Name**: `Task Bot`
   - **Type**: `Internal`
   - **Associated workspace**: 自分の Workspace
4. 「**Submit**」をクリック
5. **Integration Token** をコピー（後で使用）
   ```
   ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   または
   secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

#### 1.2 データベースを作成

1. Notion で新しいページを作成
2. 「データベース - テーブルビュー」を選択
3. タイトル: `📋 個人タスク`

#### 1.3 プロパティを設定

以下のプロパティを追加:

| プロパティ名 | 種類 | 選択肢 |
|------------|------|--------|
| `Name` | Title | - |
| `ステータス` | Select | `TODO`, `進行中`, `完了` |
| `優先度` | Select | `🔴 高`, `🟡 中`, `🟢 低` |
| `カテゴリ` | Select | `📚 学習`, `💻 開発`, `🏠 生活`, `🎨 趣味` |
| `期限` | Date | - |
| `完了日` | Date | - |

#### 1.4 Integration を DB に招待

1. データベースページで右上「**…**」
2. 「**コネクト**」をクリック
3. `Task Bot` を選択して追加

#### 1.5 データベース ID を取得

1. データベースを「**フルページで開く**」
2. URL をコピー:
   ```
   https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                         この32文字がデータベース ID
   ```
3. **ハイフンを削除**:
   ```
   3504c8da-dfcd-801d-8260-f1a17629fe5f
   ↓
   3504c8dadfcd801d8260f1a17629fe5f
   ```

---

### ステップ2: Slack App の作成（15分）

#### 2.1 Slack App を作成

1. https://api.slack.com/apps にアクセス
2. 「**Create New App**」→「**From scratch**」
3. 設定:
   - **App Name**: `Task Bot`
   - **Workspace**: 自分の Workspace
4. 「**Create App**」をクリック

#### 2.2 Slash Commands を追加

左メニュー「**Slash Commands**」→「**Create New Command**」

##### コマンド1: /task

| 項目 | 値 |
|-----|-----|
| **Command** | `/task` |
| **Request URL** | `https://slack-notion-bot-phi.vercel.app/api/task` |
| **Short Description** | タスクを追加 |
| **Usage Hint** | `タスク名 @優先度 #カテゴリ due:期限` |

##### コマンド2: /tasks

| 項目 | 値 |
|-----|-----|
| **Command** | `/tasks` |
| **Request URL** | `https://slack-notion-bot-phi.vercel.app/api/tasks` |
| **Short Description** | タスク一覧を表示 |
| **Usage Hint** | `[フィルター: 高/中/低/今日/学習]` |

##### コマンド3: /done

| 項目 | 値 |
|-----|-----|
| **Command** | `/done` |
| **Request URL** | `https://slack-notion-bot-phi.vercel.app/api/done` |
| **Short Description** | タスクを完了 |
| **Usage Hint** | `タスク名（部分一致）` |

**注意**: URL は後で正しい Vercel URL に置き換えます

#### 2.3 Signing Secret を取得

1. 左メニュー「**Basic Information**」
2. 「**App Credentials**」セクション
3. **Signing Secret** の「**Show**」をクリック
4. コピーして保存

---

### ステップ3: GitHub にコードをデプロイ（5分）

#### 3.1 リポジトリを作成

```bash
# プロジェクトフォルダに移動
cd slack-notion-bot

# Git 初期化
git init
git add .
git commit -m "Initial commit: Slack + Notion Task Bot"
```

#### 3.2 GitHub にリポジトリを作成

1. https://github.com/new にアクセス
2. Repository name: `slack-notion-task-bot`
3. Visibility: **Public** または **Private**
4. ✅ **「Add a README file」はチェックしない**
5. 「**Create repository**」

#### 3.3 リモートを追加して push

```bash
git remote add origin https://github.com/YOUR_USERNAME/slack-notion-task-bot.git
git branch -M main
git push -u origin main
```

---

### ステップ4: Vercel にデプロイ（10分）

#### 4.1 Vercel にログイン

1. https://vercel.com にアクセス
2. 「**Sign Up**」→「**Continue with GitHub**」

#### 4.2 プロジェクトをインポート

1. Dashboard で「**Add New**」→「**Project**」
2. GitHub リポジトリ `slack-notion-task-bot` を選択
3. 「**Import**」をクリック

#### 4.3 プロジェクト設定

| 項目 | 値 |
|-----|-----|
| **Project Name** | `slack-notion-bot` |
| **Framework Preset** | Other (自動検出) |
| **Root Directory** | `./` |
| **Build Command** | (空欄でOK) |
| **Output Directory** | (空欄でOK) |

「**Deploy**」をクリック

#### 4.4 デプロイ完了

数十秒後、以下のような URL が表示されます:

```
✅  Production: https://slack-notion-bot-phi.vercel.app
```

この URL をコピーしてください。

---

### ステップ5: 環境変数を設定（5分）

#### 方法A: Vercel Dashboard で設定（推奨）

1. プロジェクトページで「**Settings**」タブ
2. 左メニュー「**Environment Variables**」
3. 以下の3つを追加:

##### NOTION_API_KEY

- **Name**: `NOTION_API_KEY`
- **Value**: Notion の Integration Token
- **Environment**: `Production` と `Preview` を選択

##### NOTION_DATABASE_ID

- **Name**: `NOTION_DATABASE_ID`
- **Value**: データベース ID（ハイフンなし32文字）
- **Environment**: `Production` と `Preview` を選択

##### SLACK_SIGNING_SECRET

- **Name**: `SLACK_SIGNING_SECRET`
- **Value**: Slack の Signing Secret
- **Environment**: `Production` と `Preview` を選択

#### 方法B: CLI で設定

```bash
vercel env add NOTION_API_KEY
# → Production と Preview を選択
# → 値を入力

vercel env add NOTION_DATABASE_ID
# → Production と Preview を選択
# → 値を入力

vercel env add SLACK_SIGNING_SECRET
# → Production と Preview を選択
# → 値を入力
```

#### 5.1 環境変数を反映

```bash
# Dashboard で設定した場合は再デプロイ
vercel --prod

# または Dashboard の「Deployments」タブで「Redeploy」
```

---

### ステップ6: Slack App の URL を更新（5分）

#### 6.1 Slack App の設定を開く

https://api.slack.com/apps → Task Bot

#### 6.2 Slash Commands の URL を更新

左メニュー「**Slash Commands**」

各コマンドをクリックして URL を更新:

```
/task  → https://slack-notion-bot-phi.vercel.app/api/task
/tasks → https://slack-notion-bot-phi.vercel.app/api/tasks
/done  → https://slack-notion-bot-phi.vercel.app/api/done
```

**あなたの Vercel URL に置き換えてください**

#### 6.3 Workspace に再インストール

1. 左メニュー「**Install App**」
2. 「**Reinstall to Workspace**」をクリック
3. 「**許可する**」をクリック

---

### ステップ7: 動作確認（3分）

#### 7.1 Slack でテスト

```
/task テストタスク @高 #開発 due:明日
```

#### 7.2 成功時の表示

```
✅ タスクを追加しました
🔴 テストタスク 💻 開発 (期限: 2026-04-30)
```

#### 7.3 Notion で確認

Notion のデータベースに新しいタスクが追加されていることを確認

---

## コード更新フロー

### ローカルで開発

```bash
# ブランチを作成
git checkout -b feature/new-feature

# コードを修正
vim api/task.js

# コミット
git add .
git commit -m "Add new feature"

# push
git push origin feature/new-feature
```

### GitHub で Pull Request

1. GitHub でブランチから `main` への PR を作成
2. Vercel が自動で **Preview デプロイ** を作成
3. Preview URL でテスト
4. 問題なければ PR をマージ

### 本番デプロイ

```bash
# main ブランチにマージ後
git checkout main
git pull

# Vercel が自動デプロイ（GitHub 連携時）
# または手動デプロイ:
vercel --prod
```

---

## 環境変数の管理

### 環境変数一覧を確認

```bash
vercel env ls
```

### 環境変数を追加

```bash
vercel env add VARIABLE_NAME
```

### 環境変数を削除

```bash
vercel env rm VARIABLE_NAME
```

### 環境変数を更新

```bash
# 削除してから追加
vercel env rm VARIABLE_NAME
vercel env add VARIABLE_NAME
```

---

## デプロイの確認

### デプロイステータス

```bash
# 最新のデプロイを確認
vercel ls

# 特定のデプロイの詳細
vercel inspect <deployment-url>
```

### ログの確認

```bash
# リアルタイムログ
vercel logs --follow

# 過去のログ
vercel logs

# 特定のデプロイのログ
vercel logs <deployment-url>
```

### ブラウザで確認

```
# エンドポイントが生きているか確認
https://slack-notion-bot-phi.vercel.app/api/task

# 期待される結果:
{"error":"Method not allowed"}
```

---

## トラブルシューティング

### デプロイが失敗する

```bash
# ログを確認
vercel logs

# ローカルでビルドテスト
npm install
node api/task.js
```

### 環境変数が反映されない

```bash
# 環境変数を確認
vercel env ls

# 再デプロイ
vercel --prod
```

### Slack からの応答がない

1. Vercel のログを確認: `vercel logs --follow`
2. Slack で `/task` を実行
3. ログに表示されるエラーを確認

---

## ベストプラクティス

### 1. Git フロー

```
main ブランチ = 本番環境
feature/* ブランチ = 開発環境
```

### 2. 環境変数

- 本番用とテスト用で分ける
- `.env.local` は `.gitignore` に追加
- シークレットは GitHub Secrets または Vercel に保存

### 3. デプロイ前のチェックリスト

- [ ] ローカルでテスト済み
- [ ] 環境変数が設定済み
- [ ] Notion Integration が DB に招待済み
- [ ] Slack App の URL が正しい

---

## 次のステップ

- ✅ デプロイ完了
- 📝 [commands.md](./commands.md) でコマンドの使い方を確認
- 🐛 問題が起きたら [troubleshooting.md](./troubleshooting.md) を参照
