import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity({ name: 'models' })
export class VehicleModel extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /**
   * Enforces referential integrity at the database level:
   * A Brand cannot be deleted while at least one VehicleModel references it.
   * NOTE: Using 'NO ACTION' instead of 'RESTRICT' because SQL Server 
   * requires 'NO ACTION' to trigger the same referential integrity rule.
   */
  @ManyToOne(() => Brand, { nullable: false, onDelete: 'NO ACTION', eager: false })
  @JoinColumn({ name: 'brand_id' })
  brand!: Brand;
}
