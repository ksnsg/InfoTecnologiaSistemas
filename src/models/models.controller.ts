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
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';
import { UpdateVehicleModelDto } from './dto/update-vehicle-model.dto';
import { VehicleModel } from './entities/vehicle-model.entity';
import { ModelsQueryService } from './models-query.service';
import { ModelsRegistrationService } from './models-registration.service';

/**
 * All routes require a valid Bearer token.
 * Guard is applied at the controller class level so every future
 * route is protected by default.
 */
@ApiTags('models')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('models')
export class ModelsController {
  constructor(
    private readonly modelsQueryService: ModelsQueryService,
    private readonly modelsRegistrationService: ModelsRegistrationService,
  ) {}

  @ApiOperation({ summary: 'Create a vehicle model' })
  @ApiResponse({ status: 201, description: 'Model created' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ApiResponse({ status: 409, description: 'Model name already exists under this brand' })
  @Post()
  createVehicleModel(
    @Body() dto: CreateVehicleModelDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<VehicleModel> {
    return this.modelsRegistrationService.createVehicleModel(dto, req.user.sub);
  }

  @ApiOperation({ summary: 'List all vehicle models' })
  @ApiResponse({ status: 200, description: 'Array of models' })
  @Get()
  findAllVehicleModels(): Promise<VehicleModel[]> {
    return this.modelsQueryService.findAllVehicleModels();
  }

  @ApiOperation({ summary: 'Get a vehicle model by ID' })
  @ApiResponse({ status: 200, description: 'Model found' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @Get(':id')
  findOneVehicleModel(@Param('id') id: string): Promise<VehicleModel> {
    return this.modelsQueryService.findOneVehicleModel(id);
  }

  @ApiOperation({ summary: 'Update a vehicle model' })
  @ApiResponse({ status: 200, description: 'Model updated' })
  @ApiResponse({ status: 404, description: 'Model or brand not found' })
  @Patch(':id')
  updateVehicleModel(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleModelDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<VehicleModel> {
    return this.modelsRegistrationService.updateVehicleModel(id, dto, req.user.sub);
  }

  @ApiOperation({ summary: 'Remove a vehicle model' })
  @ApiResponse({ status: 204, description: 'Model removed' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  removeVehicleModel(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.modelsRegistrationService.removeVehicleModel(id, req.user.sub);
  }
}
