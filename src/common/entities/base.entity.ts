import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * UUID primary keys prevent sequential ID enumeration attacks and make
 * entities safe to reference across distributed services without coordination.
 * All domain entities MUST extend this class to guarantee audit columns exist.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /**
   * Populated by the calling layer (e.g. an interceptor injecting the JWT subject).
   * Nullable because system-initiated writes (seeds, migrations) have no actor.
   */
  @Column({ name: 'created_by', type: 'varchar', nullable: true, default: null })
  createdBy!: string | null;
}
