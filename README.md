# G⁵ Portal

麗澤高等学校 5年G組 フリー自作ツール・副教材配信ポータル。

## 機能

- **無料自作ツール配信** … `pages/` 配下（1機能 = 1ディレクトリ）
- **MultiQuiz** … `.multiquiz` / `.mq` 解析・解答・採点
- **文字数カウント** · **文字拡大鏡** · **パスワード生成** · **暗号化・復号**
- **統一メニュー** … ラジアル + ハンバーガー（FAB）

## メニュー操作

| 操作 | 動作 |
|------|------|
| 右下 FAB（☰） | ハンバーガー |
| ロングプレス / トリプルタップ | ラジアル |
| Ctrl / ⌘ + K | ラジアル開閉 |
| Escape | 閉じる |

## 構成

```
index.html
MENU/MENU.css · MENU.js
pages/
  multiquiz/
  char-count/
  char-magnifier/
  password-gen/
  crypto/
src/css/style.css · src/js/main.js
```

## デプロイ

GitHub Pages。concurrency で横入りキャンセルを防止。

## 変更履歴

### フェーズD
- フェーズC 未同期資産の完全プッシュ（MENU / password / crypto の CSS·JS）
- MultiQuiz への MENU 配線
- style.css からログイン用スタイル削除

### フェーズC
- 文字数カウント / 文字拡大鏡 / パスワード生成 / 暗号化・復号

### フェーズB
- MENU 追加、deploy.yml 強化

### フェーズA
- ログイン・ユーザーファイル削除

© 2026 Reitaku H.S. 5G
