# システムアーキテクチャ

## 📊 全体構成図

```mermaid
graph TB
    U[👤 ユーザー<br/>Slack でコマンド実行]
    
    SA[💬 Slack App<br/>Task Bot]
    SC1[Slash Command<br/>/task]
    SC2[Slash Command<br/>/tasks]
    SC3[Slash Command<br/>/done]
    
    API1[☁️ Vercel<br/>/api/task.js]
    API2[☁️ Vercel<br/>/api/tasks.js]
    API3[☁️ Vercel<br/>/api/done.js]
    
    L1[📚 lib/slack.js<br/>署名検証・パース]
    L2[📚 lib/notion.js<br/>Notion API ラッパー]
    
    E[🔐 Environment Variables<br/>SLACK_SIGNING_SECRET<br/>NOTION_API_KEY<br/>NOTION_DATABASE_ID]
    
    NI[📝 Notion Integration<br/>Task Bot]
    ND[📋 Notion Database<br/>個人タスク]
    
    U -->|コマンド入力| SA
    SA --> SC1
    SA --> SC2
    SA --> SC3
    
    SC1 -->|HTTPS POST| API1
    SC2 -->|HTTPS POST| API2
    SC3 -->|HTTPS POST| API3
    
    API1 --> L1
    API2 --> L1
    API3 --> L1
    
    API1 --> L2
    API2 --> L2
    API3 --> L2
    
    L1 -.参照.-> E
    L2 -.参照.-> E
    
    L2 -->|Notion API| NI
    NI -->|アクセス| ND
    
    API1 -.レスポンス.-> SA
    API2 -.レスポンス.-> SA
    API3 -.レスポンス.-> SA
    
    SA -.表示.-> U
    
    style U fill:#e1f5ff
    style SA fill:#ffe1f5
    style API1 fill:#f5ffe1
    style API2 fill:#f5ffe1
    style API3 fill:#f5ffe1
    style ND fill:#fff5e1
```

---

## 🔄 データフロー図

### /task コマンドの処理フロー

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant S as 💬 Slack App
    participant V as ☁️ Vercel
    participant N as 📝 Notion

    U->>S: /task ブログ記事を書く @高 #学習 due:明日
    
    S->>V: POST /api/task<br/>Body: text=ブログ記事を書く @高 #学習 due:明日<br/>Headers: x-slack-signature, timestamp
    
    Note over V: 署名検証 (lib/slack.js)
    Note over V: パラメータ解析<br/>taskName: "ブログ記事を書く"<br/>priority: "高"<br/>category: "学習"<br/>dueDate: "2026-04-30"
    
    V->>N: pages.create()<br/>Name: "ブログ記事を書く"<br/>ステータス: "TODO"<br/>優先度: "🔴 高"<br/>カテゴリ: "📚 学習"<br/>期限: "2026-04-30"
    
    N-->>V: 201 Created<br/>page_id: xxx
    
    V-->>S: 200 OK<br/>{"text": "✅ タスクを追加しました<br/>🔴 ブログ記事を書く..."}
    
    S-->>U: メッセージ表示
```

### /tasks コマンドの処理フロー

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant S as 💬 Slack App
    participant V as ☁️ Vercel
    participant N as 📝 Notion

    U->>S: /tasks 高
    
    S->>V: POST /api/tasks<br/>Body: text=高
    
    Note over V: 署名検証
    Note over V: フィルター解析<br/>filter: "高" → 優先度フィルター
    
    V->>N: databases.query()<br/>filter: 優先度 = "🔴 高"<br/>sort: 優先度, 期限
    
    N-->>V: 200 OK<br/>results: [task1, task2, ...]
    
    Note over V: タスク整形<br/>優先度別にグループ化
    
    V-->>S: 200 OK<br/>{"text": "📋 タスク一覧...<br/>🔴 高<br/>• タスク1<br/>• タスク2"}
    
    S-->>U: メッセージ表示
```

### /done コマンドの処理フロー

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant S as 💬 Slack App
    participant V as ☁️ Vercel
    participant N as 📝 Notion

    U->>S: /done ブログ
    
    S->>V: POST /api/done<br/>Body: text=ブログ
    
    Note over V: 署名検証
    
    V->>N: databases.query()<br/>filter: ステータス != "完了"
    
    N-->>V: 200 OK<br/>results: [全タスク]
    
    Note over V: 部分一致検索<br/>"ブログ" を含むタスクを検索
    Note over V: 見つかったタスク:<br/>"ブログ記事を書く"
    
    V->>N: pages.update()<br/>page_id: xxx<br/>ステータス: "完了"<br/>完了日: "2026-04-29"
    
    N-->>V: 200 OK
    
    V-->>S: 200 OK<br/>{"text": "✅ タスクを完了しました！<br/>🔴 ブログ記事を書く"}
    
    S-->>U: メッセージ表示
```

---

## 🏗️ コンポーネント構成

```mermaid
graph LR
    subgraph Frontend["フロントエンド"]
        F1[Slack UI]
    end
    
    subgraph Backend["バックエンド (Vercel)"]
        subgraph Handlers["ハンドラー層"]
            H1[task.js]
            H2[tasks.js]
            H3[done.js]
        end
        
        subgraph Utils["ユーティリティ層"]
            U1[slack.js]
            U2[notion.js]
        end
        
        H1 --> U1
        H1 --> U2
        H2 --> U1
        H2 --> U2
        H3 --> U1
        H3 --> U2
    end
    
    subgraph Storage["データストレージ"]
        S1[Notion Database]
    end
    
    F1 -->|HTTPS| Backend
    U2 -->|Notion API| S1
    
    style Frontend fill:#e1f5ff
    style Backend fill:#f5ffe1
    style Storage fill:#fff5e1
```

---

## 🔐 セキュリティフロー

```mermaid
graph TD
    A[Slack からリクエスト受信] --> B{署名検証}
    B -->|署名一致| C[タイムスタンプ検証]
    B -->|署名不一致| Z[401 Unauthorized]
    
    C -->|5分以内| D[リクエスト処理]
    C -->|5分超過| Z
    
    D --> E{環境変数確認}
    E -->|すべて存在| F[Notion API 呼び出し]
    E -->|不足| Y[500 Server Error]
    
    F --> G{API レスポンス}
    G -->|成功| H[Slack にレスポンス]
    G -->|失敗| Y
    
    H --> I[完了]
    
    style B fill:#ffcccc
    style C fill:#ffcccc
    style E fill:#ffffcc
    style F fill:#ccffcc
```

---

## 📦 デプロイアーキテクチャ

```mermaid
graph LR
    subgraph Dev["開発環境"]
        D1[ローカル PC]
    end
    
    subgraph Git["バージョン管理"]
        G1[GitHub Repository]
    end
    
    subgraph CI["デプロイ"]
        V1[Vercel<br/>自動デプロイ]
    end
    
    subgraph Prod["本番環境"]
        P1[Production<br/>slack-notion-bot-phi.vercel.app]
        P2[Preview<br/>各ブランチの一時URL]
    end
    
    D1 -->|git push| G1
    G1 -->|Webhook| V1
    V1 -->|main ブランチ| P1
    V1 -->|その他ブランチ| P2
    
    style Dev fill:#e1f5ff
    style Git fill:#ffe1f5
    style CI fill:#f5ffe1
    style Prod fill:#fff5e1
```

---

## 🔄 環境変数の流れ

```mermaid
graph TD
    subgraph Setup["設定"]
        S1[Notion Integration]
        S2[Slack App]
    end
    
    subgraph Secrets["シークレット取得"]
        SE1[Integration Token]
        SE2[Database ID]
        SE3[Signing Secret]
    end
    
    subgraph Vercel["Vercel 設定"]
        V1[Environment Variables]
        V2[Production]
        V3[Preview]
    end
    
    subgraph Runtime["実行時"]
        R1[process.env.NOTION_API_KEY]
        R2[process.env.NOTION_DATABASE_ID]
        R3[process.env.SLACK_SIGNING_SECRET]
    end
    
    S1 --> SE1
    S1 --> SE2
    S2 --> SE3
    
    SE1 --> V1
    SE2 --> V1
    SE3 --> V1
    
    V1 --> V2
    V1 --> V3
    
    V2 --> R1
    V2 --> R2
    V2 --> R3
    
    style Setup fill:#e1f5ff
    style Secrets fill:#ffe1f5
    style Vercel fill:#f5ffe1
    style Runtime fill:#fff5e1
```

---

## 🎯 技術スタック

| レイヤー | 技術 | 用途 |
|---------|------|------|
| **フロントエンド** | Slack | ユーザーインターフェース |
| **API Gateway** | Slack App | Slash Commands ルーティング |
| **バックエンド** | Vercel Serverless (Node.js 24.x) | ビジネスロジック |
| **データストレージ** | Notion Database | タスクデータ永続化 |
| **認証** | HMAC-SHA256 署名検証 | リクエスト検証 |
| **デプロイ** | Vercel + GitHub | CI/CD |

---

## 📊 パフォーマンス特性

| 指標 | 値 | 備考 |
|-----|-----|------|
| **Cold Start** | 1〜2秒 | 初回リクエスト時 |
| **Warm Request** | 0.3〜0.5秒 | 2回目以降 |
| **メモリ使用量** | 234MB / 2048MB | 約11% |
| **同時実行数** | 制限なし | Vercel Hobby プラン |
| **月間リクエスト数** | ~450回 / 100万回 | 0.045% 使用 |

---

## 🔄 スケーラビリティ

```mermaid
graph LR
    A[リクエスト増加] --> B{Vercel 自動スケール}
    B --> C[インスタンス追加]
    C --> D[並列処理]
    D --> E[Notion API<br/>レート制限内]
    
    style B fill:#ccffcc
    style C fill:#ccffcc
    style D fill:#ccffcc
    style E fill:#ffffcc
```

**Notion API のレート制限:**
- 平均: 3リクエスト/秒
- バースト: 最大10リクエスト/秒
- 現在の使用: 約0.005リクエスト/秒（余裕あり）

---

## 📝 まとめ

このアーキテクチャは以下の特徴を持ちます:

- ✅ **サーバーレス** - メンテナンス不要
- ✅ **スケーラブル** - 自動スケーリング
- ✅ **高速** - 0.3〜2秒のレスポンス
- ✅ **セキュア** - 署名検証 + 暗号化
- ✅ **無料** - 完全に無料枠内で運用可能
