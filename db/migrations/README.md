# Database Migrations

Migration files are plain upgrade SQL scripts named `migrate_vX_Y_Z.sql`.

To apply a migration, run it directly against the database:

```bash
mysql -u user -p -h dbhost recipes < db/migrations/migrate_v1_8_0.sql
```

Migration files are written by hand when a schema change is needed. Each file contains only the forward (upgrade) SQL — there are no downgrade sections. Roll back by restoring from a database backup.
