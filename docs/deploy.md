# 部署指南 — 靜態託管

> 前提:本工具目前為純靜態前端,無後端。build 產物在 `frontend/dist/`。
> 若未來重啟抓圖後端,本文件全部重新評估(需 VPS + SSRF 防護 + 授權)。

## 路線 A:GitHub + Cloudflare Pages(推薦,push 即自動部署)

### 1. 安裝 git 與 gh(需要 sudo,在你自己的終端執行)
```bash
sudo apt install git gh
```

### 2. 建立 repo 並推上 GitHub
```bash
cd ~/projects/image-batch-tool
git init
git add .
git commit -m "feat: 圖片批量處理工具第一版(馬賽克/浮水印/批量下載)"
gh auth login          # 依提示用瀏覽器登入
gh repo create image-batch-tool --public --source=. --push
```

### 3. 連接 Cloudflare Pages
1. 到 https://pages.cloudflare.com → 登入(可用 GitHub 帳號)
2. Create a project → Connect to Git → 選 `image-batch-tool` repo
3. Build 設定:
   | 欄位 | 值 |
   |------|-----|
   | Framework preset | Vite |
   | Root directory | `frontend` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
4. Deploy → 完成後拿到 `https://<專案名>.pages.dev`

之後每次 `git push` 都會自動重新部署。

### Vercel / Netlify 替代
流程相同,build 設定也一樣(root `frontend`、build `npm run build`、輸出 `dist`)。

## 路線 B:不裝 git,直接上傳(最快 5 分鐘,但每次更新要手動)

### 選項 B1:Netlify Drop(零安裝)
1. 瀏覽器開 https://app.netlify.com/drop
2. 把 `~/projects/image-batch-tool/frontend/dist/` 整個資料夾拖進去
3. 完成,拿到網址(註冊帳號可保留網站與改名)

### 選項 B2:Cloudflare Wrangler CLI
```bash
cd ~/projects/image-batch-tool/frontend
npx wrangler login                      # 瀏覽器授權
npx wrangler pages deploy dist --project-name=image-batch-tool
```

## 上線後檢查清單

- [ ] 手機開啟會顯示「建議使用電腦」提示
- [ ] 上傳圖 → 馬賽克 → 浮水印 → 下載 ZIP 全流程跑一次
- [ ] (可選)Cloudflare Web Analytics:Pages 後台一鍵開啟,免費、無 cookie
- [ ] (可選)自訂網域:託管平台後台綁定,平台會自動配 HTTPS
