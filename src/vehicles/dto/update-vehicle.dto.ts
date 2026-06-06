import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleDto } from './create-vehicle.dto';

/**
 * All fields from CreateVehicleDto become optional, retaining their validators.
 * PATCH semantics: only the provided fields are updated.
 */
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}
