const express = require('express');

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(API on http://localhost:));
