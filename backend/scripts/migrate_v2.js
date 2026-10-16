import { pool } from '../dist/config/db.js';
import fs from 'fs';
import path from 'path';

async function migrate() {
  try {
    console.log('Running v2 migrations...');

    // 1. Add category to tasks if not exists
    const [cols] = await pool.query("SHOW COLUMNS FROM tasks LIKE 'category'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE tasks ADD COLUMN category ENUM('DESIGN', 'DEVELOPMENT', 'DEVOPS', 'TESTING', 'MARKETING', 'RESEARCH', 'OPERATIONS') NOT NULL DEFAULT 'DEVELOPMENT' AFTER priority");
      console.log('✓ Added category column to tasks table');
    } else {
      console.log('• category column already exists in tasks table');
    }

    // 2. Add assignee_id to subtasks if not exists
    const [subCols] = await pool.query("SHOW COLUMNS FROM subtasks LIKE 'assignee_id'");
    if (subCols.length === 0) {
      await pool.query("ALTER TABLE subtasks ADD COLUMN assignee_id INT UNSIGNED NULL AFTER title");
      await pool.query("ALTER TABLE subtasks ADD CONSTRAINT fk_subtasks_assignee FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL");
      console.log('✓ Added assignee_id column and foreign key to subtasks table');
    } else {
      console.log('• assignee_id column already exists in subtasks table');
    }

    // 3. Ensure upload directories exist
    const attachmentsDir = path.resolve(process.cwd(), 'uploads', 'attachments');
    const avatarsDir = path.resolve(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }
    console.log('✓ Upload directories verified (attachments & avatars)');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
