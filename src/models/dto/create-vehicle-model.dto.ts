import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateVehicleModelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  /**
   * The UUID of the Brand this model belongs to.
   * Accepts any UUID version (SQL Server uses non-v4 sequential UUIDs).
   */
  @IsUUID()
  brandId!: string;
}
