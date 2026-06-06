import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleModelDto } from './create-vehicle-model.dto';

/**
 * All fields from CreateVehicleModelDto become optional, retaining their
 * validators. PATCH semantics: only the provided fields are updated.
 */
export class UpdateVehicleModelDto extends PartialType(CreateVehicleModelDto) {}
