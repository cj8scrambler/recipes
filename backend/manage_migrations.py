#!/usr/bin/env python3
"""
Database migration management script for Recipes application.

This script manages database schema versioning and migrations.
"""

import os
import sys
import re
from datetime import datetime
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://root:password@localhost:3306/recipe_db')

# Migration directory
MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db', 'migrations')

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


def ensure_schema_version_table(engine):
    """Create schema_version table if it doesn't exist."""
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_version (
                version INT PRIMARY KEY,
                description VARCHAR(255) NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()


def get_current_version(engine):
    """Get current database schema version."""
    ensure_schema_version_table(engine)
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1"
        ))
        row = result.fetchone()
        return row[0] if row else 0


def get_migration_files():
    """Get list of migration files sorted by version number."""
    if not os.path.exists(MIGRATIONS_DIR):
        os.makedirs(MIGRATIONS_DIR)
        return []
    
    migrations = []
    pattern = re.compile(r'^V(\d+)_(.+)\.sql$')
    
    for filename in os.listdir(MIGRATIONS_DIR):
        match = pattern.match(filename)
        if match:
            version = int(match.group(1))
            description = match.group(2).replace('_', ' ')
            migrations.append({
                'version': version,
                'description': description,
                'filename': filename,
                'path': os.path.join(MIGRATIONS_DIR, filename)
            })
    
    return sorted(migrations, key=lambda x: x['version'])


def parse_migration_file(filepath):
    """Parse migration file and extract upgrade and downgrade SQL."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Split by markers
    upgrade_marker = '-- ==== UPGRADE ===='
    downgrade_marker = '-- ==== DOWNGRADE ===='
    
    if upgrade_marker not in content or downgrade_marker not in content:
        print_error(f"Migration file must contain both upgrade and downgrade markers")
        return None, None
    
    parts = content.split(upgrade_marker)
    if len(parts) < 2:
        return None, None
    
    upgrade_and_rest = parts[1].split(downgrade_marker)
    if len(upgrade_and_rest) < 2:
        return None, None
    
    upgrade_sql = upgrade_and_rest[0].strip()
    downgrade_sql = upgrade_and_rest[1].strip()
    
    return upgrade_sql, downgrade_sql


def apply_migration(engine, migration, direction='upgrade'):
    """Apply a single migration."""
    upgrade_sql, downgrade_sql = parse_migration_file(migration['path'])
    
    if not upgrade_sql or not downgrade_sql:
        print_error(f"Invalid migration file: {migration['filename']}")
        return False
    
    sql_to_execute = upgrade_sql if direction == 'upgrade' else downgrade_sql
    
    try:
        with engine.connect() as conn:
            # Execute each statement separately
            statements = [s.strip() for s in sql_to_execute.split(';') if s.strip()]
            
            for statement in statements:
                conn.execute(text(statement))
            
            # Update version tracking
            if direction == 'upgrade':
                conn.execute(text(
                    "INSERT INTO schema_version (version, description) VALUES (:version, :description)"
                ), {'version': migration['version'], 'description': migration['description']})
            else:
                conn.execute(text(
                    "DELETE FROM schema_version WHERE version = :version"
                ), {'version': migration['version']})
            
            conn.commit()
        return True
    except Exception as e:
        print_error(f"Failed to apply migration: {e}")
        return False


def cmd_init(args):
    """Initialize the migration system with current database state as V001."""
    engine = get_db_engine()
    ensure_schema_version_table(engine)
    
    current = get_current_version(engine)
    if current > 0:
        print_warning(f"Database already initialized at version {current}")
        return
    
    # Mark current state as V001 (base schema from db.sql)
    with engine.connect() as conn:
        conn.execute(text(
            "INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema')"
        ))
        conn.commit()
    
    print_success("Migration system initialized. Current database marked as V001 (Initial schema)")


def cmd_version(args):
    """Display current database version."""
    engine = get_db_engine()
    current = get_current_version(engine)
    
    if current == 0:
        print_warning("Database not initialized. Run 'init' command first.")
    else:
        print_info(f"Current database version: V{current:03d}")
        
        # Show applied migrations
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT version, description, applied_at FROM schema_version ORDER BY version"
            ))
            print("\nApplied migrations:")
            for row in result:
                print(f"  V{row[0]:03d}: {row[1]} (applied: {row[2]})")


def cmd_check(args):
    """Check for pending migrations."""
    engine = get_db_engine()
    current = get_current_version(engine)
    migrations = get_migration_files()
    
    pending = [m for m in migrations if m['version'] > current]
    
    if not pending:
        print_success("Database is up to date. No pending migrations.")
    else:
        print_warning(f"{len(pending)} pending migration(s):")
        for m in pending:
            print(f"  V{m['version']:03d}: {m['description']}")


def cmd_upgrade(args):
    """Apply all pending migrations."""
    engine = get_db_engine()
    current = get_current_version(engine)
    migrations = get_migration_files()
    
    pending = [m for m in migrations if m['version'] > current]
    
    if not pending:
        print_success("Database is up to date. No migrations to apply.")
        return
    
    print_info(f"Applying {len(pending)} migration(s)...")
    
    for migration in pending:
        print(f"\nApplying V{migration['version']:03d}: {migration['description']}")
        if apply_migration(engine, migration, 'upgrade'):
            print_success(f"Successfully applied V{migration['version']:03d}")
        else:
            print_error(f"Failed to apply V{migration['version']:03d}")
            print_error("Migration stopped. Fix the issue and try again.")
            sys.exit(1)
    
    print_success(f"\nAll migrations applied successfully. Current version: V{get_current_version(engine):03d}")


def cmd_downgrade(args):
    """Rollback the last migration or to a specific version."""
    engine = get_db_engine()
    current = get_current_version(engine)
    
    if current <= 1:
        print_warning("Already at base version (V001). Cannot downgrade further.")
        return
    
    target_version = None
    if args.target:
        # Parse target version (e.g., "V003" or "3")
        match = re.match(r'^V?(\d+)$', args.target)
        if match:
            target_version = int(match.group(1))
        else:
            print_error(f"Invalid target version: {args.target}")
            return
        
        if target_version >= current:
            print_error(f"Target version V{target_version:03d} is not less than current version V{current:03d}")
            return
    else:
        # Rollback one version
        target_version = current - 1
    
    migrations = get_migration_files()
    migrations_to_rollback = [m for m in migrations if target_version < m['version'] <= current]
    migrations_to_rollback.reverse()  # Apply rollbacks in reverse order
    
    print_info(f"Rolling back from V{current:03d} to V{target_version:03d}...")
    
    for migration in migrations_to_rollback:
        print(f"\nRolling back V{migration['version']:03d}: {migration['description']}")
        if apply_migration(engine, migration, 'downgrade'):
            print_success(f"Successfully rolled back V{migration['version']:03d}")
        else:
            print_error(f"Failed to roll back V{migration['version']:03d}")
            print_error("Rollback stopped. Fix the issue and try again.")
            sys.exit(1)
    
    print_success(f"\nRollback complete. Current version: V{get_current_version(engine):03d}")


def cmd_force_version(args):
    """Force set the database version (use with extreme caution)."""
    if not args.version:
        print_error("Version number required")
        return
    
    match = re.match(r'^V?(\d+)$', args.version)
    if not match:
        print_error(f"Invalid version format: {args.version}")
        return
    
    version = int(match.group(1))
    
    print_warning(f"WARNING: Force-setting version to V{version:03d}")
    print_warning("This does NOT apply any migrations, only updates the version tracking.")
    response = input("Are you sure? (yes/no): ")
    
    if response.lower() != 'yes':
        print_info("Cancelled.")
        return
    
    engine = get_db_engine()
    ensure_schema_version_table(engine)
    
    with engine.connect() as conn:
        # Clear all version records
        conn.execute(text("DELETE FROM schema_version"))
        
        # Set new version
        conn.execute(text(
            "INSERT INTO schema_version (version, description) VALUES (:version, :description)"
        ), {'version': version, 'description': f'Force-set to V{version:03d}'})
        
        conn.commit()
    
    print_success(f"Version force-set to V{version:03d}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Manage database migrations for Recipes application',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s init                    Initialize migration system
  %(prog)s version                 Show current database version
  %(prog)s check                   Check for pending migrations
  %(prog)s upgrade                 Apply all pending migrations
  %(prog)s downgrade               Rollback last migration
  %(prog)s downgrade --target V003 Rollback to version V003
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # init command
    parser_init = subparsers.add_parser('init', help='Initialize migration system')
    
    # version command
    parser_version = subparsers.add_parser('version', help='Show current database version')
    
    # check command
    parser_check = subparsers.add_parser('check', help='Check for pending migrations')
    
    # upgrade command
    parser_upgrade = subparsers.add_parser('upgrade', help='Apply all pending migrations')
    
    # downgrade command
    parser_downgrade = subparsers.add_parser('downgrade', help='Rollback migrations')
    parser_downgrade.add_argument('--target', help='Target version to rollback to (e.g., V003)')
    
    # force-version command (hidden, for emergency use)
    parser_force = subparsers.add_parser('force-version', help='Force set database version (DANGEROUS)')
    parser_force.add_argument('version', help='Version to set (e.g., V003)')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Execute command
    commands = {
        'init': cmd_init,
        'version': cmd_version,
        'check': cmd_check,
        'upgrade': cmd_upgrade,
        'downgrade': cmd_downgrade,
        'force-version': cmd_force_version,
    }
    
    commands[args.command](args)


if __name__ == '__main__':
    main()
