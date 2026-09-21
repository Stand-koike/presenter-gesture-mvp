# otohiroi-mvp- リモートへ反映する

Cloud Agent（`cursor[bot]`）は **`presenter-gesture-mvp` にしか push できない**ため、おとひろい本体はブランチ `export/otohiroi-mvp-initial` に置いてあります。

## 方法 A: GitHub Actions（推奨）

1. **presenter-gesture-mvp** の PR で `publish-otohiroi-mvp.yml` を main にマージする（または main に既にあること）
2. GitHub → **Stand-koike/presenter-gesture-mvp** → **Settings → Secrets and variables → Actions**
3. **New repository secret**
   - Name: `OTOHIROI_MVP_PUSH_TOKEN`
   - Value: [Fine-grained PAT](https://github.com/settings/tokens?type=beta)（Repository: `otohiroi-mvp-`、Contents: Read and write）
4. **Actions** → **Publish to otohiroi-mvp-** → **Run workflow**

成功すると https://github.com/Stand-koike/otohiroi-mvp- の `main` が埋まります。

## 方法 B: 手元の git

```bash
git clone --branch export/otohiroi-mvp-initial --depth 1 \
  https://github.com/Stand-koike/presenter-gesture-mvp.git otohiroi-temp
cd otohiroi-temp
git remote set-url origin https://github.com/Stand-koike/otohiroi-mvp-.git
git push -u origin HEAD:main
```

## Cursor

リモートの `main` ができたら、Cloud Agent のリポジトリを **Stand-koike/otohiroi-mvp-** に変更してください。
