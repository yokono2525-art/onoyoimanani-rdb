const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// データベース初期化
const db = new sqlite3.Database('timeline.db');

// テーブル作成
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // インデックス作成（パフォーマンス向上）
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_timestamp ON posts(timestamp DESC)
  `);
});

// API エンドポイント

// 投稿一覧取得（最新1000件）
app.get('/api/posts', (req, res) => {
  const stmt = db.prepare(`
    SELECT id, author, content, timestamp 
    FROM posts 
    ORDER BY timestamp DESC 
    LIMIT 1000
  `);
  
  stmt.all((err, rows) => {
    if (err) {
      console.error('Error fetching posts:', err);
      return res.status(500).json({ error: 'Failed to fetch posts' });
    }
    res.json(rows);
  });
});

// 新規投稿
app.post('/api/posts', (req, res) => {
  const { author, content } = req.body;
  
  if (!author || !content) {
    return res.status(400).json({ error: 'Author and content are required' });
  }
  
  if (content.length > 50) {
    return res.status(400).json({ error: 'Content must be 50 characters or less' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO posts (author, content) 
    VALUES (?, ?)
  `);
  
  stmt.run([author, content], function(err) {
    if (err) {
      console.error('Error creating post:', err);
      return res.status(500).json({ error: 'Failed to create post' });
    }
    
    res.json({
      id: this.lastID,
      author,
      content,
      timestamp: new Date().toISOString()
    });
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: timeline.db`);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  db.close();
  process.exit(0);
});
