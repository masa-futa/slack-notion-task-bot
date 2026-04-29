# トラブルシューティング

よくある問題と解決方法をまとめています。

---

## 📋 目次

1. [エラー一覧](#エラー一覧)
2. [Q&A](#qa)
3. [デバッグ方法](#デバッグ方法)
4. [サポート](#サポート)

---

## エラー一覧

### Slack 関連エラー

#### エラー1: `/task` が認識されない

```
「/task」は有効なコマンドではありません
```

**原因:**
- Slack App が Workspace にインストールされていない

**解決方法:**
1. https://api.slack.com/apps → Task Bot
2. 「Install App」→「Install to Workspace」
3. 「許可する」をクリック

---

#### エラー2: アプリが応答しない

```
アプリが応答しなかったため、/task は失敗しました
```

**原因:**
- Vercel のエンドポイントに問題がある
- 環境変数が設定されていない
- Slack App の Request URL が間違っている

**解決方法:**

1. **Vercel のログを確認:**
   ```bash
   vercel logs
   ```

2. **Slack App の URL を確認:**
   - https://api.slack.com/apps → Task Bot → Slash Commands
   - Request URL が正しいか確認

3. **環境変数を確認:**
   ```bash
   vercel env ls
   ```

---

### Notion API エラー

#### エラー3: invalid_auth

```
Error: API token is invalid
```

**原因:**
- Notion Integration Token が間違っている
- Token が期限切れ

**解決方法:**

1. **新しい Token を取得:**
   - https://www.notion.so/my-integrations
   - Integration をクリック
   - Token をコピー

2. **Vercel に再設定:**
   ```bash
   vercel env rm NOTION_API_KEY
   vercel env add NOTION_API_KEY
   vercel --prod
   ```

---

#### エラー4: database not found

```
Error: Could not find database with ID: xxx
```

**原因:**
- データベース ID が間違っている
- ページ ID とデータベース ID を間違えている

**解決方法:**

1. **データベースを「フルページで開く」:**
   - Notion でデータベースの「…」→「フルページで開く」
   - 新しいタブの URL からコピー

2. **ハイフンを削除:**
   ```
   3504c8da-dfcd-801d-8260-f1a17629fe5f
   ↓
   3504c8dadfcd801d8260f1a17629fe5f
   ```

3. **Vercel に再設定:**
   ```bash
   vercel env rm NOTION_DATABASE_ID
   vercel env add NOTION_DATABASE_ID
   vercel --prod
   ```

---

#### エラー5: not authorized

```
Error: Integration is not authorized
```

**原因:**
- Integration がデータベースに招待されていない

**解決方法:**

1. Notion でデータベースを開く
2. 右上「…」→「コネクト」
3. Integration（Task Bot）を追加

---

#### エラー6: Name is not a property

```
Error: Name is not a property that exists
```

**原因:**
- Notion のプロパティ名が `Name` ではない

**解決方法:**

**方法A: Notion で Title 列の名前を変更**

1. Notion でデータベースを開く
2. Title 列のヘッダーをクリック
3. プロパティ名を `Name` に変更

**方法B: コードを修正**

現在のプロパティ名を教えてください。コードを修正します。

---

#### エラー7: 完了日 is expected to be email

```
Error: 完了日 is expected to be email
```

**原因:**
- 「完了日」プロパティの型が Date ではなく Email になっている

**解決方法:**

1. Notion でデータベースを開く
2. 「完了日」列のヘッダーをクリック
3. 「プロパティを編集」
4. タイプを **Date** に変更

または削除して作り直す:

1. 「完了日」列を削除
2. 新しいプロパティを追加:
   - 名前: `完了日`
   - タイプ: `Date`

---

### Vercel 関連エラー

#### エラー8: FUNCTION_INVOCATION_FAILED

```
Error: FUNCTION_INVOCATION_FAILED
Duration: 519ms
Status: 500
```

**原因:**
- コード実行中にエラーが発生

**解決方法:**

1. **詳細ログを確認:**
   ```bash
   vercel logs
   ```

2. **よくある原因:**
   - 環境変数が設定されていない
   - Notion のプロパティ名が違う
   - Integration が DB に招待されていない

---

#### エラー9: ssl_connect_error

```
Error: ssl_connect_error
```

**原因:**
- Notion API への接続が失敗

**解決方法:**

1. **Notion Integration Token を確認:**
   ```bash
   vercel env ls
   ```

2. **Integration が DB に招待されているか確認**

3. **データベース ID を確認**

---

### 署名検証エラー

#### エラー10: Invalid signature

```
{"error":"Invalid signature"}
```

**原因:**
- Slack Signing Secret が間違っている
- リクエストが Slack から来ていない

**解決方法:**

1. **Signing Secret を再確認:**
   - https://api.slack.com/apps → Task Bot
   - Basic Information → App Credentials → Signing Secret

2. **Vercel に再設定:**
   ```bash
   vercel env rm SLACK_SIGNING_SECRET
   vercel env add SLACK_SIGNING_SECRET
   vercel --prod
   ```

---

#### エラー11: Cannot convert object to primitive value

```
TypeError: Cannot convert object to primitive value
```

**原因:**
- `lib/slack.js` の署名検証で `req.body` の型処理が間違っている

**解決方法:**

修正版の `lib/slack.js` を使用:
- [修正版コード](../lib/slack.js)

---

## Q&A

### Q1: コマンドの応答が遅い

**A:** Cold Start が原因です。

- 初回リクエスト: 1〜2秒
- 2回目以降: 0.3〜0.5秒

**対策:**
- 定期的に使うとウォームアップされて速くなる
- Vercel の Pro プランで Cold Start を削減可能（有料）

---

### Q2: `/done` で違うタスクが完了される

**A:** 検索ワードが曖昧です。

```bash
# 悪い例
タスク: 「ブログ記事の下書き」「ブログ記事の公開」
/done ブログ  # どちらか一方だけ完了

# 良い例
/done 下書き  # 明確に指定
/done 公開    # 明確に指定
```

---

### Q3: 環境変数が反映されない

**A:** 再デプロイが必要です。

```bash
# 環境変数を追加
vercel env add NOTION_API_KEY

# 再デプロイ（これをしないと反映されない）
vercel --prod
```

---

### Q4: Notion のプロパティ名を変更したい

**A:** 以下の2つの方法があります。

**方法A: Notion で名前を変更（簡単）**

コードの期待値に合わせる:
- `Name` (Title)
- `ステータス` (Select)
- `優先度` (Select)
- `カテゴリ` (Select)
- `期限` (Date)
- `完了日` (Date)

**方法B: コードを修正**

`lib/notion.js` を修正してプロパティ名を変更

---

### Q5: GitHub に push してもデプロイされない

**A:** Vercel と GitHub の連携を確認してください。

1. Vercel Dashboard → プロジェクト → Settings
2. Git → GitHub 連携を確認
3. 未連携なら手動デプロイ: `vercel --prod`

---

### Q6: Slack App の設定を変更したのに反映されない

**A:** Workspace に再インストールが必要です。

1. https://api.slack.com/apps → Task Bot
2. 「Install App」→「Reinstall to Workspace」

---

### Q7: ログが表示されない

**A:** 以下を試してください。

**方法A: CLI でログ確認**
```bash
vercel logs
```

**方法B: Dashboard でログ確認**
1. https://vercel.com/dashboard
2. プロジェクトをクリック
3. 「Logs」タブ

---

### Q8: タスクが追加されたか確認したい

**A:** 以下の方法で確認できます。

1. **Notion で確認:**
   - データベースを開いて新しいタスクを確認

2. **Slack で確認:**
   ```
   /tasks
   ```

3. **Vercel のログで確認:**
   ```bash
   vercel logs
   ```

---

## デバッグ方法

### ステップ1: エラーメッセージを確認

Slack でコマンドを実行したときのエラーメッセージを確認

```
❌ エラーが発生しました: ...
```

---

### ステップ2: Vercel のログを確認

```bash
# リアルタイムログ
vercel logs --follow

# 別のターミナルで Slack でコマンドを実行
/task テスト
```

---

### ステップ3: エンドポイントが生きているか確認

ブラウザで直接アクセス:

```
https://slack-notion-bot-phi.vercel.app/api/task
```

**期待される結果:**
```json
{"error":"Method not allowed"}
```

**404 が出る場合:**
- ファイルがデプロイされていない
- URL が間違っている

---

### ステップ4: 環境変数を確認

```bash
vercel env ls
```

以下の3つが Production と Preview に設定されているか確認:
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `SLACK_SIGNING_SECRET`

---

### ステップ5: Notion 設定を確認

1. **Integration が DB に招待されているか:**
   - Notion でデータベースを開く
   - 「…」→「コネクト」→ Integration を確認

2. **プロパティ名が正しいか:**
   - `Name` (Title)
   - `ステータス` (Select)
   - `優先度` (Select)

---

### ステップ6: Slack App 設定を確認

1. **Slash Commands の URL:**
   - https://api.slack.com/apps → Task Bot → Slash Commands
   - Request URL が正しい Vercel URL か確認

2. **Signing Secret:**
   - Basic Information → App Credentials → Signing Secret
   - Vercel の環境変数と一致しているか確認

---

## よくあるチェックリスト

デバッグ時は以下を順番に確認:

### Notion
- [ ] Integration が作成されている
- [ ] Integration Token が取得できている
- [ ] データベースが作成されている
- [ ] データベース ID が正しい（32文字、ハイフンなし）
- [ ] Integration が DB に招待されている
- [ ] プロパティ名が正しい（`Name`, `ステータス`, `優先度`）

### Slack
- [ ] Slack App が作成されている
- [ ] Slash Commands が3つ設定されている
- [ ] Request URL が正しい Vercel URL
- [ ] Signing Secret が取得できている
- [ ] App が Workspace にインストールされている

### Vercel
- [ ] コードが GitHub に push されている
- [ ] Vercel にデプロイされている
- [ ] 環境変数が3つ設定されている（Production と Preview）
- [ ] デプロイが成功している（エラーなし）
- [ ] エンドポイントにアクセスできる

---

## サポート

### コミュニティ

- [GitHub Issues](https://github.com/masa-futa/slack-notion-task-bot/issues)
- [Slack コミュニティ](https://api.slack.com/community)
- [Notion API フォーラム](https://developers.notion.com/)

### 公式ドキュメント

- [Notion API](https://developers.notion.com/)
- [Slack API](https://api.slack.com/)
- [Vercel Docs](https://vercel.com/docs)

---

## デバッグが解決しない場合

以下の情報を GitHub Issues に投稿してください:

1. **エラーメッセージ** (Slack の表示)
2. **Vercel のログ** (`vercel logs` の出力)
3. **実行したコマンド** (例: `/task テスト @高`)
4. **環境情報**
   - Notion のプロパティ名
   - Vercel の URL
   - 設定した環境変数（値は隠してOK）

できるだけ詳細な情報があると解決が早くなります。
