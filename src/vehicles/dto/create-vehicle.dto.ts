import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  licensePlate!: string;

  /**
   * VIN must be exactly 17 characters per ISO 3779 standard.
   * Using @Length(17, 17) instead of @MaxLength(17) to also enforce
   * the minimum — a shorter string is not a valid VIN.
   */
  @IsString()
  @Length(17, 17, { message: 'chassis must be exactly 17 characters (ISO 3779 VIN standard)' })
  chassis!: string;

  /**
   * Brazilian RENAVAM: exactly 9 or 11 numeric digits.
   * Stored as string to preserve leading zeros.
   * @Matches enforces both the numeric-only constraint and the
   * 9-or-11 digit length rule in a single, readable decorator.
   */
  @Matches(/^\d{9}(\d{2})?$/, {
    message: 'renavam must be exactly 9 or 11 numeric digits',
  })
  renavam!: string;

  /**
   * @Max is evaluated at class-load time (application startup), giving the
   * current year + 1 as the ceiling — allowing registrations of next-year
   * vehicles while blocking obviously invalid future years.
   */
  @IsInt()
  @Min(1886)
  @Max(new Date().getFullYear() + 1)
  year!: number;

  /**
   * The UUID of the VehicleModel this vehicle belongs to.
   * Accepts any UUID version (SQL Server uses non-v4 sequential UUIDs).
   */
  @IsUUID()
  modelId!: string;
}
