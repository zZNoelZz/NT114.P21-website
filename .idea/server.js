const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'zznoelzz',
    password: '$n0wDrive',
    database: 'user_db'
});

app.use((req, res, next) => {
    if (req.path === '/mainPage.html') {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        ip = ip.replace('::ffff:', '');
        if (!ip.startsWith('10.10.')) {
            return res.status(403).send(`
                <html><body style="font-family:sans-serif;text-align:center;padding:60px">
                <h2>🚫 Truy cập bị từ chối</h2>
                <div>Bạn cần kết nối VPN trước khi vào trang này.<br>
                <a href="dashboard.html">Quay lại Dashboard</a></div>
                </body></html>
            `);
        }
    }
    next();
});

app.use(express.static('.'));
app.use(express.json());

function getRoleByIP(ip) {
    ip = ip.replace('::ffff:', '');
    if (ip.startsWith('10.10.10.')) return 'boss';
    if (ip.startsWith('10.10.20.')) return 'leader';
    if (ip.startsWith('10.10.30.')) return 'employee';
    return 'unknown';
}

app.get('/api/my-role', (req, res) => {
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const role = getRoleByIP(clientIP);
    res.json({ role });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    connection.query(
        'SELECT name, role FROM users WHERE username = ? AND password = ?',
        [username, password],
        (err, results) => {
            if (err) return res.status(500).send('Database error.');
            if (results.length)
                res.json({ name: results[0].name, role: results[0].role });
            else
                res.status(401).send('Invalid username or password');
        }
    );
});

app.get('/api/users', (req, res) => {
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const role = getRoleByIP(clientIP);

    if (role === 'employee' || role === 'unknown') {
        return res.status(403).json({ error: 'Bạn không có quyền xem danh sách nhân sự' });
    }

    connection.query(
        'SELECT id, name, username, password, role, salary, extra FROM users',
        (err, results) => {
            if (err) return res.status(500).send('Database error.');
            if (role === 'leader') {
                results = results.map(u => ({
                    ...u,
                    username: '********',
                    password: '********',
                }));
            }
            res.json(results);
        }
    );
});

app.listen(port, () => {
    console.log(`✅ Server is running on http://localhost:${port}`);
});
