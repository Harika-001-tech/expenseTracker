const express = require('express')

const { open } = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const dbPath = path.join(__dirname, 'expenses.db')
let db = null

const intializeDbAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        })
        app.listen(3000, () => {
            console.log('Server Running at http//:localhost:/3000/')
        })
    } catch (e) {
        console.log(`DB.Error:${e.message}`)
        process.exit(1)
    }
}

intializeDbAndServer();

// app.js (continued)
app.post('/transactions', async (req, res) => {
    const { type, category, amount, date, description } = req.body;

    const query = `
      INSERT INTO transactions (type, category, amount, date, description)
      VALUES (?, ?, ?, ?, ?)
    `;
    var dbResponse = await db.run(query, [type, category, amount, date, description]);
    res.status(201).json({ id: dbResponse.lastID });
});

app.get('/transactions', async (req, res) => {
    var dbResponse = await db.all('SELECT * FROM transactions', []);
    res.status(200).json(dbResponse);
});


app.get('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    var dbResponse = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!dbResponse) {
        res.status(400).json(`Expense with Id ${id} is not found`);
    } else {
        res.status(200).json(dbResponse);
    }
});

app.put('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const { type, category, amount, date, description } = req.body;

    const query = `
      UPDATE transactions
      SET type = ?, category = ?, amount = ?, date = ?, description = ?
      WHERE id = ?
    `;
    await db.run(query, [type, category, amount, date, description, id]);
    res.status(202).json(req.body);
});

app.delete('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    await db.run('DELETE FROM transactions WHERE id = ?', [id]);
    res.status(200).send(`Transaction with Id ${id} deleted successfully`);
});

app.get('/summary', async (req, res) => {
    const { startDate, endDate, category } = req.query;

    let query = `SELECT type, SUM(amount) as total FROM transactions WHERE 1 = 1`;
    let params = [];

    if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate);
    }

    if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate);
    }

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    query += ' GROUP BY type';

    var rows = await db.all(query, params);
    const summary = {
        income: 0,
        expenses: 0,
        balance: 0
    };

    rows.forEach(row => {
        if (row.type === 'income') summary.income = row.total;
        if (row.type === 'expense') summary.expenses = row.total;
    });

    summary.balance = summary.income - summary.expenses;

    res.json(summary);
});


