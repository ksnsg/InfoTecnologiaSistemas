import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { VehicleModel } from '../../models/entities/vehicle-model.entity';

@Entity({ name: 'vehicles' })
export class Vehicle extends BaseEntity {
  @Column({ name: 'license_plate', type: 'varchar', length: 10, unique: true })
  licensePlate!: string;

  /**
   * VIN (Vehicle Identification Number) — 17-character standard.
   * Unique constraint prevents duplicate chassis registrations.
   */
  @Column({ type: 'varchar', length: 17, unique: true })
  chassis!: string;

  /**
   * RENAVAM is the Brazilian national vehicle registration number (9–11 digits).
   * Stored as varchar to preserve leading zeros.
   */
  @Column({ type: 'varchar', length: 11, unique: true })
  renavam!: string;

  @Column({ type: 'int' })
  year!: number;

  /**
   * Enforces referential integrity at the database level.
   * NOTE: Using 'NO ACTION' instead of 'RESTRICT' because SQL Server
   * requires 'NO ACTION' to trigger the same referential integrity rule.
   */
  @ManyToOne(() => VehicleModel, { nullable: false, onDelete: 'NO ACTION', eager: false })
  @JoinColumn({ name: 'model_id' })
  vehicleModel!: VehicleModel;
}
