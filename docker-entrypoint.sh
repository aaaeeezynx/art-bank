#!/bin/sh
# ============================================================
# Art Bank - 容器啟動腳本
# 等待 MySQL 就緒後啟動 Node 應用
# ============================================================

echo "[Art Bank] 啟動中..."

# 等待 MySQL 就緒（用 node 的 net 模組檢查 TCP 連線）
if [ -n "$DATABASE_URL" ]; then
  echo "[Art Bank] 等待 MySQL 就緒..."

  # 最多等待 60 秒
  node --input-type=module -e "
    import net from 'net';
    const url = new URL(process.env.DATABASE_URL);
    const host = url.hostname;
    const port = url.port || 3306;
    let attempts = 0;
    const maxAttempts = 60;

    function tryConnect() {
      const socket = net.createConnection({ host, port, timeout: 2000 }, () => {
        socket.end();
        console.log('[Art Bank] MySQL 已就緒 (等待 ' + (attempts + 1) + ' 秒)');
        process.exit(0);
      });
      socket.on('error', () => {
        attempts++;
        if (attempts >= maxAttempts) {
          console.log('[Art Bank] 警告: MySQL 連線逾時，仍嘗試啟動應用');
          process.exit(0);
        }
        setTimeout(tryConnect, 1000);
      });
      socket.on('timeout', () => {
        socket.destroy();
        attempts++;
        if (attempts >= maxAttempts) {
          console.log('[Art Bank] 警告: MySQL 連線逾時，仍嘗試啟動應用');
          process.exit(0);
        }
        setTimeout(tryConnect, 1000);
      });
    }
    tryConnect();
  "

  # 額外等待 2 秒讓 MySQL 完全初始化
  sleep 2
fi

echo "[Art Bank] 啟動應用伺服器 (PORT=${PORT:-3000})..."
exec node dist/index.js
