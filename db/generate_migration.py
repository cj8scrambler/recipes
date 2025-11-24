#!/usr/bin/env python3
"""
Generate migration SQL file from git tag differences.

This script compares db.sql between two git tags and generates a migration file
that captures the schema changes between releases.

Usage:
    python generate_migration.py --from-tag v1.0.0 --to-tag v1.1.0
    python generate_migration.py --from-tag v1.0.0 --to-tag HEAD
"""

import os
import sys
import re
import argparse
import subprocess
from datetime import datetime

# ANSI color codes
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.RESET}")

def run_git_command(cmd):
    """Run a git command and return output."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print_error(f"Git command failed: {e}")
        print_error(f"Error output: {e.stderr}")
        sys.exit(1)

def get_file_at_tag(tag, filepath):
    """Get file contents at a specific git tag."""
    cmd = f"git show {tag}:{filepath}"
    return run_git_command(cmd)

def parse_sql_statements(sql_content):
    """Parse SQL content into individual CREATE/ALTER statements."""
    statements = []
    current_statement = []
    in_statement = False
    
    for line in sql_content.split('\n'):
        # Skip comments and empty lines
        stripped = line.strip()
        if not stripped or stripped.startswith('--'):
            continue
        
        # Check if this is the start of a CREATE or ALTER statement
        if re.match(r'^(CREATE|ALTER)\s', stripped, re.IGNORECASE):
            if current_statement:
                statements.append('\n'.join(current_statement))
                current_statement = []
            in_statement = True
        
        if in_statement:
            current_statement.append(line)
            
            # Check if statement is complete (ends with semicolon)
            if stripped.endswith(';'):
                statements.append('\n'.join(current_statement))
                current_statement = []
                in_statement = False
    
    # Add any remaining statement
    if current_statement:
        statements.append('\n'.join(current_statement))
    
    return statements

def extract_table_definitions(sql_content):
    """Extract table definitions and their properties."""
    tables = {}
    
    # Find all CREATE TABLE statements
    pattern = r'CREATE TABLE\s+(\w+)\s*\((.*?)\);'
    matches = re.finditer(pattern, sql_content, re.DOTALL | re.IGNORECASE)
    
    for match in matches:
        table_name = match.group(1)
        table_def = match.group(2)
        tables[table_name] = {
            'definition': table_def.strip(),
            'full_statement': match.group(0)
        }
    
    return tables

def generate_diff(from_sql, to_sql):
    """Generate migration SQL by comparing two versions."""
    from_tables = extract_table_definitions(from_sql)
    to_tables = extract_table_definitions(to_sql)
    
    upgrade_statements = []
    downgrade_statements = []
    
    # Find new tables
    for table_name in to_tables:
        if table_name not in from_tables:
            print_info(f"New table detected: {table_name}")
            upgrade_statements.append(f"-- Create new table: {table_name}")
            upgrade_statements.append(to_tables[table_name]['full_statement'])
            upgrade_statements.append("")
            
            downgrade_statements.insert(0, f"-- Drop table: {table_name}")
            downgrade_statements.insert(1, f"DROP TABLE IF EXISTS {table_name};")
            downgrade_statements.insert(2, "")
    
    # Find dropped tables
    for table_name in from_tables:
        if table_name not in to_tables:
            print_info(f"Dropped table detected: {table_name}")
            upgrade_statements.append(f"-- Drop table: {table_name}")
            upgrade_statements.append(f"DROP TABLE IF EXISTS {table_name};")
            upgrade_statements.append("")
            
            downgrade_statements.insert(0, f"-- Recreate table: {table_name}")
            downgrade_statements.insert(1, from_tables[table_name]['full_statement'])
            downgrade_statements.insert(2, "")
    
    # Find modified tables (simplified - just note them)
    for table_name in to_tables:
        if table_name in from_tables:
            if from_tables[table_name]['definition'] != to_tables[table_name]['definition']:
                print_warning(f"Table modified: {table_name}")
                print_warning(f"  Manual review required for ALTER TABLE statements")
                upgrade_statements.append(f"-- TODO: Review changes to {table_name}")
                upgrade_statements.append(f"-- Compare definitions manually and add ALTER TABLE statements")
                upgrade_statements.append("")
    
    return upgrade_statements, downgrade_statements

def generate_migration_file(from_tag, to_tag, output_dir):
    """Generate migration file from tag differences."""
    
    # Verify tags exist
    print_info(f"Checking tags: {from_tag} -> {to_tag}")
    run_git_command(f"git rev-parse {from_tag}")
    if to_tag != "HEAD":
        run_git_command(f"git rev-parse {to_tag}")
    
    # Get db.sql at both tags
    print_info(f"Fetching db.sql from {from_tag}...")
    from_sql = get_file_at_tag(from_tag, "db/db.sql")
    
    print_info(f"Fetching db.sql from {to_tag}...")
    to_sql = get_file_at_tag(to_tag, "db/db.sql")
    
    if from_sql == to_sql:
        print_warning("No database schema changes detected between tags")
        return None
    
    # Generate diff
    print_info("Analyzing schema differences...")
    upgrade_statements, downgrade_statements = generate_diff(from_sql, to_sql)
    
    if not upgrade_statements and not downgrade_statements:
        print_warning("No significant schema changes detected")
        return None
    
    # Create migration filename
    from_version = from_tag.replace('.', '_')
    to_version = to_tag.replace('.', '_') if to_tag != "HEAD" else "next"
    migration_filename = f"migrate_{from_version}_to_{to_version}.sql"
    migration_path = os.path.join(output_dir, migration_filename)
    
    # Generate migration file content
    content = f"""-- Migration from {from_tag} to {to_tag}
-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
-- 
-- This migration was automatically generated by comparing db.sql between tags.
-- Please review and test before applying to production.

-- ==== UPGRADE ====
-- Upgrade from {from_tag} to {to_tag}

"""
    
    if upgrade_statements:
        content += '\n'.join(upgrade_statements)
    else:
        content += "-- No changes detected\n"
    
    content += """

-- ==== DOWNGRADE ====
-- Downgrade from {to_tag} to {from_tag}

"""
    
    if downgrade_statements:
        content += '\n'.join(downgrade_statements)
    else:
        content += "-- No changes detected\n"
    
    # Write migration file
    os.makedirs(output_dir, exist_ok=True)
    with open(migration_path, 'w') as f:
        f.write(content)
    
    print_success(f"Migration file generated: {migration_path}")
    return migration_path

def main():
    parser = argparse.ArgumentParser(
        description='Generate migration SQL from git tag differences',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --from-tag v1.0.0 --to-tag v1.1.0
  %(prog)s --from-tag v1.0.0 --to-tag HEAD
  %(prog)s --from-tag v1.0.0 --to-tag v1.1.0 --output-dir db/migrations
        """
    )
    
    parser.add_argument('--from-tag', required=True,
                        help='Starting git tag (e.g., v1.0.0)')
    parser.add_argument('--to-tag', required=True,
                        help='Target git tag or HEAD (e.g., v1.1.0)')
    parser.add_argument('--output-dir', default='db/migrations',
                        help='Output directory for migration file (default: db/migrations)')
    
    args = parser.parse_args()
    
    # Get repository root
    repo_root = run_git_command("git rev-parse --show-toplevel")
    os.chdir(repo_root)
    
    output_dir = os.path.join(repo_root, args.output_dir)
    
    migration_path = generate_migration_file(args.from_tag, args.to_tag, output_dir)
    
    if migration_path:
        print_info("\nNext steps:")
        print_info("1. Review the generated migration file")
        print_info("2. Add any missing ALTER TABLE statements for modified tables")
        print_info("3. Test the migration on a development database")
        print_info("4. Add the migration file to your release commit")
    else:
        print_info("No migration file needed for this release")

if __name__ == '__main__':
    main()
