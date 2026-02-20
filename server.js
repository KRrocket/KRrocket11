const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статические файлы (ваш HTML)
app.use(express.static(__dirname));

let gameState = 'WAITING'; 
let multiplier = 1.00;
let timer = 5.0;
let history = [];
let crashPoint = 1.00;
let onlineCount = 0;

// Генерация точки краша
function generateCrashPoint() {
    const e = Math.random();
    const result = (0.99 / (1 - e));
    return Math.max(1.01, result).toFixed(2);
}

// Игровой цикл (обновление каждые 100мс)
function tick() {
    if (gameState === 'WAITING') {
        timer -= 0.1;
        if (timer <= 0) {
            gameState = 'FLYING';
            multiplier = 1.00;
            crashPoint = parseFloat(generateCrashPoint());
        }
    } else if (gameState === 'FLYING') {
        multiplier += (multiplier * 0.003); 
        if (multiplier >= crashPoint) {
            gameState = 'CRASHED';
            history.unshift(multiplier.toFixed(2));
            if (history.length > 15) history.pop();
            setTimeout(() => {
                gameState = 'WAITING';
                timer = 5.0;
                multiplier = 1.00;
            }, 3000);
        }
    }

    // Рассылка данных всем игрокам
    io.emit('gameUpdate', {
        status: gameState,
        multiplier: parseFloat(multiplier.toFixed(2)),
        timer: timer,
        history: history,
        online: onlineCount
    });
}

setInterval(tick, 100);

// Обработка подключений
io.on('connection', (socket) => {
    onlineCount++;
    
    socket.on('placeBet', (data) => {
        console.log(Игрок сделал ставку: ${data.amount} руб.);
    });

    socket.on('cashout', (data) => {
        console.log(Игрок забрал выигрыш на x${data.multiplier});
    });

    socket.on('disconnect', () => {
        onlineCount--;
    });
});

// Роут для приема уведомлений об оплате (Webhook)
app.get('/payment/callback', (req, res) => {
    const { amount, user_id } = req.query;
    console.log(Пополнение: пользователь ${user_id} внес ${amount} руб.);
    // Здесь логика добавления в БД
    res.send("OK");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(Сервер запущен на порту ${PORT}));