import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Matches docs/DATA_MODEL.md §2.1 (migration: 1721260000001-CreateUsersTable).
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
