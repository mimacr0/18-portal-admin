
import sqlite3
import os

class DB:
    def __init__(self, file):
        data_dir = os.path.join(os.getenv('PROJECT_BASE_DIR'), 'data')
        os.makedirs(data_dir, exist_ok=True)
        self.file = os.path.join(data_dir, f"{file}.db")
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

    def fetch_one(self, sql, *params):
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        column_names = [description[0] for description in cursor.description]
        row = cursor.fetchone()
        if row:
            return dict(zip(column_names, row))
        return None

    def execute(self, sql, *params):
        cursor = self.conn.cursor()
        cursor.execute(sql, params)
        return cursor.lastrowid

    def commit(self):
        self.conn.commit()

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

    def create_table(self, table_name, columns):
        query = f"CREATE TABLE IF NOT EXISTS {table_name} ({', '.join(columns)})"
        self.execute(query)

    def insert(self, table_name, data):
        placeholders = ', '.join(['?' for _ in data])
        columns = ', '.join(data.keys())
        values = tuple(data.values())
        query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
        return self.execute(query, *values)

    def update(self, table_name, data, condition):
        set_clause = ', '.join([f"{key} = ?" for key in data.keys()])
        query = f"UPDATE {table_name} SET {set_clause} WHERE {condition}"
        values = tuple(data.values())
        return self.execute(query, *values)

    def delete(self, table_name, condition, *params):
        query = f"DELETE FROM {table_name} WHERE {condition}"
        return self.execute(query, *params)

    def table_exists(self, table_name):
        query = "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
        result = self.query(query, table_name)
        return bool(result)

class Table:
    def __init__(self, conn, name):
        self.conn = conn
        self.name = name

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
