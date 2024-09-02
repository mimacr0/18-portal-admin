
import sqlite3
import json

class Table:
    def __init__(self, conn, name):
        self.conn = conn
        self.name = name

    def create(self, columns):
        columns_definition = ", ".join([f"{column} {data_type}" for column, data_type in columns.items()])
        query = f"CREATE TABLE IF NOT EXISTS {self.name} ({columns_definition})"
        self.conn.execute(query)

    def insert(self, data):
        columns = ", ".join(data.keys())
        placeholders = ", ".join(["?" for _ in data.values()])
        query = f"INSERT INTO {self.name} ({columns}) VALUES ({placeholders})"
        self.conn.execute(query, tuple(data.values()))

    def update(self, data, conditions):
        set_clause = ", ".join([f"{column} = ?" for column in data.keys()])
        where_clause = " AND ".join([f"{column} = ?" for column in conditions.keys()])
        query = f"UPDATE {self.name} SET {set_clause} WHERE {where_clause}"
        self.conn.execute(query, tuple(data.values()) + tuple(conditions.values()))

    def delete(self, conditions):
        where_clause = " AND ".join([f"{column} = ?" for column in conditions.keys()])
        query = f"DELETE FROM {self.name} WHERE {where_clause}"
        self.conn.execute(query, tuple(conditions.values()))

    def select(self, columns=None, conditions=None):
        columns = ", ".join(columns) if columns else "*"
        query = f"SELECT {columns} FROM {self.name}"
        if conditions:
            where_clause = " AND ".join([f"{column} = ?" for column in conditions.keys()])
            query += f" WHERE {where_clause}"
        result = self.conn.execute(query, tuple(conditions.values()) if conditions else None)
        return result.fetchall()

    def read(self, limit, offset, columns=None, conditions=None, order_by=None):
        order_by = f"ORDER BY {order_by}" if order_by else "ORDER BY id"
        columns = ", ".join(columns) if columns else "*"
        query = f"SELECT {columns} FROM {self.name}"
        if conditions:
            where_clause = " AND ".join([f"{column} = ?" for column in conditions.keys()])
            query += f" WHERE {where_clause}"
        query += f" {order_by} LIMIT ? OFFSET ?"
        params = (tuple(conditions.values()) if conditions else ()) + (limit, offset)
        result = self.conn.execute(query, params)
        return result.fetchall()

    def find_one(self, id, columns=None, column="id"):
        columns = ", ".join(columns) if columns else "*"
        query = f"SELECT {columns} FROM {self.name} WHERE {column} = ?"
        cursor = self.conn.cursor()
        cursor.execute(query, (id,))
        column_names = [description[0] for description in cursor.description]
        result = cursor.fetchone()
        return dict(zip(column_names, result)) if result else None

    def count(self, conditions=None):
        query = f"SELECT COUNT(*) FROM {self.name}"
        if conditions:
            where_clause = " AND ".join([f"{column} = ?" for column in conditions.keys()])
            query += f" WHERE {where_clause}"
        result = self.conn.execute(query, tuple(conditions.values()) if conditions else tuple())
        return result.fetchone()[0]

    def drop(self):
        query = f"DROP TABLE IF EXISTS {self.name}"
        self.conn.execute(query)
        return self.conn

    def clear(self, limit=1000):
        offset = 0
        while self.count() > 0:
            self.conn.execute(f"DELETE FROM {self.name} WHERE id IN (SELECT id FROM {self.name} ORDER BY id LIMIT ?);", (limit,))
            print(f"Deleted {offset} records from {self.name}")
            offset += limit
            self.conn.commit()

    def add_index(self, column):
        query = f"CREATE INDEX IF NOT EXISTS {self.name}_{column}_index ON {self.name} ({column})"
        self.conn.execute(query)

class DB:
    def __init__(self, file):
        self.file = f"""{file}.db"""
        self.conn = sqlite3.connect(self.file)

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.conn.commit()
        self.conn.close()

    def _get_table_count(self, table_name):
        query = f"SELECT COUNT(*) FROM {table_name}"
        result = self.conn.execute(query)
        return result.fetchone()[0]

    def _get_table_details(self, table_name):
        query = f"PRAGMA table_info({table_name})"
        result = self.conn.execute(query)
        return result.fetchall()

    def query(self, sql, *params):
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        column_names = [description[0] for description in cursor.description]
        rows = cursor.fetchall()
        result = [dict(zip(column_names, row)) for row in rows]
        return result

    def execute(self, sql, *params):
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        return cursor.lastrowid

    def ps(self, detailed=False):
        query = "SELECT name FROM sqlite_master WHERE type = 'table'"
        result = self.conn.execute(query)
        tables = result.fetchall()

        print("Tables list:")
        for table in tables:
            table_name = table[0]
            count = self._get_table_count(table_name)

            if not detailed:
                print(f"Table: {table_name} ({count:,} records)")
                continue

            print(f"\nTable: {table_name} ({count:,} records)")
            print(('-' * 50))
            print(f"{'Column':<25}{'Type':<20}{'PK':<10}")
            print("-" * 50)
            details = self._get_table_details(table_name)
            for detail in details:
                column_name, data_type, is_primary_key = detail[1], detail[2], detail[5]
                print(f"{column_name:<25}{data_type:<20}{is_primary_key:<10}")

    def get_table(self, name):
        return Table(self.conn, name)


class KeyValueDB:
    def __init__(self, db_name):
        self.conn = sqlite3.connect(f"""{db_name}.db""")
        self.create_table()

    def __del__(self):
        self.conn.close()

    def create_table(self):
        c = self.conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS key_value_table (key TEXT UNIQUE, value JSON)''')
        self.conn.commit()

    def set_value(self, key, value):
        c = self.conn.cursor()
        c.execute('''INSERT OR REPLACE INTO key_value_table (key, value) VALUES (?, ?)''', (key, json.dumps(value)))
        self.conn.commit()

    def get_value(self, key):
        c = self.conn.cursor()
        c.execute('''SELECT value FROM key_value_table WHERE key = ?''', (key,))
        result = c.fetchone()
        if result is not None:
            return json.loads(result[0])
        else:
            return None