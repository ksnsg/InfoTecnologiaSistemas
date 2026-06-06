import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BrandsQueryService } from './brands-query.service';
import { BrandsRegistrationService } from './brands-registration.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './entities/brand.entity';

/**
 * All routes require a valid Bearer token.
 * The guard is applied at the controller level so no route can be
 * accidentally left unprotected when new endpoints are added.
 */
@ApiTags('brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(
    private readonly brandsQueryService: BrandsQueryService,
    private readonly brandsRegistrationService: BrandsRegistrationService,
  ) {}

  @ApiOperation({ summary: 'Create a brand' })
  @ApiResponse({ status: 201, description: 'Brand created' })
  @ApiResponse({ status: 409, description: 'Brand name already exists' })
  @Post()
  createBrand(
    @Body() createBrandDto: CreateBrandDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Brand> {
    return this.brandsRegistrationService.createBrand(createBrandDto, req.user.sub);
  }

  @ApiOperation({ summary: 'List all brands' })
  @ApiResponse({ status: 200, description: 'Array of brands' })
  @Get()
  findAllBrands(): Promise<Brand[]> {
    return this.brandsQueryService.findAllBrands();
  }

  @ApiOperation({ summary: 'Get a brand by ID' })
  @ApiResponse({ status: 200, description: 'Brand found' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @Get(':id')
  findOneBrand(@Param('id') id: string): Promise<Brand> {
    return this.brandsQueryService.findOneBrand(id);
  }

  @ApiOperation({ summary: 'Update a brand' })
  @ApiResponse({ status: 200, description: 'Brand updated' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @Patch(':id')
  updateBrand(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Brand> {
    return this.brandsRegistrationService.updateBrand(id, updateBrandDto, req.user.sub);
  }

  /**
   * 204 No Content is the correct semantic for a successful DELETE:
   * the resource no longer exists, so there is nothing to return.
   */
  @ApiOperation({ summary: 'Remove a brand' })
  @ApiResponse({ status: 204, description: 'Brand removed' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  removeBrand(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.brandsRegistrationService.removeBrand(id, req.user.sub);
  }
}
