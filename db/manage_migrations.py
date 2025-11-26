#!/usr/bin/env python3
"""
Database migration management script for Recipes application.

This script manages database schema migrations using a tag-based approach.
Migrations are generated between git releases and applied as a single file per release.
"""

import os
import sys
import re
import argparse
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://root:password@localhost:3306/recipe_db')

# Migration directory
MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'migrations')

# ANSI color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")


def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.RESET}")


def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")


def print_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.RESET}")


def get_db_engine():
    """Create and return database engine."""
    try:
        engine = create_engine(DATABASE_URL)
        return engine
    except Exception as e:
        print_error(f"Failed to connect to database: {e}")
        sys.exit(1)


def ensure_version_table(engine):
    """Create migration_version table if it doesn't exist."""
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS migration_version (
                version VARCHAR(50) PRIMARY KEY,
                description VARCHAR(255) NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()


def get_current_version(engine):
    """Get current database version."""
    ensure_version_table(engine)
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT version FROM migration_version ORDER BY applied_at DESC LIMIT 1"
        ))
        row = result.fetchone()
        return row[0] if row else None


def get_migration_files():
    """Get list of migration files sorted by version."""
    if not os.path.exists(MIGRATIONS_DIR):
        os.makedirs(MIGRATIONS_DIR)
        return []
    
    migrations = []
    # Pattern: migrate_1_0_0_to_1_1_0.sql
    pattern = re.compile(r'^migrate_(.+)_to_(.+)\.sql$')
    
    for filename in os.listdir(MIGRATIONS_DIR):
        match = pattern.match(filename)
        if match:
            from_version = match.group(1).replace('_', '.')
            to_version = match.group(2).replace('_', '.')
            migrations.append({
                'from_version': from_version,
                'to_version': to_version,
                'filename': filename,
                'path': os.path.join(MIGRATIONS_DIR, filename)
            })
    
    return migrations


def parse_migration_file(filepath):
    """Parse migration file and extract upgrade and downgrade SQL."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Split by markers
    upgrade_marker = '-- ==== UPGRADE ===='
    downgrade_marker = '-- ==== DOWNGRADE ===='
    
    if upgrade_marker not in content:
        print_error(f"Migration file must contain upgrade marker: {upgrade_marker}")
        return None, None
    
    parts = content.split(upgrade_marker)
    if len(parts) < 2:
        return None, None
    
    upgrade_and_rest = parts[1].split(downgrade_marker)
    upgrade_sql = upgrade_and_rest[0].strip()
    downgrade_sql = upgrade_and_rest[1].strip() if len(upgrade_and_rest) > 1 else ""
    
    return upgrade_sql, downgrade_sql

def split_sql_statements(sql_text: str):
    """ Return a list of SQL statements from sql_text."""

    # 1) Remove lines that begin with a comment (after leading whitespace)
    lines = sql_text.splitlines()
    filtered_lines = []
    for line in lines:
        if line.lstrip().startswith('--'):
            # drop the entire line
            continue
        filtered_lines.append(line)
    cleaned = '\n'.join(filtered_lines)

    # 2) Split into statements, keeping multi-line statements intact and
    #    ignoring semicolons inside quotes.
    statements = []
    buf = []
    in_single_quote = False
    in_double_quote = False
    i = 0
    length = len(cleaned)

    while i < length:
        ch = cleaned[i]

        # Handle single-quote strings (SQL standard: '' is an escaped single quote)
        if ch == "'" and not in_double_quote:
            # if this is a doubled single-quote inside a single-quote string,
            # consume both characters as part of the literal
            if in_single_quote and i + 1 < length and cleaned[i + 1] == "'":
                buf.append("''")
                i += 2
                continue
            in_single_quote = not in_single_quote
            buf.append(ch)
            i += 1
            continue

        # Handle double-quote identifiers / strings similarly
        if ch == '"' and not in_single_quote:
            if in_double_quote and i + 1 < length and cleaned[i + 1] == '"':
                buf.append('""')
                i += 2
                continue
            in_double_quote = not in_double_quote
            buf.append(ch)
            i += 1
            continue

        # Semicolon ends a statement only when not inside a quoted literal
        if ch == ';' and not in_single_quote and not in_double_quote:
            stmt = ''.join(buf).strip()
            if stmt:
                statements.append(stmt)
            buf = []
            i += 1
            # skip the semicolon (do not include it in the returned statements)
            continue

        # Normal character accumulation
        buf.append(ch)
        i += 1

    # Any trailing statement without a terminating semicolon
    trailing = ''.join(buf).strip()
    if trailing:
        statements.append(trailing)

    return statements

def apply_migration(engine, migration, direction='upgrade'):
    """Apply a single migration."""
    upgrade_sql, downgrade_sql = parse_migration_file(migration['path'])

    if not upgrade_sql:
        print_error(f"Invalid migration file: {migration['filename']}")
        return False
    
    sql_to_execute = upgrade_sql if direction == 'upgrade' else downgrade_sql
    
    if not sql_to_execute:
        print_error(f"No {direction} SQL found in migration file")
        return False
    
    try:
        with engine.connect() as conn:
            # Execute each statement separately
            statements = split_sql_statements(sql_to_execute)

            for statement in statements:
                if statement:
                    print(statement)
                    conn.execute(text(statement))
            
            # Update version tracking
            if direction == 'upgrade':
                conn.execute(text(
                    "INSERT INTO migration_version (version, description) VALUES (:version, :description)"
                ), {'version': migration['to_version'], 'description': f"Migration to {migration['to_version']}"})
            else:
                conn.execute(text(
                    "DELETE FROM migration_version WHERE version = :version"
                ), {'version': migration['to_version']})
            
            conn.commit()
        return True
    except Exception as e:
        print_error(f"Failed to apply migration: {e}")
        return False


def cmd_init(args):
    """Initialize the migration system with current database state."""
    engine = get_db_engine()
    ensure_version_table(engine)
    
    current = get_current_version(engine)
    if current:
        print_warning(f"Database already initialized at version {current}")
        return
    
    # Mark current state as version 1.0.0 (base schema)
    with engine.connect() as conn:
        conn.execute(text(
            "INSERT INTO migration_version (version, description) VALUES ('1.0.0', 'Initial schema')"
        ))
        conn.commit()
    
    print_success("Migration system initialized. Current database marked as v1.0.0 (Initial schema)")


def cmd_version(args):
    """Display current database version."""
    engine = get_db_engine()
    current = get_current_version(engine)
    
    if not current:
        print_warning("Database not initialized. Run 'init' command first.")
    else:
        print_info(f"Current database version: v{current}")
        
        # Show applied migrations
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT version, description, applied_at FROM migration_version ORDER BY applied_at"
            ))
            print("\nApplied migrations:")
            for row in result:
                print(f"  v{row[0]}: {row[1]} (applied: {row[2]})")


def cmd_list(args):
    """List available migration files."""
    migrations = get_migration_files()
    
    if not migrations:
        print_info("No migration files found in db/migrations/")
        return
    
    print_info(f"Available migration files:")
    for m in migrations:
        print(f"  v{m['from_version']} -> v{m['to_version']}: {m['filename']}")


def cmd_apply(args):
    """Apply a specific migration file."""
    if not args.migration_file:
        print_error("Migration file required")
        return
    
    filepath = os.path.join(MIGRATIONS_DIR, args.migration_file)
    if not os.path.exists(filepath):
        print_error(f"Migration file not found: {filepath}")
        return
    
    # Parse filename to get version info
    pattern = re.compile(r'^migrate_(.+)_to_(.+)\.sql$')
    match = pattern.match(args.migration_file)
    if not match:
        print_error("Invalid migration filename format")
        return
    
    migration = {
        'from_version': match.group(1).replace('_', '.'),
        'to_version': match.group(2).replace('_', '.'),
        'filename': args.migration_file,
        'path': filepath
    }
    
    engine = get_db_engine()
    current = get_current_version(engine)
    
    print_info(f"Current version: v{current if current else 'uninitialized'}")
    print_info(f"Applying migration: v{migration['from_version']} -> v{migration['to_version']}")
    
    if args.downgrade:
        print_warning("Applying DOWNGRADE (rollback)")
        if apply_migration(engine, migration, 'downgrade'):
            print_success(f"Successfully rolled back to v{migration['from_version']}")
        else:
            print_error("Migration rollback failed")
            sys.exit(1)
    else:
        if apply_migration(engine, migration, 'upgrade'):
            print_success(f"Successfully migrated to v{migration['to_version']}")
        else:
            print_error("Migration failed")
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='Manage database migrations for Recipes application',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s init                                    Initialize migration system
  %(prog)s version                                 Show current database version
  %(prog)s list                                    List available migrations
  %(prog)s apply migrate_1_0_0_to_1_1_0.sql        Apply specific migration
  %(prog)s apply migrate_1_0_0_to_1_1_0.sql --downgrade   Rollback migration
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # init command
    parser_init = subparsers.add_parser('init', help='Initialize migration system')
    
    # version command
    parser_version = subparsers.add_parser('version', help='Show current database version')
    
    # list command
    parser_list = subparsers.add_parser('list', help='List available migration files')
    
    # apply command
    parser_apply = subparsers.add_parser('apply', help='Apply a migration file')
    parser_apply.add_argument('migration_file', help='Migration file to apply (e.g., migrate_1_0_0_to_1_1_0.sql)')
    parser_apply.add_argument('--downgrade', action='store_true', help='Apply downgrade instead of upgrade')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Execute command
    commands = {
        'init': cmd_init,
        'version': cmd_version,
        'list': cmd_list,
        'apply': cmd_apply,
    }
    
    commands[args.command](args)


if __name__ == '__main__':
    main()
