import { PartialType } from '@nestjs/mapped-types';
import { CreateBrandDto } from './create-brand.dto';

/**
 * All fields from CreateBrandDto become optional, retaining their validators.
 * This avoids duplicating validation decorators for PATCH semantics.
 */
export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
